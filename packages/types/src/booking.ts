import type { BookingStatus, PaymentMethod } from "./enums";

/** DTO d'une réservation (demande → confirmée) — aligné sur le modèle Prisma `Booking`. */
export interface BookingDTO {
  id: string;
  venueId: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  eventDate: string; // YYYY-MM-DD (date locale de l'événement)
  startsAt: string; // ISO 8601 UTC
  endsAt: string; // ISO 8601 UTC
  guests: number;
  /** Centimes de DZD. */
  totalCents: number;
  depositCents: number;
  createdAt: string;
}
