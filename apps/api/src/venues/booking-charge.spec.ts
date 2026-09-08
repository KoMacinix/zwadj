// Chiffrage — lot S11-b. La spec unitaire qui N'EXISTAIT PAS : jusqu'ici, le
// chiffrage d'une demande ne se mesurait qu'en intégration, contre un PostgreSQL
// réel, à la porte lourde. C'est la situation que D261 a nommée — les décisions
// vivent là où la mesure est lente, donc rare, donc tardive.
import { describe, expect, it } from "vitest";
import { ServiceErrorCode } from "@zwadj/types";
import { confrontExpectedCharge, resolveCharge, type CatalogueRow } from "./booking-charge";

const VENUE = "v1";
const AUTRE_SALLE = "v2";

const traiteur: CatalogueRow = {
  id: "s1",
  venueId: VENUE,
  nameFr: "Traiteur",
  nameAr: "تموين",
  pricingType: "PER_GUEST",
  isActive: true,
  pricing: {
    fixedPriceCents: null,
    perGuestPriceCents: 200_000,
    perUnitPriceCents: null,
    minUnits: null,
    maxUnits: null
  },
  tiers: []
};

const decoration: CatalogueRow = {
  ...traiteur,
  id: "s2",
  nameFr: "Décoration",
  pricingType: "FIXED",
  pricing: {
    fixedPriceCents: 5_000_000,
    perGuestPriceCents: null,
    perUnitPriceCents: null,
    minUnits: null,
    maxUnits: null
  }
};

/** Pourcentage : 30 %. L'attendu se DÉRIVE du total, jamais d'un nombre tapé. */
const acompte30 = { depositRateBps: 3000, depositAmountCents: null };

const entree = (over: Partial<Parameters<typeof resolveCharge>[0]> = {}) => ({
  venueId: VENUE,
  basePriceCents: 30_000_000,
  guests: 100,
  choices: [],
  catalogue: [traiteur, decoration],
  deposit: acompte30,
  ...over
});

describe("Chiffrage — l'agrégat, que la BASE ne garantit PAS", () => {
  // ⚠ `bookings_amounts_valid` impose les signes et `deposit <= total`, mais PAS
  // `total = base + prestations` — relevé dans la MIGRATION, pas dans
  // `schema.prisma`. Au niveau LIGNE, `booking_services_amounts_valid` impose
  // bien `line_total = unit_price × quantity`. Le détail est prouvé par
  // PostgreSQL, l'agrégat repose sur cette addition-ci. Elle est donc mesurée
  // pour elle-même, et non comme effet de bord d'un cas nominal.
  it("total = prix de salle + prestations, et l'identité est assertée telle quelle", () => {
    const res = resolveCharge(
      entree({ choices: [{ serviceId: "s1" }, { serviceId: "s2" }] })
    );
    if (!res.ok) throw new Error(`refus inattendu : ${res.failure.code}`);
    const { basePriceCents, servicesTotalCents, totalCents } = res.charge;
    expect(totalCents).toBe(basePriceCents + servicesTotalCents);
    // Et les composantes, dérivées du catalogue : 100 invités × 2 000 DA + 50 000 DA.
    expect(servicesTotalCents).toBe(100 * 200_000 + 5_000_000);
  });

  it("sans aucune prestation, le total est le prix de salle et rien d'autre", () => {
    const res = resolveCharge(entree());
    if (!res.ok) throw new Error(`refus inattendu : ${res.failure.code}`);
    expect(res.charge.servicesTotalCents).toBe(0);
    expect(res.charge.totalCents).toBe(res.charge.basePriceCents);
  });

  it("l'acompte porte sur le total FINAL, prestations comprises", () => {
    // ⚠ Le cas qui distingue les deux ordres de calcul possibles : si l'acompte
    // était pris sur le seul prix de salle, il vaudrait 9 000 000.
    const res = resolveCharge(entree({ choices: [{ serviceId: "s2" }] }));
    if (!res.ok) throw new Error(`refus inattendu : ${res.failure.code}`);
    expect(res.charge.totalCents).toBe(35_000_000);
    expect(res.charge.depositCents).toBe(10_500_000);
    expect(res.charge.depositCents).not.toBe(9_000_000);
  });
});

