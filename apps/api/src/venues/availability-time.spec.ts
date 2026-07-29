// Lot B3 — arithmétique civile, module pur. Aucune horloge, aucune base :
// `nowMs` est toujours fourni, ce qui rend l'écrêtage D49 déterministe.
import { describe, expect, it } from "vitest";
import {
  addMonthsCivil,
  civilDateTimeToMs,
  civilDayStartMs,
  civilTodayAt,
  civilUtcMs,
  clampWindow,
  enumerateDays,
  formatCivilDate,
  holidayKey,
  msToCivilDateTime,
  parseCivilDate,
  toCalendarDay
} from "./availability-time";

const d = (value: string) => parseCivilDate(value)!;
/** Instant arbitraire mais FIXE, servant d'« aujourd'hui » : 2026-08-14 10h00 à
 *  Alger. Aucun test ne doit dépendre du jour où il tourne. */
const NOW = Date.parse("2026-08-14T09:00:00Z");

describe("Dates civiles — conversion en instants", () => {
  it("minuit local du 1er janvier vaut 23h00 UTC la veille", () => {
    expect(civilDayStartMs(d("2026-01-01"))).toBe(Date.UTC(2025, 11, 31, 23));
  });

  it("minuit UTC et minuit local ne sont PAS le même instant — 60 minutes d'écart", () => {
    const date = d("2026-08-14");
    expect(civilUtcMs(date) - civilDayStartMs(date)).toBe(60 * 60_000);
  });

  it("le jour de la semaine vient de la date CIVILE, jamais d'un Date local", () => {
    const holidays = new Set<string>();
    expect(toCalendarDay(d("2026-11-01"), holidays).dayOfWeek).toBe(0); // dimanche
    expect(toCalendarDay(d("2026-08-14"), holidays).dayOfWeek).toBe(5); // vendredi
    expect(toCalendarDay(d("2026-08-15"), holidays).dayOfWeek).toBe(6); // samedi
  });

  it("le mois rendu est 1–12, pas l'index 0–11 de Date", () => {
    expect(toCalendarDay(d("2026-01-05"), new Set()).month).toBe(1);
    expect(toCalendarDay(d("2026-12-05"), new Set()).month).toBe(12);
  });
});

describe("Dates civiles — validation", () => {
  it("une date civile inexistante est refusée — 2026-02-31 passe la regex, pas le calendrier", () => {
    expect(parseCivilDate("2026-02-31")).toBeNull();
    expect(parseCivilDate("2026-13-01")).toBeNull();
    expect(parseCivilDate("2026-00-10")).toBeNull();
    expect(parseCivilDate("2026-2-01")).toBeNull();
    expect(parseCivilDate("2026-02-28")).not.toBeNull();
  });

  it("le 29 février d'une année bissextile est accepté, celui d'une année commune non", () => {
    expect(parseCivilDate("2028-02-29")).not.toBeNull();
    expect(parseCivilDate("2027-02-29")).toBeNull();
  });
});

