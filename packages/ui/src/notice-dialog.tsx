// Fenêtre d'INFORMATION partagée — rang 32, D325.
//
// Une confirmation qui ne demande rien : un titre, une phrase, un bouton. `ConfirmDialog` pose une QUESTION (annuler ou
// confirmer, le focus part sur « annuler » pour qu'un Entrée distrait ne confirme jamais) ; ce composant ANNONCE un fait
// accompli — « la date est bloquée pour Amina » — et n'a donc ni « annuler » ni action destructive. Il reprend la même
// mécanique (`useDismissLayer` : Échap ferme, Tab boucle, le focus revient au déclencheur) et les mêmes classes que
// `ConfirmDialog` : un seul piège de focus dans le dépôt, un seul rendu de fenêtre.
//
// ZÉRO texte en dur : tout arrive en props. Portail sur `document.body`, pour la même raison que `ConfirmDialog`.
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDismissLayer } from "./use-dismiss-layer";

export interface NoticeDialogProps {
  open: boolean;
  title: string;
  description: string;
  /** Libellé du seul bouton (« Fermer »). */
  closeLabel: string;
  onClose: () => void;
}

export function NoticeDialog({ open, title, description, closeLabel, onClose }: NoticeDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-desc`;

  useDismissLayer({ open, panelRef, onDismiss: onClose, initialFocusRef: closeRef, lockScroll: true });

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 className="dialog-title" id={titleId}>
          {title}
        </h2>
        <p className="dialog-desc" id={descriptionId}>
          {description}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-accent" ref={closeRef} onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
