// Nouvelle réservation — client présent sur place. Lot UIP-B, puis REFONTE EN
// FLUX PAR ÉTAPES (maquette Figma « ProDashboardView », relevé du 17/08/2026).
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
// ── ⚠ CE QUE LA REFONTE CHANGE, ET CE QU'ELLE NE CHANGE PAS ─────────────────
// Elle change la PRÉSENTATION : une seule question à l'écran, les réponses
// validées se figent dans un récapitulatif qui grandit au-dessus. Elle ne
// change AUCUN appel, aucun ordre d'appel, aucune règle métier. Le devis reste
// créé au premier calcul et RÉVISÉ ensuite ; les deux issues restent
// `convert` seul (PENDING) ou `convert` + `accept` (ACCEPTED, date verrouillée).
//
// ── ⚠ AUCUN MONTANT AVANT L'ÉTAPE DEVIS — arbitrage Ko, §5.3 du cadrage ─────
// La maquette met un prix dans la ligne de récapitulatif « Date », un sous-total
// dans celle des prestations, un `+42K` sur chaque case de service, puis calcule
// `total = basePrice + svcTotal` et `deposit = Math.round(total * 0.3)`. Nous
// DÉVIONS de la maquette sur ce point, et c'est le seul écart de fond : D81 fixe
// l'acompte PAR SALLE (taux OU montant fixe, écrêté), et une arithmétique
// monétaire dans le navigateur serait une troisième copie du calcul (D188).
// Le récapitulatif accumule des RÉPONSES, jamais des MONTANTS.
//
// ── ⚠ LE RÉCAPITULATIF EST AU-DESSUS, DONC `revealAndFocus` EST STRUCTUREL ───
// Chaque étape franchie ajoute une ligne au-dessus et POUSSE la carte active
// vers le bas : à l'étape 4, sur un portable, la question active sortirait de
// l'écran. `revealAndFocus` la ramène ET y pose le focus. En position basse il
// n'aurait été qu'un confort ; ici il porte la mise en page. NE PAS LE RETIRER
// en le prenant pour de l'ornement.
//
// ── ⚠ CE QUI EST RÉPONDU SE DÉDUIT DES DONNÉES, PAS D'UN COMPTEUR ───────────
// La maquette tient un `confirmedUpTo` et le REMET À `n - 1` quand on modifie
// l'étape `n` : corriger une faute de frappe au nom du client fait disparaître
// la date, le créneau et les prestations du récapitulatif. Arbitrage Ko : les
// réponses SURVIVENT. Un compteur peut mentir sur l'état réel ; une réponse
// présente en mémoire, non. Seule l'étape des prestations a besoin d'un drapeau,
// parce que « aucune prestation » est une réponse valable et indiscernable de
// « pas encore répondu ».
//
// ── ⚠ UNE CORRECTION PEUT INVALIDER UNE RÉPONSE SUIVANTE ────────────────────
// Changer la date rend le créneau retenu caduc : il est EFFACÉ et son étape
// redevient à répondre, avec un message. Garder à l'écran un créneau qui
// n'existe plus serait pire que de le perdre.
//
// ── ⚠ AUCUNE ARITHMÉTIQUE MONÉTAIRE ICI ─────────────────────────────────────
// Le total n'apparaît qu'APRÈS le calcul serveur.
//
// ── ⚠ CHANGER UNE CONDITION INVALIDE LE TOTAL ───────────────────────────────
// Un total qui décrit d'autres conditions que celles affichées est un mensonge,
// pas un cache. Toute modification jette l'affichage du total et le DIT.
//
// ── La date vient du CALENDRIER ─────────────────────────────────────────────
// `VenueCalendar` rend la disponibilité réelle, le tarif du jour calculé par le
// moteur (B2/B3) et les créneaux avec leur prix. Une date déjà vendue ne peut
// pas être saisie à la main.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
// ⚠ `lucide-react` N'EST PLUS IMPORTÉ ICI. La coche du rail vivait dans ce
// fichier ET, sous forme de glyphe texte `✓`, dans l'assistant client — deux
// rendus pour le même signe. Elle est désormais dans `@zwadj/ui/journey`, qui
// dépend déjà de `lucide-react` : les deux applications affichent la MÊME coche
// sans que le client ait à ajouter le paquet.
import { formatDZD } from "@zwadj/i18n";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  QUOTE_SENT_VIA_ORDER,
  isPhoneComplete,
  quoteSentViaNeedsPhone,
  toE164,
  type QuoteDTO,
  type QuoteSentVia,
  type ServiceDTO,
  type VenueProDTO
} from "@zwadj/types";
import { JourneyCard, JourneyConnector, JourneyRail, JourneyRecap, NoticeDialog, PhoneField } from "@zwadj/ui";
import { useApiErrorMessage } from "../auth/auth-ui";
import { revealAndFocus } from "../lib/reveal";
import { useBookingsPro, useQuotes, useServices } from "../venues/venue-client-context";
import { VenueCalendar } from "../venues/venue-calendar";
import {
  NO_CONTACT,
  clientBlockers,
  contactBlockers,
  contactPayload,
  fieldErrors,
  type Blocker,
  type Contact
} from "./walkin-contact";