describe("Chiffrage — le doublon de prestation (arbitrage D278 : REFUS, pas fusion)", () => {
  it("la MÊME prestation deux fois est REFUSÉE, jamais facturée deux fois", () => {
    const res = resolveCharge(
      entree({ choices: [{ serviceId: "s2" }, { serviceId: "s2" }] })
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe(ServiceErrorCode.SERVICE_DUPLICATE);
  });

  it("⚠ CAS DOUBLEMENT FAUTIF — doublon ET prestation inconnue : c'est le DOUBLON qui sort", () => {
    // Une demande qui n'enfreint QU'UNE règle est verte quel que soit l'ordre :
    // seul un cas doublement fautif mesure l'ordre des refus (leçon S11-a).
    const res = resolveCharge(
      entree({ choices: [{ serviceId: "s2" }, { serviceId: "s2" }, { serviceId: "inconnu" }] })
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe(ServiceErrorCode.SERVICE_DUPLICATE);
  });

  it("deux prestations DIFFÉRENTES ne sont pas un doublon", () => {
    const res = resolveCharge(
      entree({ choices: [{ serviceId: "s1" }, { serviceId: "s2" }] })
    );
    expect(res.ok).toBe(true);
  });
});

describe("Chiffrage — la propriété de la prestation est VÉRIFIÉE, pas déduite (MD8)", () => {
  it("une prestation d'une AUTRE salle est refusée, même présente au catalogue", () => {
    // ⚠ C'est la garde que l'ancien code n'avait pas : le refus y tombait parce
    // que le `where venueId` empêchait la ligne d'arriver. Ici la ligne arrive,
    // et c'est le module qui la refuse — la CAUSE est mesurée, pas l'effet.
    const intruse: CatalogueRow = { ...decoration, id: "s9", venueId: AUTRE_SALLE };
    const res = resolveCharge(
      entree({ choices: [{ serviceId: "s9" }], catalogue: [traiteur, decoration, intruse] })
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe(ServiceErrorCode.SERVICE_UNAVAILABLE);
  });

  it("une prestation absente du catalogue est refusée par le même code", () => {
    const res = resolveCharge(entree({ choices: [{ serviceId: "inconnu" }] }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe(ServiceErrorCode.SERVICE_UNAVAILABLE);
  });
});

describe("Chiffrage — les refus de ligne remontent tels quels", () => {
  it("un palier fourni sur une prestation non TIERED", () => {
    const res = resolveCharge(entree({ choices: [{ serviceId: "s2", tierId: "t1" }] }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe(ServiceErrorCode.SERVICE_TIER_MISMATCH);
  });
});

describe("D75 — la confrontation, et ce que le refus DOIT porter", () => {
  it("montants annoncés conformes : le passage est autorisé", () => {
    const res = confrontExpectedCharge(
      { totalCents: 35_000_000, depositCents: 10_500_000 },
      { expectedTotalCents: 35_000_000, expectedDepositCents: 10_500_000 }
    );
    expect(res.ok).toBe(true);
  });

  it("⚠ le refus porte les montants RÉELS — sans eux le client rejoue à l'aveugle", () => {
    const res = confrontExpectedCharge(
      { totalCents: 35_000_000, depositCents: 10_500_000 },
      { expectedTotalCents: 30_000_000, expectedDepositCents: 9_000_000 }
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.totalCents).toBe(35_000_000);
    expect(res.depositCents).toBe(10_500_000);
  });

  it("écart sur l'ACOMPTE SEUL : refusé aussi", () => {
    // ⚠ Le cas qu'un `||` mal écrit laisserait passer : le total concorde.
    const res = confrontExpectedCharge(
      { totalCents: 35_000_000, depositCents: 10_500_000 },
      { expectedTotalCents: 35_000_000, expectedDepositCents: 9_000_000 }
    );
    expect(res.ok).toBe(false);
  });

  it("écart sur le TOTAL SEUL : refusé aussi", () => {
    const res = confrontExpectedCharge(
      { totalCents: 35_000_000, depositCents: 10_500_000 },
      { expectedTotalCents: 30_000_000, expectedDepositCents: 10_500_000 }
    );
    expect(res.ok).toBe(false);
  });
});
