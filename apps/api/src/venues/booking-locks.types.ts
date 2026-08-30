// PORT DE LA CONCURRENCE — RÉSERVATION, lot S5b.
//
// ⚠ PÉRIMÈTRE VOLONTAIREMENT ÉTROIT, ET LA RAISON EST CHIFFRÉE.
// `bookings.service.ts` porte 23 accès Prisma. Un port qui les prendrait tous
// compterait onze à treize méthodes — l'interface fourre-tout pour laquelle
// `AuthService` avait justement été écarté de la campagne. Or le RISQUE, lui,
// tient dans DEUX blocs : `accept` et le check-and-set. Les vingt et un autres
// sont des lectures. Ce port ne prend donc que la concurrence, et le service
// continue d'utiliser Prisma pour lire — ce qui est un écart assumé au critère
// d'origine, pas un oubli (cadrage S5b, § 3).
//
// ⚠ CE QUE CE PORT REND, ET POURQUOI IL NE LÈVE PAS.
// Chaque méthode rend un RÉSULTAT DISCRIMINÉ. La persistance ne connaît ni
// Nest-HTTP ni les clés i18n : elle constate un refus de la base et le NOMME,
// le service le traduit. Faire lever l'adaptateur remettrait les codes d'erreur
// applicatifs dans la couche qui parle à PostgreSQL, et le prochain adaptateur
// devrait imiter des exceptions Nest pour être conforme.
//
// ⚠ [ÉCART] `BookingRow` EST UN TYPE DÉRIVÉ DE PRISMA, et il traverse ce port.
// La règle du port dit « aucun type Prisma dans les signatures ». La respecter
// ici obligerait à redéclarer à la main les vingt et quelques champs de
// `BOOKING_SELECT` — c'est-à-dire à créer une SECONDE autorité sur la forme
// d'une ligne, celle-là même qui a coûté 500 sur le refus de devis en R4. Entre
// deux principes qui se contredisent, celui de l'autorité unique l'emporte. Le
// jour où le service aura un DTO de sortie stable, ce type sortira d'ici.
import type { BookingStatus } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";

/** ⚠ `BOOKING_SELECT` A ÉTÉ DÉPLACÉ ICI, VERBATIM, depuis `bookings.service.ts`.
 *  Il ne pouvait pas y rester : le port a besoin de la forme de la ligne, et
 *  le service a besoin du port — les laisser se référencer l'un l'autre
 *  aurait créé un cycle d'imports. Le RECOPIER aurait été pire : deux formes
 *  de la même ligne qui divergent en silence, exactement le défaut que S1 a
 *  fermé sur les statuts et que R4 a payé sur l'énumération des devis.
 *  Le service l'importe désormais d'ici ; il reste l'unique autorité. */
export const BOOKING_SELECT = {
  id: true,
  venueId: true,
  clientId: true,
  status: true,
  paymentMethod: true,
  eventDate: true,
  startsAt: true,
  endsAt: true,
  slotNameFr: true,
  slotNameAr: true,
  guests: true,
  basePriceCents: true,
  servicesTotalCents: true,
  totalCents: true,
  depositCents: true,
  clientMessage: true,
  services: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      serviceId: true,
      tierId: true,
      nameFr: true,
      nameAr: true,
      pricingType: true,
      tierLabelFr: true,
      tierLabelAr: true,
      unitPriceCents: true,
      quantity: true,
      lineTotalCents: true
    }
  },
  declineReason: true,
  cancellationReason: true,
  contactFirstName: true,
  contactLastName: true,
  contactPhone: true,
  contactEmail: true,
  expiresAt: true,
  paymentDueAt: true,
  createdAt: true,
  venue: { select: { slug: true, nameFr: true, nameAr: true } }
} as const;

export type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

export type AcceptOutcome =
  | { outcome: "ACCEPTED"; row: BookingRow }
  /** Le statut a changé entre la lecture et le verrou (D117). */
  | { outcome: "STATUS_CONFLICT"; status: string }
  /** Un blocage recouvre la période — contrôle applicatif, sous verrou. */
  | { outcome: "BLOCKED_PERIOD" }
  /** L'`EXCLUDE` a refusé : le créneau est pris. */
  | { outcome: "SLOT_TAKEN" };

export type TransitionOutcome =
  | { outcome: "DONE"; row: BookingRow }
  | { outcome: "STATUS_CONFLICT"; status: string };

export interface BookingLocks {
  /** La séquence COMPLÈTE d'acceptation, sous verrou de salle.
   *
   *  ⚠ UNE SEULE MÉTHODE, ET C'EST LA RAISON D'ÊTRE DU PORT. Verrou, relecture
   *  du statut, contrôle de blocage, écriture et traduction de l'`EXCLUDE`
   *  forment une séquence indivisible : la découper en appels de port séparés
   *  rouvrirait exactement la fenêtre de course que D117 a fermée — deux
   *  acceptations concurrentes trouvant toutes deux `PENDING`.
   *
   *  `allowedFrom` et `to` viennent de la politique S3 : la persistance ne
   *  décide pas quels statuts autorisent quoi, elle applique. */
  acceptUnderVenueLock(input: {
    bookingId: string;
    venueId: string;
    startsAt: Date;
    endsAt: Date;
    allowedFrom: readonly BookingStatus[];
    to: BookingStatus;
    acceptedAt: Date;
    paymentDueAt: Date | null;
  }): Promise<AcceptOutcome>;

  /** Check-and-set : n'écrit QUE si le statut est encore dans `from`.
   *
   *  ⚠ La relecture qui suit un compte à zéro est l'AUTORITÉ sur le refus :
   *  c'est elle qui rapporte le statut RÉEL, celui que le 409 montrera. */
  transition(input: {
    bookingId: string;
    from: readonly BookingStatus[];
    data: Record<string, unknown>;
  }): Promise<TransitionOutcome>;
}

/** Jeton d'injection (une interface TS n'existe pas à l'exécution). */
export const BOOKING_LOCKS = Symbol("BOOKING_LOCKS");
