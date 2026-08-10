// Assistant de salle par étapes — Lot UIP-C.
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

  return (
    <div className="wizard">
      {/* La barre de progression est une VRAIE liste de liens/boutons, pas une
          frise décorative : un lecteur d'écran doit pouvoir énumérer les étapes
          et savoir laquelle est la sienne. */}
      <nav className="wizard-steps" aria-label={t("venue.ui.wizard.stepsLabel")}>
        <ol>
          {steps.map((s) => {
            const etat = s.n === step.n ? "is-current" : s.reachable ? "is-open" : "is-locked";
            return (
              <li key={s.n} className={`wizard-step-item ${etat}`}>
                <button
                  type="button"
                  onClick={() => onGo(s.n)}
                  disabled={!s.reachable || s.n === step.n}
                  aria-current={s.n === step.n ? "step" : undefined}
                >
                  <span className="wizard-step-n" aria-hidden="true">
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span>{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="field-hint wizard-progress">
        {t("venue.ui.wizard.progress", { n: step.n, total: steps.length })}
      </p>

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

      {next === undefined && step.valid ? (
        <p className="field-hint">{t("venue.ui.wizard.lastStep")}</p>
      ) : null}
    </div>
  );
}
