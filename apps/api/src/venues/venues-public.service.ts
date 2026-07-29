// Lecture PUBLIQUE des salles (Lot A3) — les deux règles D33, verrouillées :
// - LISTE  : PUBLISHED ∧ deletedAt IS NULL ∧ status = ACTIVE (strictement) ;
// - DÉTAIL : PUBLISHED ∧ deletedAt IS NULL ∧ status ∈ {ACTIVE, TEMPORARILY_
//   UNAVAILABLE} (bandeau côté A8) ; HIDDEN = 404 même en accès direct (SEO).
// Aucun taux ne peut sortir d'ici : les SELECT ne les contiennent pas.
// Sémantique des filtres : VALEUR inconnue (cityId, clé d'amenity) ⇒ résultat
// vide, pas une erreur — seul le FORMAT invalide fait un 400 (Zod).
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueAvailabilityStatus,
  VenueErrorCode,
  VenuePublicationStatus,
  type VenueListQueryInput,
  type VenueListResponse,
  type VenuePublicDTO,
  type VenueSummaryDTO
} from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";

/** Colonnes des cartes de la liste (VenueSummaryDTO) — ni taux, ni GPS.
 *  A4-② : la couverture est tirée en SQL (take: 1 imbriqué — jamais les 30
 *  photos pour une carte) + _count pour le signal « complétude ». */
const VENUE_SUMMARY_SELECT = {
  id: true,
  slug: true,
  cityId: true,
  nameFr: true,
  nameAr: true,
  taglineFr: true,
  taglineAr: true,
  districtFr: true,
  districtAr: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  publicationStatus: true,
  // Couverture = PREMIÈRE photo par sortOrder (règle A4 verrouillée) — le
  // réordonnancement pro fait office de sélecteur de couverture.
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }] as Prisma.VenuePhotoOrderByWithRelationInput[],
    take: 1,
    select: { thumbKey: true }
  },
  _count: { select: { photos: true } }
} as const;

/** Colonnes du détail public (VenuePublicDTO) + ville et référentiel amenities. */
const VENUE_PUBLIC_SELECT = {
  id: true,
  slug: true,
  nameFr: true,
  nameAr: true,
  taglineFr: true,
  taglineAr: true,
  descriptionFr: true,
  descriptionAr: true,
  districtFr: true,
  districtAr: true,
  address: true,
  lat: true,
  lng: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  status: true,
  // D45 (A6a) : A8 monte l'iframe Matterport au geste utilisateur.
  matterportModelId: true,
  city: { select: { id: true, nameFr: true, nameAr: true } },
  amenities: { select: { amenity: { select: { id: true, key: true, nameFr: true, nameAr: true, icon: true } } } },
  // Lot A4 — galerie ordonnée (l'ordre du tableau EST l'ordre d'affichage).
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }] as Prisma.VenuePhotoOrderByWithRelationInput[],
    select: { id: true, storageKey: true, thumbKey: true, width: true, height: true, altFr: true, altAr: true }
  }
} as const;

type VenueSummaryRow = Prisma.VenueGetPayload<{ select: typeof VENUE_SUMMARY_SELECT }>;
type VenuePublicRow = Prisma.VenueGetPayload<{ select: typeof VENUE_PUBLIC_SELECT }>;

/** Forme produite par slugify + suffixes de collision — tout le reste est 404
 *  AVANT la base (même court-circuit que l'uuid côté pro, A2). */
/** EXPORTÉ (B3) : l'endpoint de disponibilité résout la MÊME salle par le
 *  même slug. Un second motif, même identique aujourd'hui, finirait par
 *  diverger — et un 404 de calendrier sur une page qui, elle, s'affiche est un
 *  bug muet. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Prédicat commun D33 (le détail élargit ensuite les status admis). */
/** D33 — status admis par le DÉTAIL public, et donc par la disponibilité :
 *  TEMPORARILY_UNAVAILABLE reste consultable (bandeau A8). EXPORTÉ pour que la
 *  page détail et son calendrier ne puissent pas répondre différemment. */
export const PUBLIC_DETAIL_STATUSES = [
  VenueAvailabilityStatus.ACTIVE,
  VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE
] as const;

export const PUBLIC_BASE_WHERE = {
  publicationStatus: VenuePublicationStatus.PUBLISHED,
  deletedAt: null
} as const;

