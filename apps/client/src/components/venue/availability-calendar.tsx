"use client";

// Calendrier de disponibilité et de prix d'une salle — Lot B5, D56.
//
// ── Client, pas serveur ──────────────────────────────────────────────────────
// La fiche salle est rendue côté serveur (A8), mais ce calendrier NAVIGUE de
// mois en mois : il doit donc vivre dans le navigateur. Il ne passe pas par
// `@zwadj/api-client` — la route est anonyme, et y traîner le mutex de
// rafraîchissement n'aurait aucun sens.
//
// ── Ce que le calendrier DIT, et pourquoi ────────────────────────────────────
// Quatre états viennent du moteur (B3) : AVAILABLE, REQUESTED, BOOKED,
// BLOCKED. On les distingue tous les quatre, y compris REQUESTED — une demande
// ne verrouille rien, mais laisser croire à une case libre puis annoncer un
// concurrent au moment du devis est la pire surprise d'un parcours de mariage.
//
// La case du mois montre le prix MINIMUM du jour ; le détail par créneau
// apparaît à la sélection. Un jour à plusieurs créneaux n'a pas « un » prix.
//
// ── Bornes ───────────────────────────────────────────────────────────────────
// L'API ÉCRÊTE le passé et l'horizon 18 mois (D49) au lieu de refuser : les
// bornes affichées viennent de la RÉPONSE, jamais de la demande. Les jours hors
// réponse restent dans la grille — les retirer ferait sauter les colonnes — mais
// ne sont pas sélectionnables.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatSlotRange } from "@zwadj/types";
import { MonthNextIcon, MonthPrevIcon } from "@zwadj/ui";
import type { VenueAvailabilityDayDTO, VenueAvailabilityResponse } from "@zwadj/types";
import { getVenueAvailability } from "../../lib/api";
import {
  compareMonths,
  currentMonth,
  isPastDate,
  monthGrid,
  monthLabel,
  monthWindow,
  shiftMonth,
  weekdayHeaders,
  type MonthCursor
} from "../../lib/calendar";

/** D46 — on ne réserve pas au-delà de 18 mois. Borne de navigation. */
const HORIZON_MONTHS = 18;

const formatPrice = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { maximumFractionDigits: 0 }).format(cents / 100);

