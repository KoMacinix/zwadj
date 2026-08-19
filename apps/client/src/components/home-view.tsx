"use client";

// Vue d'accueil — lot Accueil, sur la maquette Figma `HomePage`
// (`design.zip`, `src/imports/App.tsx`, 1576–1826).
//
// ── ⚠ AUCUN `fetch` ICI, ET LA PAGE MARCHE SANS JAVASCRIPT ──────────────────
// Même doctrine que la recherche : ce composant est CLIENT mais rendu côté
// serveur, il reçoit tout en props, et le formulaire du héros est un vrai
// `<form method="get">` vers `/salles`. La cible est un Android bas de gamme sur
// réseau lent (backlog 24.6) et la page existe pour le référencement — ne rien
// exiger de JavaScript est une décision de performance, pas un scrupule.
// Il n'y a d'ailleurs AUCUN `useState` dans ce fichier : le « use client » ne
// sert qu'à `useTranslations`.
//
// ── ⚠ CE QUI A DISPARU DU SQUELETTE ────────────────────────────────────────
// `apiStatus` — « État de l'API : ok (db: up) ». C'est de l'information
// d'exploitation ; un visiteur n'a pas à lire l'état de la base.
//
// ── ⚠ TROIS SECTIONS DE LA MAQUETTE NE SONT PAS ICI, ET C'EST ÉCRIT ────────
//  · **Zwadj Awards 2026.** La maquette nomme des lauréats. Un concours qui
//    n'existe pas, décerné par nous, à un professionnel qui ne l'a pas gagné :
//    c'est une allégation commerciale sur une entreprise réelle, pas un
//    placeholder. Elle revient le jour où un concours existe (arbitrage Ko).
//  · **« Tendance cette saison ».** Aucun signal de tendance n'existe. Même cas
//    que le tri « Recommandé » de la recherche : l'étiquette prometterait ce que
//    la donnée ne porte pas. Remplacée par « Récemment ajoutées » (arbitrage Ko),
//    qui est exactement ce que `sort=recent` rend.
//  · **Les cartes de prestataires.** Les catégories sont là, grisées ; les
//    prestataires, non — voir `lib/vendor-categories.ts`.
//
// ── ⚠ « Les salles d'exception » de la maquette est devenue « Récemment
//    ajoutées », et la petite grille prend le PRIX CROISSANT ──────────────────
// La maquette affiche `VENUES.slice(0, 6)` puis `VENUES.slice(3, 6)` : deux
// sections qui montrent, littéralement, les mêmes salles. C'est un artefact
// d'une maquette à six salles fictives, pas une intention. Et « d'exception »
// est une revendication de curation sans mécanisme de curation derrière —
// `VenueSummaryDTO` n'a aucun champ mis en avant. Les deux grilles s'adossent
// donc aux deux SEULS tris que l'API expose : `recent` et `price_asc`.
import { useLocale, useTranslations } from "next-intl";
import type { VenueListResponse } from "@zwadj/types";
import { Link } from "../i18n/navigation";
import type { VenueCardData } from "../lib/preview-venues";
import { VENDOR_CATEGORIES } from "../lib/vendor-categories";
import { VenueCard } from "./venue-card";

export interface HomeViewProps {
  /** `sort=recent`. `null` = API injoignable, distinct d'une liste vide. */
  recent: VenueListResponse | null;
  /** `sort=price_asc`. */
  affordable: VenueListResponse | null;
  /** Lien vers l'app gestionnaire. `null` = non configuré : le bloc disparaît. */
  proUrl: string | null;
  /** ⚠ Jeu de démonstration, décidé dans la page SERVEUR — jamais ici.
   *  Voir `preview-venues.ts` : importé en `import type` seulement, sans quoi
   *  six salles inventées partiraient dans le paquet de chaque visiteur. */
  previewVenues?: readonly VenueCardData[] | null;
}

/** Le nombre de cartes de chaque grille. La maquette en met 6 puis 3. */
const RECENT_COUNT = 6;
const AFFORDABLE_COUNT = 3;

