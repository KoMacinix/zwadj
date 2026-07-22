// Lot A4 — écritures médias d'une salle (photos + scènes/liaisons 360°).
// Quatre règles structurelles :
// 1. OWNERSHIP : chaque opération commence par
//    VenuesService.assertOwnedLivingVenueId (A4-④) — même WHERE, même
//    court-circuit UUID, même 404 indistinct que tout le domaine, et JAMAIS
//    de gate sur `status` D33 ;
// 2. PLAFONDS (A4-⑥) : jamais de non-plafonné — VENUE_MEDIA_CAPS, constante
//    partagée, 400 MEDIA_*_LIMIT_REACHED (le contrôle count-puis-insert n'est
//    pas transactionnel : une course peut dépasser le plafond d'une unité,
//    assumé — c'est une assurance de coût, pas une comptabilité exacte) ;
// 3. ORPHELINS : à l'upload, objets écrits PUIS ligne insérée — si l'INSERT
//    échoue, compensation locale (suppression best-effort des objets frais)
//    avant de relancer l'erreur ; au DELETE, ligne d'abord puis objets
//    (delete du port idempotent) — dans les deux sens, l'orphelin ne
//    s'accumule pas ;
// 4. La base stocke des CLÉS, les DTO exposent des URL recalculées (port A0).
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  MediaErrorCode,
  VENUE_MEDIA_CAPS,
  VenueErrorCode,
  type Venue360LinkCreateInput,
  type VenuePhoto360LinkDTO,
  type VenuePhoto360SceneDTO,
  type VenuePhotoAltUpdateInput,
  type VenuePhotoDTO,
  type VenuePhotoOrderInput
} from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import {
  MediaValidationError,
  processVenuePhoto,
  processVenuePhoto360,
  type ProcessedImagePair
} from "../media/image-pipeline";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";
import { VenuesService } from "./venues.service";

const PHOTO_SELECT = {
  id: true,
  storageKey: true,
  thumbKey: true,
  width: true,
  height: true,
  sortOrder: true,
  altFr: true,
  altAr: true,
  createdAt: true
} as const;
type PhotoRow = Prisma.VenuePhotoGetPayload<{ select: typeof PHOTO_SELECT }>;

const SCENE_SELECT = {
  id: true,
  storageKey: true,
  thumbKey: true,
  capturedAt: true,
  createdAt: true
} as const;
type SceneRow = Prisma.VenuePhoto360GetPayload<{ select: typeof SCENE_SELECT }>;

const LINK_SELECT = {
  id: true,
  photoAId: true,
  photoBId: true,
  yawA: true,
  pitchA: true,
  yawB: true,
  pitchB: true
} as const;
type LinkRow = Prisma.VenuePhoto360LinkGetPayload<{ select: typeof LINK_SELECT }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Codes pipeline → clés i18n media.errors.* (A4-⑤) — exhaustif par type. */
const MEDIA_ERROR_MESSAGES: Record<MediaErrorCode, string> = {
  MEDIA_FILE_REQUIRED: "media.errors.fileRequired",
  MEDIA_UNSUPPORTED_FORMAT: "media.errors.unsupportedFormat",
  MEDIA_TOO_LARGE: "media.errors.tooLarge",
  MEDIA_TOO_SMALL: "media.errors.tooSmall",
  MEDIA_BAD_ASPECT_RATIO: "media.errors.badAspectRatio",
  MEDIA_PHOTO_LIMIT_REACHED: "media.errors.photoLimitReached",
  MEDIA_SCENE_LIMIT_REACHED: "media.errors.sceneLimitReached"
};

