import type { AppLocale } from "./index";

/**
 * Formate un montant en CENTIMES de DZD (invariant : argent en entiers)
 * vers une chaîne localisée. Le formatage locale n'intervient qu'à
 * l'affichage — jamais dans les calculs.
 *
 * ⚠ RÉEXPORTÉ DEPUIS `@zwadj/types` (rang 33, D326) : la formule y vit, UNE fois, parce que
 * l'API — qui imprime des montants dans le PDF du devis — ne peut importer que du code
 * compilé, et qu'une seconde formule serait deux endroits pour le même calcul. Le nom et la
 * signature n'ont pas changé : aucun consommateur ne touche à son import.
 */
export { formatDZD } from "@zwadj/types";

/**
 * Note moyenne d'une salle, sur 5, TOUJOURS à deux décimales (UI-D5).
 *
 * Deux décimales et pas une : « 4,9 » et « 4,90 » se lisent comme deux notes
 * différentes dans une grille où les cartes se comparent du regard, et une
 * colonne de nombres de largeurs inégales se lit mal.
 *
 * ⚠ `Intl` est ici légitime : l'interdit de D57 porte sur l'HEURE (bascule
 * AM/PM selon la locale du moteur), jamais sur les nombres. La locale suit
 * celle de `formatDZD` — `ar-DZ` rend des chiffres latins, comme partout en
 * Algérie ; c'est déjà le comportement des prix, on ne le contredit pas ici.
 */
export function formatRating(rating: number, locale: AppLocale = "fr"): string {
  const intlLocale = locale === "ar" ? "ar-DZ" : "fr-DZ";
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rating);
}
