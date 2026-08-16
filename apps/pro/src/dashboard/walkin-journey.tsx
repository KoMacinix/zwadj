// Nouvelle réservation — client présent sur place. Lot UIP-B, refonte graphique.
//
// ── Ce que ce composant est ─────────────────────────────────────────────────
// Une RE-PRÉSENTATION du cycle de vie devis E2e, pas un nouveau moteur. Toute la
// chaîne passe par des routes PRO livrées :
//
//   1. `POST /venues/:id/quotes`    → DRAFT, chiffré par le SERVEUR
//   2. `POST /quotes/:id/revise`    → nouvelle VERSION quand les conditions bougent
//   3. `POST /quotes/:id/deliver`   → enregistre PAR QUOI le devis a été remis
//   4. `POST /quotes/:id/convert`   → demande PENDING, avec le contact
//   5. `POST /pro/bookings/:id/accept` → ACCEPTED : la date est VERROUILLÉE
//
// ── ⚠ L'ÉTAPE 3 A CESSÉ D'ÊTRE UN PASSAGE OBLIGÉ (Q2) ───────────────────────
// `conclude()` appelait `send()` quand le devis était en DRAFT, parce que la
// conversion EXIGEAIT le statut SENT. Ce clic n'envoyait rien : il levait un
// péage. La conversion accepte désormais un brouillon (D160), donc l'appel
// intermédiaire a été RETIRÉ — le laisser aurait fait échouer les deux issues
// sur un 404 de route disparue, au clic, en production.
//
// La remise, elle, est devenue une DÉCLARATION explicite du pro : quatre
// boutons, un par canal, qui n'ouvrent ni ne ferment rien. C'est ce qui fait
// entrer l'affaire dans l'entonnoir (D162).
//
// ── ⚠ UN SEUL DEVIS PAR SESSION, RÉVISÉ — jamais un devis par clic ──────────
// Le premier calcul crée le brouillon ; les suivants appellent `revise`, qui pose
// une nouvelle VERSION dans la même chaîne. C'est ce qui fait qu'une négociation
// à trois allers-retours reste UNE affaire dans le compteur de transformation, au
// lieu d'en gonfler le dénominateur de trois. Le bouton s'appelle donc
// « Modifier le devis » dès qu'un devis existe.
//
// ── ⚠ AUCUNE ARITHMÉTIQUE MONÉTAIRE ICI ─────────────────────────────────────
// Le total n'apparaît qu'APRÈS le calcul serveur. Le design de référence, lui,
// calcule l'acompte à `Math.round(total * 0.3)` dans le navigateur : c'est faux
// pour nous deux fois — D81 fixe l'acompte PAR SALLE (taux OU montant fixe,
// écrêté s'il dépasse), et le seuil posé après `previewDeposit`/`lineTotal`
// interdit une troisième copie de calcul monétaire côté client.
//
// ── ⚠ CHANGER UNE CONDITION INVALIDE LE TOTAL ───────────────────────────────
// Un total qui décrit d'autres conditions que celles affichées est un mensonge,
// pas un cache. Toute modification jette l'affichage du total et le DIT.
//
// ── La date vient du CALENDRIER, plus d'un `<input type="date">` ─────────────
// `VenueCalendar` rend la disponibilité réelle, le tarif du jour calculé par le
// moteur (B2/B3) et les créneaux avec leur prix. Conséquence directe : une date
// déjà vendue ne peut plus être saisie à la main.
//
// ── Ordre du DOM = ordre des numéros ────────────────────────────────────────
// La maquette place 01 et 03 à gauche, 02 à droite : lu dans le DOM, cela
// donnerait 01 → 03 → 02, donc au clavier et au lecteur d'écran aussi. Ici le DOM
// énumère 01, 02, 03 et `grid-template-areas` place. La disposition est celle de
// la maquette, le compte à rebours disparaît.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDZD } from "@zwadj/i18n";
import {
  QUOTE_SENT_VIA_ORDER,
  normalizeDzPhone,
  quoteSentViaNeedsPhone,
  type QuoteDTO,
  type QuoteSentVia,
  type ServiceDTO,
  type VenueProDTO
} from "@zwadj/types";
import { useApiErrorMessage } from "../auth/auth-ui";
import { revealAndFocus } from "../lib/reveal";
import { useBookingsPro, useQuotes, useServices } from "../venues/venue-client-context";
import { VenueCalendar } from "../venues/venue-calendar";

