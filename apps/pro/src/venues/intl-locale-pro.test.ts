// FC-6 (session `front-client`) — LES DATES DU PRO, DANS UNE PAGE ARABE, SONT CELLES QU'ON LIT EN ALGÉRIE.
//
// ⚠ L'ARBITRAGE (Ko, 04/10/2026, mot pour mot) : « Les dates et les nombres en arabe se formatent en ar-DZ. » La règle vit dans
// `@zwadj/types` (`intlLocale`) et sert les DEUX applications : une garde sur du code partagé se vérifie dans tous ses
// consommateurs (AGENTS.md) — le client a la sienne (`apps/client/src/lib/intl-locale.test.ts`), le pro celle-ci.
// L'attendu vient des mots de Ko (`ar-DZ`), mis en forme par le moteur — jamais de `intlLocale` (D223).
import { monthLabel } from "./pro-calendar";

const AOUT_2027 = Date.UTC(2027, 7, 1);
const MOIS_ANNEE = { month: "long", year: "numeric", timeZone: "UTC" } as const;
const moteur = (locale: string) => new Intl.DateTimeFormat(locale, MOIS_ANNEE).format(AOUT_2027);

describe("FC-6 — le calendrier du pro", () => {
  it("calibration : ce moteur distingue `ar` et `ar-DZ` pour le mois d'août", () => {
    expect(moteur("ar")).not.toBe(moteur("ar-DZ"));
  });

  it("page arabe : le mois est celui de l'Algérie (`ar-DZ`)", () => {
    expect(monthLabel({ year: 2027, month: 8 }, "ar")).toBe(moteur("ar-DZ"));
  });

  it("page française : rien ne change", () => {
    expect(monthLabel({ year: 2027, month: 8 }, "fr")).toBe(moteur("fr"));
  });
});
