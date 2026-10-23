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
import { act } from "@testing-library/react";
import type { BookingsProClient, ProClientsClient, ReferentialsClient, QuotesClient, ServicesClient, VenueProClient } from "@zwadj/api-client";
import type { AmenityDTO, ClientRecordCreateInput, VenueProDTO, WilayaDTO, VenueStyleDTO } from "@zwadj/types";
import { ApiError, type AuthClient } from "../lib/auth-client";

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

/** Laisse passer `ms` millisecondes DANS `act` : une absence de requête se prouve en laissant à une requête le temps de partir, et une mise à jour d'état qui tombe pendant une attente
 *  NON enveloppée est un « not wrapped in act(...) » que le plafond de console du dépôt refuse (`src/test-setup.ts`). */
export const laisserPasser = (ms = 30) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

/** Faux SERVEUR des salles du pro — HONNÊTE (rang 37, D331). ⚠ Le défaut qu'il corrige : le double de `create-venue-page.test.tsx` enregistrait la salle AU MOMENT DE L'APPEL
 *  de `create`, c'est-à-dire AVANT de répondre ; une relecture lancée trop tôt (avant la réponse) aurait donc VU la salle, et le test serait resté vert (D326 : « Ma salle
 *  réparée », que Ko a ensuite reproduite comme non réparée). Ici :
 *   · une ÉCRITURE (`create`, `update`, `softDelete`) n'enregistre qu'À LA RÉPONSE, jamais à l'appel : au moins un tour de boucle plus tard, plus tard encore si le test retient la réponse ;
 *   · `listMine` fige l'état du serveur À L'APPEL (comme un serveur qui lit à l'arrivée de la requête) : une réponse retenue puis relâchée plus tard porte un état ANCIEN,
 *     ce qui est exactement ce que fait une réponse lente qui arrive après une plus fraîche ;
 *   · `actElsewhere` change le serveur SANS qu'aucune méthode de ce client soit appelée : l'administrateur qui publie, une autre session qui modifie.
 *  Les cinq méthodes sont des `vi.fn()` : un test compte leurs appels. Les autres méthodes du contrat sont celles de `makeVenueClientDouble`. */
export interface VenueServerDouble {
  /** Le client à passer à `AppProviders` (`venues`). */
  client: VenueProClient;
  /** Ce que le serveur contient MAINTENANT (une copie) — jamais ce que le client croit. */
  stored: () => VenueProDTO[];
  /** Un acte fait AILLEURS : le serveur change, aucune requête de CE client ne part. */
  actElsewhere: (change: (venues: VenueProDTO[]) => VenueProDTO[]) => void;
  /** Retient la RÉPONSE du prochain appel de cette méthode jusqu'à `release()` (plusieurs retenues d'une même méthode s'empilent, dans l'ordre des appels). */
  hold: (method: "listMine" | "getMine" | "create" | "update" | "softDelete") => { release: () => void };
}

export function makeVenueServerDouble(
  initial: VenueProDTO[] = [],
  options: { onCreate?: (input: unknown) => VenueProDTO; overrides?: Partial<VenueProClient> } = {}
): VenueServerDouble {
  let venues: VenueProDTO[] = initial.map((v) => ({ ...v }));
  const waiting: Record<string, Promise<void>[]> = {};
  const hold = (method: string) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (waiting[method] ??= []).push(gate);
    return { release };
  };
  /** Attend la libération de la retenue la plus ancienne, sinon UN tour de boucle : une écriture n'est jamais synchrone avec son appel. */
  const attendre = async (method: string) => {
    await (waiting[method]?.shift() ?? Promise.resolve());
  };
  const copie = () => venues.map((v) => ({ ...v }));
  const client = makeVenueClientDouble(null, {
    listMine: vi.fn().mockImplementation(async () => {
      const etatALAppel = copie();
      await attendre("listMine");
      return etatALAppel;
    }),
    getMine: vi.fn().mockImplementation(async (id: string) => {
      await attendre("getMine");
      const trouvee = venues.find((v) => v.id === id);
      if (!trouvee) throw new ApiError(404, "VENUE_NOT_FOUND", undefined);
      return { ...trouvee };
    }),
    create: vi.fn().mockImplementation(async (input: unknown) => {
      await attendre("create");
      if (!options.onCreate) throw new Error("makeVenueServerDouble : `onCreate` est requis pour créer une salle");
      const creee = options.onCreate(input);
      venues = [...venues, creee];
      return { ...creee };
    }),
    update: vi.fn().mockImplementation(async (id: string, patch: Partial<VenueProDTO>) => {
      await attendre("update");
      const i = venues.findIndex((v) => v.id === id);
      if (i < 0) throw new ApiError(404, "VENUE_NOT_FOUND", undefined);
      venues = venues.map((v, k) => (k === i ? { ...v, ...patch } : v));
      return { ...venues[i]! };
    }),
    softDelete: vi.fn().mockImplementation(async (id: string) => {
      await attendre("softDelete");
      venues = venues.filter((v) => v.id !== id);
    }),
    ...options.overrides
  });
  return {
    client,
    stored: copie,
    actElsewhere: (change) => {
      venues = change(copie());
    },
    hold
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
    // Rang 33 (D326) : le PDF du devis. Le défaut REND un Blob (un test qui clique un bouton de remise n'a pas à connaître le transport) ;
    // un test qui veut un ÉCHEC le remplace par `vi.fn().mockRejectedValue(new ApiError(…))`.
    document: vi.fn().mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" })),
    // Rang 41 (D336, K-5) : la boîte de langue complète la copie du nom. Sans défaut utile : un test qui passe par elle dit ce que le serveur rend.
    completeClientName: vi.fn(),
    ...overrides
  };
}

/** Double du client des FICHES CLIENT (rang 41, D336 — K-1, K-2, K-3, K-3b).
 *
 *  ⚠ Par défaut, AUCUNE fiche n'est trouvée (K-1 rend `{ found: false }`) et la création (K-2) REND une fiche faite des valeurs REÇUES, « fiche-1 » : un parcours
 *  qui crée une fiche n'a pas à connaître le transport. Un test qui veut une fiche trouvée, liée, ou un refus remplace la méthode. Les deux écritures APRÈS la
 *  création (K-3, K-3b) n'ont aucun défaut : l'écran du parcours ne doit JAMAIS les appeler (MD-17), et un appel inattendu rendrait `undefined`, pas une fiche. */
export function makeProClientsDouble(overrides: Partial<ProClientsClient> = {}): ProClientsClient {
  return {
    lookup: vi.fn().mockResolvedValue({ found: false }),
    create: vi.fn(async (input: ClientRecordCreateInput) => ({
      created: true,
      record: {
        id: "fiche-1",
        phone: input.phone ?? null,
        email: input.email ?? null,
        nameAr: input.nameAr ?? null,
        nameLatin: input.nameLatin ?? null,
        linked: false,
        createdAt: "2026-10-22T10:00:00.000Z",
        updatedAt: "2026-10-22T10:00:00.000Z"
      }
    })),
    completeNames: vi.fn(),
    update: vi.fn(),
    ...overrides
  };
}
