// Spec unitaire de VenuesPublicService (Lot A3), Prisma mocké — LA chose à
// prouver ici : la construction EXACTE des deux WHERE D33 (liste stricte
// ACTIVE ; détail élargi à TEMPORARILY_UNAVAILABLE) et des filtres combinés.
// Résultats réels, pagination et anti-fuite des taux : en intégration.
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { VenueListQueryInput } from "@zwadj/types";
import type { PrismaService } from "../prisma/prisma.service";
import { VenuesPublicService } from "./venues-public.service";

const fakeStorage = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  publicUrl: (key: string) => `/api/v1/media/${key}`
} as unknown as import("../media/media.types").MediaStorage;

function buildService() {
  const prisma = {
    venue: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn() },
    // Lot `availableOn` — les trois lectures de l'annotation. Elles rendent des
    // tableaux VIDES par défaut : les tests d'avant ce lot ne posent aucune
    // date, donc `annotatePage` n'est jamais appelée et ces mocks ne bougent
    // pas. C'est ce qui rend l'ajout non intrusif — et ce qu'un test vérifie.
    slotTemplate: { findMany: vi.fn().mockResolvedValue([]) },
    booking: { findMany: vi.fn().mockResolvedValue([]) },
    availabilityBlock: { findMany: vi.fn().mockResolvedValue([]) },
    // Les mocks renvoient des promesses ordinaires : $transaction = Promise.all.
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops))
  };
  return { service: new VenuesPublicService(prisma as unknown as PrismaService, fakeStorage), prisma };
}

const QUERY_DEFAULTS: VenueListQueryInput = { sort: "recent", page: 1, pageSize: 12 };

describe("VenuesPublicService.list — WHERE D33 + filtres", () => {
  it("sans filtre : prédicat strict de la liste (PUBLISHED, vivante, ACTIVE) + tri recent + fenêtre", async () => {
    const { service, prisma } = buildService();
    await service.list(QUERY_DEFAULTS);

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicationStatus: "PUBLISHED", deletedAt: null, status: "ACTIVE" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: 0,
        take: 12
      })
    );
    expect(prisma.venue.count).toHaveBeenCalledWith({
      where: { publicationStatus: "PUBLISHED", deletedAt: null, status: "ACTIVE" }
    });
  });

  it("filtres combinés : ville + invités (bornes croisées) + fourchette de prix + amenities en ET", async () => {
    const { service, prisma } = buildService();
    await service.list({
      ...QUERY_DEFAULTS,
      cityId: "018f0000-0000-7000-8000-00000000cccc",
      guests: 250,
      minPriceCents: 10_000_000,
      maxPriceCents: 30_000_000,
      amenities: "parking,wifi,parking", // doublon volontaire → dédupliqué
      sort: "price_asc",
      page: 3,
      pageSize: 10
    });

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicationStatus: "PUBLISHED",
          deletedAt: null,
          status: "ACTIVE",
          cityId: "018f0000-0000-7000-8000-00000000cccc",
          capacityMax: { gte: 250 },
          basePriceCents: { gte: 10_000_000, lte: 30_000_000 },
          AND: [
            { amenities: { some: { amenity: { key: "parking" } } } },
            { amenities: { some: { amenity: { key: "wifi" } } } }
          ]
        },
        orderBy: [{ basePriceCents: "asc" }, { id: "asc" }],
        skip: 20,
        take: 10
      })
    );
  });
});

