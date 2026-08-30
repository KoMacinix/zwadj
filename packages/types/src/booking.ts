// Demande de réservation de salle — Flux E, Lot E1a (D74 → D83).
//
// UN SEUL modèle porte la demande ET la réservation (Décision 3, actée) : la
// même ligne traverse PENDING → ACCEPTED → … La contrainte d'exclusion l'exige
// de toute façon — elle ne peut pas comparer deux tables.
//
// ⚠ D74 : aucune ligne `Quote` à ce lot. Sans catalogue de prestations, un
// devis ne porterait rien que `Booking` ne snapshote déjà.
import { z } from "zod";
import { dzPhoneSchema } from "./auth";
import { BookingStatus, PaymentMethod } from "./enums";
import type { BookingServiceDTO } from "./service";
import { bookingServiceChoiceSchema } from "./service";
import { isRealCivilDate } from "./venue";


/**
 * Statuts qui VERROUILLENT réellement un créneau — le verrou DUR, doublé en
 * base par l'`EXCLUDE` gist `bookings_no_overlap_accepted_confirmed`.
 *
 * ⚠ `PENDING` N'EN FAIT PAS PARTIE, et c'est D101 : une demande en attente ne
 * verrouille rien — deux couples peuvent demander la même date, le pro tranche.
 * Elle est SIGNALÉE au calendrier d'une salle (`REQUESTED`) parce que la
 * surprise du concurrent découvert au moment du devis est la pire de toutes ;
 * elle ne grise RIEN dans la liste publique, où l'annotation dit « pris », pas
 * « demandé ».
 *
 * ⚠ REMONTÉ ICI au lot `availableOn`. Le dépôt en portait DEUX copies —
 * `availability-blocks.service.ts` (tableau) et `availability.service.ts`
 * (`Set`) — et la liste publique allait en écrire une troisième. Trois listes
 * de statuts identiques à écrire une fois, à faire diverger toujours : le jour
 * où un statut s'ajoute, deux d'entre elles l'auront et la troisième non, sans
 * qu'aucun test ne rougisse.
 */