type Outcome = { kind: "locked" } | { kind: "standby" } | null;
/** Rang 32 (D325) — ce que la fenêtre de confirmation dit : l'action, la date, le client. Posé APRÈS la réponse du serveur,
 *  jamais avant : c'est un instantané de ce qui vient d'être ÉCRIT, pas de ce qui est à l'écran. */
type Done = { kind: "locked" | "standby"; date: string; client: string } | null;

/** « 2027-08-14 » → « 14 août 2027 » dans la langue de la page. `Intl` est licite ici (D57 interdit l'HEURE, pas la date) ;
 *  la date civile se lit en UTC pour ne dépendre ni du fuseau de la machine ni de celui de la salle. */
function longDate(civil: string, language: string): string {
  const [y, m, d] = civil.split("-").map(Number);
  if (!y || !m || !d) return civil;
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}
type Catalogue = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: ServiceDTO[] };

/** Les cinq étapes, dans l'ordre. ⚠ L'ordre n'est pas cosmétique : le nombre
 *  d'invités est répondu à l'étape CLIENT, donc AVANT les prestations, parce
 *  qu'une prestation par personne se chiffre `unitPrice × guests`
 *  (`service-pricing.ts`). Cocher des prestations sans avoir dit combien de
 *  personnes ferait naître des montants dont le pro n'a pas vu la base. */
