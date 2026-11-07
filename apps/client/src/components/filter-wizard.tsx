"use client";

// Assistant de filtres — RÉÉCRIT par FC-8 (session `front-client`), le lot ③. L'assistant n'est plus une route, c'est un MODE de
// `/salles` (D229) : `/salles?…&guide=<étape>` (D230) montre les résultats RÉELS, et ce panneau par-dessus.
//
// ── ⛔ AUCUN ÉTAT LOCAL (D229) ────────────────────────────────────────────────────────────────────────────────────────────────
// L'étape et les réponses arrivent en PROPS : la page les lit dans l'URL (`parseGuide`, `parseSearchParams`). Chaque réponse
// POUSSE une URL de `/salles` (`guidedSearchQuery`, par `toPublicQuery`, la seule autorité des noms de l'URL publique) et la page se
// rend de nouveau, à l'étape suivante. Le formulaire de `/salles` et ce panneau sont deux VUES d'une même donnée : ils ne peuvent
// pas se contredire — un tampon local rétablirait les deux autorités que D207 a écartées. Les champs sont NON contrôlés : leur
// valeur, tenue par le DOM, part à « Continuer » (pousser à chaque frappe ferait une navigation par caractère).
// ⚠ Une coche RESTE sur l'étape (`replace`) : le bouton retour recule d'une QUESTION (D230), pas d'une coche.
//
// ── ⚠ QUATRE QUESTIONS, ET TOUTES FILTRENT ───────────────────────────────────────────────────────────────────────────────────
// La maquette en pose six et JETTE deux réponses (quartier, date) ; ici, la commune est le vrai filtre (`cityId`) et la date —
// cinquième étape — est HORS de ce lot. Une question dont la réponse est jetée est pire qu'une question absente.
//
// ── ⚠ LE COMPTE VIENT DU SERVEUR ─────────────────────────────────────────────────────────────────────────────────────────────
// C'est le TOTAL de la page de résultats qu'on voit dessous (prop `total`) : plus de requête à part, plus de second constructeur
// de query — la cause structurelle du défaut D228 (une querystring pour deux contrats) disparaît avec lui.
//
// ── ⚠ LE RÉCAPITULATIF NE SE REPLIE PAS ──────────────────────────────────────────────────────────────────────────────────────
// Les réponses SE LISENT DANS L'URL (`guideAnswered`) : revenir sur une étape n'efface pas les suivantes.
//
// ── ⚠ JAVASCRIPT ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Ce panneau est MONTÉ côté client par `SearchView`. Sans JavaScript, `/salles?guide=…` rend la page de résultats et son
// formulaire, entiers : un panneau qui ne répondrait pas masquerait une page qui marche.
import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import type { AmenityDTO, VenueStyleDTO, WilayaDTO } from "@zwadj/types";
import { JourneyCard, JourneyConnector, JourneyRail, JourneyRecap, useDismissLayer } from "@zwadj/ui";
import { useRouter } from "../i18n/navigation";
import {
  BUDGET_TIERS,
  GUIDE_STEPS,
  centsFromDinars,
  guideAnswered,
  guidedSearchQuery,
  nextGuideStep,
  parseSearchParams,
  type GuideStep,
  type SearchState
} from "../lib/search-query";
import { SEARCH_PATH } from "../lib/routes";

const STEPS = GUIDE_STEPS;
type Step = GuideStep;
const STEP_LABEL: Record<Step, string> = {
  city: "stepCity",
  guests: "stepGuests",
  budget: "stepBudget",
  taste: "stepTaste"
};
const QUESTION = { city: "qCity", guests: "qGuests", budget: "qBudget", taste: "qTaste" } as const;

/* ⛔ LES PALIERS NE SONT PAS DÉCLARÉS ICI (D254) : `BUDGET_TIERS` vient de `search-query.ts`, en DINARS, comme l'URL publique. */

