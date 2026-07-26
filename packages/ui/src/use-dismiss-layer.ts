// Mécanique commune aux surfaces « en sur-couche » (Lot A11a).
//
// Le cadrage exigeait de NE PAS écrire une troisième variante de piège de
// focus. `ConfirmDialog` (A5) et le menu de compte ont pourtant des contrats
// ARIA différents — un dialogue est modal, un menu ne l'est pas — donc on ne
// peut pas « réutiliser » l'un pour l'autre. Ce qui est réellement commun, et
// qui est extrait ici, ce sont les QUATRE comportements clavier/souris :
// Escape ferme · Tab boucle à l'intérieur · le focus part au bon endroit à
// l'ouverture · le focus REVIENT au déclencheur à la fermeture.
//
// `ConfirmDialog` est recâblé sur ce hook dans le même lot : ses tests A5
// existants servent de filet de régression au refactor.
import { useEffect, type RefObject } from "react";

/** Sélecteur des éléments focalisables (identique à celui d'A5). */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface DismissLayerOptions {
  open: boolean;
  /** Conteneur dans lequel le focus doit rester tant que la couche est ouverte. */
  panelRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /**
   * Élément à focaliser à l'ouverture. `undefined` ⇒ le premier focalisable du
   * panneau. `ConfirmDialog` s'en sert pour focaliser ANNULER, afin qu'une
   * frappe Entrée accidentelle ne confirme jamais une action destructive.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Element auquel RENDRE le focus a la fermeture. Par defaut
   *  `document.activeElement` au moment de l'ouverture — correct pour un
   *  dialogue ouvert depuis un declencheur quelconque, mais insuffisant pour
   *  un menu : sur macOS, cliquer un bouton ne lui donne PAS le focus. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
  /** `true` pour un dialogue modal : bloque le défilement de l'arrière-plan. */
  lockScroll?: boolean;
}

export function useDismissLayer({
  open,
  panelRef,
  onDismiss,
  initialFocusRef,
  restoreFocusRef,
  lockScroll = false
}: DismissLayerOptions): void {
  // Focus d'entrée + restitution. Le déclencheur est capturé via
  // `document.activeElement` AVANT de déplacer le focus ; le cleanup le rend,
  // ce qui couvre la fermeture ET le démontage brutal du composant.
  useEffect(() => {
    if (!open) return;
    const trigger = restoreFocusRef?.current ?? (document.activeElement as HTMLElement | null);
    const previousOverflow = lockScroll ? document.body.style.overflow : null;
    if (lockScroll) document.body.style.overflow = "hidden";

    const target =
      initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
    target?.focus();

    return () => {
      if (previousOverflow !== null) document.body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
    // `initialFocusRef`/`panelRef` sont des refs stables : les lister ferait
    // rejouer l'effet à chaque rendu sans rien changer.
  }, [open, lockScroll, restoreFocusRef]);

  // Escape ferme ; Tab/Shift+Tab boucle à l'intérieur du panneau.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
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
  }, [open, onDismiss]);
}
