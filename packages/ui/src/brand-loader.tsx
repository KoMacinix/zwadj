// Loader de marque (Lot A12, D44) — variante ANIMÉE du logo. Aucun spinner
// générique n'existait dans le repo : c'est une création, pas un remplacement.
//
// Le logo statique (`logo.tsx`) est composé de TROIS éléments avec des coupures
// d'entrelacement : il est INUTILISABLE tel quel pour un tracé animé, qui exige
// un trait continu. On en fait donc une VARIANTE — deux anneaux pleins et
// continus, sans entrelacement (impossible à conserver en un seul trait).
// `ZwadjLogoIcon` n'est jamais modifié.
//
// ZÉRO texte en dur (même règle que ConfirmDialog) : le libellé arrive en prop,
// le paquet ne connaît ni i18next ni next-intl — c'est la condition pour qu'il
// serve les DEUX apps.
//
// ZÉRO JavaScript, ZÉRO dépendance : l'animation est purement CSS (cible
// Android bas de gamme, backlog 24.6).

/**
 * Tracé du loader. Intersection basse EXACTE des deux cercles (centres (12,16)
 * et (20,16), r = 7 ⇒ (16, 16+√33) ≈ (16, 21.7446)), chaque commande `A` étant
 * exactement un demi-cercle entre deux points diamétralement opposés. Départ au
 * point d'intersection inférieur, tête vers la GAUCHE, tour complet de l'anneau
 * gauche, retour au départ, puis enchaînement SANS ARRÊT sur l'anneau droit
 * dans le même sens de rotation.
 *
 * ⚠ UN SEUL SOUS-CHEMIN, et ce n'est pas un détail de style : SVG RÉINITIALISE
 * le motif de tirets à CHAQUE sous-chemin. Un second `M` au milieu ferait
 * apparaître DEUX serpents simultanés, un par anneau. Exporté pour que le test
 * puisse le prouver (`(d.match(/M/g) ?? []).length === 1`).
 */
export const BRAND_LOADER_PATH =
  "M 16 21.7446 A 7 7 0 0 1 8 10.2554 A 7 7 0 0 1 16 21.7446 A 7 7 0 0 1 24 10.2554 A 7 7 0 0 1 16 21.7446";

/**
 * Icône animée seule — SANS rôle ARIA : c'est le conteneur `BrandLoader` qui
 * annonce le chargement, l'icône est décorative.
 */
export function BrandLoaderIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="brand-loader-icon"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* `pathLength="1"` normalise TOUTES les valeurs de tirets : le motif ne
          dépend plus ni de la taille rendue ni de la longueur réelle du tracé.
          Filet si un navigateur cible se comportait mal avec `pathLength` :
          longueur réelle = 2 × 2π × 7 = 87.965 ⇒ `stroke-dasharray: 26.39
          61.57` et un offset animé de 0 à -87.965 (feuille de styles). */}
      <path
        d={BRAND_LOADER_PATH}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface BrandLoaderProps {
  /** Texte annoncé aux lecteurs d'écran (« Chargement… »). Jamais en dur. */
  label: string;
  size?: number;
}

/**
 * Bloc de chargement centré — la forme consommée par les deux apps.
 * `role="status"` + `aria-live="polite"` : l'attente est annoncée, sans voler
 * le focus ni interrompre ce qui est en train d'être lu.
 */
export function BrandLoader({ label, size = 250 }: BrandLoaderProps) {
  return (
    <div className="brand-loader" role="status" aria-live="polite">
      <BrandLoaderIcon size={size} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
