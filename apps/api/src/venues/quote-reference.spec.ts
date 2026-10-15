import { afterAll, describe, expect, it } from "vitest";
import { algiersYear } from "./quote-reference";

// ══ Rang 39 (D333, L35-3) — L'ANNÉE D'UNE RÉFÉRENCE EST CELLE D'ALGER, JAMAIS UTC, JAMAIS CELLE DU SERVEUR ═════════════════════════════════════════════
// D48 : UTC+1 sans heure d'été ; le fuseau ne se dérive JAMAIS de la locale ni de l'hôte. Le cas qui compte est le passage de l'année : le 31 décembre à
// 23 h 00 UTC, il est déjà minuit à Alger — la référence d'un devis créé à cet instant porte l'année SUIVANTE (R3 : « l'année est celle de la création de la
// version 1, à l'heure d'Alger »). Les instants ci-dessous sont les bornes de ce cas, pas des dates « plausibles ».

const CAS: [string, number][] = [
  ["2026-12-31T22:59:59.999Z", 2026], // une milliseconde avant minuit à Alger
  ["2026-12-31T23:00:00.000Z", 2027], // minuit pile à Alger
  ["2026-12-31T23:30:00.000Z", 2027], // 00 h 30 à Alger, le 1ᵉʳ janvier
  ["2027-01-01T00:00:00.000Z", 2027],
  ["2027-12-31T22:59:59.999Z", 2027],
  ["2027-12-31T23:00:00.000Z", 2028],
  ["2026-06-15T12:00:00.000Z", 2026]
];

// ⚠ UNE GARDE DE FUSEAU EST MUETTE SUR UN SERVEUR EN UTC (S11-a) : la spec ÉPINGLE `TZ` (Node 22 la prend en compte à chaud) et la RESTAURE en `afterAll`, sinon elle
// contamine ses voisines. Trois hôtes à l'opposé de l'UTC et de l'Algérie : si le calcul lisait le fuseau de l'hôte, l'un d'eux le ferait rougir.
const TZ_INITIAL = process.env.TZ;
afterAll(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_INITIAL;
});

describe.each(["UTC", "America/New_York", "Pacific/Kiritimati", "Asia/Tokyo"])("algiersYear — hôte réglé sur %s", (tz) => {
  it.each(CAS)("⛔ %s ⇒ %i", (instant, annee) => {
    process.env.TZ = tz;
    expect(algiersYear(new Date(instant))).toBe(annee);
  });
});

describe("algiersYear — l'entrée", () => {
  it("⛔ une date invalide LÈVE : une année `NaN` ne devient pas une référence", () => {
    expect(() => algiersYear(new Date("pas une date"))).toThrow(RangeError);
  });
});