@Injectable()
export class VenuesPublicService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  /** Clé → URL publique, recalculée à chaque lecture (port A0). */
  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  async list(query: VenueListQueryInput): Promise<VenueListResponse> {
    const amenityKeys = [...new Set((query.amenities ?? "").split(",").filter((k) => k.length > 0))];

    const where: Prisma.VenueWhereInput = {
      ...PUBLIC_BASE_WHERE,
      status: VenueAvailabilityStatus.ACTIVE, // D33 liste : ACTIVE seul
      ...(query.cityId === undefined ? {} : { cityId: query.cityId }),
      // D36 (A9) : la salle peut accueillir ⇒ guests ≤ capacityMax. Le
      // minimum a disparu : personne ne le remplissait, il excluait des
      // salles à tort.
      ...(query.guests === undefined ? {} : { capacityMax: { gte: query.guests } }),
      ...(query.minPriceCents === undefined && query.maxPriceCents === undefined
        ? {}
        : {
            basePriceCents: {
              ...(query.minPriceCents === undefined ? {} : { gte: query.minPriceCents }),
              ...(query.maxPriceCents === undefined ? {} : { lte: query.maxPriceCents })
            }
          }),
      // Sémantique ET : la salle doit posséder CHAQUE clé demandée.
      ...(amenityKeys.length === 0
        ? {}
        : { AND: amenityKeys.map((key) => ({ amenities: { some: { amenity: { key } } } })) })
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where,
        orderBy: this.orderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: VENUE_SUMMARY_SELECT
      }),
      this.prisma.venue.count({ where })
    ]);

    return {
      items: rows.map((row) => this.toSummary(row)),
      total,
      page: query.page,
      pageSize: query.pageSize
    };
  }

  async bySlug(slug: string): Promise<VenuePublicDTO> {
    if (!SLUG_PATTERN.test(slug)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({
      where: {
        slug,
        ...PUBLIC_BASE_WHERE,
        // D33 détail : TEMPORARILY_UNAVAILABLE reste visible (bandeau A8).
        status: { in: [...PUBLIC_DETAIL_STATUSES] }
      },
      select: VENUE_PUBLIC_SELECT
    });
    if (!row) this.throwNotFound();
    return this.toPublicDTO(row);
  }

  /** Arbitrage A3-② : prix ou fraîcheur (défaut) ; le composite « complétude »
   *  attend A4 (son signal principal, les photos, n'existe pas encore).
   *  Tiebreak par id (uuidv7 ≈ ordre de création) : pagination déterministe. */
  private orderBy(sort: VenueListQueryInput["sort"]): Prisma.VenueOrderByWithRelationInput[] {
    switch (sort) {
      case "price_asc":
        return [{ basePriceCents: "asc" }, { id: "asc" }];
      case "price_desc":
        return [{ basePriceCents: "desc" }, { id: "asc" }];
      case "recent":
        return [{ updatedAt: "desc" }, { id: "asc" }];
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private toSummary(row: VenueSummaryRow): VenueSummaryDTO {
    return {
      id: row.id,
      slug: row.slug,
      cityId: row.cityId,
      nameFr: row.nameFr,
      nameAr: row.nameAr,
      taglineFr: row.taglineFr,
      taglineAr: row.taglineAr,
      districtFr: row.districtFr,
      districtAr: row.districtAr,
      capacityMax: row.capacityMax,
      basePriceCents: row.basePriceCents,
      bookingMode: row.bookingMode,
      publicationStatus: row.publicationStatus,
      coverThumbUrl: row.photos[0] === undefined ? null : this.urlOf(row.photos[0].thumbKey),
      photoCount: row._count.photos
    };
  }

  private toPublicDTO(row: VenuePublicRow): VenuePublicDTO {
    return {
      id: row.id,
      slug: row.slug,
      nameFr: row.nameFr,
      nameAr: row.nameAr,
      taglineFr: row.taglineFr,
      taglineAr: row.taglineAr,
      descriptionFr: row.descriptionFr,
      descriptionAr: row.descriptionAr,
      districtFr: row.districtFr,
      districtAr: row.districtAr,
      address: row.address,
      lat: row.lat === null ? null : row.lat.toNumber(),
      lng: row.lng === null ? null : row.lng.toNumber(),
      capacityMax: row.capacityMax,
      basePriceCents: row.basePriceCents,
      bookingMode: row.bookingMode,
      status: row.status,
      city: row.city,
      amenities: row.amenities
        .map((link) => link.amenity)
        .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr")),
      photos: row.photos.map((p) => ({
        id: p.id,
        url: this.urlOf(p.storageKey),
        thumbUrl: this.urlOf(p.thumbKey),
        width: p.width,
        height: p.height,
        altFr: p.altFr,
        altAr: p.altAr
      })),
      matterportModelId: row.matterportModelId
    };
  }
}
