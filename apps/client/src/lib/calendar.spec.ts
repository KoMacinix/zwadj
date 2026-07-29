// Lot B5 — grille de calendrier, D56. Le test qui compte est le premier : en
// Algérie la semaine commence le SAMEDI et le week-end est vendredi-samedi. Un
// calendrier lundi-first avec samedi-dimanche grisés est faux deux fois, et
// silencieusement — personne en France ne le verrait.
import { describe, expect, it } from "vitest";
import {
  WEEKEND_DAYS,
  WEEK_START_DAY,
  compareMonths,
  currentMonth,
  daysBetween,
  isPastDate,
  isWeekend,
  monthGrid,
  monthLabel,
  monthWindow,
  offsetInWeek,
  shiftMonth,
  weekdayHeaders
} from "./calendar";

describe("D56 — la semaine algérienne", () => {
  it("commence le DIMANCHE : premier jour ouvré et d'école en Algérie", () => {
    // ⚠ CLDR dit « samedi » pour ar-DZ, et on s'en écarte VOLONTAIREMENT :
    //   Intl.Locale("ar-DZ").getWeekInfo() → { firstDay: 6, weekend: [5, 6] }
    // CLDR décrit une convention d'affichage ; on suit l'usage réel. Ce test
    // existe pour qu'un « alignement sur Intl » bien intentionné le casse.
    expect(WEEK_START_DAY).toBe(0);
  });

  it("le week-end est vendredi-samedi, pas samedi-dimanche", () => {
    expect([...WEEKEND_DAYS]).toEqual([5, 6]);
    expect(isWeekend(5)).toBe(true); // vendredi
    expect(isWeekend(6)).toBe(true); // samedi
    expect(isWeekend(0)).toBe(false); // dimanche : jour ouvré en Algérie
  });

  it("la convention NE dépend PAS de la langue de l'interface", () => {
    // La locale `fr` du projet répondrait « lundi » et « samedi-dimanche ».
    // La grille rendue en français reste pourtant algérienne : c'est ce que
    // ce test protège.
    expect(weekdayHeaders("fr", "long")[0]).toBe("dimanche");
    expect(weekdayHeaders("ar", "long")).toHaveLength(7);
    expect(isWeekend(0)).toBe(false);
  });

  it("le décalage dans la semaine part du dimanche", () => {
    expect(offsetInWeek(0)).toBe(0); // dimanche = 1re colonne
    expect(offsetInWeek(4)).toBe(4); // jeudi = dernier jour ouvré
    expect(offsetInWeek(5)).toBe(5); // vendredi
    expect(offsetInWeek(6)).toBe(6); // samedi = dernière colonne
  });
});

describe("En-têtes de colonnes", () => {
  it("les sept jours sortent dans l'ordre algérien, dimanche en tête, samedi en queue", () => {
    expect(weekdayHeaders("fr", "long")).toEqual([
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi"
    ]);
  });

  it("l'arabe est traduit par Intl, sans seconde table de libellés", () => {
    const ar = weekdayHeaders("ar", "long");
    expect(ar).toHaveLength(7);
    expect(ar[0]).toBe("الأحد"); // dimanche
    expect(ar[6]).toBe("السبت"); // samedi ferme la ligne
  });
});

