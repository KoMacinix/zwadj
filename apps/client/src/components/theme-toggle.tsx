"use client";

// Bascule clair / sombre (Lot UI-D1 — D64).
//
// ── Trois décisions qui tiennent ce composant ────────────────────────────────
// 1. La PRÉFÉRENCE SYSTÈME décide par défaut, en CSS pur
//    (`prefers-color-scheme`) : sans clic, aucun JS n'intervient et le premier
//    rendu est déjà au bon thème.
// 2. Le CHOIX EXPLICITE est stocké dans `localStorage` et posé sur <html> par
//    un script AVANT peinture (voir `layout.tsx`). C'est ce qui évite l'éclair
//    blanc classique du sombre : sans lui, la page s'affiche en clair puis
//    saute au sombre à l'hydratation.
//    Pas de cookie : il rendrait dynamique le layout RACINE, et donc toutes
//    les pages statiques (CGU, confidentialité) — un thème ne vaut pas ça.
// 3. L'ICÔNE est choisie par le CSS (les deux sont dans le DOM, la règle de
//    thème n'en montre qu'une) : rien à recalculer à l'hydratation, donc aucun
//    écart serveur/client à faire taire.
//
// ⚠ Le nom accessible ne dépend PAS du CSS. Si l'étiquette annonçait la
// destination (« passer en sombre »), il faudrait la calculer en JS après
// montage — et pendant un instant le bouton annoncerait le contraire de ce
// qu'il fait. « Changer de thème » est vrai dans les deux sens.
import { useTranslations } from "next-intl";

/** Clé de stockage. Préfixée : `localStorage` est partagé par toute l'origine. */
export const THEME_STORAGE_KEY = "zwadj-theme";

/** Thème EXPLICITEMENT choisi. L'absence de valeur n'est pas un troisième
 *  thème : c'est « suis le système », et cela ne se stocke pas. */
export type ExplicitTheme = "light" | "dark";

/** Thème effectif à cet instant : l'attribut s'il existe, sinon ce que le
 *  système demande. Exporté pour que le test raisonne sur la même règle que le
 *  composant, au lieu d'en redéclarer une seconde. */
export function currentTheme(): ExplicitTheme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const t = useTranslations("common.theme");

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
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={t("toggle")}>
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
