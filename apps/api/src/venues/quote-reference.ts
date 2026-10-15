// L'ANNÉE D'UNE RÉFÉRENCE DE DEVIS — module PUR (rang 39, D333, L35-3). Il ne lit ni l'horloge, ni le fuseau de l'hôte, ni une locale : il reçoit un instant.
//
// R3 (Ko, 11/10/2026) : « L'année est celle de la création de la version 1, à l'heure d'Alger (D48). » D48 : UTC + 1, SANS heure d'été ; le fuseau ne se dérive JAMAIS de la locale
// (D56) ni de l'hôte. Le cas qui compte est le passage de l'année : le 31 décembre à 23 h 00 UTC il est déjà minuit à Alger, et la référence d'un devis créé à cet instant porte l'année
// SUIVANTE. Un calcul en UTC donnerait 2026 jusqu'à 00 h 00 UTC, soit une heure d'une référence fausse chaque 31 décembre.
//
// ⚠ Décalage FIXE plutôt que `Intl.DateTimeFormat({ timeZone: "Africa/Algiers" })` : D48 pose « UTC + 1 sans heure d'été » comme règle du produit, et un calcul qui ne dépend d'aucune base de
// fuseaux horaires de l'hôte est le même partout (la migration, elle, lit `Africa/Algiers` dans PostgreSQL : les deux disent la même chose pour toute date postérieure à 1981, et
// `quote-numbering.int-spec.ts` mesure l'invariant `reference_year = année d'Alger de created_at` sur la base réelle).
const DECALAGE_ALGER_MS = 60 * 60 * 1000;

/** L'année civile, à Alger, de l'instant `maintenant`. Une date invalide LÈVE : une année `NaN` ne devient pas une référence. */
export function algiersYear(maintenant: Date): number {
  const ms = maintenant.getTime();
  if (Number.isNaN(ms)) throw new RangeError("algiersYear : date invalide");
  return new Date(ms + DECALAGE_ALGER_MS).getUTCFullYear();
}
