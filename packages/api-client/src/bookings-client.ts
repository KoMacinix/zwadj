// Demandes de réservation de salle — Lot E1b.
//
// Deux clients dans un seul fichier parce qu'ils servent UN seul sujet et un
// seul contrat. Les séparer obligerait à faire vivre deux fois les mêmes types
// et les mêmes chemins.
//
// Topologie identique au reste du dépôt, volontairement asymétrique — NE PAS
// « harmoniser » : le CLIENT écrit sur `/venues/:slug/bookings` et lit sur
// `/me/bookings` ; le PRO lit sur `/pro/venues/:id/bookings` et agit sur
// `/pro/bookings/:id/…`.
import type {
  BookingCancelInput,
  BookingCreateInput,
  BookingDTO,
  BookingDeclineInput,
  ProBookingDTO
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface BookingsClient {
  /** Envoie une demande. Elle ne verrouille RIEN : c'est l'acceptation du pro
   *  qui prend la date.
   *
   *  409 `BOOKING_PRICE_CHANGED` si le tarif a bougé depuis l'affichage — le
   *  corps de l'erreur porte alors `totalCents` et `depositCents` réels, à
   *  réafficher plutôt qu'à faire rejouer à l'aveugle. */
  create(slug: string, input: BookingCreateInput): Promise<BookingDTO>;
  /** Mes demandes, la date la plus proche d'abord. Refusées et annulées
   *  INCLUSES et marquées. */
  listMine(): Promise<BookingDTO[]>;
  /** Motif obligatoire sur une demande déjà ACCEPTED (D83). */
  cancel(bookingId: string, input: BookingCancelInput): Promise<BookingDTO>;
}

export function createBookingsClient(request: AuthedRequest): BookingsClient {
  return {
    create: (slug, input) =>
      request<BookingDTO>(`/venues/${encodeURIComponent(slug)}/bookings`, { method: "POST", body: input }),
    listMine: () => request<BookingDTO[]>("/me/bookings"),
    cancel: (bookingId, input) =>
      request<BookingDTO>(`/bookings/${encodeURIComponent(bookingId)}`, { method: "DELETE", body: input })
  };
}

export interface BookingsProClient {
  /** Les demandes d'une de mes salles, `conflictIds` compris — calculés à la
   *  lecture, jamais persistés. */
  listForVenue(venueId: string): Promise<ProBookingDTO[]>;
  /** VERROUILLE la date. 409 `BOOKING_SLOT_TAKEN` (la base a refusé) ou
   *  `BOOKING_BLOCKED_PERIOD` (un blocage recouvre la plage). */
  accept(bookingId: string): Promise<BookingDTO>;
  /** Motif facultatif (D83). */
  decline(bookingId: string, input: BookingDeclineInput): Promise<BookingDTO>;
  /** Annule une demande DÉJÀ ACCEPTÉE et libère la date. */
  cancel(bookingId: string, input: BookingCancelInput): Promise<BookingDTO>;
}

export function createBookingsProClient(request: AuthedRequest): BookingsProClient {
  const act = (bookingId: string, action: string, body?: unknown) =>
    request<BookingDTO>(`/pro/bookings/${encodeURIComponent(bookingId)}/${action}`, { method: "POST", body });

  return {
    listForVenue: (venueId) => request<ProBookingDTO[]>(`/pro/venues/${encodeURIComponent(venueId)}/bookings`),
    accept: (bookingId) => act(bookingId, "accept", {}),
    decline: (bookingId, input) => act(bookingId, "decline", input),
    cancel: (bookingId, input) => act(bookingId, "cancel", input)
  };
}
