// Bascule clair / sombre — PARTAGÉE par le client et le pro (Lot UI-D2).
//
// Elle vit ici et non dans une app parce que le pro en a besoin aussi, et que
// deux copies d'une même bascule finiraient par diverger sur la clé de
// stockage — soit deux thèmes qui s'ignorent sur le même navigateur.
//
// ⚠ Elle ne traduit RIEN : le client parle `next-intl`, le pro a son propre
// mécanisme. L'étiquette arrive donc en `prop`, et chaque app la traduit chez
// elle. Un composant partagé qui choisirait son i18n imposerait celui d'une des
// deux apps à l'autre.
//
// ── Ce qui tient ce composant ────────────────────────────────────────────────
// 1. La PRÉFÉRENCE SYSTÈME décide par défaut, en CSS pur : sans clic, aucun JS
//    n'intervient et le premier rendu est déjà au bon thème.
// 2. Le CHOIX EXPLICITE est stocké et posé sur <html> AVANT peinture (script
//    d'amorçage côté app), ce qui évite l'éclair blanc.
// 3. L'ICÔNE est choisie par le CSS — les deux sont dans le DOM, la règle de
//    thème n'en montre qu'une. Rien à recalculer à l'hydratation.
import type { JSX } from "react";
import { currentTheme, THEME_STORAGE_KEY, type ExplicitTheme } from "../theme-storage";

export interface ThemeToggleProps {
  /** Nom accessible. Il ne doit PAS annoncer la destination (« passer en
   *  sombre ») : l'icône étant choisie par le CSS, le composant ne connaît pas
   *  l'état au rendu et l'étiquette mentirait une fois sur deux. */
  label: string;
}

export function ThemeToggle({ label }: ThemeToggleProps): JSX.Element {
  const toggle = () => {
    const next: ExplicitTheme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Navigation privée, quota, stockage bloqué : le thème s'applique quand
      // même pour cette visite. Perdre la persistance est un désagrément ;
      // lever ici casserait le bouton.
    }
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label}>
      <svg
        className="icon-moon"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg
        className="icon-sun"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
