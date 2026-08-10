// Devis — écran PRO, Lot E2e.
//
// ── LE POINT D'ARCHITECTURE DU LOT ──────────────────────────────────────────
// Cet écran ne contient AUCUN calcul de montant, alors qu'il en affiche
// partout. Un devis en DRAFT **est** l'estimation à blanc : le pro le crée, le
// serveur le chiffre et le rend, l'écran l'affiche. S'il ne convient pas, on le
// révise ; s'il ne part jamais, il ne compte pas dans le taux de transformation.
//
// C'est ce qui évite la troisième copie d'arithmétique monétaire côté navigateur
// — après `previewDeposit` et `lineTotal`. Il n'y avait pas besoin d'inventer une
// route de devis à blanc : elle existait déjà, elle s'appelle `POST /quotes`.
//
// ── Ce que l'écran doit rendre évident ──────────────────────────────────────
// 1. Qu'une négociation est UNE affaire, même à trois versions. Les devis sont
//    donc groupés par CHAÎNE, la plus récente en tête, l'historique en dessous.
// 2. Que « remplacé » n'est pas « refusé ». Les deux statuts sont libellés
//    différemment, et c'est tout l'intérêt de les avoir séparés.
// 3. Qu'accepter un devis n'est PAS une action (D101) : le bouton dit
//    « Créer la demande », pas « Accepter ». Le devis passera ACCEPTED tout seul
//    quand l'acompte sera encaissé.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@zwadj/i18n";
import type { QuoteConversionDTO, QuoteDTO, ServiceDTO, VenueProDTO } from "@zwadj/types";
import { Field, useApiErrorMessage } from "../auth/auth-ui";
import { useQuotes, useServices, useVenues } from "./venue-client-context";

type Draft = { eventDate: string; slotTemplateId: string; guests: string; picks: string[]; validUntil: string };
const EMPTY: Draft = { eventDate: "", slotTemplateId: "", guests: "", picks: [], validUntil: "" };

/** Contact minimal exigé par la conversion : `bookings.contact_*` est NOT NULL
 *  et le devis ne le porte pas. Le pro le saisit au moment où l'affaire se
 *  conclut, ce qui est aussi le moment où il le connaît. */
type Contact = { firstName: string; lastName: string; phone: string; email: string };
const NO_CONTACT: Contact = { firstName: "", lastName: "", phone: "", email: "" };

