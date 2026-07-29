// Arithmétique des dates civiles — Lot B3, D48/D49.
//
// Module PUR : aucune horloge, aucun accès base. `Date.now()` est appelé UNE
// fois par requête, par le service, qui passe `nowMs` ici. Deux appels à des
// instants différents pourraient tomber de part et d'autre de minuit et
// produire un écrêtage incohérent entre la borne basse et l'horizon.
//
// ── Pourquoi une « date civile » plutôt qu'un Date ────────────────────────────
// Un `Date` porte un instant, pas une date. « Le 14 août » n'est pas un
// instant : c'est un triplet (année, mois, jour) qui ne devient un instant
// qu'en lui appliquant un fuseau. Confondre les deux, c'est laisser le fuseau
// du SERVEUR décider en silence — et un mariage du vendredi soir devient un
// jeudi. Tout ce qui suit manipule le triplet, et ne le convertit en instant
// qu'au dernier moment, avec le décalage d'Alger et lui seul.
import { ALGERIA_UTC_OFFSET_MINUTES, AVAILABILITY_MAX_WINDOW_DAYS, BOOKING_HORIZON_MONTHS } from "@zwadj/types";
import type { CalendarDay } from "./pricing-engine";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const OFFSET_MS = ALGERIA_UTC_OFFSET_MINUTES * MINUTE_MS;

export interface CivilDate {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

export function parseCivilDate(value: string): CivilDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)), day: Number(value.slice(8, 10)) };
  return isReal(date) ? date : null;
}

/** `2026-02-31` a la bonne forme et n'existe pas. Aller-retour : la date
 *  reconstruite doit rendre les mêmes composantes. */
function isReal(date: CivilDate): boolean {
  const probe = new Date(civilUtcMs(date));
  return (
    probe.getUTCFullYear() === date.year && probe.getUTCMonth() === date.month - 1 && probe.getUTCDate() === date.day
  );
}

export function formatCivilDate(date: CivilDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

/** Minuit UTC de la date civile. C'est le repère des colonnes `@db.Date`
 *  (`Holiday.date`), que Prisma rend à minuit UTC — vérifié en base. Ne JAMAIS
 *  utiliser `civilDayStartMs` pour les interroger : il vaut 23h00 UTC la
 *  veille et décalerait la fenêtre d'un jour à ses deux extrémités. */
export function civilUtcMs(date: CivilDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

/** Instant réel de minuit à Alger. C'est le seul point du dépôt où une date
 *  civile devient un instant. */
export function civilDayStartMs(date: CivilDate): number {
  return civilUtcMs(date) - OFFSET_MS;
}

/** Clé de comparaison d'un férié, construite avec les getters UTC : la colonne
 *  est une `@db.Date`, donc un instant à minuit UTC. */
export function holidayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Le jour de la semaine vient de la date CIVILE. `getDay()` sur un `Date`
 *  local choisirait le fuseau du serveur en silence. */
export function toCalendarDay(date: CivilDate, holidays: ReadonlySet<string>): CalendarDay {
  return {
    month: date.month,
    dayOfWeek: new Date(civilUtcMs(date)).getUTCDay(),
    isHoliday: holidays.has(formatCivilDate(date))
  };
}

/** Énumération INCLUSIVE des deux bornes : `from === to` rend un jour. */
export function enumerateDays(from: CivilDate, to: CivilDate): CivilDate[] {
  const days: CivilDate[] = [];
  const last = civilUtcMs(to);
  for (let ms = civilUtcMs(from); ms <= last; ms += DAY_MS) {
    const probe = new Date(ms);
    days.push({ year: probe.getUTCFullYear(), month: probe.getUTCMonth() + 1, day: probe.getUTCDate() });
  }
  return days;
}

/** Ajout de mois avec ÉCRÊTAGE du jour : 31 août + 18 mois = 28 février, pas
 *  un 31 février qui déborderait silencieusement sur mars. */
export function addMonthsCivil(date: CivilDate, months: number): CivilDate {
  const target = date.month - 1 + months;
  const year = date.year + Math.floor(target / 12);
  const month = ((target % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { year, month: month + 1, day: Math.min(date.day, lastDay) };
}

/** Date civile d'Alger à l'instant `nowMs`. */
export function civilTodayAt(nowMs: number): CivilDate {
  const shifted = new Date(nowMs + OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export interface ClampedWindow {
  from: CivilDate;
  to: CivilDate;
  /** La fenêtre demandée est entièrement hors bornes (tout au passé, ou tout
   *  au-delà de l'horizon) : zéro jour à rendre, mais 200 quand même. */
  empty: boolean;
}

/** D49 — ÉCRÊTAGE, jamais rejet. Zod a déjà refusé ce qui est déterministe
 *  (forme, date irréelle, ordre, largeur) ; ce qui reste dépend de l'instant de
 *  la requête, et un 400 sur cette frontière serait intermittent : un
 *  navigateur au Canada ne calcule pas le même « aujourd'hui » qu'Alger.
 *
 *  L'écrêtage ne fait que RÉTRÉCIR, il ne peut donc jamais violer la largeur
 *  maximale déjà validée. */
export function clampWindow(from: CivilDate, to: CivilDate, nowMs: number): ClampedWindow {
  const today = civilTodayAt(nowMs);
  const horizon = addMonthsCivil(today, BOOKING_HORIZON_MONTHS);

  const effectiveFrom = civilUtcMs(from) < civilUtcMs(today) ? today : from;
  const effectiveTo = civilUtcMs(to) > civilUtcMs(horizon) ? horizon : to;

  return {
    from: effectiveFrom,
    to: effectiveTo,
    empty: civilUtcMs(effectiveFrom) > civilUtcMs(effectiveTo)
  };
}

/** D51 — date-heure civile LOCALE (`YYYY-MM-DDTHH:mm`) → instant réel. */
export function civilDateTimeToMs(value: string): number {
  const date = parseCivilDate(value.slice(0, 10));
  if (!date) throw new Error(`date civile irréelle : ${value}`);
  const minutes = Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
  return civilDayStartMs(date) + minutes * MINUTE_MS;
}

/** D51 — SYMÉTRIE : l'instant stocké redevient le repère civil que le pro a
 *  saisi. Le front pro ne reconvertit rien, donc n'héberge aucune seconde
 *  décision de fuseau. */
export function msToCivilDateTime(ms: number): string {
  const shifted = new Date(ms + OFFSET_MS);
  const date = {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
  return `${formatCivilDate(date)}T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

export { AVAILABILITY_MAX_WINDOW_DAYS };
