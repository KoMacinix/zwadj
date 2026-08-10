// Calendrier d'une salle, côté PRO — Lot B6, D56/D57.
// EXTRAIT de `venue-calendar-page.tsx` par UIP-A : ce fichier n'est plus une
// PAGE mais un COMPOSANT qui reçoit sa salle. La page `/salles/:id/calendrier`
// disparaît ; le calendrier devient l'entrée « Calendrier » du top panel, et
// les trois sections qui l'accompagnaient partent où elles ont un sens :
// demandes + visites dans « Demandes », devis au tableau de bord.
//
// ── Ce que cet écran est, et ce qu'il n'est pas ──────────────────────────────
// C'est une vue de LECTURE : le pro voit d'un coup d'oeil ce qui est pris, ce
// qui est demandé, ce qu'il a bloqué, et à quel prix chaque créneau se vend ce
// jour-là. Il n'écrit RIEN. Les blocages se posent dans le volet dédié de
// l'écran d'édition (B4d), les prix dans le volet créneaux (B4b/B4c) — deux
// endroits pour écrire la même chose finiraient par diverger.
//
// ── ⚠ CORRECTION : il consomme désormais la route PRO ───────────────────────
// Il appelait `GET /venues/:slug/availability`, l'endpoint public. Le motif était
// juste — ne pas dupliquer le moteur — mais la conséquence n'avait jamais été
// vérifiée sur une salle réelle : cet endpoint exige
// `publicationStatus = PUBLISHED`. Un pro dont la salle est encore en brouillon
// recevait donc « Le calendrier n'a pas pu être chargé » sur SON PROPRE
// calendrier, et depuis la refonte l'écran « Nouvelle réservation » mourait avec.
//
// `GET /pro/venues/:id/availability` appelle le MÊME `compute` : mêmes règles de
// prix, mêmes statuts, même écrêtage. Seule la clause de recherche change — le pro
// voit donc exactement ce que verront ses clients (D78).
//
// Deux bénéfices au passage : plus de `fetch` brut hors du client authentifié, et
// plus d'aller-retour `getMine` pour un slug dont on n'a plus besoin.
//
// ── Semaine algérienne (D56) et 24 h (D57) ───────────────────────────────────
// Grille du DIMANCHE au SAMEDI, week-end vendredi-samedi en fin de ligne.
// Toutes les heures en 24 h, via le formateur partagé.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@zwadj/i18n";
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

/** ⚠ Le même calendrier sert DEUX écrans : la vue « Calendrier » en lecture, et
 *  le sélecteur de date du parcours « client sur place ». Il devient donc
 *  PILOTABLE de l'extérieur au lieu d'être recopié — un second calendrier aurait
 *  été une seconde source de vérité sur « ce jour est-il libre ? », exactement ce
 *  que D78 interdit. Sans les props de pilotage, il se comporte comme avant.
 *
 *  Ce qu'il apporte au parcours, et qu'un `<input type="date">` ne pouvait pas :
 *  la disponibilité RÉELLE jour par jour, le tarif du jour rendu par le moteur
 *  (B2/B3), et les créneaux du jour avec leur prix — donc aucune date vendue ne
 *  peut plus être saisie à la main. */
export function VenueCalendar({
  venueId,
  selectedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
  compact = false
}: {
  venueId: string;
  /** Pilotage externe. Absent ⇒ le composant garde sa sélection interne. */
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  selectedSlotId?: string | null;
  /** Fourni ⇒ les créneaux du jour deviennent cliquables. */
  onSelectSlot?: (slotTemplateId: string, priceCents: number) => void;
  /** Masque la phrase « lecture seule », hors de propos dans le parcours. */
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();

  const nowRef = useRef(Date.now());
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [cursor, setCursor] = useState<MonthCursor>(() => currentMonth(nowRef.current));
  const [data, setData] = useState<VenueAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  /** Contrôlé si le parent fournit la paire date + rappel, sinon interne. */
  const piloted = onSelectDate !== undefined;
  const selected = piloted ? (selectedDate ?? null) : ownSelected;
  const pick = (date: string) => {
    if (onSelectDate) onSelectDate(date);
    else setOwnSelected(date);
  };

  const firstMonth = useMemo(() => currentMonth(nowRef.current), []);
  const lastMonth = useMemo(() => shiftMonth(firstMonth, HORIZON_MONTHS), [firstMonth]);


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!piloted) setOwnSelected(null);
    const { from, to } = monthWindow(cursor.year, cursor.month);
    void (async () => {
      try {
        const res = await venues.availability(venueId, { from, to });
        if (cancelled) return;
        setData(res);
        setError(null);
      } catch {
        if (!cancelled) setError(t("venue.ui.calendar.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId, venues, cursor, t, piloted]);

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
    <>
      {/* ⚠ « Vue en lecture » ne se dit QUE sur l'écran Calendrier. Dans le
          parcours, le calendrier sert à CHOISIR une date : la phrase y serait
          fausse, et une phrase fausse en petit gris est encore une phrase fausse. */}
      {compact ? null : <p className="field-hint">{t("venue.ui.calendar.readOnly")}</p>}

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
                      onClick={() => pick(cell.date as string)}
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
              const libre = entry.status === "AVAILABLE";
                const contenu = (
                  <>
                    <span>{i18n.language === "ar" ? meta?.nameAr : meta?.nameFr}</span>
                    {/* D57 — 24 h. Une soirée s'écrit « 20:00 – 02:00 ». */}
                    {meta && <span className="cal-slot-hours">{formatSlotRange(meta.startMinutes, meta.endMinutes)}</span>}
                    <span className="cal-slot-price">{formatDZD(entry.priceCents)}</span>
                    <span className="cal-status">{t(`venue.ui.calendar.status.${entry.status}`)}</span>
                  </>
                );
                // ⚠ Seuls les créneaux LIBRES sont cliquables, et c'est le moteur
                // qui le dit — pas une règle recopiée ici.
                return onSelectSlot === undefined ? (
                  <li key={entry.slotTemplateId} className={`cal-slot ${STATUS_CLASS[entry.status]}`}>
                    {contenu}
                  </li>
                ) : (
                  <li key={entry.slotTemplateId}>
                    <button
                      type="button"
                      className={[
                        "cal-slot",
                        "cal-slot-pick",
                        STATUS_CLASS[entry.status],
                        selectedSlotId === entry.slotTemplateId ? "is-picked" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={!libre}
                      aria-pressed={selectedSlotId === entry.slotTemplateId}
                      onClick={() => onSelectSlot(entry.slotTemplateId, entry.priceCents)}
                    >
                      {contenu}
                    </button>
                  </li>
                );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
