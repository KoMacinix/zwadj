// Doubles de test partagés de l'app Pro.
//
// ── Pourquoi ce fichier existe ───────────────────────────────────────────────
// `VenueProClient` était recopié à l'identique dans SEPT fichiers de test.
// Chaque extension du contrat les cassait tous les sept — c'est arrivé en B1
// (« 3 fixtures, 2 doubles Prisma et 3 assertions »), puis en B4a avec les neuf
// méthodes créneaux/règles/blocages. Le coût n'était pas la correction, mais le
// fait qu'elle se répète et qu'on finisse par la faire sans la lire.
//
// Ici, une seule définition. Ajouter une méthode au contrat casse UN endroit,
// et le typage dit lequel.
//
// ⚠ Les mocks sont créés à CHAQUE appel de fabrique, jamais partagés entre
// tests : un `vi.fn()` de portée module garderait ses appels d'un test à
// l'autre et rendrait les compteurs faux dans l'ordre d'exécution seulement —
// le genre d'échec qui n'apparaît qu'en CI.
import { vi } from "vitest";
import type { BookingsProClient, ReferentialsClient, QuotesClient, ServicesClient, VenueProClient } from "@zwadj/api-client";
import type { AmenityDTO, VenueProDTO, WilayaDTO, VenueStyleDTO } from "@zwadj/types";
import type { AuthClient } from "../lib/auth-client";

export interface AuthenticatedProUser {
  id: string;
  email: string;
  role: "PRO";
  emailVerified: boolean;
  phone: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  proProfile: { businessName: string; phone: string; phone2: string | null };
}

export const PRO_USER: AuthenticatedProUser = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO",
  emailVerified: true,
  phone: "+213550000009",
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salles Pro", phone: "+213550000009", phone2: null }
};

/** Double d'authentification. `bootstrap` résout un PRO connecté par défaut :
 *  c'est l'état de départ de tous les écrans d'édition. */
export function makeAuthDouble(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(PRO_USER),
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    authedRequest: vi.fn(),
    getAccessToken: () => "jwt",
    ...overrides
  } as AuthClient;
}

export function makeReferentialsDouble(
  wilayas: WilayaDTO[] = [],
  amenities: AmenityDTO[] = [],
  venueStyles: VenueStyleDTO[] = []
): ReferentialsClient {
  return {
    listWilayas: vi.fn().mockResolvedValue(wilayas),
    listAmenities: vi.fn().mockResolvedValue(amenities),
    listVenueStyles: vi.fn().mockResolvedValue(venueStyles)
  };
}

/** Double du client venue PRO — la SEULE définition du dépôt.
 *
 *  Les méthodes qui rendent 204 résolvent `undefined` (un `vi.fn()` nu rendrait
 *  `undefined` aussi, mais l'intention resterait muette). Les lectures rendent
 *  une valeur vide plutôt que `undefined`, sinon chaque écran devrait se
 *  défendre d'un `null` que l'API ne produit jamais. */
export function makeVenueClientDouble(
  venue: VenueProDTO | null = null,
  overrides: Partial<VenueProClient> = {}
): VenueProClient {
  return {
    listMine: vi.fn().mockResolvedValue(venue ? [venue] : []),
    getMine: vi.fn().mockResolvedValue(venue),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    updateVirtualTour: vi.fn(),
    addPhoto: vi.fn(),
    reorderPhotos: vi.fn(),
    updatePhotoAlt: vi.fn(),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    createSlotTemplate: vi.fn(),
    updateSlotTemplate: vi.fn(),
    deleteSlotTemplate: vi.fn().mockResolvedValue(undefined),
    createPricingRule: vi.fn(),
    updatePricingRule: vi.fn(),
    deletePricingRule: vi.fn().mockResolvedValue(undefined),
    listAvailabilityBlocks: vi.fn().mockResolvedValue([]),
    createAvailabilityBlock: vi.fn(),
    deleteAvailabilityBlock: vi.fn(),
    // Calendrier pro : réponse VIDE mais BIEN FORMÉE par défaut. Un `vi.fn()`
    // nu rendrait `undefined`, et le calendrier tomberait dans son `catch` — un
    // « calendrier indisponible » silencieux dans tous les tests qui montent la
    // coquille sans s'intéresser au calendrier.
    availability: vi.fn().mockResolvedValue({
      venueId: "v1",
      slug: "salle",
      bookingMode: "SINGLE_SLOT",
      from: "2026-08-01",
      to: "2026-08-31",
      slots: [],
      days: []
    }),
    listVisitBookings: vi.fn().mockResolvedValue([]),
    cancelVisitBooking: vi.fn().mockResolvedValue(undefined).mockResolvedValue(undefined),
    ...overrides
  };
}

/** Double des demandes de réservation (E1b). Même règle que les autres : mocks
 *  créés à CHAQUE appel, jamais partagés entre tests. */
export function makeBookingsProDouble(overrides: Partial<BookingsProClient> = {}): BookingsProClient {
  return {
    listForVenue: vi.fn().mockResolvedValue([]),
    accept: vi.fn(),
    decline: vi.fn(),
    cancel: vi.fn(),
    ...overrides
  };
}

/** Double du catalogue (E2c). */
export function makeServicesDouble(overrides: Partial<ServicesClient> = {}): ServicesClient {
  return {
    listForVenue: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides
  };
}

/** Double des devis (E2e, contrat Q2).
 *
 *  ⚠ `send` a laissé place à `deliver`, et `conversion` a perdu `expired` : le
 *  typage fait échouer ICI tout test resté sur l'ancien contrat, au lieu de le
 *  laisser vert en appelant une méthode qui n'existe plus. C'est la raison
 *  d'être du fichier — le double était recopié dans sept endroits, et chaque
 *  extension du contrat les cassait tous les sept. */
export function makeQuotesDouble(overrides: Partial<QuotesClient> = {}): QuotesClient {
  return {
    listForVenue: vi.fn().mockResolvedValue([]),
    conversion: vi.fn().mockResolvedValue({ delivered: 0, accepted: 0, cancelled: 0 }),
    create: vi.fn(),
    deliver: vi.fn(),
    revise: vi.fn(),
    convert: vi.fn(),
    cancel: vi.fn(),
    ...overrides
  };
}
