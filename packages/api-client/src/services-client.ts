// Catalogue de prestations — Lot E2c.
//
// Topologie du dépôt, volontairement asymétrique — NE PAS « harmoniser » :
// ÉCRITURES sur `/venues/:id/services` et `/services/:id`, LECTURE pro sur
// `/pro/venues/:id/services`.
import type { ServiceCreateInput, ServiceDTO, ServiceUpdateInput } from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface ServicesClient {
  /** Le catalogue d'une salle, prestations RETIRÉES comprises : le pro doit
   *  pouvoir les remettre en vente. C'est la vue publique qui filtrera. */
  listForVenue(venueId: string): Promise<ServiceDTO[]>;
  /** La prestation ET son tarif en une seule requête (D89) : les séparer
   *  laisserait une fenêtre où un FIXED existe sans prix. */
  create(venueId: string, input: ServiceCreateInput): Promise<ServiceDTO>;
  /** Ni le type ni les prix ne se modifient ici (D90). */
  update(serviceId: string, input: ServiceUpdateInput): Promise<ServiceDTO>;
  /** Réservée au cas « créée par erreur, jamais utilisée » : 409
   *  `SERVICE_IN_USE` dès que la prestation figure sur une réservation (D93). */
  remove(serviceId: string): Promise<void>;
}

export function createServicesClient(request: AuthedRequest): ServicesClient {
  return {
    listForVenue: (venueId) => request<ServiceDTO[]>(`/pro/venues/${encodeURIComponent(venueId)}/services`),
    create: (venueId, input) =>
      request<ServiceDTO>(`/venues/${encodeURIComponent(venueId)}/services`, { method: "POST", body: input }),
    update: (serviceId, input) =>
      request<ServiceDTO>(`/services/${encodeURIComponent(serviceId)}`, { method: "PATCH", body: input }),
    remove: (serviceId) => request<void>(`/services/${encodeURIComponent(serviceId)}`, { method: "DELETE" })
  };
}
