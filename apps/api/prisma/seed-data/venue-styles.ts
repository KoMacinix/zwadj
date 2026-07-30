// Styles de salle (VenueStyle) — référentiel seedé (Flux A, Lot A13, D65).
// Clé naturelle : `key` (kebab-case, stable) — c'est elle que le filtre public
// transporte dans l'URL, jamais le libellé. Ajuster un libellé = modifier UNE
// ligne ici puis re-seeder ; ajouter un style = une ligne, jamais une migration.
//
// Les quatre entrées sont celles du design de référence. `sortOrder` fixe
// l'ordre des puces : éditorial, identique en FR et en AR — trier par libellé
// donnerait deux ordres différents selon la langue.

export interface SeedVenueStyle {
  key: string;
  nameFr: string;
  nameAr: string;
  sortOrder: number;
}

export const VENUE_STYLES: SeedVenueStyle[] = [
  { key: "royal", nameFr: "Royal", nameAr: "ملكي", sortOrder: 1 },
  { key: "jardin", nameFr: "Jardin", nameAr: "حديقة", sortOrder: 2 },
  { key: "bord-de-mer", nameFr: "Bord de mer", nameAr: "على البحر", sortOrder: 3 },
  { key: "patrimoine", nameFr: "Patrimoine", nameAr: "تراثي", sortOrder: 4 }
];
