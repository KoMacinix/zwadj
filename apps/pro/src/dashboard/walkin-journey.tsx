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
// ⛔ Rang 41 (D336, L35-4 amendé) — LA FICHE CLIENT PRÉCÈDE LE DEVIS, et trois routes s'ajoutent :
//   0a. `POST /pro/clients/lookup`     → la fiche du pro qui porte ce numéro, PUIS cet e-mail (K-1, S-57)
//   0b. `POST /pro/clients`            → la fiche CRÉÉE au « Continuer » de l'étape Client, si aucune n'a été trouvée (K-2)
//   3b. `POST /quotes/:id/client-name` → la copie du nom qui MANQUE à la langue choisie, demandée par la boîte de langue (K-5)
// ⛔ AUCUNE autre écriture de fiche (MD-17) : ni au calcul, ni à la conversion, ni à la remise. Le devis porte la fiche et la COPIE des
// noms de l'écran (K-4) ; la conversion se PRÉREMPLIT depuis cette copie et la fiche (K-12), et elle envoie ce que l'écran affiche.
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
import { createPortal } from "react-dom";
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
  QUOTE_DOCUMENT_LOCALES,
  QUOTE_SENT_VIA_ORDER,
  isPhoneComplete,
  isValidContactEmail,
  isValidPersonName,
  quoteDocumentFilename,
  toE164,
  type ClientRecordDTO,
  type QuoteDocumentLocale,
  type QuoteDTO,
  type QuoteSentVia,
  type ServiceDTO,
  type VenueProDTO
} from "@zwadj/types";
import { ChoiceDialog, JourneyCard, JourneyConnector, JourneyRail, JourneyRecap, NoticeDialog, PhoneField, useDismissLayer } from "@zwadj/ui";
import { useApiErrorMessage } from "../auth/auth-ui";
import { revealAndFocus } from "../lib/reveal";
import { useBookingsPro, useProClients, useQuotes, useServices } from "../venues/venue-client-context";
import { VenueCalendar } from "../venues/venue-calendar";
import {
  NO_IDENTIFIANT,
  NO_NOMS,
  clientBlockers,
  contactBlockers,
  contactPayload,
  fieldErrors,
  identifierBlockers,
  identifierFieldErrors,
  identifierPayload,
  nameFieldErrors,
  type Blocker,
  type Contact,
  type Identifiant,
  type Noms
} from "./walkin-contact";
import {
  copiePourDevis,
  nomManquant,
  nomsDeLaFiche,
  nomsPourFiche,
  ordreDeRecherche,
  prefillConversion,
  type CopieDuDevis
} from "./walkin-client";
import { channelBlockers, describeRemittance, isolateLtr, wantsRealSending, type RemitOutcome, type RemitView } from "./remittance";
import { onQuoteRemitted } from "./remittance-hook";
import { saveBlob } from "./save-file";

type Outcome = { kind: "locked" } | { kind: "standby" } | null;

/** Rang 38 (D332) — ce que la boîte de langue présente pour chaque langue de document. Un `Record` sur `QuoteDocumentLocale` : ajouter une langue au contrat sans écrire son entrée ne COMPILE pas. */
const LANGUE_DU_PDF = {
  fr: { labelKey: "venue.ui.walkin.langFrench", dir: "ltr" },
  ar: { labelKey: "venue.ui.walkin.langArabic", dir: "rtl" }
} as const satisfies Record<QuoteDocumentLocale, { labelKey: string; dir: "ltr" | "rtl" }>;
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

/** Rang 41 — un devis encore sans copie du nom : la conversion n'a rien à découper (`prefillConversion`). */
const SANS_COPIE: CopieDuDevis = { clientNameAr: null, clientNameLatin: null };

/** Les SIX étapes, dans l'ordre. ⛔ Rang 41 (D336, MD-17) : le CONTACT d'abord —
 *  un numéro OU un e-mail, qui retrouve la fiche du client (K-1) —, puis les
 *  NOMS. ⚠ L'ordre n'est pas cosmétique : le nombre
 *  d'invités est répondu à l'étape CLIENT, donc AVANT les prestations, parce
 *  qu'une prestation par personne se chiffre `unitPrice × guests`
 *  (`service-pricing.ts`). Cocher des prestations sans avoir dit combien de
 *  personnes ferait naître des montants dont le pro n'a pas vu la base. */
