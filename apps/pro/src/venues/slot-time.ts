// Conversion heure↔minutes des créneaux — Lot B4b, D52.
//
// ── Le piège que ce module existe pour fermer ────────────────────────────────
// Un `<input type="time">` plafonne à 23:59. Il ne PEUT PAS exprimer « 02h du
// lendemain », donc il ne peut pas exprimer la soirée de mariage la plus
// courante du pays — 20h→02h, `startMinutes: 1200`, `endMinutes: 1560`. C'est
// exactement l'erreur commise en B1, où une validation Zod avait plafonné
// `endMinutes` à 1440 : elle remonterait ici, une couche plus haut, si la
// saisie était prise au pied de la lettre.
//
// D52 — la fin est DÉDUITE, jamais saisie au-delà de 24h : si l'heure de fin
// est antérieure ou égale à l'heure de début, le créneau franchit minuit et on
// ajoute 1440. « 20:00 → 02:00 » ne veut rien dire d'autre pour un humain, et
// l'écran le DIT en clair plutôt que de le supposer.
//
// ⚠ Rétrécissement ASSUMÉ du domaine : la saisie ne peut produire au plus que
// `start + 1439`, donc 2879 minutes, là où le CHECK
// `slot_templates_minutes_valid` autorise 2880. Un créneau de 48 h n'est pas
// une fête, c'est une saisie accidentelle. Le schéma reste plus permissif que
// l'écran — jamais l'inverse, qui est la faute de B1.

import { formatWallClock } from "@zwadj/types";

/** Minutes absolues → horloge murale `HH:mm`. 1560 (02h du lendemain) → "02:00".
 *
 *  D57 — délègue au formateur PARTAGÉ de `@zwadj/types` : l'Algérie n'utilise
 *  que le format 24 h, et une seconde implémentation serait une seconde
 *  occasion de laisser passer un AM/PM. */
export const minutesToClock = formatWallClock;

/** `HH:mm` → minutes depuis minuit, ou `null` si la forme est invalide. */
export function clockToMinutes(clock: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(clock)) return null;
  const h = Number(clock.slice(0, 2));
  const m = Number(clock.slice(3, 5));
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** D52 — fin absolue déduite de deux horloges murales. Fin ≤ début ⇒ lendemain. */
export function deriveEndMinutes(startMinutes: number, endWallMinutes: number): number {
  return endWallMinutes <= startMinutes ? endWallMinutes + 1440 : endWallMinutes;
}

/** Le créneau déborde-t-il sur le lendemain ? C'est ce que l'écran annonce au
 *  pro, pour qu'aucune déduction ne reste implicite. */
export function crossesMidnight(endMinutes: number): boolean {
  return endMinutes > 1440;
}

/** Durée en minutes, toujours positive (le schéma garantit fin > début). */
export function slotDurationMinutes(startMinutes: number, endMinutes: number): number {
  return endMinutes - startMinutes;
}
