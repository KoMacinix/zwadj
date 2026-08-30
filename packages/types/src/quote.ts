// Devis — Flux E, Lot E2b ; machine à états refondue au lot Q2 (ex-C1c).
//
// ── Pourquoi une table à part, alors que `BookingService` détaille déjà ───────
// Parce que `BookingService` n'existe QUE si une réservation existe. Quatre
// choses en découlaient, toutes impossibles :
//   1. un devis remis AVANT qu'une réservation existe ;
//   2. plusieurs VERSIONS négociées (v1 → v2 → v3) avant acceptation ;
//   3. un devis qui n'aboutit JAMAIS — donc aucun taux de transformation
//      calculable, pas « pas encore mesuré » : structurellement impossible ;
//   4. un cycle de vie propre, qui n'a aucun sens pour une réservation.
//
// ── ⚠ CE QUE Q2 CHANGE, ET LA RAISON ────────────────────────────────────────
// `SENT` décrivait un parcours qui n'existe pas. Le pro algérien ne « envoie »
// pas un devis à distance : il l'imprime, l'annonce au comptoir, l'accorde par
// téléphone. Le statut servait donc de PÉAGE arbitraire — il fallait cliquer
// « Envoyer » pour pouvoir convertir, ce qui faisait cliquer sans envoyer, ce
// qui rendait l'entonnoir faux dans le seul sens qui compte.
//
// D160 le remplace par un PARTAGE, qui ne bloque rien : `sentVia` dit PAR QUOI
// le devis a été remis, `sentAt` dit QUAND, et le devis reste `DRAFT` tant que
// rien d'autre ne le ferme. Aucun état « remis ».
import { z } from "zod";
import { bookingServiceChoiceSchema, type BookingServiceDTO } from "./service";
import { dzPhoneSchema } from "./auth";
import { isRealCivilDate } from "./venue";