describe("VenuesPublicService.bySlug — WHERE D33 détail + court-circuit", () => {
  it("slug hors motif (majuscule, espace, underscore…) : 404 sans toucher la base", async () => {
    const { service, prisma } = buildService();
    for (const bad of ["Pas-Un-Slug", "salle el ferdous", "salle_el", "salle-", "-salle", ""]) {
      await expect(service.bySlug(bad)).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof NotFoundException && (e.getResponse() as { code?: string }).code === "VENUE_NOT_FOUND"
      );
    }
    expect(prisma.venue.findFirst).not.toHaveBeenCalled();
  });

  it("WHERE du détail : PUBLISHED, vivante, status ∈ {ACTIVE, TEMPORARILY_UNAVAILABLE} — HIDDEN exclu", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(null);

    await expect(service.bySlug("salle-el-ferdous-2")).rejects.toThrow(NotFoundException);
    expect(prisma.venue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "salle-el-ferdous-2",
          publicationStatus: "PUBLISHED",
          deletedAt: null,
          status: { in: ["ACTIVE", "TEMPORARILY_UNAVAILABLE"] }
        }
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Lot `availableOn` — annotation par date
// ═══════════════════════════════════════════════════════════════════════════

/** Premier argument du premier appel d'un mock, ou une erreur EXPLICITE.
 *
 *  ⚠ `noUncheckedIndexedAccess` refuse `mock.calls[0][0]`, et il a raison : sur
 *  un mock jamais appelé, l'indexation nue rendrait `undefined` et le test
 *  échouerait sur « cannot read property of undefined » — un message qui ne dit
 *  RIEN de la cause réelle (« la requête n'a pas été lancée »). */
function premierAppel<T>(mock: { mock: { calls: unknown[][] } }, quoi: string): T {
  const appel = mock.mock.calls[0];
  if (appel === undefined) throw new Error(`${quoi} : aucun appel enregistré`);
  return appel[0] as T;
}

/** Ligne de salle minimale : seuls `id`, `bookingMode` et les champs du DTO
 *  sont lus. `photos: []` et `_count` sont OBLIGATOIRES — `toSummary` les
 *  déréférence, et une ligne incomplète ferait échouer le test pour une raison
 *  qui n'est pas celle qu'il vise. */
function ligne(id: string, bookingMode = "SINGLE_SLOT") {
  return {
    id,
    slug: `salle-${id}`,
    cityId: "018f0000-0000-7000-8000-00000000cccc",
    nameFr: "Salle",
    nameAr: "قاعة",
    taglineFr: null,
    taglineAr: null,
    districtFr: null,
    districtAr: null,
    capacityMax: 300,
    basePriceCents: 20_000_000,
    bookingMode,
    ceremonyType: null,
    publicationStatus: "PUBLISHED",
    photos: [],
    _count: { photos: 0 }
  };
}

/** UTC+1 fixe, sans heure d'été (invariant Algérie) : minuit local du 2 juin
 *  2026 est le 1ᵉʳ juin à 23h00 UTC. ⚠ Valeur DÉRIVÉE du décalage, pas écrite
 *  de mémoire — c'est la même arithmétique que `civilDayStartMs`. */
const MINUIT_2_JUIN_2026 = Date.UTC(2026, 5, 2) - 60 * 60_000;
const LE_2_JUIN = "2026-06-02";
const LOINTAIN = "2099-06-02";

/**
 * ⚠ L'HORLOGE EST FIGÉE, et ce n'est pas du confort.
 *
 * `civilDateOrRefusePast` lit `Date.now()` : sans horloge figée, une date de
 * fixture choisie « dans le futur » le reste jusqu'au jour où elle ne l'est
 * plus, et toute la suite vire au rouge sans qu'une ligne de code ait bougé.
 * Défaut RÉEL : ces tests ont d'abord été écrits avec le 2 juin 2026 relevé de
 * la maquette — déjà passé le jour où ils ont tourné pour la première fois.
 *
 * On se place la VEILLE, à midi heure d'Alger : le 2 juin est donc demain, et
 * les fixtures d'intervalles gardent leur arithmétique lisible.
 */
const VEILLE_MIDI_ALGER = MINUIT_2_JUIN_2026 - 12 * 60 * 60_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(VEILLE_MIDI_ALGER));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("VenuesPublicService.list — availableOn : refus de la date passée", () => {
  it("⚠ AUJOURD'HUI EST ACCEPTÉ (`<`, pas `<=`) : chercher une salle pour ce soir est le cas normal", async () => {
    const { service } = buildService();
    // La date civile d'Alger à l'instant figé, DÉRIVÉE du décalage — jamais une
    // chaîne recopiée, qui pourrait ne plus correspondre à l'horloge.
    const aujourdhui = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
    expect(aujourdhui).toBe("2026-06-01");
    await expect(service.list({ ...QUERY_DEFAULTS, availableOn: aujourdhui })).resolves.toBeDefined();
  });

  it("HIER est refusé : la borne est bien au jour près, pas au mois", async () => {
    const { service } = buildService();
    await expect(service.list({ ...QUERY_DEFAULTS, availableOn: "2026-05-31" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("une date passée : 400 AVAILABLE_ON_PAST, et AUCUNE requête n'est lancée", async () => {
    const { service, prisma } = buildService();
    await expect(service.list({ ...QUERY_DEFAULTS, availableOn: "2020-01-01" })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException && (e.getResponse() as { code?: string }).code === "AVAILABLE_ON_PAST"
    );
    // ⚠ Le refus tombe AVANT la page : interroger la base pour une date qu'on
    // s'apprête à refuser serait un aller-retour payé pour rien.
    expect(prisma.venue.findMany).not.toHaveBeenCalled();
    expect(prisma.slotTemplate.findMany).not.toHaveBeenCalled();
  });
});

describe("VenuesPublicService.list — availableOn : ce qui est chargé", () => {
  it("⚠ SANS `availableOn`, AUCUNE des trois lectures n'a lieu, et l'écho vaut `null`", async () => {
    const { service, prisma } = buildService();
    const res = await service.list(QUERY_DEFAULTS);
    expect(prisma.slotTemplate.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
    expect(prisma.availabilityBlock.findMany).not.toHaveBeenCalled();
    expect(res.availableOn).toBeNull();
  });

  it("⚠ TROIS REQUÊTES, bornées par `venueId IN` — O(page), pas O(page × salles)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1"), ligne("v2"), ligne("v3")]);
    await service.list({ ...QUERY_DEFAULTS, availableOn: LOINTAIN });

    for (const table of [prisma.slotTemplate, prisma.booking, prisma.availabilityBlock]) {
      expect(table.findMany).toHaveBeenCalledTimes(1);
      const where = premierAppel<{ where: { venueId: unknown } }>(table.findMany, "annotation");
      expect(where.where.venueId).toEqual({ in: ["v1", "v2", "v3"] });
    }
  });

  it("⚠ `PENDING` N'EST PAS CHARGÉ (D101) : une demande en attente ne grise rien", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    await service.list({ ...QUERY_DEFAULTS, availableOn: LOINTAIN });

    const { where } = premierAppel<{ where: { status: { in: string[] } } }>(prisma.booking.findMany, "réservations");
    expect(where.status).toEqual({ in: ["ACCEPTED", "CONFIRMED"] });
    expect(where.status.in.includes("PENDING")).toBe(false);
  });

  it("⚠ LA FENÊTRE VA À +48 H, pas à minuit + 24 h : sinon la soirée 20h→02h ment", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });

    const { where } = premierAppel<{ where: { startsAt: { lt: Date }; endsAt: { gt: Date } } }>(
      prisma.booking.findMany,
      "réservations"
    );
    // Bornes DÉRIVÉES du décalage Algérie et du plafond du CHECK
    // `slot_templates_minutes_valid` (2880 min), jamais recopiées à la main.
    expect(where.endsAt.gt.getTime()).toBe(MINUIT_2_JUIN_2026);
    expect(where.startsAt.lt.getTime()).toBe(MINUIT_2_JUIN_2026 + 2880 * 60_000);
  });

  it("aucune salle dans la page : aucune requête d'annotation, et pas de `IN ()` vide", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LOINTAIN });
    expect(prisma.slotTemplate.findMany).not.toHaveBeenCalled();
    expect(res.availableOn).toBe(LOINTAIN);
  });
});

