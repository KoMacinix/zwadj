"use client";

// Assistant de filtres — lot Assistant, sur `FilterWizard` de la maquette
// (`design.zip` mis à jour, `src/imports/App.tsx`, 1551+).
//
// ── ⚠ QUATRE QUESTIONS, ET TOUTES FILTRENT ────────────────────────────────
// La maquette en pose six et JETTE deux réponses : `complete()` transmet
// `district` et `date`, que son `SearchPage` n'utilise nulle part dans son
// filtrage. Le contrat public ne porte pas de date (arbitrage Ko : lot suivant,
// `availableOn`), et son « quartier » devient ici la COMMUNE, qui est le vrai
// filtre du dépôt (`cityId`).
// ⚠ Une question dont la réponse est jetée est pire qu'une question absente :
// le client DÉCLARE une contrainte et reçoit une liste qui la viole en silence.
//
// ── ⚠ CET ÉCRAN EXIGE JAVASCRIPT, ET C'EST POURQUOI IL EST À PART ─────────
// `/salles` reste entièrement fonctionnelle sans JS — filtres en
// `<form method="get">`, pagination en liens — parce qu'elle vise un Android bas
// de gamme sur réseau lent et qu'elle existe pour le référencement. L'assistant
// est un chemin d'entrée CONFORTABLE, jamais le seul.
//
// ── ⚠ LE COMPTEUR VIENT DU SERVEUR ───────────────────────────────────────
// La maquette calcule `liveCount` dans le navigateur en filtrant son tableau.
// Refaire ça, ce serait réécrire côté client le filtrage que le serveur porte —
// une seconde autorité sur « quelles salles correspondent », qui divergerait au
// premier critère ajouté. Ici c'est le `total` d'un `GET /venues?…&pageSize=1`.
//
// ── ⚠ LE RÉCAPITULATIF NE SE REPLIE PAS ──────────────────────────────────
// La maquette refait ici son `editStep(n)` → `setConfirmedUpTo(n - 1)` : corriger
// la commune ferait disparaître les invités et le budget du récapitulatif. Même
// arbitrage que côté Pro — les réponses SE DÉDUISENT DES DONNÉES, jamais d'un
// compteur, donc elles ne peuvent pas se replier.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDZD } from "@zwadj/i18n";
import type { AmenityDTO, VenueStyleDTO, WilayaDTO } from "@zwadj/types";
import { JourneyCard, JourneyConnector, JourneyRail, JourneyRecap } from "@zwadj/ui";
import { useRouter } from "../i18n/navigation";
import { countVenues } from "../lib/api";
import { dinarsFromCents } from "../lib/search-query";

/** ⚠ QUATRE ÉTAPES, dans l'ordre du filtre EXISTANT (`SearchFilters`) : ville,
 *  capacité, budget, styles, équipements. Rien de réinventé — les deux derniers
 *  critères tiennent sur un écran, comme dans la maquette. */