export const QuoteStatus = {
  DRAFT: "DRAFT",
  /** ⚠ LEGACY — PLUS JAMAIS ÉCRIT DEPUIS Q2, mais toujours LU.
   *
   *  La migration `20260814140000` a ramené en `DRAFT` les `SENT` **sans
   *  réservation**. Ceux qui en portaient une sont restés `SENT` (D166) : les
   *  basculer aurait rendu éditable un devis qui adosse une réservation vivante,
   *  c'est-à-dire violé D163 par la migration elle-même.
   *
   *  Ces lignes-là existent donc encore, et tout ce qui LIT un statut doit les
   *  accepter. Le retirer de cette union ferait sortir `toDTO` de son propre
   *  contrat sur des données réelles. */
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  /** ⚠ LEGACY depuis Q3a — plus jamais écrit, toujours lu. Absorbé par
   *  `CANCELLED` (D161) : la nuance « le client a refusé » / « le pro a annulé »
   *  perd sa valeur opérationnelle dès que le devis n'est plus envoyé à
   *  distance. Un seul état, un seul bouton.
   *
   *  ⚠ AUCUNE REPRISE DE DONNÉES, comme pour `SENT` (D168) : les lignes déjà
   *  `DECLINED` gardent leur statut. Une migration qui les basculerait
   *  réécrirait l'histoire — « refusé par le client » deviendrait « annulé » sur
   *  des affaires closes il y a des mois — pour un gain purement cosmétique.
   *
   *  ⚠ CE STATUT EST DONC COMPTÉ AVEC `CANCELLED` DANS L'ENTONNOIR. C'est le
   *  point qui rend l'absorption sûre : oublié, le compteur des affaires perdues
   *  retomberait à zéro le jour du déploiement, sans erreur et sans test rouge. */
  DECLINED: "DECLINED",
  /** Le devis est CLOS sans avoir abouti. Remplace `DECLINED` (D161).
   *
   *  Un seul état pour les deux cas réels — le client a dit non, ou le pro a
   *  renoncé —, parce que rien dans la suite du parcours ne les traite
   *  différemment : dans les deux cas l'affaire est perdue et le créneau libre. */
  CANCELLED: "CANCELLED",
  /** ⚠ LEGACY au même titre que `SENT` : plus rien ne supersède depuis Q2.
   *  `supersedeActive()` visait `[SENT, ACCEPTED]` ; `SENT` n'est plus écrit et
   *  `ACCEPTED` ne l'a JAMAIS été (vérifié : aucune écriture dans le dépôt).
   *  La fonction serait devenue un no-op silencieux — elle a donc été retirée,
   *  pas conservée « au cas où ». Les lignes déjà remplacées gardent leur état :
   *  devant un litige, « remplacé par une version plus récente » n'est toujours
   *  pas « refusé ». */
  SUPERSEDED: "SUPERSEDED"
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

/**
 * Statuts que le code a encore le droit d'ÉCRIRE.
 *
 * ⚠ Cette liste existe pour être MESURÉE, pas pour documenter. Un lot qui
 * réintroduirait une écriture de `SENT` ou de `SUPERSEDED` ne produirait aucune
 * erreur — juste un statut que plus aucun écran ne sait traiter. Le test qui
 * confronte cette liste au service est ce qui rend l'interdit exécutoire.
 */
export const QUOTE_WRITABLE_STATUSES = [
  QuoteStatus.DRAFT,
  QuoteStatus.ACCEPTED,
  QuoteStatus.CANCELLED
] as const;

/** Statuts hérités : lisibles, jamais réécrits. Trois désormais — `DECLINED` a
 *  rejoint `SENT` et `SUPERSEDED` avec l'absorption de Q3a. */
export const QUOTE_LEGACY_STATUSES = [
  QuoteStatus.SENT,
  QuoteStatus.SUPERSEDED,
  QuoteStatus.DECLINED
] as const;

/**
 * ⚠ LES STATUTS QUI COMPTENT COMME « AFFAIRE PERDUE » — DEUX, PAS UN.
 *
 * C'est la garde de l'absorption, et elle a une seule raison d'être : le jour du
 * déploiement, toutes les affaires perdues de l'historique sont en `DECLINED`.
 * Un entonnoir qui ne compterait que `CANCELLED` afficherait « 0 perdus » sur
 * une salle qui en a trente — un fait, présenté comme mesuré, et faux dans le
 * sens flatteur. Aucune erreur, aucun test rouge.
 *
 * ⚠ Et elle ne rétrécira PAS quand les vieilles lignes auront disparu : rien ne
 * les fera disparaître, puisqu'il n'y a pas de reprise de données.
 */
export const QUOTE_LOST_STATUSES = [QuoteStatus.CANCELLED, QuoteStatus.DECLINED] as const;

export function isQuoteLost(status: QuoteStatus): boolean {
  return (QUOTE_LOST_STATUSES as readonly string[]).includes(status);
}

/**
 * Le devis est-il encore OUVERT — c'est-à-dire : le pro peut-il encore le
 * remettre, le réviser, le convertir ou le refuser ?
 *
 * ⚠ CETTE FONCTION EST LA RÉPONSE AU PIÈGE N°2 DE Q2. `quotes-section.tsx`
 * testait `status === "SENT"` à TROIS endroits pour décider quels boutons
 * afficher. Retirer le statut aurait rendu les trois conditions fausses : les
 * boutons auraient disparu de l'écran sans erreur, sans test rouge, et sans
 * qu'aucune porte ne le voie. Trois littéraux recopiés, c'est trois endroits où
 * se tromper — la question « ce devis est-il encore ouvert ? » a désormais UNE
 * autorité, et les deux apps la partagent avec le service.
 *
 * `SENT` y figure parce qu'un devis hérité converti reste manipulable : le pro
 * doit pouvoir le refuser ou le réviser, sinon la migration lui aurait retiré
 * des lignes de son écran.
 */
export const QUOTE_OPEN_STATUSES = [QuoteStatus.DRAFT, QuoteStatus.SENT] as const;

export function isQuoteOpen(status: QuoteStatus): boolean {
  return (QUOTE_OPEN_STATUSES as readonly string[]).includes(status);
}

/**
 * CANAL DE REMISE DU DEVIS (Q1) — la SEULE autorité sur ce jeu de valeurs.
 *
 * Pourquoi une liste fermée mais pas un énuméré PostgreSQL : elle est appelée à
 * grandir, et un type en base imposerait une migration par libellé ajouté. Ici
 * une valeur de plus est une ligne, testable et relisible.
 *
 * ⚠ LE POINT QUI REND CETTE LISTE JUSTE. Les deux premiers canaux sont des
 * actes techniques ; les suivants sont des DÉCLARATIONS du pro. Sans eux, un
 * devis conclu de vive voix — le cas le plus courant au comptoir — n'aurait
 * aucun canal, donc n'entrerait jamais dans l'entonnoir alors qu'il a produit
 * une réservation. L'indicateur sous-compterait précisément les affaires
 * gagnées, ce qui est le pire sens dans lequel se tromper.
 *
 * ⚠ ET LES QUATRE SONT DÉCLARATIFS À CE LOT, `PRINT` ET `SMS` COMPRIS. Zwadj
 * n'imprime rien et n'envoie rien : il n'existe ni générateur de PDF ni
 * transport SMS dans le dépôt. Le pro déclare COMMENT il a remis le devis, avec
 * ses propres moyens. Un bouton qui prétendrait envoyer serait un mensonge
 * d'écran ; les libellés disent donc « remis par », jamais « envoyer ».
 */
export const QUOTE_SENT_VIA = {
  /** Le devis a été imprimé et remis sur papier. */
  PRINT: "PRINT",
  /** Le devis a été envoyé par SMS. */
  SMS: "SMS",
  /** Montant annoncé au comptoir, sans rien imprimer. */
  IN_PERSON: "IN_PERSON",
  /** Convenu par téléphone, hors de la salle. */
  PHONE: "PHONE"
} as const;

export type QuoteSentVia = (typeof QUOTE_SENT_VIA)[keyof typeof QUOTE_SENT_VIA];

/**
 * L'ORDRE d'affichage des canaux, tenu ici et pas dans l'écran.
 *
 * `Object.values()` sur un objet gelé rendrait le même ordre aujourd'hui, mais
 * l'ordre d'un objet n'est pas un contrat qu'on relit : une réorganisation
 * anodine du bloc ci-dessus changerait l'écran sans que personne l'ait voulu.
 */
export const QUOTE_SENT_VIA_ORDER = [
  QUOTE_SENT_VIA.PRINT,
  QUOTE_SENT_VIA.SMS,
  QUOTE_SENT_VIA.IN_PERSON,
  QUOTE_SENT_VIA.PHONE
] as const;

/**
 * Canaux qui exigent un TÉLÉPHONE valide (D158) — et seulement ceux-là.
 *
 * ⚠ D160 dit « l'acte est bloqué si le téléphone ne passe pas D158 ». Lu au pied
 * de la lettre pour les quatre canaux, cela interdirait de déclarer un devis
 * remis EN MAIN PROPRE à quelqu'un dont on n'a pas le numéro — c'est-à-dire le
 * cas que les canaux déclaratifs existent précisément pour couvrir. La borne est
 * donc posée là où elle décrit quelque chose de réel : on ne peut ni envoyer un
 * SMS ni appeler un numéro qu'on n'a pas.
 *
 * ⚠ Et elle ne vit QUE dans les écrans qui portent un numéro. `Quote` n'en
 * porte aucun — `contact_phone` est sur `Booking`, écrit à la conversion. Une
 * garde côté API demanderait donc un champ de plus dans le corps de la requête,
 * c'est-à-dire un contrat neuf, pour valider une donnée que le devis ne connaît
 * pas. Asymétrie ASSUMÉE et écrite : le parcours « client sur place » a le
 * numéro sous la main et l'exige, l'écran de devis ne l'a pas et ne l'invente
 * pas.
 */
export const QUOTE_SENT_VIA_NEEDS_PHONE = [QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.PHONE] as const;

export function quoteSentViaNeedsPhone(sentVia: QuoteSentVia): boolean {
  return (QUOTE_SENT_VIA_NEEDS_PHONE as readonly string[]).includes(sentVia);
}

export const quoteSentViaSchema = z.enum(
  [QUOTE_SENT_VIA.PRINT, QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.IN_PERSON, QUOTE_SENT_VIA.PHONE],
  { errorMap: () => ({ message: "quote.validation.sentViaInvalid" }) }
);

/** Corps de `POST /quotes/:id/deliver`. Un seul champ, et il est OBLIGATOIRE :
 *  une remise sans canal ne compte dans aucun entonnoir, elle serait un clic
 *  perdu. `.strict()` refuse tout le reste — notamment un `sentAt` qu'un
 *  appelant croirait pouvoir imposer : l'horodatage appartient au serveur. */
export const quoteDeliverSchema = z
  .object({ sentVia: quoteSentViaSchema })
  .strict("quote.validation.unknownKey");
export type QuoteDeliverInput = z.infer<typeof quoteDeliverSchema>;

export const QuoteErrorCode = {
  /** 404 INDISTINCT (D47). */
  QUOTE_NOT_FOUND: "QUOTE_NOT_FOUND",
  /** 409 — transition interdite. Le statut RÉEL est dans la réponse, pour que
   *  l'écran se remette d'aplomb sans recharger à l'aveugle. */
  QUOTE_STATUS_CONFLICT: "QUOTE_STATUS_CONFLICT",
  /** 409 — le devis a déjà été converti en demande. `bookings.quote_id` est
   *  UNIQUE : une nouvelle négociation passe par une nouvelle VERSION, pas par
   *  une seconde conversion. */
  QUOTE_ALREADY_CONVERTED: "QUOTE_ALREADY_CONVERTED"
} as const;
export type QuoteErrorCode = (typeof QuoteErrorCode)[keyof typeof QuoteErrorCode];

/** ⚠ `QUOTE_EXPIRED` A DISPARU AVEC `validUntil` (D160). Rien n'engage tant que
 *  l'acompte n'est pas payé : une date de validité sur un document qui n'engage
 *  personne ne protégeait aucun montant, elle empêchait seulement de conclure
 *  une affaire encore vivante. Le prix reste garanti par le VERSIONNEMENT — une
 *  version est un instantané — puis, dès Q3, par l'immuabilité en base d'un
 *  devis rattaché à une réservation. */

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
    clientId: z.string().uuid("quote.validation.idInvalid").optional()
  })
  .strict("quote.validation.unknownKey");
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

