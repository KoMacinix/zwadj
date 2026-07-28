// Lot UI-P1 — icônes partagées client/pro. Volontairement inline (pas de
// dépendance d'icônes) : le dépôt n'en a aucune et une flèche ne justifie pas
// d'en introduire une.
//
// RTL : la flèche est dessinée vers la GAUCHE et retournée par la feuille de
// styles quand `dir="rtl"` (`[dir="rtl"] .backlink svg`, et sur un bouton via
// l'attribut `data-mirror-rtl` posé ici). En arabe, « revenir » pointe à
// droite — la retourner en CSS évite d'avoir à choisir un glyphe par langue.
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
