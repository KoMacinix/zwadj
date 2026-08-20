"use client";

// Lot A7 — vue de la recherche, remaniée au Lot UI-D5 sur le design de
// référence. Composant CLIENT, mais rendu côté serveur : il ne fait aucun
// `fetch`, il reçoit tout en props. Le « use client » sert uniquement au
// confort JS (soumission du tri au changement, bascule grille/carte) — sans
// lui, la page reste ENTIÈREMENT fonctionnelle :
//
//   - les filtres sont un vrai `<form method="get">`, le navigateur navigue ;
//   - le tri appartient toujours à ce formulaire et se valide avec lui ;
//   - la pagination est faite de LIENS, pas d'un « charger plus » — un bouton
//     JS ne produit aucune URL indexable, et cette page existe pour le
//     référencement.
//
// Cible Android bas de gamme sur réseau lent (backlog 24.6) : ne rien exiger
// de JavaScript ici est une décision de performance, pas un scrupule.
//
// ── Ce que UI-D5 a changé, et pourquoi ──────────────────────────────────────
//  - **Le tri a QUITTÉ le panneau** pour la barre de résultats, à droite, comme
//    le design. Il n'a PAS quitté le formulaire pour autant : l'attribut HTML
//    `form="search-filters"` rattache un contrôle à un formulaire dont il n'est
//    pas descendant. C'est ce qui permet de le placer où le design le veut sans
//    reperdre la soumission sans JavaScript. Son libellé passe en `.sr-only` —
//    le design n'en montre pas, un lecteur d'écran en a besoin.
//  - **`Recommandé` est une ÉTIQUETTE, pas une valeur.** `VENUE_LIST_SORTS` n'a
//    pas de tri recommandé et n'aurait aucun signal à consommer avant le Flux B
//    (notes, taux d'acceptation). La valeur soumise reste `recent` : le contrat
//    A3, sa requête SQL et ses tests d'intégration ne sont pas rouverts. Le jour
//    où le signal existera, la valeur changera sous l'étiquette.
//  - **La bascule grille/carte est un `useState`, pas un paramètre d'URL.** Elle
//    ne gouverne qu'un cartouche « Carte à venir » : aucun contenu indexable
//    n'en dépend, donc rien à mettre dans l'URL. Le jour où la carte existe,
//    elle passera par `toPublicQuery` comme le reste.
//  - **Le cartouche de carte a quitté le bas de page** : il n'y est pas dans le
//    design, et il annonçait un report sous des résultats qui n'en parlaient
//    pas. Il EST maintenant la vue carte.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import { CEREMONY_TYPE_FILTERS, type AmenityDTO, type VenueStyleDTO, type WilayaDTO } from "@zwadj/types";
import { AmenityIcon, GridViewIcon, MapViewIcon } from "@zwadj/ui";
import { Link } from "../../i18n/navigation";
// ⚠ La carte a QUITTÉ ce fichier pour `components/venue-card.tsx` : l'accueil
// rend les mêmes salles, et deux copies auraient divergé à la première
// correction. Le rendu est inchangé — ses tests n'ont pas bougé.
import { VenueCard } from "../venue-card";
// ⚠ `import type` et NON un import de valeur : le type est effacé à la
// compilation, la DONNÉE ne l'est pas. Importer `PREVIEW_VENUES` ici la
// ferait entrer dans le bundle NAVIGATEUR — le `tree-shaking` ne peut pas la
// retirer, puisque son usage dépend d'une prop évaluée à l'exécution. Six
// salles inventées partaient ainsi chez chaque visiteur en production.
import type { VenueCardData } from "../../lib/preview-venues";
import type { SearchOutcome } from "../../lib/api";
import {
  BUDGET_CEILING,
  BUDGET_FLOOR,
  BUDGET_STEP,
  CAPACITY_CEILING,
  CAPACITY_FLOOR,
  CAPACITY_STEP,
  pageWindow,
  toPublicQuery,
  type SearchState
} from "../../lib/search-query";

