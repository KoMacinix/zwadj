/**
 * Mise en forme d'un montant en dinars — LA SEULE FORMULE (rang 33, D326).
 *
 * ⚠ ELLE VIVAIT DANS `@zwadj/i18n` (`src/format.ts`) ET C'EST L'API QUI L'A DÉMÉNAGÉE. L'API n'importe que des JSON d'`@zwadj/i18n` : son paquet pointe sur du TypeScript source
 * (`main: ./src/index.ts`), que le build `tsc` de l'API ne compile pas et que Node n'exécute pas (`auth-emails.service.ts` l'écrit). Or le PDF du devis imprime des montants, et
 * « le montant imprimé est celui que l'écran affiche » : écrire une seconde formule dans l'API aurait été DEUX ENDROITS POUR LE MÊME CALCUL — la divergence est silencieuse.
 * `@zwadj/types` est compilé (`dist`) et déjà consommé par l'API à l'exécution : la formule vit ICI, `@zwadj/i18n` la RÉEXPORTE (aucun consommateur ne change d'import).
 *
 * Ce module formate des centimes ; il ne calcule rien. Argent en entiers (centimes), jamais de float : un non-entier LÈVE.
 * Le formatage locale n'intervient qu'à l'affichage — jamais dans les calculs.
 */
export function formatDZD(amountCents: number, locale: "fr" | "ar" = "fr"): string {
  if (!Number.isInteger(amountCents)) {
    throw new TypeError("formatDZD attend des centimes entiers (jamais de float).");
  }
  const intlLocale = locale === "ar" ? "ar-DZ" : "fr-DZ";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0
  }).format(amountCents / 100);
}
