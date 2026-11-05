// FC-6 (session `front-client`) — LA RÈGLE DE MISE EN FORME, `intlLocale` (`@zwadj/types`), ET LES DATES DU CLIENT QUI LA SUIVENT.
//
// ⚠ L'ARBITRAGE (Ko, 04/10/2026, mot pour mot) : « Les dates et les nombres en arabe se formatent en ar-DZ. Le catalogue et les
// routes restent ar. » Les valeurs attendues viennent de CES MOTS (`ar-DZ`), mis en forme par le moteur — jamais de `intlLocale`
// elle-même, ce qui rendrait le test tautologique (D223) — ni d'une chaîne tapée à la main (D209 n° 6).
// ⚠ La règle est lue PAR SON NOM dans le module : absente (avant FC-6), le rouge se lit en ASSERTION (D304), et le fichier
// compile avant comme après.
import * as types from "@zwadj/types";
import { longDate } from "./booking-calendar";
import { monthLabel } from "./calendar";

const regle = (types as Record<string, unknown>).intlLocale as ((langue: string) => string) | undefined;

const AOUT_2027 = Date.UTC(2027, 7, 1);
const LE_15 = Date.UTC(2027, 7, 15);
const MOIS_ANNEE = { month: "long", year: "numeric", timeZone: "UTC" } as const;
const DATE_LONGUE = { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } as const;
const moteur = (locale: string, options: Intl.DateTimeFormatOptions, date: number) => new Intl.DateTimeFormat(locale, options).format(date);

describe("FC-6 — calibration : ce moteur DISTINGUE `ar` et `ar-DZ` (sinon rien ici ne mesure)", () => {
  it("le mois d'août : « ar » et « ar-DZ » rendent deux noms différents", () => {
    expect(moteur("ar", MOIS_ANNEE, AOUT_2027)).not.toBe(moteur("ar-DZ", MOIS_ANNEE, AOUT_2027));
  });

  it("et `fr` / `fr-DZ` rendent les mêmes octets (le relevé du navigateur : la règle ne change rien en français)", () => {
    expect(moteur("fr", MOIS_ANNEE, AOUT_2027)).toBe(moteur("fr-DZ", MOIS_ANNEE, AOUT_2027));
    expect(moteur("fr", DATE_LONGUE, LE_15)).toBe(moteur("fr-DZ", DATE_LONGUE, LE_15));
  });
});

describe("FC-6 — la règle", () => {
  it("`intlLocale` existe dans `@zwadj/types`", () => {
    expect(typeof regle).toBe("function");
  });

  it("l'arabe se met en forme en `ar-DZ`, le français en `fr-DZ` (la règle des montants, déjà celle de `formatDZD`)", () => {
    expect(regle?.("ar")).toBe("ar-DZ");
    expect(regle?.("fr")).toBe("fr-DZ");
  });
});

describe("FC-6 — les dates du client, dans une page arabe, sont celles qu'on lit en Algérie", () => {
  it("le mois du calendrier", () => {
    expect(monthLabel({ year: 2027, month: 8 }, "ar")).toBe(moteur("ar-DZ", MOIS_ANNEE, AOUT_2027));
  });

  it("la date longue — le nom accessible d'un jour", () => {
    expect(longDate("2027-08-15", "ar")).toBe(moteur("ar-DZ", DATE_LONGUE, LE_15));
  });

  // ⚠ PAS de test du numéro du jour ni des noms de jours : `ar` et `ar-DZ` les rendent identiques dans ce moteur (relevé) — un
  // tel test serait vert avant comme après, il ne mesurerait rien. La garde de SOURCE (`intl-locale-guard.test.ts`) les couvre.

  it("dans une page française, rien ne change", () => {
    expect(monthLabel({ year: 2027, month: 8 }, "fr")).toBe(moteur("fr", MOIS_ANNEE, AOUT_2027));
    expect(longDate("2027-08-15", "fr")).toBe(moteur("fr", DATE_LONGUE, LE_15));
  });
});
