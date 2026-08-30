// Catalogue de prestations d'une salle — Flux E, Lot E2a.
//
// Quatre types de tarification, PURS (AGENTS.md) : il n'existe pas de « menu par
// invité à paliers ». Une formule libre serait un langage à écrire, à valider et
// à faire comprendre à un pro sur son téléphone ; quatre cas nommés couvrent ce
// que les salles algériennes facturent réellement.
//
// ⚠ Ce que la BASE garantit, et ce qu'elle ne peut PAS garantir — la migration
// `20260707000001` le dit explicitement :
//   garanti  : exactement un mode de prix rempli par ligne, libellés d'unité
//              obligatoires en PER_UNIT, bornes cohérentes, montants ≥ 0 ;
//   NON garanti : que le mode rempli corresponde au `pricingType` déclaré, et
//              qu'un TIERED ait des paliers sans ligne de prix.
// Cette seconde moitié est donc une RÈGLE APPLICATIVE. C'est la raison d'être de
// D89 : le service et son tarif se créent ENSEMBLE, en une transaction.
import { z } from "zod";
import { ServicePricingType } from "./enums";

export const ServiceErrorCode = {
  /** 404 INDISTINCT (D47) : id malformé, inexistant, ou prestation d'un autre pro. */
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  /** 409 — la prestation demandée n'appartient pas à la salle réservée, ou
   *  n'est plus active. Distinct de « introuvable » : le client a pu garder un
   *  onglet ouvert pendant que le pro retirait la prestation. */
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  /** 400 — palier absent sur un TIERED, ou palier fourni sur un autre type. Le
   *  type appartient à la prestation, pas au client. */
  SERVICE_TIER_MISMATCH: "SERVICE_TIER_MISMATCH",
  /** 400 — quantité hors des bornes `minUnits`/`maxUnits` du PER_UNIT. */
  SERVICE_QUANTITY_OUT_OF_RANGE: "SERVICE_QUANTITY_OUT_OF_RANGE",
  /** 409 — suppression DURE refusée : la prestation figure déjà sur au moins une
   *  réservation. La suppression ne couvre que le cas rare « créée par erreur,
   *  jamais utilisée » ; arrêter un service qui a servi est un geste RÉVERSIBLE,
   *  et c'est `isActive: false`. La réponse le dit explicitement. */
  SERVICE_IN_USE: "SERVICE_IN_USE"
} as const;
export type ServiceErrorCode = (typeof ServiceErrorCode)[keyof typeof ServiceErrorCode];

const label = (max: number) => z.string().trim().min(1, "service.validation.required").max(max, "service.validation.tooLong");
const money = z.number({ invalid_type_error: "service.validation.priceInteger" }).int("service.validation.priceInteger").nonnegative("service.validation.priceNegative");

const tierSchema = z
  .object({
    labelFr: label(80),
    labelAr: label(80),
    priceCents: money,
    sortOrder: z.number().int().nonnegative().optional()
  })
  .strict("service.validation.unknownKey");

/** Le service ET son tarif, en UN SEUL corps (D89).
 *
 *  Union DISCRIMINÉE sur `pricingType` : chaque type ne porte que ses propres
 *  champs, et Zod refuse les autres. Un objet plat où tout serait optionnel
 *  laisserait passer un FIXED avec un prix par invité — exactement ce que la
 *  base ne sait pas rattraper. */
