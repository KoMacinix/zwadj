// Assistant de salle par étapes — Lot UIP-C ; stepper refondu au rang 33 (D326).
//
// ── Pourquoi l'étape 1 est « L'essentiel » et non « Informations » ───────────
// Ko a tranché (a) : la salle est créée dès la fin de l'étape 1, pour que TOUTES
// les étapes suivantes écrivent sur un id réel. Or `venueCreateSchema` exige
// cinq champs — `nameFr`, `nameAr`, `cityId`, `capacityMax`, `basePriceCents` —
// qui étaient répartis sur trois sections du formulaire à plat. L'étape 1 les
// réunit donc, et c'est exactement ce qui la rend créatrice.
//
// ⚠ L'alternative — rendre le prix de base facultatif à la création — a été
// écartée par écrit : elle fabriquerait des salles SANS prix, que le moteur de
// disponibilité, les règles de prix, la recherche et le devis devraient tous
// apprendre à contourner. Un prix absent sur le chemin de l'argent finit par
// s'afficher à un client.
//
// ── La validité d'une étape vient du SCHÉMA, jamais d'une règle nouvelle ─────
// D55 : aucune borne n'est inventée ici. L'étape 1 se valide avec
// `buildCreateInput` (le contrat de création lui-même), les étapes suivantes avec
// `buildUpdateDiff` (le contrat de mise à jour). Si le schéma accepte, l'étape
// est franchissable ; s'il refuse, ce sont SES messages qui s'affichent.
//
// ── L'étape vit dans l'URL ──────────────────────────────────────────────────
// `?etape=N`. Trois conséquences gratuites : le rechargement retombe au bon
// endroit, le bouton « retour » du navigateur fait ce qu'on attend, et un écran
// d'étape est adressable — donc auditable par la suite a11y.
//
// ── Navigation libre entre étapes DÉJÀ franchies ────────────────────────────
// Le cadrage la demande. « Déjà franchie » ne veut pas dire « déjà visitée » : à
// l'édition, une salle existante a par construction satisfait l'étape 1, donc
// toutes les étapes sont ouvertes. À la création, il n'y a qu'une étape — la
// suite se joue après le POST, sur `/salles/:id`.
//
// ── ⛔ LE STEPPER EST CELUI DU PARCOURS SUR PLACE (rang 33, D326) ───────────────
// Il était une `<ol>` du navigateur SANS aucune règle de feuille de style dans le dépôt : « 1. » du navigateur, puis le « 01 » du libellé, collé au texte
// (« 1. 01L'essentiel » — CONSTATÉ dans un navigateur, `list-style-type: decimal`). Ko : « un stepper visuellement cohérent avec celui du parcours sur place ». C'est
// désormais LE MÊME composant, `JourneyRail` de `@zwadj/ui` — pastilles, trait de liaison, coche, états `done` / `current` / `todo`, libellé cliquable. Il n'est donc plus
// recopié : la chrome partagée a déjà divergé une fois quand elle était dupliquée entre le Pro et le Client (`journey.tsx`).
// ⚠ Ce que le composant impose, et que ce fichier respecte : l'étape COURANTE n'est pas un bouton (elle porte `aria-current="step"` sur son `<li>`) ; une étape
// n'est un bouton que si elle est franchissable ET n'est pas la courante ; et « franchie » (coche) veut dire franchissable ET AVANT la courante — une étape ouverte
// mais située APRÈS ne se coche pas : à l'édition toutes sont ouvertes, et cocher des photos qu'on n'a pas encore ajoutées serait un mensonge.
// Le comportement du parcours sur place n'a PAS changé : `journey.tsx` n'est pas touché, ses campagnes (`journey`, `r32`) se rejouent.
import { JourneyRail, type JourneyStep } from "@zwadj/ui";
import { useTranslation } from "react-i18next";

export interface WizardStep {
  /** 1-indexé : c'est le numéro AFFICHÉ, et celui de l'URL. Aligner les deux
   *  évite la classe d'erreurs « l'étape 3 ouvre l'écran 4 ». */
  n: number;
  title: string;
  body: React.ReactNode;
  /** `false` ⇒ « Suivant » inactif et la raison est affichée. */
  valid: boolean;
  /** Étape franchissable au clic depuis la barre de progression. */
  reachable: boolean;
}

export function VenueWizard({
  steps,
  current,
  onGo,
  onNext,
  nextLabel,
  busy,
  invalidHint
}: {
  steps: WizardStep[];
  current: number;
  onGo: (n: number) => void;
  onNext: () => void;
  nextLabel: string;
  busy: boolean;
  /** Ce qui manque, en clair. Un « Suivant » grisé sans explication oblige à
   *  deviner quel champ fâche — c'est le patron A8, appliqué à la progression. */
  invalidHint: string;
}) {
  const { t } = useTranslation();
  const step = steps.find((s) => s.n === current) ?? steps[0];
  if (step === undefined) return null;

  const index = steps.indexOf(step);
  const previous = steps[index - 1];
  const next = steps[index + 1];

  const railSteps: JourneyStep[] = steps.map((s) => ({
    id: String(s.n),
    label: s.title,
    // « franchie » = franchissable ET avant la courante (voir l'en-tête) ; une étape ouverte mais située après reste « à faire ».
    state: s.n === step.n ? "current" : s.reachable && s.n < step.n ? "done" : "todo",
    // Le nom accessible du bouton est le TITRE de l'étape — celui qu'avait l'ancien bouton (son « 01 » était `aria-hidden`).
    ...(s.reachable && s.n !== step.n ? { editLabel: s.title } : {})
  }));

  return (
    <div className="wizard">
      {/* Le rail est une VRAIE liste ordonnée de boutons, pas une frise décorative : un lecteur d'écran énumère les étapes et sait laquelle est la sienne.
          Il reste le PREMIER élément du DOM (on sait où l'on en est avant de lire le contenu) ; sa place à gauche est affaire de `grid-area`, pas de DOM. */}
      <JourneyRail
        className="wizard-rail"
        label={t("venue.ui.wizard.stepsLabel")}
        steps={railSteps}
        onEdit={(id) => onGo(Number(id))}
      />

      <div className="wizard-flow">
        <p className="field-hint wizard-progress">{t("venue.ui.wizard.progress", { n: step.n, total: steps.length })}</p>

        <h2 className="wizard-title">{step.title}</h2>

        <div className="wizard-body">{step.body}</div>

        <div className="wizard-actions">
          {previous === undefined ? null : (
            <button type="button" className="btn" onClick={() => onGo(previous.n)} disabled={busy}>
              {t("venue.ui.wizard.previous")}
            </button>
          )}
          <button type="button" className="btn btn-accent" onClick={onNext} disabled={busy || !step.valid}>
            {nextLabel}
          </button>
        </div>

        {/* ⚠ La raison s'affiche APRÈS le bouton et en `role="status"` : elle
            apparaît au moment où l'on cherche pourquoi rien ne se passe. */}
        {step.valid ? null : (
          <p className="field-hint" role="status">
            {invalidHint}
          </p>
        )}

        {next === undefined && step.valid ? <p className="field-hint">{t("venue.ui.wizard.lastStep")}</p> : null}
      </div>
    </div>
  );
}
