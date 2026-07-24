// Client HTTP du domaine VENUE (Lot A5) — §8, option (a) validée.
//
// Deux clients, deux régimes assumés :
//   1. VENUE PRO (authentifié) : construit AU-DESSUS de `authedRequest`, la
//      primitive générique exposée par AuthClient. Le domaine venue reste donc
//      HORS de la closure auth tout en PARTAGEANT le token mémoire (D2) et le
//      mutex single-flight du refresh — N appels venue en 401 ⇒ UN seul
//      POST /auth/refresh, UN rejeu, jamais de boucle.
//   2. RÉFÉRENTIELS (`/wilayas`, `/amenities`) : endpoints PUBLICS, donc client
//      autonome, sans bearer ni refresh. Ce n'est PAS la 3ᵉ voie interdite —
//      l'interdit est un appel AUTHENTIFIÉ en fetch nu sans refresh ; un GET
//      public sans bearer est le bon patron. A7/A8 ajouteront les endpoints
//      publics venue dans un client séparé, la primitive authentifiée
//      ci-dessus restant générique et réutilisable.
//
// Aucune lecture d'env ici (même règle que le client auth) : chaque app injecte
// sa base URL. `ApiError`/`NetworkError`/`toApiError` sont RÉUTILISÉS depuis le
// client auth — la doctrine d'erreur ne doit exister qu'à un seul endroit.
import type {
  AmenityDTO,
  VenueCreateInput,
  VenueProDTO,
  VenueUpdateInput,
  WilayaDTO
} from "@zwadj/types";
import { NetworkError, toApiError } from "./auth-client";

/** Primitive authentifiée générique (implémentée par `AuthClient.authedRequest`). */
export type AuthedRequest = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

/**
 * Topologie A2, volontairement asymétrique — NE PAS « harmoniser » :
 * ÉCRITURES sur /venues, LECTURES pro sur /pro/venues.
 */
export interface VenueProClient {
  /** Toutes mes salles hors supprimées, tri updatedAt desc, sans pagination. */
  listMine(): Promise<VenueProDTO[]>;
  /** Par ID (le slug est public-only). 404 INDISTINCT — cf. VENUE_NOT_FOUND. */
  getMine(id: string): Promise<VenueProDTO>;
  /** Crée en DRAFT/ACTIVE, slug figé généré serveur depuis nameFr. */
  create(input: VenueCreateInput): Promise<VenueProDTO>;
  /** PARTIEL réel : `{ status }` seul est valide. `amenityIds` = remplacement
   *  d'ensemble complet, jamais un delta. */
  update(id: string, input: VenueUpdateInput): Promise<VenueProDTO>;
  /** 204 sans corps (soft delete) : toute opération ultérieure → 404 indistinct. */
  softDelete(id: string): Promise<void>;
}

export function createVenueProClient(request: AuthedRequest): VenueProClient {
  return {
    listMine: () => request<VenueProDTO[]>("/pro/venues"),
    getMine: (id) => request<VenueProDTO>(`/pro/venues/${encodeURIComponent(id)}`),
    create: (input) => request<VenueProDTO>("/venues", { method: "POST", body: input }),
    update: (id, input) => request<VenueProDTO>(`/venues/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    async softDelete(id) {
      await request<void>(`/venues/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  };
}

/** Référentiels publics (Lot A1) — aucun token, aucun refresh. */
export interface ReferentialsClient {
  /** Wilayas AVEC leurs villes imbriquées, tri `code` croissant. */
  listWilayas(): Promise<WilayaDTO[]>;
  /** 23 équipements : `key` stable + libellés data + nom d'icône lucide. */
  listAmenities(): Promise<AmenityDTO[]>;
}

export function createReferentialsClient(
  baseUrl: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): ReferentialsClient {
  async function publicGet<T>(path: string): Promise<T> {
    let res: Response;
    try {
      // Ni `Authorization`, ni `credentials` : ces routes sont publiques et
      // doivent le rester (elles servent aussi la recherche client A7 en SSR).
      res = await fetchImpl(`${baseUrl}/api/v1${path}`);
    } catch {
      throw new NetworkError();
    }
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as T;
  }

  return {
    listWilayas: () => publicGet<WilayaDTO[]>("/wilayas"),
    listAmenities: () => publicGet<AmenityDTO[]>("/amenities")
  };
}
