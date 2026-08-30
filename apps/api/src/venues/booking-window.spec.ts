// D77 — plage bloquante. Le cas 20h→02h vient en premier : c'est celui qui a
// déjà coûté cher ailleurs dans ce dépôt (D55), et celui qu'un calcul naïf
// casse en produisant endsAt < startsAt.
import { describe, expect, it } from "vitest";
import { computeBookingWindow } from "./booking-window";
import { parseCivilDate, type CivilDate } from "./availability-time";

const day = (value: string) => parseCivilDate(value) as CivilDate;

describe("Plage bloquante — le créneau qui traverse minuit (D55/D77)", () => {
  it("20h→02h finit LE LENDEMAIN, pas la veille", () => {
    // startMinutes 1200 = 20:00, endMinutes 1560 = 02:00 du jour suivant.
    const w = computeBookingWindow(day("2026-08-14"), { startMinutes: 1200, endMinutes: 1560 });
    // Alger = UTC+1 fixe : 20:00 local = 19:00Z le 14, 02:00 local = 01:00Z le 15.
    expect(w.startsAt.toISOString()).toBe("2026-08-14T19:00:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-08-15T01:00:00.000Z");
    expect(w.endsAt.getTime()).toBeGreaterThan(w.startsAt.getTime());
  });

  it("le maximum du schéma (endMinutes = 2880) reste ordonné", () => {
    const w = computeBookingWindow(day("2026-08-14"), { startMinutes: 1439, endMinutes: 2880 });
    expect(w.endsAt.getTime()).toBeGreaterThan(w.startsAt.getTime());
  });
});

describe("Plage bloquante — SINGLE_SLOT", () => {
  it("bloque la JOURNÉE LOCALE ENTIÈRE, ce qui matérialise « une par jour »", () => {
    const w = computeBookingWindow(day("2026-08-14"), null);
    expect(w.startsAt.toISOString()).toBe("2026-08-13T23:00:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-08-14T23:00:00.000Z");
    expect(w.endsAt.getTime() - w.startsAt.getTime()).toBe(86_400_000);
  });

  it("deux jours consécutifs se touchent sans se recouvrir — borne haute EXCLUE", () => {
    const a = computeBookingWindow(day("2026-08-14"), null);
    const b = computeBookingWindow(day("2026-08-15"), null);
    expect(a.endsAt.getTime()).toBe(b.startsAt.getTime());
  });
});

describe("Plage bloquante — MULTI_SLOT", () => {
  it("reprend exactement les heures du créneau", () => {
    const w = computeBookingWindow(day("2026-03-01"), { startMinutes: 720, endMinutes: 1020 });
    expect(w.startsAt.toISOString()).toBe("2026-03-01T11:00:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-03-01T16:00:00.000Z");
  });

  it("aucune heure d'été : juillet et janvier ont le MÊME décalage (D48)", () => {
    const summer = computeBookingWindow(day("2026-07-15"), { startMinutes: 720, endMinutes: 780 });
    const winter = computeBookingWindow(day("2026-01-15"), { startMinutes: 720, endMinutes: 780 });
    expect(summer.startsAt.getUTCHours()).toBe(11);
    expect(winter.startsAt.getUTCHours()).toBe(11);
  });

  it("deux créneaux adjacents du même jour ne se recouvrent pas", () => {
    const midi = computeBookingWindow(day("2026-08-14"), { startMinutes: 720, endMinutes: 1020 });
    const soir = computeBookingWindow(day("2026-08-14"), { startMinutes: 1020, endMinutes: 1440 });
    expect(midi.endsAt.getTime()).toBe(soir.startsAt.getTime());
  });
});
