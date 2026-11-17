// Client HTTP de LECTURE du refus, côté PRO — ADM-1 (D349, rang 51, R-3, D-5 p2). Un client à part : `VenueCrudClient` n'est PAS étendu — toute méthode ajoutée à cette interface casse les doubles
// construits à la main dans `apps/pro` (le piège déjà payé en A5, voir `account-client.ts`). Le chemin est un LITTÉRAL dans l'appel à `request(...)` (D182).
// L'écran qui l'affiche — l'étape « Publication » de l'assistant d'une salle — est ADM-2 (rang 52).
import type { VenuePublicationReviewDTO } from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface VenuePublicationClient {
  /** L'état de publication de SA salle et, le cas échéant, son refus (motif et date). 404 indistinct pour toute salle qui n'est pas la sienne. */
  getPublicationReview(venueId: string): Promise<VenuePublicationReviewDTO>;
}

export function createVenuePublicationClient(request: AuthedRequest): VenuePublicationClient {
  return {
    getPublicationReview: (venueId) => request<VenuePublicationReviewDTO>(`/pro/venues/${encodeURIComponent(venueId)}/publication`)
  };
}
