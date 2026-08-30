// Demandes de réservation d'une salle, côté PRO — Lot E1b.
//
// C'est l'écran qui donne son sens au request-to-book : sans lui, une demande
// arrive et personne n'y répond.
//
// ── Ce que cet écran doit rendre ÉVIDENT ─────────────────────────────────────
// 1. Qu'accepter VERROUILLE la date. Les autres demandes sur la même plage sont
//    donc annoncées AVANT le clic, pas découvertes après.
// 2. Que deux demandes en attente sur la même date sont NORMALES : c'est le pro
//    qui arbitre, pas le premier arrivé. Un badge de conflit n'est pas une
//    erreur, c'est un choix à faire.
// 3. Que refuser ne coûte rien au pro mais coûte du temps au client : le refus
//    est à portée de main, sans friction inventée (motif facultatif, D83).
//
// ⚠ `conflictIds` vient de l'API, calculé à la lecture. On ne le recalcule PAS
// ici : deux arithmétiques de chevauchement finiraient par diverger, et c'est
// celle du serveur qui décide vraiment.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@zwadj/i18n";
import { HARD_BOOKING_STATUSES, type ProBookingDTO } from "@zwadj/types";
import { useApiErrorMessage } from "../auth/auth-ui";
import { useBookingsPro } from "./venue-client-context";

/** Statuts qui verrouillent la date. Miroir du `WHERE` de l'EXCLUDE côté base :
 *  si l'un bouge, l'autre doit bouger — sinon l'écran ment sur la base.
 *
 *  ⚠ La LISTE vient de `@zwadj/types` (une seule autorité, lot S1) ; le `Set`
 *  n'est qu'une forme d'appel — la partition interroge l'appartenance ligne à
 *  ligne. Cet écran en portait une COPIE littérale, et c'est LUI qui décide de
 *  quel côté de la partition une ligne tombe : une copie en retard n'affiche
 *  pas moins, elle affiche la MÊME réservation des deux côtés — donc annulable
 *  depuis deux écrans. `Set<string>` explicite, car `row.status` est un
 *  `string` : sans l'annotation, `has()` refuserait de compiler. */
const LOCKING = new Set<string>(HARD_BOOKING_STATUSES);

/** UIP-A — la même section sert DEUX entrées du top panel, et la partition est
 *  stricte :
 *   - `open`   → « Demandes » : tout ce qui n'est pas verrouillé (en attente,
 *                refusé, expiré, annulé). Aucune ligne ne disparaît.
 *   - `locked` → « Réservations » : les dates verrouillées, ACCEPTED+CONFIRMED,
 *                le même ensemble que le `WHERE` de l'EXCLUDE en base.
 *   - `all`    → défaut historique, conservé : c'est ce que la section rendait
 *                avant ce lot, et ses tests le mesurent.
 *  ⚠ La partition n'est pas cosmétique : elle garantit qu'une réservation ne
 *  s'annule QUE depuis un écran. Deux chemins pour un geste destructeur, c'est
 *  un de trop. */
export type RequestScope = "all" | "open" | "locked";

