// Endpoints ADMIN des salles (Lot A3) : publication + réglage des deux taux
// D35. L'admin voit TOUTES les salles vivantes (pas de filtre owner — c'est la
// différence structurelle avec le service pro), mais jamais les supprimées :
// 404 indistincts (inexistante / supprimée / id malformé), doctrine A2.
// VENUE_ADMIN_SELECT = allow-list pro + les deux taux : la SEULE surface de
// l'API où commission_rate_bps et cashback_rate_bps quittent la base.
//
// ADM-1 (D349, rang 51) : la file « en attente de publication », le détail, le
// rejet avec motif, et publier réécrit en CHECK-AND-SET dans une transaction qui
// écrit aussi la ligne du journal (R-5). ⛔ R-1 — `setRates`, `VENUE_ADMIN_SELECT`
// et `livingVenue` ne bougent pas d'un octet : le taux n'est ni touché ni
// journalisé (MD-ADM-17), et AUCUNE méthode neuve ne lit ni n'écrit un taux, sauf
// `detail`, qui l'AFFICHE. Ce fichier figure sur la carte du chemin de l'argent
// (D304) pour `setRates` ; ce que ce lot y change relève de la PUBLICATION d'une
// salle — ni un montant, ni un statut de réservation ou de devis (D316, D325).
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueErrorCode,
  VenueModerationErrorCode,
  VenuePublicationStatus,
  AdminAuditAction,
  AdminAuditEntity,
  type VenueAdminDTO,
  type VenueAdminDetailDTO,
  type VenuePendingItemDTO,
  type VenuePendingPageDTO,
  type VenuePendingQuery,
  type VenueRatesUpdateInput,
  type VenueRejectInput,
  type VenueRejectResultDTO
} from "@zwadj/types";
import { venuePublishEntry, venueRejectEntry, type AdminAuditActor } from "../common/admin-audit";
import type { Prisma } from "../generated/prisma/client";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";
import { toVenueProDTO } from "./venues.service";
// ⚠ `VENUE_PRO_SELECT` a déménagé dans le fichier de port (S10a) : le port en
// a besoin, et le service a besoin du port. Le laisser dans le service aurait
// fermé un cycle ; le recopier aurait fait DEUX formes de la même ligne.
import { VENUE_PRO_SELECT } from "./venue-store.types";
import { PUBLISHABLE_FROM, REJECTABLE_FROM, latestDatePerEntity, pageAcrossGroups, toRejection } from "./venue-review-queue";

const VENUE_ADMIN_SELECT = {
  ...VENUE_PRO_SELECT,
  commissionRateBps: true,
  cashbackRateBps: true
} as const;

type VenueAdminRow = Prisma.VenueGetPayload<{ select: typeof VENUE_ADMIN_SELECT }>;

/** La ville, le propriétaire (son NOM COMMERCIAL seulement) et le nombre de créneaux ACTIFS — ce que la file et le détail ajoutent pour décider. */
const CITY_OWNER_SLOTS_SELECT = {
  city: { select: { nameFr: true, nameAr: true } },
  owner: { select: { businessName: true } },
  _count: { select: { slotTemplates: { where: { isActive: true } } } }
} as const;

/** ⛔ R-1 : AUCUN taux. `rejectionReason` est lu ici — c'est une surface ADMIN. */
const VENUE_QUEUE_SELECT = {
  id: true,
  number: true,
  slug: true,
  nameFr: true,
  nameAr: true,
  createdAt: true,
  updatedAt: true,
  rejectionReason: true,
  ...CITY_OWNER_SLOTS_SELECT
} as const;

/** Le détail = la vue admin existante (les taux, en LECTURE) + le numéro, le motif, la ville, le propriétaire, les créneaux actifs. */
const VENUE_ADMIN_DETAIL_SELECT = {
  ...VENUE_ADMIN_SELECT,
  number: true,
  rejectionReason: true,
  ...CITY_OWNER_SLOTS_SELECT
} as const;

/**
 * D-6 (l2, Ko) : la file « en attente de publication » = les brouillons VIVANTS qui ont au moins un créneau ACTIF — la condition même de la publication (D46). Le filtre vit dans le `where`,
 * JAMAIS après la page (D225, MD-ADM-8) : `count` et `findMany` de chaque groupe partagent ce même objet.
 */
