// Chrome de PARCOURS PAR ÉTAPES — rail, récapitulatif, carte active.
//
// ── Pourquoi ce fichier existe ──────────────────────────────────────────────
// Le Pro (assistant walk-in) et le Client (assistant de filtres) rendaient DEUX
// copies du même écran, préfixées `.wk-` et `.wz-`. Elles avaient DÉJÀ divergé,
// et personne ne l'avait vu :
//   - la coche du rail : icône `lucide` côté Pro, glyphe texte `✓` côté Client ;
//   - `.wz-recap-edit` n'avait pas le `flex-shrink: 0` de son jumeau — le
//     bouton « Modifier » se comprimait dès qu'une valeur récapitulée était
//     longue, ce qui arrive au premier nom de quartier un peu bavard ;
//   - `.wz-rail-btn` n'avait pas de `:hover` — le numéro cliquable ne disait
//     pas qu'il était cliquable.
// Aucun de ces écarts n'était un choix. C'est la duplication qui les a produits,
// et elle en produira d'autres tant qu'il y aura deux implémentations.
//
// ── Ce qui manquait AUX DEUX ────────────────────────────────────────────────
// Trois éléments de la maquette n'étaient nulle part :
//   ① l'animation BULLE À BULLE — ni `.wk-rail-n` ni `.wz-rail-n` n'avaient de
//     `transition` : le passage au rouge était instantané ;
//   ② l'animation CARTE À CARTE — écrite dans les deux feuilles, MUETTE dans
//     les deux applications. Voir `JourneyCard` : c'est le défaut le plus
//     retors du lot ;
//   ③ le TRAIT VERTICAL de liaison entre le dernier récapitulatif et la carte
//     active. Le `::before` du rail relie les pastilles entre elles — ce n'est
//     pas le même trait.
//
// ── Ce que ce module ne fait PAS ────────────────────────────────────────────
// Aucune i18n : `@zwadj/ui` ne connaît ni `next-intl` ni le catalogue. Tous les
// libellés arrivent en props, traduits par l'appelant. Aucune mise en page non
// plus : les `className` reçues portent les `grid-area` propres à chaque app.
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/** État d'une étape dans le rail.
 *  `done` affiche la coche, `current` et `todo` affichent le rang. */
export type JourneyStepState = "done" | "current" | "todo";

export interface JourneyStep {
  /** Identifiant stable — sert de `key`, jamais affiché. */
  id: string;
  /** Libellé visible, déjà traduit. */
  label: string;
  state: JourneyStepState;
  /** Nom accessible du bouton d'édition. ABSENT ⇒ l'étape n'est pas
   *  modifiable et reste un `<span>` : rien à désactiver, rien à tabuler.
   *  ⚠ Un booléen `editable` aurait obligé chaque appelant à fournir aussi un
   *  libellé « au cas où », y compris quand le bouton n'existe pas. */
  editLabel?: string;
}

