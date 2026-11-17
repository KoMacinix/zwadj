// Doubles de test du client ADMIN — ADM-2 (D350, rang 52). UN endroit (D331) : les trois écrans et la garde se mesurent sur ces doubles, jamais sur un `vi.fn()` recopié dans chaque fichier.
//
// ⚠ LE FAUX SERVEUR EST HONNÊTE (patron de `makeVenueServerDouble`, D331). Un double dont l'écriture existe AVANT la réponse rend vert un écran qui affiche « fait » trop tôt (MD-ADM-15) :
//  · une ÉCRITURE (publier, rejeter, approuver, rejeter une suppression) n'enregistre qu'À LA RÉPONSE, au moins un tour de boucle après l'appel — plus tard si le test la RETIENT (`hold`) ;
//  · une LECTURE (la file, le détail, la liste des suppressions) rend l'état du serveur À L'APPEL ;
//  · `actElsewhere` change le serveur SANS qu'aucune méthode du client soit appelée : un autre admin qui publie, l'utilisateur qui annule sa demande ;
//  · un refus métier se fabrique par `ApiError` (le code et le statut que l'API rend), une panne par `NetworkError`.
import { vi } from "vitest";
import { ApiError, NetworkError, type AdminClient } from "@zwadj/api-client";
import {
  VenuePublicationStatus,
  type AdminDeletionRequestDTO,
  type DeletionRequestDTO,
  type VenueAdminDTO,
  type VenueAdminDetailDTO,
  type VenuePendingItemDTO,
  type VenuePendingPageDTO,
  type VenueRejectResultDTO
} from "@zwadj/types";

export { ApiError, NetworkError };

/** Une salle du faux serveur : le détail ET ce qu'il faut pour la file. */
export type FakeVenue = VenueAdminDetailDTO;

let compteur = 0;

export function aVenue(over: Partial<FakeVenue> = {}): FakeVenue {
  compteur += 1;
  const n = over.number ?? compteur;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    slug: `salle-${n}`,
    number: n,
    nameFr: `Salle des Jasmins ${n}`,
    nameAr: `قاعة الياسمين ${n}`,
    cityNameFr: "Hydra",
    cityNameAr: "حيدرة",
    ownerBusinessName: `Événements Sidi ${n}`,
    activeSlotCount: 2,
    rejection: null,
    publicationStatus: VenuePublicationStatus.DRAFT,
    // Deux taux que le DÉTAIL affiche en lecture seule. Valeurs choisies pour ne valoir ni 0 ni une valeur ronde que l'écran pourrait inventer : 250 → « 2,5 % », 125 → « 1,25 % ».
    commissionRateBps: 250,
    cashbackRateBps: 125,
    ...(over as object)
  } as FakeVenue;
}

export function aDeletion(over: Partial<AdminDeletionRequestDTO> = {}): AdminDeletionRequestDTO {
  compteur += 1;
  return {
    id: `11111111-1111-4111-8111-${String(compteur).padStart(12, "0")}`,
    status: "PENDING",
    reason: null,
    requestedAt: "2026-11-10T09:30:00.000Z",
    decidedAt: null,
    decisionNote: null,
    userId: `22222222-2222-4222-8222-${String(compteur).padStart(12, "0")}`,
    userEmail: `compte${compteur}@exemple.dz`,
    userRole: "PRO",
    venueCount: 2,
    ...over
  };
}

export interface AdminServerDouble {
  client: AdminClient;
  /** L'état courant du faux serveur. */
  venues: FakeVenue[];
  deletions: AdminDeletionRequestDTO[];
  /** Change le serveur SANS passer par le client. */
  actElsewhere(change: (s: { venues: FakeVenue[]; deletions: AdminDeletionRequestDTO[] }) => void): void;
  /** Retient la PROCHAINE réponse d'une écriture ; rend la fonction qui la relâche. */
  hold(): () => void;
  /** Fait refuser la PROCHAINE écriture (ou lecture) par `error`. */
  failNext(method: keyof AdminClient, error: Error): void;
  /** Le JOURNAL des appels reçus, dans l'ordre : `[méthode, arguments…]`. */
  calls: unknown[][];
}

