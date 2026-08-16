// DÉCISION D'OUVERTURE D'UN PAIEMENT — Phase 7, lot E3b (socle).
//
// ⚠ POURQUOI CE MODULE EST **PUR**, ET CE QUE ÇA CHANGE. D126 exige que toute
// garde neuve du chemin de l'argent soit NEUTRALISÉE, et les deux mesures —
// rouge sans la garde, vert avec — portées au rapport. Une garde enfouie dans un
// service qui importe Prisma n'est pas exécutable partout ; ici, les quatre
// décisions vivent dans une fonction sans dépendance, donc elles se mesurent.
// Le service ne fait plus qu'écrire ce que cette fonction a décidé.
//
// C'est le même découpage que `pricing-engine`, `booking-window` et
// `service-pricing` : la règle est pure, l'accès aux données est ailleurs.

/** Ce que la décision a besoin de savoir. Volontairement minimal : tout vient
 *  de la réservation, qui est un INSTANTANÉ complet depuis sa création. */
export interface BookingSnapshot {
  id: string;
  status: string;
  /** Acompte figé à la conversion. ⚠ JAMAIS recalculé ici — voir plus bas. */
  depositCents: number;
}

export type IntentRefusal =
  /** Le drapeau maître est éteint. */
  | { ok: false; code: "PAYMENTS_DISABLED" }
  /** La réservation n'est pas dans un état où l'on peut payer. */
  | { ok: false; code: "BOOKING_NOT_PAYABLE"; status: string }
  /** L'acompte est nul ou négatif : il n'y a rien à encaisser. */
  | { ok: false; code: "NOTHING_TO_PAY" };

export type IntentDecision =
  | { ok: true; amountCents: number; discountAppliedCents: number }
  | IntentRefusal;

/**
 * ⚠ LE PAIEMENT NE S'OUVRE QUE SUR UNE RÉSERVATION **ACCEPTÉE** (décision 1 du
 * cadrage E3a).
 *
 * Ce n'est pas une précaution, c'est ce qui SUPPRIME un mode de défaillance
 * entier. `bookings_venue_timerange_gist` est un `EXCLUDE USING gist` filtré sur
 * `status IN ('ACCEPTED','CONFIRMED')` : à l'acceptation, le créneau devient
 * exclusif. Donc « le créneau a été pris pendant que le client payait » ne peut
 * pas se produire — la base l'a déjà rendu impossible. Ouvrir le paiement sur
 * une `PENDING` rouvrirait ce mode, qu'il faudrait alors GÉRER au lieu de
 * l'éliminer.
 *
 * Accessoirement, c'est aussi ce que le bon sens commande : un client ne devrait
 * pas payer un créneau que le pro n'a pas encore accordé.
 */
export const PAYABLE_BOOKING_STATUSES = ["ACCEPTED"] as const;

export function decidePaymentIntent(booking: BookingSnapshot, paymentsEnabled: boolean): IntentDecision {
  // ⚠ LE DRAPEAU EST TESTÉ EN PREMIER, et l'ordre est délibéré. Éteint, il ne
  // doit RIEN laisser filtrer sur l'état des réservations — pas même la raison
  // pour laquelle celle-ci ne serait pas payable.
  if (!paymentsEnabled) return { ok: false, code: "PAYMENTS_DISABLED" };

  if (!(PAYABLE_BOOKING_STATUSES as readonly string[]).includes(booking.status)) {
    return { ok: false, code: "BOOKING_NOT_PAYABLE", status: booking.status };
  }

  // ⚠ LE MONTANT EST **LU**, JAMAIS RECALCULÉ. `bookings.deposit_cents` est un
  // instantané écrit à la conversion (le schéma le dit : « snapshots copiés du
  // devis à la création »). Rejouer `resolveDepositCents` ici produirait un
  // second calcul du même montant — donc, un jour, deux montants différents pour
  // une seule affaire, le jour où une règle de dépôt changera. La réservation
  // fait foi ; c'est aussi elle que la commission prendra pour assiette.
  const amountCents = booking.depositCents;

  // ⚠ `amountCents > 0` DOUBLE UN CHECK DE LA BASE, et c'est voulu :
  // `payments_amounts_valid` garantit `amount_cents >= 0`, donc la base
  // accepterait un paiement de ZÉRO. Ouvrir une session de règlement à 0 DA
  // enverrait un client payer rien du tout, et le fournisseur la refuserait avec
  // un message que personne n'a écrit. Mieux vaut refuser ici, avec un code.
  if (amountCents <= 0) return { ok: false, code: "NOTHING_TO_PAY" };

  // ⚠ AUCUNE REMISE APPLIQUÉE À CE LOT, ET C'EST UN CHOIX ÉCRIT, PAS UN OUBLI.
  // Le backlog porte « remise de 1000 DA si paiement en ligne », puis D35 (lot
  // A3) a remplacé les montants fixes par `Venue.cashbackRateBps`. Reste à
  // trancher si ce taux EST la remise de checkout ou un mécanisme distinct — la
  // table `cashback_claims` décrit une réclamation vérifiée APRÈS coup, ce qui
  // n'est pas la même chose qu'une réduction au moment de payer.
  // Inventer la réponse ici écrirait une règle monétaire par déduction. Zéro est
  // la seule valeur qui n'affirme rien.
  return { ok: true, amountCents, discountAppliedCents: 0 };
}
