// ADAPTATEUR PRISMA DU PORT DE PAIEMENT — lot S5a.
//
// ⚠ CE FICHIER EST UN DÉPLACEMENT, PAS UNE RÉÉCRITURE. Les deux `where`, le
// `select` et le `create` viennent de `payments.service.ts`, au caractère près.
// Un port qui « en profite » pour corriger une requête n'est plus un port,
// c'est un changement de comportement déguisé.
//
// ⚠ CE QUI A DÉMÉNAGÉ ICI EST CE QUI COMPTE LE PLUS, et il faut le dire : la
// clause de PROPRIÉTÉ (D47) et le filtre `status: "PENDING"` ne sont pas des
// détails de requête — ce sont la règle d'accès et la règle d'idempotence. Les
// sortir du service ne les rend pas moins critiques ; c'est pourquoi les gardes
// qui les mesuraient déménagent AVEC elles, dans `payment-store.prisma.spec.ts`,
// au lieu de disparaître dans le trajet.
import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { PayableBooking, PaymentIntent, PaymentStore } from "./payment-store.types";

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
export class PrismaPaymentStore implements PaymentStore {
  constructor(private readonly prisma: PrismaService) {}

  async findBookingForPayer(userId: string, bookingId: string): Promise<PayableBooking | null> {
    // ⚠ LA PROPRIÉTÉ EST DANS LE `WHERE`, JAMAIS APRÈS. Lue après coup, elle
    // laisserait le service distinguer « pas la vôtre » de « n'existe pas » —
    // et cette distinction est précisément ce que D47 refuse d'apprendre à un
    // curieux. Les DEUX chemins sont légitimes : le client règle, le pro
    // propriétaire encaisse un acompte en salle.
    return this.prisma.booking.findFirst({
      where: { id: bookingId, OR: [{ clientId: userId }, { venue: { owner: { userId } } }] },
      select: { id: true, status: true, depositCents: true }
    });
  }

  async findOrCreatePendingIntent(input: {
    bookingId: string;
    amountCents: number;
    discountAppliedCents: number;
  }): Promise<PaymentIntent> {
    // ⚠ IDEMPOTENCE ALORS QUE LA BASE AUTORISE PLUSIEURS PAIEMENTS.
    // `payments_one_paid_per_booking` n'interdit qu'un second `PAID` ; les
    // `PENDING` peuvent s'empiler sans rien violer, parce qu'une réservation
    // DOIT pouvoir porter plusieurs tentatives — sans quoi un premier échec
    // interdirait le second. On rend donc l'existante tant qu'elle est encore
    // en attente. Un `FAILED` n'est PAS repris : il donnera lieu à une
    // intention neuve, et c'est le sens de « plusieurs tentatives ».
    const existant = await this.prisma.payment.findFirst({
      where: { bookingId: input.bookingId, status: "PENDING" },
      select: PAYMENT_SELECT
    });
    if (existant) return existant;

    // ⚠ COURSE CONNUE, RAPPORTÉE, NON CORRIGÉE ICI (cadrage S5a, § 5).
    // Ces deux requêtes ne sont PAS dans une transaction : deux appels
    // concurrents peuvent ne rien trouver tous les deux et créer deux
    // intentions — exactement ce que l'idempotence ci-dessus veut éviter. Le
    // défaut est ANTÉRIEUR au port ; S5a le déplace tel quel, parce qu'un lot
    // de refactoring ne corrige pas au passage. Ce qu'il apporte, c'est
    // l'endroit : la séquence vit désormais derrière un seul nom, donc la
    // rendre atomique ne touchera plus le service. À traiter AVANT E3c, qui
    // rendra la réconciliation critique.
    return this.prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        amountCents: input.amountCents,
        discountAppliedCents: input.discountAppliedCents,
        status: "PENDING"
      },
      select: PAYMENT_SELECT
    });
  }
}
