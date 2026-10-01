// Rang 29 (D321) — le module pur du calendrier du panneau de demande. Un test par mode de défaillance du point d'entrée
// (C-a à C-f) ; les attendus se DÉRIVENT (fenêtre, formateur), ils ne se tapent pas.
import type { VenueAvailabilityDayDTO } from "@zwadj/types";
import { WINDOW_DAYS } from "../components/venue/booking-request-panel";
import {
  addDays,
  dayNumber,
  focusTarget,
  initialMonth,
  isDaySelectable,
  longDate,
  moveFocus,
  windowBounds,
  windowMonths
} from "./booking-calendar";

type Status = VenueAvailabilityDayDTO["slots"][number]["status"];

function jour(date: string, ...statuts: Status[]): VenueAvailabilityDayDTO {
  return { date, isHoliday: false, slots: statuts.map((status, i) => ({ slotTemplateId: `s${i}`, status, priceCents: 1 })) };
}

/** La fenêtre réelle du panneau : `WINDOW_DAYS` jours à partir de `debut`, chacun LIBRE sauf ceux nommés. */
function fenetre(debut: string, pris: readonly string[] = []): VenueAvailabilityDayDTO[] {
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const date = addDays(debut, i);
    return jour(date, pris.includes(date) ? "BOOKED" : "AVAILABLE");
  });
}

describe("booking-calendar — les mois de la fenêtre (MD C-c)", () => {
  it("couvre la fenêtre de 182 jours mois par mois, ni plus ni moins", () => {
    const days = fenetre("2027-08-02");
    const bornes = windowBounds(days)!;
    expect(bornes).toEqual({ first: "2027-08-02", last: addDays("2027-08-02", WINDOW_DAYS - 1) });
    const mois = windowMonths(days).map((m) => `${m.year}-${String(m.month).padStart(2, "0")}`);
    expect(mois[0]).toBe(bornes.first.slice(0, 7));
    expect(mois[mois.length - 1]).toBe(bornes.last.slice(0, 7));
    expect(new Set(mois).size).toBe(mois.length);
  });

  it("les bornes viennent des jours RENDUS, quel que soit leur ordre (D49)", () => {
    expect(windowBounds([jour("2027-09-03"), jour("2027-08-02"), jour("2027-12-31")])).toEqual({
      first: "2027-08-02",
      last: "2027-12-31"
    });
    expect(windowMonths([])).toEqual([]);
  });
});

describe("booking-calendar — quel jour se choisit (MD C-a, C-b)", () => {
  it("C-a : un seul créneau AVAILABLE suffit — un jour à moitié pris reste choisissable", () => {
    expect(isDaySelectable(jour("2027-08-15", "BOOKED", "AVAILABLE"))).toBe(true);
  });

  it("C-b : aucun créneau AVAILABLE, ou un jour absent de la réponse — inactif", () => {
    expect(isDaySelectable(jour("2027-08-16", "BOOKED", "REQUESTED", "BLOCKED"))).toBe(false);
    expect(isDaySelectable(jour("2027-08-17"))).toBe(false);
    expect(isDaySelectable(undefined)).toBe(false);
  });

  it("le mois ouvert d'abord est celui du premier jour LIBRE, pas un mois tout pris", () => {
    const pris = Array.from({ length: 30 }, (_, i) => addDays("2027-08-02", i)); // tout août sauf le 01
    expect(initialMonth(fenetre("2027-08-02", pris), null)).toEqual({ year: 2027, month: 9 });
    expect(initialMonth(fenetre("2027-08-02"), "2027-11-20")).toEqual({ year: 2027, month: 11 });
  });
});

describe("booking-calendar — le clavier (MD C-e)", () => {
  const days = fenetre("2027-08-02", ["2027-08-16"]);
  const parDate = new Map(days.map((d) => [d.date, d]));
  const libre = (date: string) => isDaySelectable(parDate.get(date));
  const bornes = windowBounds(days)!;

  it("flèche droite = jour suivant de gauche à droite, jour PRÉCÉDENT en arabe (la grille se lit à l'envers)", () => {
    expect(moveFocus("2027-08-10", "ArrowRight", false, libre, bornes)).toBe("2027-08-11");
    expect(moveFocus("2027-08-10", "ArrowRight", true, libre, bornes)).toBe("2027-08-09");
    expect(moveFocus("2027-08-10", "ArrowLeft", true, libre, bornes)).toBe("2027-08-11");
  });

  it("une date inactive est SAUTÉE dans le sens du mouvement", () => {
    expect(moveFocus("2027-08-15", "ArrowRight", false, libre, bornes)).toBe("2027-08-17");
    expect(moveFocus("2027-08-09", "ArrowDown", false, libre, bornes)).toBe("2027-08-23");
  });

  it("rien hors de la fenêtre : au premier jour, reculer ne bouge pas", () => {
    expect(moveFocus(bornes.first, "ArrowLeft", false, libre, bornes)).toBeNull();
    expect(moveFocus(bornes.last, "ArrowRight", false, libre, bornes)).toBeNull();
  });

  it("Début / Fin : la ligne commence DIMANCHE et finit samedi (D56)", () => {
    // 2027-08-11 est un mercredi ; sa ligne va du dimanche 08 au samedi 14.
    expect(moveFocus("2027-08-11", "Home", false, libre, bornes)).toBe("2027-08-08");
    expect(moveFocus("2027-08-11", "End", false, libre, bornes)).toBe("2027-08-14");
  });

  it("Page suivante : premier jour libre du mois d'après", () => {
    expect(moveFocus("2027-08-11", "PageDown", false, libre, bornes)).toBe("2027-09-01");
    expect(moveFocus("2027-09-11", "PageUp", false, libre, bornes)).toBe("2027-08-02");
  });

  it("l'arrêt de tabulation : le jour vu s'il est libre dans ce mois, sinon le premier jour libre", () => {
    expect(focusTarget({ year: 2027, month: 8 }, "2027-08-20", libre)).toBe("2027-08-20");
    expect(focusTarget({ year: 2027, month: 8 }, "2027-08-16", libre)).toBe("2027-08-02");
    expect(focusTarget({ year: 2027, month: 8 }, null, libre)).toBe("2027-08-02");
  });
});

describe("booking-calendar — ce que lit un lecteur d'écran (MD C-f)", () => {
  it.each(["fr", "ar"])("%s : la date longue CONTIENT le numéro affiché (WCAG 2.5.3)", (locale) => {
    const long = longDate("2027-08-15", locale);
    expect(long.includes(dayNumber("2027-08-15", locale))).toBe(true);
    // Elle nomme le mois et l'année, pas seulement un chiffre.
    expect(long.length).toBeGreaterThan(dayNumber("2027-08-15", locale).length + 8);
  });
});