const STEPS = ["contact", "client", "date", "slot", "services", "quote"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = {
  contact: "venue.ui.walkin.stepContact",
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
  disabled,
  dir,
  children
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  mode?: "tel" | "email" | "numeric";
  placeholder?: string;
  error?: string;
  /** Rang 41 (D336, MD-6) — un champ GRISÉ : les noms d'une fiche liée à un compte ne se modifient pas. */
  disabled?: boolean;
  /** Rang 41 (D336) — une saisie dont l'écriture varie (un nom en arabe sur une page française) : `auto` lit la direction sur son premier caractère. */
  dir?: "auto";
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
          disabled={disabled}
          dir={dir}
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

/**
 * ⛔ Rang 41 (D336, K-5) — la question du NOM qui manque à la langue choisie : la boîte de langue la pose quand le devis n'a pas encore de copie du
 * nom dans la langue du document. Même patron que les fenêtres partagées (portail, `useDismissLayer`, classes `dialog-*`) ; elle vit ICI parce qu'elle
 * porte un champ et sa règle — le nom du CONTRAT (`isValidPersonName`) —, ce qu'aucune fenêtre partagée n'a. Le champ est `Champ`, celui du parcours.
 * ⛔ « Annuler » — le bouton, Échap, le clic sur le fond — ne complète RIEN, ne remet RIEN, ne télécharge RIEN.
 * ⚠ Elle n'est MONTÉE que le temps de la question : sa saisie repart vide à chaque ouverture, sans effet de remise à zéro. Le focus initial va au
 * premier focalisable du panneau, le CHAMP : on y vient pour écrire.
 */
function NomDialog({ locale, onConfirm, onCancel }: { locale: QuoteDocumentLocale; onConfirm: (nom: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-desc`;
  const [valeur, setValeur] = useState("");
  useDismissLayer({ open: true, panelRef, onDismiss: onCancel, lockScroll: true });
  const ecriture = locale === "ar" ? "nameAr" : "nameLatin";
  const saisi = valeur.trim();
  const valide = saisi !== "" && isValidPersonName(saisi);

  return createPortal(
    <div
      className="dialog-overlay"
      // mousedown (et pas click) : une sélection de texte commencée DANS le panneau et relâchée dehors ne ferme pas la fenêtre.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div ref={panelRef} className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <h2 className="dialog-title" id={titleId}>
          {t(locale === "ar" ? "venue.ui.walkin.nameDialogTitleAr" : "venue.ui.walkin.nameDialogTitleLatin")}
        </h2>
        <p className="dialog-desc" id={descriptionId}>
          {t(locale === "ar" ? "venue.ui.walkin.nameDialogDescriptionAr" : "venue.ui.walkin.nameDialogDescriptionLatin")}
        </p>
        <Champ
          label={t(`venue.ui.walkin.${ecriture}`)}
          value={valeur}
          onChange={setValeur}
          placeholder={t(`venue.ui.walkin.${ecriture}Placeholder`)}
          error={saisi !== "" && !valide ? t(`venue.ui.walkin.${ecriture}Invalid`) : undefined}
          dir="auto"
        />
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t("venue.ui.walkin.langDialogCancel")}
          </button>
          <button type="button" className="btn btn-accent" disabled={!valide} onClick={() => onConfirm(saisi)}>
            {t("venue.ui.walkin.nameDialogConfirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function WalkinJourney({ venue }: { venue: VenueProDTO }) {
  const { t, i18n } = useTranslation();
  const quotes = useQuotes();
  const services = useServices();
  const bookings = useBookingsPro();
  const clients = useProClients();
  const toMessage = useApiErrorMessage();
  const toMessageRef = useRef(toMessage);
  toMessageRef.current = toMessage;
  const isAr = i18n.language === "ar";

  const [catalogue, setCatalogue] = useState<Catalogue>({ kind: "loading" });
  /** ⛔ Rang 41 (D336) — l'étape CONTACT : ce que le pro a tapé, un numéro (chiffres nationaux) et/ou un e-mail. */
  const [identifiant, setIdentifiant] = useState<Identifiant>(NO_IDENTIFIANT);
  /** L'identifiant pour lequel la fiche a été CHERCHÉE (K-1) — `null` = jamais. Une saisie qui s'en écarte se cherche de nouveau à « Continuer ». */
  const [cherche, setCherche] = useState<Identifiant | null>(null);
  /** La fiche du client : TROUVÉE par la recherche (K-1) ou CRÉÉE au « Continuer » de l'étape Client (K-2) ; `null` = aucune encore. */
  const [fiche, setFiche] = useState<ClientRecordDTO | null>(null);
  const [ficheTrouvee, setFicheTrouvee] = useState(false);
  /** L'étape CLIENT : les noms de CE devis (K-4) — préremplis par une fiche trouvée, modifiables ; ceux d'une fiche LIÉE s'imposent (MD-6). */
  const [noms, setNoms] = useState<Noms>(NO_NOMS);
  /** K-12 — ce que le pro a RETOUCHÉ au contact de la conversion. Le reste se PRÉREMPLIT depuis la copie du devis et la fiche (`prefillConversion`). */
  const [retouches, setRetouches] = useState<Partial<Contact>>({});
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
  /** Rang 33 (D326) — ce que la fenêtre de REMISE dit : l'instantané des deux issues (canal enregistré, PDF téléchargé), posé APRÈS les deux réponses. */
  const [remit, setRemit] = useState<RemitView | null>(null);
  /** Rang 38 (D332) — le canal dont la boîte de LANGUE est ouverte. `null` = aucune boîte. Un clic sur un canal ne remet RIEN : il ouvre la boîte, et c'est le CHOIX de la langue qui lance la remise. */
  const [langueDe, setLangueDe] = useState<QuoteSentVia | null>(null);
  /** ⛔ Rang 41 (D336, K-5) — la question du NOM ouverte par la boîte de langue : le canal et la langue choisis, en attente du nom qui manque. */
  const [nomDe, setNomDe] = useState<{ canal: QuoteSentVia; locale: QuoteDocumentLocale } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<Step>("contact");
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

  // ⛔ Rang 41 (D336) — l'étape CONTACT : un numéro OU un e-mail, valides (`identifierBlockers`). Elle est RÉPONDUE quand la fiche a été
  // cherchée pour CET identifiant : une saisie modifiée depuis se cherche de nouveau à « Continuer ».
  const raisonsContact = identifierBlockers(identifiant);
  const identifiantPret = raisonsContact.length === 0;
  const identifiantCherche = cherche !== null && cherche.phone === identifiant.phone && cherche.email.trim() === identifiant.email.trim();
  const contactAnswered = identifiantPret && identifiantCherche;
  const invalidIdentifiant = identifierFieldErrors(identifiant);
  // ⛔ MD-6 — une fiche LIÉE à un compte impose SES noms : les champs sont grisés, et le devis porte ceux de la fiche.
  const nomsVerrouilles = fiche !== null && fiche.linked;
  const nomsEffectifs: Noms = fiche !== null && fiche.linked ? nomsDeLaFiche(fiche) : noms;
  const langue: QuoteDocumentLocale = isAr ? "ar" : "fr";
  // ⛔ K-12 — le contact de la CONVERSION : PRÉREMPLI depuis la copie du devis que le serveur a rendu et depuis la fiche, puis les RETOUCHES du
  // pro par-dessus. Ce que `convert` envoie est ce que les champs affichent.
  const contact: Contact = { ...prefillConversion({ quote: quote ?? SANS_COPIE, fiche, saisie: identifiant, langue }), ...retouches };

  // D135 — nom, prénom et TÉLÉPHONE. Pas l'e-mail : `contact_email` est nullable
  // en base, et le client au comptoir n'en a souvent pas. ⚠ Rang 32 (D325) : « prêt » ne veut plus dire « non vide » — le nom,
  // le téléphone et l'e-mail passent les règles du CONTRAT (`walkin-contact.ts`), les mêmes que celles du serveur.
  const contactReady = contactBlockers(contact).length === 0;
  const blockers = clientBlockers(nomsEffectifs, guests);
  const guestsReady = Number(guests) > 0;
  const clientAnswered = blockers.length === 0;
  const invalidNames = nameFieldErrors(nomsEffectifs);
  const invalidFields = fieldErrors(contact);
  const termsReady = eventDate !== null && slotId !== null && guestsReady && fiche !== null;

  /** ⚠ RÉPONDU SE LIT DANS LES DONNÉES. Aucun compteur ne peut diverger de
   *  l'état réel, donc revenir en arrière ne replie jamais le récapitulatif. */
  const answered: Record<Step, boolean> = useMemo(
    () => ({
      contact: contactAnswered,
      // ⛔ Rang 41 : l'étape Client n'est répondue qu'une fois la fiche LÀ (trouvée ou créée) — sans elle, le devis n'aurait aucune fiche à porter.
      client: clientAnswered && fiche !== null,
      date: eventDate !== null,
      slot: slotId !== null,
      services: servicesAnswered,
      quote: quote !== null
    }),
    [contactAnswered, clientAnswered, fiche, eventDate, slotId, servicesAnswered, quote]
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
    setIdentifiant(NO_IDENTIFIANT);
    setCherche(null);
    setFiche(null);
    setFicheTrouvee(false);
    setNoms(NO_NOMS);
    setRetouches({});
    setNomDe(null);
    setEventDate(null);
    setSlotId(null);
    setGuests("");
    setPicks([]);
    setQuote(null);
    setChainQuoteId(null);
    setStale(false);
    setOutcome(null);
    setDone(null);
    setRemit(null);
    setLangueDe(null);
    setError(null);
    setServicesAnswered(false);
    setSlotCleared(false);
    goTo("contact");
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

  /** Rang 41 — les noms font partie du DEVIS (sa copie, K-4) : les changer jette le total, comme toute condition. */
  const setNomsSafe = (next: Noms) => {
    setNoms(next);
    invalidate();
  };

  /** K-12 — une retouche du pro au contact de la conversion : elle l'emporte sur le préremplissage, champ par champ. */
  const retoucher = (champ: Partial<Contact>) => setRetouches((avant) => ({ ...avant, ...champ }));

  /** Valider l'étape courante. On repart vers la première étape sans réponse —
   *  donc directement au devis quand tout est déjà répondu. */
  const confirmStep = () => {
    const etat = { ...answered };
    if (step === "services") {
      setServicesAnswered(true);
      etat.services = true;
    }
    goTo(firstUnanswered(etat));
  };

  /**
   * ⛔ Rang 41 (D336, K-1, S-57) — « Continuer » de l'étape CONTACT : la fiche du pro est cherchée par le NUMÉRO, PUIS par l'E-MAIL ; la première
   * trouvée arrête la recherche. Trouvée, elle PRÉREMPLIT les noms de ce devis ; absente, elle se créera au « Continuer » de l'étape Client (K-2).
   * ⚠ Un identifiant INCHANGÉ ne se cherche pas deux fois : revenir au contact sans rien modifier garde la fiche, et les noms qu'on y a corrigés.
   * ⚠ Un identifiant CHANGÉ désigne peut-être un autre client : le total est jeté (le devis affiché porterait la fiche et les noms d'un autre), les
   * retouches de la conversion aussi, et des noms venus de l'ANCIENNE fiche ne passent pas à la nouvelle.
   */
  const confirmContact = () => {
    // ⚠ Sans recherche à faire, AUCUN appel : la navigation reste synchrone, comme « Continuer » des autres étapes.
    if (identifiantCherche) {
      goTo(firstUnanswered(answered));
      return;
    }
    const saisi = identifiant;
    void run(async () => {
      let trouvee: ClientRecordDTO | null = null;
      for (const critere of ordreDeRecherche(saisi)) {
        const reponse = await clients.lookup(critere);
        if (reponse.found) {
          trouvee = reponse.record;
          break;
        }
      }
      if (trouvee !== null) setNoms(nomsDeLaFiche(trouvee));
      else if (ficheTrouvee) setNoms(NO_NOMS);
      setCherche(saisi);
      setFiche(trouvee);
      setFicheTrouvee(trouvee !== null);
      setRetouches({});
      invalidate();
      goTo("client");
    });
  };

  /**
   * ⛔ Rang 41 (D336, K-2, MD-17) — « Continuer » de l'étape CLIENT : sans fiche, la fiche se CRÉE ici, avec le contact et les noms TAPÉS — et c'est
   * la SEULE écriture de fiche du parcours. Une fiche déjà là n'est pas réécrite : les noms corrigés vont au devis (sa copie), pas à la fiche.
   * ⚠ Un identifiant modifié et pas encore cherché ne crée rien : on retourne au contact plutôt que de créer une fiche sur une saisie non cherchée.
   */
  const confirmClient = () => {
    // ⚠ Une fiche déjà là : AUCUN appel, la navigation reste synchrone.
    if (fiche !== null) {
      goTo(firstUnanswered({ ...answered, client: true }));
      return;
    }
    if (!contactAnswered) {
      goTo("contact");
      return;
    }
    void run(async () => {
      const { created, record } = await clients.create({ ...identifierPayload(identifiant), ...nomsPourFiche(noms) });
      setFiche(record);
      setFicheTrouvee(!created);
      goTo(firstUnanswered({ ...answered, client: true }));
    });
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
    ...(picks.length === 0 ? {} : { services: picks.map((serviceId) => ({ serviceId })) }),
    // ⛔ Rang 41 (D336, K-4) : la fiche et la COPIE des noms de l'écran — ceux de la fiche quand elle est liée (MD-6).
    ...(fiche === null ? {} : copiePourDevis(nomsEffectifs, fiche.id))
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
  /** Rang 33 (D326) : l'e-mail, FACULTATIF à la conclusion (D135), est EXIGÉ pour le canal « e-mail » — on ne remet pas par e-mail une adresse qu'on n'a pas.
   *  ⚠ Sa validité se demande au CONTRAT (`isValidContactEmail`), jamais à une expression écrite ici. */
  const emailOk = contact.email.trim() !== "" && isValidContactEmail(contact.email);
  const canalBloque = (canal: QuoteSentVia) => channelBlockers(canal, { phoneOk: telOk, emailOk }).length > 0;
  const raisonsDeBlocage = [telOk ? null : "deliverPhoneRequired", emailOk ? null : "deliverEmailRequired"].filter((r): r is string => r !== null);
  /**
   * ⛔ RANG 33 (D326) — UN BOUTON DE REMISE FAIT DEUX CHOSES INDÉPENDANTES, ET DIT CE QUI A RÉELLEMENT EU LIEU :
   *   1. ENREGISTRER le canal (`POST /quotes/:id/deliver`) — l'écran dit ce que le SERVEUR a écrit, il ne le suppose pas ;
   *   2. TÉLÉCHARGER le PDF du devis (`GET /quotes/:id/document`) — généré CÔTÉ SERVEUR, valeurs STOCKÉES, jamais un calcul d'ici.
   * Les deux partent ENSEMBLE et se règlent SÉPARÉMENT (`allSettled`) : l'un peut réussir quand l'autre échoue, et la fenêtre le DIT (`describeRemittance`).
   * La fenêtre s'ouvre APRÈS les deux réponses, jamais avant.
   *
   * ⛔ AUCUN TEXTE NE DIT QUE ZWADJ A ENVOYÉ QUOI QUE CE SOIT (Ko, 04/10/2026) : pour le SMS et l'e-mail, la fenêtre dit même l'inverse — Zwadj n'envoie
   * pas encore. `onQuoteRemitted` est le point UNIQUE du futur envoi : il ne fait rien aujourd'hui, et n'est appelé que pour ces deux canaux, une fois la remise enregistrée.
   *
   * ⚠ `busy` verrouille les boutons pendant le travail : un double clic ne fait ni deux remises ni deux téléchargements.
   * ⛔ Rang 38 (D332, décision A de Ko) : la langue du PDF est celle que le pro CHOISIT, dans la boîte que chaque bouton ouvre, à CHAQUE téléchargement — ni celle de
   * l'interface, ni celle du compte du client. Annuler la boîte n'enregistre rien et ne télécharge rien : `remettre` n'est appelée qu'au choix.
   * ⛔ Rang 41 (D336, K-5) : quand le devis n'a pas de copie du nom dans la langue choisie, `remettre` POSE LA QUESTION du nom d'abord ; la remise
   * part sur le devis que le serveur rend une fois la copie complétée (`completerLeNom`).
   */
  const remettreLeDevis = (canal: QuoteSentVia, documentLocale: QuoteDocumentLocale, courant: QuoteDTO) =>
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const [enregistre, fichier] = await Promise.allSettled([
          quotes.deliver(courant.id, { sentVia: canal }),
          quotes.document(courant.id, documentLocale)
        ]);
        if (enregistre.status === "fulfilled") setQuote(enregistre.value);
        let pdf: RemitOutcome["pdf"] = { ok: false, failure: fichier.status === "rejected" ? fichier.reason : undefined };
        if (fichier.status === "fulfilled") {
          try {
            // Rang 39 (K-7) : le nom du fichier se dérive de la référence du devis (celle du SERVEUR) et de la langue CHOISIE dans la boîte — pas de celle de l'interface.
            saveBlob(fichier.value, quoteDocumentFilename(courant, documentLocale));
            pdf = { ok: true };
          } catch (cause) {
            pdf = { ok: false, failure: cause };
          }
        }
        if (enregistre.status === "fulfilled" && wantsRealSending(canal)) onQuoteRemitted(canal, enregistre.value);
        setRemit(
          describeRemittance({
            channel: canal,
            recorded: enregistre.status === "fulfilled" ? { ok: true } : { ok: false, failure: enregistre.reason },
            pdf,
            reference: courant.reference
          })
        );
      } finally {
        setBusy(false);
      }
    })();

  /** Le CHOIX de la langue (rang 38). ⛔ Rang 41 (D336, K-5) : la copie du nom MANQUE à cette langue — la question du nom s'ouvre, et RIEN ne part
   *  avant sa réponse ; sinon la remise part tout de suite. */
  const remettre = (canal: QuoteSentVia, documentLocale: QuoteDocumentLocale) => {
    if (quote === null) return;
    if (nomManquant(quote, documentLocale)) {
      setNomDe({ canal, locale: documentLocale });
      return;
    }
    remettreLeDevis(canal, documentLocale, quote);
  };

  /**
   * ⛔ Rang 41 (D336, K-5) — la question du nom a reçu sa réponse : la copie se COMPLÈTE sur le devis (`POST /quotes/:id/client-name` ; c'est le
   * SERVEUR qui complète aussi la fiche, quand C-C3 le permet), PUIS la remise part dans cette langue, sur le devis que le serveur a rendu.
   * Un refus (409 : la copie a été complétée entre-temps) est DIT, et rien n'est remis ni téléchargé.
   */
  const completerLeNom = (nom: string) => {
    const attente = nomDe;
    setNomDe(null);
    if (attente === null || quote === null) return;
    const devis = quote;
    void (async () => {
      setBusy(true);
      setError(null);
      let complete: QuoteDTO;
      try {
        complete = await quotes.completeClientName(devis.id, { locale: attente.locale, name: nom });
      } catch (cause) {
        setError(toMessageRef.current(cause));
        setBusy(false);
        return;
      }
      setQuote(complete);
      // La remise reprend `busy` à son compte : il reste vrai jusqu'à ses deux réponses.
      remettreLeDevis(attente.canal, attente.locale, complete);
    })();
  };

  const conclu = outcome !== null;

  /** ⚠ CE QUE DIT UNE LIGNE DE RÉCAPITULATIF : DES RÉPONSES, JAMAIS DES
   *  MONTANTS. La maquette met ici le tarif du jour et le sous-total des
   *  services ; c'est l'écart assumé du lot. */
  const resume = (s: Step): string => {
    switch (s) {
      case "contact":
        return [toE164(DEFAULT_PHONE_COUNTRY, identifiant.phone), identifiant.email.trim()].filter((part) => part !== "").join(" · ");
      case "client": {
        const ecritures = isAr ? [nomsEffectifs.ar, nomsEffectifs.latin] : [nomsEffectifs.latin, nomsEffectifs.ar];
        return [...ecritures.map((nom) => nom.trim()), t("venue.ui.walkin.guestsSummary", { count: Number(guests) })]
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
    contact: { q: "venue.ui.walkin.qContact", hint: "venue.ui.walkin.qContactHint" },
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
  /** ⚠ UN SEUL CHAMP DE TÉLÉPHONE ÉCRIT, rendu à deux étapes — le contact (qui cherche la fiche) et la conversion (qui part avec la demande).
   *  Le champ PARTAGÉ (`@zwadj/ui`) : indicatif et drapeau devant, chiffres seuls, au plus neuf, premier chiffre 5, 6 ou 7. La valeur est la suite
   *  de chiffres NATIONAUX ; `identifierPayload` et `contactPayload` la convertissent. Deux copies de ce bloc avaient de quoi diverger. */
  const champTelephone = (value: string, onChange: (digits: string) => void) => (
    <Champ label={t("venue.ui.walkin.phone")} value={value} onChange={onChange} hint={t("venue.ui.walkin.phoneHint")}>
      {({ id, describedBy, invalid }) => (
        <PhoneField
          id={id}
          value={value}
          onChange={onChange}
          country={DEFAULT_PHONE_COUNTRY}
          countryName={phoneText("country")}
          placeholder={phoneText("placeholder")}
          leadingDigitMessage={phoneText("leadingDigit")}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    </Champ>
  );
  /** Les deux noms, l'écriture de l'INTERFACE d'abord (comme le récapitulatif). Grisés quand la fiche est liée (MD-6). */
  const champsDesNoms = [
    <Champ
      key="ar"
      label={t("venue.ui.walkin.nameAr")}
      value={nomsEffectifs.ar}
      onChange={(v) => setNomsSafe({ ...noms, ar: v })}
      placeholder={t("venue.ui.walkin.nameArPlaceholder")}
      error={invalidNames.ar ? t("venue.ui.walkin.nameArInvalid") : undefined}
      disabled={nomsVerrouilles}
      dir="auto"
    />,
    <Champ
      key="latin"
      label={t("venue.ui.walkin.nameLatin")}
      value={nomsEffectifs.latin}
      onChange={(v) => setNomsSafe({ ...noms, latin: v })}
      placeholder={t("venue.ui.walkin.nameLatinPlaceholder")}
      error={invalidNames.latin ? t("venue.ui.walkin.nameLatinInvalid") : undefined}
      disabled={nomsVerrouilles}
      dir="auto"
    />
  ];

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

        {step === "contact" ? (
          <>
            {/* ⛔ Rang 41 (D336, MD-17) : le CONTACT est la première étape — un numéro OU un e-mail. C'est lui qui retrouve la fiche du client
                (K-1), d'abord par le numéro, puis par l'e-mail (S-57) ; la recherche ne montre rien d'un compte Zwadj (M-4). */}
            <div className="wk-pair">
              {champTelephone(identifiant.phone, (digits) => setIdentifiant({ ...identifiant, phone: digits }))}
              <Champ
                label={t("venue.ui.walkin.contactEmail")}
                value={identifiant.email}
                onChange={(v) => setIdentifiant({ ...identifiant, email: v })}
                mode="email"
                placeholder={t("venue.ui.walkin.emailPlaceholder")}
                error={invalidIdentifiant.email ? t("venue.ui.walkin.emailInvalid") : undefined}
              />
            </div>
            <div className="wk-actions">
              {previousButton}
              {/* Même règle que l'étape Client (rang 32) : « Continuer » grisé DIT POURQUOI, et la liste est liée au bouton. */}
              <button
                type="button"
                className="wk-btn wk-btn-primary wk-btn-next"
                disabled={!identifiantPret || busy}
                aria-describedby={identifiantPret ? undefined : "wk-continue-reason"}
                onClick={confirmContact}
              >
                {t("venue.ui.walkin.continue")}
              </button>
            </div>
            {busy ? (
              <p className="wk-hint" role="status">
                {t("venue.ui.walkin.searching")}
              </p>
            ) : null}
            {identifiantPret ? null : (
              <div id="wk-continue-reason" className="wk-blockers">
                <p className="wk-hint">{t("venue.ui.walkin.continueBlockedLead")}</p>
                <ul>
                  {raisonsContact.map((blocker) => (
                    <li key={blocker}>{reasonText(blocker)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        {step === "client" ? (
          <>
            {/* ⛔ Rang 41 (D336) : ce que la recherche a dit — une fiche RETROUVÉE (ses noms préremplissent CE devis, modifiables), une fiche LIÉE
                (ses noms s'imposent, MD-6), ou AUCUNE (la fiche se créera à « Continuer », K-2). Une fiche créée à ce « Continuer » ne dit plus rien. */}
            {fiche === null ? (
              <p className="wk-hint">{t("venue.ui.walkin.ficheNew")}</p>
            ) : nomsVerrouilles ? (
              <p className="wk-hint">{t("venue.ui.walkin.ficheLinked")}</p>
            ) : ficheTrouvee ? (
              <p className="wk-hint">{t("venue.ui.walkin.ficheFound")}</p>
            ) : null}
            <div className="wk-pair">{isAr ? champsDesNoms : [...champsDesNoms].reverse()}</div>

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
                disabled={!clientAnswered || busy}
                aria-describedby={clientAnswered ? undefined : "wk-continue-reason"}
                onClick={confirmClient}
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
                {/* Rang 39 (D333, DB-10) : la référence rendue par le SERVEUR, jamais bâtie ici ; isolée de gauche à droite (en arabe, l'algorithme bidirectionnel en inverserait les groupes). */}
                <p className="wk-reference">
                  <span>{t("venue.ui.walkin.reference")}</span> <bdi dir="ltr">{quote.reference}</bdi>
                </p>

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

                {/* ⛔ Rang 41 (D336, K-12) — les COORDONNÉES de la conclusion, et de la remise (le SMS et l'appel lisent ce numéro, l'e-mail cette
                    adresse) : PRÉREMPLIES depuis la copie du nom que le serveur vient de rendre — coupée au PREMIER espace (MD-9) — et depuis la
                    fiche. Les quatre champs restent MODIFIABLES : `convert` envoie ce qu'ils affichent. Rien n'est réécrit dans la fiche. */}
                <div>
                  <h3 className="wk-total-head">{t("venue.ui.walkin.conversionTitle")}</h3>
                  <p className="wk-hint">{t("venue.ui.walkin.conversionHint")}</p>
                  <div className="wk-pair">
                    <Champ
                      label={t("venue.ui.walkin.firstName")}
                      value={contact.firstName}
                      onChange={(v) => retoucher({ firstName: v })}
                      placeholder={t("venue.ui.walkin.firstNamePlaceholder")}
                      error={invalidFields.firstName ? t("venue.ui.walkin.firstNameInvalid") : undefined}
                    />
                    <Champ
                      label={t("venue.ui.walkin.lastName")}
                      value={contact.lastName}
                      onChange={(v) => retoucher({ lastName: v })}
                      placeholder={t("venue.ui.walkin.lastNamePlaceholder")}
                      error={invalidFields.lastName ? t("venue.ui.walkin.lastNameInvalid") : undefined}
                    />
                  </div>
                  <div className="wk-pair">
                    {champTelephone(contact.phone, (digits) => retoucher({ phone: digits }))}
                    <Champ
                      label={t("venue.ui.walkin.email")}
                      value={contact.email}
                      onChange={(v) => retoucher({ email: v })}
                      hint={t("venue.ui.walkin.emailHint")}
                      mode="email"
                      placeholder={t("venue.ui.walkin.emailPlaceholder")}
                      error={invalidFields.email ? t("venue.ui.walkin.emailInvalid") : undefined}
                    />
                  </div>
                </div>

                {/* ── ⚠ LES CINQ CANAUX SONT DÉCLARATIFS, ET LE TEXTE LE DIT.
                       Rang 33 (D326) : chaque bouton ENREGISTRE comment le pro a remis le devis ET télécharge son PDF récapitulatif (généré côté
                       serveur, valeurs stockées). Zwadj n'envoie RIEN : aucun transport SMS ni e-mail n'existe encore, et aucun écran ne dit que Zwadj
                       a envoyé quoi que ce soit. La maquette n'en montre que deux, et ils ne font rien. ── */}
                <fieldset className="wk-total-actions">
                  <legend className="sr-only">{t("venue.ui.walkin.deliverLegend")}</legend>
                  {QUOTE_SENT_VIA_ORDER.map((canal) => (
                    <button
                      key={canal}
                      type="button"
                      className="wk-btn"
                      disabled={busy || canalBloque(canal)}
                      aria-describedby={canalBloque(canal) ? "wk-deliver-reason" : undefined}
                      onClick={() => setLangueDe(canal)}
                    >
                      {t(`venue.ui.quotes.sv_${canal}`)}
                    </button>
                  ))}
                </fieldset>
                <p className="wk-hint">{t("venue.ui.walkin.deliverHint")}</p>
                {raisonsDeBlocage.length === 0 ? null : (
                  <p id="wk-deliver-reason" className="wk-hint">
                    {raisonsDeBlocage.map((raison) => t(`venue.ui.walkin.${raison}`)).join(" ")}
                  </p>
                )}
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

      {/* ⛔ Rang 38 (D332) : la boîte de LANGUE. Chaque bouton de remise l'ouvre ; le choix lance l'enregistrement ET le PDF dans la langue choisie, « Annuler » (le bouton, Échap, le fond)
          ne lance RIEN. Les libellés de langue sont écrits dans leur propre langue et déclarent leur `lang` et leur `dir`. */}
      <ChoiceDialog
        open={langueDe !== null}
        title={t("venue.ui.walkin.langDialogTitle")}
        description={t("venue.ui.walkin.langDialogDescription")}
        options={QUOTE_DOCUMENT_LOCALES.map((locale) => ({ id: locale, label: t(LANGUE_DU_PDF[locale].labelKey), lang: locale, dir: LANGUE_DU_PDF[locale].dir }))}
        cancelLabel={t("venue.ui.walkin.langDialogCancel")}
        onChoose={(locale) => {
          const canal = langueDe;
          setLangueDe(null);
          if (canal !== null) remettre(canal, locale);
        }}
        onCancel={() => setLangueDe(null)}
      />

      {/* ⛔ Rang 41 (D336, K-5) : la question du NOM qui manque à la langue choisie — montée le temps de la question seulement. Valider complète la
          copie sur le devis, PUIS remet et télécharge dans cette langue ; « Annuler » ne fait RIEN. */}
      {nomDe === null ? null : <NomDialog locale={nomDe.locale} onConfirm={completerLeNom} onCancel={() => setNomDe(null)} />}

      {/* ⚠ Rang 33 (D326) : la fenêtre de REMISE. Elle ne s'ouvre qu'APRÈS les deux réponses (l'enregistrement du canal ET le PDF) et dit ce qui a RÉELLEMENT eu lieu,
          issue par issue — jamais « tout est fait » quand l'un des deux a échoué. Aucune ligne ne dit que Zwadj a envoyé quoi que ce soit. */}
      <NoticeDialog
        open={remit !== null}
        title={remit === null ? "" : t(`venue.ui.walkin.${remit.titleKey}`)}
        description={
          remit === null
            ? ""
            : remit.lines
                .map((ligne) =>
                  t(`venue.ui.walkin.${ligne.key}`, {
                    reference: ligne.reference === undefined ? undefined : isolateLtr(ligne.reference),
                    channel: ligne.channel === undefined ? undefined : t(`venue.ui.quotes.sv_${ligne.channel}`),
                    reason: ligne.failure === undefined ? undefined : toMessage(ligne.failure)
                  })
                )
                .join(" ")
        }
        closeLabel={t("venue.ui.walkin.doneDialogClose")}
        onClose={() => setRemit(null)}
      />
    </>
  );
}
