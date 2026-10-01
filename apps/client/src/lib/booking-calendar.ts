// Rang 29 (D321) — le calendrier du panneau de demande, en MODULE PUR.
//
// ⚠ LE DÉFAUT QU'IL FERME. Le panneau listait les six mois d'un coup : un bouton par jour et par créneau, 182 boutons
// d'affilée pour une salle à un créneau — une fiche d'environ 14 500 px (D317). Le calendrier montre UN mois, et navigue
// dans la MÊME fenêtre de 182 jours (`WINDOW_DAYS`, inchangée).
//
// ⚠ POURQUOI UN MODULE PUR (D187, D205) : ce qui DÉCIDE — quels mois, quel jour se choisit, où va le focus au clavier —
// se rejoue ici en millisecondes, sans navigateur ni réseau, donc se neutralise à chaque passage. Le composant ne fait
// qu'afficher et appeler.
//
// ⛔ BORNE DE D316, INCHANGÉE : ce module ne lit AUCUN prix et n'en produit aucun. Il dit quel JOUR se choisit ; le
// créneau, son prix et leur transport vers le calcul restent dans le panneau, à la ligne `setChosen` qui n'a pas bougé.
import type { VenueAvailabilityDayDTO } from "@zwadj/types";
import { compareMonths, monthGrid, offsetInWeek, shiftMonth, type MonthCursor } from "./calendar";

const DAY_MS = 86_400_000;

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function monthOf(date: string): MonthCursor {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

/** Bornes de la fenêtre : le premier et le dernier jour RENDUS par le serveur — jamais ceux demandés (D49 : l'API
 *  écrête). `null` si la réponse ne porte aucun jour. */
export function windowBounds(days: ReadonlyArray<Pick<VenueAvailabilityDayDTO, "date">>): { first: string; last: string } | null {
  if (days.length === 0) return null;
  let first = days[0]!.date;
  let last = first;
  for (const day of days) {
    if (day.date < first) first = day.date;
    if (day.date > last) last = day.date;
  }
  return { first, last };
}

/** Les mois que la fenêtre couvre, du premier au dernier — la navigation n'en sort pas (MD C-c). */
export function windowMonths(days: ReadonlyArray<Pick<VenueAvailabilityDayDTO, "date">>): MonthCursor[] {
  const bounds = windowBounds(days);
  if (bounds === null) return [];
  const months: MonthCursor[] = [];
  for (let m = monthOf(bounds.first); compareMonths(m, monthOf(bounds.last)) <= 0; m = shiftMonth(m, 1)) months.push(m);
  return months;
}

/** Un jour se CHOISIT s'il porte au moins un créneau `AVAILABLE` (MD C-a, C-b). Un jour absent de la réponse — passé, hors
 *  fenêtre — ne se choisit pas. Un jour dont TOUS les créneaux sont pris reste affiché, inactif : voir qu'une date est
 *  occupée aide à en choisir une autre (principe 3 du panneau). */
export function isDaySelectable(day: Pick<VenueAvailabilityDayDTO, "slots"> | undefined): boolean {
  return day !== undefined && day.slots.some((slot) => slot.status === "AVAILABLE");
}

/** Mois ouvert d'abord : celui du jour déjà choisi s'il y en a un, sinon celui du PREMIER jour choisissable — un visiteur
 *  ne doit pas tomber sur un mois sans date libre alors que le suivant en a. À défaut, le premier mois de la fenêtre. */
export function initialMonth(days: ReadonlyArray<VenueAvailabilityDayDTO>, selected: string | null): MonthCursor | null {
  if (selected !== null) return monthOf(selected);
  const libre = days.find((day) => isDaySelectable(day));
  if (libre !== undefined) return monthOf(libre.date);
  const bounds = windowBounds(days);
  return bounds === null ? null : monthOf(bounds.first);
}

/** Le jour qui porte l'arrêt de tabulation du mois affiché (tabulation itinérante, motif « date picker » de l'APG) : le
 *  jour vu s'il est dans ce mois et choisissable, sinon le premier jour choisissable du mois, sinon aucun (MD C-e). */
export function focusTarget(
  cursor: MonthCursor,
  selected: string | null,
  selectable: (date: string) => boolean
): string | null {
  const dates = monthGrid(cursor.year, cursor.month).flatMap((cell) => (cell.date === null ? [] : [cell.date]));
  if (selected !== null && dates.includes(selected) && selectable(selected)) return selected;
  return dates.find(selectable) ?? null;
}

export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

export const GRID_KEYS: readonly GridKey[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

/** Où va le focus quand on presse `key` sur `from` (MD C-e).
 *
 *  - Flèches : un jour (gauche/droite), une semaine (haut/bas). ⚠ **EN ARABE, LA GRILLE SE LIT DE DROITE À GAUCHE** : la
 *    flèche DROITE recule d'un jour, la gauche avance — sinon les flèches iraient à l'envers de ce que l'œil voit.
 *  - Début / Fin : premier / dernier jour choisissable de la LIGNE (la semaine algérienne, dimanche → samedi, D56).
 *  - Page préc. / suiv. : premier jour choisissable du mois précédent / suivant.
 *  Un jour inactif est SAUTÉ dans le sens du mouvement ; rien au-delà des bornes de la fenêtre. `null` = le focus ne bouge
 *  pas (aucune cible choisissable). */
export function moveFocus(
  from: string,
  key: GridKey,
  rtl: boolean,
  selectable: (date: string) => boolean,
  bounds: { first: string; last: string }
): string | null {
  const within = (date: string) => date >= bounds.first && date <= bounds.last;
  const walk = (start: string, step: number): string | null => {
    for (let date = start; within(date); date = addDays(date, step)) if (selectable(date)) return date;
    return null;
  };
  const dow = new Date(`${from}T00:00:00Z`).getUTCDay();
  const debutLigne = addDays(from, -offsetInWeek(dow));
  switch (key) {
    case "ArrowRight":
      return walk(addDays(from, rtl ? -1 : 1), rtl ? -1 : 1);
    case "ArrowLeft":
      return walk(addDays(from, rtl ? 1 : -1), rtl ? 1 : -1);
    case "ArrowDown":
      return walk(addDays(from, 7), 7);
    case "ArrowUp":
      return walk(addDays(from, -7), -7);
    case "Home": {
      for (let i = 0; i < 7; i += 1) {
        const date = addDays(debutLigne, i);
        if (within(date) && selectable(date)) return date;
      }
      return null;
    }
    case "End": {
      for (let i = 6; i >= 0; i -= 1) {
        const date = addDays(debutLigne, i);
        if (within(date) && selectable(date)) return date;
      }
      return null;
    }
    case "PageUp":
    case "PageDown": {
      const cible = shiftMonth(monthOf(from), key === "PageDown" ? 1 : -1);
      const dates = monthGrid(cible.year, cible.month).flatMap((cell) => (cell.date === null ? [] : [cell.date]));
      return dates.find((date) => within(date) && selectable(date)) ?? null;
    }
  }
}

/** Numéro du jour ET date longue, par le MÊME formateur : le nom accessible d'un jour contient toujours son texte visible
 *  (WCAG 2.5.3), quelle que soit la numérotation de la locale. `Intl` est permis pour les DATES (D57 ne l'interdit que
 *  pour l'heure) ; `UTC` parce que la date civile est déjà celle d'Alger (D48). */
export function dayNumber(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(Date.parse(`${date}T00:00:00Z`));
}

export function longDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(Date.parse(`${date}T00:00:00Z`));
}
