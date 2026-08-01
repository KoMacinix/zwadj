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
  AvailabilityBlockCreateInput,
  AvailabilityBlockDTO,
  AvailabilityWindowQueryInput,
  PricingRuleCreateInput,
  PricingRuleDTO,
  PricingRuleUpdateInput,
  SlotTemplateCreateInput,
  SlotTemplateDTO,
  SlotTemplateUpdateInput,
  VenueCreateInput,
  VenuePhotoAltUpdateInput,
  VenuePhotoDTO,
  VenuePhotoOrderInput,
  VenueProDTO,
  VenueUpdateInput,
  VenueVirtualTourDTO,
  VenueVirtualTourUpdateInput,
  WilayaDTO,
  VenueStyleDTO,
  ProVisitBookingDTO
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
  /** D45 — rattache/détache le modèle Matterport. Endpoint SÉPARÉ du PATCH
   *  général : la saisie est brute (ID ou URL) et le serveur la normalise, donc
   *  le corps ne ressemble pas au champ stocké. Chaîne vide = désactivation. */
  updateVirtualTour(id: string, input: VenueVirtualTourUpdateInput): Promise<VenueVirtualTourDTO>;

  // ── Photos (A4 côté API, A6a-P côté UI) ────────────────────────────────────
  // `File`/`FormData` vivent ICI et nulle part ailleurs : `packages/types`
  // compile en `lib: ["ES2022"]` seule, sans DOM — ces types n'y existent pas.

  /** multipart, champ « file ». Retour : LA photo créée, en fin de galerie
   *  (`sortOrder = max+1` garanti serveur — on ne recalcule rien). */
  addPhoto(id: string, file: File): Promise<VenuePhotoDTO>;
  /** ENSEMBLE ordonné COMPLET (A4-③), jamais un delta. Retour : la galerie
   *  entière dans le nouvel ordre — à substituer EN BLOC à l'état local. */
  reorderPhotos(id: string, input: VenuePhotoOrderInput): Promise<VenuePhotoDTO[]>;
  /** altFr/altAr, `null` = effacement explicite. Retour : la photo à jour. */
  updatePhotoAlt(id: string, photoId: string, input: VenuePhotoAltUpdateInput): Promise<VenuePhotoDTO>;
  /** 204 sans corps : l'appelant n'a RIEN à réconcilier localement, il refetch. */
  deletePhoto(id: string, photoId: string): Promise<void>;

  // ── Créneaux de fête (B1) ─────────────────────────────────────────────────
  // ⚠ Toute écriture de créneau RECALCULE `Venue.basePriceCents` (dérivé D46,
  // minimum des créneaux actifs et de leurs règles actives) dans la MÊME
  // transaction. Le DTO rendu ne porte QUE le créneau : un appelant qui affiche
  // aussi le « à partir de » de la salle doit refetch, jamais recalculer —
  // deux formules concurrentes du même minimum finiraient par diverger.

  /** Retour : LE créneau créé. 409 possibles : SLOT_TEMPLATE_OVERLAP,
   *  SLOT_TEMPLATE_SINGLE_MODE. */
  createSlotTemplate(id: string, input: SlotTemplateCreateInput): Promise<SlotTemplateDTO>;
  /** PATCH partiel. `isActive: false` = RETRAIT sans casser l'historique —
   *  c'est la voie normale, la suppression dure ne l'est pas. */
  updateSlotTemplate(id: string, slotId: string, input: SlotTemplateUpdateInput): Promise<SlotTemplateDTO>;
  /** Suppression DURE. 409 `SLOT_TEMPLATE_IN_USE` si un devis ou une
   *  réservation le référence : ce qui a été vendu ne se réécrit pas. */
  deleteSlotTemplate(id: string, slotId: string): Promise<void>;

  // ── Règles de prix (B2) ───────────────────────────────────────────────────
  // Les règles voyagent DANS `SlotTemplateDTO.pricingRules` en lecture : il n'y
  // a pas d'endpoint de liste, et il n'en faut pas — un créneau sans ses règles
  // est un prix sans son contexte.

  /** Le TYPE n'est pas modifiable ensuite : changer le type en place laisserait
   *  des bornes de saison sur une règle férié. On supprime et on recrée. */
  createPricingRule(id: string, slotId: string, input: PricingRuleCreateInput): Promise<PricingRuleDTO>;
  updatePricingRule(
    id: string,
    slotId: string,
    ruleId: string,
    input: PricingRuleUpdateInput
  ): Promise<PricingRuleDTO>;
  deletePricingRule(id: string, slotId: string, ruleId: string): Promise<void>;

  // ── Blocages de disponibilité (B3, D51) ───────────────────────────────────

  /** LECTURE pro, donc préfixe /pro (topologie A2). Fenêtre obligatoire, mêmes
   *  bornes que l'endpoint public : dates civiles, 92 jours rendus au plus.
   *  Rend les blocages qui RECOUVRENT la fenêtre, pas seulement ceux qui y
   *  commencent — un blocage de six mois doit apparaître. */
  listAvailabilityBlocks(id: string, window: AvailabilityWindowQueryInput): Promise<AvailabilityBlockDTO[]>;
  /** C3b — rendez-vous de visite d'une salle. Fenêtre NON écrêtée (D70) : le
   *  passé est l'historique du pro. */
  listVisitBookings(id: string, window: AvailabilityWindowQueryInput): Promise<ProVisitBookingDTO[]>;
  /** C3b — annulation par le pro. Le client est prévenu par e-mail. */
  cancelVisitBooking(id: string, bookingId: string): Promise<void>;
  /** D51 — `startsAt`/`endsAt` en date-heure civile LOCALE `YYYY-MM-DDTHH:mm`,
   *  SANS décalage : l'API applique UTC+1 elle-même. Envoyer un ISO offsetté
   *  créerait un blocage aux mauvaises heures d'Alger. Le DTO rendu porte le
   *  MÊME repère civil — rien à reconvertir ici.
   *  409 `AVAILABILITY_BLOCK_CONFLICT` si la plage recouvre une réservation
   *  ACCEPTED/CONFIRMED ; une demande PENDING, elle, ne s'y oppose pas. */
  createAvailabilityBlock(id: string, input: AvailabilityBlockCreateInput): Promise<AvailabilityBlockDTO>;
  /** 204 sans corps. Autorisé même sur une plage passée. */
  deleteAvailabilityBlock(id: string, blockId: string): Promise<void>;
}