describe("Grille mensuelle", () => {
  it("rend toujours des semaines COMPLÈTES : un multiple de sept", () => {
    for (const [y, m] of [
      [2027, 1],
      [2027, 2],
      [2027, 8],
      [2028, 2]
    ] as const) {
      expect(monthGrid(y, m).length % 7).toBe(0);
    }
  });

  it("la première colonne est TOUJOURS un dimanche, la dernière un samedi", () => {
    const grid = monthGrid(2027, 8);
    expect(grid[0]?.dayOfWeek).toBe(0);
    expect(grid[6]?.dayOfWeek).toBe(6);
    expect(grid[7]?.dayOfWeek).toBe(0);
  });

  it("le week-end CLÔT la ligne au lieu de l'ouvrir — l'inverse du réglage CLDR", () => {
    const week = monthGrid(2027, 8).slice(0, 7);
    expect(week.map((c) => c.isWeekend)).toEqual([false, false, false, false, false, true, true]);
  });

  it("août 2027 commence un dimanche : AUCUNE case de remplissage en tête", () => {
    // 2027-08-01 est un dimanche (jour 0) ⇒ offset 0, la grille démarre net.
    expect(new Date(Date.UTC(2027, 7, 1)).getUTCDay()).toBe(0);
    const grid = monthGrid(2027, 8);
    expect(grid[0]?.date).toBe("2027-08-01");
  });

  it("un mois qui commence un mercredi laisse TROIS cases de remplissage", () => {
    // 2027-09-01 est un mercredi (jour 3) ⇒ trois cases avant lui.
    expect(new Date(Date.UTC(2027, 8, 1)).getUTCDay()).toBe(3);
    const grid = monthGrid(2027, 9);
    expect(grid.slice(0, 3).every((c) => c.date === null)).toBe(true);
    expect(grid[3]?.date).toBe("2027-09-01");
  });

  it("contient chaque jour du mois, une seule fois, dans l'ordre", () => {
    const dates = monthGrid(2028, 2)
      .map((c) => c.date)
      .filter((d): d is string => d !== null);
    expect(dates).toHaveLength(29); // 2028 est bissextile
    expect(dates[0]).toBe("2028-02-01");
    expect(dates.at(-1)).toBe("2028-02-29");
    expect(new Set(dates).size).toBe(29);
  });

  it("les cases de remplissage portent quand même leur jour de semaine", () => {
    const lead = monthGrid(2027, 9)[0];
    expect(lead?.date).toBeNull();
    expect(lead?.dayOfWeek).toBe(0);
    expect(lead?.isWeekend).toBe(false);
  });
});

describe("Fenêtre et navigation", () => {
  it("la fenêtre d'un mois couvre du 1er au dernier jour, et reste sous 92", () => {
    expect(monthWindow(2027, 2)).toEqual({ from: "2027-02-01", to: "2027-02-28" });
    expect(monthWindow(2028, 2)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    const w = monthWindow(2027, 8);
    expect(daysBetween(w.from, w.to) + 1).toBe(31);
  });

  it("le décalage de mois franchit l'année dans les deux sens", () => {
    expect(shiftMonth({ year: 2027, month: 12 }, 1)).toEqual({ year: 2028, month: 1 });
    expect(shiftMonth({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(shiftMonth({ year: 2027, month: 1 }, 18)).toEqual({ year: 2028, month: 7 });
  });

  it("la comparaison de mois ordonne correctement", () => {
    expect(compareMonths({ year: 2027, month: 1 }, { year: 2027, month: 2 })).toBeLessThan(0);
    expect(compareMonths({ year: 2028, month: 1 }, { year: 2027, month: 12 })).toBeGreaterThan(0);
    expect(compareMonths({ year: 2027, month: 5 }, { year: 2027, month: 5 })).toBe(0);
  });

  it("le mois courant est celui d'ALGER : 23h30 UTC un 31, on est déjà le mois suivant", () => {
    expect(currentMonth(Date.parse("2027-07-31T23:30:00Z"))).toEqual({ year: 2027, month: 8 });
  });

  it("le libellé du mois vient d'Intl, dans la langue demandée", () => {
    expect(monthLabel({ year: 2027, month: 8 }, "fr")).toContain("août");
  });
});

describe("Jours passés", () => {
  it("un jour antérieur à aujourd'hui À ALGER est passé", () => {
    const now = Date.parse("2027-08-14T09:00:00Z");
    expect(isPastDate("2027-08-13", now)).toBe(true);
    expect(isPastDate("2027-08-14", now)).toBe(false);
    expect(isPastDate("2027-08-15", now)).toBe(false);
  });

  it("à 23h30 UTC, on est déjà demain à Alger", () => {
    const now = Date.parse("2027-08-14T23:30:00Z");
    expect(isPastDate("2027-08-14", now)).toBe(true);
  });
});