describe("VenuesPublicService.list — availableOn : ce qui est annoté", () => {
  const CRENEAU_SOIR = { id: "s1", venueId: "v1", startMinutes: 1200, endMinutes: 1560 }; // 20h → 02h

  it("aucune réservation, aucun blocage ⇒ `true`", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    prisma.slotTemplate.findMany.mockResolvedValue([CRENEAU_SOIR]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([true]);
  });

  it("⚠ UNE RÉSERVATION DE 00H30 LE LENDEMAIN ferme la soirée 20h→02h ⇒ `false`", async () => {
    // Le cas que la fenêtre à +48 h existe pour attraper. Avec une borne à
    // minuit + 24 h, cette réservation ne serait pas chargée et la salle
    // sortirait annoncée LIBRE — faux, et invisible.
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    prisma.slotTemplate.findMany.mockResolvedValue([CRENEAU_SOIR]);
    prisma.booking.findMany.mockResolvedValue([
      {
        venueId: "v1",
        startsAt: new Date(MINUIT_2_JUIN_2026 + 1470 * 60_000), // 00h30 le 3
        endsAt: new Date(MINUIT_2_JUIN_2026 + 1530 * 60_000),
        slotTemplateId: null
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([false]);
  });

  it("un blocage pro qui ENJAMBE la journée sans y commencer ⇒ `false`", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    prisma.slotTemplate.findMany.mockResolvedValue([CRENEAU_SOIR]);
    prisma.availabilityBlock.findMany.mockResolvedValue([
      {
        venueId: "v1",
        blockedFrom: new Date(MINUIT_2_JUIN_2026 - 30 * 86_400_000),
        blockedUntil: new Date(MINUIT_2_JUIN_2026 + 30 * 86_400_000)
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([false]);
  });

  it("⚠ AUCUN CRÉNEAU ACTIF ⇒ `null`, jamais `false` : elle n'est réservable AUCUN jour", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    prisma.slotTemplate.findMany.mockResolvedValue([]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([null]);
  });

  it("MULTI_SLOT : un créneau pris, l'autre libre ⇒ `true` — la salle reste disponible", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1", "MULTI_SLOT")]);
    prisma.slotTemplate.findMany.mockResolvedValue([
      { id: "midi", venueId: "v1", startMinutes: 720, endMinutes: 960 },
      CRENEAU_SOIR
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        venueId: "v1",
        startsAt: new Date(MINUIT_2_JUIN_2026 + 720 * 60_000),
        endsAt: new Date(MINUIT_2_JUIN_2026 + 960 * 60_000),
        slotTemplateId: "midi"
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([true]);
  });

  it("⚠ SINGLE_SLOT : la MÊME réservation ferme la journée entière ⇒ `false`", async () => {
    // La règle vit dans le moteur, pas dans ce service — et c'est bien le
    // moteur qui la produit ici : mêmes données, `bookingMode` seul change.
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1", "SINGLE_SLOT")]);
    prisma.slotTemplate.findMany.mockResolvedValue([
      { id: "midi", venueId: "v1", startMinutes: 720, endMinutes: 960 },
      CRENEAU_SOIR
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        venueId: "v1",
        startsAt: new Date(MINUIT_2_JUIN_2026 + 720 * 60_000),
        endsAt: new Date(MINUIT_2_JUIN_2026 + 960 * 60_000),
        slotTemplateId: "midi"
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([false]);
  });

  it("⚠ LES SALLES NE SE CONTAMINENT PAS : la réservation de v1 ne grise pas v2", async () => {
    // Trois requêtes collectives rendent des lignes MÊLÉES. Sans regroupement
    // par salle, la réservation de l'une fermerait le créneau de l'autre.
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1"), ligne("v2")]);
    prisma.slotTemplate.findMany.mockResolvedValue([
      CRENEAU_SOIR,
      { id: "s2", venueId: "v2", startMinutes: 1200, endMinutes: 1560 }
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        venueId: "v1",
        startsAt: new Date(MINUIT_2_JUIN_2026 + 1200 * 60_000),
        endsAt: new Date(MINUIT_2_JUIN_2026 + 1560 * 60_000),
        slotTemplateId: "s1"
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items.map((v) => v.availableOnDate)).toEqual([false, true]);
  });

  it("⚠ ANNOTER N'EST PAS FILTRER : la salle grisée reste dans `items`, et `total` ne bouge pas", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findMany.mockResolvedValue([ligne("v1")]);
    prisma.venue.count.mockResolvedValue(37);
    prisma.slotTemplate.findMany.mockResolvedValue([CRENEAU_SOIR]);
    prisma.availabilityBlock.findMany.mockResolvedValue([
      {
        venueId: "v1",
        blockedFrom: new Date(MINUIT_2_JUIN_2026),
        blockedUntil: new Date(MINUIT_2_JUIN_2026 + 86_400_000)
      }
    ]);
    const res = await service.list({ ...QUERY_DEFAULTS, availableOn: LE_2_JUIN });
    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(37);
    expect(res.availableOn).toBe(LE_2_JUIN);
  });
});
