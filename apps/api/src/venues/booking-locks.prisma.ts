// ADAPTATEUR PRISMA DE LA CONCURRENCE — RÉSERVATION, lot S5b.
//
// ⚠ CE FICHIER EST UN DÉPLACEMENT, PAS UNE RÉÉCRITURE, et c'est vérifiable
// ligne à ligne dans la note de livraison. Le `$transaction`, le
// `SELECT … FOR UPDATE`, la relecture D117, le contrôle de blocage, l'`update`
// et la traduction de l'`EXCLUDE` viennent de `bookings.service.ts` au
// caractère près. Sur un chemin de concurrence, « en profiter pour améliorer »
// est la façon la plus sûre de rouvrir une fenêtre qu'une décision avait
// fermée.
//
// ⚠ CE QUI A CHANGÉ DE FORME, ET RIEN D'AUTRE : les `throw new
// ConflictException(...)` sont devenus des retours discriminés. Les CONDITIONS
// qui y menaient sont identiques, dans le même ordre. Le service reconstruit
// exactement les mêmes exceptions, avec les mêmes codes et les mêmes clés i18n.
//
// ⛔ SAUF DEPUIS LE RANG 23 (D305) : l'écriture d'`accept` N'EST PLUS l'`update`
// déplacé par S5b. Elle est conditionnée au statut source (audit SOLID 09/09 ·
// F1) — un refus ou une annulation commité pendant l'acceptation n'est plus
// écrasé. L'ordre des refus, lui, n'a pas bougé : statut, blocage, `EXCLUDE`.
import { Injectable } from "@nestjs/common";
import type { BookingStatus } from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  BOOKING_SELECT,
  type AcceptOutcome,
  type BookingLocks,
  type TransitionOutcome
} from "./booking-locks.types";

/** Code SQLSTATE d'une violation de contrainte d'exclusion. */
const PG_EXCLUSION_VIOLATION = "23P01";

/** Nom de NOTRE `EXCLUDE`. Il nous appartient : c'est ce qui la distingue
 *  d'une autre qui apparaîtrait un jour sur la même table. */
const BOOKING_OVERLAP_CONSTRAINT = "bookings_no_overlap_accepted_confirmed";

/** Vrai si la base a refusé pour cause de CHEVAUCHEMENT.
 *
 *  ⚠ Forme relevée à l'exécution, pas devinée : sous l'adaptateur pilote, une
 *  violation d'exclusion ne remonte PAS en `PrismaClientKnownRequestError` mais
 *  en `DriverAdapterError`, dont le code PostgreSQL vit dans `cause`. On lit
 *  donc `cause.code` — stable et documenté — et, à défaut, le NOM de la
 *  contrainte. Jamais le message brut : il est traduit selon la locale du
 *  serveur PostgreSQL. */
function isExclusionViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code === PG_EXCLUSION_VIOLATION) {
    return (cause.message ?? "").includes(BOOKING_OVERLAP_CONSTRAINT);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta as { code?: string } | undefined;
    if (meta?.code === PG_EXCLUSION_VIOLATION) return true;
  }
  return false;
}

@Injectable()
export class PrismaBookingLocks implements BookingLocks {
  constructor(private readonly prisma: PrismaService) {}

