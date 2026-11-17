// Client HTTP du domaine ADMIN — ADM-1 (D349, rang 51, R-7) : la file « en attente de publication », le détail, publier, rejeter, et la file des suppressions de compte (dont les routes existaient
// sans client). Bâti sur `authedRequest`, comme les autres : il PARTAGE le jeton mémoire (D2) et le mutex single-flight du refresh.
//
// ⛔ MD-ADM-7 (R-1) : AUCUNE méthode n'appelle `PATCH …/commission-rate` — le taux reste en lecture seule (il se lit dans `getVenue`). Une garde de source le mesure (`admin-client.test.ts`).
// ⚠ Chaque chemin est un LITTÉRAL dans l'appel à `request(...)`, sans intermédiaire : `contract-api-client.int-spec.ts` relève les chemins dans les sources et les confronte au routeur (D182) ;
// un chemin construit par un raccourci `act(id, action)` y serait invisible.
// ⚠ Les types sont ceux de `@zwadj/types` ; aucun texte ici (D-2 : les textes de l'admin vivent hors de `packages/i18n`, avec l'écran).
import type {
  AdminDeletionRequestDTO,
  DeletionRequestDTO,
  VenueAdminDTO,
  VenueAdminDetailDTO,
  VenuePendingPageDTO,
  VenuePendingQueryInput,
  VenueRejectResultDTO
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface AdminClient {
  /** La file « en attente de publication ». Sans argument, le serveur applique page 1 et sa taille par défaut. */
  listPendingVenues(query?: VenuePendingQueryInput): Promise<VenuePendingPageDTO>;
  /** Le détail d'une salle vivante (les deux taux en LECTURE). */
  getVenue(venueId: string): Promise<VenueAdminDetailDTO>;
  /** Idempotent : une salle déjà publiée rend 200 sans effet. */
  publishVenue(venueId: string): Promise<VenueAdminDTO>;
  /** Le motif est obligatoire (le serveur le rogne et le borne). */
  rejectVenue(venueId: string, reason: string): Promise<VenueRejectResultDTO>;
  /** La file des demandes de suppression de compte ; sans statut, le serveur rend les PENDING. */
  listDeletionRequests(status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"): Promise<AdminDeletionRequestDTO[]>;
  approveDeletion(requestId: string, decisionNote?: string): Promise<DeletionRequestDTO>;
  rejectDeletion(requestId: string, decisionNote?: string): Promise<DeletionRequestDTO>;
}

/** La querystring de la file : seules les clés fournies voyagent — le serveur a ses défauts. */
function pendingQueryString(query: VenuePendingQueryInput | undefined): string {
  const params = new URLSearchParams();
  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  return params.toString();
}

export function createAdminClient(request: AuthedRequest): AdminClient {
  return {
    listPendingVenues: (query) =>
      request<VenuePendingPageDTO>(`/admin/venues/pending-publication?${pendingQueryString(query)}`),
    getVenue: (venueId) => request<VenueAdminDetailDTO>(`/admin/venues/${encodeURIComponent(venueId)}`),
    publishVenue: (venueId) =>
      request<VenueAdminDTO>(`/admin/venues/${encodeURIComponent(venueId)}/publish`, { method: "POST", body: {} }),
    rejectVenue: (venueId, reason) =>
      request<VenueRejectResultDTO>(`/admin/venues/${encodeURIComponent(venueId)}/reject`, { method: "POST", body: { reason } }),
    listDeletionRequests: (status) =>
      request<AdminDeletionRequestDTO[]>(`/admin/deletion-requests?${status === undefined ? "" : new URLSearchParams({ status }).toString()}`),
    approveDeletion: (requestId, decisionNote) =>
      request<DeletionRequestDTO>(`/admin/deletion-requests/${encodeURIComponent(requestId)}/approve`, {
        method: "POST",
        body: decisionNote === undefined ? {} : { decisionNote }
      }),
    rejectDeletion: (requestId, decisionNote) =>
      request<DeletionRequestDTO>(`/admin/deletion-requests/${encodeURIComponent(requestId)}/reject`, {
        method: "POST",
        body: decisionNote === undefined ? {} : { decisionNote }
      })
  };
}
