// CRUD Venue côté PRO (Flux A, Lot A2). Trois lignes de défense structurelles :
// 1) SELECT allow-list (patron AUTH_USER_SELECT) — commissionRateBps,
//    cashbackRateBps (à venir, A3) et rejectionReason ne QUITTENT JAMAIS la
//    base sur les chemins pro, il n'y a rien à « filtrer » ensuite ;
// 2) 404 INDISTINCTS (VENUE_NOT_FOUND) pour tout ce qui n'est pas « ma salle
//    vivante » : inexistante, supprimée, id malformé, salle d'un autre pro —
//    anti-énumération, même doctrine que /media/:key ;
// 3) soft delete uniquement (deletedAt) — jamais de DELETE SQL sur venues.
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { VenueErrorCode, type VenueCreateInput, type VenueProDTO, type VenueUpdateInput } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { slugify } from "./slug";

/** Allow-list des colonnes exposées au pro — l'ABSENCE de commission_rate_bps,
 *  cashback_rate_bps (D35) et rejection_reason ici est la garantie « jamais
 *  exposé au pro ». Exportée : l'admin (A3) l'étend avec les deux taux. */
export const VENUE_PRO_SELECT = {
  id: true,
  slug: true,
  cityId: true,
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
  capacityMin: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  publicationStatus: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // A3-① : ids d'équipements (le référentiel complet ne voyage que côté public)
  amenities: { select: { amenityId: true } }
} as const;