export function createVenueProClient(request: AuthedRequest): VenueProClient {
  return {
    listMine: () => request<VenueProDTO[]>("/pro/venues"),
    getMine: (id) => request<VenueProDTO>(`/pro/venues/${encodeURIComponent(id)}`),
    create: (input) => request<VenueProDTO>("/venues", { method: "POST", body: input }),
    update: (id, input) => request<VenueProDTO>(`/venues/${encodeURIComponent(id)}`, { method: "PATCH", body: input }),
    async softDelete(id) {
      await request<void>(`/venues/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    updateVirtualTour: (id, input) =>
      request<VenueVirtualTourDTO>(`/venues/${encodeURIComponent(id)}/virtual-tour`, {
        method: "PATCH",
        body: input
      }),

    addPhoto(id, file) {
      const form = new FormData();
      // Le nom du champ est le contrat du FileInterceptor("file") côté API :
      // un autre nom donne 400 MEDIA_FILE_REQUIRED, pas une erreur de type.
      form.append("file", file);
      return request<VenuePhotoDTO>(`/venues/${encodeURIComponent(id)}/photos`, { method: "POST", body: form });
    },

    reorderPhotos: (id, input) =>
      request<VenuePhotoDTO[]>(`/venues/${encodeURIComponent(id)}/photos/order`, { method: "PATCH", body: input }),

    updatePhotoAlt: (id, photoId, input) =>
      request<VenuePhotoDTO>(
        `/venues/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
        { method: "PATCH", body: input }
      ),

    async deletePhoto(id, photoId) {
      await request<void>(`/venues/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`, {
        method: "DELETE"
      });
    },

    createSlotTemplate: (id, input) =>
      request<SlotTemplateDTO>(`/venues/${encodeURIComponent(id)}/slot-templates`, { method: "POST", body: input }),

    updateSlotTemplate: (id, slotId, input) =>
      request<SlotTemplateDTO>(
        `/venues/${encodeURIComponent(id)}/slot-templates/${encodeURIComponent(slotId)}`,
        { method: "PATCH", body: input }
      ),

    async deleteSlotTemplate(id, slotId) {
      await request<void>(`/venues/${encodeURIComponent(id)}/slot-templates/${encodeURIComponent(slotId)}`, {
        method: "DELETE"
      });
    },

    createPricingRule: (id, slotId, input) =>
      request<PricingRuleDTO>(
        `/venues/${encodeURIComponent(id)}/slot-templates/${encodeURIComponent(slotId)}/pricing-rules`,
        { method: "POST", body: input }
      ),

    updatePricingRule: (id, slotId, ruleId, input) =>
      request<PricingRuleDTO>(
        `/venues/${encodeURIComponent(id)}/slot-templates/${encodeURIComponent(slotId)}` +
          `/pricing-rules/${encodeURIComponent(ruleId)}`,
        { method: "PATCH", body: input }
      ),

    async deletePricingRule(id, slotId, ruleId) {
      await request<void>(
        `/venues/${encodeURIComponent(id)}/slot-templates/${encodeURIComponent(slotId)}` +
          `/pricing-rules/${encodeURIComponent(ruleId)}`,
        { method: "DELETE" }
      );
    },

    listAvailabilityBlocks: (id, window) =>
      // `URLSearchParams` encode les deux bornes : un `from` non encodé
      // passerait tel quel et l'API répondrait 400 sur une forme qu'on croit
      // avoir envoyée correctement.
      request<AvailabilityBlockDTO[]>(
        `/pro/venues/${encodeURIComponent(id)}/availability-blocks?` +
          new URLSearchParams({ from: window.from, to: window.to }).toString()
      ),

    // C3b — même encodage que la fenêtre des blocages, même raison.
    listVisitBookings: (id, window) =>
      request<ProVisitBookingDTO[]>(
        `/pro/venues/${encodeURIComponent(id)}/visit-bookings?` +
          new URLSearchParams({ from: window.from, to: window.to }).toString()
      ),

    cancelVisitBooking: (id, bookingId) =>
      request<void>(
        `/pro/venues/${encodeURIComponent(id)}/visit-bookings/${encodeURIComponent(bookingId)}`,
        { method: "DELETE" }
      ),

    createAvailabilityBlock: (id, input) =>
      request<AvailabilityBlockDTO>(`/venues/${encodeURIComponent(id)}/availability-blocks`, {
        method: "POST",
        body: input
      }),

    async deleteAvailabilityBlock(id, blockId) {
      await request<void>(
        `/venues/${encodeURIComponent(id)}/availability-blocks/${encodeURIComponent(blockId)}`,
        { method: "DELETE" }
      );
    }
  };
}

/** Référentiels publics (Lot A1) — aucun token, aucun refresh. */
export interface ReferentialsClient {
  /** Wilayas AVEC leurs villes imbriquées, tri `code` croissant. */
  listWilayas(): Promise<WilayaDTO[]>;
  /** 23 équipements : `key` stable + libellés data + nom d'icône lucide. */
  listAmenities(): Promise<AmenityDTO[]>;
  /** Styles de salle (D65) : `key` stable + libellés data, triés `sortOrder`. */
  listVenueStyles(): Promise<VenueStyleDTO[]>;
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
    listAmenities: () => publicGet<AmenityDTO[]>("/amenities"),
    listVenueStyles: () => publicGet<VenueStyleDTO[]>("/venue-styles")
  };
}
