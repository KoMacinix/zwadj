// Référentiels publics (Flux A, Lot A1) — formes de réponse de
// GET /api/v1/wilayas et GET /api/v1/amenities. Consommés par l'UI de
// recherche Client (A7 : filtres ville/équipements) et le formulaire Pro (A5).

/** Ville seedée d'une wilaya. `wilayaId` interne volontairement NON exposé :
 *  la ville arrive toujours imbriquée dans sa wilaya. */
export interface CityDTO {
  id: string;
  nameFr: string;
  nameAr: string;
  /** Coordonnées du centre de la commune (6 décimales). `number`, pas une
   *  chaîne : coordonnées ≠ argent, l'invariant « entiers » ne s'applique pas. */
  lat: number | null;
  lng: number | null;
}

/** Wilaya avec ses villes seedées (vide pour les wilayas hors couverture —
 *  au Lot A1, seule Alger/16 a des villes). Tri : `code` officiel croissant. */
export interface WilayaDTO {
  id: string;
  /** Code officiel (1–58 au MVP — cf. commentaire du seed sur la réforme 2026). */
  code: number;
  nameFr: string;
  nameAr: string;
  /** Triées par `nameFr` croissant (collation de la base). */
  cities: CityDTO[];
}

/** Équipement filtrable d'une salle. `key` est la clé STABLE (i18n côté data :
 *  nameFr/nameAr voyagent avec), `icon` un nom d'icône lucide. */
export interface AmenityDTO {
  id: string;
  key: string;
  nameFr: string;
  nameAr: string;
  icon: string | null;
}