const STEPS = ["client", "date", "slot", "services", "quote"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = {
  client: "venue.ui.walkin.stepClient",
  date: "venue.ui.walkin.stepDate",
  slot: "venue.ui.walkin.stepSlot",
  services: "venue.ui.walkin.stepServices",
  quote: "venue.ui.walkin.stepQuote"
};

/**
 * Un champ du parcours : libellé VISIBLE, saisie, exemple, indication, erreur.
 *
 * ⚠ L'IDENTIFIANT VIENT DE `useId()`, PAS DU LIBELLÉ. Il était dérivé du libellé en n'en gardant que les lettres latines
 * (`label.replace(/[^a-zA-Z]/g, "")`) : en arabe il ne reste RIEN, et les quatre champs du formulaire portaient le MÊME `id` —
 * « wk- ». Cliquer un libellé arabe mettait le focus sur le premier champ, et un lecteur d'écran annonçait le même nom partout.
 *
 * ⚠ L'EXEMPLE (`placeholder`) NE REMPLACE JAMAIS LE LIBELLÉ (D143) : le `<label>` reste visible et lié. L'exemple montre le FORMAT
 * attendu — un gabarit, jamais une vraie donnée.
 */
function Champ({
  label,
  value,
  onChange,
  hint,
  mode,
  placeholder,
  error,
  children
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  mode?: "tel" | "email" | "numeric";
  placeholder?: string;
  error?: string;
  /** Un autre contrôle à la place de la saisie texte (le champ de téléphone) : il reçoit l'`id` et les descriptions. */
  children?: (aria: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = `wk-${useId()}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="wk-field">
      {/* ⚠ Un vrai `<label>` VISIBLE, pas un `aria-label` seul : quatre cases
          vides côte à côte ne se distinguent pas à l'œil. La maquette, elle,
          pose un `<label>` SANS `htmlFor` — cliquer le libellé n'y met pas le
          focus et un lecteur d'écran annonce un champ sans nom. */}
      <label className="wk-label" htmlFor={id}>
        {label}
      </label>
      {children ? (
        children({ id, describedBy, invalid: error !== undefined })
      ) : (
        <input
          id={id}
          className="wk-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={error !== undefined ? true : undefined}
          inputMode={mode}
        />
      )}
      {hint ? (
        <p id={hintId} className="wk-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="wk-field-error field-error" role="alert">
          {error}
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
  const [guests, setGuests] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  /** ⚠ Survit à l'invalidation : c'est lui qui fait que le clic suivant RÉVISE
   *  au lieu de créer un devis de plus. */
  const [chainQuoteId, setChainQuoteId] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [done, setDone] = useState<Done>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<Step>("client");
  /** ⚠ LE SEUL DRAPEAU D'ÉTAPE, et il est justifié : « aucune prestation » est
   *  une réponse valable, indiscernable de « pas encore répondu » si on se
   *  contentait de regarder `picks`. Les quatre autres étapes se déduisent de
   *  leurs données, donc elles ne peuvent pas mentir. */
  const [servicesAnswered, setServicesAnswered] = useState(false);
  /** Annonce du seul effet de bord d'une correction : le créneau tombé. */
  const [slotCleared, setSlotCleared] = useState(false);

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

  // D135 — nom, prénom et TÉLÉPHONE. Pas l'e-mail : `contact_email` est nullable
  // en base, et le client au comptoir n'en a souvent pas. ⚠ Rang 32 (D325) : « prêt » ne veut plus dire « non vide » — le nom,
  // le téléphone et l'e-mail passent les règles du CONTRAT (`walkin-contact.ts`), les mêmes que celles du serveur.
  const contactReady = contactBlockers(contact).length === 0;
  const blockers = clientBlockers(contact, guests);
  const guestsReady = Number(guests) > 0;
  const clientAnswered = blockers.length === 0;
  const invalidFields = fieldErrors(contact);
  const termsReady = eventDate !== null && slotId !== null && guestsReady;

  /** ⚠ RÉPONDU SE LIT DANS LES DONNÉES. Aucun compteur ne peut diverger de
   *  l'état réel, donc revenir en arrière ne replie jamais le récapitulatif. */
  const answered: Record<Step, boolean> = useMemo(
    () => ({
      client: clientAnswered,
      date: eventDate !== null,
      slot: slotId !== null,
      services: servicesAnswered,
      quote: quote !== null
    }),
    [clientAnswered, eventDate, slotId, servicesAnswered, quote]
    // ⚠ `step` n'y figure PAS, et c'est voulu : ce que ce memo calcule ne dépend
    // que des DONNÉES. Le jour où quelqu'un y fera entrer l'étape courante, il
    // réintroduira la logique de la maquette — un récapitulatif qui se replie.
  );

  /** La première étape sans réponse — c'est là qu'on retombe après avoir
   *  corrigé une étape antérieure. ⚠ Ça règle la cascade sans code dédié : si
   *  la correction a fait tomber le créneau, c'est sur le créneau qu'on revient. */
  const firstUnanswered = (etat: Record<Step, boolean>): Step =>
    STEPS.find((s) => s !== "quote" && !etat[s]) ?? "quote";

  const cardRef = useRef<HTMLElement>(null);
  /** ⚠ UN DRAPEAU, PAS UN EFFET SUR `step` TOUT COURT — au premier rendu la
   *  carte ne doit pas voler le focus : personne n'a rien demandé. */
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    revealAndFocus(cardRef.current);
  }, [step]);

  /**
   * ⚠ REMET L'ÉCRAN À ZÉRO, PAS LE SERVEUR — et la nuance compte.
   * Si un devis a déjà été calculé, un brouillon existe côté API. On ne
   * l'annule PAS ici : `POST /quotes/:id/cancel` n'est pas exposé par le client
   * d'API, et l'inventer serait un contrat neuf sur le chemin de l'argent
   * (arrêt franc). Un DRAFT jamais remis ni converti ne verrouille rien et ne
   * facture rien — il reste dans la liste des devis du pro, ce qui est la
   * vérité : il a bien été chiffré.
   *
   * ⚠ INDISPONIBLE UNE FOIS L'AFFAIRE CONCLUE. Après `convert`, une demande
   * existe en base ; un bouton « Annuler » qui viderait l'écran laisserait
   * croire qu'elle a été annulée. Elle ne l'aurait pas été. Le bouton disparaît
   * donc, et l'écran garde son résultat.
   */
  const reset = () => {
    setContact(NO_CONTACT);
    setEventDate(null);
    setSlotId(null);
    setGuests("");
    setPicks([]);
    setQuote(null);
    setChainQuoteId(null);
    setStale(false);
    setOutcome(null);
    setDone(null);
    setError(null);
    setServicesAnswered(false);
    setSlotCleared(false);
    goTo("client");
  };

  const goTo = (next: Step) => {
    moveFocus.current = true;
    setStep(next);
  };

  const pickDate = (date: string) => {
    // ⚠ Le créneau retenu dépend de la date : il tombe, et on le DIT.
    setSlotCleared(slotId !== null && date !== eventDate);
    setEventDate(date);
    setSlotId(null);
    invalidate();
    goTo("slot");
  };

  const pickSlot = (id: string) => {
    setSlotId(id);
    setSlotCleared(false);
    invalidate();
    goTo(servicesAnswered ? "quote" : "services");
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

  /** Valider l'étape courante. On repart vers la première étape sans réponse —
   *  donc directement au devis quand tout est déjà répondu. */
  const confirmStep = () => {
    const etat = { ...answered };
    if (step === "services") {
      setServicesAnswered(true);
      etat.services = true;
    }
    if (step === "client") etat.client = clientAnswered;
    goTo(firstUnanswered(etat));
  };

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

  const compute = () => {
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
      // convertit (D160).
      const converted = await quotes.convert(quote.id, {
        // ⚠ Le corps vient de `contactPayload` : noms rognés, téléphone `+213` + les chiffres saisis, e-mail OMIS s'il est vide
        // (`.email()` refuserait la chaîne vide). La valeur envoyée est celle saisie, et le format est celui que le contrat attend.
        ...contactPayload(contact),
        // Dette documentée : figé à CASH, à rouvrir avec E3.
        paymentMethod: "CASH"
      });
      setQuote(converted);
      // ⚠ Rang 32 (D325) : la fenêtre de confirmation se prépare ICI, avec ce que le serveur vient d'écrire — jamais avant la réponse.
      const client = `${contact.firstName.trim()} ${contact.lastName.trim()}`;
      if (!lock) {
        setOutcome({ kind: "standby" });
        setDone({ kind: "standby", date: eventDate as string, client });
        return;
      }
      // ⚠ Le verrouillage appartient à la BASE. On appelle `accept` et on laisse
      // remonter `BOOKING_SLOT_TAKEN` : aucun `SELECT` préalable ne devine si la
      // date est libre — ce serait une seconde autorité sur la question (D78).
      if (converted.bookingId !== null) await bookings.accept(converted.bookingId);
      setOutcome({ kind: "locked" });
      setDone({ kind: "locked", date: eventDate as string, client });
    });

  /** ⚠ D160/D158 — LA GARDE DU TÉLÉPHONE, ET SON PÉRIMÈTRE EXACT.
   *  On ne peut ni envoyer un SMS ni appeler un numéro qu'on n'a pas : ces deux
   *  canaux-là exigent donc un mobile qui passe la normalisation partagée.
   *  `PRINT` et `IN_PERSON` ne l'exigent pas.
   *  ⚠ Et la validité se demande à `normalizeDzPhone`, jamais à une expression
   *  régulière écrite ici. */
  const telOk = isPhoneComplete(DEFAULT_PHONE_COUNTRY, contact.phone);
  const canalBloque = (canal: QuoteSentVia) => quoteSentViaNeedsPhone(canal) && !telOk;

  /** ⚠ L'ÉCRAN DIT CE QUE LE SERVEUR A ÉCRIT, il ne le suppose pas. */
  const remettre = (canal: QuoteSentVia) =>
    void run(async () => {
      if (quote === null) return;
      setQuote(await quotes.deliver(quote.id, { sentVia: canal }));
    });

  const conclu = outcome !== null;

  /** ⚠ CE QUE DIT UNE LIGNE DE RÉCAPITULATIF : DES RÉPONSES, JAMAIS DES
   *  MONTANTS. La maquette met ici le tarif du jour et le sous-total des
   *  services ; c'est l'écart assumé du lot. */
  const resume = (s: Step): string => {
    switch (s) {
      case "client": {
        const nom = `${contact.firstName.trim()} ${contact.lastName.trim()}`.trim();
        const tel = toE164(DEFAULT_PHONE_COUNTRY, contact.phone);
        return [nom, tel, t("venue.ui.walkin.guestsSummary", { count: Number(guests) })]
          .filter((part) => part !== "")
          .join(" · ");
      }
      case "date":
        return eventDate ?? "";
      case "slot":
        return slotId === null ? "" : (slotLabel(slotId) ?? slotId);
      case "services":
        return picks.length === 0
          ? t("venue.ui.walkin.noServicesPicked")
          : t("venue.ui.walkin.servicesPicked", { count: picks.length });
      case "quote":
        return "";
    }
  };

  const slotLabel = (id: string): string | null => {
    const found = venue.slotTemplates.find((s) => s.id === id);
    if (!found) return null;
    return isAr ? found.nameAr : found.nameFr;
  };

  const stepIndex = STEPS.indexOf(step);
  const question: Record<Step, { q: string; hint: string }> = {
    client: { q: "venue.ui.walkin.qClient", hint: "venue.ui.walkin.qClientHint" },
    date: { q: "venue.ui.walkin.qDate", hint: "venue.ui.walkin.qDateHint" },
    slot: { q: "venue.ui.walkin.qSlot", hint: "venue.ui.walkin.qSlotHint" },
    services: { q: "venue.ui.walkin.qServices", hint: "venue.ui.walkin.qServicesHint" },
    quote: { q: "venue.ui.walkin.qQuote", hint: "venue.ui.walkin.qQuoteHint" }
  };

  /** Rang 32 (D325) — « Précédent » : l'étape d'avant, sans rien effacer (les réponses survivent, D-maquette de la refonte). Il
   *  n'existe pas à la première étape, et il disparaît une fois l'affaire conclue — comme le rail et « Modifier », qui ne proposent
   *  plus de modifier ce qui est écrit. Il est rendu EN PREMIER dans sa ligne : à gauche en français, reflété en arabe par le sens
   *  de la page (`flex`), pas par une propriété physique. */
  const previousStep = stepIndex > 0 ? STEPS[stepIndex - 1] : undefined;
  const previousButton =
    previousStep === undefined || conclu ? null : (
      <button type="button" className="wk-btn wk-btn-previous" onClick={() => goTo(previousStep)}>
        {t("venue.ui.walkin.previous")}
      </button>
    );
  const phoneText = (kind: "country" | "placeholder" | "leadingDigit") => t(`common.phone.${kind}.${DEFAULT_PHONE_COUNTRY}`);
  const reasonText = (blocker: Blocker) =>
    t(`venue.ui.walkin.${blocker}`, { length: PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY].nationalLength });

  return (
    <>
      <header className="wk-head">
        <p className="wk-eyebrow">
          <span className="wk-eyebrow-rule" aria-hidden="true" />
          {t("venue.ui.walkin.eyebrow")}
        </p>
        <h1 className="wk-title">{t("venue.ui.walkin.title")}</h1>
        <p className="wk-lede">{t("venue.ui.walkin.lede")}</p>
        {/* « Annuler » disparaît une fois l'affaire conclue — voir `reset` : il n'annulerait rien. Rang 32 (D325) : à sa place,
            « Nouveau devis » — qui repart de l'étape 1, formulaire vidé (c'est la même remise à zéro, `reset`, et elle ne touche
            pas au serveur : la demande conclue y reste). Un seul bouton à cet emplacement, jamais les deux. */}
        <button type="button" className="wk-btn wk-head-reset" onClick={reset}>
          {conclu ? t("venue.ui.walkin.newQuote") : t("venue.ui.walkin.reset")}
        </button>
      </header>

      {/* ⚠ UNE LISTE ORDONNÉE, PAS CINQ `<div>`. La maquette n'a aucune
          sémantique ici : l'ordre, l'étape courante et le nombre total sont
          purement visuels, donc absents pour un lecteur d'écran.
          ⚠ Le fil est LATÉRAL (colonne de gauche) mais il reste le PREMIER
          élément du DOM : au clavier et à la voix, on sait où l'on en est avant
          de recevoir la question. Sa position est affaire de `grid-area`. */}
      {/* ⚠ CHROME PARTAGÉE (`@zwadj/ui`). Ce rail était recopié côté client, et
          les deux copies avaient déjà divergé. La `className` ne porte plus que
          la mise en page propre au Pro (`grid-area`, position collante). */}
      <JourneyRail
        className="wk-rail"
        label={t("venue.ui.walkin.progressLabel")}
        steps={STEPS.map((s) => ({
          id: s,
          label: t(STEP_LABEL[s]),
          state: s === step ? "current" : answered[s] ? "done" : "todo",
          // ⚠ `!conclu` en plus du Client : une fois le devis verrouillé, plus
          // rien ne se modifie — le rail ne doit pas proposer le contraire.
          editLabel:
            answered[s] && !conclu && s !== step ? t("venue.ui.walkin.editAria", { step: t(STEP_LABEL[s]) }) : undefined
        }))}
        onEdit={(id) => goTo(id as Step)}
      />

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

      {/* ── Récapitulatif : les réponses déjà données, l'étape courante exclue ── */}
      <JourneyRecap
        className="wk-recap"
        label={t("venue.ui.walkin.recapLabel")}
        editText={t("venue.ui.walkin.edit")}
        disabled={conclu}
        rows={STEPS.filter((s) => s !== "quote" && s !== step && answered[s]).map((s) => ({
          id: s,
          step: t(STEP_LABEL[s]),
          value: resume(s),
          editLabel: t("venue.ui.walkin.editAria", { step: t(STEP_LABEL[s]) })
        }))}
        onEdit={(id) => goTo(id as Step)}
      />

      {STEPS.some((s) => s !== "quote" && s !== step && answered[s]) ? (
        <JourneyConnector className="wk-connector" />
      ) : null}

      <JourneyCard stepId={step} className="wk-active" labelledBy="wk-question" cardRef={cardRef}>
        <p className="wk-step-counter">
          {t("venue.ui.walkin.stepCounter", { n: stepIndex + 1, total: STEPS.length })}
        </p>
        <h2 id="wk-question" className="wk-question">
          {t(question[step].q)}
        </h2>
        <p className="wk-hint">{t(question[step].hint)}</p>

        {step === "client" ? (
          <>
            <div className="wk-pair">
              <Champ
                label={t("venue.ui.walkin.firstName")}
                value={contact.firstName}
                onChange={(v) => setContact({ ...contact, firstName: v })}
                placeholder={t("venue.ui.walkin.firstNamePlaceholder")}
                error={invalidFields.firstName ? t("venue.ui.walkin.firstNameInvalid") : undefined}
              />
              <Champ
                label={t("venue.ui.walkin.lastName")}
                value={contact.lastName}
                onChange={(v) => setContact({ ...contact, lastName: v })}
                placeholder={t("venue.ui.walkin.lastNamePlaceholder")}
                error={invalidFields.lastName ? t("venue.ui.walkin.lastNameInvalid") : undefined}
              />
            </div>
            <div className="wk-pair">
              {/* ⚠ Le téléphone est le champ PARTAGÉ (`@zwadj/ui`) : indicatif et drapeau devant, chiffres seuls, au plus neuf,
                  premier chiffre 5, 6 ou 7. La valeur du formulaire est la suite de chiffres NATIONAUX ; `contactPayload` la convertit. */}
              <Champ
                label={t("venue.ui.walkin.phone")}
                value={contact.phone}
                onChange={(v) => setContact({ ...contact, phone: v })}
                hint={t("venue.ui.walkin.phoneHint")}
              >
                {({ id, describedBy, invalid }) => (
                  <PhoneField
                    id={id}
                    value={contact.phone}
                    onChange={(digits) => setContact({ ...contact, phone: digits })}
                    country={DEFAULT_PHONE_COUNTRY}
                    countryName={phoneText("country")}
                    placeholder={phoneText("placeholder")}
                    leadingDigitMessage={phoneText("leadingDigit")}
                    describedBy={describedBy}
                    invalid={invalid}
                  />
                )}
              </Champ>
              <Champ
                label={t("venue.ui.walkin.email")}
                value={contact.email}
                onChange={(v) => setContact({ ...contact, email: v })}
                hint={t("venue.ui.walkin.emailHint")}
                mode="email"
                placeholder={t("venue.ui.walkin.emailPlaceholder")}
                error={invalidFields.email ? t("venue.ui.walkin.emailInvalid") : undefined}
              />
            </div>

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
                  placeholder={t("venue.ui.walkin.guestsPlaceholder")}
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

            <div className="wk-actions">
              {previousButton}
              {/* ⚠ Rang 32 (D325) : « Continuer » grisé DIT POURQUOI. Une phrase générique (« prénom, nom, téléphone et nombre d'invités
                  sont nécessaires ») ne dit pas lequel manque ; la liste ci-dessous nomme ce qui retient — et `aria-describedby` la lie au
                  bouton, sans quoi un lecteur d'écran entend un bouton inactif sans motif. Un seul bouton à droite : « Précédent » n'existe
                  pas à la première étape. */}
              <button
                type="button"
                className="wk-btn wk-btn-primary wk-btn-next"
                disabled={!clientAnswered}
                aria-describedby={clientAnswered ? undefined : "wk-continue-reason"}
                onClick={confirmStep}
              >
                {t("venue.ui.walkin.continue")}
              </button>
            </div>
            {clientAnswered ? null : (
              <div id="wk-continue-reason" className="wk-blockers">
                <p className="wk-hint">{t("venue.ui.walkin.continueBlockedLead")}</p>
                <ul>
                  {blockers.map((blocker) => (
                    <li key={blocker}>{reasonText(blocker)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        {/* ⚠ UN SEUL CALENDRIER POUR LES DEUX ÉTAPES, ET C'EST STRUCTUREL.
            Deux `<VenueCalendar>` dans deux branches distinctes occupent deux
            positions différentes dans l'arbre : passer de « date » à « créneau »
            en DÉMONTERAIT un pour en monter un autre, donc rechargerait la
            disponibilité et ferait clignoter la grille — au moment précis où le
            pro vient de cliquer. Une seule instance, deux questions autour.
            ⚠ `onSelectDate` est fourni dans les DEUX cas : sans lui le
            calendrier n'est pas piloté, il ignore `selectedDate` et retombe sur
            sa sélection interne à `null` — donc aucun jour, donc aucun créneau.
            Le fournir sert aussi la cohérence : cliquer un autre jour depuis
            l'étape créneau est un changement de date, et suit la même cascade. */}
        {step === "date" || step === "slot" ? (
          <>
            {slotCleared && step === "slot" ? (
              <p className="wk-hint" role="status">
                {t("venue.ui.walkin.slotCleared")}
              </p>
            ) : null}
            {/* ⚠ `show` change ce qui est MONTRÉ, pas ce qui est monté : la
                grille du mois à l'étape « date », les créneaux du jour à l'étape
                « créneau ». Deux écrans distincts comme la maquette, sans le
                démontage qui rechargerait la disponibilité. */}
            <VenueCalendar
              venueId={venue.id}
              selectedDate={eventDate}
              onSelectDate={pickDate}
              selectedSlotId={slotId}
              onSelectSlot={(id) => pickSlot(id)}
              compact
              show={step === "date" ? "month" : "slots"}
            />
            {/* Ces deux étapes n'ont pas de « Continuer » : choisir un jour, puis un créneau, avance. « Précédent » est donc seul. */}
            {previousButton === null ? null : <div className="wk-actions">{previousButton}</div>}
          </>
        ) : null}

        {step === "services" ? (
          <>
            {/* ⚠ Le catalogue de CETTE salle, jamais une liste générique : la
                maquette propose des prestations en dur (décoration florale,
                traiteur, paliers) que le pro n'a peut-être jamais mises en
                vente. Rien n'est inventé pour remplir l'écran. */}
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
                          des invités ou d'un palier. Le montant juste est celui
                          que le serveur rendra dans les lignes du devis. */}
                      <span className="wk-service-type">{t(`venue.ui.walkin.pt_${service.pricingType}`)}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            <div className="wk-actions">
              {previousButton}
              <button type="button" className="wk-btn wk-btn-primary wk-btn-next" onClick={confirmStep}>
                {t("venue.ui.walkin.seeQuote")}
              </button>
            </div>
            <p className="wk-hint">{t("venue.ui.walkin.noAmountsYet")}</p>
          </>
        ) : null}

        {step === "quote" ? (
          <>
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

            {quote === null ? null : (
              <div className="wk-total">
                <h3 className="wk-total-head">{t("venue.ui.walkin.totalTitle")}</h3>

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
                       générateur de PDF ni transport SMS dans le dépôt. Ces
                       boutons enregistrent COMMENT le pro a remis le devis avec
                       ses propres moyens. La maquette n'en montre que deux, et
                       ils ne font rien. ── */}
                <fieldset className="wk-total-actions">
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

                {/* Les deux issues. « Bloquer la date » = convert + accept →
                    ACCEPTED, la contrainte EXCLUDE verrouille. « Enregistrer » =
                    convert seul → PENDING, qui ne verrouille RIEN.
                    ⚠ Ni l'un ni l'autre n'ENCAISSE : aucune ligne `Payment`
                    n'existe avant E3. */}
                <div className="wk-outcome-actions">
                  <button
                    type="button"
                    className="wk-btn"
                    disabled={busy || !contactReady || conclu}
                    onClick={() => conclude(true)}
                  >
                    {t("venue.ui.walkin.lockDate")}
                  </button>
                  <button
                    type="button"
                    className="wk-btn wk-btn-primary"
                    disabled={busy || !contactReady || conclu}
                    onClick={() => conclude(false)}
                  >
                    {t("venue.ui.walkin.standby")}
                  </button>
                </div>
                {contactReady ? null : (
                  <p className="wk-hint" role="status">
                    {t("venue.ui.walkin.contactRequired")}
                  </p>
                )}
                <p className="wk-hint">{t("venue.ui.walkin.outcomeHint")}</p>
              </div>
            )}
            {/* « Précédent » : l'étape des prestations. Absent une fois l'affaire conclue (`previousButton` est alors nul). */}
            {previousButton === null ? null : <div className="wk-actions">{previousButton}</div>}
          </>
        ) : null}
      </JourneyCard>

      {/* ⚠ Rang 32 (D325) : la fenêtre ne s'ouvre qu'APRÈS la réponse du serveur (`done` est posé par `conclude`, après `convert` et,
          pour « Bloquer la date », après `accept`) ; un échec la laisse fermée et dit l'erreur à la place. Elle nomme la date, l'action
          (bloquée ou enregistrée) et le client — ce que le serveur vient d'écrire. */}
      <NoticeDialog
        open={done !== null}
        title={done === null ? "" : t(done.kind === "locked" ? "venue.ui.walkin.doneTitleLocked" : "venue.ui.walkin.doneTitleStandby")}
        description={
          done === null
            ? ""
            : t(done.kind === "locked" ? "venue.ui.walkin.doneDialogLocked" : "venue.ui.walkin.doneDialogStandby", {
                date: longDate(done.date, i18n.language),
                client: done.client
              })
        }
        closeLabel={t("venue.ui.walkin.doneDialogClose")}
        onClose={() => setDone(null)}
      />
    </>
  );
}
