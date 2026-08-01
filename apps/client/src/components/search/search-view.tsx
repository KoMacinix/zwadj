"use client";

// Lot A7 — vue de la recherche. Composant CLIENT, mais rendu côté serveur : il
// ne fait aucun `fetch`, il reçoit tout en props. Le « use client » sert
// uniquement au confort JS (soumission du tri au changement) — sans lui, la
// page reste ENTIÈREMENT fonctionnelle :
//
//   - les filtres sont un vrai `<form method="get">`, le navigateur navigue ;
//   - le tri est dans ce même formulaire, validé par le même bouton ;
//   - la pagination est faite de LIENS, pas d'un « charger plus » — un bouton
//     JS ne produit aucune URL indexable, et cette page existe pour le
//     référencement.
//
// Cible Android bas de gamme sur réseau lent (backlog 24.6) : ne rien exiger
// de JavaScript ici est une décision de performance, pas un scrupule.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import { CEREMONY_TYPE_FILTERS, type AmenityDTO, type VenueListResponse, type VenueStyleDTO, type WilayaDTO } from "@zwadj/types";
import { AmenityIcon } from "@zwadj/ui";
import { Link } from "../../i18n/navigation";
import { mediaSrc } from "../../lib/media-url";
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

export interface SearchViewProps {
  state: SearchState;
  /** `null` = l'API n'a pas répondu. Distinct d'un résultat vide : on ne dit
   *  pas « aucune salle » quand on n'en sait rien. */
  results: VenueListResponse | null;
  wilayas: WilayaDTO[];
  amenities: AmenityDTO[];
  /** Référentiel des styles (D65). Vide si l'API n'a pas répondu : le panneau
   *  perd ses puces, la recherche continue. */
  styles: VenueStyleDTO[];
}

export function SearchView({ state, results, wilayas, amenities, styles }: SearchViewProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const ar = locale === "ar";

  const totalPages = results ? Math.max(1, Math.ceil(results.total / results.pageSize)) : 1;

  return (
    <main style={{ padding: 20, maxInlineSize: 1100, marginInline: "auto" }}>
      <h1>{t("title")}</h1>
      <p style={{ color: "var(--ink-2)" }}>{t("intro")}</p>

      {/* UI-D4 — DEUX colonnes : filtres à gauche, résultats à droite, comme le
          design. Empilés, les filtres repoussaient les salles sous la ligne de
          flottaison et la page s'ouvrait sur un formulaire au lieu de s'ouvrir
          sur des salles.

          `minmax(0, 1fr)` sur la colonne des résultats et non `1fr` : sans le
          minimum à zéro, une grille imbriquée refuse de rétrécir sous la largeur
          de son contenu et déborde. La bascule à une colonne se fait en CSS
          (`.search-layout`), pas par un point de rupture en JavaScript. */}
      <div className="search-layout">
        <SearchFilters state={state} wilayas={wilayas} amenities={amenities} styles={styles} ar={ar} />

        <section>
          {results === null ? (
            <div className="state-panel" role="alert">
              <h2>{t("results.errorTitle")}</h2>
              <p>{t("results.errorBody")}</p>
            </div>
          ) : results.items.length === 0 ? (
            <div className="state-panel">
              <h2>{t("results.emptyTitle")}</h2>
              <p>{t("results.emptyBody")}</p>
            </div>
          ) : (
            <>
              <p role="status" style={{ color: "var(--ink-2)", fontSize: 13 }}>
                {results.total === 1 ? t("results.countOne") : t("results.count", { count: results.total })}
              </p>

              {/* Liste NOMMÉE : le nom de commune apparaît aussi dans le
                  sélecteur de filtre — sans nom, ni un lecteur d'écran ni un
                  test ne distinguent les deux régions. Réutilise le titre,
                  aucune clé neuve. */}
              <ul
                aria-label={t("title")}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                  listStyle: "none",
                  padding: 0,
                  margin: "12px 0 0"
                }}
              >
                {results.items.map((venue) => (
                  <li
                    key={venue.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      background: "var(--surface)",
                      overflow: "hidden"
                    }}
                  >
                    {/* La destination du détail est A8 : le lien existe déjà,
                        il pointe la route par SLUG (décision Flux A). */}
                    <Link href={`/salles/${venue.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {venue.coverThumbUrl ? (
                        // `<img>` nu, PAS `next/image` : la vignette est déjà
                        // générée à la bonne taille par le pipeline du Lot A4.
                        // La repasser dans l'optimiseur ajouterait une
                        // configuration `remotePatterns`, un proxy en dev et un
                        // deuxième ré-encodage, pour zéro gain.
                        <img
                          src={mediaSrc(venue.coverThumbUrl)}
                          alt=""
                          loading="lazy"
                          width={480}
                          height={320}
                          style={{ inlineSize: "100%", blockSize: "auto", display: "block", background: "var(--bg-2)" }}
                        />
                      ) : (
                        <div
                          style={{
                            aspectRatio: "3 / 2",
                            display: "grid",
                            placeItems: "center",
                            background: "var(--bg-2)",
                            color: "var(--ink-mute)",
                            fontSize: 12
                          }}
                        >
                          {t("card.noPhoto")}
                        </div>
                      )}

                      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                        <h2 style={{ fontSize: 16, margin: 0 }}>{ar ? venue.nameAr : venue.nameFr}</h2>
                        {(ar ? venue.districtAr : venue.districtFr) ? (
                          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
                            {ar ? venue.districtAr : venue.districtFr}
                          </p>
                        ) : null}
                        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
                          {t("card.capacity", { max: venue.capacityMax })}
                        </p>
                        <p style={{ margin: "4px 0 0", fontWeight: 600 }}>
                          <span style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-2)" }}>
                            {t("card.from")}{" "}
                          </span>
                          {formatDZD(venue.basePriceCents)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav aria-label={t("pagination.label")} style={{ marginBlockStart: 20 }}>
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

          {/* Décision produit n°2 : la carte est reportée post-MVP, et on le DIT
              plutôt que de laisser un vide. */}
          <div
            style={{
              marginBlockStart: 24,
              border: "1px dashed var(--line)",
              borderRadius: "var(--radius)",
              padding: 24,
              textAlign: "center",
              color: "var(--ink-mute)"
            }}
          >
            <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              {t("map.title")}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>{t("map.soon")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

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
    <form method="get" className="filters">
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

      <div className="filter-block">
        <label className="filter-label" htmlFor="f-sort">
          {t("sort.label")}
        </label>
        <select
          id="f-sort"
          name="sort"
          defaultValue={state.sort}
          // Confort JS : le tri s'applique au changement. Sans JS, le même
          // bouton « Afficher les résultats » le valide — d'où un `select`
          // DANS le formulaire plutôt qu'un contrôle isolé.
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="price_asc">{t("sort.price_asc")}</option>
          <option value="price_desc">{t("sort.price_desc")}</option>
        </select>
      </div>

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
