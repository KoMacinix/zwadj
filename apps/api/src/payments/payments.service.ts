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
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { decidePaymentIntent } from "./payment-intent";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment.types";

const PAYMENT_SELECT = {
  id: true,
  bookingId: true,
  provider: true,
  providerCheckoutId: true,
  amountCents: true,
  discountAppliedCents: true,
  currency: true,
  status: true,
  createdAt: true
} satisfies Prisma.PaymentSelect;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
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
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, OR: [{ clientId: userId }, { venue: { owner: { userId } } }] },
      select: { id: true, status: true, depositCents: true }
    });
    // 404 INDISTINCT (D47) : une réservation qui ne nous appartient pas et une
    // qui n'existe pas rendent la même chose.
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND", message: "booking.errors.notFound" });

    const decision = decidePaymentIntent(booking, paymentsEnabled);
    if (!decision.ok) {
      throw new ConflictException({ code: decision.code, message: `payment.errors.${decision.code}` });
    }

    const existant = await this.prisma.payment.findFirst({
      where: { bookingId: booking.id, status: "PENDING" },
      select: PAYMENT_SELECT
    });
    if (existant) return existant;

    return this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amountCents: decision.amountCents,
        discountAppliedCents: decision.discountAppliedCents,
        status: "PENDING"
      },
      select: PAYMENT_SELECT
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
