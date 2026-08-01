"use client";

// « Mes rendez-vous » (Lot C5b) — la contrepartie d'écran de `GET /me/visit-bookings`
// et de `DELETE /visit-bookings/:id`, servis par C3 depuis un moment sans que
// personne puisse les atteindre.
//
// ── Trois règles, toutes visibles à l'écran ─────────────────────────────────
// 1. Les rendez-vous PASSÉS restent listés, au-dessous des prochains : c'est
//    l'historique du visiteur. Les faire disparaître à minuit ressemblerait à
//    une perte de données.
// 2. Un rendez-vous passé n'offre PAS de bouton : l'API répond 409
//    `VISIT_BOOKING_PAST` (D62), et proposer un geste qui échoue toujours est
//    pire que ne rien proposer.
// 3. Après annulation on RECHARGE : l'API pose aussi `cancelledAt`, et deviner
//    l'état d'après elle finit toujours par en diverger.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createVisitBookingsClient, type VisitBookingsClient } from "@zwadj/api-client";
import { formatSlotRange, VISIT_DURATION_MINUTES, type VisitBookingDTO } from "@zwadj/types";
import { useAuth } from "../../lib/auth/auth-context";
import { Link } from "../../i18n/navigation";

export function VisitBookingsSection({ client }: { client?: VisitBookingsClient }) {
  const t = useTranslations("account.ui.visits");
  const locale = useLocale();
  const { api } = useAuth();
  const bookings = useMemo(() => client ?? createVisitBookingsClient(api.authedRequest), [client, api]);

  const [rows, setRows] = useState<VisitBookingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await bookings.listMine();
      // ⚠ Garde de FORME, pas de politesse : cette section est montée DANS la
      // page compte. Une réponse inattendue faisait lever `rows.map` au rendu
      // et emportait le profil, l'e-mail et le mot de passe avec elle. Une
      // section qui échoue doit échouer seule.
      setRows(Array.isArray(list) ? list : []);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [bookings, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (id: string) => {
    setBusy(id);
    try {
      await bookings.cancel(id);
      await load();
    } catch {
      setError(t("cancelError"));
    } finally {
      setBusy(null);
    }
  };

  if (error !== null) {
    return (
      <section className="account-section">
        <h2>{t("title")}</h2>
        <p className="field-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  const nowMs = Date.now();

  return (
    <section className="account-section">
      <h2>{t("title")}</h2>
      {rows === null ? (
        <p className="account-hint">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="account-hint">{t("empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const cancelled = row.status === "CANCELLED";
            const past = new Date(row.scheduledAt).getTime() < nowMs;
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
                  opacity: cancelled || past ? 0.6 : 1
                }}
              >
                <Link href={`/salles/${row.venueSlug}`}>
                  {locale === "ar" ? row.venueNameAr : row.venueNameFr}
                </Link>
                <span style={{ textDecoration: cancelled ? "line-through" : "none" }}>
                  {row.date} ·{" "}
                  {formatSlotRange(row.startMinutes, row.startMinutes + VISIT_DURATION_MINUTES)}
                </span>
                {cancelled ? (
                  <span className="account-hint">{t("cancelled")}</span>
                ) : past ? (
                  // Passé : aucun bouton. L'API refuserait (409 D62), et un geste
                  // qui échoue toujours est pire que pas de geste.
                  <span className="account-hint">{t("past")}</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    style={{ marginInlineStart: "auto" }}
                    disabled={busy === row.id}
                    onClick={() => void cancel(row.id)}
                  >
                    {t("cancel")}
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
