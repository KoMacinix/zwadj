// Lot B3 — moteur de disponibilité. Il décide ce que le client VOIT comme
// réservable : une erreur ici produit soit une case vendue deux fois, soit une
// salle qui perd des demandes en paraissant pleine.
import { computeDayAvailability, intervalsOverlap, type BookingWindow } from "./availability-engine";

const DAY_START = Date.UTC(2026, 6, 15, 0, 0, 0); // 15 juillet 2026, minuit local
const MIN = 60_000;
const at = (minutes: number) => DAY_START + minutes * MIN;

const JOUR = { month: 7, dayOfWeek: 3, isHoliday: false };
const SOIREE = { id: "soir", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000, rules: [] };
const MATIN = { id: "matin", startMinutes: 600, endMinutes: 900, basePriceCents: 12_000_000, rules: [] };

const booking = (from: number, to: number, hard: boolean, slotTemplateId: string | null = null): BookingWindow => ({
  startMs: at(from),
  endMs: at(to),
  hard,
  slotTemplateId
});

const compute = (over: Partial<Parameters<typeof computeDayAvailability>[0]> = {}) =>
  computeDayAvailability({
    dayStartMs: DAY_START,
    day: JOUR,
    slots: [MATIN, SOIREE],
    bookings: [],
    blocks: [],
    singleSlot: false,
    ...over
  });

describe("intervalsOverlap", () => {
  it("se toucher ne compte pas : une fête qui finit à 18h et une autre qui commence à 18h coexistent", () => {
    expect(intervalsOverlap({ startMs: at(600), endMs: at(900) }, { startMs: at(900), endMs: at(1200) })).toBe(false);
  });

  it("inclusion stricte détectée — le cas qu'une comparaison de bornes rate", () => {
    expect(intervalsOverlap({ startMs: at(600), endMs: at(900) }, { startMs: at(700), endMs: at(800) })).toBe(true);
  });
});

describe("computeDayAvailability", () => {
  it("journée vide : tout est libre, au prix de base de CHAQUE créneau", () => {
    expect(compute()).toEqual([
      { slotTemplateId: "matin", status: "AVAILABLE", priceCents: 12_000_000, ruleId: null },
      { slotTemplateId: "soir", status: "AVAILABLE", priceCents: 20_000_000, ruleId: null }
    ]);
  });

  it("une réservation DURE ferme le créneau qu'elle recouvre, et lui seul", () => {
    const [matin, soir] = compute({ bookings: [booking(1200, 1560, true)] });
    expect(matin?.status).toBe("AVAILABLE");
    expect(soir?.status).toBe("BOOKED");
  });

  it("une demande PENDING est SIGNALÉE sans verrouiller : le pro tranche, mais le client le sait", () => {
    // Laisser croire à une case libre puis annoncer un concurrent au devis est
    // la pire des surprises.
    const [, soir] = compute({ bookings: [booking(1200, 1560, false)] });
    expect(soir?.status).toBe("REQUESTED");
  });

  it("une réservation DURE l'emporte sur une demande souple sur le même créneau", () => {
    const [, soir] = compute({ bookings: [booking(1200, 1560, false), booking(1300, 1400, true)] });
    expect(soir?.status).toBe("BOOKED");
  });

  it("un walk-in SANS créneau bloque par recouvrement HORAIRE : l'identité du créneau ne fait pas foi", () => {
    // Plage libre 19h → 23h saisie par le pro : elle occupe la soirée.
    const [matin, soir] = compute({ bookings: [booking(1140, 1380, true, null)] });
    expect(soir?.status).toBe("BOOKED");
    expect(matin?.status).toBe("AVAILABLE");
  });

  it("un créneau qui FRANCHIT MINUIT est confronté à la nuit suivante, pas au jour civil", () => {
    // Soirée 20h → 02h (1200 → 1560) contre une réservation de 00h30 à 01h30
    // du LENDEMAIN, soit 1470 → 1530 dans ce repère.
    const [, soir] = compute({ bookings: [booking(1470, 1530, true)] });
    expect(soir?.status).toBe("BOOKED");
  });

  it("un blocage pro l'emporte sur tout le reste", () => {
    const [matin] = compute({ blocks: [{ startMs: at(0), endMs: at(1440) }], bookings: [booking(600, 900, true)] });
    expect(matin?.status).toBe("BLOCKED");
  });

  it("SINGLE_SLOT : une réservation dure sur UN créneau ferme TOUTE la journée", () => {
    // Sinon le client choisirait une case que la salle ne peut pas honorer.
    const [matin, soir] = compute({ singleSlot: true, bookings: [booking(1200, 1560, true)] });
    expect(matin?.status).toBe("BOOKED");
    expect(soir?.status).toBe("BOOKED");
  });

  it("SINGLE_SLOT : une demande PENDING ne ferme PAS la journée — elle ne verrouille rien", () => {
    const [matin] = compute({ singleSlot: true, bookings: [booking(1200, 1560, false)] });
    expect(matin?.status).toBe("AVAILABLE");
  });

  it("SINGLE_SLOT : un blocage ne se fait pas écraser en « réservé » — il reste plus grave", () => {
    const [matin, soir] = compute({
      singleSlot: true,
      blocks: [{ startMs: at(600), endMs: at(900) }],
      bookings: [booking(1200, 1560, true)]
    });
    expect(matin?.status).toBe("BLOCKED");
    expect(soir?.status).toBe("BOOKED");
  });

  it("le prix vient du moteur de prix, règle gagnante citée", () => {
    // Un seul créneau passé ici : la destructuration prend l'index 0.
    const [soir] = compute({
      slots: [
        {
          ...SOIREE,
          rules: [
            {
              id: "haute",
              ruleType: "SEASON" as const,
              priceCents: 26_000_000,
              startMonth: 6,
              endMonth: 8,
              daysOfWeek: [],
              priority: 0,
              isActive: true,
              createdAt: new Date("2026-01-01T00:00:00.000Z")
            }
          ]
        }
      ]
    });
    expect(soir).toEqual({ slotTemplateId: "soir", status: "AVAILABLE", priceCents: 26_000_000, ruleId: "haute" });
  });
});