export const HARD_BOOKING_STATUSES = [BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Codes d'erreur (stables, consommés par les deux fronts).
// ─────────────────────────────────────────────────────────────────────────────

export const BookingErrorCode = {
  /** 404 INDISTINCT « parmi MES réservations » / « dans MA salle » : id
   *  malformé, inexistant, ou appartenant à autrui. Même doctrine que D47/D62 —
   *  distinguer les trois cas apprend à un curieux ce qui existe. */
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  /** 409 — le créneau demandé n'EXISTE pas : hors des `SlotTemplate` actifs,
   *  date passée, ou au-delà de l'horizon D49. Distinct de `SLOT_TAKEN` :
   *  « il n'y a rien à cette heure-là » et « quelqu'un vient de le prendre »
   *  demandent deux phrases différentes au client. */
  BOOKING_SLOT_UNAVAILABLE: "BOOKING_SLOT_UNAVAILABLE",
  /** 409 — le créneau est DÉJÀ PRIS par une réservation ACCEPTED/CONFIRMED.
   *
   *  ⚠ Ce code ne peut sortir QUE de la traduction du `23P01` PostgreSQL levé
   *  par `bookings_no_overlap_accepted_confirmed`. Le redoubler par un `SELECT`
   *  préalable laisserait une fenêtre entre le test et l'écriture, et deux pros
   *  qui acceptent deux demandes concurrentes sur la même date sont le cas
   *  PROBABLE, pas l'exception (famille D59). */
  BOOKING_SLOT_TAKEN: "BOOKING_SLOT_TAKEN",
  /** 409 — la plage recouvre un `AvailabilityBlock` du pro. Une `EXCLUDE` ne
   *  traverse pas deux tables : ce conflit-là se vérifie applicativement, DANS
   *  la transaction, sous le verrou de la ligne `venues` (D51/D78). */
  BOOKING_BLOCKED_PERIOD: "BOOKING_BLOCKED_PERIOD",
  /** 409 — le prix ou l'acompte ont changé entre l'affichage et l'envoi (D75).
   *  La réponse porte les montants RÉELS : le client rejoue en connaissance de
   *  cause, il n'est jamais engagé sur un montant qu'il n'a pas vu. */
  BOOKING_PRICE_CHANGED: "BOOKING_PRICE_CHANGED",
  /** 409 — transition interdite par la machine à états : accepter une demande
   *  déjà refusée, annuler une demande déjà annulée… Le statut réel est dans la
   *  réponse, pour que l'écran se remette d'aplomb sans recharger à l'aveugle. */
  BOOKING_STATUS_CONFLICT: "BOOKING_STATUS_CONFLICT",
  /** 400 — plus d'invités que la capacité déclarée. Refusé AVANT l'écriture
   *  plutôt que laissé à un pro qui découvrirait le problème le jour même. */
  BOOKING_GUESTS_EXCEED_CAPACITY: "BOOKING_GUESTS_EXCEED_CAPACITY"
} as const;
export type BookingErrorCode = (typeof BookingErrorCode)[keyof typeof BookingErrorCode];

// ─────────────────────────────────────────────────────────────────────────────
// Création — POST /venues/:slug/bookings
// ─────────────────────────────────────────────────────────────────────────────

const contactNameSchema = z
  .string()
  .trim()
  .min(1, "booking.validation.contactRequired")
  .max(80, "booking.validation.contactTooLong");

/** D75 — le client ANNONCE les montants qu'il a vus ; le serveur recalcule et
 *  compare. Les deux sont obligatoires : un pro peut changer sa politique
 *  d'acompte sans toucher au prix, le total resterait identique et le client se
 *  retrouverait engagé sur un acompte jamais affiché. */
export const bookingCreateSchema = z
  .object({
    eventDate: z.string().refine(isRealCivilDate, "booking.validation.dateFormat"),
    /** TOUJOURS requis, dans les DEUX modes : le créneau est la source du PRIX
     *  (D-B3, `slot_templates.base_price_cents`) et le libellé snapshoté sur la
     *  réservation. En SINGLE_SLOT il ne change pas la plage bloquante — la
     *  journée entière est prise — mais il dit toujours COMBIEN. */
    slotTemplateId: z.string().uuid("booking.validation.slotInvalid"),
    guests: z
      .number({ invalid_type_error: "booking.validation.guestsInteger" })
      .int("booking.validation.guestsInteger")
      .min(1, "booking.validation.guestsRange")
      .max(100000, "booking.validation.guestsRange"),
    paymentMethod: z.enum([PaymentMethod.ONLINE, PaymentMethod.CASH], {
      errorMap: () => ({ message: "booking.validation.paymentMethodInvalid" })
    }),
    /** Nom, prénom et TÉLÉPHONE sont obligatoires : `User.firstName`,
     *  `lastName` et `phone` sont tous nullable, le compte ne peut pas les
     *  fournir de façon fiable. On les demande, on les fige.
     *
     *  ⚠ L'E-MAIL, LUI, EST FACULTATIF (D135). `bookings.contact_email` est
     *  `String?` en base ; cette borne-ci était plus stricte que le schéma, et le
     *  cas qu'elle rejetait n'est pas un cas limite — c'est le client algérien
     *  sans adresse e-mail. Le téléphone reste le canal sûr : `contact_phone` est
     *  NOT NULL, et c'est par là que le pro rappelle. */
    contactFirstName: contactNameSchema,
    contactLastName: contactNameSchema,
    contactPhone: dzPhoneSchema,
    contactEmail: z
      .string()
      .trim()
      .email("booking.validation.emailInvalid")
      .max(180, "booking.validation.emailTooLong")
      .optional(),
    /** D79 — facultatif, plafonné par Zod SEULEMENT : pas de `CHECK` SQL, D55
     *  interdit de valider deux fois la même borne. */
    clientMessage: z.string().trim().max(1000, "booking.validation.messageTooLong").optional(),
    /** E2a — prestations choisies. Vide par défaut : une demande sans service
     *  reste parfaitement valable, c'est même le cas le plus courant.
     *
     *  ⚠ Aucun PRIX ici (D91) : le serveur les résout depuis le catalogue de la
     *  salle. Un prix venu du navigateur est un prix que le visiteur peut
     *  éditer — et `expectedTotalCents` ci-dessous suffit à garantir qu'il n'est
     *  jamais engagé sur un montant qu'il n'a pas vu. */
    services: z.array(bookingServiceChoiceSchema).max(20, "booking.validation.tooManyServices").optional(),
    expectedTotalCents: z.number().int().nonnegative("booking.validation.expectedAmount"),
    expectedDepositCents: z.number().int().nonnegative("booking.validation.expectedAmount")
  })
  .strict("booking.validation.unknownKey");
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

/** D83 — annulation par le CLIENT. Motif libre tant que la demande est PENDING
 *  (rien n'est verrouillé, il ne doit d'explication à personne) ; OBLIGATOIRE
 *  sur une demande ACCEPTED — le pro a peut-être refusé d'autres dates
 *  entre-temps. L'obligation se juge au service, contre le statut réel. */
export const bookingCancelSchema = z
  .object({
    reason: z.string().trim().min(1, "booking.validation.reasonRequired").max(500, "booking.validation.reasonTooLong").optional()
  })
  .strict("booking.validation.unknownKey");
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;

/** D83 — refus par le PRO, motif FACULTATIF. Contraindre un pro à justifier au
 *  téléphone, dans une seconde langue, produit « ... » comme motif. */
export const bookingDeclineSchema = bookingCancelSchema;
export type BookingDeclineInput = z.infer<typeof bookingDeclineSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Lectures
// ─────────────────────────────────────────────────────────────────────────────

/** Ligne telle que le CLIENT la relit (`GET /me/bookings`).
 *
 *  Les montants sont ceux SNAPSHOTÉS à la demande, jamais recalculés à la
 *  lecture : le client relit ce qu'il a accepté, même si le pro a changé son
 *  tarif depuis. */
export interface BookingDTO {
  id: string;
  venueId: string;
  venueSlug: string;
  venueNameFr: string;
  venueNameAr: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  /** Date civile locale `YYYY-MM-DD`. */
  eventDate: string;
  /** ISO 8601 UTC — la plage bloquante réelle (D77). */
  startsAt: string;
  endsAt: string;
  /** Snapshots du créneau : survivent au renommage ou au retrait du template. */
  slotNameFr: string | null;
  slotNameAr: string | null;
  guests: number;
  basePriceCents: number;
  servicesTotalCents: number;
  totalCents: number;
  depositCents: number;
  /** E2a — détail des prestations, snapshoté. Vide si la demande n'en porte pas. */
  services: BookingServiceDTO[];
  clientMessage: string | null;
  declineReason: string | null;
  cancellationReason: string | null;
  expiresAt: string | null;
  paymentDueAt: string | null;
  createdAt: string;
}

/** Ligne telle que le PRO la relit. Ajoute le contact — il doit pouvoir
 *  rappeler — et la liste des demandes EN CONFLIT.
 *
 *  ⚠ `conflictIds` est CALCULÉ à la lecture via `bookings_venue_timerange_gist`,
 *  jamais persisté : une réservation acceptée peut s'annuler ensuite, et un
 *  drapeau stocké deviendrait faux en silence. */
export interface ProBookingDTO extends BookingDTO {
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string | null;
  /** Ids des AUTRES demandes dont la plage recouvre celle-ci. Vide dans
   *  l'immense majorité des cas ; non vide, c'est le pro qui tranche. */
  conflictIds: string[];
}

/** Corps du 409 `BOOKING_PRICE_CHANGED` (D75) : les montants réels, pour que
 *  l'écran réaffiche la vérité au lieu d'inviter à rejouer l'échec. */
export interface BookingPriceChangedPayload {
  totalCents: number;
  depositCents: number;
}
