// ⛔ S10b-1 — LA FRONTIÈRE ENTRE `QuotesService` ET PostgreSQL, sur le CYCLE DE
// VIE du devis. `convert()` n'est PAS ici : il écrit des montants dans un autre
// agrégat (`bookings`), sous contrainte d'unicité ET sous l'EXCLUDE de
// chevauchement. Classe de risque différente, lot différent (S10b-2).
//
// ⚠ CE PORT EST JUSTIFIÉ PAR LE CRITÈRE ① DU CADRAGE — quatre blocs
// transactionnels — et non par le compte d'imports Prisma. Les trois lectures
// de `price()` alimentent un calcul pur et ne sont ni transactionnelles ni
// risquées : elles RESTENT sur Prisma, délibérément.
//
// ⛔ LES PORTS NE LÈVENT PAS (doctrine S5b). Les deux check-and-set rendent un
// résultat discriminé PORTANT LE STATUT RELU — c'est cette valeur, et pas un
// booléen, qui dit au client ce qu'il peut faire ensuite.
import type { BookingSource, PaymentMethod, QuoteStatus } from "@zwadj/types";
import type { ResolvedLine } from "./service-pricing";
import type { Prisma } from "../generated/prisma/client";

export const QUOTE_SELECT = {
  id: true,
  venueId: true,
  clientId: true,
  status: true,
  version: true,
  chainId: true,
  parentQuoteId: true,
  eventDate: true,
  slotTemplateId: true,
  guests: true,
  basePriceCents: true,
  servicesTotalCents: true,
  totalCents: true,
  depositCents: true,
  lines: true,
  sentAt: true,
  sentVia: true,
  acceptedAt: true,
  createdAt: true,
  booking: { select: { id: true } }
} satisfies Prisma.QuoteSelect;

export type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof QUOTE_SELECT }>;

/** Ce que `price()` a calculé, prêt à être persisté. ⚠ AUCUNE ARITHMÉTIQUE
 *  MONÉTAIRE NE TRAVERSE CE PORT : les montants arrivent calculés, l'adaptateur
 *  les écrit tels quels. Un port qui recalculerait serait une seconde autorité
 *  sur le prix. */
export interface DevisChiffre {
  readonly clientId: string | null;
  readonly slotTemplateId: string | null;
  readonly eventDate: Date;
  readonly guests: number;
  readonly basePriceCents: number;
  readonly servicesTotalCents: number;
  readonly totalCents: number;
  readonly depositCents: number;
  readonly lines: Prisma.InputJsonValue;
}

/** ⚠ RÉSULTAT DISCRIMINÉ, ET LE REFUS PORTE LE STATUT RELU DANS LA TRANSACTION.
 *
 *  Le service levait son `ConflictException` À L'INTÉRIEUR du `$transaction`.
 *  Il le lève désormais DEHORS, sur ce résultat. Le changement est inoffensif
 *  ici — un refus signifie `count === 0`, donc rien n'avait été écrit et
 *  l'annulation ne défaisait rien — mais il est réel et se dit (MD1 du cadrage
 *  S10b-1).
 *
 *  ⚠ `statutActuel` n'est pas décoratif : c'est lui que le client reçoit dans
 *  le corps du 409, et c'est lui qui lui dit pourquoi son geste est refusé. Un
 *  booléen ferait perdre cette information (MD2). */
export type ResultatTransition =
  | { readonly ok: true; readonly devis: QuoteRow }
  | { readonly ok: false; readonly raison: "statutConflit"; readonly statutActuel: QuoteStatus };

/** ⛔ CE QUI PART DANS `bookings` — CHEMIN DE L'ARGENT (S10b-2).
 *
 *  ⚠ LES QUATRE MONTANTS SONT NOMMÉS UN PAR UN, jamais transmis par un objet
 *  large ou un spread. Un champ oublié dans un type permissif part en silence,
 *  et la demande porte alors un total qui ne correspond plus au devis que le
 *  client a sous les yeux. Les nommer, c'est faire tomber le typecheck le jour
 *  où l'un d'eux disparaît.
 *
 *  ⚠ AUCUN CALCUL. Les montants arrivent copiés du devis ; ni le port ni son
 *  adaptateur n'en dérivent un seul. */
