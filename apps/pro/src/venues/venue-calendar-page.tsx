// Calendrier d'une salle, côté PRO — Lot B6, D56/D57.
//
// ── Ce que cet écran est, et ce qu'il n'est pas ──────────────────────────────
// C'est une vue de LECTURE : le pro voit d'un coup d'œil ce qui est pris, ce
// qui est demandé, ce qu'il a bloqué, et à quel prix chaque créneau se vend ce
// jour-là. Il n'écrit RIEN. Les blocages se posent dans le volet dédié de
// l'écran d'édition (B4d), les prix dans le volet créneaux (B4b/B4c) — deux
// endroits pour écrire la même chose finiraient par diverger.
//
// ── Il consomme l'endpoint PUBLIC, et c'est voulu ────────────────────────────
// `GET /venues/:slug/availability` est la seule source de vérité sur l'état
// d'un jour : c'est elle qui fait tourner le moteur (B3), applique les règles
// de prix (B2) et arbitre les quatre statuts. Un endpoint pro parallèle
// recalculerait la même chose et finirait par répondre autrement — le pro
// verrait alors autre chose que ses clients, ce qui est le pire des écarts.
//
// ⚠ Conséquence assumée : cet écran ne montre donc QUE ce qu'un visiteur voit.
// L'identité des clients, les montants d'acompte et l'historique appartiennent
// au lot Réservations, pas à celui-ci. La légende du design (« Acompte reçu »)
// attend ce lot-là.
//
// ── Semaine algérienne (D56) et 24 h (D57) ───────────────────────────────────
// Grille du DIMANCHE au SAMEDI, week-end vendredi-samedi en fin de ligne.
// Toutes les heures en 24 h, via le formateur partagé.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { formatSlotRange, type VenueAvailabilityDayDTO, type VenueAvailabilityResponse } from "@zwadj/types";
import { useApiErrorMessage } from "../auth/auth-ui";
import { useVenues } from "./venue-client-context";
import {
  compareMonths,
  currentMonth,
  monthGrid,
  monthLabel,
  monthWindow,
  shiftMonth,
  weekdayHeaders,
  type MonthCursor
} from "./pro-calendar";

const HORIZON_MONTHS = 18;

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "is-available",
  REQUESTED: "is-requested",
  BOOKED: "is-booked",
  BLOCKED: "is-blocked"
};

/** Statut du JOUR = le plus grave de ses créneaux. Même ordre de gravité que le
 *  moteur (B3) : BLOCKED > BOOKED > REQUESTED > AVAILABLE. Prendre le plus
 *  favorable ferait passer une journée déjà vendue pour libre. */
const GRAVITY = ["AVAILABLE", "REQUESTED", "BOOKED", "BLOCKED"];

function dayStatus(day: VenueAvailabilityDayDTO | undefined): string | null {
  if (!day || day.slots.length === 0) return null;
  return day.slots.reduce(
    (worst, s) => (GRAVITY.indexOf(s.status) > GRAVITY.indexOf(worst) ? s.status : worst),
    "AVAILABLE"
  );
}