export const REVIEW_QUEUE_WHERE = {
  deletedAt: null,
  publicationStatus: VenuePublicationStatus.DRAFT,
  slotTemplates: { some: { isActive: true } }
} satisfies Prisma.VenueWhereInput;

/** Chaque groupe de la file : du plus ancien au plus récent, départagé par l'id (discipline A3). */
const QUEUE_ORDER = [{ createdAt: "asc" }, { id: "asc" }] satisfies Prisma.VenueOrderByWithRelationInput[];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class VenuesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  /** A4 : même résolution clé → URL que le service pro (mapper partagé). */
  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  /**
   * Publication ONE-WAY (arbitrage A3-④) : DRAFT → PUBLISHED directement
   * (PENDING inutilisé au MVP, verrouillé). Re-publier une salle déjà publiée
   * est IDEMPOTENT : 200 sans écriture et SANS ligne de journal — updatedAt ne
   * bouge pas, le tri « recent » de la liste publique n'est pas faussé par un
   * double-clic admin. Pas de dépublication : le pro a déjà status=HIDDEN (D33)
   * pour se retirer.
   *
   * ADM-1 (R-2, R-5, MD-ADM-4) : l'écriture est un CHECK-AND-SET — `updateMany`
   * conditionné au statut source, compte = 1 exigé — DANS une transaction qui
   * écrit aussi la ligne du journal : une publication sans trace, ou une trace
   * sans publication, est impossible. Publier EFFACE le motif d'un refus (le
   * journal garde l'histoire). À 0, une relecture ne sert qu'à choisir le CODE :
   * la salle est publiée (un autre geste a gagné : 200, sans ligne) ou absente
   * (404). La lecture du statut en tête de transaction ne décide pas : seul le
   * compte décide (D117, D121).
   */
  async publish(venueId: string, admin: AdminAuditActor): Promise<VenueAdminDTO> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.venue.findFirst({ where: { id: venueId, deletedAt: null }, select: VENUE_ADMIN_SELECT });
      if (!current) this.throwNotFound();
      if (current.publicationStatus === VenuePublicationStatus.PUBLISHED) return this.toDTO(current);

      // D46 (B1) — garde de publication : sans créneau actif, la salle serait
      // publiée mais absente du calendrier et non réservable. Le refus est ici,
      // au dernier point de contrôle, plutôt qu'en amont : le pro construit son
      // brouillon dans l'ordre qu'il veut.
      const activeSlots = await tx.slotTemplate.count({ where: { venueId: current.id, isActive: true } });
      if (activeSlots === 0) {
        throw new ConflictException({
          code: VenueErrorCode.SLOT_TEMPLATE_REQUIRED,
          message: "venue.errors.slotRequired"
        });
      }

      const { count } = await tx.venue.updateMany({
        where: { id: current.id, deletedAt: null, publicationStatus: { in: [...PUBLISHABLE_FROM] } },
        data: { publicationStatus: VenuePublicationStatus.PUBLISHED, rejectionReason: null }
      });
      if (count === 1) {
        await tx.auditLog.create({ data: venuePublishEntry(admin, current.id, current.publicationStatus) });
        return this.toDTO(await tx.venue.findUniqueOrThrow({ where: { id: current.id }, select: VENUE_ADMIN_SELECT }));
      }

      // Compte 0 : un autre geste est passé entre la lecture et l'écriture. On relit pour choisir le code, JAMAIS pour décider.
      const now = await tx.venue.findFirst({ where: { id: current.id, deletedAt: null }, select: VENUE_ADMIN_SELECT });
      if (!now) this.throwNotFound();
      if (now.publicationStatus === VenuePublicationStatus.PUBLISHED) return this.toDTO(now);
      throw new Error(`publish : compte 0 sur une salle ni publiée ni supprimée (statut ${now.publicationStatus}) — état impossible`);
    });
  }

  /**
   * Rejet (D-4, Ko : « la salle rejetée reste en brouillon ; motif obligatoire, stocké sur la salle ; le rejet est aussi journalisé »). Même patron que `publish` : check-and-set sur DRAFT ET
   * « jamais rejetée », UNE transaction, UNE ligne de journal qui PORTE le motif. ⛔ R-1 : il n'écrit que `rejection_reason`, ne lit aucun taux, et ne rend PAS un `VenueAdminDTO`.
   *  · salle publiée : 409 `VENUE_NOT_DRAFT` (le sens unique, MD-ADM-4) ;
   *  · supprimée, inconnue, id malformé : le même 404 indistinct ;
   *  · déjà rejetée avec le MÊME motif : 200, la même réponse, AUCUNE écriture ni ligne (« même état, même requête, même réponse », MD-ADM-4) ;
   *  · déjà rejetée avec un AUTRE motif : 409 `VENUE_ALREADY_REJECTED`, le motif stocké n'est pas écrasé — comportement PROVISOIRE, décision produit non tranchée (R-2, rapportée).
   */
  async reject(venueId: string, admin: AdminAuditActor, input: VenueRejectInput): Promise<VenueRejectResultDTO> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const reason = input.reason;
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.venue.updateMany({
        where: { id: venueId, deletedAt: null, publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: null },
        data: { rejectionReason: reason }
      });
      if (count === 1) {
        const ligne = await tx.auditLog.create({ data: venueRejectEntry(admin, venueId, reason), select: { createdAt: true } });
        return { id: venueId, publicationStatus: VenuePublicationStatus.DRAFT, rejection: { reason, rejectedAt: ligne.createdAt.toISOString() } };
      }

      // Compte 0 : on relit pour choisir le code, jamais pour décider.
      const now = await tx.venue.findFirst({
        where: { id: venueId, deletedAt: null },
        select: { id: true, publicationStatus: true, rejectionReason: true }
      });
      if (!now) this.throwNotFound();
      if (now.publicationStatus !== VenuePublicationStatus.DRAFT) {
        throw new ConflictException({ code: VenueModerationErrorCode.VENUE_NOT_DRAFT, message: "admin.errors.venueNotDraft" });
      }
      if (now.rejectionReason === null) {
        throw new Error("reject : compte 0 sur un brouillon vivant jamais rejeté — état impossible");
      }
      if (now.rejectionReason === reason) {
        const rejectedAt = await this.latestRejectionDate(tx, venueId);
        return {
          id: venueId,
          publicationStatus: VenuePublicationStatus.DRAFT,
          rejection: { reason, rejectedAt: rejectedAt === null ? null : rejectedAt.toISOString() }
        };
      }
      throw new ConflictException({ code: VenueModerationErrorCode.VENUE_ALREADY_REJECTED, message: "admin.errors.venueAlreadyRejected" });
    });
  }

  /**
   * La file « en attente de publication » (D-6 l2, R-2, MD-ADM-8). DEUX groupes dans le même ordre que la page les montre : les brouillons jamais rejetés, puis ceux qui ont déjà été
   * rejetés (« déjà rejetée », avec motif et date lue au journal) — un `orderBy` ne sait pas l'exprimer (il rangerait les rejetés par l'ordre alphabétique de leur motif). Les comptes et les
   * lectures de chaque groupe partagent le MÊME `where` (le filtre vit dans le `where`, D225) ; le second groupe n'est lu que si la page y entre ; la date des refus se lit en UNE requête.
   * ⛔ R-1 : aucun taux n'est sélectionné.
   */
  async listPending(query: VenuePendingQuery): Promise<VenuePendingPageDTO> {
    const { page, pageSize } = query;
    return this.prisma.$transaction(async (tx) => {
      const whereNeverRejected = { ...REVIEW_QUEUE_WHERE, rejectionReason: null } satisfies Prisma.VenueWhereInput;
      const whereRejected = { ...REVIEW_QUEUE_WHERE, rejectionReason: { not: null } } satisfies Prisma.VenueWhereInput;
      const firstTotal = await tx.venue.count({ where: whereNeverRejected });
      const secondTotal = await tx.venue.count({ where: whereRejected });
      const { first, second } = pageAcrossGroups({ firstTotal, secondTotal, page, pageSize });

      const firstRows =
        first.take > 0
          ? await tx.venue.findMany({ where: whereNeverRejected, orderBy: QUEUE_ORDER, skip: first.skip, take: first.take, select: VENUE_QUEUE_SELECT })
          : [];
      const secondRows =
        second.take > 0
          ? await tx.venue.findMany({ where: whereRejected, orderBy: QUEUE_ORDER, skip: second.skip, take: second.take, select: VENUE_QUEUE_SELECT })
          : [];

      const dates =
        secondRows.length > 0
          ? latestDatePerEntity(
              await tx.auditLog.findMany({
                where: { action: AdminAuditAction.VENUE_REJECT, entityType: AdminAuditEntity.VENUE, entityId: { in: secondRows.map((r) => r.id) } },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                select: { entityId: true, createdAt: true }
              })
            )
          : new Map<string, Date>();

      const items: VenuePendingItemDTO[] = [...firstRows, ...secondRows].map((row) => ({
        id: row.id,
        number: row.number,
        slug: row.slug,
        nameFr: row.nameFr,
        nameAr: row.nameAr,
        cityNameFr: row.city.nameFr,
        cityNameAr: row.city.nameAr,
        ownerBusinessName: row.owner.businessName,
        activeSlotCount: row._count.slotTemplates,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        rejection: toRejection(VenuePublicationStatus.DRAFT, row.rejectionReason, dates.get(row.id) ?? null)
      }));
      return { items, total: firstTotal + secondTotal, page, pageSize };
    });
  }

  /** Le détail d'une salle VIVANTE (n'importe quel statut) pour décider de la publier ou de la rejeter. Les deux taux y sont AFFICHÉS, en lecture seule (R-1) ; la route de réglage est inchangée. */
  async detail(venueId: string): Promise<VenueAdminDetailDTO> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({ where: { id: venueId, deletedAt: null }, select: VENUE_ADMIN_DETAIL_SELECT });
    if (!row) this.throwNotFound();
    const rejectedAt = row.rejectionReason === null ? null : await this.latestRejectionDate(this.prisma, row.id);
    return {
      ...this.toDTO(row),
      number: row.number,
      cityNameFr: row.city.nameFr,
      cityNameAr: row.city.nameAr,
      ownerBusinessName: row.owner.businessName,
      activeSlotCount: row._count.slotTemplates,
      rejection: toRejection(row.publicationStatus, row.rejectionReason, rejectedAt)
    };
  }

  /**
   * D35 : les DEUX taux au même endroit, corps partiel. La contrainte croisée
   * cashback ≤ commission est validée APRÈS fusion avec l'existant (patron
   * capacités d'A2) — message explicite, jamais l'erreur Postgres brute ; le
   * CHECK SQL reste le filet mécanique en dessous.
   */
  async setRates(venueId: string, input: VenueRatesUpdateInput): Promise<VenueAdminDTO> {
    const current = await this.livingVenue(venueId);

    const commissionRateBps = input.commissionRateBps ?? current.commissionRateBps;
    const cashbackRateBps = input.cashbackRateBps ?? current.cashbackRateBps;
    if (cashbackRateBps > commissionRateBps) {
      throw new BadRequestException({
        code: VenueErrorCode.CASHBACK_EXCEEDS_COMMISSION,
        message: "venue.errors.cashbackExceedsCommission"
      });
    }

    const row = await this.prisma.venue.update({
      where: { id: current.id },
      data: { ...input },
      select: VENUE_ADMIN_SELECT
    });
    return this.toDTO(row);
  }

  /** id + vivante (deletedAt IS NULL) — tout échec est le même 404. */
  private async livingVenue(venueId: string): Promise<VenueAdminRow> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null },
      select: VENUE_ADMIN_SELECT
    });
    if (!row) this.throwNotFound();
    return row;
  }

  /** La date du refus = la ligne `venue.reject` LA PLUS RÉCENTE de cette salle ; `null` si le journal n'en a pas (motif écrit à la main) — jamais une date inventée. */
  private async latestRejectionDate(client: Pick<Prisma.TransactionClient, "auditLog">, venueId: string): Promise<Date | null> {
    const ligne = await client.auditLog.findFirst({
      where: { action: AdminAuditAction.VENUE_REJECT, entityType: AdminAuditEntity.VENUE, entityId: venueId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true }
    });
    return ligne === null ? null : ligne.createdAt;
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private toDTO(row: VenueAdminRow): VenueAdminDTO {
    return {
      ...toVenueProDTO(row, this.urlOf),
      commissionRateBps: row.commissionRateBps,
      cashbackRateBps: row.cashbackRateBps
    };
  }
}
