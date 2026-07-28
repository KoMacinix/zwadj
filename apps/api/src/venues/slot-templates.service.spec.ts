// Lot B1 — créneaux de fête. Les tests d'INTÉGRATION prouvent la transaction et
// les CHECK SQL ; ceux-ci verrouillent la logique pure et les gardes, là où
// une erreur ne lèverait aucune contrainte et passerait donc inaperçue.
import { overlaps, toSlotTemplateDTO } from "./slot-templates.service";

const base = {
  id: "s1",
  nameFr: "Soirée",
  nameAr: "سهرة",
  startMinutes: 18 * 60,
  endMinutes: 23 * 60,
  basePriceCents: 20_000_000,
  isActive: true,
  createdAt: new Date("2026-07-01T10:00:00.000Z")
};

describe("overlaps — intervalles semi-ouverts [début, fin)", () => {
  it("deux créneaux qui SE TOUCHENT ne se chevauchent pas : c'est le cas matin/soir normal", () => {
    // 14h–18h puis 18h–22h : la salle qui enchaîne deux fêtes doit passer.
    expect(overlaps({ startMinutes: 14 * 60, endMinutes: 18 * 60 }, { ...base, startMinutes: 18 * 60 })).toBe(false);
  });

  it("recouvrement partiel, par l'un ou l'autre bout", () => {
    expect(overlaps({ startMinutes: 17 * 60, endMinutes: 19 * 60 }, base)).toBe(true);
    expect(overlaps({ startMinutes: 22 * 60, endMinutes: 23 * 60 + 30 }, base)).toBe(true);
  });

  it("créneau STRICTEMENT inclus dans un autre — le cas qu'une comparaison naïve des bornes rate", () => {
    expect(overlaps({ startMinutes: 19 * 60, endMinutes: 20 * 60 }, base)).toBe(true);
  });

  it("créneau ENGLOBANT l'autre — le symétrique du précédent", () => {
    expect(overlaps({ startMinutes: 12 * 60, endMinutes: 23 * 60 + 59 }, base)).toBe(true);
  });

  it("créneaux disjoints", () => {
    expect(overlaps({ startMinutes: 8 * 60, endMinutes: 12 * 60 }, base)).toBe(false);
  });
});

describe("toSlotTemplateDTO", () => {
  it("sérialise la date en ISO et n'expose RIEN d'autre que le contrat", () => {
    const dto = toSlotTemplateDTO(base);
    expect(dto).toEqual({
      id: "s1",
      nameFr: "Soirée",
      nameAr: "سهرة",
      startMinutes: 1080,
      endMinutes: 1380,
      basePriceCents: 20_000_000,
      isActive: true,
      createdAt: "2026-07-01T10:00:00.000Z",
      // D46 (B2) — les règles voyagent avec leur créneau ; aucune ici.
      pricingRules: []
    });
    // `venueId` ne doit jamais fuiter : le client le connaît déjà par l'URL.
    expect(Object.keys(dto)).not.toContain("venueId");
  });
});
