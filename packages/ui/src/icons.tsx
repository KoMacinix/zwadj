// Lot UI-P1 — icônes partagées client/pro.
//
// ⚠ Le commentaire d'origine disait « pas de dépendance d'icônes : le dépôt n'en
// a aucune ». C'était vrai au Lot UI-P1, ça ne l'est plus depuis le Lot A5 :
// `amenity-icon.tsx` (même paquet) consomme `lucide-react`. La flèche de retour
// reste dessinée à la main — elle porte `data-mirror-rtl`, qu'aucune icône de
// bibliothèque ne fournit — mais les icônes ajoutées ensuite viennent de lucide,
// en IMPORTS NOMMÉS EXPLICITES (jamais `lucide[nom]` : l'accès indexé tue le
// tree-shaking et casse à l'exécution sur un nom inconnu).
//
// RTL : la flèche est dessinée vers la GAUCHE et retournée par la feuille de
// styles quand `dir="rtl"` (`[dir="rtl"] .backlink svg`, et sur un bouton via
// l'attribut `data-mirror-rtl` posé ici). En arabe, « revenir » pointe à
// droite — la retourner en CSS évite d'avoir à choisir un glyphe par langue.
import { Heart, LayoutGrid, Map, Star } from "lucide-react";

export function ArrowBackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-mirror-rtl=""
    >
      <path d="M13 8H3" />
      <path d="M7 4 3 8l4 4" />
    </svg>
  );
}

/* ── Barre de résultats de la recherche (Lot UI-D5) ──────────────────────────
   Quatre icônes reprises du design de référence. Elles vivent ICI et non dans
   `apps/client` pour une raison mécanique : `lucide-react` est une dépendance
   de `@zwadj/ui`, pas du Client — l'importer côté app exigerait de l'ajouter à
   son `package.json` pour une poignée de glyphes déjà installés à côté.

   Toutes sont DÉCORATIVES (`aria-hidden`) : ce qui les entoure porte un texte,
   visible ou en `.sr-only`. Une icône qui porte seule le sens d'un contrôle est
   invisible pour un lecteur d'écran. */

/** Vue en grille — état par défaut de la liste des salles. */
export function GridViewIcon({ size = 15 }: { size?: number }) {
  return <LayoutGrid size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}

/** Vue carte — post-MVP : le bouton bascule vers un cartouche, pas vers une carte. */
export function MapViewIcon({ size = 15 }: { size?: number }) {
  return <Map size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}

/** Étoile PLEINE de la note. Le remplissage suit `--star` (token de la ramp de
 *  support, AGENTS.md) : une étoile creuse se lit « non notée ». */
export function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <Star size={size} strokeWidth={1.5} fill="var(--star)" stroke="var(--star)" aria-hidden="true" focusable="false" />
  );
}

/** Cœur des favoris. CREUX : la fonctionnalité n'existe pas encore, un cœur
 *  plein annoncerait une salle déjà enregistrée. */
export function HeartIcon({ size = 16 }: { size?: number }) {
  return <Heart size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}