const STEPS = ["city", "guests", "budget", "taste"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = {
  city: "stepCity",
  guests: "stepGuests",
  budget: "stepBudget",
  taste: "stepTaste"
};

/** Paliers de budget, en CENTIMES — ce sont des VALEURS DE FILTRE, pas des
 *  calculs. Aucune arithmétique monétaire ne vit dans ce navigateur. */
const BUDGET_TIERS = [50_000_000, 100_000_000, 200_000_000, 400_000_000] as const;

export interface FilterWizardProps {
  wilayas: WilayaDTO[];
  styles: VenueStyleDTO[];
  amenities: AmenityDTO[];
}

export function FilterWizard({ wilayas, styles, amenities }: FilterWizardProps) {
  const t = useTranslations("wizard");
  const ar = useLocale() === "ar";
  const router = useRouter();

  const [step, setStep] = useState<Step>("city");
  const [cityId, setCityId] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [pickedStyles, setPickedStyles] = useState<string[]>([]);
  const [pickedAmenities, setPickedAmenities] = useState<string[]>([]);
  /** ⚠ La dernière étape n'a pas de réponse obligatoire : « aucun style, aucun
   *  équipement » est un choix valable, indiscernable de « pas encore répondu »
   *  si on se contentait de regarder les listes. Seule étape à porter un drapeau
   *  — les trois autres se déduisent de leurs données, donc ne peuvent mentir. */
  const [tasteAnswered, setTasteAnswered] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const answered: Record<Step, boolean> = useMemo(
    () => ({
      city: cityId !== "",
      guests: Number(guests) > 0,
      budget: budget !== "",
      taste: tasteAnswered
    }),
    [cityId, guests, budget, tasteAnswered]
  );

  /* ── DEUX CONTRATS, DONC DEUX CONSTRUCTEURS (D228) ────────────────────────
     ⚠ CAUSE STRUCTURELLE DU DÉFAUT CORRIGÉ ICI : une seule querystring
     servait les deux. Elle partait à `countVenues` (API, CENTIMES) *et*
     dans `router.push("/salles?…")` (URL publique, DINARS). Tant qu'un
     seul objet sert deux contrats, l'un des deux est faux — et c'était
     l'URL : le compteur annonçait le bon nombre, puis la page de résultats
     affichait le catalogue entier. Deux écrans, deux vérités, aucun test
     pour les confronter. */

  /** UN SEUL assembleur, et une SEULE ligne de différence : l'encodage du
   *  prix. Deux fonctions recopiées divergeraient sur le jour où un critère
   *  s'ajoute d'un côté — ce qui est précisément la faute qu'on répare.
   *
   *  Noms et encodage des listes relevés de `venueListQuerySchema`, jamais
   *  devinés : `styles` et `amenities` sont des clés SÉPARÉES PAR DES
   *  VIRGULES. `parseSearchParams` accepte cette forme jointe.
   *
   *  ⚠ La division centimes → dinars vient de `search-query.ts` : ce module
   *  est le seul du front à connaître le facteur 100, dans les deux sens. */
  const assembler = useCallback(
    (prix: "cents" | "dinars"): URLSearchParams => {
      const q = new URLSearchParams();
      if (cityId !== "") q.set("cityId", cityId);
      if (Number(guests) > 0) q.set("guests", guests);
      if (budget !== "") {
        if (prix === "cents") {
          q.set("maxPriceCents", budget);
        } else {
          // Un palier non convertible EXACTEMENT est omis plutôt qu'arrondi
          // (D228) : un plafond arrondi en silence n'a été demandé par
          // personne. Les paliers du dépôt sont tous des multiples de 100.
          const dinars = dinarsFromCents(budget);
          if (dinars !== "") q.set("maxPrice", dinars);
        }
      }
      if (pickedStyles.length > 0) q.set("styles", pickedStyles.join(","));
      if (pickedAmenities.length > 0) q.set("amenities", pickedAmenities.join(","));
      return q;
    },
    [cityId, guests, budget, pickedStyles, pickedAmenities]
  );

  /** Pour le compteur — requête d'API, donc CENTIMES. */
  const apiParams = useCallback(() => assembler("cents"), [assembler]);

  /** Pour `router.push("/salles?…")` — URL publique, donc DINARS, sous le nom
   *  que `parseSearchParams` lit réellement. */
  const publicParams = useCallback(() => assembler("dinars"), [assembler]);

  // ⚠ Le compteur n'apparaît QU'À la dernière étape — comme dans la maquette.
  // Avant, il vaudrait le catalogue entier et ne dirait rien au client.
  useEffect(() => {
    if (step !== "taste") return;
    const abort = new AbortController();
    setCounting(true);
    countVenues(apiParams(), abort.signal)
      .then((n) => {
        if (!abort.signal.aborted) {
          setCount(n);
          setCounting(false);
        }
      })
      .catch(() => {
        /* `countVenues` ne rejette pas : il rend `null`. */
      });
    // ⚠ On ANNULE la requête précédente à chaque coche. Sans cela, deux réponses
    // lentes peuvent arriver dans le désordre et afficher le compte d'un état
    // que le client a déjà quitté.
    return () => abort.abort();
  }, [step, apiParams]);

  const cardRef = useRef<HTMLElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const el = cardRef.current;
    if (el === null) return;
    // ⚠ `prefers-reduced-motion` par défaut à `true` quand on ne sait pas : se
    // tromper vers « pas de défilement animé » ne coûte qu'un peu d'élégance.
    const doux =
      typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ⚠ `preventScroll` D'ABORD : sans lui, le navigateur défile pour amener le
    // focus, et le défilement choisi juste après serait un SECOND mouvement
    // par-dessus le premier — l'écran sauterait puis glisserait.
    el.focus({ preventScroll: true });
    // ⚠ APPEL OPTIONNEL : `scrollIntoView` n'existe pas en jsdom, ni dans
    // certaines WebView anciennes. Relevé sur `apps/pro/src/lib/reveal.ts`, qui
    // porte la même garde — sans elle, l'étape suivante ne s'affichait pas du
    // tout en test, et le défaut aurait été le même sur un vieil Android.
    el.scrollIntoView?.({ behavior: doux ? "smooth" : "auto", block: "nearest" });
  }, [step]);

  const goTo = (next: Step) => {
    moveFocus.current = true;
    setStep(next);
  };

  /**
   * Avance : la PREMIÈRE question encore sans réponse APRÈS celle qu'on quitte,
   * sinon la dernière étape.
   *
   * ⚠ « Après celle qu'on quitte », et non « la première du parcours ». Une
   * première version renvoyait à `STEPS.find(s => !answered[s])` sans borne :
   * un client qui PASSE toutes les questions — ce que les boutons « Passer »
   * autorisent explicitement — retombait indéfiniment sur la commune et
   * n'atteignait JAMAIS les résultats. Défaut réel, pas artefact de test.
   */
  const avancer = () => {
    const depuis = STEPS.indexOf(step) + 1;
    goTo(STEPS.slice(depuis).find((s) => !answered[s]) ?? "taste");
  };

  /** ⚠ La séquence se TERMINE sur la page de résultats EXISTANTE. Aucune page
   *  neuve : les filtres y restent ajustables comme aujourd'hui. */
  const voirLesSalles = () => {
    const q = publicParams().toString();
    router.push(q === "" ? "/salles" : `/salles?${q}`);
  };

  const toggle = (liste: string[], set: (v: string[]) => void, key: string) =>
    set(liste.includes(key) ? liste.filter((k) => k !== key) : [...liste, key]);

  const reset = () => {
    setCityId("");
    setGuests("");
    setBudget("");
    setPickedStyles([]);
    setPickedAmenities([]);
    setTasteAnswered(false);
    setCount(null);
    goTo("city");
  };

  const villes = useMemo(
    () =>
      wilayas.flatMap((w) =>
        w.cities.map((c) => ({ id: c.id, wilaya: ar ? w.nameAr : w.nameFr, nom: ar ? c.nameAr : c.nameFr }))
      ),
    [wilayas, ar]
  );
  const villeChoisie = villes.find((v) => v.id === cityId);

  const resume = (s: Step): string => {
    switch (s) {
      case "city":
        return villeChoisie ? `${villeChoisie.nom} · ${villeChoisie.wilaya}` : t("cityAll");
      case "guests":
        return guests;
      case "budget":
        return budget === "" ? t("budgetAny") : formatDZD(Number(budget), ar ? "ar" : "fr");
      case "taste": {
        const noms = [
          ...pickedStyles.map((k) => styles.find((x) => x.key === k)).map((x) => (x ? (ar ? x.nameAr : x.nameFr) : "")),
          ...pickedAmenities
            .map((k) => amenities.find((x) => x.key === k))
            .map((x) => (x ? (ar ? x.nameAr : x.nameFr) : ""))
        ].filter((n) => n !== "");
        return noms.join(" · ");
      }
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const question = { city: "qCity", guests: "qGuests", budget: "qBudget", taste: "qTaste" } as const;

  return (
    <main className="wz">
      <header className="wz-head">
        <p className="wz-eyebrow">
          <span className="wz-ornament" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="wz-title">{t("title")}</h1>
        <p className="wz-lede">{t("lede")}</p>
        <button type="button" className="wz-btn wz-head-reset" onClick={reset}>
          {t("reset")}
        </button>
      </header>

      {/* ⚠ Une liste ORDONNÉE : l'ordre, l'étape courante et le total ne doivent
          pas être seulement visuels. Le rail est latéral par `grid-area`, mais
          reste le premier élément du DOM.

          ⚠ CHROME PARTAGÉE (`@zwadj/ui`). Le Pro et le Client rendaient deux
          copies du même rail, et elles avaient DÉJÀ divergé : coche `lucide`
          d'un côté, glyphe texte de l'autre. La `className` ne porte plus que
          la MISE EN PAGE propre à cette app. */}
      <JourneyRail
        className="wz-rail"
        label={t("railLabel")}
        steps={STEPS.map((s) => ({
          id: s,
          label: t(STEP_LABEL[s]),
          state: s === step ? "current" : answered[s] ? "done" : "todo",
          // Cliquer la pastille vaut « Modifier » — seulement là où
          // « Modifier » existerait.
          editLabel: answered[s] && s !== step ? t("editAria", { step: t(STEP_LABEL[s]) }) : undefined
        }))}
        onEdit={(id) => goTo(id as Step)}
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
        onEdit={(id) => goTo(id as Step)}
      />

      {/* ⚠ Ne se rend QUE s'il a quelque chose à relier : un trait qui part de
          rien ne relie rien. */}
      {STEPS.some((s) => s !== step && answered[s]) ? <JourneyConnector className="wz-connector" /> : null}

      <JourneyCard stepId={step} className="wz-card" labelledBy="wz-question" cardRef={cardRef}>
        <p className="wz-counter">{t("counter", { n: stepIndex + 1, total: STEPS.length })}</p>
        <h2 id="wz-question" className="wz-question">
          {t(question[step])}
        </h2>
        <p className="wz-hint">{t(`${question[step]}Hint`)}</p>

        {step === "city" ? (
          <>
            <label className="wz-label" htmlFor="wz-city">
              {t("stepCity")}
            </label>
            {/* ⚠ Les communes sont GROUPÉES par wilaya. À plat, « Chéraga » et
                « Cheraga » d'une autre wilaya seraient indiscernables — et le
                référentiel en compte plusieurs centaines. */}
            <select id="wz-city" className="wz-input" value={cityId} onChange={(e) => setCityId(e.target.value)}>
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
              <button type="button" className="wz-btn wz-btn-primary" onClick={avancer}>
                {cityId === "" ? t("skip") : t("continue")}
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
              className="wz-input"
              type="number"
              min={1}
              max={10_000}
              inputMode="numeric"
              placeholder={t("guestsPlaceholder")}
              value={guests}
              onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <div className="wz-actions">
              <button
                type="button"
                className="wz-btn wz-btn-primary"
                disabled={!answered.guests}
                onClick={avancer}
              >
                {t("continue")}
              </button>
              <button type="button" className="wz-btn" onClick={avancer}>
                {t("skip")}
              </button>
              {answered.guests ? null : <p className="wz-hint">{t("guestsInvalid")}</p>}
            </div>
          </>
        ) : null}

        {step === "budget" ? (
          <>
            <ul className="wz-tiers">
              {BUDGET_TIERS.map((cents) => (
                <li key={cents}>
                  <button
                    type="button"
                    className={budget === String(cents) ? "wz-tier is-on" : "wz-tier"}
                    aria-pressed={budget === String(cents)}
                    onClick={() => {
                      setBudget(String(cents));
                      goTo("taste");
                    }}
                  >
                    {formatDZD(cents, ar ? "ar" : "fr")}
                  </button>
                </li>
              ))}
            </ul>
            <div className="wz-actions">
              <button
                type="button"
                className="wz-btn"
                onClick={() => {
                  setBudget("");
                  goTo("taste");
                }}
              >
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
                        className={pickedStyles.includes(s.key) ? "wz-chip is-on" : "wz-chip"}
                        aria-pressed={pickedStyles.includes(s.key)}
                        onClick={() => toggle(pickedStyles, setPickedStyles, s.key)}
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
                        className={pickedAmenities.includes(a.key) ? "wz-chip is-on" : "wz-chip"}
                        aria-pressed={pickedAmenities.includes(a.key)}
                        onClick={() => toggle(pickedAmenities, setPickedAmenities, a.key)}
                      >
                        {ar ? a.nameAr : a.nameFr}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            {/* ⚠ `null` = « je ne sais pas », JAMAIS « zéro salle ». Les deux ne
                se disent pas pareil : l'un invite à élargir, l'autre est une
                panne. `aria-live` parce que ce nombre change sans que la page
                bouge — sinon un lecteur d'écran ne l'annonce jamais. */}
            <p className="wz-count" role="status" aria-live="polite" aria-busy={counting}>
              {count === null
                ? t("countUnknown")
                : count === 0
                  ? t("countNone")
                  : count === 1
                    ? t("countOne")
                    : t("count", { count })}
            </p>
            {count === 0 ? <p className="wz-hint">{t("countNoneHint")}</p> : null}

            <div className="wz-actions">
              {/* ⚠ CE BOUTON NAVIGUE TOUJOURS. Il ne renvoie jamais dans le
                  parcours : « aucun critère » est une réponse valable, et un
                  client qui a tout passé doit voir le catalogue entier. */}
              <button
                type="button"
                className="wz-btn wz-btn-primary"
                onClick={() => {
                  setTasteAnswered(true);
                  voirLesSalles();
                }}
              >
                {t("see")}
              </button>
            </div>
          </>
        ) : null}
      </JourneyCard>
    </main>
  );
}
