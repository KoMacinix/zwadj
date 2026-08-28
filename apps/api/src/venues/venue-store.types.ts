// ⛔ S10a — LA FRONTIÈRE ENTRE `VenuesService` ET PostgreSQL.
//
// ⚠ POURQUOI CE PORT EXISTE, alors que ce service ne porte AUCUNE transaction.
// Le critère ① du cadrage (bloc transactionnel) ne s'applique pas ici ; c'est
// le critère ② : `venues.service.spec.ts` construisait son faux Prisma et le
// passait en `as unknown as PrismaService`, ce qui désactive TOUT contrôle de
// type sur le double. Un `select` qui change, et le double continue de rendre
// l'ancienne forme — le test reste vert sur un service qui ne compile plus la
// même chose.
//
// ⚠ ET LE CAST N'ÉTAIT PAS DE LA PARESSE : les délégués Prisma sont des
// génériques surchargés, `vi.fn()` ne leur est pas assignable. Il n'y avait pas
// d'autre issue que le cast — ou ce port, dont les méthodes sont des fonctions
// simples, contre lesquelles un double se type pour de vrai.
//
// ⚠ DEUX PORTS ET NON UN. Neuf méthodes derrière une seule interface auraient
// refait le fourre-tout que le cadrage interdit. Ils se séparent sur une ligne
// nette : l'un connaît l'agrégat Salle, l'autre ne fait que constater
// l'existence de référentiels.
//
// ⛔ LES PORTS NE LÈVENT PAS (doctrine S5b). `creer` rend un résultat discriminé
// plutôt qu'un P2002 ; les lectures rendent `null` plutôt qu'un 404. Traduire
// en exception Nest est le travail du service, qui seul connaît les codes et
// les clés i18n.
import type { VenueCreateInput, VenueUpdateInput } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { RULE_SELECT } from "./pricing-rules.service";

/** Allow-list des colonnes exposées au pro — l'ABSENCE de commission_rate_bps,
 *  cashback_rate_bps (D35) et rejection_reason ici est la garantie « jamais
 *  exposé au pro ». Exportée : l'admin (A3) l'étend avec les deux taux. */
export const VENUE_PRO_SELECT = {
  id: true,
  slug: true,
  cityId: true,
  nameFr: true,
  nameAr: true,
  taglineFr: true,
  taglineAr: true,
  descriptionFr: true,
  descriptionAr: true,
  districtFr: true,
  districtAr: true,
  address: true,
  lat: true,
  lng: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  depositRateBps: true,
  depositAmountCents: true,
  publicationStatus: true,
  status: true,
  // D45 (A6a) : identifiant Matterport — remplace les scènes/liaisons de D34.
  matterportModelId: true,
  createdAt: true,
  updatedAt: true,
  // A3-① : ids d'équipements (le référentiel complet ne voyage que côté public)
  ceremonyType: true,
  amenities: { select: { amenityId: true } },
  styles: { select: { styleId: true } },
  // Lot A4 : médias — ordres DÉTERMINISTES partout (tiebreak id, discipline A3).
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }] as Prisma.VenuePhotoOrderByWithRelationInput[],
    select: {
      id: true,
      storageKey: true,
      thumbKey: true,
      width: true,
      height: true,
      sortOrder: true,
      altFr: true,
      altAr: true,
      createdAt: true
    }
  },
  // D46 (B1) — les créneaux voyagent DANS le DTO pro, comme les photos : aucun
  // GET dédié, un seul aller-retour pour peupler l'écran d'édition.
  slotTemplates: {
    orderBy: [{ startMinutes: "asc" }, { id: "asc" }] as Prisma.SlotTemplateOrderByWithRelationInput[],
    select: {
      id: true,
      nameFr: true,
      nameAr: true,
      startMinutes: true,
      endMinutes: true,
      basePriceCents: true,
      isActive: true,
      createdAt: true,
      // D46 (B2) — les règles voyagent avec leur créneau : un créneau sans ses
      // variantes est un prix sans son contexte.
      pricingRules: {
        orderBy: [
          { ruleType: "asc" },
          { priority: "desc" },
          { createdAt: "desc" }
        ] as Prisma.PricingRuleOrderByWithRelationInput[],
        select: RULE_SELECT
      }
    }
  }
} as const;