type Contact = { firstName: string; lastName: string; phone: string; email: string };
const NO_CONTACT: Contact = { firstName: "", lastName: "", phone: "", email: "" };

type Outcome = { kind: "locked" } | { kind: "standby" } | null;
type Catalogue = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: ServiceDTO[] };

function Step({ n, title, area, children }: { n: number; title: string; area: string; children: React.ReactNode }) {
  return (
    <section className="wk-card" style={{ gridArea: area }} aria-labelledby={`wk-step-${n}`}>
      <h2 id={`wk-step-${n}`} className="wk-card-head">
        {/* Le numéro est décoratif pour la voix : le titre suffit, et « 01 » lu
            avant chaque titre alourdit sans informer. L'ORDRE est porté par le
            DOM — c'est-à-dire par la vérité. */}
        <span className="wk-step-n" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Champ({
  label,
  value,
  onChange,
  hint,
  mode
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  mode?: "tel" | "email" | "numeric";
}) {
  const id = `wk-${label.replace(/[^a-zA-Z]/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="wk-field">
      {/* ⚠ Un vrai `<label>` VISIBLE, pas un `aria-label` seul : quatre cases
          vides côte à côte ne se distinguent pas à l'œil, et c'est exactement le
          défaut qui a été relevé sur l'écran de devis. */}
      <label className="wk-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="wk-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
        inputMode={mode}
      />
      {hint ? (
        <p id={hintId} className="wk-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function WalkinJourney({ venue }: { venue: VenueProDTO }) {
  const { t, i18n } = useTranslation();
  const quotes = useQuotes();
  const services = useServices();
  const bookings = useBookingsPro();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;
  const isAr = i18n.language === "ar";

  const [catalogue, setCatalogue] = useState<Catalogue>({ kind: "loading" });
  const [contact, setContact] = useState<Contact>(NO_CONTACT);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [dayPriceCents, setDayPriceCents] = useState<number | null>(null);
  const [guests, setGuests] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  /** ⚠ Survit à l'invalidation : c'est lui qui fait que le clic suivant RÉVISE
   *  au lieu de créer un devis de plus. */
  const [chainQuoteId, setChainQuoteId] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    services
      .listForVenue(venue.id)
      .then((list) => {
        if (cancelled) return;
        // ⚠ PAS de `Array.isArray(list) ? list : []` — D133. La garde serait
        // redondante (le `.filter` lève, le `catch` l'attrape) et NUISIBLE :
        // elle transformerait « catalogue illisible » en « aucune prestation en
        // vente », et le pro y lirait que son catalogue a été effacé.
        setCatalogue({ kind: "ready", rows: list.filter((row) => row.isActive) });
      })
      .catch(() => {
        if (!cancelled) setCatalogue({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [services, venue.id]);

  const invalidate = useCallback(() => {
    setQuote((current) => {
      if (current !== null) setStale(true);
      return null;
    });
    setOutcome(null);
  }, []);

  const pickDate = (date: string) => {
    setEventDate(date);
    setSlotId(null);
    setDayPriceCents(null);
    invalidate();
  };

  const pickSlot = (id: string, priceCents: number) => {
    setSlotId(id);
    setDayPriceCents(priceCents);
    invalidate();
  };

  const togglePick = (serviceId: string) => {
    setPicks((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]
    );
    invalidate();
  };

  const setGuestsSafe = (raw: string) => {
    setGuests(raw.replace(/[^0-9]/g, ""));
    invalidate();
  };

  const stepGuests = (delta: number) => {
    const next = Math.max(0, Math.min(venue.capacityMax, (Number(guests) || 0) + delta));
    setGuests(next === 0 ? "" : String(next));
    invalidate();
  };

  // D135 — nom, prénom et TÉLÉPHONE. Pas l'e-mail : `contact_email` est nullable
  // en base, et le client au comptoir n'en a souvent pas.
  const contactReady =
    contact.firstName.trim() !== "" && contact.lastName.trim() !== "" && contact.phone.trim() !== "";
  const termsReady = eventDate !== null && slotId !== null && Number(guests) > 0;

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(toMessageRef.current(cause));
    } finally {
      setBusy(false);
    }
  }

  const body = () => ({
    eventDate: eventDate as string,
    slotTemplateId: slotId as string,
    guests: Number(guests),
    ...(picks.length === 0 ? {} : { services: picks.map((serviceId) => ({ serviceId })) })
  });

  /** Premier calcul ⇒ création. Ensuite ⇒ RÉVISION de la même chaîne. */
  /** Le bloc du devis, pour y emmener l'utilisateur une fois qu'il existe. */
  const totalRef = useRef<HTMLElement>(null);

  /** ⚠ UN DRAPEAU, PAS UN EFFET SUR `quote` TOUT COURT. Le devis est aussi
   *  remplacé par `conclude` (conversion, acceptation) : un effet qui réagirait
   *  à n'importe quel changement de `quote` referait sauter l'écran à ces
   *  moments-là, alors que l'utilisateur n'a rien demandé. Seul le clic sur
   *  « Calculer » lève ce drapeau, et l'effet le rabaisse aussitôt. */
  const revealPending = useRef(false);

  /** ⚠ POURQUOI UN EFFET ET PAS UN APPEL DIRECT DANS `compute`. Au retour de
   *  l'appel réseau, `setQuote` n'a pas encore été rendu : le bloc n'existe pas
   *  dans le DOM et la ref vaut `null`. Il faut le rendu suivant. */
  useEffect(() => {
    if (!revealPending.current || quote === null) return;
    revealPending.current = false;
    revealAndFocus(totalRef.current);
  }, [quote]);

  const compute = () => {
    revealPending.current = true;
    void run(async () => {
      const next =
        chainQuoteId === null
          ? await quotes.create(venue.id, body())
          : await quotes.revise(chainQuoteId, body());
      setQuote(next);
      setChainQuoteId(next.id);
      setStale(false);
    });
  };

  const conclude = (lock: boolean) =>
    void run(async () => {
      if (quote === null) return;
      // ⚠ AUCUN appel intermédiaire. Le devis part tel quel : un brouillon se
      // convertit (D160). Une étape de plus ici serait un aller-retour réseau
      // dont le seul effet était de satisfaire une garde qui n'existe plus.
      const converted = await quotes.convert(quote.id, {
        contactFirstName: contact.firstName.trim(),
        contactLastName: contact.lastName.trim(),
        contactPhone: contact.phone.trim(),
        // ⚠ Clé OMISE si vide : `.email()` refuserait la chaîne vide.
        ...(contact.email.trim() === "" ? {} : { contactEmail: contact.email.trim() }),
        // Dette documentée : figé à CASH, à rouvrir avec E3.
        paymentMethod: "CASH"
      });
      setQuote(converted);
      if (!lock) {
        setOutcome({ kind: "standby" });
        return;
      }
      // ⚠ Le verrouillage appartient à la BASE. On appelle `accept` et on laisse
      // remonter `BOOKING_SLOT_TAKEN` : aucun `SELECT` préalable ne devine si la
      // date est libre — ce serait une seconde autorité sur la question (D78).
      if (converted.bookingId !== null) await bookings.accept(converted.bookingId);
      setOutcome({ kind: "locked" });
    });

  /** ⚠ D160/D158 — LA GARDE DU TÉLÉPHONE, ET SON PÉRIMÈTRE EXACT.
   *  On ne peut ni envoyer un SMS ni appeler un numéro qu'on n'a pas : ces deux
   *  canaux-là exigent donc un mobile qui passe la normalisation partagée.
   *  `PRINT` et `IN_PERSON` ne l'exigent pas — les appliquer à tous
   *  interdirait de déclarer un devis remis EN MAIN PROPRE à quelqu'un dont on
   *  n'a pas le numéro, c'est-à-dire le cas que les canaux déclaratifs existent
   *  pour couvrir.
   *  ⚠ Et la validité se demande à `normalizeDzPhone`, jamais à une expression
   *  régulière écrite ici : une seconde autorité sur « ce numéro est-il
   *  valable » finirait par diverger de la première. */
  const telOk = normalizeDzPhone(contact.phone) !== null;
  const canalBloque = (canal: QuoteSentVia) => quoteSentViaNeedsPhone(canal) && !telOk;

  /** ⚠ L'ÉCRAN DIT CE QUE LE SERVEUR A ÉCRIT, il ne le suppose pas. Le devis
   *  rendu remplace celui en mémoire, donc `sentVia` vient de la base : un 409
   *  ne produirait aucune annonce de remise. Poser le canal localement avant la
   *  réponse aurait affiché « Remise enregistrée » sur un appel refusé. */
  const remettre = (canal: QuoteSentVia) =>
    void run(async () => {
      if (quote === null) return;
      setQuote(await quotes.deliver(quote.id, { sentVia: canal }));
    });

  const conclu = outcome !== null;

  return (
    <>
      <header className="wk-head">
        <div>
          <p className="wk-eyebrow">
            <span className="wk-eyebrow-rule" aria-hidden="true" />
            {t("venue.ui.walkin.eyebrow")}
          </p>
          <h1 className="wk-title">{t("venue.ui.walkin.title")}</h1>
          <p className="wk-lede">{t("venue.ui.walkin.lede")}</p>
        </div>

        {/* Les deux issues (décision ⑥), en tête de page comme la maquette.
            « Bloquer la date » = convert + accept → ACCEPTED, la contrainte
            EXCLUDE verrouille. « Enregistrer » = convert seul → PENDING, qui ne
            verrouille RIEN : on le dit sans rien prendre.
            ⚠ Ni l'un ni l'autre n'ENCAISSE : aucune ligne `Payment` n'existe
            avant E3, et l'écran ne prétend donc jamais que l'acompte est reçu. */}
        <div className="wk-head-actions">
          <button
            type="button"
            className="wk-btn"
            disabled={busy || quote === null || !contactReady || conclu}
            onClick={() => conclude(true)}
          >
            {t("venue.ui.walkin.lockDate")}
          </button>
          <button
            type="button"
            className="wk-btn wk-btn-primary"
            disabled={busy || quote === null || !contactReady || conclu}
            onClick={() => conclude(false)}
          >
            {t("venue.ui.walkin.standby")}
          </button>
        </div>
      </header>

      {error ? (
        <p className="wk-alert" role="alert">
          {error}
        </p>
      ) : null}

      {outcome === null ? null : (
        <p className="wk-notice" role="status">
          {outcome.kind === "locked" ? t("venue.ui.walkin.doneLocked") : t("venue.ui.walkin.doneStandby")}
        </p>
      )}

      <div className="wk-grid">
        <Step n={1} area="client" title={t("venue.ui.walkin.step1")}>
          <div className="wk-pair">
            <Champ
              label={t("venue.ui.walkin.firstName")}
              value={contact.firstName}
              onChange={(v) => setContact({ ...contact, firstName: v })}
            />
            <Champ
              label={t("venue.ui.walkin.lastName")}
              value={contact.lastName}
              onChange={(v) => setContact({ ...contact, lastName: v })}
            />
          </div>
          <div className="wk-pair">
            <Champ
              label={t("venue.ui.walkin.phone")}
              value={contact.phone}
              onChange={(v) => setContact({ ...contact, phone: v })}
              hint={t("venue.ui.walkin.phoneHint")}
              mode="tel"
            />
            <Champ
              label={t("venue.ui.walkin.email")}
              value={contact.email}
              onChange={(v) => setContact({ ...contact, email: v })}
              hint={t("venue.ui.walkin.emailHint")}
              mode="email"
            />
          </div>
        </Step>

        <Step n={2} area="date" title={t("venue.ui.walkin.step2")}>
          {/* Bandeau « sélectionnée / tarif jour » : les deux valeurs viennent du
              moteur de disponibilité, aucune n'est calculée ici. */}
          <div className="wk-picked">
            <span className="wk-picked-label">{t("venue.ui.walkin.pickedDate")}</span>
            <span className="wk-picked-value">{eventDate ?? t("venue.ui.walkin.noDate")}</span>
            <span className="wk-picked-label wk-end">{t("venue.ui.walkin.dayPrice")}</span>
            <span className="wk-picked-value wk-end">
              {dayPriceCents === null ? "—" : formatDZD(dayPriceCents)}
            </span>
          </div>

          <VenueCalendar
            venueId={venue.id}
            selectedDate={eventDate}
            onSelectDate={pickDate}
            selectedSlotId={slotId}
            onSelectSlot={pickSlot}
            compact
          />

          <div className="wk-guests">
            <label className="wk-label" htmlFor="wk-guests">
              {t("venue.ui.walkin.guests")}
            </label>
            <div className="wk-stepper">
              <button
                type="button"
                className="wk-step-btn"
                onClick={() => stepGuests(-10)}
                aria-label={t("venue.ui.walkin.guestsMinus")}
              >
                −
              </button>
              <input
                id="wk-guests"
                className="wk-input wk-guests-input"
                inputMode="numeric"
                value={guests}
                onChange={(e) => setGuestsSafe(e.target.value)}
                aria-describedby="wk-guests-hint"
              />
              <button
                type="button"
                className="wk-step-btn"
                onClick={() => stepGuests(10)}
                aria-label={t("venue.ui.walkin.guestsPlus")}
              >
                +
              </button>
            </div>
            <p id="wk-guests-hint" className="wk-hint">
              {t("venue.ui.walkin.guestsHint", { max: venue.capacityMax })}
            </p>
          </div>
        </Step>

        <Step n={3} area="devis" title={t("venue.ui.walkin.step3")}>
          {/* ⚠ Le catalogue de CETTE salle, jamais une liste générique : la
              maquette propose des prestations en dur (décoration florale,
              traiteur, paliers) que le pro n'a peut-être jamais mises en vente.
              Rien n'est inventé pour remplir l'écran. */}
          {catalogue.kind === "loading" ? (
            <p className="wk-hint" aria-busy="true">
              {t("venue.ui.walkin.loadingServices")}
            </p>
          ) : catalogue.kind === "error" ? (
            <p className="wk-hint" role="status">
              {t("venue.ui.walkin.servicesError")}
            </p>
          ) : catalogue.rows.length === 0 ? (
            <p className="wk-hint">{t("venue.ui.walkin.noServices")}</p>
          ) : (
            <fieldset className="wk-services">
              <legend className="sr-only">{t("venue.ui.walkin.services")}</legend>
              {catalogue.rows.map((service) => {
                const on = picks.includes(service.id);
                return (
                  <label key={service.id} className={on ? "wk-service is-on" : "wk-service"}>
                    <input type="checkbox" checked={on} onChange={() => togglePick(service.id)} />
                    <span className="wk-service-name">{isAr ? service.nameAr : service.nameFr}</span>
                    {/* AUCUN prix ici : selon le mode de tarification il dépend
                        des invités ou d'un palier. Le montant juste est celui que
                        le serveur rendra dans les lignes du devis. */}
                    <span className="wk-service-type">{t(`venue.ui.walkin.pt_${service.pricingType}`)}</span>
                  </label>
                );
              })}
            </fieldset>
          )}

          <div className="wk-devis-actions">
            <button
              type="button"
              className="wk-btn wk-btn-primary"
              disabled={busy || !termsReady || conclu}
              onClick={compute}
            >
              {chainQuoteId === null ? t("venue.ui.walkin.compute") : t("venue.ui.walkin.editQuote")}
            </button>
            {termsReady ? null : <p className="wk-hint">{t("venue.ui.walkin.computeBlocked")}</p>}
            {stale && quote === null ? (
              <p className="wk-hint" role="status">
                {t("venue.ui.walkin.staleTotal")}
              </p>
            ) : null}
          </div>
        </Step>

        {quote === null ? null : (
          <section
            className="wk-card wk-total"
            style={{ gridArea: "total" }}
            aria-labelledby="wk-total-head"
            ref={totalRef}
            tabIndex={-1}
          >
            <h2 id="wk-total-head" className="wk-total-head">
              {t("venue.ui.walkin.totalTitle")}
            </h2>

            <dl className="wk-amounts">
              <dt>{t("venue.ui.walkin.basePrice")}</dt>
              <dd>{formatDZD(quote.basePriceCents)}</dd>
              <dt>{t("venue.ui.walkin.servicesTotal")}</dt>
              <dd>{formatDZD(quote.servicesTotalCents)}</dd>
            </dl>

            {quote.lines.length === 0 ? null : (
              <ul className="wk-lines">
                {quote.lines.map((line) => (
                  <li key={line.id}>
                    <span>
                      {isAr ? line.nameAr : line.nameFr}
                      {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                    </span>
                    <span>{formatDZD(line.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="wk-grand">
              <span>{t("venue.ui.walkin.total")}</span>
              <strong>{formatDZD(quote.totalCents)}</strong>
            </div>

            <div className="wk-deposit">
              <span>{t("venue.ui.walkin.deposit")}</span>
              <strong>{formatDZD(quote.depositCents)}</strong>
            </div>

            {/* ── ⚠ LES QUATRE CANAUX SONT DÉCLARATIFS, ET LE TEXTE LE DIT.
                   Zwadj n'imprime rien et n'envoie rien : il n'existe ni
                   générateur de PDF ni transport SMS dans le dépôt. Ces boutons
                   enregistrent COMMENT le pro a remis le devis avec ses propres
                   moyens — ils ne prétendent jamais l'avoir fait à sa place.
                   C'est le patron A8 tenu par l'autre bout : plutôt qu'un bouton
                   grisé qui explique pourquoi il ne marche pas, un bouton qui
                   marche et dont le libellé dit exactement ce qu'il fait.
                   ⚠ « Envoyer par e-mail » a DISPARU : `EMAIL` n'est pas un des
                   quatre canaux, et rien ne l'enverrait. Un cinquième bouton
                   inerte au milieu de quatre actifs aurait été le pire des
                   deux mondes. ── */}
            <fieldset className="wk-total-actions" style={{ border: 0, padding: 0, margin: "0 0 8px" }}>
              <legend className="sr-only">{t("venue.ui.walkin.deliverLegend")}</legend>
              {QUOTE_SENT_VIA_ORDER.map((canal) => (
                <button
                  key={canal}
                  type="button"
                  className="wk-btn"
                  disabled={busy || canalBloque(canal)}
                  aria-describedby={canalBloque(canal) ? "wk-deliver-reason" : undefined}
                  onClick={() => remettre(canal)}
                >
                  {t(`venue.ui.quotes.sv_${canal}`)}
                </button>
              ))}
            </fieldset>
            <p id="wk-deliver-reason" className="wk-hint">
              {telOk ? t("venue.ui.walkin.deliverHint") : t("venue.ui.walkin.deliverPhoneRequired")}
            </p>
            {quote.sentVia === null ? null : (
              <p className="wk-hint" role="status">
                {t("venue.ui.walkin.delivered", { channel: t(`venue.ui.quotes.sv_${quote.sentVia}`) })}
              </p>
            )}

            {contactReady ? null : (
              <p className="wk-hint" role="status">
                {t("venue.ui.walkin.contactRequired")}
              </p>
            )}
            <p className="wk-hint">{t("venue.ui.walkin.outcomeHint")}</p>
          </section>
        )}
      </div>
    </>
  );
}