export function HomeView({ recent, affordable, proUrl, previewVenues = null }: HomeViewProps) {
  const t = useTranslations("home");
  const ar = useLocale() === "ar";

  const showPreview =
    previewVenues !== null && previewVenues.length > 0 && (recent === null || recent.items.length === 0);
  const grandes: readonly VenueCardData[] = showPreview
    ? previewVenues.slice(0, RECENT_COUNT)
    : (recent?.items ?? []).slice(0, RECENT_COUNT);

  // ⚠ On EXCLUT les salles déjà montrées au-dessus. Sur un catalogue de six
  // salles, les deux tris rendent les mêmes : afficher deux fois la même carte
  // sur un même écran ferait paraître le catalogue plus petit qu'il n'est.
  const dejaVues = new Set(grandes.map((v) => v.id));
  const petites: readonly VenueCardData[] = (
    showPreview ? previewVenues : (affordable?.items ?? [])
  )
    .filter((v) => !dejaVues.has(v.id))
    .slice(0, AFFORDABLE_COUNT);

  // ⚠ Les quartiers sont RELEVÉS des salles publiées, jamais une liste en dur.
  // La maquette en fixe cinq avec un compte chacun ; le compte serait faux (il
  // ne porterait que sur la page chargée) et la liste inventée. Aucun compte
  // n'est donc affiché, et la section disparaît quand le catalogue est vide —
  // ce qui est le comportement juste.
  const quartiers = Array.from(
    new Set(
      [...grandes, ...petites]
        .map((v) => (ar ? v.districtAr : v.districtFr))
        .filter((d): d is string => d !== null && d.trim() !== "")
    )
  );

  return (
    <main className="hm">
      {/* ── HÉROS ─────────────────────────────────────────────────────────── */}
      <section className="hm-hero">
        <p className="hm-eyebrow">
          <span className="hm-ornament" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="hm-title">{t("title")}</h1>
        <p className="hm-lede">{t("subtitle")}</p>

        {/* ⚠ UN VRAI FORMULAIRE GET, pas un `onSubmit`. Le navigateur navigue
            vers /salles ; sans JavaScript, la recherche fonctionne. Les noms des
            champs sont ceux du contrat public A3 — `guests`, `maxPriceCents` —
            donc aucune traduction d'URL à maintenir. */}
        <form className="hm-search" action="/salles" method="get">
          <fieldset>
            <legend className="sr-only">{t("search.legend")}</legend>

            <div className="hm-search-field">
              <label htmlFor="hm-guests">{t("search.guests")}</label>
              <input
                id="hm-guests"
                name="guests"
                type="number"
                min={1}
                max={10_000}
                inputMode="numeric"
                placeholder={t("search.guestsPlaceholder")}
              />
            </div>

            <div className="hm-search-field">
              <label htmlFor="hm-budget">{t("search.budget")}</label>
              {/* ⚠ En CENTIMES, comme le contrat. Les paliers sont des valeurs
                  de filtre, pas des calculs : aucune arithmétique monétaire. */}
              <select id="hm-budget" name="maxPriceCents" defaultValue="">
                <option value="">{t("search.budgetAny")}</option>
                <option value="50000000">500 000 DA</option>
                <option value="100000000">1 000 000 DA</option>
                <option value="200000000">2 000 000 DA</option>
                <option value="400000000">4 000 000 DA</option>
              </select>
            </div>

            <button type="submit" className="hm-btn hm-btn-primary">
              {t("search.submit")}
            </button>
          </fieldset>
        </form>

        {/* ⚠ L'assistant est proposé À CÔTÉ du formulaire, jamais À SA PLACE :
            il exige JavaScript, le formulaire non. Un visiteur sans JS garde donc
            une recherche complète, et c'est un LIEN — pas un bouton piloté par
            un gestionnaire de clic, qui ne mènerait nulle part sans JS. */}
        <p className="hm-assistant">
          <Link href="/assistant">{t("search.assistant")}</Link>
        </p>
      </section>

      {/* ── CARTE — cartouche, comme côté recherche ───────────────────────── */}
      <section className="hm-section hm-map" aria-labelledby="hm-map-h">
        <h2 id="hm-map-h" className="hm-h2">
          {t("map.title")}
        </h2>
        {/* Aucune carte n'existe au dépôt. Le cartouche le dit, exactement comme
            la vue de recherche — pas une image de carte figée qui laisserait
            croire à une carte cassée. */}
        <p className="hm-map-soon">{t("map.soon")}</p>
      </section>

      {/* ── RÉCEMMENT AJOUTÉES ────────────────────────────────────────────── */}
      <section className="hm-section" aria-labelledby="hm-venues-h">
        <div className="hm-section-head">
          <div>
            <p className="hm-eyebrow">
              <span className="hm-ornament" aria-hidden="true" />
              {t("venues.eyebrow")}
            </p>
            <h2 id="hm-venues-h" className="hm-h2">
              {t("venues.title")}
            </h2>
          </div>
          <Link href="/salles" className="hm-btn">
            {t("venues.all")}
          </Link>
        </div>

        {showPreview ? <p className="preview-note">{t("venues.previewNotice")}</p> : null}

        {grandes.length === 0 ? (
          <p className="hm-empty">{t("venues.empty")}</p>
        ) : (
          <ul className="hm-grid hm-grid-6">
            {grandes.map((venue) => (
              <VenueCard key={venue.id} venue={venue} ar={ar} headingLevel={3} />
            ))}
          </ul>
        )}
      </section>

      {/* ── LES PLUS ACCESSIBLES ──────────────────────────────────────────── */}
      {petites.length === 0 ? null : (
        <section className="hm-section" aria-labelledby="hm-cheap-h">
          <div className="hm-section-head">
            <div>
              <p className="hm-eyebrow">
                <span className="hm-ornament" aria-hidden="true" />
                {t("affordable.eyebrow")}
              </p>
              <h2 id="hm-cheap-h" className="hm-h2">
                {t("affordable.title")}
              </h2>
            </div>
          </div>
          <p className="hm-note">{t("affordable.note")}</p>
          <ul className="hm-grid hm-grid-3">
            {petites.map((venue) => (
              <VenueCard key={venue.id} venue={venue} ar={ar} headingLevel={3} />
            ))}
          </ul>
        </section>
      )}

      {/* ── QUARTIERS ─────────────────────────────────────────────────────── */}
      <section className="hm-section" aria-labelledby="hm-districts-h">
        <p className="hm-eyebrow">
          <span className="hm-ornament" aria-hidden="true" />
          {t("districts.eyebrow")}
        </p>
        <h2 id="hm-districts-h" className="hm-h2">
          {t("districts.title")}
        </h2>
        {/* ⚠ NON CLIQUABLES, et la note le dit. Le contrat public A3 filtre par
            `cityId` (wilaya), PAS par quartier : une puce cliquable serait un
            lien mort. Le filtre manque — c'est au backlog, pas ici. */}
        {quartiers.length === 0 ? (
          <p className="hm-empty">{t("districts.empty")}</p>
        ) : (
          <>
            <ul className="hm-chips">
              {quartiers.map((q) => (
                <li key={q} className="hm-chip">
                  {q}
                </li>
              ))}
            </ul>
            <p className="hm-note">{t("districts.note")}</p>
          </>
        )}
      </section>

      {/* ── PRESTATAIRES — à venir, cartes grisées ────────────────────────── */}
      <section className="hm-section" aria-labelledby="hm-vendors-h">
        <p className="hm-eyebrow">
          <span className="hm-ornament" aria-hidden="true" />
          {t("vendors.eyebrow")}
        </p>
        <h2 id="hm-vendors-h" className="hm-h2">
          {t("vendors.title")}
        </h2>
        <p className="hm-lede hm-lede-2">{t("vendors.lede")}</p>

        {/* ⚠ DES `<li>`, PAS DES BOUTONS NI DES LIENS. Il n'y a rien à ouvrir :
            une carte désactivée resterait annoncée comme une commande, et un
            lien mort serait pire. Rien d'interactif, donc rien à désactiver.
            ⚠ Et le gris ne porte pas le message seul (WCAG 1.4.1) : chaque carte
            affiche « À venir » en TEXTE, et la note ferme la section. */}
        <ul className="hm-grid hm-grid-5 hm-vendors">
          {VENDOR_CATEGORIES.map((cat) => (
            <li key={cat} className="hm-vendor">
              {/* ⚠ ZONE MÉDIA SANS `<img>`, ET C'EST UN CHOIX MOTIVÉ.
                  La maquette met quinze photos Unsplash en absolu. Les servir
                  ici, ce serait : quinze requêtes vers un tiers sur une page
                  qui vise un Android bas de gamme en réseau lent (backlog 24.6),
                  sans `remotePatterns`, sans trace de licence, et sans qu'aucun
                  prestataire ne soit référencé derrière. Le motif ci-dessous est
                  dérivé des tokens du site, coûte zéro octet de réseau, et le
                  balisage est PRÊT : le jour où des visuels locaux existent,
                  c'est un `<img>` à poser dans ce `<span>` et rien d'autre. */}
              <span className={`hm-vendor-media hm-vendor-media-${cat}`} aria-hidden="true" />
              <span className="hm-vendor-body">
                <span className="hm-vendor-name">{t(`vendors.cat.${cat}`)}</span>
                <span className="hm-vendor-soon">{t("vendors.soon")}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="hm-note">{t("vendors.note")}</p>
      </section>

      {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────────────── */}
      <section className="hm-section hm-how" aria-labelledby="hm-how-h">
        <p className="hm-eyebrow">
          <span className="hm-ornament" aria-hidden="true" />
          {t("how.eyebrow")}
        </p>
        <h2 id="hm-how-h" className="hm-h2">
          {t("how.title")}
        </h2>
        <ol className="hm-steps">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n}>
              <span className="hm-step-n" aria-hidden="true">
                0{n}
              </span>
              <h3 className="hm-step-t">{t(`how.s${n}`)}</h3>
              <p className="hm-step-b">{t(`how.s${n}b`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── ESPACE GESTIONNAIRE ───────────────────────────────────────────── */}
      {/* ⚠ Le bloc DISPARAÎT si `PRO_URL` n'est pas configurée, au lieu de rendre
          un bouton vers nulle part. Le lien est EXTERNE : une autre application,
          sur un autre domaine, sans préfixe de locale — donc `<a>` et non le
          `Link` localisé de next-intl. */}
      {proUrl === null ? null : (
        <section className="hm-section hm-pro" aria-labelledby="hm-pro-h">
          <p className="hm-eyebrow">
            <span className="hm-ornament" aria-hidden="true" />
            {t("pro.eyebrow")}
          </p>
          <h2 id="hm-pro-h" className="hm-h2">
            {t("pro.title")}
          </h2>
          <p className="hm-lede hm-lede-2">{t("pro.lede")}</p>
          <a className="hm-btn hm-btn-primary" href={proUrl}>
            {t("pro.cta")}
          </a>
        </section>
      )}
    </main>
  );
}
