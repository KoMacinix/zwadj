// Panneau gauche du tableau de bord — décisions ⑦ et ⑨, refonte graphique.
//
// ── Il n'existe QUE sur le tableau de bord (décision ⑨) ─────────────────────
// Aucun autre écran pro n'en reçoit.
//
// ── Ce qu'il porte ──────────────────────────────────────────────────────────
// Le NOM de la salle, une navigation latérale vers les écrans qui existent
// RÉELLEMENT, deux compteurs, et le résumé de transformation des devis dans une
// section dépliable.
//
// ── Ce qu'il ne porte pas, et pourquoi ──────────────────────────────────────
// ⚠ PAS le bloc « Ce mois / Taux d'occupation / Prochain événement » de la
// maquette : aucune donnée ne l'alimente. Le remplir demanderait d'inventer un
// chiffre d'affaires, et un chiffre d'affaires inventé est le pire décor
// possible dans un outil de gestion.
// ⚠ PAS d'entrée « Nouvelle réservation » : c'est la page elle-même.
// ⚠ PAS d'adresse sous le nom : `venue.address` est nullable, et une ligne vide
// sous un titre se lit comme une donnée perdue.
//
// ── ⚠ « Visites en attente » n'existe pas (décision ⑦) ──────────────────────
// Les visites sont AUTO-CONFIRMÉES à la création (D58/D59) : `VisitBooking` ne
// connaît que `CONFIRMED` et `CANCELLED`. Un compteur « en attente »
// mesurerait le vide en permanence. Le compteur utile est « combien
// AUJOURD'HUI ». Les annulées sont exclues : personne ne vient.
//
// ── Deux compteurs, deux frontières ─────────────────────────────────────────
// Chaque compteur charge sa source et échoue SEUL : l'échec s'affiche à la place
// du nombre, jamais à la place du panneau.
//
// ── ⚠ ET C'EST POURQUOI IL N'Y A PAS DE `Array.isArray` ICI ─────────────────
// D133. D120 protège un `.map` situé DANS le JSX : là, une réponse malformée lève
// au rendu et emporte tout. Ici le `.filter` vit dans le chargeur, sous
// `try/catch` : l'échec est déjà contenu et s'affiche « Indisponible ». Ajouter
// `Array.isArray(list) ? list : []` remplacerait ce « Indisponible » par un **0**
// — un compte FAUX présenté comme un fait, sur une réponse de proxy en 502.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import type { QuoteConversionDTO, VenueProDTO } from "@zwadj/types";
import { BookingsIcon, CalendarIcon, RequestsIcon, VenueIcon } from "@zwadj/ui";
import { algiersToday } from "../lib/algiers-date";
import { useBookingsPro, useQuotes, useVenueVisits } from "../venues/venue-client-context";

type CountState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; value: number };

function Counter({ label, state }: { label: string; state: CountState }) {
  const { t } = useTranslation();
  return (
    <div className="pro-counter">
      <span className="pro-counter-label">{label}</span>
      {state.kind === "ready" ? (
        <strong className="pro-counter-value">{state.value}</strong>
      ) : (
        <span className="pro-counter-value pro-counter-muted">
          {state.kind === "loading" ? "…" : t("venue.ui.aside.countError")}
        </span>
      )}
    </div>
  );
}

