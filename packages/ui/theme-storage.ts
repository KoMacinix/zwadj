// Thème : la clé, le script d'amorçage et la lecture de l'état effectif.
//
// ⚠ Ce fichier est SANS React, et il est à la racine du paquet (comme
// `styles.css`) pour être importable par `@zwadj/ui/theme-storage`.
// Raison : le layout racine du client est un composant SERVEUR, et importer le
// baril `@zwadj/ui` y ferait entrer `useRef`/`useEffect` des composants
// interactifs — Next refuse de compiler, à juste titre. Un script d'amorçage
// n'a besoin d'aucun React ; il ne doit donc dépendre d'aucun.
//
// Le tout vit à UN seul endroit pour que la clé lue par le script d'amorçage
// soit forcément celle qu'écrit la bascule. Deux constantes, c'est un jour où
// l'une change sans l'autre et où le thème choisi ne revient plus.

/** Clé de stockage. Préfixée : `localStorage` est partagé par toute l'origine. */
export const THEME_STORAGE_KEY = "zwadj-theme";

/** Thème EXPLICITEMENT choisi. L'absence de valeur n'est pas un troisième
 *  thème : c'est « suis le système », et cela ne se stocke pas. */
export type ExplicitTheme = "light" | "dark";

/** Thème effectif à cet instant : l'attribut s'il existe, sinon CLAIR.
 *
 *  ⚠ UI-D3 — la préférence système n'est plus consultée, ici ni en CSS. Zwadj
 *  s'ouvre en clair et le sombre est un choix explicite. Si cette fonction
 *  interrogeait encore `matchMedia` pendant que le CSS ne le fait plus, le
 *  premier clic d'une personne sous système sombre poserait `light` sur une
 *  page DÉJÀ claire : rien ne bougerait, et il faudrait cliquer deux fois. */
export function currentTheme(): ExplicitTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Script SYNCHRONE à injecter avant peinture par une app qui rend son HTML
 *  (client Next). Seule façon d'éviter que la page s'affiche en clair puis
 *  bascule sous les yeux de qui a CHOISI le sombre : le CSS ne sait pas lire
 *  `localStorage`, et attendre l'hydratation de React, c'est arriver trop tard. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

/** Équivalent impératif, pour une app montée par Vite qui n'a pas de HTML rendu
 *  par React où injecter le script (cas du pro). */
export function applyStoredTheme(): void {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") document.documentElement.dataset.theme = stored;
  } catch {
    // Stockage bloqué : la préférence système s'applique, en CSS, sans nous.
  }
}
