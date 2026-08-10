// Devis — Flux E, Lot E2b.
//
// ── Pourquoi une table à part, alors que `BookingService` détaille déjà ───────
// Parce que `BookingService` n'existe QUE si une réservation existe. Quatre
// choses en découlaient, toutes impossibles :
//   1. un devis envoyé AVANT qu'une réservation existe ;
//   2. plusieurs VERSIONS négociées (v1 → v2 → v3) avant acceptation ;
//   3. un devis qui n'aboutit JAMAIS — donc aucun taux de transformation
//      calculable, pas « pas encore mesuré » : structurellement impossible ;
//   4. un cycle de vie propre, qui n'a aucun sens pour une réservation.
//
// Les deux objets ne font pas doublon, ils ont deux rôles : `Quote.lines` est un
// instantané IMMUABLE de la version N — on ne modifie jamais une version, on en
// crée une nouvelle — tandis que `BookingService` est le CONTRAT figé au moment
// où la réservation naît.
import { z } from "zod";
import { bookingServiceChoiceSchema, type BookingServiceDTO } from "./service";
import { dzPhoneSchema } from "./auth";
import { isRealCivilDate } from "./venue";

export const QuoteStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  /** ⚠ Distinct de DECLINED, et la nuance porte tout le lot : « remplacé par une
   *  version plus récente » n'est pas « refusé ». Devant un litige, la question
   *  posée est « pourquoi ce devis n'est-il plus actif », et les deux réponses
   *  n'engagent pas la même chose. */
  SUPERSEDED: "SUPERSEDED"
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

/** ⚠ EXPIRED n'existe PAS comme statut stocké. Un devis dont `validUntil` est
 *  passé EST expiré : la condition est déterministe, donc dérivée à la lecture.
 *  Persister un statut que rien ne fait basculer, c'est réinstaller la dette
 *  que D80 vient de documenter. */
export function isQuoteExpired(quote: { status: QuoteStatus; validUntil: string | null }, nowMs: number): boolean {
  if (quote.status !== QuoteStatus.SENT) return false;
  return quote.validUntil !== null && Date.parse(quote.validUntil) <= nowMs;
}

export const QuoteErrorCode = {
  /** 404 INDISTINCT (D47). */
  QUOTE_NOT_FOUND: "QUOTE_NOT_FOUND",
  /** 409 — transition interdite. Le statut RÉEL est dans la réponse, pour que
   *  l'écran se remette d'aplomb sans recharger à l'aveugle. */
  QUOTE_STATUS_CONFLICT: "QUOTE_STATUS_CONFLICT",
  /** 409 — le devis a dépassé `validUntil`. Il ne s'accepte plus ; il se
   *  révise. Distinct du conflit de statut : rien n'est « en désaccord », c'est
   *  le temps qui a passé. */
  QUOTE_EXPIRED: "QUOTE_EXPIRED",
  /** 409 — le devis a déjà été converti en demande. `bookings.quote_id` est
   *  UNIQUE : une nouvelle négociation passe par une nouvelle VERSION, pas par
   *  une seconde conversion. */
  QUOTE_ALREADY_CONVERTED: "QUOTE_ALREADY_CONVERTED"
} as const;
export type QuoteErrorCode = (typeof QuoteErrorCode)[keyof typeof QuoteErrorCode];

const text = (max: number) => z.string().trim().min(1, "quote.validation.required").max(max, "quote.validation.tooLong");

/** Création d'un devis — la v1 d'une chaîne.
 *
 *  `clientId` est FACULTATIF, et c'est le cas d'usage n°1 : le pro tape un devis
 *  pour quelqu'un qui hésite encore et n'a peut-être pas de compte. */
