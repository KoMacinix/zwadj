import type { AppLocale } from "./index";

/**
 * Formate un montant en CENTIMES de DZD (invariant : argent en entiers)
 * vers une chaîne localisée. Le formatage locale n'intervient qu'à
 * l'affichage — jamais dans les calculs.
 */
export function formatDZD(amountCents: number, locale: AppLocale = "fr"): string {
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