/** Le tri vit hors du `<form>` mais lui APPARTIENT (attribut HTML `form`).
 *  L'identifiant est donc partagé entre les deux, et déclaré une seule fois. */
const FILTERS_FORM_ID = "search-filters";

type ResultView = "grid" | "map";

export interface SearchViewProps {
  state: SearchState;
  /** Lot `availableOn` — l'ISSUE de la recherche, pas seulement son résultat.
   *  `unreachable` ≠ résultat vide : on ne dit pas « aucune salle » quand on
   *  n'en sait rien. Et `past-date` ≠ `unreachable` : « la recherche est
   *  momentanément indisponible » invite à réessayer une requête qui ne
   *  marchera jamais. */
  outcome: SearchOutcome;
  wilayas: WilayaDTO[];
  amenities: AmenityDTO[];
  /** Référentiel des styles (D65). Vide si l'API n'a pas répondu : le panneau
   *  perd ses puces, la recherche continue. */
  styles: VenueStyleDTO[];
  /** UI-D5 — salles FICTIVES à afficher quand la recherche ne rend rien.
   *
   *  ⚠ C'est la DONNÉE qui est passée, pas un drapeau : la vue est un composant
   *  CLIENT, et tout ce qu'elle importe part dans le bundle du navigateur.
   *  Fournie par la page serveur en développement seulement. Par défaut `null` :
   *  une consommation oubliée ne peut pas faire fuiter de fausses salles. */
  previewVenues?: readonly VenueCardData[] | null;
}

