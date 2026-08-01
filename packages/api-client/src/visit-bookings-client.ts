// Rendez-vous de visite, côté CLIENT authentifié (Lot C5).
//
// Les trois routes servies par C3. Elles vivent ici et non dans `lib/api` de
// l'app cliente parce qu'elles exigent un jeton : elles passent donc par
// `AuthedRequest`, qui porte le rafraîchissement et le mutex de rotation.
import type { VisitBookingCreateInput, VisitBookingDTO } from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface VisitBookingsClient {
  /** Réserve un créneau. 409 `VISIT_SLOT_TAKEN` si quelqu'un vient de le
   *  prendre, `VISIT_ALREADY_BOOKED` si un rendez-vous à venir existe déjà dans
   *  cette salle (D62). */
  create(slug: string, input: VisitBookingCreateInput): Promise<VisitBookingDTO>;
  /** Mes rendez-vous, triés par date croissante, annulés inclus et marqués. */
  listMine(): Promise<VisitBookingDTO[]>;
  /** Annulation DOUCE (D62) : idempotente, refusée sur un rendez-vous passé. */
  cancel(bookingId: string): Promise<void>;
}

export function createVisitBookingsClient(request: AuthedRequest): VisitBookingsClient {
  return {
    create: (slug, input) =>
      request<VisitBookingDTO>(`/venues/${encodeURIComponent(slug)}/visit-bookings`, {
        method: "POST",
        body: input
      }),
    listMine: () => request<VisitBookingDTO[]>("/me/visit-bookings"),
    async cancel(bookingId) {
      await request<void>(`/visit-bookings/${encodeURIComponent(bookingId)}`, { method: "DELETE" });
    }
  };
}
