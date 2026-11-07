// FP-1 (session `front-client`) — LA RÈGLE PURE du choix d'une prestation au comptoir (D187) : ce que le contrat
// (`bookingServiceChoiceSchema`) attend, par type de tarification — `tierId` REQUIS en TIERED et INTERDIT ailleurs, `quantity` REQUISE
// en PER_UNIT et INTERDITE ailleurs. ⛔ AUCUN montant n'est calculé ici (règle des montants, D325) : la valeur envoyée est celle saisie.
// ⚠ Le module est NEUF : chargé par un import DYNAMIQUE, son absence (avant FP-1) se lit en ASSERTION, pas en échec de collecte (D304).
// ⚠ Les choix sont confrontés au CONTRAT RÉEL (`safeParse`), et les types de tarification à l'autorité (`ServicePricingType`).
import { bookingServiceChoiceSchema, ServicePricingType, type ServiceDTO } from "@zwadj/types";

type Detail = { tierId?: string; quantite?: string };
type Regle = (service: ServiceDTO, detail?: Detail) => Record<string, unknown> | null;
let choixDePrestation: Regle | undefined;

beforeAll(async () => {
  const chemin = "./walkin-services";
  try {
    const module = (await import(/* @vite-ignore */ chemin)) as Record<string, unknown>;
    choixDePrestation = module.choixDePrestation as Regle | undefined;
  } catch {
    choixDePrestation = undefined;
  }
});

/** Sans la règle (avant FP-1), un objet qui ne passe aucune assertion : le rouge reste une assertion. */
const regle: Regle = (service, detail) => (choixDePrestation ?? (() => ({ regleAbsente: true })))(service, detail);

const BASE: Omit<ServiceDTO, "id" | "pricingType"> = {
  venueId: "v1",
  nameFr: "Prestation",
  nameAr: "خدمة",
  descriptionFr: null,
  descriptionAr: null,
  isActive: true,
  sortOrder: 0,
  fixedPriceCents: null,
  perGuestPriceCents: null,
  perUnitPriceCents: null,
  unitNameFr: null,
  unitNameAr: null,
  minUnits: null,
  maxUnits: null,
  tiers: []
};
const FIXE: ServiceDTO = { ...BASE, id: "11111111-1111-4111-8111-111111111111", pricingType: ServicePricingType.FIXED, fixedPriceCents: 500_000 };
const PAR_INVITE: ServiceDTO = { ...BASE, id: "22222222-2222-4222-8222-222222222222", pricingType: ServicePricingType.PER_GUEST, perGuestPriceCents: 150_000 };
const PALIER_ACTIF = "33333333-3333-4333-8333-33333333aaaa";
const PALIER_INACTIF = "33333333-3333-4333-8333-33333333bbbb";
const PALIERS: ServiceDTO = {
  ...BASE,
  id: "33333333-3333-4333-8333-333333333333",
  pricingType: ServicePricingType.TIERED,
  tiers: [
    { id: PALIER_ACTIF, labelFr: "Jusqu'à 200 invités", labelAr: "حتى 200 ضيف", priceCents: 1_000_000, sortOrder: 0, isActive: true },
    { id: PALIER_INACTIF, labelFr: "Formule retirée", labelAr: "صيغة مسحوبة", priceCents: 2_000_000, sortOrder: 1, isActive: false }
  ]
};
const UNITES: ServiceDTO = {
  ...BASE,
  id: "44444444-4444-4444-8444-444444444444",
  pricingType: ServicePricingType.PER_UNIT,
  perUnitPriceCents: 20_000,
  unitNameFr: "table",
  unitNameAr: "طاولة",
  minUnits: 2,
  maxUnits: 30
};

/** Le choix rendu passe-t-il le CONTRAT ? */
const conforme = (choix: Record<string, unknown> | null) => choix !== null && bookingServiceChoiceSchema.safeParse(choix).success;

