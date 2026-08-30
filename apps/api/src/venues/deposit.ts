// Acompte — Lot E1a, D81.
//
// Module PUR. Premier vrai consommateur de `roundToDinar`, qui attendait dans
// le moteur de prix « le premier calcul qui en fera : commission, acompte,
// remise ». Aucune seconde arithmétique monétaire n'est écrite ici : l'arrondi
// du dépôt reste défini une fois, au même endroit que le reste du chemin
// d'argent.
import { roundToDinar } from "./pricing-engine";

/** Politique d'acompte telle qu'elle est stockée sur la salle. Exactement un
 *  des deux champs est non nul — invariant tenu par le CHECK
 *  `venues_deposit_policy_exclusive`, par Zod, et par le type partagé. */
export interface DepositPolicyRow {
  depositRateBps: number | null;
  depositAmountCents: number | null;
}

/**
 * Acompte dû pour un total donné.
 *
 * ⚠ LE CAS QUI COMPTE, et il est réel — écrit ici avant toute validation,
 * conformément à D55. Une salle exige 100 000 DA d'acompte fixe ; un créneau de
 * semaine se résout à 80 000 DA. Le CHECK `bookings_amounts_valid` impose
 * `deposit_cents <= total_cents` : sans garde, c'est un 500 à l'insertion.
 *
 * La règle est l'ÉCRÊTAGE, pas le refus. La salle est légitime, le créneau est
 * légitime — c'est le calcul qui plie. On ne réclame jamais plus que le total.
 * Refuser la demande punirait le client d'une politique tarifaire qui n'est pas
 * la sienne, et pour une salle bon marché, cela fermerait purement et
 * simplement la réservation en semaine.
 *
 * L'écrêtage vaut aussi pour le pourcentage : à 10000 bps le calcul rend
 * exactement le total, mais `roundToDinar` arrondit au dinar supérieur en cas
 * d'égalité — sur un total qui ne serait pas un dinar entier, le résultat
 * pourrait le dépasser d'un centime. Une borne coûte moins cher qu'une preuve.
 */
export function resolveDepositCents(policy: DepositPolicyRow, totalCents: number): number {
  const raw =
    policy.depositAmountCents !== null
      ? // Montant fixe : déjà saisi en dinars entiers (×100 à la saisie), donc
        // aucun arrondi à faire — seulement la borne.
        policy.depositAmountCents
      : roundToDinar((totalCents * (policy.depositRateBps ?? 0)) / 10000);

  return Math.min(raw, totalCents);
}