function cx(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Rail de progression. Liste ORDONNÉE : l'ordre, l'étape courante et le total
 * ne doivent pas être seulement visuels.
 */
export function JourneyRail({
  steps,
  label,
  className,
  onEdit
}: {
  steps: readonly JourneyStep[];
  /** Nom accessible du `<nav>`. */
  label: string;
  className?: string;
  onEdit: (id: string) => void;
}) {
  return (
    <nav className={cx("zj-rail", className)} aria-label={label}>
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={step.state === "current" ? "is-current" : step.state === "done" ? "is-done" : "is-todo"}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.editLabel === undefined ? (
              <span className="zj-rail-n" aria-hidden="true">
                {step.state === "done" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}
              </span>
            ) : (
              // Cliquer la pastille vaut « Modifier » — mais seulement là où
              // « Modifier » existerait. Un bouton qui n'agit pas est pire
              // qu'un élément inerte.
              <button type="button" className="zj-rail-n zj-rail-btn" aria-label={step.editLabel} onClick={() => onEdit(step.id)}>
                {step.state === "done" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}
              </button>
            )}
            <span className="zj-rail-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface JourneyRecapRow {
  id: string;
  /** Nom de l'étape, déjà traduit. */
  step: string;
  /** Réponse donnée, déjà formatée. */
  value: string;
  /** Nom accessible du bouton « Modifier » de CETTE ligne. */
  editLabel: string;
}

/**
 * Récapitulatif des réponses déjà données.
 *
 * ⚠ LE BOUTON « MODIFIER » EST ICI, ET NULLE PART AILLEURS (exigence Ko : même
 * composant, même comportement). Il était recopié dans les deux applications,
 * et les deux copies avaient déjà divergé sur `flex-shrink`.
 */
export function JourneyRecap({
  rows,
  label,
  editText,
  className,
  disabled = false,
  onEdit
}: {
  rows: readonly JourneyRecapRow[];
  /** Nom accessible de la liste. */
  label: string;
  /** Texte visible du bouton (« Modifier »), déjà traduit. */
  editText: string;
  className?: string;
  /** Parcours conclu : les réponses restent lisibles, elles ne sont plus
   *  modifiables. Le Pro s'en sert après verrouillage du devis. */
  disabled?: boolean;
  onEdit: (id: string) => void;
}) {
  return (
    <ul className={cx("zj-recap", className)} aria-label={label}>
      {rows.map((row) => (
        <li key={row.id} className="zj-recap-row">
          <div>
            <span className="zj-recap-step">{row.step}</span>
            <span className="zj-recap-value">{row.value}</span>
          </div>
          <button
            type="button"
            className="zj-btn zj-recap-edit"
            disabled={disabled}
            aria-label={row.editLabel}
            onClick={() => onEdit(row.id)}
          >
            {editText}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Carte de l'étape active.
 *
 * ⚠⚠ LE `key` EST LA RAISON D'ÊTRE DE CE COMPOSANT — pas le balisage.
 *
 * Les deux feuilles de style déclaraient bien `animation: …-step-in 0.36s` sur
 * la carte. Elle n'a JAMAIS joué au changement d'étape, dans AUCUNE des deux
 * applications, depuis la première livraison. Raison : une `animation` CSS ne
 * rejoue que si l'élément est (re)créé ou si l'animation est réarmée. Les deux
 * apps rendaient une `<section>` STABLE ; React réconciliait le même nœud DOM,
 * le navigateur n'avait donc rien à rejouer. L'animation se voyait une fois, au
 * montage, et plus jamais.
 *
 * C'est un défaut qu'une relecture ne trouve pas : le CSS est correct, le JSX
 * est correct, et c'est leur RENCONTRE qui ne l'est pas. La maquette, elle,
 * montait `<div key={step}>` — et c'est ce détail, pas la courbe d'accélération,
 * qui fait l'effet.
 *
 * Le `stepId` en `key` force donc le remontage à chaque étape. Le `ref` reste
 * valide : React le réassigne sur le nouveau nœud, et l'effet de focus de
 * l'appelant s'exécute après.
 */
export function JourneyCard({
  stepId,
  className,
  labelledBy,
  cardRef,
  children
}: {
  /** Change à chaque étape. C'est LUI qui réarme l'animation. */
  stepId: string;
  className?: string;
  /** `id` du titre de la carte — la carte est un `<section>` nommé. */
  labelledBy: string;
  /** Pour déplacer le focus après un changement d'étape. */
  cardRef?: React.Ref<HTMLElement>;
  children: ReactNode;
}) {
  return (
    <section key={stepId} className={cx("zj-card", className)} ref={cardRef} tabIndex={-1} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

/**
 * Trait vertical reliant le dernier récapitulatif à la carte active.
 *
 * ⚠ Élément SÉPARÉ, et purement décoratif (`aria-hidden`). Il ne se confond pas
 * avec le `::before` du rail, qui relie les pastilles entre elles : celui-ci
 * relie deux BLOCS de la colonne de contenu. Il ne se rend que s'il a quelque
 * chose à relier — un trait qui part de rien ne relie rien.
 */
export function JourneyConnector({ className }: { className?: string }) {
  return <span className={cx("zj-connector", className)} aria-hidden="true" />;
}
