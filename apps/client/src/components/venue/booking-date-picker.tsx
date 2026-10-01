"use client";

// Rang 29 (D321) — le CALENDRIER du panneau de demande : une vue par mois à la place des 182 boutons (D317).
//
// ── Ce que ce composant fait, et ce qu'il ne fait pas ─────────────────────────────────────────────────────────────────
// Il AFFICHE les jours déjà chargés par le panneau (les fenêtres découpées de D316, inchangées) et dit quel JOUR le
// visiteur regarde. Il ne charge rien, ne lit aucun prix, ne choisit aucun créneau : le créneau, son prix et leur
// transport vers le calcul restent dans le panneau (borne de D316). Les décisions — mois de la fenêtre, jour
// choisissable, déplacement au clavier — vivent dans `lib/booking-calendar.ts`, module pur (D187, D205).
//
// ── Accessibilité ──────────────────────────────────────────────────────────────────────────────────────────────────────
// - Une grille (`role="grid"`) nommée par le mois affiché, annoncé à chaque changement (`aria-live`) ;
// - UN arrêt de tabulation dans la grille (tabulation itinérante), les flèches déplacent — à l'envers en arabe, où la
//   grille se lit de droite à gauche ; Début/Fin, Page préc./suiv. ;
// - chaque jour se nomme par sa date ENTIÈRE et son état (« dimanche 15 août 2027, disponible ») — un « 15 » seul ne dit
//   rien à qui ne voit pas la grille ; le numéro visible est contenu dans le nom (WCAG 2.5.3).
// - Les classes `cal-*` sont celles du calendrier de disponibilité (`packages/ui/styles.css`) : propriétés logiques, la
//   grille se remplit de droite à gauche en arabe d'elle-même, sept colonnes de largeur fixe — mobile d'abord.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MonthNextIcon, MonthPrevIcon } from "@zwadj/ui";
import type { VenueAvailabilityDayDTO } from "@zwadj/types";
import { compareMonths, monthGrid, monthLabel, shiftMonth, weekdayHeaders, type MonthCursor } from "../../lib/calendar";
import {
  GRID_KEYS,
  dayNumber,
  focusTarget,
  initialMonth,
  isDaySelectable,
  longDate,
  monthOf,
  moveFocus,
  windowBounds,
  windowMonths,
  type GridKey
} from "../../lib/booking-calendar";

export interface BookingDatePickerProps {
  /** Les jours de la fenêtre, TELS QUE le serveur les a rendus (le panneau les a réunis). */
  days: VenueAvailabilityDayDTO[];
  /** Le jour regardé — celui dont le panneau montre les créneaux. */
  selected: string | null;
  onSelect: (date: string) => void;
}

export function BookingDatePicker({ days, selected, onSelect }: BookingDatePickerProps) {
  const t = useTranslations("venueDetail.booking");
  const tCal = useTranslations("venueDetail.calendar");
  const locale = useLocale();
  const rtl = locale === "ar";
  const titreId = useId();

  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const months = useMemo(() => windowMonths(days), [days]);
  const bounds = useMemo(() => windowBounds(days), [days]);
  const libre = (date: string) => isDaySelectable(byDate.get(date));

  const [cursor, setCursor] = useState<MonthCursor | null>(() => initialMonth(days, selected));
  const [focused, setFocused] = useState<string | null>(null);
  const boutons = useRef(new Map<string, HTMLButtonElement>());
  const aFocaliser = useRef<string | null>(null);

  // Le mois affiché reste DANS la fenêtre, même si les jours rechargés (409 du panneau) l'ont déplacée (MD C-c).
  const premier = months[0];
  const dernier = months[months.length - 1];
  const dansFenetre = (m: MonthCursor | null): m is MonthCursor =>
    m !== null && premier !== undefined && dernier !== undefined && compareMonths(m, premier) >= 0 && compareMonths(m, dernier) <= 0;
  const shown = dansFenetre(cursor) ? cursor : initialMonth(days, selected);

  // Le focus suit le clavier APRÈS le rendu : la cible peut être dans un mois qui vient d'apparaître.
  useEffect(() => {
    const cible = aFocaliser.current;
    if (cible === null) return;
    aFocaliser.current = null;
    boutons.current.get(cible)?.focus();
  });

  if (shown === null || premier === undefined || dernier === undefined || bounds === null) return null;

  const memeMois = (date: string | null) => date !== null && compareMonths(monthOf(date), shown) === 0;
  const arret = memeMois(focused) && libre(focused!) ? focused : focusTarget(shown, selected, libre);
  const grille = monthGrid(shown.year, shown.month);
  const courts = weekdayHeaders(locale, "short");
  const longs = weekdayHeaders(locale, "long");

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    if (bounds === null || !(GRID_KEYS as readonly string[]).includes(event.key)) return;
    event.preventDefault();
    const cible = moveFocus(date, event.key as GridKey, rtl, libre, bounds);
    if (cible === null) return;
    aFocaliser.current = cible;
    setFocused(cible);
    if (!memeMois(cible)) setCursor(monthOf(cible));
  }

  return (
    <div className="booking-calendar">
      <div className="cal-head">
        {/* Le chevron est décoratif ; le NOM ACCESSIBLE dit ce que fait le bouton (patron du calendrier de disponibilité). */}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setCursor(shiftMonth(shown, -1))}
          disabled={compareMonths(shown, premier) <= 0}
          aria-label={tCal("previous")}
        >
          <MonthPrevIcon />
        </button>
        {/* `aria-live` : au changement de mois, un lecteur d'écran entend où il a atterri. */}
        <strong id={titreId} aria-live="polite">
          {monthLabel(shown, locale)}
        </strong>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setCursor(shiftMonth(shown, 1))}
          disabled={compareMonths(shown, dernier) >= 0}
          aria-label={tCal("next")}
        >
          <MonthNextIcon />
        </button>
      </div>

      <table role="grid" className="cal-grid" aria-labelledby={titreId}>
        <thead>
          <tr>
            {courts.map((court, i) => (
              <th key={court} scope="col">
                <span aria-hidden="true">{court}</span>
                <span className="sr-only">{longs[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: grille.length / 7 }, (_, semaine) => (
            <tr key={semaine}>
              {grille.slice(semaine * 7, semaine * 7 + 7).map((cell, i) => {
                if (cell.date === null) return <td key={`vide-${i}`} className="cal-pad" />;
                const date = cell.date;
                const ok = libre(date);
                return (
                  <td key={date} className={cell.isWeekend ? "cal-cell is-weekend" : "cal-cell"}>
                    <button
                      ref={(el) => {
                        if (el === null) boutons.current.delete(date);
                        else boutons.current.set(date, el);
                      }}
                      type="button"
                      className={selected === date ? "cal-day is-selected" : "cal-day"}
                      // Une date sans créneau libre RESTE dans la grille, inactive : voir qu'elle est prise aide à en
                      // choisir une autre (principe 3 du panneau).
                      disabled={!ok}
                      aria-pressed={selected === date}
                      tabIndex={date === arret ? 0 : -1}
                      aria-label={t(ok ? "dayFree" : "dayFull", { date: longDate(date, locale) })}
                      onClick={() => {
                        setFocused(date);
                        onSelect(date);
                      }}
                      onKeyDown={(event) => onKeyDown(event, date)}
                    >
                      <span className="cal-num">{dayNumber(date, locale)}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
