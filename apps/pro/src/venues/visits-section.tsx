// Rendez-vous de visite d'une salle, côté PRO (Lot C3b).
//
// ⚠ La fenêtre part d'AUJOURD'HUI et couvre trois mois. Le contrat autorise le
// passé (D70) et le pro en aura besoin un jour pour son historique ; cet écran-ci
// répond à la question du moment — « qui vient bientôt ? ». Le passé viendra
// avec un onglet, pas en noyant la liste utile.
//
// ⚠ Annulés AFFICHÉS et barrés : un rendez-vous qui disparaît sans un mot
// ressemble à un bug, et le pro qui a bloqué son après-midi doit voir qu'il est
// libéré.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatSlotRange, VISIT_DURATION_MINUTES, type ProVisitBookingDTO } from "@zwadj/types";
import { useApiErrorMessage } from "../auth/auth-ui";
import { useVenues } from "./venue-client-context";

const WINDOW_DAYS = 92;

function civilDate(ms: number): string {
  // Alger est à UTC+1 toute l'année (D48) : décaler puis lire en UTC donne la
  // date civile locale sans dépendre du fuseau de la machine.
  return new Date(ms + 3_600_000).toISOString().slice(0, 10);
}

export function VisitsSection({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [rows, setRows] = useState<ProVisitBookingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const nowMs = Date.now();
    try {
      const list = await venues.listVisitBookings(venueId, {
        from: civilDate(nowMs),
        to: civilDate(nowMs + WINDOW_DAYS * 86_400_000)
      });
      setRows(list);
      setError(null);
    } catch (cause) {
      setError(toMessageRef.current(cause));
    }
  }, [venues, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (bookingId: string) => {
    setBusy(bookingId);
    try {
      await venues.cancelVisitBooking(venueId, bookingId);
      // On RECHARGE au lieu de retirer la ligne localement : l'annulation change
      // aussi `cancelledAt`, et deviner l'état d'après l'API finit toujours par
      // diverger de l'API.
      await load();
    } catch (cause) {
      setError(toMessageRef.current(cause));
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <section className="card">
        <h2>{t("venue.ui.visits.title")}</h2>
        <p className="field-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{t("venue.ui.visits.title")}</h2>
      {rows === null ? (
        <p className="field-hint">{t("venue.ui.visits.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="field-hint">{t("venue.ui.visits.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const cancelled = row.status === "CANCELLED";
            const name = [row.clientFirstName, row.clientLastName].filter(Boolean).join(" ");
            return (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: 10,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  opacity: cancelled ? 0.55 : 1
                }}
              >
                <strong style={{ textDecoration: cancelled ? "line-through" : "none" }}>
                  {row.date} · {formatSlotRange(row.startMinutes, row.startMinutes + VISIT_DURATION_MINUTES)}
                </strong>
                <span>{name === "" ? row.clientEmail : name}</span>
                {/* Le contact est la raison d'être de cette liste : le pro
                    rappelle. Le téléphone peut manquer (D61), l'e-mail jamais. */}
                <span className="field-hint">{row.contactPhone ?? row.clientEmail}</span>
                {cancelled ? (
                  <span className="field-hint">{t("venue.ui.visits.cancelled")}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginInlineStart: "auto" }}
                    disabled={busy === row.id}
                    onClick={() => void cancel(row.id)}
                  >
                    {t("venue.ui.visits.cancel")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
