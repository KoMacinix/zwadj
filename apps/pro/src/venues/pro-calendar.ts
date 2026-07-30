// Grille de calendrier — Lot B6 (côté PRO), D56.
//
// ⚠ COPIE ASSUMÉE de `apps/client/src/lib/calendar.ts`. Les deux apps sont des
// bundles séparés : partager ce module exigerait de le remonter dans un paquet
// (`@zwadj/types` n'a pas de place pour une grille d'affichage, `@zwadj/ui` n'a
// pas de logique). Le coût du partage dépasse aujourd'hui celui de la copie —
// mais la DÉCISION, elle, n'est pas dupliquée : `WEEK_START_DAY` vaut 0 ici
// pour la raison écrite ci-dessous, et si elle change, elle change aux deux
// endroits. Les deux fichiers sont testés séparément, ce qui rend une dérive
// visible immédiatement.
//
// ── La décision qui gouverne ce module (D56) ─────────────────────────────────
// En Algérie, le repos hebdomadaire est **vendredi-samedi**, et le premier jour
// de travail et d'école est le **DIMANCHE**. La semaine d'un calendrier
// algérien commence donc là : dimanche → jeudi ouvrés, puis vendredi-samedi qui
// la CLÔTURENT.
//
// ⚠ CLDR/`Intl` n'est PAS d'accord, et l'écart est délibéré :
//   Intl.Locale("ar-DZ").getWeekInfo() → { firstDay: 6 (samedi), weekend: [5, 6] }
//   Intl.Locale("fr-FR").getWeekInfo() → { firstDay: 1 (lundi),  weekend: [6, 7] }
// CLDR décrit une convention d'affichage ; on suit l'usage réel, tranché par
// Ko. Ne PAS « corriger » cette constante vers `getWeekInfo()` : le week-end
// se retrouverait en TÊTE de grille au lieu de la clore, ce qui est
// exactement à l'envers de la façon dont une semaine se lit en Algérie.
//
// La langue de l'interface, elle, ne décide RIEN : un Algérois qui lit le
// français vit toujours en Algérie, et la locale `fr` du projet répondrait
// « lundi ». La convention est FIGÉE ici, comme le fuseau l'est dans
// `@zwadj/types` (D48) — même raison, même endroit unique.
//
// ⚠ Deux numérotations de jours coexistent dans la plateforme :
//   - `Date.getUTCDay()` et le contrat API : 0 = dimanche … 6 = samedi ;
//   - `Intl` weekInfo (ISO) : 1 = lundi … 7 = dimanche.
// Vendredi vaut 5 et samedi 6 dans les deux ; dimanche vaut 0 en JS et 7 en
// ISO. Tout ce module raisonne en numérotation JS (0 = dimanche).

/** Dimanche, en numérotation JS. Premier jour ouvré et d'école en Algérie,
 *  donc tête de grille. */
export const WEEK_START_DAY = 0;

/** Vendredi et samedi, en numérotation JS. Le repos hebdomadaire algérien — et
 *  le PIC de la demande en salle des fêtes, pas un creux à griser. Avec un
 *  départ dimanche, ces deux jours ferment naturellement chaque ligne. */
export const WEEKEND_DAYS: readonly number[] = [5, 6];

const DAY_MS = 86_400_000;

export const isWeekend = (dayOfWeek: number): boolean => WEEKEND_DAYS.includes(dayOfWeek);

/** Décalage d'une date par rapport au début de sa semaine algérienne : 0 pour
 *  un dimanche, … 5 pour un vendredi, 6 pour un samedi. */
export function offsetInWeek(dayOfWeek: number): number {
  return (dayOfWeek - WEEK_START_DAY + 7) % 7;
}

/** Les sept en-têtes de colonnes, dans l'ordre ALGÉRIEN, traduits par `Intl`
 *  dans la langue demandée. On ne stocke pas sept clés i18n de plus : ce sont
 *  des libellés que la plateforme connaît déjà, et deux jeux de noms de jours
 *  finiraient par diverger. */
export function weekdayHeaders(locale: string, format: "short" | "long" = "short"): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: "UTC" });
  // 2026-11-01 est un DIMANCHE (jour 0) : ancre de la numérotation JS, et
  // aussi le premier jour de la grille algérienne.
  return Array.from({ length: 7 }, (_, column) => {
    const dayOfWeek = (WEEK_START_DAY + column) % 7;
    return fmt.format(new Date(Date.UTC(2026, 10, 1 + dayOfWeek)));
  });
}

export interface MonthCell {
  /** `null` = case de remplissage avant le 1er ou après le dernier jour. */
  date: string | null;
  dayOfWeek: number;
  isWeekend: boolean;
}

/** Grille d'un mois : toujours des semaines COMPLÈTES de sept cases, remplies
 *  de `null` aux extrémités. Une grille à géométrie variable ferait sauter les
 *  colonnes d'un mois à l'autre et on ne saurait plus lire une date. */
export function monthGrid(year: number, month: number): MonthCell[] {
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = offsetInWeek(firstDayOfWeek);

  const cells: MonthCell[] = [];
  for (let i = 0; i < lead; i += 1) {
    const dayOfWeek = (WEEK_START_DAY + i) % 7;
    cells.push({ date: null, dayOfWeek, isWeekend: isWeekend(dayOfWeek) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dayOfWeek,
      isWeekend: isWeekend(dayOfWeek)
    });
  }
  while (cells.length % 7 !== 0) {
    const dayOfWeek = (WEEK_START_DAY + (cells.length % 7)) % 7;
    cells.push({ date: null, dayOfWeek, isWeekend: isWeekend(dayOfWeek) });
  }
  return cells;
}

/** Bornes civiles d'un mois, telles que l'endpoint de disponibilité les
 *  attend. 31 jours au plus : très en dessous du plafond de 92. */
export function monthWindow(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

export interface MonthCursor {
  year: number;
  month: number;
}

export const shiftMonth = (cursor: MonthCursor, delta: number): MonthCursor => {
  const target = cursor.month - 1 + delta;
  const year = cursor.year + Math.floor(target / 12);
  return { year, month: (((target % 12) + 12) % 12) + 1 };
};

export const compareMonths = (a: MonthCursor, b: MonthCursor): number =>
  a.year - b.year || a.month - b.month;

/** Mois courant à Alger (UTC+1). Seul endroit du module où l'heure intervient,
 *  et `nowMs` est toujours fourni : aucune horloge cachée. */
export function currentMonth(nowMs: number): MonthCursor {
  const shifted = new Date(nowMs + 60 * 60_000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/** Nom du mois dans la langue demandée, via `Intl` — même raison que pour les
 *  jours : la plateforme les connaît déjà. */
export function monthLabel(cursor: MonthCursor, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(cursor.year, cursor.month - 1, 1))
  );
}

/** Un jour est-il PASSÉ à Alger ? Les jours passés existent dans la grille
 *  (sinon les colonnes sauteraient) mais ne sont pas réservables — et l'API,
 *  qui écrête (D49), ne les renvoie tout simplement pas. */
export function isPastDate(date: string, nowMs: number): boolean {
  const today = new Date(nowMs + 60 * 60_000).toISOString().slice(0, 10);
  return date < today;
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