export const quoteCreateSchema = z
  .object({
    eventDate: z.string().refine(isRealCivilDate, "quote.validation.dateFormat"),
    slotTemplateId: z.string().uuid("quote.validation.idInvalid"),
    guests: z.number().int().min(1, "quote.validation.guestsRange").max(100000, "quote.validation.guestsRange"),
    services: z.array(bookingServiceChoiceSchema).max(20, "quote.validation.tooManyServices").optional(),
    clientId: z.string().uuid("quote.validation.idInvalid").optional(),
    /** Date civile de fin de validité. Absente = pas d'échéance. */
    validUntil: z.string().refine(isRealCivilDate, "quote.validation.dateFormat").optional()
  })
  .strict("quote.validation.unknownKey");
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

/** Révision — crée la version N+1 de la MÊME chaîne. Le corps est celui d'une
 *  création : une version est un devis entier, jamais un diff. Un diff
 *  obligerait à reconstruire l'état pour l'afficher, et une reconstruction se
 *  trompe un jour. */
export const quoteReviseSchema = quoteCreateSchema;
export type QuoteReviseInput = QuoteCreateInput;

/** Conversion du devis en DEMANDE de réservation (D101).
 *
 *  Elle exige le contact : `bookings.contact_*` est NOT NULL et le devis ne le
 *  porte pas. Il est connu au moment où le client s'engage.
 *
 *  ⚠ Elle ne fait PAS passer le devis en ACCEPTED. Ce statut est la conséquence
 *  d'une chaîne complète — acceptation de la date par le pro, PUIS encaissement
 *  de l'acompte — et il est posé par le lot Paiement. */
export const quoteConvertSchema = z
  .object({
    contactFirstName: text(80),
    contactLastName: text(80),
    contactPhone: dzPhoneSchema,
    /** ⚠ FACULTATIF — et c'est le SCHÉMA qui le dit, pas une préférence d'écran.
     *  `bookings.contact_email` est `String?` depuis toujours ; seule cette borne
     *  était plus stricte que la base. Le cas réel qu'elle rejetait est le cas
     *  NORMAL en Algérie : un client au comptoir qui n'a pas d'e-mail. Aucun
     *  parcours ne pouvait alors être conclu.
     *
     *  D55, CINQUIÈME occurrence de cette famille : avant d'écrire une
     *  validation de borne, écrire le cas réel qu'elle doit accepter — si elle le
     *  rejette, c'est elle qui a tort. Le schéma a autorité sur l'intuition.
     *
     *  Le TÉLÉPHONE reste obligatoire, et c'est cohérent : `contact_phone` est
     *  NOT NULL, et c'est par là que le pro rappelle. */
    contactEmail: z.string().trim().email("quote.validation.emailInvalid").max(180).optional(),
    paymentMethod: z.enum(["ONLINE", "CASH"], { errorMap: () => ({ message: "quote.validation.paymentMethodInvalid" }) })
  })
  .strict("quote.validation.unknownKey");
export type QuoteConvertInput = z.infer<typeof quoteConvertSchema>;

export interface QuoteDTO {
  id: string;
  venueId: string;
  clientId: string | null;
  status: QuoteStatus;
  /** Dérivé de `validUntil`, jamais stocké. */
  isExpired: boolean;
  version: number;
  chainId: string;
  parentQuoteId: string | null;
  eventDate: string;
  slotTemplateId: string | null;
  guests: number;
  basePriceCents: number;
  servicesTotalCents: number;
  totalCents: number;
  depositCents: number;
  lines: BookingServiceDTO[];
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  /** Renseigné dès que le devis a été converti — c'est la jointure du taux de
   *  transformation. */
  bookingId: string | null;
}

/** Taux de transformation d'une salle. La raison d'être n°3 de la table : sans
 *  devis qui survivent à leur échec, ces nombres n'existent pas. */
export interface QuoteConversionDTO {
  /** Chaînes distinctes ayant atteint au moins SENT. */
  sent: number;
  accepted: number;
  declined: number;
  /** Envoyées, ni acceptées ni refusées, et dont la validité est passée. */
  expired: number;
}
