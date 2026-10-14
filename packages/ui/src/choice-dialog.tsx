// Fenêtre de CHOIX PARTAGÉE — rang 38 (D332, S-1). Même patron que `ConfirmDialog` (portail, `useDismissLayer`, classes `dialog-*`), mais avec N options au lieu d'une
// seule confirmation : « Dans quelle langue voulez-vous le PDF ? » — Français, العربية, Annuler.
//
// ZÉRO texte en dur : tout arrive en props (le paquet ne connaît ni i18next ni next-intl). Elle ne connaît pas non plus la remise d'un devis : elle rend l'identifiant de
// l'option choisie, c'est l'appelant qui en fait quelque chose.
//
// ⛔ « ANNULER » EST UN VRAI RÉSULTAT, PAS UNE FERMETURE : le bouton, Échap et le clic sur le fond appellent TOUS `onCancel`, jamais `onChoose`. Un appelant qui enregistre quelque
// chose au choix n'enregistre donc rien à l'annulation (décision 2 du relecteur). Le focus initial est « Annuler » : une frappe Entrée distraite ne choisit aucune option.
//
// ⚠ UN BOUTON QUI PORTE DU TEXTE D'UNE AUTRE LANGUE LE DÉCLARE (`lang`, `dir`) : sans eux, un lecteur d'écran lit « العربية » avec la voix de la page française, en lettres non
// liées. Une option sans `lang` ni `dir` n'en pose pas — rien n'est deviné.
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDismissLayer } from "./use-dismiss-layer";

export interface ChoiceOption<Id extends string> {
  readonly id: Id;
  readonly label: string;
  /** La langue du libellé, quand elle diffère de celle de la page. */
  readonly lang?: string;
  /** La direction du libellé, quand elle diffère de celle de la page. */
  readonly dir?: "ltr" | "rtl";
}

export interface ChoiceDialogProps<Id extends string> {
  open: boolean;
  title: string;
  description: string;
  options: readonly ChoiceOption<Id>[];
  cancelLabel: string;
  onChoose: (id: Id) => void;
  onCancel: () => void;
}

export function ChoiceDialog<Id extends string>({ open, title, description, options, cancelLabel, onChoose, onCancel }: ChoiceDialogProps<Id>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-desc`;

  useDismissLayer({ open, panelRef, onDismiss: onCancel, initialFocusRef: cancelRef, lockScroll: true });

  if (!open) return null;

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
          {title}
        </h2>
        <p className="dialog-desc" id={descriptionId}>
          {description}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          {options.map((option) => (
            <button key={option.id} type="button" className="btn btn-accent" lang={option.lang} dir={option.dir} onClick={() => onChoose(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
