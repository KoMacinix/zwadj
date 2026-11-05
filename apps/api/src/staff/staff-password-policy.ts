// La POLITIQUE DE MOT DE PASSE du personnel — rang 44, L36-3a-1 (D341, MP-24, S-111, R-5 (D341)). DR5 : « passwordSchema actuel + refus des plus courants + refus de réutiliser le précédent ». Rien au-delà
// (R-5 (D341) : « aucune règle de mot de passe au-delà de DR5 »). Un module PUR (D187) : la liste est une donnée importée, la réutilisation arrive en booléen — la comparaison au hachage courant exige argon2, qui
// vit dans le service.
//
// ⚠ Ce que la liste achète, MESURÉ (table d'ouverture) : 10 001 entrées, dont 340 seulement passent déjà `passwordSchema` (≥ 8 caractères, une lettre, un chiffre) — elle n'ajoute que 340 refus à la règle d'aujourd'hui.
import { STAFF_COMMON_PASSWORDS } from "./staff-common-passwords";

/** L'ensemble interrogé : la liste, en MINUSCULES (R-5 : « comparaison après mise en minuscules »). Construit une fois. */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(STAFF_COMMON_PASSWORDS.map((p) => p.toLowerCase()));

/** Le mot de passe figure-t-il dans la liste des plus courants ? Comparaison EXACTE après mise en minuscules — ni rognage, ni sous-chaîne : un mot de passe qui CONTIENT un mot courant n'est pas courant. */
export function isCommonPassword(plain: string, list: ReadonlySet<string> = COMMON_PASSWORDS): boolean {
  return list.has(plain.toLowerCase());
}

export type PasswordViolation = "common" | "reused";

/**
 * La raison d'un refus, dans l'ordre d'ÉVALUATION : le courant d'abord (il ne coûte aucun argon2), la réutilisation ensuite (elle en coûte un). `null` = rien à reprocher.
 */
export function passwordViolation(input: { common: boolean; sameAsCurrent: boolean }): PasswordViolation | null {
  if (input.common) return "common";
  if (input.sameAsCurrent) return "reused";
  return null;
}
