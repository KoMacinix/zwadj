// D91 — lignes de prestations. Le cas qui compte vient en premier : la quantité
// d'un PER_GUEST ne se saisit PAS.
import { describe, expect, it } from "vitest";
import { resolveServiceLine, type ServiceRow } from "./service-pricing";

const base: ServiceRow = {
  id: "s1",
  nameFr: "Traiteur",
  nameAr: "تموين",
  pricingType: "PER_GUEST",
  isActive: true,
  pricing: { fixedPriceCents: null, perGuestPriceCents: 200_000, perUnitPriceCents: null, minUnits: null, maxUnits: null },
  tiers: []
};

const fixed: ServiceRow = {
  ...base,
  pricingType: "FIXED",
  pricing: { fixedPriceCents: 5_000_000, perGuestPriceCents: null, perUnitPriceCents: null, minUnits: null, maxUnits: null }
};

const perUnit: ServiceRow = {
  ...base,
  pricingType: "PER_UNIT",
  pricing: { fixedPriceCents: null, perGuestPriceCents: null, perUnitPriceCents: 300_000, minUnits: 2, maxUnits: 20 }
};

const tiered: ServiceRow = {
  ...base,
  pricingType: "TIERED",
  pricing: null,
  tiers: [
    { id: "t1", labelFr: "Standard", labelAr: "عادي", priceCents: 8_000_000, isActive: true },
    { id: "t2", labelFr: "Retiré", labelAr: "مسحوب", priceCents: 9_000_000, isActive: false }
  ]
};

describe("PER_GUEST — la quantité EST le nombre d'invités", () => {
  it("250 invités à 2 000 DA le couvert = 500 000 DA", () => {
    const r = resolveServiceLine(base, { serviceId: "s1" }, 250);
    expect(r.ok && r.line.quantity).toBe(250);
    expect(r.ok && r.line.lineTotalCents).toBe(50_000_000);
  });

  it("une quantité SAISIE est refusée : elle permettrait de payer 10 couverts pour 250 personnes", () => {
    const r = resolveServiceLine(base, { serviceId: "s1", quantity: 10 }, 250);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.failure.code).toBe("SERVICE_TIER_MISMATCH");
  });
});