export function SearchView({ state, outcome, wilayas, amenities, styles, previewVenues = null }: SearchViewProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const ar = locale === "ar";
  const [view, setView] = useState<ResultView>("grid");

  const results = outcome.kind === "ok" ? outcome.data : null;
  const totalPages = results ? Math.max(1, Math.ceil(results.total / results.pageSize)) : 1;

  /** ⚠ La date d'annotation vient de l'ÉCHO de la réponse, jamais de l'état
   *  local. Sans cela l'écran écrirait « indisponible le 2 juin » à côté d'une
   *  annotation que le serveur aurait, elle, calculée sur un autre jour — le
   *  même piège que les bornes effectives de D49. */
  const annotatedOn = results?.availableOn ?? null;

  // Le repli de démonstration ne MASQUE rien : il ne s'active que là où la page
  // n'avait de toute façon aucune salle à montrer.
  const showPreview = previewVenues !== null && previewVenues.length > 0 && (results === null || results.items.length === 0);
  const items: readonly VenueCardData[] = showPreview ? (previewVenues as readonly VenueCardData[]) : (results?.items ?? []);
  const total = showPreview ? items.length : (results?.total ?? 0);

  return (
    // UI-D5 — la grille est PLEINE LARGEUR : la barre latérale du design est à
    // fleur de bord d'écran, ce qu'un conteneur centré à 1100 px rendait
    // impossible. Le confort de lecture est repris par le rembourrage de la
    // colonne de résultats, pas par une largeur maximale du document.
    <main className="search-shell">
      <SearchFilters state={state} wilayas={wilayas} amenities={amenities} styles={styles} ar={ar} />

      <section className="search-results">
        <div className="results-head">
          <div className="results-heading">
            <h1 className="results-title">{t("title")}</h1>
            {items.length > 0 ? (
              // Le nombre est ACCENTUÉ, le reste en encre secondaire (design).
              // D'où `t.rich` et une balise `<n>` dans le message : découper la
              // phrase en deux clés obligerait chaque langue à placer le nombre
              // au même endroit, ce que l'arabe ne fait pas toujours.
              <p role="status" className="results-count">
                {total === 1
                  ? t.rich("results.countOne", { n: (chunks) => <span className="results-count-n">{chunks}</span> })
                  : t.rich("results.count", {
                      count: total,
                      n: (chunks) => <span className="results-count-n">{chunks}</span>
                    })}
              </p>
            ) : null}
          </div>

          <div className="results-tools">
            {/* Libellé masqué VISUELLEMENT, pas retiré : le design ne montre
                qu'une liste, un lecteur d'écran a besoin de savoir ce qu'elle
                trie. `.sr-only` vient de `@zwadj/ui` (Lot A9). */}
            <label className="sr-only" htmlFor="f-sort">
              {t("sort.label")}
            </label>
            <select
              id="f-sort"
              name="sort"
              // ⚠ C'est CET attribut qui garde la page utilisable sans
              // JavaScript alors que le contrôle a quitté le `<form>`.
              form={FILTERS_FORM_ID}
              className="sort-select"
              defaultValue={state.sort}
              // Confort JS : le tri s'applique au changement. Sans JS, le bouton
              // « Afficher les résultats » du panneau le valide comme avant.
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
              {/* ⚠ La VALEUR reste `recent` — voir l'en-tête de fichier. */}
              <option value="recent">{t("sort.recommended")}</option>
              <option value="price_asc">{t("sort.price_asc")}</option>
              <option value="price_desc">{t("sort.price_desc")}</option>
            </select>

            <div className="view-switch" role="group" aria-label={t("view.label")}>
              {(["grid", "map"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={view === id ? "view-switch-btn is-active" : "view-switch-btn"}
                  // `aria-pressed` et non `aria-current` : ce sont deux bascules
                  // d'affichage, pas deux emplacements dans une navigation.
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                >
                  {id === "grid" ? <GridViewIcon /> : <MapViewIcon />}
                  <span className="sr-only">{t(`view.${id}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "map" ? (
          // Décision produit n°2 : la carte est reportée post-MVP, et on le DIT
          // plutôt que de laisser un vide.
          <div className="map-panel">
            <h2 className="map-panel-title">{t("map.title")}</h2>
            <p className="map-panel-body">{t("map.soon")}</p>
          </div>
        ) : outcome.kind === "past-date" ? (
          // ⚠ AVANT la branche de panne, et c'est tout l'intérêt du type
          // `SearchOutcome` : ce refus n'est pas un incident. Le sélecteur de
          // date ne propose aucune date passée — arriver ici veut dire lien
          // forgé, favori d'une saison à l'autre, ou défaut. On le DIT, et on
          // offre le retour vers la recherche sans date plutôt qu'un
          // « réessayez » qui ne marchera jamais.
          <div className="state-panel" role="alert">
            <h2>{t("availableOn.pastTitle")}</h2>
            <p>{t("availableOn.pastBody")}</p>
            <p>
              <Link href={`/salles${toPublicQuery({ ...state, availableOn: "" })}`} className="btn btn-accent">
                {t("availableOn.pastAction")}
              </Link>
            </p>
          </div>
        ) : results === null && !showPreview ? (
          <div className="state-panel" role="alert">
            <h2>{t("results.errorTitle")}</h2>
            <p>{t("results.errorBody")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="state-panel">
            <h2>{t("results.emptyTitle")}</h2>
            <p>{t("results.emptyBody")}</p>
          </div>
        ) : (
          <>
            {/* Des salles inventées qu'on ne distingue pas des vraies sont un
                piège à démonstrations : le bandeau est la contrepartie du
                repli, pas une politesse. */}
            {showPreview ? <p className="preview-note">{t("preview.notice")}</p> : null}

            {/* Liste NOMMÉE : le nom de commune apparaît aussi dans le
                sélecteur de filtre — sans nom, ni un lecteur d'écran ni un
                test ne distinguent les deux régions. Réutilise le titre,
                aucune clé neuve. */}
            {/* Bandeau de contexte : sans lui, un visiteur qui reçoit une URL
                partagée voit des salles grisées sans savoir POURQUOI. La date
                est celle de l'écho, pas celle de l'URL. */}
            {annotatedOn === null ? null : (
              <p className="results-annotated" role="status">
                {t("availableOn.notice", { date: annotatedOn })}
              </p>
            )}

            <ul aria-label={t("title")} className="venue-grid">
              {items.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  ar={ar}
                  // ⚠ `=== false` STRICTEMENT. `availableOnDate` a trois
                  // valeurs : `null` veut dire « rien à dire » (question non
                  // posée, ou salle sans créneau actif) et ne doit RIEN griser.
                  // Un `!venue.availableOnDate` griserait tout le catalogue le
                  // jour où la question n'est pas posée.
                  unavailableOn={venue.availableOnDate === false ? annotatedOn : null}
                />
              ))}
            </ul>

            {!showPreview && totalPages > 1 ? (
              <nav aria-label={t("pagination.label")} style={{ marginBlockStart: 28 }}>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
                  {state.page > 1 ? (
                    <li>
                      <Link href={`/salles${toPublicQuery(state, state.page - 1)}`} className="btn btn-ghost">
                        {t("pagination.previous")}
                      </Link>
                    </li>
                  ) : null}

                  {pageWindow(state.page, totalPages).map((page, index) =>
                    page === null ? (
                      <li key={`gap-${index}`} aria-hidden="true" style={{ padding: "8px 4px", color: "var(--ink-mute)" }}>
                        …
                      </li>
                    ) : (
                      <li key={page}>
                        <Link
                          href={`/salles${toPublicQuery(state, page)}`}
                          className={page === state.page ? "btn btn-accent" : "btn btn-ghost"}
                          aria-label={
                            page === state.page ? t("pagination.current", { page }) : t("pagination.page", { page })
                          }
                          aria-current={page === state.page ? "page" : undefined}
                        >
                          {page}
                        </Link>
                      </li>
                    )
                  )}

                  {state.page < totalPages ? (
                    <li>
                      <Link href={`/salles${toPublicQuery(state, state.page + 1)}`} className="btn btn-ghost">
                        {t("pagination.next")}
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

/** Carte de salle du design de référence.
 *
 *  ⚠ Note, nombre d'avis et pastille sont CONDITIONNELS : `VenueSummaryDTO` ne
 *  les porte pas (les avis relèvent du Flux B), seules les salles de
 *  démonstration en ont aujourd'hui. Une salle réelle sort donc sans étoile —
 *  c'est voulu, une note inventée serait pire qu'une note absente.
 *
 *  ⚠ La capacité s'affiche « Jusqu'à N invités », là où le design montre
 *  « 150-600 invités » : D36 (Lot A9) a SUPPRIMÉ `capacityMin` du schéma, de
 *  l'API et du formulaire Pro. Rétablir la fourchette est une réouverture de
 *  D36, pas un ajustement d'affichage.
 *
 *  ⚠ Le cœur n'est PAS dans le lien : imbriquer un bouton dans une ancre est
 *  invalide et casse le clavier. Il est frère du lien, calé en absolu. */
function SearchFilters({
  state,
  wilayas,
  amenities,
  styles,
  ar
}: {
  state: SearchState;
  wilayas: WilayaDTO[];
  amenities: AmenityDTO[];
  styles: VenueStyleDTO[];
  ar: boolean;
}) {
  const t = useTranslations("search");
  const tCeremony = useTranslations("venue.ceremonyType");
  // Contrôlé : c'est la seule façon de DÉCOCHER une radio au clic. Sans JS, les
  // `checked` initiaux suffisent et le formulaire se soumet normalement.
  const [ceremony, setCeremony] = useState(state.ceremonyType);

  return (
    // `method="get"` : la NAVIGATION est faite par le navigateur. Aucune
    // dépendance à `useRouter`, donc la page filtre sans JavaScript.
    // Conséquence voulue : soumettre REMPLACE toute la querystring, ce qui
    // remet la pagination à la page 1 — changer de filtre en restant page 7
    // n'aurait aucun sens.
    // ⚠ `id` OBLIGATOIRE : le tri vit dans la barre de résultats et se rattache
    // ici par son attribut `form`. Le retirer casse le filtrage sans JS.
    <form method="get" id={FILTERS_FORM_ID} className="filters">
      <div className="filters-head">
        <h2 className="filters-title">{t("filters.legend")}</h2>
        <Link href="/salles" className="filters-reset">
          {t("filters.reset")}
        </Link>
      </div>

      <div className="filter-block">
        <label className="filter-label" htmlFor="f-city">
          {t("filters.city")}
        </label>
        <select id="f-city" name="cityId" defaultValue={state.cityId}>
          <option value="">{t("filters.cityAll")}</option>
          {wilayas.map((wilaya) => (
            <optgroup key={wilaya.id} label={ar ? wilaya.nameAr : wilaya.nameFr}>
              {wilaya.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {ar ? city.nameAr : city.nameFr}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <RangeFilter
        legend={t("filters.capacity")}
        lowName="guests"
        highName="maxCapacity"
        min={CAPACITY_FLOOR}
        max={CAPACITY_CEILING}
        step={CAPACITY_STEP}
        lowValue={state.guests}
        highValue={state.maxCapacity}
        format={(value) => t("filters.capacityValue", { count: value })}
        formatCeiling={() => t("filters.capacityCeiling", { count: CAPACITY_CEILING })}
      />

      <RangeFilter
        legend={t("filters.budget")}
        lowName="minPrice"
        highName="maxPrice"
        min={BUDGET_FLOOR}
        max={BUDGET_CEILING}
        step={BUDGET_STEP}
        lowValue={state.minPrice}
        highValue={state.maxPrice}
        format={(value) => formatDZD(value * 100, ar ? "ar" : "fr")}
        formatCeiling={() => t("filters.budgetCeiling", { amount: formatDZD(BUDGET_CEILING * 100, ar ? "ar" : "fr") })}
      />

      {styles.length > 0 ? (
        <fieldset className="filter-block chips-block">
          <legend className="filter-label">{t("filters.styles")}</legend>
          <div className="chips">
            {styles.map((style) => (
              // Puces = cases à cocher DÉGUISÉES, pas des boutons : sémantique OU
              // (D65), plusieurs styles cochés à la fois, et l'encodage natif d'un
              // formulaire sans JavaScript.
              <label key={style.id} className="chip">
                <input
                  type="checkbox"
                  name="styles"
                  value={style.key}
                  defaultChecked={state.styles.includes(style.key)}
                />
                <span>{ar ? style.nameAr : style.nameFr}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="filter-block chips-block">
        <legend className="filter-label">{t("filters.ceremonyType")}</legend>
        <div className="chips">
          {/* Boutons RADIO et non cases : le type est un choix UNIQUE (D66), et
              « Mixte » n'est pas « Intérieur + Extérieur » cochés ensemble — il
              demande une salle qui offre les deux.

              ⚠ Trois puces, pas de « Tous » : un groupe de radios ne se décoche
              pas tout seul, alors chaque puce se DÉCOCHE au clic quand elle est
              déjà choisie. Sans JavaScript ce geste n'existe pas — c'est
              « Réinitialiser », en haut du panneau, qui rend le filtre vide. */}
          {CEREMONY_TYPE_FILTERS.map((type) => (
            <label key={type} className="chip">
              <input
                type="radio"
                name="ceremonyType"
                value={type}
                checked={ceremony === type}
                onChange={() => setCeremony(type)}
                onClick={() => {
                  if (ceremony === type) setCeremony("");
                }}
              />
              <span>{tCeremony(type)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {amenities.length > 0 ? (
        <fieldset className="filter-block">
          <legend className="filter-label">{t("filters.amenities")}</legend>
          <div className="service-list">
            {amenities.map((amenity) => (
              <label key={amenity.id} className="service-row">
                {/* Cases RÉPÉTÉES sous le même nom : c'est l'encodage natif d'un
                    formulaire HTML, et la seule forme qu'un navigateur sait
                    produire sans JS. La jointure par virgules attendue par l'API
                    se fait à l'appel, pas dans l'URL. */}
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity.key}
                  defaultChecked={state.amenities.includes(amenity.key)}
                />
                {/* Même map d'icônes que l'écran pro (déplacée en `@zwadj/ui` en
                    UI-D3) : deux copies auraient divergé au premier équipement
                    ajouté, et le client aurait affiché une icône générique là où
                    le pro en montre une juste. */}
                <AmenityIcon icon={amenity.icon} />
                <span>{ar ? amenity.nameAr : amenity.nameFr}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {/* ⚠ Le tri N'EST PLUS ICI (UI-D5) — il est dans la barre de résultats et
          rattaché à ce formulaire par `form="search-filters"`. Le bouton
          ci-dessous le valide donc toujours, JavaScript ou non. */}
      <button type="submit" className="btn btn-accent">
        {t("filters.submit")}
      </button>
    </form>
  );
}

/** Curseur à DEUX poignées, sur deux `input[type=range]` superposés.
 *
 *  ⚠ Sans JavaScript, les deux poignées restent utilisables et le formulaire
 *  soumet : c'est tout l'intérêt de deux contrôles NATIFS plutôt qu'un widget
 *  reconstruit. Ce que le JS ajoute, c'est le libellé vivant et le calage des
 *  poignées l'une contre l'autre. Une plage inversée saisie sans JS est
 *  redressée côté serveur par `parseSearchParams` — elle n'atteint jamais l'API,
 *  qui la refuserait en 400 (D68).
 *
 *  ⚠ Les valeurs affichées viennent de l'ÉTAT local, mais les valeurs SOUMISES
 *  sont celles des `input` eux-mêmes : aucun champ caché à tenir synchronisé. */
function RangeFilter({
  legend,
  lowName,
  highName,
  min,
  max,
  step,
  lowValue,
  highValue,
  format,
  formatCeiling
}: {
  legend: string;
  lowName: string;
  highName: string;
  min: number;
  max: number;
  step: number;
  lowValue: string;
  highValue: string;
  format: (value: number) => string;
  formatCeiling: () => string;
}) {
  // `""` dans l'état veut dire « poignée en butée » (D69) : c'est la butée qui
  // la réaffiche, pas une valeur par défaut arbitraire.
  const [low, setLow] = useState(lowValue === "" ? min : Number(lowValue));
  const [high, setHigh] = useState(highValue === "" ? max : Number(highValue));

  const pct = (value: number) => ((value - min) / (max - min)) * 100;

  return (
    <fieldset className="filter-block">
      <legend className="filter-label">{legend}</legend>
      <div className="range">
        <div className="range-track" />
        <div
          className="range-fill"
          // Propriétés LOGIQUES : en RTL la piste se remplit depuis la droite,
          // comme les poignées natives qui s'inversent avec `dir`.
          style={{ insetInlineStart: `${pct(low)}%`, inlineSize: `${pct(high) - pct(low)}%` }}
        />
        <input
          type="range"
          name={lowName}
          aria-label={`${legend} — ${format(low)}`}
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => setLow(Math.min(Number(e.currentTarget.value), high - step))}
        />
        <input
          type="range"
          name={highName}
          aria-label={`${legend} — ${high >= max ? formatCeiling() : format(high)}`}
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => setHigh(Math.max(Number(e.currentTarget.value), low + step))}
        />
      </div>
      {/* PAS de `role="status"` : la valeur est déjà annoncée par l'`aria-label`
          de chaque poignée, et une région vive se ferait entendre à chaque
          pixel de glissement. Elle entrerait de surcroît en concurrence avec le
          compteur de résultats, seule région vive légitime de cette page. */}
      <p className="range-value">
        {format(low)} — {high >= max ? formatCeiling() : format(high)}
      </p>
    </fieldset>
  );
}
