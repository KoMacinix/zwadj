// CRUD Venue côté PRO (Flux A, Lot A2). Trois lignes de défense structurelles :
// 1) SELECT allow-list (patron AUTH_USER_SELECT) — commissionRateBps,
//    cashbackRateBps (à venir, A3) et rejectionReason ne QUITTENT JAMAIS la
//    base sur les chemins pro, il n'y a rien à « filtrer » ensuite ;
// 2) 404 INDISTINCTS (VENUE_NOT_FOUND) pour tout ce qui n'est pas « ma salle
//    vivante » : inexistante, supprimée, id malformé, salle d'un autre pro —
//    anti-énumération, même doctrine que /media/:key ;
// 3) soft delete uniquement (deletedAt) — jamais de DELETE SQL sur venues.
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { VenueErrorCode, type VenueCreateInput, type VenueProDTO, type VenueUpdateInput } from "@zwadj/types";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { toSlotTemplateDTO } from "./slot-templates.service";
import { slugify } from "./slug";
import {
  REFERENTIELS_EXISTENCE,
  type ReferentielsExistence,
  VENUE_STORE,
  type VenueProRow,
  type VenueStore
} from "./venue-store.types";


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


@Injectable()
export class VenuesService {
  // ⛔ PLUS DE `PrismaService` ICI (S10a). Ce service ne sait plus quelle base
  // il parle : il reçoit des décisions et les traduit en réponses HTTP. C'est
  // ce qui rend son double de test VÉRIFIABLE — le précédent était passé en
  // `as unknown as PrismaService`, donc jamais confronté à rien.
  constructor(
    @Inject(VENUE_STORE) private readonly salles: VenueStore,
    @Inject(REFERENTIELS_EXISTENCE) private readonly referentiels: ReferentielsExistence,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  /** Résolution clé → URL publique à la LECTURE (port A0) : la bascule
   *  disque → S3/CDN ne réécrira aucune ligne, seuls les publicUrl changent. */
  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  // ── Création ───────────────────────────────────────────────────────────────

  async create(userId: string, input: VenueCreateInput): Promise<VenueProDTO> {
    const ownerId = await this.proProfileIdOf(userId);
    await this.assertCityExists(input.cityId);

    for (const slug of this.slugCandidates(slugify(input.nameFr))) {
      // ⚠ ON LIT UN RÉSULTAT, ON N'ATTRAPE PLUS UNE ERREUR. Le `try/catch`
      // sur P2002 obligeait ce service à connaître un code de driver — donc à
      // savoir quelle base il parle. « Slug pris » est désormais une réponse,
      // et tout ce qui n'en est pas une remonte depuis l'adaptateur.
      const resultat = await this.salles.creer({ ...input, ownerId, slug });
      if (resultat.ok) return toVenueProDTO(resultat.salle, this.urlOf);
      // Slug pris (par n'importe quel pro) → candidat suivant.
    }
    // 8 candidats dont 2 aléatoires : l'épuisement est un incident, pas un 4xx.
    throw new Error("Génération de slug épuisée — collision improbable persistante");
  }

  // ── Lectures pro (« l'id reste la clé pro/admin ») ─────────────────────────

  async listMine(userId: string): Promise<VenueProDTO[]> {
    const rows = await this.salles.listerDuPro(userId);
    return rows.map((row) => toVenueProDTO(row, this.urlOf));
  }

  async getMine(userId: string, venueId: string): Promise<VenueProDTO> {
    return toVenueProDTO(await this.ownedLivingVenue(userId, venueId), this.urlOf);
  }

  // ── Mise à jour partielle (arbitrage A2-③) ─────────────────────────────────

  async update(userId: string, venueId: string, input: VenueUpdateInput): Promise<VenueProDTO> {
    const current = await this.ownedLivingVenue(userId, venueId);

    // D36 (A9) : plus de cohérence croisée de capacité à juger ici — il n'y a
    // qu'une capacité, ses bornes (1–10 000) sont portées par le schéma Zod.

    if (input.cityId !== undefined) await this.assertCityExists(input.cityId);

    // A3-① : amenityIds = REMPLACEMENT d'ensemble (dédupliqué), validé contre
    // le référentiel, écrit en imbriqué dans le MÊME update (atomique, et
    // @updatedAt bouge — changer ses équipements est bien « toucher » la salle).
    const { amenityIds, styleIds, ...fields } = input;
    const uniqueAmenityIds = amenityIds === undefined ? undefined : [...new Set(amenityIds)];
    if (uniqueAmenityIds !== undefined) await this.assertAmenitiesExist(uniqueAmenityIds);
    // D65 (A13) — mêmes règles que les équipements : remplacement d'ensemble,
    // dédupliqué, validé contre le référentiel AVANT l'update. Un id inconnu
    // doit répondre 400, pas une violation de clé étrangère en 500.
    const uniqueStyleIds = styleIds === undefined ? undefined : [...new Set(styleIds)];
    if (uniqueStyleIds !== undefined) await this.assertStylesExist(uniqueStyleIds);

    // ⚠ LE SERVICE DIT « REMPLACE L'ENSEMBLE », PAS COMMENT. Le
    // `deleteMany`/`create` imbriqué était une façon Prisma d'écrire un
    // remplacement d'ensemble ; elle vit maintenant dans l'adaptateur, avec
    // la garantie d'atomicité qu'elle porte.
    const row = await this.salles.mettreAJour(current.id, {
      champs: fields,
      equipementIds: uniqueAmenityIds,
      styleIds: uniqueStyleIds
    });
    return toVenueProDTO(row, this.urlOf);
  }

  // ── Soft delete ────────────────────────────────────────────────────────────

  async softDelete(userId: string, venueId: string): Promise<void> {
    const current = await this.ownedLivingVenue(userId, venueId);
    await this.salles.archiver(current.id);
  }

  // ── Internes ───────────────────────────────────────────────────────────────



  /** Un id hors motif UUID ferait un P2023 côté driver (colonne uuid) :
   *  court-circuit en 404 identique, sans toucher la base. */
  private assertUuidShapeOr404(venueId: string): void {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
  }

  /** LA requête d'ownership : tout échec est le même 404 (rien à apprendre
   *  pour un énumérateur). */
  private async ownedLivingVenue(userId: string, venueId: string): Promise<VenueProRow> {
    this.assertUuidShapeOr404(venueId);
    const row = await this.salles.trouverVivante(userId, venueId);
    // ⚠ Le port rend `null` ; le 404 INDISTINCT est traduit ici, où vivent
    // les codes et les clés i18n.
    if (!row) this.throwNotFound();
    return row;
  }

  /**
   * A4-④ — variante ID-ONLY, PUBLIQUE, pour le module média : même WHERE,
   * même court-circuit UUID, même 404 indistinct (VENUE_NOT_FOUND), mais un
   * `select: { id }` bien plus léger que VENUE_PRO_SELECT (qui embarque
   * désormais photos/scènes/liaisons). Réutilisation OBLIGATOIRE par tout
   * futur consommateur d'ownership — jamais de réimplémentation.
   */
  async assertOwnedLivingVenueId(userId: string, venueId: string): Promise<string> {
    this.assertUuidShapeOr404(venueId);
    const id = await this.salles.trouverIdVivante(userId, venueId);
    if (id === null) this.throwNotFound();
    return id;
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private async proProfileIdOf(userId: string): Promise<string> {
    const id = await this.salles.idProfilPro(userId);
    // D3 : un PRO a TOUJOURS son ProProfile (créés en une transaction au
    // register). Son absence est une rupture d'invariant → 500 volontaire.
    // ⚠ Le port a CONSTATÉ l'absence ; c'est ici qu'on la juge.
    if (id === null) throw new Error(`Invariant D3 rompu : utilisateur PRO ${userId} sans ProProfile`);
    return id;
  }

  private async assertCityExists(cityId: string): Promise<void> {
    if (!(await this.referentiels.communeExiste(cityId))) {
      throw new BadRequestException({ code: VenueErrorCode.CITY_NOT_FOUND, message: "venue.errors.cityNotFound" });
    }
  }

  /** A3-① : tous les ids doivent exister dans le référentiel Amenity — une
   *  liste vide est légitime (effacement de la sélection). */
  private async assertStylesExist(styleIds: string[]): Promise<void> {
    // ⚠ LA LISTE VIDE N'EST PLUS TRAITÉE ICI : « tous ces zéro ids existent »
    // est vacuement vrai, et le port le sait sans interroger la base.
    if (!(await this.referentiels.stylesExistent(styleIds))) {
      throw new BadRequestException({ code: VenueErrorCode.VENUE_STYLE_NOT_FOUND, message: "venue.errors.styleNotFound" });
    }
  }

  private async assertAmenitiesExist(amenityIds: string[]): Promise<void> {
    if (!(await this.referentiels.equipementsExistent(amenityIds))) {
      throw new BadRequestException({ code: VenueErrorCode.AMENITY_NOT_FOUND, message: "venue.errors.amenityNotFound" });
    }
  }

  /** base, base-2 … base-6, puis deux suffixes aléatoires (6 hex). */
  private slugCandidates(base: string): string[] {
    const numbered = [2, 3, 4, 5, 6].map((n) => `${base}-${n}`);
    const random = () => `${base}-${randomBytes(3).toString("hex")}`;
    return [base, ...numbered, random(), random()];
  }
}

/** Mapper partagé pro/admin (l'admin y ADJOINT les deux taux, Lot A3).
 *  A4 : reçoit le résolveur clé → URL publique du port MEDIA_STORAGE — les
 *  URL ne sont JAMAIS stockées, toujours recalculées à la lecture. */
export function toVenueProDTO(row: VenueProRow, urlOf: (key: string) => string): VenueProDTO {
  return {
    id: row.id,
    slug: row.slug,
    cityId: row.cityId,
    nameFr: row.nameFr,
    nameAr: row.nameAr,
    taglineFr: row.taglineFr,
    taglineAr: row.taglineAr,
    descriptionFr: row.descriptionFr,
    descriptionAr: row.descriptionAr,
    districtFr: row.districtFr,
    districtAr: row.districtAr,
    address: row.address,
    // Decimal(9,6) → number : coordonnées ≠ argent (invariant entiers N/A).
    lat: row.lat === null ? null : row.lat.toNumber(),
    lng: row.lng === null ? null : row.lng.toNumber(),
    capacityMax: row.capacityMax,
    basePriceCents: row.basePriceCents,
    bookingMode: row.bookingMode,
    depositRateBps: row.depositRateBps,
    depositAmountCents: row.depositAmountCents,
    publicationStatus: row.publicationStatus,
    status: row.status,
    amenityIds: row.amenities.map((a) => a.amenityId).sort(),
    // Triés : le formulaire pro compare des tableaux pour savoir s'il est sale.
    // Sans tri, l'ordre d'insertion en base ferait croire à une modification.
    styleIds: row.styles.map((s) => s.styleId).sort(),
    ceremonyType: row.ceremonyType,
    photos: row.photos.map((p) => ({
      id: p.id,
      url: urlOf(p.storageKey),
      thumbUrl: urlOf(p.thumbKey),
      width: p.width,
      height: p.height,
      sortOrder: p.sortOrder,
      altFr: p.altFr,
      altAr: p.altAr,
      createdAt: p.createdAt.toISOString()
    })),
    slotTemplates: row.slotTemplates.map(toSlotTemplateDTO),
    matterportModelId: row.matterportModelId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