describe("FIXED et TIERED — un forfait ne se multiplie pas", () => {
  it("FIXED : quantité 1, quel que soit le nombre d'invités", () => {
    const r = resolveServiceLine(fixed, { serviceId: "s1" }, 250);
    expect(r.ok && r.line.quantity).toBe(1);
    expect(r.ok && r.line.lineTotalCents).toBe(5_000_000);
  });

  it("TIERED : le prix vient du palier, et son libellé est snapshoté", () => {
    const r = resolveServiceLine(tiered, { serviceId: "s1", tierId: "t1" }, 250);
    expect(r.ok && r.line.lineTotalCents).toBe(8_000_000);
    expect(r.ok && r.line.tierLabelFr).toBe("Standard");
  });

  it("TIERED sans palier choisi : refusé, pas rabattu sur le premier", () => {
    const r = resolveServiceLine(tiered, { serviceId: "s1" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_TIER_MISMATCH");
  });

  it("un palier DÉSACTIVÉ ne se vend plus", () => {
    const r = resolveServiceLine(tiered, { serviceId: "s1", tierId: "t2" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("un palier fourni sur un FIXED : erreur de contrat, jamais ignoré en silence", () => {
    const r = resolveServiceLine(fixed, { serviceId: "s1", tierId: "t1" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_TIER_MISMATCH");
  });
});

describe("PER_UNIT — la quantité est saisie, et bornée", () => {
  it("6 tables à 3 000 DA = 18 000 DA", () => {
    const r = resolveServiceLine(perUnit, { serviceId: "s1", quantity: 6 }, 250);
    expect(r.ok && r.line.lineTotalCents).toBe(1_800_000);
  });

  it("les bornes sont INCLUSES : min et max passent", () => {
    expect(resolveServiceLine(perUnit, { serviceId: "s1", quantity: 2 }, 250).ok).toBe(true);
    expect(resolveServiceLine(perUnit, { serviceId: "s1", quantity: 20 }, 250).ok).toBe(true);
  });

  it("un de trop, un de moins : refusé", () => {
    expect(resolveServiceLine(perUnit, { serviceId: "s1", quantity: 1 }, 250).ok).toBe(false);
    expect(resolveServiceLine(perUnit, { serviceId: "s1", quantity: 21 }, 250).ok).toBe(false);
  });

  it("sans quantité : refusé, pas rabattu sur 1", () => {
    const r = resolveServiceLine(perUnit, { serviceId: "s1" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_QUANTITY_OUT_OF_RANGE");
  });
});

describe("Prestations indisponibles", () => {
  it("une prestation DÉSACTIVÉE : refus normal, l'onglet du client était ouvert depuis une heure", () => {
    const r = resolveServiceLine({ ...base, isActive: false }, { serviceId: "s1" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("un non-TIERED SANS ligne de tarif ne se vend pas à zéro dinar en silence", () => {
    const r = resolveServiceLine({ ...base, pricing: null }, { serviceId: "s1" }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("Arithmétique monétaire", () => {
  it("le total de ligne passe par roundToDinar : jamais de centime résiduel", () => {
    const odd: ServiceRow = {
      ...base,
      pricing: { fixedPriceCents: null, perGuestPriceCents: 333, perUnitPriceCents: null, minUnits: null, maxUnits: null }
    };
    const r = resolveServiceLine(odd, { serviceId: "s1" }, 7);
    expect(r.ok && r.line.lineTotalCents % 100).toBe(0);
  });
});

describe("Quantité refusée là où elle n'a pas de sens", () => {
  it("⚠ un FORFAIT assorti d'une quantité est REFUSÉ — un forfait ne se multiplie pas", () => {
    // Trou de couverture mesuré par la cible S4-6 : retirer ce refus laissait
    // la suite verte. Sans lui, un front qui envoie `quantity` ferait payer
    // trois fois un forfait — sur le chemin de l'argent.
    const r = resolveServiceLine(fixed, { serviceId: "s1", quantity: 3 }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_TIER_MISMATCH");
  });

  it("un PER_GUEST assorti d'une quantité est refusé de la même façon", () => {
    const r = resolveServiceLine(base, { serviceId: "s1", quantity: 3 }, 250);
    expect(!r.ok && r.failure.code).toBe("SERVICE_TIER_MISMATCH");
  });
});

describe("Type de tarification INCONNU — [ÉCART S4]", () => {
  it("⚠ un `pricingType` hors énumération est REFUSÉ, il ne se vend plus au prix à l'unité", () => {
    // La cascade d'origine n'avait pas de branche PER_UNIT : c'était le
    // retombé. Un type inconnu se vendait donc au prix « à l'unité », en
    // silence. Le registre le refuse. Le cas est inatteignable par le typage —
    // d'où le transtypage ici — mais une colonne de base, elle, peut porter
    // n'importe quoi le jour où l'énumération gagne une valeur.
    // ⚠ LA FIXTURE PART DE `perUnit`, ET C'EST TOUT L'ENJEU. Sur `base`, le
    // retombé PER_UNIT échouerait de toute façon (`perUnitPriceCents` nul) et
    // rendrait le MÊME code de refus : la garde serait verte quoi qu'on fasse.
    // Mesuré par la cible S4-5, qui la laissait passer.
    const inconnu = { ...perUnit, pricingType: "PER_MINUTE" } as ServiceRow;
    const r = resolveServiceLine(inconnu, { serviceId: "s1", quantity: 3 }, 250);
    expect(r.ok, "le type inconnu s'est vendu au prix à l'unité").toBe(false);
    expect(!r.ok && r.failure.code).toBe("SERVICE_UNAVAILABLE");
  });
});