export function QuotesSection({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const quotes = useQuotes();
  const services = useServices();
  const venues = useVenues();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;

  const [rows, setRows] = useState<QuoteDTO[] | null>(null);
  const [stats, setStats] = useState<QuoteConversionDTO | null>(null);
  const [venue, setVenue] = useState<VenueProDTO | null>(null);
  const [catalogue, setCatalogue] = useState<ServiceDTO[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [converting, setConverting] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>(NO_CONTACT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, counts, mine, cat] = await Promise.all([
        quotes.listForVenue(venueId),
        quotes.conversion(venueId),
        venues.getMine(venueId),
        services.listForVenue(venueId)
      ]);
      // GARDE DE FORME (leçon C5b, troisième application) : cette section vit à
      // côté d'autres. Une réponse inattendue ne doit pas la faire lever et
      // emporter la page.
      setRows(Array.isArray(list) ? list : []);
      setStats(counts ?? null);
      setVenue(mine ?? null);
      setCatalogue(Array.isArray(cat) ? cat.filter((row) => row.isActive) : []);
      setError(null);
    } catch (cause) {
      setError(toMessageRef.current(cause));
    }
  }, [quotes, services, venues, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      // On RECHARGE : envoyer une version en remplace une autre, convertir crée
      // une demande. Deviner ces conséquences localement, ce serait
      // réimplémenter le serveur dans le navigateur.
      await load();
    } catch (cause) {
      setError(toMessageRef.current(cause));
    } finally {
      setBusy(false);
    }
  }

  const draftBody = () => ({
    eventDate: draft.eventDate,
    slotTemplateId: draft.slotTemplateId,
    guests: Number(draft.guests),
    ...(draft.picks.length === 0 ? {} : { services: draft.picks.map((serviceId) => ({ serviceId })) }),
    ...(draft.validUntil === "" ? {} : { validUntil: draft.validUntil })
  });

  const draftComplete = draft.eventDate !== "" && draft.slotTemplateId !== "" && Number(draft.guests) > 0;
  // D135 — l'e-mail est facultatif ; le téléphone ne l'est pas.
  const contactComplete =
    contact.firstName.trim() !== "" && contact.lastName.trim() !== "" && contact.phone.trim() !== "";

  // Les chaînes, la plus récemment créée en tête. Le tri du serveur est
  // chaîne puis version croissante : on regroupe sans le contredire.
  const chains = new Map<string, QuoteDTO[]>();
  for (const row of rows ?? []) chains.set(row.chainId, [...(chains.get(row.chainId) ?? []), row]);

  return (
    <section className="card">
      <h2>{t("venue.ui.quotes.title")}</h2>
      <p className="field-hint">{t("venue.ui.quotes.hint")}</p>

      {stats === null ? null : (
        <p>
          {t("venue.ui.quotes.stats", {
            sent: stats.sent,
            accepted: stats.accepted,
            declined: stats.declined,
            expired: stats.expired
          })}
        </p>
      )}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <p className="field-hint">{t("venue.ui.quotes.loading")}</p>
      ) : chains.size === 0 ? (
        <p className="field-hint">{t("venue.ui.quotes.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 12 }}>
          {[...chains.entries()].map(([chainId, versions]) => {
            const latest = versions[versions.length - 1];
            if (latest === undefined) return null;
            const history = versions.slice(0, -1);
            return (
              <li key={chainId} style={{ padding: 10, border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <strong>{t("venue.ui.quotes.version", { n: latest.version })}</strong>
                  <span>{latest.eventDate}</span>
                  <span>{formatDZD(latest.totalCents)}</span>
                  <span className="field-hint">
                    {t("venue.ui.quotes.deposit", { amount: formatDZD(latest.depositCents) })}
                  </span>
                  <span className="field-hint">
                    {latest.isExpired ? t("venue.ui.quotes.st_EXPIRED") : t(`venue.ui.quotes.st_${latest.status}`)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBlockStart: 8 }}>
                  {latest.status === "DRAFT" ? (
                    <button type="button" className="btn btn-accent" disabled={busy} onClick={() => void run(() => quotes.send(latest.id))}>
                      {t("venue.ui.quotes.send")}
                    </button>
                  ) : null}

                  {latest.status === "SENT" && !latest.isExpired && latest.bookingId === null ? (
                    <button type="button" className="btn btn-accent" disabled={busy} onClick={() => setConverting(latest.id)}>
                      {/* ⚠ « Créer la demande », JAMAIS « Accepter » : accepter un
                          devis n'est pas une action, c'est la conséquence de
                          l'encaissement de l'acompte (D101). */}
                      {t("venue.ui.quotes.convert")}
                    </button>
                  ) : null}

                  {latest.status === "SENT" ? (
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void run(() => quotes.decline(latest.id))}>
                      {t("venue.ui.quotes.decline")}
                    </button>
                  ) : null}

                  {latest.status === "DRAFT" || latest.status === "SENT" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy || !draftComplete}
                      onClick={() => void run(() => quotes.revise(latest.id, draftBody()))}
                    >
                      {t("venue.ui.quotes.revise")}
                    </button>
                  ) : null}
                </div>

                {latest.bookingId === null ? null : (
                  <p className="field-hint">{t("venue.ui.quotes.converted")}</p>
                )}

                {/* L'historique : ce qui a été remplacé reste lisible. C'est tout
                    l'intérêt d'avoir séparé SUPERSEDED de DECLINED. */}
                {history.length === 0 ? null : (
                  <details style={{ marginBlockStart: 8 }}>
                    <summary>{t("venue.ui.quotes.history", { n: history.length })}</summary>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {history.map((row) => (
                        <li key={row.id} className="field-hint">
                          {t("venue.ui.quotes.version", { n: row.version })} — {formatDZD(row.totalCents)} —{" "}
                          {t(`venue.ui.quotes.st_${row.status}`)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {converting === latest.id ? (
                  <div style={{ display: "grid", gap: 6, marginBlockStart: 8 }}>
                    <p className="field-hint">{t("venue.ui.quotes.contactHint")}</p>
                    <input
                      aria-label={t("venue.ui.quotes.firstName")}
                      value={contact.firstName}
                      onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                    />
                    <input
                      aria-label={t("venue.ui.quotes.lastName")}
                      value={contact.lastName}
                      onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                    />
                    <input
                      aria-label={t("venue.ui.quotes.phone")}
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    />
                    <input
                      aria-label={t("venue.ui.quotes.email")}
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-accent"
                      disabled={busy || !contactComplete}
                      onClick={() =>
                        void run(async () => {
                          await quotes.convert(latest.id, {
                            contactFirstName: contact.firstName.trim(),
                            contactLastName: contact.lastName.trim(),
                            contactPhone: contact.phone.trim(),
                            ...(contact.email.trim() === "" ? {} : { contactEmail: contact.email.trim() }),
                            paymentMethod: "CASH"
                          });
                          setConverting(null);
                          setContact(NO_CONTACT);
                        })
                      }
                    >
                      {t("venue.ui.quotes.confirmConvert")}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <h3>{t("venue.ui.quotes.newTitle")}</h3>
      {/* ⚠ Aucun total affiché ici, et c'est délibéré : le montant apparaît
          quand le SERVEUR l'a calculé, c'est-à-dire dans le devis créé. Un
          aperçu local serait une troisième arithmétique monétaire dans le
          navigateur, et la première à pouvoir mentir. */}
      <p className="field-hint">{t("venue.ui.quotes.newHint")}</p>

      <Field label={t("venue.ui.quotes.eventDate")}>
        {({ id }) => (
          <input id={id} type="date" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} />
        )}
      </Field>

      <Field label={t("venue.ui.quotes.slot")}>
        {({ id }) => (
          <select id={id} value={draft.slotTemplateId} onChange={(e) => setDraft({ ...draft, slotTemplateId: e.target.value })}>
            <option value="">{t("venue.ui.quotes.slotPlaceholder")}</option>
            {(venue?.slotTemplates ?? []).map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.nameFr}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label={t("venue.ui.quotes.guests")}>
        {({ id }) => (
          <input
            id={id}
            inputMode="numeric"
            value={draft.guests}
            onChange={(e) => setDraft({ ...draft, guests: e.target.value.replace(/[^0-9]/g, "") })}
          />
        )}
      </Field>

      {catalogue.length === 0 ? null : (
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>{t("venue.ui.quotes.services")}</legend>
          {catalogue.map((service) => (
            <label key={service.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={draft.picks.includes(service.id)}
                onChange={() =>
                  setDraft({
                    ...draft,
                    picks: draft.picks.includes(service.id)
                      ? draft.picks.filter((id) => id !== service.id)
                      : [...draft.picks, service.id]
                  })
                }
              />{" "}
              {service.nameFr}
            </label>
          ))}
        </fieldset>
      )}

      <Field label={t("venue.ui.quotes.validUntil")} hint={t("venue.ui.quotes.validUntilHint")}>
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            type="date"
            value={draft.validUntil}
            onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })}
          />
        )}
      </Field>

      <button
        type="button"
        className="btn btn-accent"
        disabled={busy || !draftComplete}
        onClick={() =>
          void run(async () => {
            await quotes.create(venueId, draftBody());
            setDraft(EMPTY);
          })
        }
      >
        {t("venue.ui.quotes.create")}
      </button>
    </section>
  );
}