export const serviceCreateSchema = z.discriminatedUnion("pricingType", [
  z
    .object({
      pricingType: z.literal(ServicePricingType.FIXED),
      nameFr: label(120),
      nameAr: label(120),
      descriptionFr: z.string().trim().max(1000).optional(),
      descriptionAr: z.string().trim().max(1000).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      fixedPriceCents: money
    })
    .strict("service.validation.unknownKey"),
  z
    .object({
      pricingType: z.literal(ServicePricingType.PER_GUEST),
      nameFr: label(120),
      nameAr: label(120),
      descriptionFr: z.string().trim().max(1000).optional(),
      descriptionAr: z.string().trim().max(1000).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      perGuestPriceCents: money
    })
    .strict("service.validation.unknownKey"),
  z
    .object({
      pricingType: z.literal(ServicePricingType.PER_UNIT),
      nameFr: label(120),
      nameAr: label(120),
      descriptionFr: z.string().trim().max(1000).optional(),
      descriptionAr: z.string().trim().max(1000).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      perUnitPriceCents: money,
      /** Obligatoires : le CHECK SQL les exige, et « 3 » sans unité ne veut rien
       *  dire pour un client qui choisit une quantité. */
      unitNameFr: label(40),
      unitNameAr: label(40),
      minUnits: z.number().int().nonnegative().optional(),
      maxUnits: z.number().int().positive().optional()
    })
    .strict("service.validation.unknownKey"),
  z
    .object({
      pricingType: z.literal(ServicePricingType.TIERED),
      nameFr: label(120),
      nameAr: label(120),
      descriptionFr: z.string().trim().max(1000).optional(),
      descriptionAr: z.string().trim().max(1000).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      /** AU MOINS UN palier. Un TIERED sans palier est une prestation qu'aucun
       *  client ne peut choisir — et c'est précisément le trou que la base ne
       *  sait pas fermer. */
      tiers: z.array(tierSchema).min(1, "service.validation.tiersRequired").max(10, "service.validation.tiersTooMany")
    })
    .strict("service.validation.unknownKey")
])
  // ⚠ La cohérence min/max vit ICI et non sur l'option PER_UNIT : `.refine()`
  //   enveloppe un ZodObject dans un ZodEffects, et `discriminatedUnion` exige
  //   des objets NUS pour lire son discriminant. Le schéma se chargeait alors
  //   sans erreur mais levait à l'évaluation du module.
  .superRefine((v, ctx) => {
    if (v.pricingType !== ServicePricingType.PER_UNIT) return;
    if (v.minUnits !== undefined && v.maxUnits !== undefined && v.maxUnits < v.minUnits) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxUnits"], message: "service.validation.unitRange" });
    }
  });
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;

/** Mise à jour. Le `pricingType` NE CHANGE PAS : basculer un FIXED en TIERED
 *  invaliderait les lignes de réservation déjà snapshotées et demanderait de
 *  recréer tout le tarif. Supprimer puis recréer est plus honnête, et c'est un
 *  geste que le pro comprend. */
export const serviceUpdateSchema = z
  .object({
    nameFr: label(120).optional(),
    nameAr: label(120).optional(),
    descriptionFr: z.string().trim().max(1000).nullable().optional(),
    descriptionAr: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional()
  })
  .strict("service.validation.unknownKey");
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

/** Choix d'une prestation dans une demande. Le PRIX n'y figure pas : il est
 *  résolu par le serveur depuis le catalogue (D91), comme le prix de la salle
 *  l'est depuis le moteur B3. */
export const bookingServiceChoiceSchema = z
  .object({
    serviceId: z.string().uuid("service.validation.idInvalid"),
    /** Requis en TIERED, interdit ailleurs. */
    tierId: z.string().uuid("service.validation.idInvalid").optional(),
    /** Requis en PER_UNIT, interdit ailleurs : en PER_GUEST la quantité est le
     *  nombre d'invités de la demande, en FIXED et TIERED elle vaut 1. */
    quantity: z.number().int().positive("service.validation.quantityRange").optional()
  })
  .strict("service.validation.unknownKey");
export type BookingServiceChoice = z.infer<typeof bookingServiceChoiceSchema>;

export interface ServiceTierDTO {
  id: string;
  labelFr: string;
  labelAr: string;
  priceCents: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceDTO {
  id: string;
  venueId: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  pricingType: ServicePricingType;
  isActive: boolean;
  sortOrder: number;
  /** `null` en TIERED — ses prix sont dans `tiers`. */
  fixedPriceCents: number | null;
  perGuestPriceCents: number | null;
  perUnitPriceCents: number | null;
  unitNameFr: string | null;
  unitNameAr: string | null;
  minUnits: number | null;
  maxUnits: number | null;
  /** Vide sauf en TIERED. */
  tiers: ServiceTierDTO[];
}

/** Ligne SNAPSHOTÉE sur une réservation. Elle survit au renommage, au retrait,
 *  et même à la suppression de la prestation (`onDelete: SetNull`) : ce que le
 *  client a accepté ne doit jamais changer sous ses yeux. */
export interface BookingServiceDTO {
  id: string;
  serviceId: string | null;
  tierId: string | null;
  nameFr: string;
  nameAr: string;
  pricingType: ServicePricingType;
  tierLabelFr: string | null;
  tierLabelAr: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}