export type VenueProRow = Prisma.VenueGetPayload<{ select: typeof VENUE_PRO_SELECT }>;

/** Ce qu'un pro fournit à la création, PLUS ce que le service a résolu pour lui :
 *  le propriétaire (via son profil) et le slug candidat. */
export type DonneesCreationSalle = VenueCreateInput & { ownerId: string; slug: string };

/** ⚠ RÉSULTAT DISCRIMINÉ, pas une exception. Le service essaie huit slugs ; il a
 *  besoin de distinguer « celui-ci est pris, essaie le suivant » de « la base a
 *  un problème ». Un `throw` l'obligerait à reconnaître un code Prisma, c'est-à-dire
 *  à savoir quelle base il parle. */
export type ResultatCreationSalle =
  | { readonly ok: true; readonly salle: VenueProRow }
  | { readonly ok: false; readonly raison: "slugPris" };

/** Mise à jour partielle. ⚠ `equipementIds` et `styleIds` sont des ENSEMBLES DE
 *  REMPLACEMENT déjà dédupliqués par le service (A3-①, D65) ; `undefined` veut
 *  dire « ne touche pas », une liste vide veut dire « efface la sélection ».
 *  Comment Prisma exprime un remplacement d'ensemble ne regarde que l'adaptateur. */
export interface MiseAJourSalle {
  readonly champs: Omit<VenueUpdateInput, "amenityIds" | "styleIds">;
  readonly equipementIds?: string[];
  readonly styleIds?: string[];
}

export const VENUE_STORE = Symbol("VENUE_STORE");

/** L'agrégat Salle vu par le service. Sept méthodes, une par décision. */
export interface VenueStore {
  /** ⚠ Rend `{ ok: false, raison: "slugPris" }` sur collision d'unicité, et
   *  RELÈVE tout le reste : une panne de base n'est pas un slug pris. */
  creer(donnees: DonneesCreationSalle): Promise<ResultatCreationSalle>;

  listerDuPro(userId: string): Promise<VenueProRow[]>;

  /** ⚠ `null` et non 404 : le port ne connaît ni les codes d'erreur ni i18n.
   *  Le WHERE d'appartenance (id + vivante + à moi) n'existe qu'à UN endroit,
   *  dans l'adaptateur — une seconde définition rouvrirait un trou
   *  d'énumération (A4-④). */
  trouverVivante(userId: string, venueId: string): Promise<VenueProRow | null>;

  /** ⚠ MÊME WHERE, select ID SEUL. Ce n'est pas un doublon de commodité :
   *  `VENUE_PRO_SELECT` embarque photos, scènes et liaisons, et le module média
   *  n'a besoin que de l'id. Fusionner les deux méthodes ferait payer ce select
   *  à chaque contrôle d'appartenance. */
  trouverIdVivante(userId: string, venueId: string): Promise<string | null>;

  mettreAJour(venueId: string, maj: MiseAJourSalle): Promise<VenueProRow>;

  /** Soft delete — jamais de DELETE SQL sur `venues`. */
  archiver(venueId: string): Promise<void>;

  /** ⚠ `null` si l'utilisateur n'a pas de profil pro. C'est une RUPTURE
   *  D'INVARIANT (D3 : un PRO en a toujours un), mais c'est au service de le
   *  dire — le port constate, il ne juge pas. */
  idProfilPro(userId: string): Promise<string | null>;
}

export const REFERENTIELS_EXISTENCE = Symbol("REFERENTIELS_EXISTENCE");

/** ⚠ CES TROIS MÉTHODES RENDENT UNE DÉCISION, PAS UN COMPTE. Le service
 *  comparait `found !== ids.length` : cette arithmétique appartient à celui qui
 *  a fait la requête. Rendre le compte obligerait chaque appelant à refaire la
 *  comparaison — et le jour où l'un d'eux se trompe de sens, personne ne le voit.
 *
 *  ⚠ Une liste VIDE est vraie sans interroger la base : « tous ces zéro ids
 *  existent » est vacuement vrai, et effacer une sélection est légitime (A3-①). */
export interface ReferentielsExistence {
  communeExiste(cityId: string): Promise<boolean>;
  stylesExistent(styleIds: string[]): Promise<boolean>;
  equipementsExistent(amenityIds: string[]): Promise<boolean>;
}
