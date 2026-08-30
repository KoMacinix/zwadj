// Lot B2 — moteur de prix. CHEMIN D'ARGENT : chaque branche de la résolution
// est couverte, y compris celles qu'aucun test d'intégration ne distinguerait.
import { monthInWindow, resolveSlotPrice, roundToDinar, ruleApplies, type PricingRuleLike } from "./pricing-engine";

const BASE = 20_000_000; // 200 000 DA

function rule(over: Partial<PricingRuleLike> & Pick<PricingRuleLike, "ruleType" | "priceCents">): PricingRuleLike {
  return {
    id: over.id ?? `r-${over.ruleType}-${over.priceCents}`,
    startMonth: null,
    endMonth: null,
    daysOfWeek: [],
    priority: 0,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over
  };
}

const JOUR = { month: 7, dayOfWeek: 3, isHoliday: false }; // mercredi de juillet
const VENDREDI = { month: 7, dayOfWeek: 5, isHoliday: false };
const FERIE_VENDREDI = { month: 11, dayOfWeek: 5, isHoliday: true };

describe("monthInWindow — fenêtres de saison", () => {
  it("fenêtre simple, bornes INCLUSES", () => {
    expect(monthInWindow(6, 6, 8)).toBe(true);
    expect(monthInWindow(8, 6, 8)).toBe(true);
    expect(monthInWindow(5, 6, 8)).toBe(false);
  });

  it("fenêtre qui ENJAMBE décembre (novembre → février) — le cas qu'un simple >= <= rate", () => {
    expect(monthInWindow(12, 11, 2)).toBe(true);
    expect(monthInWindow(1, 11, 2)).toBe(true);
    expect(monthInWindow(6, 11, 2)).toBe(false);
  });
});

describe("ruleApplies", () => {
  it("une règle INACTIVE ne s'applique jamais, quel que soit son type", () => {
    expect(ruleApplies(rule({ ruleType: "HOLIDAY", priceCents: 1, isActive: false }), FERIE_VENDREDI)).toBe(false);
  });

  it("SEASON sans bornes est INAPPLICABLE — jamais « toute l'année »", () => {
    // Le traiter comme universel écraserait le prix de base sans que le pro
    // l'ait demandé : un tarif fantôme sur 365 jours.
    expect(ruleApplies(rule({ ruleType: "SEASON", priceCents: 1 }), JOUR)).toBe(false);
  });

  it("WEEKDAY : dimanche vaut 0, samedi 6 — le week-end algérien est [5, 6] et vient du PRO", () => {
    const weekend = rule({ ruleType: "WEEKDAY", priceCents: 1, daysOfWeek: [5, 6] });
    expect(ruleApplies(weekend, VENDREDI)).toBe(true);
    expect(ruleApplies(weekend, JOUR)).toBe(false);
  });
});