/** P2002 (unicité) sans dépendre de la classe générée — patron A2. Couvre
 *  aussi l'index unique LEAST/GREATEST posé en SQL manuel (renfort D34 n°3) :
 *  Postgres 23505 est remonté en P2002 quelle que soit l'origine de l'index. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

@Injectable()
export class VenueMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venues: VenuesService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  // ── Photos classiques ──────────────────────────────────────────────────────

  async addPhoto(userId: string, venueId: string, file: Buffer): Promise<VenuePhotoDTO> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);

    const count = await this.prisma.venuePhoto.count({ where: { venueId: id } });
    if (count >= VENUE_MEDIA_CAPS.photosPerVenue) {
      this.throwMedia(MediaErrorCode.MEDIA_PHOTO_LIMIT_REACHED);
    }

    const pair = await this.processOr400(() => processVenuePhoto(file));
    const keys = this.freshKeys("vp");
    await this.putPair(keys, pair);
    try {
      const max = await this.prisma.venuePhoto.aggregate({ where: { venueId: id }, _max: { sortOrder: true } });
      const row = await this.prisma.venuePhoto.create({
        data: {
          venueId: id,
          storageKey: keys.large,
          thumbKey: keys.thumb,
          width: pair.large.width,
          height: pair.large.height,
          // Append en fin de galerie ; une course entre deux uploads peut
          // produire deux rangs égaux — toléré (tiebreak id partout), le
          // réordonnancement atomique répare.
          sortOrder: (max._max.sortOrder ?? -1) + 1
        },
        select: PHOTO_SELECT
      });
      return this.toPhotoDTO(row);
    } catch (error) {
      // Compensation d'orphelin (A4) : les objets viennent d'être écrits, la
      // ligne n'existera pas — on les retire (best effort) avant de relancer.
      await this.cleanupKeys(keys);
      throw error;
    }
  }

  async updatePhotoAlt(
    userId: string,
    venueId: string,
    photoId: string,
    input: VenuePhotoAltUpdateInput
  ): Promise<VenuePhotoDTO> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);
    const current = await this.photoInVenueOr404(id, photoId);
    const row = await this.prisma.venuePhoto.update({
      where: { id: current.id },
      data: input,
      select: PHOTO_SELECT
    });
    return this.toPhotoDTO(row);
  }

  /**
   * A4-③ — ENSEMBLE ordonné COMPLET, transaction unique : lecture de
   * l'existant, comparaison d'ensembles et écritures dans la MÊME transaction
   * interactive — une suppression concurrente fait échouer TOUT le lot en 400
   * PHOTO_ORDER_MISMATCH (côté A6a : « rafraîchissez puis réessayez »), jamais
   * un ordre partiellement appliqué. sortOrder final = position dans le
   * tableau — deux photos au même rang deviennent impossibles par construction.
   */
  async reorderPhotos(userId: string, venueId: string, input: VenuePhotoOrderInput): Promise<VenuePhotoDTO[]> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);

    const rows = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.venuePhoto.findMany({ where: { venueId: id }, select: { id: true } });
      const stored = new Set(existing.map((e) => e.id));
      const sent = input.photoIds; // dédupliqué par Zod (orderDuplicate)
      if (stored.size !== sent.length || sent.some((photoId) => !stored.has(photoId))) {
        throw new BadRequestException({
          code: VenueErrorCode.PHOTO_ORDER_MISMATCH,
          message: "venue.errors.photoOrderMismatch"
        });
      }
      for (const [index, photoId] of sent.entries()) {
        await tx.venuePhoto.update({ where: { id: photoId }, data: { sortOrder: index }, select: { id: true } });
      }
      return tx.venuePhoto.findMany({
        where: { venueId: id },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: PHOTO_SELECT
      });
    });
    return rows.map((row) => this.toPhotoDTO(row));
  }

  async deletePhoto(userId: string, venueId: string, photoId: string): Promise<void> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);
    const current = await this.photoInVenueOr404(id, photoId);
    // Ligne d'abord, objets ensuite (idempotents côté port) : si la suppression
    // d'objet échoue, on a un orphelin d'octets — jamais une ligne morte.
    await this.prisma.venuePhoto.delete({ where: { id: current.id }, select: { id: true } });
    await this.cleanupKeys({ large: current.storageKey, thumb: current.thumbKey });
  }

  // ── Scènes 360° ────────────────────────────────────────────────────────────

  async add360Scene(userId: string, venueId: string, file: Buffer): Promise<VenuePhoto360SceneDTO> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);

    const count = await this.prisma.venuePhoto360.count({ where: { venueId: id } });
    if (count >= VENUE_MEDIA_CAPS.scenes360PerVenue) {
      this.throwMedia(MediaErrorCode.MEDIA_SCENE_LIMIT_REACHED);
    }

    const pair = await this.processOr400(() => processVenuePhoto360(file));
    const keys = this.freshKeys("vs");
    await this.putPair(keys, pair);
    try {
      const row = await this.prisma.venuePhoto360.create({
        data: { venueId: id, storageKey: keys.large, thumbKey: keys.thumb },
        select: SCENE_SELECT
      });
      return this.toSceneDTO(row);
    } catch (error) {
      await this.cleanupKeys(keys); // même compensation d'orphelin que la photo
      throw error;
    }
  }

  async delete360Scene(userId: string, venueId: string, sceneId: string): Promise<void> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);
    if (!UUID_PATTERN.test(sceneId)) this.throwSceneNotFound();
    const current = await this.prisma.venuePhoto360.findFirst({
      where: { id: sceneId, venueId: id },
      select: { id: true, storageKey: true, thumbKey: true }
    });
    if (!current) this.throwSceneNotFound();
    // Les liaisons de la scène tombent par CASCADE (FK) dans le même geste.
    await this.prisma.venuePhoto360.delete({ where: { id: current.id }, select: { id: true } });
    await this.cleanupKeys({ large: current.storageKey, thumb: current.thumbKey });
  }

  // ── Liaisons du tour (D34) ─────────────────────────────────────────────────

  async createLink(userId: string, venueId: string, input: Venue360LinkCreateInput): Promise<VenuePhoto360LinkDTO> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);
    // Les deux extrémités doivent être des scènes de CETTE salle — sinon 404
    // indistinct SCENE_NOT_FOUND (autre salle = inexistante, doctrine A2).
    // photoAId ≠ photoBId est déjà garanti par Zod (linkSamePhoto).
    const found = await this.prisma.venuePhoto360.count({
      where: { venueId: id, id: { in: [input.photoAId, input.photoBId] } }
    });
    if (found !== 2) this.throwSceneNotFound();

    try {
      const row = await this.prisma.venuePhoto360Link.create({
        data: { venueId: id, ...input },
        select: LINK_SELECT
      });
      return this.toLinkDTO(row);
    } catch (error) {
      // Index unique LEAST/GREATEST (renfort D34 n°3) : la paire existe déjà,
      // y compris inversée (B,A) → 409 explicite, jamais l'erreur Postgres brute.
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: VenueErrorCode.LINK_ALREADY_EXISTS,
          message: "venue.errors.linkAlreadyExists"
        });
      }
      throw error;
    }
  }

  async deleteLink(userId: string, venueId: string, linkId: string): Promise<void> {
    const id = await this.venues.assertOwnedLivingVenueId(userId, venueId);
    if (!UUID_PATTERN.test(linkId)) this.throwLinkNotFound();
    // venue_id dénormalisé (renfort D34 n°1) : le scope se juge en un WHERE.
    const { count } = await this.prisma.venuePhoto360Link.deleteMany({ where: { id: linkId, venueId: id } });
    if (count === 0) this.throwLinkNotFound();
  }

  // ── Internes ───────────────────────────────────────────────────────────────

  /** Clés serveur (jamais dérivées du nom de fichier utilisateur — contrat
   *  A0) : conformes à MEDIA_KEY_PATTERN par construction. */
  private freshKeys(prefix: "vp" | "vs"): { large: string; thumb: string } {
    const base = `${prefix}-${randomUUID()}`;
    return { large: `${base}.webp`, thumb: `${base}-thumb.webp` };
  }

  private async putPair(keys: { large: string; thumb: string }, pair: ProcessedImagePair): Promise<void> {
    await this.storage.put({ key: keys.large, body: pair.large.buffer, contentType: pair.large.contentType });
    await this.storage.put({ key: keys.thumb, body: pair.thumb.buffer, contentType: pair.thumb.contentType });
  }

  /** Suppression best-effort des deux objets — le port est idempotent, et un
   *  échec ici ne doit jamais masquer l'erreur d'origine. */
  private async cleanupKeys(keys: { large: string; thumb: string }): Promise<void> {
    await Promise.allSettled([this.storage.delete(keys.large), this.storage.delete(keys.thumb)]);
  }

  private async processOr400<T>(process: () => Promise<T>): Promise<T> {
    try {
      return await process();
    } catch (error) {
      if (error instanceof MediaValidationError) this.throwMedia(error.code);
      throw error;
    }
  }

  private throwMedia(code: MediaErrorCode): never {
    throw new BadRequestException({ code, message: MEDIA_ERROR_MESSAGES[code] });
  }

  private async photoInVenueOr404(venueId: string, photoId: string): Promise<PhotoRow> {
    if (!UUID_PATTERN.test(photoId)) this.throwPhotoNotFound();
    const row = await this.prisma.venuePhoto.findFirst({ where: { id: photoId, venueId }, select: PHOTO_SELECT });
    if (!row) this.throwPhotoNotFound();
    return row;
  }

  private throwPhotoNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.PHOTO_NOT_FOUND, message: "venue.errors.photoNotFound" });
  }

  private throwSceneNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.SCENE_NOT_FOUND, message: "venue.errors.sceneNotFound" });
  }

  private throwLinkNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.LINK_NOT_FOUND, message: "venue.errors.linkNotFound" });
  }

  private toPhotoDTO(row: PhotoRow): VenuePhotoDTO {
    return {
      id: row.id,
      url: this.urlOf(row.storageKey),
      thumbUrl: this.urlOf(row.thumbKey),
      width: row.width,
      height: row.height,
      sortOrder: row.sortOrder,
      altFr: row.altFr,
      altAr: row.altAr,
      createdAt: row.createdAt.toISOString()
    };
  }

  private toSceneDTO(row: SceneRow): VenuePhoto360SceneDTO {
    return {
      id: row.id,
      url: this.urlOf(row.storageKey),
      thumbUrl: this.urlOf(row.thumbKey),
      capturedAt: row.capturedAt === null ? null : row.capturedAt.toISOString(),
      createdAt: row.createdAt.toISOString()
    };
  }

  private toLinkDTO(row: LinkRow): VenuePhoto360LinkDTO {
    return {
      id: row.id,
      photoAId: row.photoAId,
      photoBId: row.photoBId,
      yawA: row.yawA,
      pitchA: row.pitchA,
      yawB: row.yawB,
      pitchB: row.pitchB
    };
  }
}
