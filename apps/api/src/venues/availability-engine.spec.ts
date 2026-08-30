// Lot B3 — moteur de disponibilité. Il décide ce que le client VOIT comme
// réservable : une erreur ici produit soit une case vendue deux fois, soit une
// salle qui perd des demandes en paraissant pleine.
import {
  computeDayAvailability,
  computeDaySlotStatuses,
  intervalsOverlap,
  type BookingWindow
} from "./availability-engine";

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

// ── Lot `availableOn` — le cœur commun, exercé DIRECTEMENT ──────────────────
// ⚠ POURQUOI CES TESTS EN PLUS des treize précédents. `computeDaySlotStatuses`
// a été extrait pour que la liste publique annote sans passer par les prix.
// Les treize tests d'origine ne l'atteignent qu'À TRAVERS `computeDayAvailability` :
// ils prouveraient encore la même chose si l'extraction avait, en chemin, cassé
// la signature que la liste publique consomme. Le second appelant mérite ses
// propres assertions.
const statuts = (over: Partial<Parameters<typeof computeDaySlotStatuses>[0]> = {}) =>
  computeDaySlotStatuses({
    dayStartMs: DAY_START,
    // ⚠ Créneaux SANS prix ni règles : c'est exactement ce que la liste
    // publique charge. Si le type l'exigeait encore, ce test ne compilerait pas.
    slots: [
      { id: "matin", startMinutes: 600, endMinutes: 900 },
      { id: "soir", startMinutes: 1200, endMinutes: 1560 }
    ],
    bookings: [],
    blocks: [],
    singleSlot: false,
    ...over
  });

describe("computeDaySlotStatuses — statut sans prix", () => {
  it("l'entrée PORTE son créneau : l'appariement est structurel, pas positionnel", () => {
    // C'est ce que le compilateur a imposé, et c'est ce qui rend l'invariant
    // « même ordre, même cardinalité » inutile à tenir.
    const out = statuts();
    expect(out.map((e) => e.slot.id)).toEqual(["matin", "soir"]);
    expect(out.map((e) => e.status)).toEqual(["AVAILABLE", "AVAILABLE"]);
  });

  it("un verrou DUR recouvrant la soirée la met en BOOKED, sans toucher le matin", () => {
    const out = statuts({ bookings: [booking(1200, 1560, true, "soir")] });
    expect(out.find((e) => e.slot.id === "soir")?.status).toBe("BOOKED");
    expect(out.find((e) => e.slot.id === "matin")?.status).toBe("AVAILABLE");
  });

  it("SINGLE_SLOT : un verrou dur sur un créneau ferme TOUS les autres", () => {
    const out = statuts({ bookings: [booking(600, 900, true, "matin")], singleSlot: true });
    expect(out.every((e) => e.status === "BOOKED")).toBe(true);
  });

  it("SINGLE_SLOT ne remonte PAS un BLOCKED en BOOKED : un blocage se lève autrement", () => {
    const out = statuts({
      bookings: [booking(600, 900, true, "matin")],
      blocks: [{ startMs: at(1200), endMs: at(1560) }],
      singleSlot: true
    });
    expect(out.find((e) => e.slot.id === "soir")?.status).toBe("BLOCKED");
  });

});

// ⚠ GARDE RETIRÉE, ET C'EST ÉCRIT PLUTÔT QUE SILENCIEUX.
// Un test « `computeDaySlotStatuses` rend les mêmes statuts que
// `computeDayAvailability` » a été écrit ici, puis SUPPRIMÉ : le harnais de
// neutralisation l'a trouvé MUET. Depuis l'extraction, la seconde fonction
// APPELLE la première — l'égalité est vraie par construction et ne peut plus
// rougir, quelle que soit la faute injectée. Elle se lisait comme une garde
// contre la divergence (D78) et n'en était pas une.
//
// Ce qu'il fallait garder est le RISQUE, pas l'assertion : que quelqu'un
// réinstalle un calcul de statut dans `computeDayAvailability`. Cela ne se
// mesure pas sur des valeurs — les deux chemins seraient alors justement
// d'accord au premier jour — mais sur la SOURCE. Même angle que le garde-fou
// `dynamic = "force-dynamic"` de la recherche client.
describe("une seule autorité sur « pris ou libre »", () => {
  it("⚠ `computeDayAvailability` DÉLÈGUE, et le fichier n'initialise un statut qu'UNE fois", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    // ⚠ `process.cwd()` et NON `import.meta.url` : le tsconfig de l'API cible
    // CommonJS et `import.meta` y est une erreur de compilation (TS1343). Le
    // client, lui, l'autorise — le garde-fou équivalent y est écrit autrement.
    // Vitest s'exécute depuis `apps/api`, racine du projet de test.
    const source = readFileSync(join(process.cwd(), "src/venues/availability-engine.ts"), "utf8");
    expect(source).toContain("return computeDaySlotStatuses({");
    // Une SECONDE initialisation de statut dans ce fichier = une seconde règle
    // de recouvrement à faire diverger. Le client verrait alors une salle
    // grisée dans la grille et libre dans son calendrier (D78).
    expect(source.split('let status: SlotAvailabilityStatus = "AVAILABLE";').length - 1).toBe(1);
  });
});