export function DashboardAside({ venue, nowMs }: { venue: VenueProDTO; nowMs?: number }) {
  const { t, i18n } = useTranslation();
  const venuesApi = useVenueVisits();
  const bookings = useBookingsPro();
  const quotes = useQuotes();
  const isAr = i18n.language === "ar";

  // L'horloge est capturée UNE FOIS par montage : sans cela, chaque rendu
  // produirait une date nouvelle et l'effet se relancerait sans fin.
  const nowRef = useRef(nowMs ?? Date.now());
  const [visits, setVisits] = useState<CountState>({ kind: "loading" });
  const [pending, setPending] = useState<CountState>({ kind: "loading" });
  const [conversion, setConversion] = useState<QuoteConversionDTO | null>(null);
  /** Replié par défaut : c'est un indicateur de pilotage, pas la tâche du jour. */
  const [openQuotes, setOpenQuotes] = useState(false);

  const loadVisits = useCallback(async () => {
    const today = algiersToday(nowRef.current);
    try {
      const rows = await venuesApi.listVisitBookings(venue.id, { from: today, to: today });
      setVisits({ kind: "ready", value: rows.filter((row) => row.status !== "CANCELLED").length });
    } catch {
      setVisits({ kind: "error" });
    }
  }, [venuesApi, venue.id]);

  const loadPending = useCallback(async () => {
    try {
      const rows = await bookings.listForVenue(venue.id);
      setPending({ kind: "ready", value: rows.filter((row) => row.status === "PENDING").length });
    } catch {
      setPending({ kind: "error" });
    }
  }, [bookings, venue.id]);

  const loadConversion = useCallback(async () => {
    try {
      // `unknown` volontaire : le contrat PROMET un `QuoteConversionDTO`, la garde
      // existe précisément pour le cas où le réseau ne l'a pas tenu.
      const data: unknown = await quotes.conversion(venue.id);
      // ⚠ D120 — GARDE DE FORME sur un chemin de RENDU. Contrairement aux deux
      // compteurs, cette valeur part vers le JSX (`conversion.delivered`) sans
      // `try/catch` autour.
      //
      // ⚠ Ce que la mesure a corrigé dans ma propre justification : un champ de
      // mauvais TYPE n'écroule pas React — il l'affiche. Sans cette garde, un
      // résumé partiel produit « deux envoyés · undefined aboutis », c'est-à-dire
      // un indicateur de pilotage qui raconte n'importe quoi sans jamais signaler
      // d'erreur. C'est plus insidieux qu'une chute : une chute se voit.
      //
      // L'écart avec D133 tient donc : la garde se met devant un RENDU, où son
      // absence produit de l'affichage faux, jamais devant un chargeur sous
      // `try/catch`, où elle transformerait un échec honnête en valeur fausse.
      // ⚠ Q2 — LA LISTE SUIT LE CONTRAT, ET C'EST LE QUATRIÈME PIÈGE DU LOT.
      // `expired` a disparu du DTO avec `validUntil` (D160/D162). Laissé ici, il
      // n'aurait JAMAIS été un nombre : la garde serait devenue définitivement
      // fausse et le panneau aurait affiché « Résumé indisponible » en
      // permanence — sans erreur, sans test rouge, sur des données parfaitement
      // saines. Une garde de forme qui refuse la forme correcte est pire qu'une
      // garde absente : elle est indistinguable d'une panne réseau.
      const complet =
        data !== null &&
        typeof data === "object" &&
        ["delivered", "accepted", "cancelled"].every(
          (k) => typeof (data as Record<string, unknown>)[k] === "number"
        );
      setConversion(complet ? (data as QuoteConversionDTO) : null);
    } catch {
      setConversion(null);
    }
  }, [quotes, venue.id]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);
  useEffect(() => {
    void loadPending();
  }, [loadPending]);
  useEffect(() => {
    void loadConversion();
  }, [loadConversion]);

  /** ⚠ Des entrées qui mènent à des écrans EXISTANTS, et rien d'autre. La
   *  maquette propose « Prestations », « Revenus » et « Clients » : les deux
   *  premiers n'ont pas d'écran, le troisième attend UIP-E. Un lien vers une
   *  page absente apprend surtout que le site ne marche pas.
   *
   *  ⚠ ORDRE VOULU, ET IL S'ÉCARTE DE LA MAQUETTE (R2b). Celle-ci range son
   *  panneau Calendrier · Réservations · Nouvelle réservation · Clients ·
   *  Revenus · Salle & profil. L'ordre retenu part de la salle et descend vers
   *  ce qui est conclu : Ma salle → Demandes → Calendrier → Réservations. Les
   *  icônes de la maquette sont CONSERVÉES — ce qui change est la séquence, il
   *  n'y avait aucune raison de perdre l'habillage avec.
   *
   *  ⚠ « Compte » A QUITTÉ CE PANNEAU, et n'est pas devenu inaccessible pour
   *  autant : `pro-header.tsx` le porte dans le menu du compte
   *  (`account.ui.menu.settings` → `/compte`). Vérifié avant retrait — une
   *  entrée supprimée d'un menu sans second chemin, c'est une page orpheline.
   *
   *  Les libellés restent PORTÉS PAR LE TEXTE : les icônes sont décoratives
   *  (`aria-hidden` dans `@zwadj/ui`), sinon les quatre onglets deviendraient
   *  indiscernables à la voix. */
  const entries = [
    { to: "/salles", label: t("venue.ui.nav.myVenue"), icon: <VenueIcon /> },
    { to: "/demandes", label: t("venue.ui.nav.requests"), icon: <RequestsIcon /> },
    { to: "/calendrier", label: t("venue.ui.nav.calendar"), icon: <CalendarIcon /> },
    { to: "/reservations", label: t("venue.ui.nav.bookings"), icon: <BookingsIcon /> }
  ];

  return (
    <div className="pro-aside-inner">
      <p className="pro-aside-eyebrow">{t("venue.ui.aside.venueLabel")}</p>
      <p className="pro-aside-name">{isAr ? venue.nameAr : venue.nameFr}</p>

      <nav className="pro-aside-nav" aria-label={t("venue.ui.aside.navLabel")}>
        <ul>
          {entries.map((entry) => (
            <li key={entry.to}>
              <NavLink
                to={entry.to}
                className={({ isActive }) => (isActive ? "pro-aside-link is-active" : "pro-aside-link")}
              >
                <span className="pro-aside-icon">{entry.icon}</span>
                <span>{entry.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Counter label={t("venue.ui.aside.visitsToday")} state={visits} />
      <Counter label={t("venue.ui.aside.pendingRequests")} state={pending} />

      {/* ── Résumé de transformation des devis, DÉPLIABLE ──────────────────────
          Ce n'est pas un décompte de lignes mais un ENTONNOIR, compté par chaîne
          de négociation : un devis révisé trois fois compte pour un. C'est la
          seule vue où le pro voit s'il transforme.
          ⚠ `<button aria-expanded>` + panneau lié par `aria-controls`, et non un
          `<details>` : l'état doit être annoncé, et il doit rester lisible au
          clavier comme à la voix. */}
      <div className="pro-aside-fold">
        <button
          type="button"
          className="pro-fold-head"
          aria-expanded={openQuotes}
          aria-controls="pro-fold-quotes"
          onClick={() => setOpenQuotes((v) => !v)}
        >
          <span>{t("venue.ui.aside.quotesFold")}</span>
          <span className="pro-fold-chevron" aria-hidden="true">
            {openQuotes ? "−" : "+"}
          </span>
        </button>
        <div id="pro-fold-quotes" className="pro-fold-body" hidden={!openQuotes}>
          {conversion === null ? (
            <p className="pro-fold-line">{t("venue.ui.aside.quotesUnavailable")}</p>
          ) : (
            <p className="pro-fold-line">
              {t("venue.ui.quotes.stats", {
                delivered: conversion.delivered,
                accepted: conversion.accepted,
                cancelled: conversion.cancelled
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
