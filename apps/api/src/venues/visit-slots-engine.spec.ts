// Lot C2 — découpage des visites, D58. Module pur : tout est fourni.
import { describe, expect, it } from "vitest";
import { computeVisitSlots, type VisitWindow } from "./visit-slots-engine";

/** Minuit local d'un dimanche (UTC+1), instant arbitraire mais FIXE. */
const DAY = Date.UTC(2027, 7, 15) - 60 * 60_000;
const DIMANCHE = 0;
const LUNDI = 1;
const MINUTE = 60_000;
/** Bien avant la journée : rien n'est filtré par le passé. */
const TOT = DAY - 86_400_000;

const MATIN: VisitWindow = { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 }; // 09:00–12:00

const run = (windows: VisitWindow[], bookings: number[] = [], nowMs = TOT) =>
  computeVisitSlots({
    dayStartMs: DAY,
    dayOfWeek: DIMANCHE,
    windows,
    bookings: bookings.map((m) => ({ startMs: DAY + m * MINUTE })),
    nowMs
  });

describe("Découpage — durée fixe de 30 minutes (D58)", () => {
  it("une plage de 3 h rend 6 créneaux, de 30 en 30", () => {
    expect(run([MATIN]).map((s) => s.startMinutes)).toEqual([540, 570, 600, 630, 660, 690]);
  });

  it("une plage trop courte ne rend AUCUN créneau, pas un créneau tronqué", () => {
    expect(run([{ dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 560 }])).toEqual([]);
  });

  it("un reliquat de fin est ignoré : 09:00→10:20 s'arrête à 09:30", () => {
    expect(run([{ dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 620 }]).map((s) => s.startMinutes)).toEqual([
      540, 570
    ]);
  });

  it("une plage exactement d'un créneau en rend un", () => {
    expect(run([{ dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 570 }]).map((s) => s.startMinutes)).toEqual([540]);
  });
});

describe("Découpage — jour de la semaine", () => {
  it("une plage d'un AUTRE jour est ignorée", () => {
    expect(run([{ ...MATIN, dayOfWeek: LUNDI }])).toEqual([]);
  });

  it("deux plages BOUT À BOUT s'enchaînent sans doublon ni trou", () => {
    const slots = run([MATIN, { dayOfWeek: DIMANCHE, startMinutes: 720, endMinutes: 780 }]);
    expect(slots.map((s) => s.startMinutes)).toEqual([540, 570, 600, 630, 660, 690, 720, 750]);
    expect(new Set(slots.map((s) => s.startMinutes)).size).toBe(slots.length);
  });

  it("les créneaux sortent TRIÉS même si les plages arrivent en désordre", () => {
    const slots = run([{ dayOfWeek: DIMANCHE, startMinutes: 900, endMinutes: 960 }, MATIN]);
    expect(slots.map((s) => s.startMinutes)).toEqual([540, 570, 600, 630, 660, 690, 900, 930]);
  });
});

describe("Découpage — rendez-vous déjà pris (D47)", () => {
  it("un créneau pris est SIGNALÉ, pas retiré — il reste visible pour aider à en choisir un autre (D59)", () => {
    const slots = run([MATIN], [600]);
    expect(slots).toHaveLength(6);
    expect(slots.find((s) => s.startMinutes === 600)?.taken).toBe(true);
    expect(slots.find((s) => s.startMinutes === 570)?.taken).toBe(false);
  });

  it("deux rendez-vous sur le MÊME créneau ne le font pas disparaître", () => {
    const slots = run([MATIN], [600, 600]);
    expect(slots).toHaveLength(6);
    expect(slots.find((s) => s.startMinutes === 600)?.taken).toBe(true);
  });

  it("un rendez-vous hors créneau ne marque rien", () => {
    expect(run([MATIN], [545]).every((s) => !s.taken)).toBe(true);
  });
});

describe("Découpage — le passé se filtre à la MINUTE", () => {
  it("un créneau de 09:00 disparaît quand il est 10:00, les suivants restent", () => {
    const dixHeures = DAY + 600 * MINUTE;
    expect(run([MATIN], [], dixHeures).map((s) => s.startMinutes)).toEqual([600, 630, 660, 690]);
  });

  it("le créneau qui commence À l'instant courant est CONSERVÉ", () => {
    const neufHeures = DAY + 540 * MINUTE;
    expect(run([MATIN], [], neufHeures)[0]?.startMinutes).toBe(540);
  });

  it("une journée entièrement passée ne rend rien, sans erreur", () => {
    expect(run([MATIN], [], DAY + 1400 * MINUTE)).toEqual([]);
  });
});
