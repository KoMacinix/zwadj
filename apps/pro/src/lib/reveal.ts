// Révéler un bloc qui vient d'apparaître, et y emmener l'utilisateur — Lot R2d.
//
// Le besoin : au clic sur « Calculer le devis », le devis s'affiche PLUS BAS que
// le bouton. Sur un écran de portable, rien ne bouge dans le champ de vision et
// le pro croit que le clic n'a rien fait — il reclique.
//
// ⚠ FAIRE DÉFILER NE SUFFIT PAS, et c'est le cœur de ce fichier. Un défilement
// visuel ne déplace pas le curseur d'un lecteur d'écran : la personne aveugle
// resterait sur le bouton, à écouter le silence, pendant que le montant
// s'affiche hors de sa portée. Le FOCUS doit suivre, sinon on n'a corrigé le
// problème que pour les voyants.

/**
 * `prefers-reduced-motion` — la préférence système contre les animations.
 *
 * ⚠ DÉFAUT À `true` QUAND ON NE SAIT PAS. `matchMedia` manque en jsdom et dans
 * de vieux moteurs ; dans le doute on choisit le saut instantané plutôt que le
 * glissement. Se tromper vers « pas d'animation » coûte un peu d'élégance ; se
 * tromper vers « animation » peut déclencher un vertige chez quelqu'un qui a
 * justement demandé à en être protégé. L'inconfort n'est pas symétrique.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Amène le bloc dans le champ de vision ET y pose le focus.
 *
 * L'élément visé doit porter `tabIndex={-1}` : sans lui, `focus()` est sans
 * effet sur un conteneur non interactif. `-1` le rend atteignable par le code
 * sans l'insérer dans l'ordre de tabulation — on ne veut pas que le pro traverse
 * un bloc de lecture à chaque `Tab`.
 */
export function revealAndFocus(cible: HTMLElement | null): void {
  if (cible === null) return;

  // ⚠ `preventScroll` N'EST PAS UNE OPTION DÉCORATIVE. `focus()` fait défiler
  // tout seul, d'un saut sec, et ignore `prefers-reduced-motion`. Sans ce
  // drapeau, le défilement choisi juste après serait un SECOND mouvement par
  // dessus le premier — l'écran sauterait puis glisserait.
  cible.focus({ preventScroll: true });

  // `scrollIntoView` n'existe pas en jsdom : l'appel optionnel évite de faire
  // dépendre le comportement du navigateur d'un environnement de test.
  cible.scrollIntoView?.({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start"
  });
}