export function VenueCalendarPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();

  const nowRef = useRef(Date.now());
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [slug, setSlug] = useState<string | null>(null);
  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth(nowRef.current));
  const [data, setData] = useState<VenueAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const firstMonth = useMemo(() => currentMonth(nowRef.current), []);
  const lastMonth = useMemo(() => shiftMonth(firstMonth, HORIZON_MONTHS), [firstMonth]);

  // Le slug n'est pas dans l'URL pro (qui travaille par id) : on le lit une
  // fois sur la salle, puis on interroge l'endpoint public.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const venue = await venues.getMine(id);
        if (!cancelled) setSlug(venue.slug);
      } catch (cause) {
        if (!cancelled) {
          setError(toMessageRef.current(cause));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, venues]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    const { from, to } = monthWindow(cursor.year, cursor.month);
    void (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/v1/venues/` +
            `${encodeURIComponent(slug)}/availability?${new URLSearchParams({ from, to }).toString()}`
        );
        if (cancelled) return;
        setData(res.ok ? ((await res.json()) as VenueAvailabilityResponse) : null);
        setError(res.ok ? null : t("venue.ui.calendar.error"));
      } catch {
        if (!cancelled) setError(t("venue.ui.calendar.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, cursor, t]);

  const byDate = useMemo(() => {
    const map = new Map<string, VenueAvailabilityDayDTO>();
    for (const day of data?.days ?? []) map.set(day.date, day);
    return map;
  }, [data]);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const headers = useMemo(() => weekdayHeaders(i18n.language), [i18n.language]);
  const slotsById = useMemo(() => new Map((data?.slots ?? []).map((s) => [s.id, s])), [data]);
  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <main className="page">
      <div className="page-head">
        <h1>{t("venue.ui.calendar.title")}</h1>
        <Link to={`/salles/${id}`} className="btn">
          {t("venue.ui.calendar.backToVenue")}
        </Link>
      </div>
      <p className="field-hint">{t("venue.ui.calendar.readOnly")}</p>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="cal-head">
        <button
          type="button"
          className="btn"
          onClick={() => setCursor(shiftMonth(cursor, -1))}
          disabled={compareMonths(cursor, firstMonth) <= 0}
        >
          {t("venue.ui.calendar.previous")}
        </button>
        <strong aria-live="polite">{monthLabel(cursor, i18n.language)}</strong>
        <button
          type="button"
          className="btn"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
          disabled={compareMonths(cursor, lastMonth) >= 0}
        >
          {t("venue.ui.calendar.next")}
        </button>
      </div>

      {/* Légende : sans elle, quatre couleurs ne veulent rien dire. Chaque
          pastille est DOUBLÉE d'un mot — la couleur seule exclurait un pro
          daltonien, et ce sont ses réservations. */}
      <ul className="cal-legend">
        {GRAVITY.map((status) => (
          <li key={status}>
            <span className={`cal-chip ${STATUS_CLASS[status]}`} aria-hidden="true" />
            {t(`venue.ui.calendar.status.${status}`)}
          </li>
        ))}
      </ul>

      <table className="cal-grid">
        <caption className="sr-only">
          {t("venue.ui.calendar.caption", { month: monthLabel(cursor, i18n.language) })}
        </caption>
        <thead>
          <tr>
            {headers.map((label) => (
              <th key={label} scope="col">
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
                const status = dayStatus(day);
                return (
                  <td key={cell.date} className={cell.isWeekend ? "cal-cell is-weekend" : "cal-cell"}>
                    <button
                      type="button"
                      className={[
                        "cal-day",
                        status ? STATUS_CLASS[status] : "is-empty",
                        selected === cell.date ? "is-selected" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelected(cell.date)}
                      disabled={!day}
                      aria-pressed={selected === cell.date}
                    >
                      <span className="cal-num">{Number(cell.date.slice(8, 10))}</span>
                      {status && <span className="sr-only">{t(`venue.ui.calendar.status.${status}`)}</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {loading && <p className="field-hint">{t("venue.ui.calendar.loading")}</p>}

      {selectedDay && (
        <section className="cal-slots" aria-label={t("venue.ui.calendar.dayDetail", { date: selectedDay.date })}>
          <h2>{t("venue.ui.calendar.dayDetail", { date: selectedDay.date })}</h2>
          <ul>
            {selectedDay.slots.map((entry) => {
              const meta = slotsById.get(entry.slotTemplateId);
              return (
                <li key={entry.slotTemplateId} className={`cal-slot ${STATUS_CLASS[entry.status]}`}>
                  <span>{meta?.nameFr}</span>
                  {/* D57 — 24 h. Une soirée s'écrit « 20:00 – 02:00 ». */}
                  {meta && <span className="cal-slot-hours">{formatSlotRange(meta.startMinutes, meta.endMinutes)}</span>}
                  <span>{new Intl.NumberFormat("fr-DZ").format(entry.priceCents / 100)}</span>
                  <span className="cal-status">{t(`venue.ui.calendar.status.${entry.status}`)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