describe("FP-1 — la règle existe", () => {
  it("`choixDePrestation` est exportée par `walkin-services`", () => {
    expect(typeof choixDePrestation).toBe("function");
  });
});

describe("FP-1 — un choix par type de tarification, conforme au contrat", () => {
  it("FIXED et PER_GUEST : la prestation SEULE — ni palier ni quantité", () => {
    expect(regle(FIXE)).toEqual({ serviceId: FIXE.id });
    expect(regle(PAR_INVITE)).toEqual({ serviceId: PAR_INVITE.id });
    expect(conforme(regle(FIXE))).toBe(true);
  });

  it("⛔ MD-4 : un détail saisi pour une prestation qui n'en veut pas N'EST PAS envoyé (le contrat l'interdit)", () => {
    expect(regle(FIXE, { tierId: PALIER_ACTIF, quantite: "3" })).toEqual({ serviceId: FIXE.id });
  });

  it("TIERED : le palier CHOISI, et lui seul", () => {
    const choix = regle(PALIERS, { tierId: PALIER_ACTIF });
    expect(choix).toEqual({ serviceId: PALIERS.id, tierId: PALIER_ACTIF });
    expect(conforme(choix)).toBe(true);
  });

  it("⛔ MD-1 : TIERED sans palier — AUCUN choix (jamais un palier par défaut)", () => {
    expect(regle(PALIERS)).toBe(null);
    expect(regle(PALIERS, {})).toBe(null);
  });

  it("⛔ MD-11 : un palier INACTIF, ou d'une autre prestation, n'est pas un choix", () => {
    expect(regle(PALIERS, { tierId: PALIER_INACTIF })).toBe(null);
    expect(regle(PALIERS, { tierId: "99999999-9999-4999-8999-999999999999" })).toBe(null);
  });

  it("⛔ MD-5 : PER_UNIT — la quantité ENVOYÉE est la quantité SAISIE, en nombre entier", () => {
    const choix = regle(UNITES, { quantite: "12" });
    expect(choix).toEqual({ serviceId: UNITES.id, quantity: 12 });
    expect(conforme(choix)).toBe(true);
  });

  it("⛔ MD-2 : PER_UNIT sans quantité, ou une saisie qui n'est pas un entier — AUCUN choix", () => {
    // ⚠ « 1e1 » (= 10) et « 0x10 » (= 16) restent DANS les bornes du catalogue (2 à 30) : seuls des cas en bornes distinguent un entier
    // STRICT d'un `Number()` — « 1e3 » est rattrapée par la borne haute, et la cible P-3 du harnais l'avait montré (extension 1).
    for (const saisie of [undefined, "", "  ", "3,5", "2.5", "-4", "douze", "1e3", "1e1", "0x10"]) {
      expect(regle(UNITES, saisie === undefined ? undefined : { quantite: saisie })).toBe(null);
    }
  });

  it("⛔ MD-3 : PER_UNIT — les bornes sont CELLES DU CATALOGUE (`minUnits`, `maxUnits`), bornes incluses", () => {
    const min = UNITES.minUnits as number;
    const max = UNITES.maxUnits as number;
    expect(regle(UNITES, { quantite: String(min - 1) })).toBe(null);
    expect(regle(UNITES, { quantite: String(min) })).toEqual({ serviceId: UNITES.id, quantity: min });
    expect(regle(UNITES, { quantite: String(max) })).toEqual({ serviceId: UNITES.id, quantity: max });
    expect(regle(UNITES, { quantite: String(max + 1) })).toBe(null);
  });

  it("PER_UNIT sans borne au catalogue : tout entier ≥ 1 passe, 0 non (le contrat exige une quantité positive)", () => {
    const libre: ServiceDTO = { ...UNITES, minUnits: null, maxUnits: null };
    expect(regle(libre, { quantite: "1" })).toEqual({ serviceId: UNITES.id, quantity: 1 });
    expect(regle(libre, { quantite: "0" })).toBe(null);
  });
});