describe("Fériés — colonne @db.Date", () => {
  it("un férié rendu à minuit UTC produit la clé du bon jour", () => {
    expect(holidayKey(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11-01");
  });

  it("toCalendarDay marque isHoliday sur la clé civile, pas sur un instant", () => {
    const holidays = new Set([holidayKey(new Date("2026-11-01T00:00:00.000Z"))]);
    expect(toCalendarDay(d("2026-11-01"), holidays).isHoliday).toBe(true);
    expect(toCalendarDay(d("2026-10-31"), holidays).isHoliday).toBe(false);
  });
});

describe("Énumération", () => {
  it("l'énumération est INCLUSIVE des deux bornes", () => {
    expect(enumerateDays(d("2026-08-14"), d("2026-08-14"))).toHaveLength(1);
    expect(enumerateDays(d("2026-08-14"), d("2026-08-16")).map(formatCivilDate)).toEqual([
      "2026-08-14",
      "2026-08-15",
      "2026-08-16"
    ]);
  });

  it("l'énumération traverse un changement de mois et une année bissextile sans trou", () => {
    expect(enumerateDays(d("2028-02-27"), d("2028-03-01")).map(formatCivilDate)).toEqual([
      "2028-02-27",
      "2028-02-28",
      "2028-02-29",
      "2028-03-01"
    ]);
  });
});

describe("Ajout de mois", () => {
  it("l'ajout de 18 mois au 31 août tombe sur le 28 février, pas sur un 31 inexistant", () => {
    expect(formatCivilDate(addMonthsCivil(d("2026-08-31"), 18))).toBe("2028-02-29");
    expect(formatCivilDate(addMonthsCivil(d("2025-08-31"), 18))).toBe("2027-02-28");
  });

  it("l'ajout franchit l'année sans dériver", () => {
    expect(formatCivilDate(addMonthsCivil(d("2026-12-15"), 1))).toBe("2027-01-15");
    expect(formatCivilDate(addMonthsCivil(d("2026-01-15"), 18))).toBe("2027-07-15");
  });
});

describe("Écrêtage D49", () => {
  it("aujourd'hui est la date civile d'ALGER, pas celle du serveur", () => {
    // 23h30 UTC le 14 août = déjà le 15 à Alger.
    expect(formatCivilDate(civilTodayAt(Date.parse("2026-08-14T23:30:00Z")))).toBe("2026-08-15");
  });

  it("un from dans le passé est ÉCRÊTÉ à aujourd'hui, jamais rejeté", () => {
    const window = clampWindow(d("2020-01-01"), d("2026-08-20"), NOW);
    expect(formatCivilDate(window.from)).toBe("2026-08-14");
    expect(formatCivilDate(window.to)).toBe("2026-08-20");
    expect(window.empty).toBe(false);
  });

  it("un to au-delà de 18 mois est ÉCRÊTÉ à l'horizon", () => {
    const window = clampWindow(d("2026-08-14"), d("2099-01-01"), NOW);
    expect(formatCivilDate(window.to)).toBe("2028-02-14");
  });

  it("une fenêtre entièrement passée rend empty, pas une erreur", () => {
    expect(clampWindow(d("2020-01-01"), d("2020-03-01"), NOW).empty).toBe(true);
  });

  it("une fenêtre entièrement au-delà de l'horizon rend empty", () => {
    expect(clampWindow(d("2099-01-01"), d("2099-02-01"), NOW).empty).toBe(true);
  });

  it("une fenêtre déjà dans les bornes n'est PAS touchée", () => {
    const window = clampWindow(d("2026-09-01"), d("2026-09-30"), NOW);
    expect(formatCivilDate(window.from)).toBe("2026-09-01");
    expect(formatCivilDate(window.to)).toBe("2026-09-30");
  });
});

describe("Date-heures civiles D51 — symétrie", () => {
  it("08h00 locale du 14 août vaut 07h00 UTC", () => {
    expect(new Date(civilDateTimeToMs("2026-08-14T08:00")).toISOString()).toBe("2026-08-14T07:00:00.000Z");
  });

  it("l'aller-retour rend EXACTEMENT la saisie du pro", () => {
    for (const value of ["2026-08-14T08:00", "2026-01-01T00:00", "2026-12-31T23:59", "2026-08-15T02:30"]) {
      expect(msToCivilDateTime(civilDateTimeToMs(value))).toBe(value);
    }
  });

  it("minuit local d'un 1er janvier fait reculer l'instant d'une année UTC, sans changer la relecture", () => {
    const ms = civilDateTimeToMs("2026-01-01T00:00");
    expect(new Date(ms).toISOString()).toBe("2025-12-31T23:00:00.000Z");
    expect(msToCivilDateTime(ms)).toBe("2026-01-01T00:00");
  });
});
