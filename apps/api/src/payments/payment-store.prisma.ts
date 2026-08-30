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

/** Le nom de l'index de E3d-1. ⚠ Il n'entre PAS dans le contrôle de flux — il
 *  sert à confronter ce fichier à la migration : `payment-intent-race.int-spec`
 *  interroge `pg_indexes` avec cette constante, et rougit si le SQL a nommé
 *  autre chose. Un nom écrit deux fois sans rien qui les compare, c'est deux
 *  noms qui divergent un jour. */
export const INDEX_UNE_ATTENTE = "payments_one_pending_per_booking";

/** ⛔ P2002 SEUL, ET C'EST UN RECUL ASSUMÉ SUR LA VERSION PRÉCÉDENTE.
 *
 *  Elle lisait `error.meta.target` pour exiger le nom de l'index. Cette forme
 *  n'est garantie nulle part quand l'index vient d'un `CREATE UNIQUE INDEX` en
 *  SQL brut, donc inconnu du schéma Prisma : je l'avais DÉDUITE, pas mesurée.
 *  Écrire une borne avant d'avoir vu le cas réel, c'est D55 — et ici le prix
 *  est un P2002 relancé au visiteur au lieu d'une intention rendue.
 *
 *  ⚠ POURQUOI ÊTRE LARGE EST SÛR *ICI*, alors que ça ne le serait pas ailleurs.
 *  L'insertion qui peut lever porte `status: "PENDING"`. Le seul autre index
 *  unique de la table, `payments_one_paid_per_booking`, a pour prédicat
 *  `status = 'PAID'` : une ligne PENDING ne peut pas le violer. Sur CET
 *  `create`, P2002 ne peut donc venir que de l'index des intentions en attente.
 *
 *  ⚠ ET LA RELECTURE EST LA VRAIE PREUVE. On ne rend une intention que si une
 *  ligne PENDING existe réellement ; sinon l'erreur d'origine repart. Le
 *  diagnostic ne dépend plus de la forme interne d'une erreur Prisma, mais de
 *  l'état de la base — qui est ce dont on parle. */
function estViolationUnicite(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (error as { code?: unknown }).code === "P2002";
}

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

    // ⛔ LA COURSE EST FERMÉE EN BASE, PAS ICI (E3d-1, cadrage D255).
    // Les deux requêtes ci-dessus et ci-dessous ne sont toujours PAS dans une
    // transaction, et c'est assumé : même en sérialisable, deux appels
    // concurrents peuvent ne rien lire tous les deux. Ce qui les départage est
    // `payments_one_pending_per_booking` — un index UNIQUE PARTIEL sur
    // `(booking_id) WHERE status = 'PENDING'`. Le perdant reçoit P2002 et
    // RELIT : il repart avec l'intention du gagnant, ce qui est exactement ce
    // que l'idempotence promet.
    //
    // ⚠ UN VERROU APPLICATIF AURAIT ÉTÉ CONTOURNABLE. Il ne survit ni à un
    // crash entre le verrou et l'écriture, ni à un second processus — et le
    // déploiement multi-instance est l'état NORMAL d'une API, pas une
    // hypothèse lointaine. La base est le seul endroit que les deux partagent.
    //
    // ⚠ CE QUI N'EST PAS FAIT ICI : l'EXPIRATION. Une intention `PENDING`
    // abandonnée est encore réutilisée indéfiniment — comportement INCHANGÉ,
    // `findFirst` ne regardait déjà pas l'âge. La durée ne peut pas être fixée
    // avant de connaître celle d'un lien Chargily : plus courte qu'elle, un
    // visiteur paierait une intention qu'on a marquée morte. Arbitrage Ko :
    // tranché au branchement de Chargily (E3d-2).
    try {
      return await this.prisma.payment.create({
        data: {
          bookingId: input.bookingId,
          amountCents: input.amountCents,
          discountAppliedCents: input.discountAppliedCents,
          status: "PENDING"
        },
        select: PAYMENT_SELECT
      });
    } catch (error) {
      // ⚠ `await` OBLIGATOIRE SUR LE `create` CI-DESSUS. Sans lui, la promesse
      // rejetée sort du `try` avant d'être attrapée et le `catch` ne sert à
      // rien — un `return` nu aurait laissé la garde verte tout en étant
      // inopérante.
      if (!estViolationUnicite(error)) throw error;
      // Le gagnant a écrit entre notre lecture et notre écriture : sa ligne
      // existe forcément, puisque c'est elle qui nous a refusés.
      const gagnante = await this.prisma.payment.findFirst({
        where: { bookingId: input.bookingId, status: "PENDING" },
        select: PAYMENT_SELECT
      });
      if (gagnante) return gagnante;
      // ⚠ Introuvable après un refus de l'index : la ligne a été sortie de
      // `PENDING` dans l'intervalle. On ne boucle PAS — une reprise silencieuse
      // sur le chemin de l'argent masquerait un état qu'on ne comprend pas.
      throw error;
    }
  }
}
