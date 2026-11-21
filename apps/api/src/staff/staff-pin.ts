// LE PIN : LE GÉNÉRATEUR ET LA LISTE FERMÉE DES PIN TRIVIAUX — rang 58, L36-3b (D356, DR5, MP-10). Un module PUR : l'aléa lui est PASSÉ en paramètre (aucun `Math.random`, aucun port `Random` : S-109) — le hacheur
// (`staff-pin-hasher.ts`) lui passe `randomInt` de `node:crypto`. Il tire jusqu'à obtenir un PIN qui n'est PAS trivial, et la boucle est BORNÉE.
//
// ⛔ LA LISTE EST FERMÉE (MP-10) : elle ne grossit pas en silence. Un PIN est trivial s'il est
//   · fait d'un seul chiffre (« 0000 », « 7777 ») ;
//   · une SUITE de pas +1 ou −1 modulo 10 (« 1234 », « 7890 », « 4321 », « 0987 ») ;
//   · une répétition de deux chiffres (« 1212 ») ou de paires (« 1122 », « 6677 »), pour quatre chiffres ou plus.
// Pour quatre chiffres : 10 + 90 + 90 + 10 + 10 = 210 PIN refusés sur 10 000 (2,1 %) — une perte d'entropie négligeable, et une liste que l'on peut relire. ⚠ La règle suit la LONGUEUR (paramètre du levier).
// ⚠ Le schéma de la connexion NE REFUSE PAS un PIN trivial : il ne révèle rien de la liste (un refus « PIN trivial » à la connexion dirait quelles valeurs sont exclues).
import { STAFF_LIMITS } from "@zwadj/types";

/** Le nombre MAXIMAL de tirages avant d'abandonner : un générateur d'aléa qui ne rend que des PIN triviaux est défectueux, et on ne boucle jamais sans fin. */
export const PIN_MAX_DRAWS = 1000;

/** `true` si ce PIN figure dans la liste fermée des PIN triviaux. */
export function isTrivialPin(pin: string): boolean {
  const c = [...pin].map(Number);
  const n = c.length;
  if (n < 2) return true;
  // un seul chiffre
  if (c.every((x) => x === c[0])) return true;
  // une suite de pas +1 ou −1 (modulo 10)
  const pas = (i: number): number => (c[i + 1]! - c[i]! + 10) % 10;
  if (c.slice(0, -1).every((_, i) => pas(i) === 1)) return true;
  if (c.slice(0, -1).every((_, i) => pas(i) === 9)) return true;
  // une répétition de deux chiffres (abab…) — à partir de quatre chiffres
  if (n >= 4 && c.every((x, i) => i < 2 || x === c[i - 2])) return true;
  // des paires (aabb…) — pour une longueur paire de quatre chiffres ou plus
  if (n >= 4 && n % 2 === 0 && c.every((x, i) => x === c[i - (i % 2)])) return true;
  return false;
}

/**
 * Un PIN de `length` chiffres tiré par `nextInt` (une fonction qui rend un entier dans `[0, max)` : `randomInt` de `node:crypto`). Les zéros de tête sont RENDUS (« 0482 »). Un PIN trivial est RE-TIRÉ ; au bout de
 * `PIN_MAX_DRAWS` tirages triviaux, ou si `nextInt` rend une valeur hors de l'intervalle, la fonction LÈVE — jamais un PIN de cinq chiffres, jamais une boucle sans fin.
 */
export function generatePin(nextInt: (maxExclusive: number) => number, length: number = STAFF_LIMITS.PIN_LENGTH): string {
  const max = 10 ** length;
  for (let i = 0; i < PIN_MAX_DRAWS; i += 1) {
    const n = nextInt(max);
    if (!Number.isInteger(n) || n < 0 || n >= max) throw new Error(`PIN : tirage hors de l'intervalle [0, ${max}) : ${n}`);
    const pin = String(n).padStart(length, "0");
    if (!isTrivialPin(pin)) return pin;
  }
  throw new Error(`PIN : ${PIN_MAX_DRAWS} tirages triviaux de suite — le générateur d'aléa est défectueux`);
}
