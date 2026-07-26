// Menu de compte (Lot A11a) — le rond à initiales en haut à droite et son
// menu déroulant. Partagé dans @zwadj/ui : A11b le réutilise tel quel côté
// Client, sans « Ajouter une salle ».
//
// ZÉRO texte en dur (règle du paquet) : libellés et éléments arrivent en props.
//
// PAS de portail, contrairement à ConfirmDialog : un menu doit rester ANCRÉ à
// son déclencheur, donc positionné par rapport à lui. Le portail résolvait un
// problème de dialogue plein écran (`position: fixed` faussé par un ancêtre
// transformé) qui ne se pose pas ici.
//
// ARIA : `aria-haspopup="menu"` + `aria-expanded` sur le bouton, `role="menu"`
// sur le panneau, `role="menuitem"` sur les entrées. PAS d'`aria-modal` — un
// menu n'est pas modal, et l'annoncer comme tel mentirait au lecteur d'écran.
import { useId, useRef, useState } from "react";
import { useDismissLayer } from "./use-dismiss-layer";

export interface AccountMenuItem {
  /** Clé stable (jamais l'index) : l'ordre des entrées diffère entre les apps. */
  key: string;
  label: string;
  onSelect: () => void;
  /** N'ajoute QU'une classe — aucune logique associée. */
  destructive?: boolean;
}

export interface AccountMenuProps {
  /** Nom affichable (pro : raison sociale ; client : prénom + nom). */
  displayName: string | null;
  /** Repli quand le nom manque : les initiales viennent alors de l'e-mail. */
  email: string;
  items: AccountMenuItem[];
  /** Libellé accessible du bouton, ex. « Mon compte ». */
  triggerLabel: string;
}

/**
 * Initiales affichées dans le rond.
 *
 * Deux mots ⇒ deux lettres ; un seul mot ⇒ une lettre. Le découpage se fait
 * sur les espaces ET les tirets (« El-Ryad » donne « ER »).
 *
 * `[...mot]` et non `mot[0]` : l'indexation d'une chaîne JavaScript renvoie une
 * unité de code UTF-16, ce qui coupe en deux un caractère hors BMP et affiche
 * un losange. Le nom d'un établissement algérien peut être écrit en arabe,
 * porter une ligature ou une emoji — on itère donc par point de code.
 */
export function initialsOf(displayName: string | null, email: string): string {
  const source = displayName?.trim() ? displayName : (email.split("@")[0] ?? email);
  const words = source.split(/[\s-]+/u).filter((w) => w.length > 0);
  const letters = words.slice(0, 2).map((w) => [...w][0] ?? "");
  const initials = letters.join("");
  // `toLocaleUpperCase()` sans locale : l'arabe est unicase (aucun effet), et
  // forcer « fr » casserait le i turc si le nom en contenait un.
  return initials === "" ? "?" : initials.toLocaleUpperCase();
}

export function AccountMenu({ displayName, email, items, triggerLabel }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  const close = () => setOpen(false);
  // Escape, piège de focus, focus d'entrée sur la première entrée, restitution
  // au déclencheur : tout vient du hook partagé. `lockScroll` reste faux — un
  // menu n'est pas modal.
  useDismissLayer({ open, panelRef, onDismiss: close, restoreFocusRef: triggerRef });

  return (
    <div
      className="account-menu"
      ref={wrapperRef}
      // Clic-extérieur : `onBlur` au niveau du CONTENEUR plutôt qu'un écouteur
      // `document` — `relatedTarget` dit où le focus s'en va, donc on ferme
      // seulement quand il QUITTE réellement le menu. Un écouteur document
      // devrait, lui, distinguer à la main les clics internes.
      onBlur={(event) => {
        if (!open) return;
        const next = event.relatedTarget as Node | null;
        if (next && wrapperRef.current?.contains(next)) return;
        close();
      }}
    >
      <button
        type="button"
        className="account-menu-trigger"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Les initiales sont DÉCORATIVES : le bouton porte déjà son libellé
            accessible, les faire lire en plus donnerait « A B Mon compte ». */}
        <span className="account-menu-initials" aria-hidden="true">
          {initialsOf(displayName, email)}
        </span>
      </button>

      {open ? (
        <div className="account-menu-panel" id={menuId} role="menu" ref={panelRef}>
          <p className="account-menu-identity">
            <span className="account-menu-name">{displayName ?? email}</span>
            {/* L'e-mail n'est répété que s'il n'est PAS déjà le nom affiché. */}
            {displayName ? <span className="account-menu-email">{email}</span> : null}
          </p>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={item.destructive ? "account-menu-item is-destructive" : "account-menu-item"}
              onClick={() => {
                // Fermer AVANT d'agir : si l'action navigue, le menu ne doit
                // pas survivre au changement de page. La restitution de focus
                // du hook cible alors un déclencheur démonté — `trigger?.focus?.()`
                // est optionnel précisément pour ce cas.
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