export function AvailabilityCalendar({ slug }: { slug: string }) {
  const t = useTranslations("venueDetail.calendar");
  const locale = useLocale();

  // Horloge lue UNE fois : la relire à chaque rendu ferait bouger « aujourd'hui »
  // au milieu d'une session et rendrait le passé instable.
  const nowRef = useRef(Date.now());
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth(nowRef.current));
  const [data, setData] = useState<VenueAvailabilityResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<string | null>(null);

  const firstMonth = useMemo(() => currentMonth(nowRef.current), []);
  const lastMonth = useMemo(() => shiftMonth(firstMonth, HORIZON_MONTHS), [firstMonth]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setSelected(null);
    const { from, to } = monthWindow(cursor.year, cursor.month);
    void (async () => {
      const response = await getVenueAvailability(slug, from, to);
      if (cancelled) return;
      setData(response);
      setState(response ? "ready" : "error");
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, VenueAvailabilityDayDTO>();
    for (const day of data?.days ?? []) map.set(day.date, day);
    return map;
  }, [data]);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const headers = useMemo(() => weekdayHeaders(locale), [locale]);
  const slotsById = useMemo(() => new Map((data?.slots ?? []).map((s) => [s.id, s])), [data]);

  const canGoBack = compareMonths(cursor, firstMonth) > 0;
  const canGoForward = compareMonths(cursor, lastMonth) < 0;

  /** Prix d'appel du jour : le plus bas parmi les créneaux RÉELLEMENT libres.
   *  Afficher le minimum tous statuts confondus annoncerait un prix que le
   *  visiteur ne peut pas obtenir. */
  function dayPrice(day: VenueAvailabilityDayDTO | undefined): number | null {
    const open = (day?.slots ?? []).filter((s) => s.status === "AVAILABLE");
    return open.length === 0 ? null : Math.min(...open.map((s) => s.priceCents));
  }

  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <section className="availability" aria-labelledby="availability-title">
      <h2 id="availability-title">{t("title")}</h2>

      <div className="cal-head">
        {/* ⚠ Le libellé passe en `aria-label` : le chevron est décoratif, mais le
            NOM ACCESSIBLE reste « Mois précédent » — sinon le bouton s'annonce
            « bouton » et plus personne ne sait ce qu'il fait. */}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setCursor(shiftMonth(cursor, -1))}
          disabled={!canGoBack}
          aria-label={t("previous")}
        >
          <MonthPrevIcon />
        </button>
        {/* `aria-live` : au changement de mois, un lecteur d'écran doit
            entendre où il a atterri — la grille change sans que le focus bouge. */}
        <strong aria-live="polite">{monthLabel(cursor, locale)}</strong>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
          disabled={!canGoForward}
          aria-label={t("next")}
        >
          <MonthNextIcon />
        </button>
      </div>

      {state === "error" && (
        <p className="alert alert-error" role="alert">
          {t("error")}
        </p>
      )}

      <table className="cal-grid">
        <caption className="sr-only">{t("caption", { month: monthLabel(cursor, locale) })}</caption>
        <thead>
          <tr>
            {headers.map((label) => (
              <th key={label} scope="col" abbr={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: grid.length / 7 }, (_, week) => (
            <tr key={week}>
              {grid.slice(week * 7, week * 7 + 7).map((cell, i) => {
                if (cell.date === null) return <td key={`pad-${i}`} className="cal-pad" />;
                const day = byDate.get(cell.date);
                const past = isPastDate(cell.date, nowRef.current);
                const price = dayPrice(day);
                const selectable = !past && price !== null;
                return (
                  <td key={cell.date} className={cell.isWeekend ? "cal-cell is-weekend" : "cal-cell"}>
                    <button
                      type="button"
                      className={selected === cell.date ? "cal-day is-selected" : "cal-day"}
                      onClick={() => setSelected(cell.date)}
                      disabled={!selectable}
                      aria-pressed={selected === cell.date}
                    >
                      <span className="cal-num">{Number(cell.date.slice(8, 10))}</span>
                      {price !== null && <span className="cal-price">{formatPrice(price, locale)}</span>}
                      {day?.isHoliday && <span className="cal-holiday" aria-label={t("holiday")} />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {state === "loading" && <p className="field-hint">{t("loading")}</p>}

      {selectedDay && (
        <div className="cal-slots" aria-label={t("slotsFor", { date: selectedDay.date })}>
          <h3>{t("slotsFor", { date: selectedDay.date })}</h3>
          <ul>
            {selectedDay.slots.map((entry) => {
              const meta = slotsById.get(entry.slotTemplateId);
              return (
                <li key={entry.slotTemplateId} className={`cal-slot is-${entry.status.toLowerCase()}`}>
                  <span>
                    {locale === "ar" ? meta?.nameAr : meta?.nameFr}
                    {/* D57 — 24 h, toujours. Le créneau qui franchit minuit
                        s'affiche « 20:00 – 02:00 », jamais « 8 PM ». */}
                    {meta && (
                      <span className="cal-slot-hours">
                        {formatSlotRange(meta.startMinutes, meta.endMinutes)}
                      </span>
                    )}
                  </span>
                  <span>{formatPrice(entry.priceCents, locale)}</span>
                  {/* Les quatre états sont NOMMÉS. « REQUESTED » se dit : une
                      demande ne verrouille rien, mais la taire produirait la
                      pire surprise possible au moment du devis. */}
                  <span className="cal-status">{t(`status.${entry.status}`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