  async acceptUnderVenueLock(input: {
    bookingId: string;
    venueId: string;
    startsAt: Date;
    endsAt: Date;
    allowedFrom: readonly BookingStatus[];
    to: BookingStatus;
    acceptedAt: Date;
    paymentDueAt: Date | null;
  }): Promise<AcceptOutcome> {
    return this.prisma.$transaction(async (tx): Promise<AcceptOutcome> => {
      // Verrou de sérialisation par SALLE. Le même que prend la création d'un
      // blocage (D51) : c'est ce qui rend les contrôles ci-dessous fiables
      // malgré deux écritures concurrentes sur deux tables différentes.
      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${input.venueId}::uuid FOR UPDATE`;

      // D117 — LE STATUT SE LIT ICI, ET NULLE PART AILLEURS.
      //
      // Il se lisait AVANT la transaction : deux acceptations concurrentes de
      // la MÊME demande le trouvaient toutes les deux à PENDING et passaient
      // toutes les deux. L'`EXCLUDE` ne les arrête pas — une ligne ne chevauche
      // pas elle-même — donc la seconde réécrivait `acceptedAt`/`paymentDueAt`
      // et RENOTIFIAIT le client. Le double accept SÉQUENTIEL rendait bien 409,
      // ce qui a masqué le trou : c'est le cas concurrent, et lui seul, qui
      // passait.
      //
      // ⚠ RANG 23 · F1 (D305) — CETTE LECTURE N'EST PLUS LA GARDE. Elle ne voyait
      // qu'accept contre accept : un REFUS ou une annulation ne prend pas le
      // verrou de SALLE, et commitait entre elle et l'écriture — qui écrasait
      // alors DECLINED par ACCEPTED. La garde est désormais l'écriture
      // conditionnelle, plus bas. Ce qui reste ici décide l'ORDRE des refus —
      // le statut réel AVANT le blocage (MD-F1-8, mesuré en intégration).
      const fresh = await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
        select: { status: true }
      });
      if (!input.allowedFrom.includes(fresh.status)) {
        return { outcome: "STATUS_CONFLICT", status: fresh.status };
      }

      // Conflit avec un BLOCAGE. Une EXCLUDE ne traverse pas deux tables : ce
      // contrôle-là DOIT être applicatif, et il est correct parce qu'il est
      // sous verrou.
      const block = await tx.availabilityBlock.findFirst({
        where: {
          venueId: input.venueId,
          blockedFrom: { lt: input.endsAt },
          blockedUntil: { gt: input.startsAt }
        },
        select: { id: true }
      });
      if (block) return { outcome: "BLOCKED_PERIOD" };

      try {
        // ⛔ RANG 23 · F1 (D305) — L'ÉCRITURE EST CONDITIONNÉE AU STATUT SOURCE,
        // comme celle de `transition` : une seule mécanique pour toutes les
        // transitions (décision du relecteur, forme (ii)). Si un refus ou une
        // annulation tient la ligne, cet UPDATE l'ATTEND ; à son COMMIT,
        // PostgreSQL réévalue le `WHERE` (READ COMMITTED) et ne modifie rien.
        // ⚠ Pas de `SELECT … FOR UPDATE` sur la ligne : il bloquerait aussi
        // l'insertion d'un paiement qui la référence (mesuré, D304) ; cet UPDATE
        // ne touche aucune colonne de clé et ne la bloque pas (mesuré, D305).
        // `allowedFrom` vient du tableau des transitions, par le service.
        const ecrit = await tx.booking.updateMany({
          where: { id: input.bookingId, status: { in: [...input.allowedFrom] } },
          data: { status: input.to, acceptedAt: input.acceptedAt, paymentDueAt: input.paymentDueAt }
        });
        // Compte = 1 EXIGÉ. Zéro : quelqu'un a changé le statut entre la lecture
        // et l'écriture ; la relecture n'est plus une garde, elle nomme le statut
        // réel que le 409 montrera.
        if (ecrit.count !== 1) {
          const relu = await tx.booking.findUniqueOrThrow({
            where: { id: input.bookingId },
            select: { status: true }
          });
          return { outcome: "STATUS_CONFLICT", status: relu.status };
        }
      } catch (error) {
        // SEUL chemin vers BOOKING_SLOT_TAKEN. On ne fait que traduire le refus
        // de l'EXCLUDE : l'exclusivité appartient à la base, jamais à un
        // `SELECT` préalable qui laisserait une fenêtre ouverte.
        if (isExclusionViolation(error)) return { outcome: "SLOT_TAKEN" };
        throw error;
      }
      const row = await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
        select: BOOKING_SELECT
      });
      return { outcome: "ACCEPTED", row };
    });
  }

  async transition(input: {
    bookingId: string;
    from: readonly BookingStatus[];
    data: Record<string, unknown>;
  }): Promise<TransitionOutcome> {
    return this.prisma.$transaction(async (tx): Promise<TransitionOutcome> => {
      const consumed = await tx.booking.updateMany({
        where: { id: input.bookingId, status: { in: [...input.from] } },
        data: input.data as Prisma.BookingUpdateManyMutationInput
      });
      if (consumed.count === 0) {
        // Quelqu'un a changé le statut entre notre lecture et notre écriture.
        // La relecture est l'AUTORITÉ : elle produit le refus avec le statut réel.
        const fresh = await tx.booking.findUniqueOrThrow({
          where: { id: input.bookingId },
          select: { status: true }
        });
        return { outcome: "STATUS_CONFLICT", status: fresh.status };
      }
      const row = await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
        select: BOOKING_SELECT
      });
      return { outcome: "DONE", row };
    });
  }
}
