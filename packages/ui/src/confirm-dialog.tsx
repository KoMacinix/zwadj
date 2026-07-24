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
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/** Sélecteur des éléments focalisables du panneau (piège de focus). */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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

  // Ouverture : on capture le DÉCLENCHEUR (activeElement) et l'état du scroll,
  // on donne le focus à ANNULER (une frappe Entrée accidentelle ne doit jamais
  // confirmer une action destructive). Le cleanup rend les deux — c'est la
  // restitution de focus exigée par §7, valable à la fermeture COMME au
  // démontage.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
  }, [open]);

  // Escape ferme ; Tab/Shift+Tab boucle à l'intérieur du panneau.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute("disabled")
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

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
