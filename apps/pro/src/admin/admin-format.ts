// ADM-2 (D350, rang 52) — les deux formateurs de l'écran d'administration : la DATE (à l'heure d'Alger) et le TAUX (en pour cent).
//
// ⚠ POURQUOI UN MODULE À PART : la règle des dates et des nombres est `intlLocale` de `@zwadj/types` (FC-6 : une garde de SOURCE, `apps/client/src/lib/intl-locale-guard.test.ts`, lit les sources des DEUX applications) ;
// `admin-texts.ts` ne peut importer aucun paquet (la spec e2e le lit et ne résout rien du dépôt). Les textes restent dans `admin-texts.ts`, la mise en forme des nombres et des dates est ici. Les écrans d'administration
// sont en FRANÇAIS seul (D-2) : la langue passée est donc `"fr"`, écrite, et non la langue du navigateur — le fuseau, lui, n'est jamais dérivé de la locale (D48, D56).
import { intlLocale } from "@zwadj/types";

/** UNE date, à l'heure d'ALGER (UTC+1, sans heure d'été) — le fuseau n'est jamais dérivé de la locale (D48, D56). Pas d'heure : ce que l'admin lit est le JOUR du refus ou de la demande (D57 interdit
 *  `Intl` pour l'heure). */
export function formatAdminDate(iso: string): string {
  return new Intl.DateTimeFormat(intlLocale("fr"), { timeZone: "Africa/Algiers", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/** Un taux en points de base, en pour cent, avec ses décimales significatives (250 → « 2,5 % »). */
export function formatBps(bps: number): string {
  return `${new Intl.NumberFormat(intlLocale("fr"), { maximumFractionDigits: 2 }).format(bps / 100)}\u00a0%`;
}