export interface DonneesConversion {
  readonly venueId: string;
  readonly quoteId: string;
  readonly clientId: string | null;
  readonly slotTemplateId: string | null;
  /** ⚠ DÉCIDÉ PAR LE SERVICE (`clientId === null ? WALK_IN : CLIENT`) : c'est
   *  une lecture métier de la provenance, pas une propriété de la persistance. */
  readonly source: BookingSource;
  readonly paymentMethod: PaymentMethod;
  readonly eventDate: Date;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly slotNameFr: string | null;
  readonly slotNameAr: string | null;
  readonly guests: number;
  readonly basePriceCents: number;
  readonly servicesTotalCents: number;
  readonly totalCents: number;
  readonly depositCents: number;
  readonly contactFirstName: string;
  readonly contactLastName: string;
  readonly contactPhone: string;
  /** D135 — absent ⇒ NULL explicite, jamais une chaîne vide. */
  readonly contactEmail: string | null;
  /** ⛔ LE DÉTAIL DU TOTAL. Il s'écrit dans la MÊME requête que la demande :
   *  séparés, un échec du second laisserait une demande dont le total ne
   *  correspond à aucun détail. */
  readonly lignes: readonly ResolvedLine[];
}

/** ⚠ UN SEUL REFUS NOMMÉ, et il ne vient PAS d'un code de driver : l'adaptateur
 *  ne conclut « déjà converti » qu'après avoir RELU une demande existante pour
 *  ce devis. Le diagnostic repose sur l'état de la base, pas sur la forme
 *  interne d'une erreur Prisma — leçon de E3d-1. */
export type ResultatConversion =
  | { readonly ok: true }
  | { readonly ok: false; readonly raison: "dejaConverti" };

export const QUOTE_STORE = Symbol("QUOTE_STORE");

export interface QuoteStore {
  /** Crée la v1 ET la désigne tête de sa propre chaîne. ⚠ DEUX ÉCRITURES, UNE
   *  TRANSACTION : `chainId` vaut son propre id, que seule la base connaît
   *  (`uuidv7()`). En deux requêtes, un échec de la seconde laisserait un devis
   *  sans chaîne (MD4). */
  creerTeteDeChaine(venueId: string, chiffre: DevisChiffre): Promise<QuoteRow>;

  /** ⛔ VERROU DE CHAÎNE OBLIGATOIRE. `MAX(version)` puis `version + 1` est une
   *  perte de mise à jour classique : deux révisions simultanées lisent le même
   *  maximum et `quotes_chain_version_unique` refuse la seconde. Le
   *  `SELECT … FOR UPDATE` sur la racine les sérialise — sans lui, la garde
   *  disparaît sans qu'aucun test unitaire ne le voie (MD3). */
  creerRevision(args: {
    readonly venueId: string;
    readonly chainId: string;
    readonly parentQuoteId: string;
    readonly chiffre: DevisChiffre;
  }): Promise<QuoteRow>;

  /** Remise au client — check-and-set sur le statut, écriture du canal.
   *  ⚠ Répétable par construction : le dernier canal gagne (D160). */
  marquerRemis(args: {
    readonly quoteId: string;
    // ⚠ `QuoteStatus`, PAS `string`. C'est ce que rend `quoteAllowedFrom` et ce
    // qu'attend Prisma ; élargir en `string` obligerait l'adaptateur à caster,
    // c'est-à-dire à rouvrir le trou que ce lot ferme.
    readonly statutsAdmis: readonly QuoteStatus[];
    readonly sentVia: string;
    readonly sentAt: Date;
  }): Promise<ResultatTransition>;

  /** Changement de statut — check-and-set. Sert l'annulation aujourd'hui ;
   *  ⚠ le statut cible est FOURNI par le service, qui seul connaît la machine à
   *  états (`quote-transitions.ts`). Un port qui la connaîtrait la dupliquerait. */
  changerStatut(args: {
    readonly quoteId: string;
    readonly statutsAdmis: readonly QuoteStatus[];
    readonly nouveauStatut: QuoteStatus;
  }): Promise<ResultatTransition>;

  /** ⛔ CHEMIN DE L'ARGENT. Une seule écriture, lignes de service COMPRISES.
   *  ⚠ NE TOUCHE PAS AU DEVIS : il ne bouge pas à la conversion, il attend
   *  l'acompte. Une méthode nommée « convertir » invite à changer aussi son
   *  statut ; c'est exactement ce qu'il ne faut pas faire. */
  convertirEnDemande(donnees: DonneesConversion): Promise<ResultatConversion>;

  listerDeLaSalle(venueId: string): Promise<QuoteRow[]>;

  /** L'entonnoir compte des CHAÎNES, pas des versions. ⚠ Le filtre
   *  `sentVia IS NOT NULL` est le dénominateur de D162 : il vit ici parce que
   *  c'est une clause SQL, mais ce qu'il SIGNIFIE est documenté sur la méthode
   *  du service qui l'appelle. */
  listerPourEntonnoir(venueId: string): Promise<
    ReadonlyArray<{ readonly chainId: string; readonly status: QuoteStatus; readonly version: number }>
  >;

  /** ⚠ `null` et non 404 : le port ne connaît ni les codes ni i18n. */
  trouverDuPro(userId: string, quoteId: string): Promise<QuoteRow | null>;

  salleAppartientAu(userId: string, venueId: string): Promise<boolean>;
}