export function makeAdminServerDouble(init: { venues?: FakeVenue[]; deletions?: AdminDeletionRequestDTO[] } = {}): AdminServerDouble {
  const state = { venues: [...(init.venues ?? [])], deletions: [...(init.deletions ?? [])] };
  const calls: unknown[][] = [];
  const failures = new Map<keyof AdminClient, Error>();
  let gate: Promise<void> | null = null;

  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  const find = (id: string): FakeVenue => {
    const v = state.venues.find((x) => x.id === id);
    if (!v) throw new ApiError(404, "VENUE_NOT_FOUND", "venue.errors.notFound");
    return v;
  };
  const maybeFail = (method: keyof AdminClient): void => {
    const err = failures.get(method);
    if (err) {
      failures.delete(method);
      throw err;
    }
  };
  /** Une écriture : on note l'appel, on attend (un tour, ou la main du test), PUIS on applique — jamais avant. */
  async function write<T>(method: keyof AdminClient, args: unknown[], apply: () => T): Promise<T> {
    calls.push([method, ...args]);
    await tick();
    if (gate) await gate;
    maybeFail(method);
    return apply();
  }

  const queueItem = (v: FakeVenue): VenuePendingItemDTO => ({
    id: v.id,
    number: v.number,
    slug: v.slug,
    nameFr: v.nameFr,
    nameAr: v.nameAr,
    cityNameFr: v.cityNameFr,
    cityNameAr: v.cityNameAr,
    ownerBusinessName: v.ownerBusinessName,
    activeSlotCount: v.activeSlotCount,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
    rejection: v.rejection
  });

  const client: AdminClient = {
    listPendingVenues: vi.fn(async (query) => {
      calls.push(["listPendingVenues", query]);
      maybeFail("listPendingVenues");
      // Un instantané À L'APPEL : la file = brouillons vivants avec un créneau actif, les jamais rejetées d'abord (comme le serveur).
      const snapshot = state.venues.filter((v) => v.publicationStatus === VenuePublicationStatus.DRAFT && v.activeSlotCount > 0);
      const ordered = [...snapshot.filter((v) => v.rejection === null), ...snapshot.filter((v) => v.rejection !== null)];
      const page = query?.page ?? 1;
      const pageSize = query?.pageSize ?? 12;
      const items = ordered.slice((page - 1) * pageSize, page * pageSize).map(queueItem);
      await tick();
      return { items, total: ordered.length, page, pageSize } satisfies VenuePendingPageDTO;
    }),
    getVenue: vi.fn(async (venueId) => {
      calls.push(["getVenue", venueId]);
      maybeFail("getVenue");
      const v = find(venueId);
      const copy = { ...v };
      await tick();
      return copy;
    }),
    publishVenue: vi.fn((venueId) =>
      write("publishVenue", [venueId], (): VenueAdminDTO => {
        const v = find(venueId);
        if (v.publicationStatus !== VenuePublicationStatus.PUBLISHED && v.activeSlotCount === 0) {
          throw new ApiError(409, "SLOT_TEMPLATE_REQUIRED", "venue.errors.slotRequired");
        }
        v.publicationStatus = VenuePublicationStatus.PUBLISHED;
        v.rejection = null;
        return v;
      })
    ),
    rejectVenue: vi.fn((venueId, reason) =>
      write("rejectVenue", [venueId, reason], (): VenueRejectResultDTO => {
        const v = find(venueId);
        if (v.publicationStatus === VenuePublicationStatus.PUBLISHED) throw new ApiError(409, "VENUE_NOT_DRAFT", "admin.errors.venueNotDraft");
        v.rejection = { reason: reason.trim(), rejectedAt: "2026-11-17T12:00:00.000Z" };
        return { id: v.id, publicationStatus: v.publicationStatus, rejection: v.rejection };
      })
    ),
    listDeletionRequests: vi.fn(async (status) => {
      calls.push(["listDeletionRequests", status]);
      maybeFail("listDeletionRequests");
      const rows = state.deletions.filter((d) => d.status === (status ?? "PENDING")).map((d) => ({ ...d }));
      await tick();
      return rows;
    }),
    approveDeletion: vi.fn((requestId, decisionNote) =>
      write("approveDeletion", [requestId, decisionNote], (): DeletionRequestDTO => {
        const d = state.deletions.find((x) => x.id === requestId);
        if (!d) throw new ApiError(404, "DELETION_REQUEST_NOT_FOUND", "account.errors.deletionNotFound");
        if (d.status !== "PENDING") throw new ApiError(400, "DELETION_REQUEST_NOT_PENDING", "account.errors.deletionNotPending");
        d.status = "APPROVED";
        return d;
      })
    ),
    rejectDeletion: vi.fn((requestId, decisionNote) =>
      write("rejectDeletion", [requestId, decisionNote], (): DeletionRequestDTO => {
        const d = state.deletions.find((x) => x.id === requestId);
        if (!d) throw new ApiError(404, "DELETION_REQUEST_NOT_FOUND", "account.errors.deletionNotFound");
        if (d.status !== "PENDING") throw new ApiError(400, "DELETION_REQUEST_NOT_PENDING", "account.errors.deletionNotPending");
        d.status = "REJECTED";
        d.decisionNote = decisionNote ?? null;
        return d;
      })
    )
  };

  return {
    client,
    get venues() {
      return state.venues;
    },
    get deletions() {
      return state.deletions;
    },
    actElsewhere: (change) => change(state),
    hold: () => {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = () => {
          gate = null;
          resolve();
        };
      });
      return release;
    },
    failNext: (method, error) => {
      failures.set(method, error);
    },
    calls
  };
}
