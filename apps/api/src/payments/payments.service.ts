// Ouverture d'un paiement — Phase 7, lot E3b (socle).
//
// ⚠ CE SERVICE NE DÉCIDE RIEN. Les quatre règles — drapeau, statut payable,
// montant, montant nul — vivent dans `payment-intent.ts`, qui est PUR et donc
// mesurable partout. Ici il ne reste que la lecture et l'écriture. Ce découpage
// n'est pas esthétique : D126 exige que toute garde neuve du chemin de l'argent
// soit neutralisée et les deux mesures portées au rapport, et une garde enfouie
// dans un service qui importe Prisma ne s'exécute pas partout.
//
// ⚠ CE LOT NE FAIT AUCUNE BASCULE DE STATUT — c'est la ligne d'arrêt d'E3b. Le
// `Payment` naît `PENDING` et y reste. `PAID`, `Booking CONFIRMED`,
// `Quote ACCEPTED` et la `Commission` sont E3d, et arriveront ensemble.
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { decidePaymentIntent, type IntentRefusal } from "./payment-intent";
import { PAYMENT_STORE, type PaymentStore } from "./payment-store.types";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment.types";

/**
 * ⚠ POURQUOI UNE TABLE ET NON UNE INTERPOLATION. Le socle écrivait
 * `` `payment.errors.${decision.code}` ``, ce qui produisait
 * `payment.errors.PAYMENTS_DISABLED` — alors que TOUT le dépôt nomme ses clés en
 * `namespace.errors.camelCase` (`booking.errors.slotTaken`, `auth.errors.…`).
 * Les trois clés n'existaient donc dans AUCUN des deux catalogues, et le test de
 * parité ne pouvait pas le voir : il compare FR à AR, et une clé absente des
 * deux côtés est parfaitement symétrique. Une table explicite rend l'oubli
 * visible au typecheck — `Record<IntentRefusal["code"], string>` refuse de
 * compiler si un code naît sans message.
 */
const REFUSAL_MESSAGE_KEYS: Record<IntentRefusal["code"], string> = {
  PAYMENTS_DISABLED: "payment.errors.paymentsDisabled",
  BOOKING_NOT_PAYABLE: "payment.errors.bookingNotPayable",
  NOTHING_TO_PAY: "payment.errors.nothingToPay"
};

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_STORE) private readonly store: PaymentStore,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway
  ) {}

  /**
   * Crée — ou RETROUVE — l'intention de paiement d'une réservation.
   *
   * ⚠ POURQUOI ELLE EST IDEMPOTENTE ALORS QUE LA BASE AUTORISE PLUSIEURS
   * PAIEMENTS. `payments_one_paid_per_booking` n'interdit qu'un second `PAID` ;
   * les `PENDING` peuvent s'empiler sans rien violer, parce qu'une réservation
   * DOIT pouvoir porter plusieurs tentatives — sans quoi un premier échec
   * interdirait le second. Mais un client qui recharge trois fois la page de
   * règlement créerait trois intentions pour une seule affaire, et la
   * réconciliation devrait ensuite deviner laquelle comptait. On rend donc
   * l'existante tant qu'elle est encore en attente.
   *
   * ⚠ Ce que ça NE fait PAS : rejouer une intention après un échec. Un `FAILED`
   * n'est pas repris ici, il donnera lieu à une intention neuve — c'est le sens
   * de « plusieurs tentatives ».
   */
  async openIntent(userId: string, bookingId: string, paymentsEnabled: boolean) {
    // ⚠ LE PORT REND `null` DANS LES DEUX CAS — inexistante, ou pas la sienne.
    // Le service ne PEUT donc pas distinguer, et c'est l'invariant lui-même :
    // 404 indistinct (D47).
    const booking = await this.store.findBookingForPayer(userId, bookingId);
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND", message: "booking.errors.notFound" });

    const decision = decidePaymentIntent(booking, paymentsEnabled);
    if (!decision.ok) {
      throw new ConflictException({ code: decision.code, message: REFUSAL_MESSAGE_KEYS[decision.code] });
    }

    // ⚠ LES MONTANTS VIENNENT DE LA DÉCISION, jamais d'une relecture de la
    // réservation. Ce sont les seules valeurs monétaires que ce chemin écrit.
    return this.store.findOrCreatePendingIntent({
      bookingId: booking.id,
      amountCents: decision.amountCents,
      discountAppliedCents: decision.discountAppliedCents
    });
  }

  /**
   * ⚠ NON APPELÉ À CE LOT, et rendu explicite plutôt que laissé de côté.
   *
   * La session de règlement exige l'adaptateur Chargily, qui exige le bac à
   * sable. Tant qu'il n'existe pas, `UnavailablePaymentGateway` refuse en 503 —
   * délibérément, plutôt que de simuler : un faux qui marche ferait construire
   * le reste du chemin contre une forme inventée, et le vrai adaptateur devrait
   * ensuite se conformer à ma fiction plutôt qu'à l'API réelle (D126).
   */
  gatewayForCheckout(): PaymentGateway {
    return this.gateway;
  }
}
