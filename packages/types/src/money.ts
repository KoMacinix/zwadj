import { intlLocale } from "./intl-locale";

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
 * ⛔ FC-6 (session `front-client`) : la locale de mise en forme est `intlLocale` (`./intl-locale`), la SEULE règle des dates et
 * des nombres ; elle était écrite ici en ligne, et dans deux autres fichiers.
 */
export function formatDZD(amountCents: number, locale: "fr" | "ar" = "fr"): string {
  if (!Number.isInteger(amountCents)) {
    throw new TypeError("formatDZD attend des centimes entiers (jamais de float).");
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0
  }).format(amountCents / 100);
}

/**
 * La langue dans laquelle s'impriment et s'affichent les MONTANTS D'UN DEVIS (FC-6, session `front-client`).
 *
 * ⛔ DEUX DÉCISIONS SE RENCONTRENT ICI, et elle ne tranche pas entre elles. Ko, 04/10/2026 : « Les dates et les nombres en arabe se
 * formatent en ar-DZ. » D326 (rang 33), décision 1 du relecteur : un devis imprimé ne doit pas être « différent de celui affiché à
 * l'écran » — et le PDF (`apps/api/src/documents/quote-document.ts`) imprime ses montants par `formatDZD(cents)` SANS langue : le
 * format français, même dans une page arabe (« DA 189 000 », regardé par Ko). Passer l'écran du devis en `ar-DZ` sans le PDF ferait
 * mentir la seconde ; passer le PDF exige `apps/api`, hors de la session qui a écrit cette constante.
 * ⇒ Les écrans du devis la passent à `formatDZD`, et `apps/pro/src/venues/quote-amount.test.ts` la CONFRONTE aux appels du PDF :
 * le jour où le PDF passe une langue, la garde rougit et l'écran suit. Passer l'écran ET le PDF en `ar-DZ`, ensemble : décision due
 * à Ko.
 */
export const QUOTE_AMOUNT_LOCALE = "fr" as const;