describe("resolveSlotPrice — l'ordre de D46", () => {
  it("aucune règle applicable : le prix de BASE du créneau, et aucune règle citée", () => {
    expect(resolveSlotPrice(BASE, [], JOUR)).toEqual({ priceCents: BASE, ruleId: null, ruleType: null });
  });

  it("FÉRIÉ l'emporte sur week-end ET sur saison — le cas nominal du 1ᵉʳ novembre", () => {
    const resolution = resolveSlotPrice(
      BASE,
      [
        rule({ id: "saison", ruleType: "SEASON", priceCents: 24_000_000, startMonth: 11, endMonth: 2 }),
        rule({ id: "weekend", ruleType: "WEEKDAY", priceCents: 26_000_000, daysOfWeek: [5, 6] }),
        rule({ id: "ferie", ruleType: "HOLIDAY", priceCents: 30_000_000 })
      ],
      FERIE_VENDREDI
    );
    // Un seul prix sort. 24 + 26 + 30 n'a jamais existé : les prix absolus ne
    // se composent pas, c'est ce qui rend la résolution décidable.
    expect(resolution).toEqual({ priceCents: 30_000_000, ruleId: "ferie", ruleType: "HOLIDAY" });
  });

  it("WEEKDAY l'emporte sur SEASON quand le jour n'est pas férié", () => {
    const resolution = resolveSlotPrice(
      BASE,
      [
        rule({ id: "saison", ruleType: "SEASON", priceCents: 24_000_000, startMonth: 6, endMonth: 8 }),
        rule({ id: "weekend", ruleType: "WEEKDAY", priceCents: 26_000_000, daysOfWeek: [5, 6] })
      ],
      VENDREDI
    );
    expect(resolution.ruleId).toBe("weekend");
  });

  it("à type égal, la PRIORITÉ tranche", () => {
    const resolution = resolveSlotPrice(
      BASE,
      [
        rule({ id: "basse", ruleType: "SEASON", priceCents: 22_000_000, startMonth: 6, endMonth: 8, priority: 0 }),
        rule({ id: "haute", ruleType: "SEASON", priceCents: 28_000_000, startMonth: 7, endMonth: 7, priority: 5 })
      ],
      JOUR
    );
    expect(resolution.ruleId).toBe("haute");
  });

  it("à type ET priorité égaux, la plus RÉCENTE gagne : c'est la dernière intention du pro", () => {
    const resolution = resolveSlotPrice(
      BASE,
      [
        rule({
          id: "ancienne",
          ruleType: "SEASON",
          priceCents: 22_000_000,
          startMonth: 6,
          endMonth: 8,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        }),
        rule({
          id: "recente",
          ruleType: "SEASON",
          priceCents: 25_000_000,
          startMonth: 6,
          endMonth: 8,
          createdAt: new Date("2026-03-01T00:00:00.000Z")
        })
      ],
      JOUR
    );
    expect(resolution.ruleId).toBe("recente");
  });

  it("à createdAt IDENTIQUE, le départage reste DÉTERMINISTE : deux appels donnent le même prix", () => {
    const same = new Date("2026-01-01T00:00:00.000Z");
    const rules = [
      rule({ id: "aaa", ruleType: "SEASON", priceCents: 22_000_000, startMonth: 6, endMonth: 8, createdAt: same }),
      rule({ id: "bbb", ruleType: "SEASON", priceCents: 25_000_000, startMonth: 6, endMonth: 8, createdAt: same })
    ];
    const first = resolveSlotPrice(BASE, rules, JOUR);
    const second = resolveSlotPrice(BASE, [...rules].reverse(), JOUR);
    // Un prix qui dépend de l'ordre de lecture SQL est un prix qui change tout
    // seul entre l'affichage et le devis.
    expect(first.priceCents).toBe(second.priceCents);
  });

  it("ne RÉORDONNE PAS le tableau de l'appelant", () => {
    const rules = [
      rule({ id: "saison", ruleType: "SEASON", priceCents: 22_000_000, startMonth: 6, endMonth: 8 }),
      rule({ id: "ferie", ruleType: "HOLIDAY", priceCents: 30_000_000 })
    ];
    resolveSlotPrice(BASE, rules, FERIE_VENDREDI);
    expect(rules.map((r) => r.id)).toEqual(["saison", "ferie"]);
  });

  it("une règle MOINS chère que le prix de base gagne quand même : c'est une promotion, pas une erreur", () => {
    const resolution = resolveSlotPrice(
      BASE,
      [rule({ id: "creuse", ruleType: "SEASON", priceCents: 14_000_000, startMonth: 1, endMonth: 3 })],
      { month: 2, dayOfWeek: 1, isHoliday: false }
    );
    expect(resolution.priceCents).toBe(14_000_000);
  });
});

describe("roundToDinar", () => {
  it("arrondit au dinar, moitié vers le HAUT", () => {
    expect(roundToDinar(20_000_049)).toBe(20_000_000);
    expect(roundToDinar(20_000_050)).toBe(20_000_100);
  });

  it("laisse intact un montant déjà en dinars entiers — le cas de tous les prix saisis", () => {
    expect(roundToDinar(20_000_000)).toBe(20_000_000);
  });
});

describe("Famille de règle INCONNUE — le repli du `default:` d'origine", () => {
  it("⚠ une règle d'un type que le moteur ignore NE S'APPLIQUE PAS", () => {
    // Trou de couverture mesuré par la cible S4-3 : le `default: return false`
    // de la cascade d'origine n'était mesuré par rien. Le registre est
    // exhaustif à la COMPILATION, mais une colonne de base peut porter une
    // valeur neuve : elle ne doit pas écraser le prix de base en silence.
    const inconnue = rule({ ruleType: "MOON_PHASE" as PricingRuleLike["ruleType"], priceCents: 99_000_000 });
    expect(ruleApplies(inconnue, FERIE_VENDREDI)).toBe(false);
  });
});