export function BookingRequestsSection({ venueId, show = "all" }: { venueId: string; show?: RequestScope }) {
  const { t, i18n } = useTranslation();
  const bookings = useBookingsPro();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [rows, setRows] = useState<ProBookingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // GARDE DE FORME (leçon C5b) : cette section est montée sur une page qui
      // en porte cinq autres. Une réponse inattendue ne doit pas la faire lever
      // et emporter le formulaire de la salle avec elle.
      const list = await bookings.listForVenue(venueId);
      setRows(Array.isArray(list) ? list : []);
      setError(null);
    } catch (cause) {
      setError(toMessageRef.current(cause));
    }
  }, [bookings, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Toute action RECHARGE la liste au lieu de deviner l'état d'après.
   *
   *  Ce n'est pas de la prudence en trop : accepter une demande peut rendre les
   *  autres inacceptables, et refuser en libère. Recalculer localement ces
   *  conséquences serait réimplémenter le serveur dans le navigateur. */
  async function run(id: string, action: () => Promise<unknown>): Promise<void> {
    setBusy(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(toMessageRef.current(cause));
      // On recharge MÊME en cas d'échec : un 409 `BOOKING_SLOT_TAKEN` signifie
      // précisément que l'état affiché n'est plus le vrai.
      await load();
    } finally {
      setBusy(null);
    }
  }

  const locale = i18n.language === "ar" ? "ar" : "fr";

  /** Le filtre s'applique à l'AFFICHAGE, jamais à la lecture : l'API rend la
   *  liste complète et `conflictIds` est calculé dessus. Filtrer côté requête
   *  demanderait un paramètre que le contrat n'a pas — et UIP-A ne bouge aucun
   *  contrat d'API. */
  const visible =
    rows === null
      ? null
      : show === "all"
        ? rows
        : rows.filter((row) => (show === "locked" ? LOCKING.has(row.status) : !LOCKING.has(row.status)));

  return (
    <section className="card">
      <h2>{t("venue.ui.requests.title")}</h2>
      <p className="field-hint">{t("venue.ui.requests.hint")}</p>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {visible === null ? (
        <p className="field-hint">{t("venue.ui.requests.loading")}</p>
      ) : visible.length === 0 ? (
        <p className="field-hint">{t("venue.ui.requests.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {visible.map((row) => {
            const pending = row.status === "PENDING";
            const locked = LOCKING.has(row.status);
            const dead = !pending && !locked;
            return (
              <li
                key={row.id}
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 10,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  opacity: dead ? 0.55 : 1
                }}
              >
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ textDecoration: dead ? "line-through" : "none" }}>
                    {row.eventDate}
                    {row.slotNameFr === null ? "" : ` · ${locale === "ar" ? row.slotNameAr : row.slotNameFr}`}
                  </strong>
                  <span className="field-hint">{t("venue.ui.requests.status", { status: t(`venue.ui.requests.st_${row.status}`) })}</span>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>
                    {row.contactFirstName} {row.contactLastName}
                  </span>
                  {/* Le contact est la raison d'être de la liste : le pro rappelle. */}
                  <span className="field-hint">{row.contactPhone}</span>
                  <span className="field-hint">{t("venue.ui.requests.guests", { count: row.guests })}</span>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{formatDZD(row.totalCents, locale)}</span>
                  <span className="field-hint">
                    {t("venue.ui.requests.deposit", { amount: formatDZD(row.depositCents, locale) })}
                  </span>
                </div>

                {row.clientMessage === null ? null : <p style={{ margin: 0 }}>{row.clientMessage}</p>}

                {/* Le conflit s'annonce AVANT le clic. Découvrir après coup qu'on
                    vient d'écarter trois autres demandes serait le pire moment
                    pour l'apprendre. */}
                {pending && row.conflictIds.length > 0 ? (
                  <p className="field-hint" role="note">
                    {t("venue.ui.requests.conflict", { count: row.conflictIds.length })}
                  </p>
                ) : null}

                {pending ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-accent"
                      disabled={busy === row.id}
                      onClick={() => void run(row.id, () => bookings.accept(row.id))}
                    >
                      {t("venue.ui.requests.accept")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === row.id}
                      onClick={() => void run(row.id, () => bookings.decline(row.id, {}))}
                    >
                      {t("venue.ui.requests.decline")}
                    </button>
                  </div>
                ) : locked ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {/* ⚠ La phrase la plus importante de l'écran tant que le lot
                        Paiement n'existe pas (D80) : cette date restera prise
                        jusqu'à ce que le pro l'annule lui-même. */}
                    <span className="field-hint">{t("venue.ui.requests.lockedNotice")}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === row.id}
                      onClick={() => void run(row.id, () => bookings.cancel(row.id, { reason: t("venue.ui.requests.cancelReason") }))}
                    >
                      {t("venue.ui.requests.cancel")}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
