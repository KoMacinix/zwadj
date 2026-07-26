// Dialogue de confirmation PARTAGÉ (Lot A5, §7) — promu dans @zwadj/ui parce
// qu'il resservira dès A6a (suppression de photo/scène) puis partout ailleurs.
//
// ZÉRO texte en dur : tous les libellés arrivent en props. Le paquet ne connaît
// ni i18next ni next-intl — c'est la condition pour qu'il serve les DEUX apps.
//
// PORTAIL (tranché §7/correctif C) : `createPortal(node, document.body)`.
// Motif : `position: fixed` n'est PAS relatif au viewport si un ancêtre porte
// `transform`/`filter`/`will-change` (piège CSS classique), et un overlay
// non-portalisé peut être rogné par l'`overflow` d'un ancêtre. Pour un
// composant voulu « réutilisable partout », le portail est le patron robuste.
// `react-dom` est déjà peer des deux apps → zéro nouvelle dépendance.
//
// Lot A11a : la mécanique clavier/focus a été EXTRAITE dans `useDismissLayer`
// et est désormais partagée avec le menu de compte — un seul piège de focus
// dans le dépôt, pas trois. Le comportement visible est inchangé (les tests
// A5 de ce composant sont le filet de régression du refactor) : Escape ferme,
// Tab boucle, le focus va sur ANNULER à l'ouverture et revient au déclencheur
// à la fermeture, le défilement d'arrière-plan est bloqué.
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useDismissLayer } from "./use-dismiss-layer";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** N'ajoute QU'une classe (.btn-danger) — aucune logique associée. */
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-desc`;

  // `initialFocusRef` = ANNULER, et non le premier focalisable : une frappe
  // Entrée accidentelle ne doit jamais confirmer une action destructive.
  // `lockScroll` : c'est un dialogue MODAL, l'arrière-plan ne défile pas.
  useDismissLayer({
    open,
    panelRef,
    onDismiss: onCancel,
    initialFocusRef: cancelRef,
    lockScroll: true
  });

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-overlay"
      // mousedown (et pas click) : sans ça, une sélection de texte commencée
      // DANS le panneau et relâchée dehors fermerait le dialogue.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
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
          <button type="button" className="btn btn-ghost" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={destructive ? "btn btn-danger" : "btn btn-accent"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
