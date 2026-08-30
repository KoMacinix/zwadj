// Politique de transition des RÉSERVATIONS — module PUR, lot S3 (audit F5).
//
// ⚠ CE QUI VIT ICI, ET CE QUI N'Y VIT SURTOUT PAS.
// Ici : quels statuts autorisent quelle commande, vers quel statut, et la seule
// règle qui déborde du tableau — le motif obligatoire. C'est tout.
// PAS ici : le verrou `FOR UPDATE` d'`accept` (D117), le check-and-set, la
// traduction de l'`EXCLUDE`, les exceptions HTTP. Ces choses-là appartiennent
// au service et n'ont pas bougé d'une ligne au lot S3 — les y déplacer aurait
// rouvert la fenêtre de course que D117 a fermée.
//
// ⚠ POURQUOI UN MODULE SANS AUCUNE DÉPENDANCE. Les listes de statuts vivaient
// en littéraux dans quatre méthodes. Un statut ajouté demain devait être
// retrouvé dans les quatre, et rien ne le disait. Sorties ici, elles se
// neutralisent en millisecondes et se rejouent à chaque passage — le motif
// exact de D187, réécrit par D192 : un module pur se mesure, un service
// transactionnel se mesure en base.
//
// ⚠ AUCUNE VALEUR N'EST ÉCRITE DE MÉMOIRE : le tableau ci-dessous a été relevé
// sur `bookings.service.ts` (accept 403, decline 479, cancelAsPro 494,
// cancelAsClient 513), méthode par méthode.
import { BookingStatus } from "@zwadj/types";

export const BookingCommand = {
  ACCEPT: "accept",
  DECLINE: "decline",
  CANCEL_AS_PRO: "cancelAsPro",
  CANCEL_AS_CLIENT: "cancelAsClient"
} as const;
export type BookingCommand = (typeof BookingCommand)[keyof typeof BookingCommand];

interface BookingTransition {
  /** Statuts SOURCE qui autorisent la commande. */
  readonly from: readonly BookingStatus[];
  /** Statut ÉCRIT par la commande. */
  readonly to: BookingStatus;
  /** Statuts source depuis lesquels le motif devient OBLIGATOIRE.
   *
   *  ⚠ D83 — l'asymétrie suit celle du PRÉJUDICE, elle n'est pas décorative.
   *  Une demande encore `PENDING` ne verrouille rien : le client ne doit
   *  d'explication à personne. Une `ACCEPTED`, si : le pro a peut-être refusé
   *  d'autres dates entre-temps. */
  readonly reasonRequiredFrom: readonly BookingStatus[];
}

export const BOOKING_TRANSITIONS: Readonly<Record<BookingCommand, BookingTransition>> = {
  [BookingCommand.ACCEPT]: {
    from: [BookingStatus.PENDING],
    to: BookingStatus.ACCEPTED,
    reasonRequiredFrom: []
  },
  [BookingCommand.DECLINE]: {
    // D83 — motif FACULTATIF : contraindre un pro à justifier au téléphone,
    // dans une seconde langue, produit « ... » comme motif.
    from: [BookingStatus.PENDING],
    to: BookingStatus.DECLINED,
    reasonRequiredFrom: []
  },
  [BookingCommand.CANCEL_AS_PRO]: {
    // Seul moyen de libérer un créneau verrouillé tant que le lot Paiement
    // n'existe pas (D80) — donc depuis ACCEPTED, et seulement de là.
    from: [BookingStatus.ACCEPTED],
    to: BookingStatus.CANCELLED,
    reasonRequiredFrom: []
  },
  [BookingCommand.CANCEL_AS_CLIENT]: {
    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED],
    to: BookingStatus.CANCELLED,
    reasonRequiredFrom: [BookingStatus.ACCEPTED]
  }
};

/** Statuts source autorisés — l'UNIQUE source des tableaux `from` passés au
 *  check-and-set et à `assertStatus`. Les recopier ailleurs, c'est recréer la
 *  divergence que S3 vient de fermer. */
export function allowedFrom(command: BookingCommand): readonly BookingStatus[] {
  return BOOKING_TRANSITIONS[command].from;
}

/** Statut écrit par la commande. */
export function targetOf(command: BookingCommand): BookingStatus {
  return BOOKING_TRANSITIONS[command].to;
}

export type BookingTransitionDecision =
  | { readonly outcome: "ALLOWED"; readonly to: BookingStatus }
  | { readonly outcome: "STATUS_CONFLICT"; readonly status: string }
  | { readonly outcome: "REASON_REQUIRED"; readonly status: string };

/**
 * Décide, sans rien lire ni rien écrire.
 *
 * ⚠ L'ORDRE DES DEUX REFUS EST UNE RÈGLE, PAS UN DÉTAIL D'ÉCRITURE. Le statut
 * est jugé AVANT le motif, parce que le service traduit le premier en 409 et le
 * second en 400. Les intervertir ferait répondre « motif manquant » sur une
 * demande déjà annulée — on apprendrait au client à renvoyer un motif pour une
 * action qui ne peut plus aboutir.
 *
 * ⚠ `reason` est comparé EXACTEMENT comme le faisait le service : `undefined`
 * ou chaîne vide. `null` n'est PAS refusé — non par oubli, mais parce que le
 * contrat Zod ne le produit pas, et qu'un lot de refactoring qui « corrige »
 * au passage une borne qu'aucun test ne mesure change le comportement en
 * douce. Si ce cas doit être fermé, il le sera avec son test rouge.
 */
export function decideBookingTransition(
  command: BookingCommand,
  status: string,
  reason?: string
): BookingTransitionDecision {
  const transition = BOOKING_TRANSITIONS[command];

  if (!(transition.from as readonly string[]).includes(status)) {
    return { outcome: "STATUS_CONFLICT", status };
  }

  const motifExige = (transition.reasonRequiredFrom as readonly string[]).includes(status);
  if (motifExige && (reason === undefined || reason === "")) {
    return { outcome: "REASON_REQUIRED", status };
  }

  return { outcome: "ALLOWED", to: transition.to };
}
