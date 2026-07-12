import type { BookingMode, VenuePublicationStatus } from "./enums";

/** Résumé d'une salle pour les listes/recherche — aligné sur le modèle Prisma `Venue`. */
export interface VenueSummaryDTO {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  districtFr: string | null;
  districtAr: string | null;
  capacityMin: number;
  capacityMax: number;
  /** Centimes de DZD (invariant : argent en entiers). */
  basePriceCents: number;
  bookingMode: BookingMode;
  publicationStatus: VenuePublicationStatus;
}