/** Révision — crée la version N+1 de la MÊME chaîne. Le corps est celui d'une
 *  création : une version est un devis entier, jamais un diff. Un diff
 *  obligerait à reconstruire l'état pour l'afficher, et une reconstruction se
 *  trompe un jour.
 *
 *  ⚠ Le passage de `revise()` à l'ÉCRASEMENT appartient à Q3, avec la garde
 *  d'immuabilité (D163/D167) : l'écrasement sans la garde changerait
 *  rétroactivement le montant d'une réservation acceptée, et payée une fois E3
 *  en place. Les deux arrivent ensemble ou pas du tout. */
export const quoteReviseSchema = quoteCreateSchema;
export type QuoteReviseInput = QuoteCreateInput;

/** Conversion du devis en DEMANDE de réservation.
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
  /** QUAND le devis a été remis. */
  sentAt: string | null;
  /** PAR QUOI il l'a été. NULL = pas encore remis — et c'est ce champ, désormais,
   *  qui décide de l'entrée dans l'entonnoir (D162). */
  sentVia: QuoteSentVia | null;
  acceptedAt: string | null;
  createdAt: string;
  /** Renseigné dès que le devis a été converti — c'est la jointure du taux de
   *  transformation. */
  bookingId: string | null;
}

/** Taux de transformation d'une salle. La raison d'être n°3 de la table : sans
 *  devis qui survivent à leur échec, ces nombres n'existent pas.
 *
 *  ⚠ `sent` s'appelle désormais `delivered`, et ce n'est pas un habillage. Le
 *  dénominateur a CHANGÉ de définition (D162) : ce ne sont plus les devis dont
 *  `sentAt` n'est pas nul — un horodatage que le clic « Envoyer » posait sans
 *  que rien ne parte — mais ceux qui portent un CANAL DE REMISE. Garder le nom
 *  aurait laissé deux écrans afficher « envoyés » sous un nombre qui compte
 *  autre chose ; le renommer fait passer TypeScript sur chaque lecture.
 *
 *  ⚠ `expired` a disparu avec `validUntil`. Un compteur dont la source n'existe
 *  plus se serait figé à zéro en affichant « 0 expirés » — un fait, présenté
 *  comme mesuré, qui n'était plus mesuré du tout. */
export interface QuoteConversionDTO {
  /** Chaînes distinctes dont au moins une version porte un canal de remise. */
  delivered: number;
  accepted: number;
  /** ⚠ Renommé depuis `declined` (Q3a), et pour la même raison que
   *  `sent` → `delivered` en Q2 : le compteur a changé de DÉFINITION, il couvre
   *  désormais DEUX statuts — `CANCELLED` et l'hérité `DECLINED`. Garder le nom
   *  aurait laissé croire qu'il suit un seul statut, celui qui n'est plus écrit.
   *  Le renommer fait passer TypeScript sur chaque lecture. */
  cancelled: number;
}
