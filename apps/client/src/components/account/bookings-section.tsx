"use client";

// « Mes réservations » — Lot E1b.
//
// Même doctrine que « Mes rendez-vous » (C5b), et pour la même raison : une
// demande refusée ou annulée reste AFFICHÉE et marquée. « Cette demande n'a pas
// abouti » est une information ; sa disparition silencieuse ressemble à un bug
// et laisse le client croire qu'il attend encore.
//
// ⚠ Garde de forme et message d'erreur PROPRES à la section : elle doit échouer
// SEULE. C'est la leçon de C5b — une section qui lève emportait tout le reste de
// la page compte avec elle.
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBookingsClient, type BookingsClient } from "@zwadj/api-client";
import { formatDZD } from "@zwadj/i18n";
import type { BookingDTO } from "@zwadj/types";
import { useAuth } from "../../lib/auth/auth-context";

/** Statuts sur lesquels le client peut encore agir. Le reste est de l'histoire :
 *  on l'affiche, on ne propose rien. */
const CANCELLABLE = new Set(["PENDING", "ACCEPTED"]);

export function BookingsSection({ client }: { client?: BookingsClient }) {
  const t = useTranslations("account.ui.bookings");
  const locale = useLocale();
  const { status, api } = useAuth();

  const [rows, setRows] = useState<BookingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const bookings = client ?? createBookingsClient(api.authedRequest);
      const list = await bookings.listMine();
      // Garde de FORME : une réponse inattendue ne doit pas faire lever `.map`
      // et emporter le profil, l'e-mail et le mot de passe avec elle.
      setRows(Array.isArray(list) ? list : []);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [api, client, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== "authenticated") return null;

  /** Annulation. Un motif est OBLIGATOIRE si la demande est déjà ACCEPTED (D83) :
   *  le pro a peut-être refusé d'autres dates entre-temps. On le demande donc
   *  avant d'appeler, plutôt que d'encaisser un 400 et d'afficher une erreur. */
  const cancel = async (row: BookingDTO) => {
    let reason: string | undefined;
    if (row.status === "ACCEPTED") {
      const typed = window.prompt(t("cancelReasonPrompt"));
      if (typed === null || typed.trim() === "") return;
      reason = typed.trim();
    }
    setBusy(row.id);
    try {
      const bookings = client ?? createBookingsClient(api.authedRequest);
      await bookings.cancel(row.id, reason === undefined ? {} : { reason });
      // On RECHARGE au lieu de retirer la ligne : l'annulation change aussi le
      // statut et le motif, et deviner l'état d'après l'API finit toujours par
      // diverger de l'API.
      await load();
    } catch {
      setError(t("cancelError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="bookings-heading">
      <h2 id="bookings-heading">{t("title")}</h2>

      {error === null ? null : (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {rows === null ? (
        <p>{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const dead = row.status === "DECLINED" || row.status === "CANCELLED" || row.status === "EXPIRED";
            const slot = locale === "ar" ? row.slotNameAr : row.slotNameFr;
            return (
              <li
                key={row.id}
                style={{
                  padding: 10,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  opacity: dead ? 0.55 : 1
                }}
              >
                <strong style={{ textDecoration: dead ? "line-through" : "none" }}>
                  {locale === "ar" ? row.venueNameAr : row.venueNameFr}
                </strong>
                <div>
                  {row.eventDate}
                  {slot === null ? "" : ` · ${slot}`}
                </div>
                <div>
                  {formatDZD(row.totalCents, locale === "ar" ? "ar" : "fr")} ·{" "}
                  {t("deposit", { amount: formatDZD(row.depositCents, locale === "ar" ? "ar" : "fr") })}
                </div>
                <div className="muted">{t(`st_${row.status}`)}</div>

                {/* Le motif du refus, quand la salle en a donné un : c'est ce qui
                    permet au client de chercher utilement ailleurs. */}
                {row.declineReason === null ? null : <p className="muted">{row.declineReason}</p>}

                {CANCELLABLE.has(row.status) ? (
                  <button type="button" disabled={busy === row.id} onClick={() => void cancel(row)}>
                    {t("cancel")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
