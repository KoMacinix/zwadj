// Rang 25 (D316) — découpage et fusion des fenêtres de disponibilité.
//
// ⚠ L'attendu est le CONTRAT, pas un nombre recopié : chaque fenêtre produite
// est soumise au schéma que l'API applique (`availabilityWindowQuerySchema`).
// Une fenêtre de 93 jours — « bornes incluses » mal traduit, D147 — y échoue
// exactement comme elle échouait en 400.
import { AVAILABILITY_MAX_WINDOW_DAYS, availabilityWindowQuerySchema, type VenueAvailabilityResponse } from "@zwadj/types";
import { mergeAvailabilityWindows, splitAvailabilityWindow } from "./availability-windows";

const DAY_MS = 86_400_000;
const plus = (civil: string, jours: number) => new Date(Date.parse(`${civil}T00:00:00Z`) + jours * DAY_MS).toISOString().slice(0, 10);
const largeur = (w: { from: string; to: string }) => (Date.parse(`${w.to}T00:00:00Z`) - Date.parse(`${w.from}T00:00:00Z`)) / DAY_MS + 1;

describe("splitAvailabilityWindow — des fenêtres que le contrat accepte", () => {
  // Largeurs demandées, en jours bornes incluses : une seule fenêtre, pile la
  // borne, un jour de trop, et les six mois du panneau (182).
  const CAS = [1, AVAILABILITY_MAX_WINDOW_DAYS, AVAILABILITY_MAX_WINDOW_DAYS + 1, 182, 3 * AVAILABILITY_MAX_WINDOW_DAYS + 5];

  it.each(CAS)("%i jour(s) : chaque fenêtre passe le schéma du contrat", (jours) => {
    const fenetres = splitAvailabilityWindow("2026-09-27", plus("2026-09-27", jours - 1));
    expect(fenetres.length).toBeGreaterThan(0);
    for (const w of fenetres) expect(availabilityWindowQuerySchema.safeParse(w).success).toBe(true);
  });

  it.each(CAS)("%i jour(s) : ni trou ni chevauchement, et la couverture est EXACTE", (jours) => {
    const from = "2026-09-27";
    const to = plus(from, jours - 1);
    const fenetres = splitAvailabilityWindow(from, to);
    expect(fenetres[0]!.from).toBe(from);
    expect(fenetres[fenetres.length - 1]!.to).toBe(to);
    for (let i = 1; i < fenetres.length; i++) expect(fenetres[i]!.from).toBe(plus(fenetres[i - 1]!.to, 1));
    expect(fenetres.reduce((n, w) => n + largeur(w), 0)).toBe(jours);
  });

  it("les six mois du panneau font DEUX requêtes, la première à la borne pile", () => {
    const fenetres = splitAvailabilityWindow("2026-09-27", plus("2026-09-27", 181));
    expect(fenetres.map(largeur)).toEqual([AVAILABILITY_MAX_WINDOW_DAYS, 182 - AVAILABILITY_MAX_WINDOW_DAYS]);
  });

  it("franchit une fin d'année et un 29 février sans perdre un jour", () => {
    const fenetres = splitAvailabilityWindow("2027-12-15", "2028-03-15");
    const jours = fenetres.reduce((n, w) => n + largeur(w), 0);
    expect(jours).toBe((Date.parse("2028-03-15T00:00:00Z") - Date.parse("2027-12-15T00:00:00Z")) / DAY_MS + 1);
  });
});

function reponse(dates: string[], slotIds: string[] = ["s1"]): VenueAvailabilityResponse {
  return {
    venueId: "v1",
    slug: "salle",
    bookingMode: "MULTI_SLOT",
    from: dates[0] ?? "",
    to: dates[dates.length - 1] ?? "",
    slots: slotIds.map((id) => ({ id, nameFr: id, nameAr: id, startMinutes: 1200, endMinutes: 1560 })),
    days: dates.map((date) => ({ date, isHoliday: false, slots: [{ slotTemplateId: "s1", status: "AVAILABLE", priceCents: 18_000_000 }] }))
  };
}

describe("mergeAvailabilityWindows — tout ou rien, et rien de recalculé", () => {
  it("deux fenêtres : les jours dans l'ordre, les créneaux dédoublonnés", () => {
    const a = reponse(["2026-09-27", "2026-09-28"], ["s1"]);
    const b = reponse(["2026-12-28", "2026-12-29"], ["s1", "s2"]);
    const fusion = mergeAvailabilityWindows([a, b]);
    expect(fusion?.days.map((d) => d.date)).toEqual(["2026-09-27", "2026-09-28", "2026-12-28", "2026-12-29"]);
    expect(fusion?.slots.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("chaque jour est l'objet RENDU PAR LE SERVEUR, pas une copie (MD1-e : aucun prix réécrit)", () => {
    const a = reponse(["2026-09-27"]);
    const b = reponse(["2026-12-28"]);
    const fusion = mergeAvailabilityWindows([a, b]);
    expect(fusion?.days[0]).toBe(a.days[0]);
    expect(fusion?.days[1]).toBe(b.days[0]);
  });

  it("UNE fenêtre en échec (null) — la seconde — et c'est l'échec du chargement, pas un calendrier partiel", () => {
    expect(mergeAvailabilityWindows([reponse(["2026-09-27"]), null])).toBeNull();
  });

  it("UNE fenêtre sans la forme attendue — la première — et c'est l'échec du chargement", () => {
    const malformee = { venueId: "v1" } as unknown as VenueAvailabilityResponse;
    expect(mergeAvailabilityWindows([malformee, reponse(["2026-12-28"])])).toBeNull();
  });
});