export interface FilterWizardProps {
  /** L'étape, lue dans l'URL (`parseGuide`). */
  step: Step;
  /** Les réponses, lues dans l'URL (`parseSearchParams`). */
  state: SearchState;
  /** Le total de la page de résultats ; `null` : inconnu (API muette) — jamais « zéro ». */
  total: number | null;
  wilayas: WilayaDTO[];
  styles: VenueStyleDTO[];
  amenities: AmenityDTO[];
}

export function FilterWizard({ step, state, total, wilayas, styles, amenities }: FilterWizardProps) {
  const t = useTranslations("wizard");
  const ar = useLocale() === "ar";
  const router = useRouter();
  const answered = guideAnswered(state);

  /** Pousse l'URL d'un état et d'une étape ; sans étape, la page de résultats, panneau fermé. */
  const aller = (suivant: SearchState, etape: Step | null) => router.push(`${SEARCH_PATH}${guidedSearchQuery(suivant, etape)}`);
  /** Répond à l'étape courante, puis la PREMIÈRE question sans réponse APRÈS elle (`nextGuideStep`). */
  const repondre = (suivant: SearchState) => aller(suivant, nextGuideStep(suivant, step));
  /** Une coche : on RESTE sur l'étape, sans empiler l'historique. */
  const cocher = (suivant: SearchState) => router.replace(`${SEARCH_PATH}${guidedSearchQuery(suivant, step)}`);
  const basculer = (liste: string[], cle: string) => (liste.includes(cle) ? liste.filter((k) => k !== cle) : [...liste, cle]);

  const villeRef = useRef<HTMLSelectElement>(null);
  const invitesRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const boiteRef = useRef<HTMLElement>(null);

  // ⛔ UNE BOÎTE MODALE (`aria-modal="true"`) : Échap la ferme — la même URL que « Fermer » —, Tab boucle DEDANS, la page dessous
  // ne défile plus. Par le SEUL piège de focus du dépôt (`useDismissLayer`, `@zwadj/ui`, lot A11a) : un second, écrit ici,
  // divergerait du premier. Le focus d'ENTRÉE est la carte de la question (l'effet suivant le remet à chaque étape).
  useDismissLayer({ open: true, panelRef: boiteRef, onDismiss: () => aller(state, null), initialFocusRef: cardRef, lockScroll: true });

  // Le focus ENTRE dans la carte à l'ouverture et à chaque étape : le panneau vient de paraître par-dessus la page, un visiteur
  // au clavier doit s'y trouver — sinon il tabulerait dans les résultats cachés dessous.
  useEffect(() => {
    const el = cardRef.current;
    if (el === null) return;
    // ⚠ `prefers-reduced-motion` par défaut à `true` quand on ne sait pas : se tromper vers « pas d'animation » ne coûte rien.
    const doux = typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ⚠ `preventScroll` D'ABORD, puis un seul défilement choisi ; `scrollIntoView` est OPTIONNEL (absent de jsdom et de
    // certaines WebView anciennes).
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ behavior: doux ? "smooth" : "auto", block: "nearest" });
  }, [step]);

  const villes = useMemo(
    () => wilayas.flatMap((w) => w.cities.map((c) => ({ id: c.id, wilaya: ar ? w.nameAr : w.nameFr, nom: ar ? c.nameAr : c.nameFr }))),
    [wilayas, ar]
  );
  const villeChoisie = villes.find((v) => v.id === state.cityId);
  const langue = ar ? "ar" : "fr";

  const resume = (s: Step): string => {
    switch (s) {
      case "city":
        return villeChoisie ? `${villeChoisie.nom} · ${villeChoisie.wilaya}` : t("cityAll");
      case "guests":
        return state.guests;
      case "budget":
        return state.maxPrice === "" ? t("budgetAny") : formatDZD(centsFromDinars(state.maxPrice), langue);
      case "taste":
        return [
          ...state.styles.map((k) => styles.find((x) => x.key === k)).map((x) => (x ? (ar ? x.nameAr : x.nameFr) : "")),
          ...state.amenities.map((k) => amenities.find((x) => x.key === k)).map((x) => (x ? (ar ? x.nameAr : x.nameFr) : ""))
        ]
          .filter((n) => n !== "")
          .join(" · ");
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="wz-overlay">
      <section ref={boiteRef} className="wz" role="dialog" aria-modal="true" aria-labelledby="wz-title">
        <header className="wz-head">
          <p className="wz-eyebrow">
            <span className="wz-ornament" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 id="wz-title" className="wz-title">
            {t("title")}
          </h2>
          <p className="wz-lede">{t("lede")}</p>
          <div className="wz-head-actions">
            <button type="button" className="wz-btn wz-head-reset" onClick={() => aller(parseSearchParams({}), "city")}>
              {t("reset")}
            </button>
            <button type="button" className="wz-btn" onClick={() => aller(state, null)}>
              {t("close")}
            </button>
          </div>
        </header>

        {/* ⚠ Une liste ORDONNÉE : l'ordre, l'étape courante et le total ne sont pas seulement visuels. ⚠ CHROME PARTAGÉE
            (`@zwadj/ui`, D223) : la `className` ne porte que la MISE EN PAGE propre à cette app. */}
        <JourneyRail
          className="wz-rail"
          label={t("railLabel")}
          steps={STEPS.map((s) => ({
            id: s,
            label: t(STEP_LABEL[s]),
            state: s === step ? "current" : answered[s] ? "done" : "todo",
            editLabel: answered[s] && s !== step ? t("editAria", { step: t(STEP_LABEL[s]) }) : undefined
          }))}
          onEdit={(id) => aller(state, id as Step)}
        />

        <JourneyRecap
          className="wz-recap"
          label={t("recapLabel")}
          editText={t("edit")}
          rows={STEPS.filter((s) => s !== step && answered[s]).map((s) => ({
            id: s,
            step: t(STEP_LABEL[s]),
            value: resume(s),
            editLabel: t("editAria", { step: t(STEP_LABEL[s]) })
          }))}
          onEdit={(id) => aller(state, id as Step)}
        />

        {/* ⚠ Ne se rend QUE s'il a quelque chose à relier : un trait qui part de rien ne relie rien. */}
        {STEPS.some((s) => s !== step && answered[s]) ? <JourneyConnector className="wz-connector" /> : null}

        <JourneyCard stepId={step} className="wz-card" labelledBy="wz-question" cardRef={cardRef}>
          <p className="wz-counter">{t("counter", { n: stepIndex + 1, total: STEPS.length })}</p>
          <h3 id="wz-question" className="wz-question">
            {t(QUESTION[step])}
          </h3>
          <p className="wz-hint">{t(`${QUESTION[step]}Hint`)}</p>

          {step === "city" ? (
            <>
              <label className="wz-label" htmlFor="wz-city">
                {t("stepCity")}
              </label>
              {/* ⚠ Les communes sont GROUPÉES par wilaya : à plat, deux homonymes de deux wilayas seraient indiscernables. */}
              <select id="wz-city" ref={villeRef} className="wz-input" defaultValue={state.cityId} key={state.cityId}>
                <option value="">{t("cityAll")}</option>
                {wilayas.map((w) => (
                  <optgroup key={w.id} label={ar ? w.nameAr : w.nameFr}>
                    {w.cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {ar ? c.nameAr : c.nameFr}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="wz-actions">
                <button
                  type="button"
                  className="wz-btn wz-btn-primary"
                  onClick={() => repondre({ ...state, cityId: villeRef.current?.value ?? "" })}
                >
                  {t("continue")}
                </button>
                <button type="button" className="wz-btn" onClick={() => repondre({ ...state, cityId: "" })}>
                  {t("skip")}
                </button>
              </div>
            </>
          ) : null}

          {step === "guests" ? (
            <>
              <label className="wz-label" htmlFor="wz-guests">
                {t("stepGuests")}
              </label>
              <input
                id="wz-guests"
                ref={invitesRef}
                className="wz-input"
                type="number"
                min={1}
                max={10_000}
                inputMode="numeric"
                placeholder={t("guestsPlaceholder")}
                defaultValue={state.guests}
                key={state.guests}
              />
              <div className="wz-actions">
                <button
                  type="button"
                  className="wz-btn wz-btn-primary"
                  // Seuls des chiffres partent ; `parseSearchParams` écarte ensuite ce qui n'est pas un entier positif.
                  onClick={() => repondre({ ...state, guests: (invitesRef.current?.value ?? "").replace(/[^0-9]/g, "") })}
                >
                  {t("continue")}
                </button>
                <button type="button" className="wz-btn" onClick={() => repondre({ ...state, guests: "" })}>
                  {t("skip")}
                </button>
              </div>
            </>
          ) : null}

          {step === "budget" ? (
            <>
              <ul className="wz-tiers">
                {BUDGET_TIERS.map((dinars) => (
                  <li key={dinars}>
                    <button
                      type="button"
                      className={state.maxPrice === String(dinars) ? "wz-tier is-on" : "wz-tier"}
                      aria-pressed={state.maxPrice === String(dinars)}
                      onClick={() => repondre({ ...state, maxPrice: String(dinars) })}
                    >
                      {formatDZD(centsFromDinars(dinars), langue)}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="wz-actions">
                <button type="button" className="wz-btn" onClick={() => repondre({ ...state, maxPrice: "" })}>
                  {t("budgetAny")}
                </button>
              </div>
            </>
          ) : null}

          {step === "taste" ? (
            <>
              <fieldset className="wz-group">
                <legend className="wz-label">{t("styles")}</legend>
                {styles.length === 0 ? (
                  <p className="wz-hint">{t("noStyles")}</p>
                ) : (
                  <ul className="wz-chips">
                    {styles.map((s) => (
                      <li key={s.key}>
                        <button
                          type="button"
                          className={state.styles.includes(s.key) ? "wz-chip is-on" : "wz-chip"}
                          aria-pressed={state.styles.includes(s.key)}
                          onClick={() => cocher({ ...state, styles: basculer(state.styles, s.key) })}
                        >
                          {ar ? s.nameAr : s.nameFr}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <fieldset className="wz-group">
                <legend className="wz-label">{t("amenities")}</legend>
                {amenities.length === 0 ? (
                  <p className="wz-hint">{t("noAmenities")}</p>
                ) : (
                  <ul className="wz-chips">
                    {amenities.map((a) => (
                      <li key={a.key}>
                        <button
                          type="button"
                          className={state.amenities.includes(a.key) ? "wz-chip is-on" : "wz-chip"}
                          aria-pressed={state.amenities.includes(a.key)}
                          onClick={() => cocher({ ...state, amenities: basculer(state.amenities, a.key) })}
                        >
                          {ar ? a.nameAr : a.nameFr}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              {/* ⚠ `null` = « je ne sais pas », JAMAIS « zéro salle » : l'un invite à élargir, l'autre est une panne. `aria-live` :
                  le nombre change sans que la page bouge. */}
              <p className="wz-count" role="status" aria-live="polite">
                {total === null
                  ? t("countUnknown")
                  : total === 0
                    ? t("countNone")
                    : total === 1
                      ? t("countOne")
                      : t("count", { count: total })}
              </p>
              {total === 0 ? <p className="wz-hint">{t("countNoneHint")}</p> : null}

              <div className="wz-actions">
                {/* ⚠ CE BOUTON NAVIGUE TOUJOURS, et ferme le panneau : « aucun critère » est une réponse valable, et un client qui a
                    tout passé doit voir le catalogue entier. */}
                <button type="button" className="wz-btn wz-btn-primary" onClick={() => aller(state, null)}>
                  {t("see")}
                </button>
              </div>
            </>
          ) : null}
        </JourneyCard>
      </section>
    </div>
  );
}