export type VenueProRow = Prisma.VenueGetPayload<{ select: typeof VENUE_PRO_SELECT }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** P2002 (violation d'unicité) sans dépendre de la classe d'erreur générée —
 *  sur venue.create, la seule contrainte atteignable est celle du slug
 *  (l'id est généré par uuidv7() en base). */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Création ───────────────────────────────────────────────────────────────

  async create(userId: string, input: VenueCreateInput): Promise<VenueProDTO> {
    const ownerId = await this.proProfileIdOf(userId);
    await this.assertCityExists(input.cityId);

    for (const slug of this.slugCandidates(slugify(input.nameFr))) {
      try {
        const row = await this.prisma.venue.create({
          data: {
            ownerId,
            cityId: input.cityId,
            slug,
            nameFr: input.nameFr,
            nameAr: input.nameAr,
            taglineFr: input.taglineFr,
            taglineAr: input.taglineAr,
            descriptionFr: input.descriptionFr,
            descriptionAr: input.descriptionAr,
            districtFr: input.districtFr,
            districtAr: input.districtAr,
            address: input.address,
            lat: input.lat,
            lng: input.lng,
            capacityMin: input.capacityMin,
            capacityMax: input.capacityMax,
            basePriceCents: input.basePriceCents,
            bookingMode: input.bookingMode
            // publicationStatus (DRAFT), status (ACTIVE), commissionRateBps
            // (100) : défauts Prisma/SQL — un pro ne les fournit jamais.
          },
          select: VENUE_PRO_SELECT
        });
        return toVenueProDTO(row);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Slug pris (par n'importe quel pro) → candidat suivant.
      }
    }
    // 8 candidats dont 2 aléatoires : l'épuisement est un incident, pas un 4xx.
    throw new Error("Génération de slug épuisée — collision improbable persistante");
  }

  // ── Lectures pro (« l'id reste la clé pro/admin ») ─────────────────────────

  async listMine(userId: string): Promise<VenueProDTO[]> {
    const rows = await this.prisma.venue.findMany({
      where: { deletedAt: null, owner: { userId } },
      orderBy: { updatedAt: "desc" }, // la plus récemment touchée en tête (UI Pro, A5)
      select: VENUE_PRO_SELECT
    });
    return rows.map((row) => toVenueProDTO(row));
  }

  async getMine(userId: string, venueId: string): Promise<VenueProDTO> {
    return toVenueProDTO(await this.ownedLivingVenue(userId, venueId));
  }

  // ── Mise à jour partielle (arbitrage A2-③) ─────────────────────────────────

  async update(userId: string, venueId: string, input: VenueUpdateInput): Promise<VenueProDTO> {
    const current = await this.ownedLivingVenue(userId, venueId);

    // Capacités croisées APRÈS fusion avec l'existant : `{ capacityMin: 500 }`
    // seul doit être refusé si le max stocké est 450.
    const capacityMin = input.capacityMin ?? current.capacityMin;
    const capacityMax = input.capacityMax ?? current.capacityMax;
    if (capacityMin > capacityMax) {
      throw new BadRequestException({
        code: VenueErrorCode.CAPACITY_RANGE_INVALID,
        message: "venue.errors.capacityRange"
      });
    }

    if (input.cityId !== undefined) await this.assertCityExists(input.cityId);

    // A3-① : amenityIds = REMPLACEMENT d'ensemble (dédupliqué), validé contre
    // le référentiel, écrit en imbriqué dans le MÊME update (atomique, et
    // @updatedAt bouge — changer ses équipements est bien « toucher » la salle).
    const { amenityIds, ...fields } = input;
    const uniqueAmenityIds = amenityIds === undefined ? undefined : [...new Set(amenityIds)];
    if (uniqueAmenityIds !== undefined) await this.assertAmenitiesExist(uniqueAmenityIds);

    const row = await this.prisma.venue.update({
      where: { id: current.id },
      // Le schéma Zod .strict() garantit que `fields` ne contient QUE des clés
      // autorisées (jamais slug/publicationStatus/commission…) — le spread est
      // donc sûr ; les clés absentes restent intactes (update partiel réel).
      data: {
        ...fields,
        ...(uniqueAmenityIds === undefined
          ? {}
          : { amenities: { deleteMany: {}, create: uniqueAmenityIds.map((amenityId) => ({ amenityId })) } })
      },
      select: VENUE_PRO_SELECT
    });
    return toVenueProDTO(row);
  }

  // ── Soft delete ────────────────────────────────────────────────────────────

  async softDelete(userId: string, venueId: string): Promise<void> {
    const current = await this.ownedLivingVenue(userId, venueId);
    await this.prisma.venue.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
      select: { id: true }
    });
  }

  // ── Internes ───────────────────────────────────────────────────────────────

  /** LA requête d'ownership : id + vivante + à moi, en un seul WHERE — tout
   *  échec est le même 404 (rien à apprendre pour un énumérateur). */
  private async ownedLivingVenue(userId: string, venueId: string): Promise<VenueProRow> {
    // Un id hors motif UUID ferait un P2023 côté driver (colonne uuid) :
    // court-circuit en 404 identique, sans toucher la base.
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null, owner: { userId } },
      select: VENUE_PRO_SELECT
    });
    if (!row) this.throwNotFound();
    return row;
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private async proProfileIdOf(userId: string): Promise<string> {
    const profile = await this.prisma.proProfile.findUnique({ where: { userId }, select: { id: true } });
    // D3 : un PRO a TOUJOURS son ProProfile (créés en une transaction au
    // register). Son absence est une rupture d'invariant → 500 volontaire.
    if (!profile) throw new Error(`Invariant D3 rompu : utilisateur PRO ${userId} sans ProProfile`);
    return profile.id;
  }

  private async assertCityExists(cityId: string): Promise<void> {
    const city = await this.prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
    if (!city) {
      throw new BadRequestException({ code: VenueErrorCode.CITY_NOT_FOUND, message: "venue.errors.cityNotFound" });
    }
  }

  /** A3-① : tous les ids doivent exister dans le référentiel Amenity — une
   *  liste vide est légitime (effacement de la sélection). */
  private async assertAmenitiesExist(amenityIds: string[]): Promise<void> {
    if (amenityIds.length === 0) return;
    const found = await this.prisma.amenity.count({ where: { id: { in: amenityIds } } });
    if (found !== amenityIds.length) {
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

/** Mapper partagé pro/admin (l'admin y ADJOINT les deux taux, Lot A3). */
export function toVenueProDTO(row: VenueProRow): VenueProDTO {
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
    capacityMin: row.capacityMin,
    capacityMax: row.capacityMax,
    basePriceCents: row.basePriceCents,
    bookingMode: row.bookingMode,
    publicationStatus: row.publicationStatus,
    status: row.status,
    amenityIds: row.amenities.map((a) => a.amenityId).sort(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
