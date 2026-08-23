import { z } from "zod";
// D61 (C3) — le téléphone de contact d'un rendez-vous de visite réutilise la
// SEULE définition du format algérien, celle de la tranche auth. En recopier la
// regex ici créerait deux vérités sur le même format (patron déjà en place dans
// `account.ts`).
import { dzPhoneSchema } from "./auth";
import { PRICING_RULE_TYPES, type PricingRuleType } from "./enums";
import { BookingMode, CeremonyType, VenueAvailabilityStatus, type VenuePublicationStatus, type VisitStatus } from "./enums";
import { VENUE_MEDIA_CAPS } from "./media";
import type { ServiceDTO } from "./service";
import type { AmenityDTO } from "./referentials";

/** Résumé d'une salle pour les listes/recherche — aligné sur le modèle Prisma `Venue`. */
export interface VenueSummaryDTO {
  id: string;
  slug: string;
  cityId: string; // Lot A3 : la liste publique est filtrable/affichable par ville
  nameFr: string;
  nameAr: string;
  taglineFr: string | null; // Lot A3 : accroche sur les cartes de la liste
  taglineAr: string | null;
  districtFr: string | null;
  districtAr: string | null;
  /** D36 (A9) : plus de minimum — « jusqu'à N invités ». */
  capacityMax: number;
  /** Centimes de DZD (invariant : argent en entiers). */
  basePriceCents: number;
  bookingMode: BookingMode;
  /** D66 (A13) — `null` : la salle ne l'a pas encore déclaré. */
  ceremonyType: CeremonyType | null;
  publicationStatus: VenuePublicationStatus;
  /** Lot A4 — règle verrouillée : couverture = PREMIÈRE photo par sortOrder
   *  (thumb 480). Sert les cartes A7, les OG tags (9.9) et schema.org (23.8) ;
   *  le réordonnancement des photos fait donc office de sélecteur de
   *  couverture. `null` : salle sans photo. */
  coverThumbUrl: string | null;
  /** Lot A4 — signal « complétude » (le tri recommandé du 23.8 le consommera). */
  photoCount: number;
  /** Lot `availableOn` — la salle a-t-elle ENCORE un créneau libre à la date
   *  annotée ? ⚠ Ce champ ANNOTE, il ne filtre pas : la salle grisée reste
   *  DANS la page et reste cliquable — le client peut vouloir changer de date
   *  plutôt que de salle. Filtrer coûterait O(catalogue) là où annoter coûte
   *  O(page).
   *
   *  ⚠ TROIS VALEURS, MAIS UNE SEULE SIGNIFICATION PAR CONTEXTE :
   *   - `true`  : au moins un créneau actif reste AVAILABLE ce jour-là ;
   *   - `false` : tous les créneaux actifs sont pris ou bloqués ⇒ GRISÉE ;
   *   - `null`  : la question n'a pas été posée. UN SEUL cas — l'écho
   *     `VenueListResponse.availableOn` vaut alors `null` lui aussi.
   *
   *  ⚠ ÉCART ASSUMÉ AVEC LA PREMIÈRE VERSION DE D211 (correction Ko).
   *  Une salle SANS AUCUN CRÉNEAU ACTIF rendait `null`. Elle n'est désormais
   *  plus rendue du tout quand `availableOn` est demandé : elle est EXCLUE de
   *  la réponse. D211 confondait deux refus sous un seul état — « prise ce
   *  jour-là » et « jamais réservable ». Le premier rend « essayez une autre
   *  date » utile ; le second le rend TROMPEUR, puisque aucune date ne
   *  marchera. Le contrat ne peut donc plus produire `null` quand l'écho porte
   *  une date.
   *
   *  ⚠ `PENDING` ne grise PAS (D101, arbitrage Ko) : une demande en attente ne
   *  verrouille rien — deux couples peuvent demander la même date, le pro
   *  tranche. Seul le DUR (`ACCEPTED`/`CONFIRMED`) et les blocages pro grisent. */
  availableOnDate: boolean | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lot A2 — CRUD Venue côté Pro. Schémas Zod partagés front/back, messages =
// CLÉS i18n (venue.validation.*), même contrat que la tranche Auth.
// JAMAIS dans ces schémas (le .strict() transforme toute tentative en 400) :
// slug (figé à la création, généré serveur), publicationStatus (porte de
// modération admin, A3), commissionRateBps / cashbackRateBps (admin, A3 —
// jamais exposés au pro), rejectionReason (phase 12).
// ─────────────────────────────────────────────────────────────────────────────

const nameFrSchema = z
  .string({ required_error: "venue.validation.nameFrRequired" })
  .trim()
  .min(2, "venue.validation.nameFrTooShort")
  .max(150, "venue.validation.nameFrTooLong");

const nameArSchema = z
  .string({ required_error: "venue.validation.nameArRequired" })
  .trim()
  .min(2, "venue.validation.nameArTooShort")
  .max(150, "venue.validation.nameArTooLong");

/** Champ texte optionnel : fourni ⇒ non vide et borné (le « vide » légitime
 *  s'exprime en l'omettant à la création, ou par `null` en mise à jour). */
const optionalText = (max: number, tooLongKey: string) =>
  z.string().trim().min(1, "venue.validation.textEmpty").max(max, tooLongKey);

const capacitySchema = (requiredKey: string) =>
  z
    .number({ required_error: requiredKey, invalid_type_error: "venue.validation.capacityInteger" })
    .int("venue.validation.capacityInteger")
    .min(1, "venue.validation.capacityTooSmall")
    .max(10_000, "venue.validation.capacityTooLarge");

/** Arbitrage Ko (A2-②) : simple `> 0`, aucun plancher métier pour l'instant. */
const basePriceSchema = z
  .number({ required_error: "venue.validation.basePriceRequired", invalid_type_error: "venue.validation.basePriceInteger" })
  .int("venue.validation.basePriceInteger")
  .positive("venue.validation.basePricePositive");

const latSchema = z.number().min(-90, "venue.validation.latRange").max(90, "venue.validation.latRange");
const lngSchema = z.number().min(-180, "venue.validation.lngRange").max(180, "venue.validation.lngRange");

const bookingModeSchema = z.enum([BookingMode.SINGLE_SLOT, BookingMode.MULTI_SLOT], {
  errorMap: () => ({ message: "venue.validation.bookingModeInvalid" })
});

/** D33 — les trois états libre-service du pro. */
const availabilityStatusSchema = z.enum(
  [VenueAvailabilityStatus.ACTIVE, VenueAvailabilityStatus.HIDDEN, VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE],
  { errorMap: () => ({ message: "venue.validation.statusInvalid" }) }
);

// ─────────────────────────────────────────────────────────────────────────────
// D81 — Politique d'acompte, PAR SALLE : pourcentage OU montant fixe.
// ─────────────────────────────────────────────────────────────────────────────

/** Bornes du taux d'acompte, en points de base. 500 = 5 %, 10000 = 100 %.
 *
 *  Le plancher n'est pas décoratif : un acompte de 0 % voudrait dire « on
 *  confirme sans rien encaisser », ce qui n'est plus du request-to-book mais un
 *  autre parcours. Le plafond autorise le paiement intégral en ligne, qui est un
 *  choix légitime pour une petite salle. */
export const DEPOSIT_RATE_BPS_MIN = 500;
export const DEPOSIT_RATE_BPS_MAX = 10000;

/** Valeur de reprise des salles existantes : les 30 % implicites d'avant D81,
 *  ceux que le design annonce partout. */
export const DEPOSIT_RATE_BPS_DEFAULT = 3000;

/** Politique d'acompte d'une salle. EXACTEMENT un des deux champs est non nul —
 *  invariant tenu par le `CHECK` SQL, par Zod, et par ce type.
 *
 *  Deux champs plutôt qu'un couple `type` + `valeur` : mélanger des centimes et
 *  des points de base dans une même colonne est exactement ce que D46 refuse.
 *  Chacun garde son unité et ses bornes. */
export type DepositPolicy =
  | { depositRateBps: number; depositAmountCents: null }
  | { depositRateBps: null; depositAmountCents: number };

export const venueCreateSchema = z
  .object({
    cityId: z.string({ required_error: "venue.validation.cityRequired" }).uuid("venue.validation.cityInvalid"),
    nameFr: nameFrSchema,
    nameAr: nameArSchema,
    taglineFr: optionalText(180, "venue.validation.taglineTooLong").optional(),
    taglineAr: optionalText(180, "venue.validation.taglineTooLong").optional(),
    descriptionFr: optionalText(5000, "venue.validation.descriptionTooLong").optional(),
    descriptionAr: optionalText(5000, "venue.validation.descriptionTooLong").optional(),
    districtFr: optionalText(100, "venue.validation.districtTooLong").optional(),
    districtAr: optionalText(100, "venue.validation.districtTooLong").optional(),
    address: optionalText(300, "venue.validation.addressTooLong").optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
    capacityMax: capacitySchema("venue.validation.capacityMaxRequired"),
    basePriceCents: basePriceSchema,
    /** Omis ⇒ défaut Prisma SINGLE_SLOT (cadrage : « défaut single »). */
    bookingMode: bookingModeSchema.optional()
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    if ((v.lat === undefined) !== (v.lng === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lng"], message: "venue.validation.coordsPair" });
    }
  });
export type VenueCreateInput = z.infer<typeof venueCreateSchema>;

/**
 * Mise à jour PARTIELLE réelle (arbitrage A2-③) : TOUT est optionnel — un
 * corps `{ "status": "HIDDEN" }` seul est valide, jamais besoin de renvoyer
 * l'objet complet. `null` sur un champ nullable = effacement explicite.
 * D36 (A9) : plus aucune cohérence croisée de capacité à juger — il n'y a
 * qu'une capacité, ses bornes sont dans le schéma.
 */
export const venueUpdateSchema = z
  .object({
    cityId: z.string().uuid("venue.validation.cityInvalid").optional(),
    nameFr: nameFrSchema.optional(),
    nameAr: nameArSchema.optional(),
    taglineFr: optionalText(180, "venue.validation.taglineTooLong").nullable().optional(),
    taglineAr: optionalText(180, "venue.validation.taglineTooLong").nullable().optional(),
    descriptionFr: optionalText(5000, "venue.validation.descriptionTooLong").nullable().optional(),
    descriptionAr: optionalText(5000, "venue.validation.descriptionTooLong").nullable().optional(),
    districtFr: optionalText(100, "venue.validation.districtTooLong").nullable().optional(),
    districtAr: optionalText(100, "venue.validation.districtTooLong").nullable().optional(),
    address: optionalText(300, "venue.validation.addressTooLong").nullable().optional(),
    lat: latSchema.nullable().optional(),
    lng: lngSchema.nullable().optional(),
    capacityMax: capacitySchema("venue.validation.capacityMaxRequired").optional(),
    basePriceCents: basePriceSchema.optional(),
    bookingMode: bookingModeSchema.optional(),
    /** D33 : bascule libre-service, réversible, incluse dans le PATCH général. */
    status: availabilityStatusSchema.optional(),
    /** A3-① : REMPLACEMENT de l'ensemble des équipements (ids du référentiel
     *  Amenity). Doublons dédupliqués côté service ; id inconnu → 400. */
    amenityIds: z.array(z.string().uuid("venue.validation.amenityInvalid")).max(50, "venue.validation.amenitiesTooMany").optional(),
    /** D65 (A13) — REMPLACEMENT de l'ensemble des styles (ids du référentiel
     *  VenueStyle), même contrat qu'`amenityIds` : tableau vide = plus aucun
     *  style, absent = inchangé. */
    styleIds: z.array(z.string().uuid("venue.validation.styleInvalid")).max(20, "venue.validation.stylesTooMany").optional(),
    /** D66 (A13) — `null` efface explicitement (la salle ne le déclare plus). */
    ceremonyType: z
      .enum([CeremonyType.INDOOR, CeremonyType.OUTDOOR, CeremonyType.MIXED], {
        errorMap: () => ({ message: "venue.validation.ceremonyTypeInvalid" })
      })
      .nullable()
      .optional(),
    /** D81 — politique d'acompte. PAIRE INDISSOCIABLE, exactement un des deux
     *  non nul : le couple se fournit ensemble, comme lat/lng juste au-dessous.
     *  Décidable par Zod seul, donc AUCUNE lecture croisée en base — contrairement
     *  aux taux D35, où le partiel réel obligeait le service à relire l'autre. */
    depositRateBps: z
      .number({ invalid_type_error: "venue.validation.depositInteger" })
      .int("venue.validation.depositInteger")
      .min(DEPOSIT_RATE_BPS_MIN, "venue.validation.depositRateRange")
      .max(DEPOSIT_RATE_BPS_MAX, "venue.validation.depositRateRange")
      .nullable()
      .optional(),
    depositAmountCents: z
      .number({ invalid_type_error: "venue.validation.depositInteger" })
      .int("venue.validation.depositInteger")
      .positive("venue.validation.depositAmountRange")
      .nullable()
      .optional()
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    // Paire lat/lng : fournis ensemble, effacés ensemble.
    const latGiven = v.lat !== undefined;
    const lngGiven = v.lng !== undefined;
    if (latGiven !== lngGiven || (latGiven && lngGiven && (v.lat === null) !== (v.lng === null))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lng"], message: "venue.validation.coordsPair" });
    }

    // D81 — la paire d'acompte se fournit ENTIÈRE, et exactement un des deux
    // champs est non nul. Une salle sans politique n'existe pas : la migration
    // en donne une à tout le monde, et ce PATCH ne sait pas la retirer.
    const rateGiven = v.depositRateBps !== undefined;
    const amountGiven = v.depositAmountCents !== undefined;
    if (rateGiven !== amountGiven) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["depositAmountCents"], message: "venue.validation.depositPair" });
    } else if (rateGiven && amountGiven && (v.depositRateBps === null) === (v.depositAmountCents === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["depositAmountCents"], message: "venue.validation.depositExclusive" });
    }
  })
  .refine((v) => Object.keys(v).length > 0, { message: "venue.validation.emptyUpdate" });
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;

/** Codes d'erreur métier venues (stables, consommés par les fronts). */
/** Bornes d'un créneau, en MINUTES depuis minuit du jour de DÉBUT. Un entier
 *  plutôt qu'une heure : pas de fuseau, pas d'heure d'été, chevauchement
 *  trivial à calculer.
 *
 *  La fin peut DÉPASSER 1440 : une soirée de mariage algérienne finit après
 *  minuit, et c'est le cas NORMAL, pas l'exception — 20h → 02h s'écrit
 *  1200 → 1560. Ces bornes reprennent exactement le CHECK
 *  `slot_templates_minutes_valid` posé en 20260707000001 : début dans la
 *  journée, fin strictement après le début et au plus 48 h. */
export const SLOT_START_MAX = 1439;
export const SLOT_END_MAX = 2880;

/** D46 — le prix appartient au CRÉNEAU, plus à la salle. `Venue.basePriceCents`
 *  n'est plus qu'un DÉRIVÉ : le minimum des créneaux actifs, recalculé par
 *  l'API dans la même transaction (la recherche publique filtre et trie
 *  dessus, cf. A3/A7). */
export interface SlotTemplateDTO {
  id: string;
  nameFr: string;
  nameAr: string;
  startMinutes: number;
  endMinutes: number;
  basePriceCents: number;
  isActive: boolean;
  createdAt: string;
  /** D46 (B2) — variantes de prix du créneau, les plus spécifiques d'abord
   *  (HOLIDAY, WEEKDAY, SEASON), puis priorité décroissante. Elles voyagent
   *  ICI : un créneau sans ses règles est un prix sans son contexte. */
  pricingRules: PricingRuleDTO[];
}

const slotFields = {
  nameFr: z.string().trim().min(1, "venue.validation.textEmpty").max(60, "venue.validation.slotNameTooLong"),
  nameAr: z.string().trim().min(1, "venue.validation.textEmpty").max(60, "venue.validation.slotNameTooLong"),
  startMinutes: z
    .number()
    .int()
    .min(0, "venue.validation.slotOutOfDay")
    .max(SLOT_START_MAX, "venue.validation.slotOutOfDay"),
  endMinutes: z.number().int().min(1, "venue.validation.slotOutOfDay").max(SLOT_END_MAX, "venue.validation.slotOutOfDay"),
  /** Strictement positif : un créneau gratuit n'est pas un prix, c'est un
   *  oubli de saisie — et il deviendrait le minimum, donc le « à partir de »
   *  public de la salle. */
  basePriceCents: z.number().int().positive("venue.validation.pricePositive")
};

/** Le début doit précéder la fin. Franchir minuit est LÉGAL et attendu : la
 *  fin s'exprime alors au-delà de 1440 (02h du lendemain = 1560). */
function assertOrdered(value: { startMinutes: number; endMinutes: number }, ctx: z.RefinementCtx): void {
  if (value.startMinutes >= value.endMinutes) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endMinutes"], message: "venue.validation.slotEndBeforeStart" });
  }
}

export const slotTemplateCreateSchema = z.object(slotFields).strict().superRefine(assertOrdered);
export type SlotTemplateCreateInput = z.infer<typeof slotTemplateCreateSchema>;

/** PATCH partiel (patron A2). `isActive` vit ici : c'est le RETRAIT d'un
 *  créneau sans casser l'historique, par opposition au DELETE dur. */
export const slotTemplateUpdateSchema = z
  .object({ ...slotFields, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "venue.validation.emptyUpdate" })
  .superRefine((value, ctx) => {
    if (value.startMinutes !== undefined && value.endMinutes !== undefined) {
      assertOrdered({ startMinutes: value.startMinutes, endMinutes: value.endMinutes }, ctx);
    }
  });
export type SlotTemplateUpdateInput = z.infer<typeof slotTemplateUpdateSchema>;

/** D46 (B2) — variante de prix d'un CRÉNEAU. `priceCents` est ABSOLU : les
 *  règles ne se composent pas, une seule gagne (HOLIDAY > WEEKDAY > SEASON,
 *  puis priorité, puis la plus récente). */
export interface PricingRuleDTO {
  id: string;
  slotTemplateId: string;
  ruleType: PricingRuleType;
  label: string | null;
  priceCents: number;
  startMonth: number | null;
  endMonth: number | null;
  daysOfWeek: number[];
  priority: number;
  isActive: boolean;
  createdAt: string;
}

const pricingRuleFields = {
  ruleType: z.enum(PRICING_RULE_TYPES),
  label: z.string().trim().min(1, "venue.validation.textEmpty").max(60, "venue.validation.ruleLabelTooLong").nullable(),
  priceCents: z.number().int().positive("venue.validation.pricePositive"),
  /** Mois INCLUS, 1–12. La fenêtre peut enjamber décembre (11 → 2). */
  startMonth: z.number().int().min(1, "venue.validation.monthRange").max(12, "venue.validation.monthRange").nullable(),
  endMonth: z.number().int().min(1, "venue.validation.monthRange").max(12, "venue.validation.monthRange").nullable(),
  /** 0 = dimanche … 6 = samedi. Le week-end algérien est [5, 6], mais rien
   *  n'est codé en dur : c'est le pro qui coche. */
  daysOfWeek: z.array(z.number().int().min(0, "venue.validation.dayRange").max(6, "venue.validation.dayRange")),
  priority: z.number().int().min(0, "venue.validation.priorityRange").max(100, "venue.validation.priorityRange")
};

/** Les champs REQUIS dépendent du type. Une saison sans bornes serait
 *  inapplicable (le moteur l'ignore), un week-end sans jours aussi : les
 *  refuser à l'écriture évite au pro de saisir une règle morte et de croire
 *  ensuite à un bug de tarification. */
function assertRuleShape(
  value: { ruleType?: PricingRuleType; startMonth?: number | null; endMonth?: number | null; daysOfWeek?: number[] },
  ctx: z.RefinementCtx
): void {
  if (value.ruleType === "SEASON" && (value.startMonth == null || value.endMonth == null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startMonth"], message: "venue.validation.seasonBoundsRequired" });
  }
  if (value.ruleType === "WEEKDAY" && (value.daysOfWeek === undefined || value.daysOfWeek.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["daysOfWeek"], message: "venue.validation.weekdaysRequired" });
  }
}

export const pricingRuleCreateSchema = z
  .object({
    ...pricingRuleFields,
    label: pricingRuleFields.label.default(null),
    startMonth: pricingRuleFields.startMonth.default(null),
    endMonth: pricingRuleFields.endMonth.default(null),
    daysOfWeek: pricingRuleFields.daysOfWeek.default([]),
    priority: pricingRuleFields.priority.default(0)
  })
  .strict()
  .superRefine(assertRuleShape);
export type PricingRuleCreateInput = z.infer<typeof pricingRuleCreateSchema>;

/** PATCH partiel (patron A2). Le TYPE n'est pas modifiable : changer le type
 *  d'une règle en place laisserait ses bornes de saison sur une règle férié.
 *  Le pro supprime et recrée. */
export const pricingRuleUpdateSchema = z
  .object({
    label: pricingRuleFields.label,
    priceCents: pricingRuleFields.priceCents,
    startMonth: pricingRuleFields.startMonth,
    endMonth: pricingRuleFields.endMonth,
    daysOfWeek: pricingRuleFields.daysOfWeek,
    priority: pricingRuleFields.priority,
    isActive: z.boolean()
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "venue.validation.emptyUpdate" });
export type PricingRuleUpdateInput = z.infer<typeof pricingRuleUpdateSchema>;

export const VenueErrorCode = {
  /** 404 INDISTINCT : inexistante, supprimée, id malformé ou salle d'un autre
   *  pro — anti-énumération, même doctrine que /media/:key. */
  VENUE_NOT_FOUND: "VENUE_NOT_FOUND",
  CITY_NOT_FOUND: "CITY_NOT_FOUND",
  /** A3-① : un id d'équipement absent du référentiel Amenity (écriture pro). */
  AMENITY_NOT_FOUND: "AMENITY_NOT_FOUND",
  /** D35 : fusion PATCH ∪ stocké, cashbackRateBps > commissionRateBps. */
  CASHBACK_EXCEEDS_COMMISSION: "CASHBACK_EXCEEDS_COMMISSION",
  /** Lot A4 — 404 INDISTINCTS « dans MA salle vivante », même doctrine que
   *  VENUE_NOT_FOUND : inexistante, id malformé, ou média d'une autre salle. */
  PHOTO_NOT_FOUND: "PHOTO_NOT_FOUND",
  /** Lot A4 — réordonnancement : l'ensemble envoyé ≠ l'ensemble stocké
   *  (photo supprimée dans un autre onglet…). Côté A6a : « rafraîchissez puis
   *  réessayez », jamais un échec muet. */
  PHOTO_ORDER_MISMATCH: "PHOTO_ORDER_MISMATCH",
  /** D45 (A6a) — PATCH /venues/:id/virtual-tour : saisie ni ID Matterport
   *  valide, ni URL de partage Matterport exploitable. 400, jamais un échec
   *  muet — même doctrine que PHOTO_ORDER_MISMATCH. */
  INVALID_MATTERPORT_LINK: "INVALID_MATTERPORT_LINK",
  /** D45 (A6a) — 409 : ce modèle Matterport est DÉJÀ rattaché à une autre
   *  salle (unicité SQL de venues.matterport_model_id). Le compte Matterport
   *  étant unique pour tout Zwadj, le copier-coller d'une même URL sur deux
   *  salles est l'accident le plus probable. On ne révèle pas quelle salle :
   *  elle peut ne pas appartenir à ce pro. */
  MATTERPORT_ALREADY_LINKED: "MATTERPORT_ALREADY_LINKED",
  /** D46 (B1) — 404 INDISTINCT « dans MA salle vivante », même doctrine que
   *  PHOTO_NOT_FOUND : créneau inexistant, id malformé, ou créneau d'une autre
   *  salle. */
  SLOT_TEMPLATE_NOT_FOUND: "SLOT_TEMPLATE_NOT_FOUND",
  /** D46 (B1) — 409 : chevauchement avec un autre créneau ACTIF de la salle.
   *  Deux créneaux qui se recouvrent rendent la disponibilité indécidable —
   *  quel créneau la réservation bloque-t-elle ? */
  SLOT_TEMPLATE_OVERLAP: "SLOT_TEMPLATE_OVERLAP",
  /** D46 (B1) — 409 : `SINGLE_SLOT` impose EXACTEMENT un créneau actif. En
   *  autoriser deux créerait un état où le client choisit un créneau sans
   *  effet, la réservation bloquant de toute façon la journée entière. */
  SLOT_TEMPLATE_SINGLE_MODE: "SLOT_TEMPLATE_SINGLE_MODE",
  /** D46 (B1) — 409 : suppression DURE d'un créneau déjà référencé par un
   *  devis ou une réservation. Ce qui a été vendu ne se réécrit pas : le
   *  retrait passe par `isActive: false`. */
  SLOT_TEMPLATE_IN_USE: "SLOT_TEMPLATE_IN_USE",
  /** D46 (B1) — 409 : l'opération laisserait une salle PUBLIÉE sans aucun
   *  créneau actif, donc invisible au calendrier et non réservable. Vaut aussi
   *  comme garde à la publication admin. */
  SLOT_TEMPLATE_REQUIRED: "SLOT_TEMPLATE_REQUIRED",
  /** D46 (B2) — 404 INDISTINCT « dans MON créneau, dans MA salle ». */
  PRICING_RULE_NOT_FOUND: "PRICING_RULE_NOT_FOUND",
  /** D51 (B3) — 404 INDISTINCT « dans MA salle vivante » : blocage inexistant,
   *  id malformé, ou blocage d'une autre salle. */
  AVAILABILITY_BLOCK_NOT_FOUND: "AVAILABILITY_BLOCK_NOT_FOUND",
  /** D51 (B3) — 409 : la plage recouvre une réservation ACCEPTED/CONFIRMED.
   *  Aucune contrainte SQL ne peut porter ce conflit — une EXCLUDE ne traverse
   *  pas deux tables — d'où une vérification applicative sous verrou. Une
   *  demande PENDING, elle, ne s'y oppose pas : elle ne verrouille rien. */
  AVAILABILITY_BLOCK_CONFLICT: "AVAILABILITY_BLOCK_CONFLICT",
  /** D47 (C1) — 404 INDISTINCT « dans MA salle ». */
  VISIT_AVAILABILITY_NOT_FOUND: "VISIT_AVAILABILITY_NOT_FOUND",
  /** D47 (C1) — 409 : deux plages de visite du MÊME jour se chevauchent.
   *  Refusé parce que C2 découpera ces plages en créneaux : deux plages qui se
   *  recouvrent produiraient le même créneau deux fois. */
  VISIT_AVAILABILITY_OVERLAP: "VISIT_AVAILABILITY_OVERLAP",
  /** D65 (A13) — 400 : un id de style absent du référentiel. Comme pour les
   *  équipements, on refuse AVANT l'écriture plutôt que de laisser remonter une
   *  violation de clé étrangère en 500. */
  VENUE_STYLE_NOT_FOUND: "VENUE_STYLE_NOT_FOUND",
  /** D61 (C3) — 409 : ce créneau n'EXISTE pas. Hors de toute plage active,
   *  plage suspendue, créneau déjà passé (filtré à la MINUTE), ou date au-delà
   *  de l'horizon de 18 mois. Distinct de VISIT_SLOT_TAKEN : « il n'y a rien à
   *  cette heure-là » et « quelqu'un vient de le prendre » demandent deux
   *  phrases différentes au client. */
  VISIT_SLOT_UNAVAILABLE: "VISIT_SLOT_UNAVAILABLE",
  /** D59/D61 (C3) — 409 : le créneau est DÉJÀ PRIS. Ce code ne peut sortir que
   *  de la traduction du `P2002` de `visit_bookings_no_double_confirmed` :
   *  l'exclusivité appartient à la base, jamais à une vérification applicative
   *  qui laisserait une fenêtre entre le test et l'insertion. */
  VISIT_SLOT_TAKEN: "VISIT_SLOT_TAKEN",
  /** D62 (C3) — 409 : ce client a déjà un rendez-vous CONFIRMÉ à venir dans
   *  CETTE salle. Garde anti-nuisance née de D59 : sous la tolérance au
   *  chevauchement, réserver seize créneaux ne gênait personne ; sous
   *  l'exclusivité, cela tue la journée du pro. Une autre salle, ou un
   *  rendez-vous déjà passé, ne bloquent rien. */
  VISIT_ALREADY_BOOKED: "VISIT_ALREADY_BOOKED",
  /** D62 (C3) — 404 INDISTINCT « parmi MES rendez-vous » : id malformé,
   *  inexistant, ou rendez-vous d'un autre client. */
  VISIT_BOOKING_NOT_FOUND: "VISIT_BOOKING_NOT_FOUND",
  /** D62 (C3) — 409 : on n'annule pas un rendez-vous déjà passé. « Le client a
   *  annulé » et « le client n'est pas venu » ne sont pas le même fait, et
   *  écraser l'un par l'autre trompe le pro. */
  VISIT_BOOKING_PAST: "VISIT_BOOKING_PAST",
  /** Lot `availableOn` — 400 : la date d'annotation demandée est DÉJÀ PASSÉE à
   *  Alger. ⚠ ÉCART ASSUMÉ AVEC D49, et c'est la seule raison qui le justifie :
   *  D49 écrête au lieu de rejeter parce qu'elle borne une FENÊTRE, et une
   *  fenêtre qui rétrécit reste une réponse à la question posée. `availableOn`
   *  est un POINT : l'écrêter à aujourd'hui répondrait sur un AUTRE jour que
   *  celui demandé, en silence, et la grille grisée mentirait. Le sélecteur ne
   *  propose aucune date passée — ce refus ne peut donc venir que d'un lien
   *  forgé, d'un appel direct à l'API, ou d'un défaut : tous méritent de le
   *  savoir. Reste intermittent au voisinage de minuit à Alger, et c'est
   *  ACCEPTÉ : la veille au soir, la réponse honnête est « cette date est
   *  passée ». */
  AVAILABLE_ON_PAST: "AVAILABLE_ON_PAST",

  /** La date demandée dépasse l'horizon de réservation (D227).
   *
   *  ⚠ CODE DISTINCT DE `AVAILABLE_ON_PAST`, ET C'EST TOUT LE POINT. Les
   *  deux refus sont métier, mais ils n'appellent pas la même action :
   *  « cette date est passée » dit de regarder DEVANT, « nous n'ouvrons pas
   *  encore si loin » dit de se RAPPROCHER. Un code unique aurait forcé
   *  l'écran à en choisir un — faux une fois sur deux.
   *
   *  Même motif que `AVAILABLE_ON_PAST` sur le fond : `availableOn` est un
   *  POINT, et un point hors bornes se REFUSE au lieu de s'écrêter (D213).
   *  L'horizon est `BOOKING_HORIZON_MONTHS`, le même que celui qui refuse
   *  une demande de visite — pas une seconde valeur à faire diverger. */
  AVAILABLE_ON_BEYOND_HORIZON: "AVAILABLE_ON_BEYOND_HORIZON"
} as const;
export type VenueErrorCode = (typeof VenueErrorCode)[keyof typeof VenueErrorCode];

/**
 * Vue PRO d'une salle (Lot A2) — contrat de POST /venues, PATCH /venues/:id,
 * GET /pro/venues[/:id]. Champs volontairement ABSENTS, à jamais :
 * commissionRateBps et cashbackRateBps (admin — « jamais exposé au pro »),
 * rejectionReason (phase 12), deletedAt (une salle supprimée est un 404),
 * ownerId (implicite : ce sont « mes » salles).
 */
export interface VenueProDTO {
  id: string;
  /** Figé à la création, généré serveur depuis nameFr. */
  slug: string;
  cityId: string;
  nameFr: string;
  nameAr: string;
  taglineFr: string | null;
  taglineAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  districtFr: string | null;
  districtAr: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** D36 (A9) : plus de minimum — « jusqu'à N invités ». */
  capacityMax: number;
  /** Centimes de DZD (invariant : argent en entiers). */
  basePriceCents: number;
  bookingMode: BookingMode;
  /** D81 (E1a) — politique d'acompte de la salle. EXACTEMENT un des deux est
   *  non nul. Le pro la règle lui-même, contrairement à commission/cashback qui
   *  restent admin : c'est SON argent d'avance, pas la marge de la plateforme. */
  depositRateBps: number | null;
  depositAmountCents: number | null;
  /** Lecture seule pour le pro — la publication est un acte admin (A3). */
  publicationStatus: VenuePublicationStatus;
  /** D33 — libre-service via PATCH. */
  status: VenueAvailabilityStatus;
  /** A3-① : ids d'équipements, triés — remplacés en bloc via PATCH amenityIds. */
  amenityIds: string[];
  /** D65 (A13) — ids de styles, triés ; remplacés en bloc via PATCH styleIds. */
  styleIds: string[];
  /** D66 (A13) — `null` : la salle ne l'a pas encore déclaré. */
  ceremonyType: CeremonyType | null;
  /** Lot A4 — photos triées par sortOrder (l'ordre du tableau = l'affichage). */
  photos: VenuePhotoDTO[];
  /** D46 (B1) — créneaux de fête, triés par heure de début puis id. Ils
   *  arrivent ICI comme les photos : aucun GET dédié, un seul aller-retour
   *  pour peupler l'écran d'édition. */
  slotTemplates: SlotTemplateDTO[];
  /** D45 (A6a) — identifiant du modèle Matterport, `null` si la salle n'a pas
   *  de scan. Même valeur canonique que le DTO public : le pro saisit une URL
   *  de partage ou un ID brut, le serveur ne stocke que l'ID. */
  matterportModelId: string | null;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lot A4 — Médias (photos). Le tour 360° multi-scènes de D34 a été remplacé
// par un simple identifiant Matterport au Lot A6a (D45) : plus de scènes, plus
// de liaisons, plus de contrat Pannellum côté types.
// ─────────────────────────────────────────────────────────────────────────────

/** Photo d'une salle, vue PRO (A6a) — contrat des endpoints /venues/:id/photos. */
export interface VenuePhotoDTO {
  id: string;
  /** URL publique de la variante large (webp ≤ 1920) — recalculée à la lecture
   *  depuis la clé de stockage (port A0), jamais figée en base. */
  url: string;
  /** URL publique de la vignette (webp ≤ 480) — grilles, couverture. */
  thumbUrl: string;
  /** Dimensions du large — A8 : next/image, anti-CLS (Core Web Vitals). */
  width: number;
  height: number;
  sortOrder: number;
  altFr: string | null;
  altAr: string | null;
  /** ISO 8601. */
  createdAt: string;
}

/** Photo publique (galerie A8) : l'ordre du tableau EST l'ordre d'affichage.
 *  altFr/altAr absents ⇒ A8 retombe sur le nom de la salle (WCAG AA — semé
 *  ici, codé en A8). */
export interface VenuePublicPhotoDTO {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  altFr: string | null;
  altAr: string | null;
}

/** PATCH /venues/:id/photos/:photoId — métadonnées seulement (alt FR/AR),
 *  `null` = effacement explicite (patron A2). */
export const venuePhotoAltUpdateSchema = z
  .object({
    altFr: optionalText(300, "venue.validation.altTooLong").nullable().optional(),
    altAr: optionalText(300, "venue.validation.altTooLong").nullable().optional()
  })
  .strict("venue.validation.unknownKey")
  .refine((v) => Object.keys(v).length > 0, { message: "venue.validation.emptyUpdate" });
export type VenuePhotoAltUpdateInput = z.infer<typeof venuePhotoAltUpdateSchema>;

/** PATCH /venues/:id/photos/order — ENSEMBLE ordonné COMPLET (arbitrage A4-③) :
 *  transaction unique, 400 PHOTO_ORDER_MISMATCH si l'ensemble ne correspond
 *  pas exactement au stocké. Un sortOrder par-photo pourrait produire deux
 *  photos au même rang en concurrence — l'ensemble atomique l'interdit par
 *  construction. Les doublons sont refusés dès la validation. */
export const venuePhotoOrderSchema = z
  .object({
    photoIds: z
      .array(z.string().uuid("venue.validation.photoIdInvalid"), {
        required_error: "venue.validation.orderRequired",
        invalid_type_error: "venue.validation.orderRequired"
      })
      .min(1, "venue.validation.orderEmpty")
      .max(VENUE_MEDIA_CAPS.photosPerVenue, "venue.validation.orderTooMany")
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    if (new Set(v.photoIds).size !== v.photoIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["photoIds"], message: "venue.validation.orderDuplicate" });
    }
  });
export type VenuePhotoOrderInput = z.infer<typeof venuePhotoOrderSchema>;

/** D45 — un ID de modèle Matterport tel qu'il apparaît dans le paramètre `m`
 *  d'une URL de partage. Format seulement : aucune vérification d'existence
 *  côté Matterport (pas de dépendance réseau sur un chemin d'écriture). */
export const MATTERPORT_ID_PATTERN = /^[A-Za-z0-9]{6,24}$/;

/**
 * Normalise la saisie du pro en ID canonique. Trois retours DISTINCTS, jamais
 * confondus par l'appelant :
 *   - `""`   → désactivation explicite (matterportModelId = null)
 *   - `null` → saisie invalide (400 INVALID_MATTERPORT_LINK)
 *   - autre  → ID canonique à stocker
 * Accepte l'ID brut ET l'URL de partage complète : le pro copiera presque
 * toujours l'URL depuis son tableau de bord Matterport.
 */
export function parseMatterportInput(raw: string): string | null {
  const input = raw.trim();
  if (input.length === 0) return "";

  // ⚠ PAS de `new URL()` ici : ce paquet compile avec lib ES2022 SEULE (ni DOM,
  // ni @types/node — cf. packages/config/tsconfig/base.json), le global n'existe
  // donc pas à la compilation. Découpage manuel, volontairement littéral.
  const asUrl = /^https?:\/\/([^/?#]+)/i.exec(input);
  if (asUrl) {
    // Authority → hôte seul : on retire un éventuel userinfo (`user@host`, le
    // classique https://my.matterport.com@evil.dz) puis le port.
    const authority = asUrl[1] ?? "";
    const host = authority
      .replace(/^[^@]*@/, "")
      .replace(/:\d+$/, "")
      .toLowerCase();
    // Suffixe strict : `matterport.com.autre.dz` ne passe pas (un `includes`
    // l'aurait laissé passer).
    if (host !== "matterport.com" && !host.endsWith(".matterport.com")) return null;

    const param = /[?&]m=([^&#]*)/.exec(input);
    if (!param) return null;
    // Pas de decodeURIComponent : il peut LEVER sur un `%` orphelin, et le
    // format visé est strictement alphanumérique — toute séquence encodée
    // échoue de toute façon au motif. Le rejet est donc déjà le bon.
    return MATTERPORT_ID_PATTERN.test(param[1] ?? "") ? (param[1] ?? null) : null;
  }

  // Tout autre schéma (mailto:, javascript:, ftp:…) est REFUSÉ, jamais retenté
  // comme un identifiant brut.
  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return null;

  return MATTERPORT_ID_PATTERN.test(input) ? input : null;
}

/** PATCH /venues/:id/virtual-tour (D45). Le schéma Zod ne juge QUE la forme
 *  « chaîne bornée » : la validation de fond est parseMatterportInput, côté
 *  service, pour que le code d'erreur soit INVALID_MATTERPORT_LINK et non un
 *  400 de validation générique. Chaîne vide = désactivation, donc pas de
 *  `.min(1)` ici. */
export const venueVirtualTourUpdateSchema = z
  .object({
    matterportInput: z
      .string({
        required_error: "venue.validation.matterportRequired",
        invalid_type_error: "venue.validation.matterportRequired"
      })
      .max(500, "venue.validation.matterportTooLong")
  })
  .strict("venue.validation.unknownKey");
export type VenueVirtualTourUpdateInput = z.infer<typeof venueVirtualTourUpdateSchema>;

/** Réponse de PATCH /venues/:id/virtual-tour — sous-ensemble du DTO pro. */
export interface VenueVirtualTourDTO {
  matterportModelId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lot A3 — Publication & lecture publique.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /admin/venues/:id/commission-rate (D35 : le chemin garde son nom, il
 * porte les DEUX taux — Ko les règle ensemble, salle par salle). Partiel réel :
 * un seul taux fourni ⇒ l'autre est lu en base pour la contrainte croisée,
 * validée côté service (CASHBACK_EXCEEDS_COMMISSION) EN PLUS du CHECK SQL.
 */
export const venueRatesUpdateSchema = z
  .object({
    commissionRateBps: z
      .number({ invalid_type_error: "venue.validation.rateInteger" })
      .int("venue.validation.rateInteger")
      .min(100, "venue.validation.commissionRange")
      .max(500, "venue.validation.commissionRange")
      .optional(),
    cashbackRateBps: z
      .number({ invalid_type_error: "venue.validation.rateInteger" })
      .int("venue.validation.rateInteger")
      .min(0, "venue.validation.cashbackRange")
      .max(500, "venue.validation.cashbackRange")
      .optional()
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    // Pré-détection Zod quand les DEUX sont fournis ; le cas « un seul » se
    // juge au service, contre la valeur stockée.
    if (v.commissionRateBps !== undefined && v.cashbackRateBps !== undefined && v.cashbackRateBps > v.commissionRateBps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cashbackRateBps"],
        message: "venue.validation.cashbackExceedsCommission"
      });
    }
  })
  .refine((v) => Object.keys(v).length > 0, { message: "venue.validation.emptyUpdate" });
export type VenueRatesUpdateInput = z.infer<typeof venueRatesUpdateSchema>;

export const VENUE_LIST_SORTS = ["recent", "price_asc", "price_desc"] as const;
export type VenueListSort = (typeof VENUE_LIST_SORTS)[number];

/* ════════ Flux A, Lot A13 — styles & type de cérémonie (D65, D66) ═══════════ */

/** D65 — un style tel que le référentiel le publie. Même forme qu'`AmenityDTO` :
 *  la `key` est ce que les filtres transportent, les libellés ne servent qu'à
 *  l'affichage. Pas d'`icon` : le design rend les styles en PUCES de texte, et
 *  un champ que personne ne lit finit par mentir. */
export interface VenueStyleDTO {
  id: string;
  key: string;
  nameFr: string;
  nameAr: string;
  sortOrder: number;
}

/** D66 — les trois valeurs, en minuscules dans l'URL (`?ceremonyType=outdoor`)
 *  comme le reste des paramètres de recherche, converties côté service. */
export const CEREMONY_TYPE_FILTERS = ["indoor", "outdoor", "mixed"] as const;
export type CeremonyTypeFilter = (typeof CEREMONY_TYPE_FILTERS)[number];

/** Filtre → valeurs de base RETENUES. Une seule table pour la règle, sinon
 *  l'API et l'écran finiraient par ne plus dire la même chose.
 *
 *  ⚠ ASYMÉTRIE VOULUE : « je veux l'extérieur » accepte une salle MIXTE (elle
 *  propose l'extérieur), mais « je veux mixte » n'accepte QUE mixte — là, la
 *  demande porte sur les deux possibilités à la fois. Filtrer par égalité
 *  cacherait toutes les salles mixtes à qui cherche un mariage en extérieur :
 *  exactement la mauvaise réponse. */
export const CEREMONY_TYPE_MATCHES: Record<CeremonyTypeFilter, CeremonyType[]> = {
  indoor: [CeremonyType.INDOOR, CeremonyType.MIXED],
  outdoor: [CeremonyType.OUTDOOR, CeremonyType.MIXED],
  mixed: [CeremonyType.MIXED]
};

/**
 * Querystring de GET /venues (liste publique). VOLONTAIREMENT non-strict :
 * les clés inconnues (utm_*, fbclid…) sont ignorées, jamais un 400 — une URL
 * marketing ne doit pas casser. Les valeurs, elles, sont validées (coercion
 * string → number sur les champs numériques d'une querystring).
 * Sémantique des filtres : une VALEUR inconnue (cityId ou clé d'amenity
 * absents du référentiel) donne un résultat vide, pas une erreur.
 */
export const venueListQuerySchema = z
  .object({
    cityId: z.string().uuid("venue.validation.cityInvalid").optional(),
    /** D36 (A9) : nombre d'invités ⇒ guests ≤ capacityMax, rien d'autre. */
    guests: z.coerce
      .number({ invalid_type_error: "venue.validation.guestsInvalid" })
      .int("venue.validation.guestsInvalid")
      .min(1, "venue.validation.guestsInvalid")
      .max(10_000, "venue.validation.guestsInvalid")
      .optional(),
    minPriceCents: z.coerce
      .number({ invalid_type_error: "venue.validation.priceFilterInvalid" })
      .int("venue.validation.priceFilterInvalid")
      .min(0, "venue.validation.priceFilterInvalid")
      .optional(),
    maxPriceCents: z.coerce
      .number({ invalid_type_error: "venue.validation.priceFilterInvalid" })
      .int("venue.validation.priceFilterInvalid")
      .min(0, "venue.validation.priceFilterInvalid")
      .optional(),
    /** D68 (A13) — plafond de capacité de la SALLE, en regard de `guests` qui en
     *  est le plancher. Deux noms pour deux rôles : `guests` dit « j'ai tant
     *  d'invités » (donc capacityMax ≥ guests, D36 inchangé), `maxCapacity` dit
     *  « pas plus grand que ça » — une fête de 80 personnes dans une salle de
     *  800 sonne vide et coûte plus cher. */
    maxCapacity: z.coerce
      .number({ invalid_type_error: "venue.validation.guestsInvalid" })
      .int("venue.validation.guestsInvalid")
      .min(1, "venue.validation.guestsInvalid")
      .max(10_000, "venue.validation.guestsInvalid")
      .optional(),
    /** D65 — clés de styles séparées par des virgules, sémantique **OU**. */
    styles: z
      .string()
      .regex(/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/, "venue.validation.stylesFilterInvalid")
      .optional(),
    /** D66 — filtre INCLUSIF, voir CEREMONY_TYPE_MATCHES. */
    ceremonyType: z
      .enum(CEREMONY_TYPE_FILTERS, { errorMap: () => ({ message: "venue.validation.ceremonyTypeInvalid" }) })
      .optional(),
    /** Lot `availableOn` — date civile d'Alger `YYYY-MM-DD`. ANNOTE la page,
     *  ne la filtre pas : voir `VenueSummaryDTO.availableOnDate`.
     *
     *  ⚠ Ce schéma ne refuse ICI que ce qui est DÉTERMINISTE — la forme et la
     *  date irréelle (`2026-02-31` a la bonne forme et n'existe pas). Le passé
     *  dépend de l'instant de la requête et de l'horloge d'Alger : il est
     *  refusé par le SERVICE, seul détenteur de `Date.now()`
     *  (`AVAILABLE_ON_PAST`). Le mettre ici forcerait Zod à lire une horloge et
     *  rendrait ce schéma non déterministe pour tous ses autres appelants. */
    availableOn: z.string().refine(isRealCivilDate, "venue.validation.dateFormat").optional(),
    /** Clés d'amenities séparées par des virgules — sémantique ET (toutes). */
    amenities: z
      .string()
      .regex(/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/, "venue.validation.amenitiesFilterInvalid")
      .optional(),
    sort: z.enum(VENUE_LIST_SORTS, { errorMap: () => ({ message: "venue.validation.sortInvalid" }) }).default("recent"),
    page: z.coerce.number({ invalid_type_error: "venue.validation.pageInvalid" }).int("venue.validation.pageInvalid").min(1, "venue.validation.pageInvalid").default(1),
    pageSize: z.coerce
      .number({ invalid_type_error: "venue.validation.pageSizeRange" })
      .int("venue.validation.pageSizeRange")
      .min(1, "venue.validation.pageSizeRange")
      .max(50, "venue.validation.pageSizeRange")
      .default(12)
  })
  .superRefine((v, ctx) => {
    if (v.minPriceCents !== undefined && v.maxPriceCents !== undefined && v.minPriceCents > v.maxPriceCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxPriceCents"], message: "venue.validation.priceRangeInvalid" });
    }
    // D68 — deux poignées d'un même curseur : la basse ne peut pas dépasser la
    // haute. Une plage inversée ne rend rien ET n'a rien à afficher.
    if (v.guests !== undefined && v.maxCapacity !== undefined && v.guests > v.maxCapacity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxCapacity"], message: "venue.validation.capacityRangeInvalid" });
    }
  });
export type VenueListQueryInput = z.infer<typeof venueListQuerySchema>;

/** Enveloppe de pagination offset (A3-⑤) — page/pageSize, défaut 12, max 50. */
export interface VenueListResponse {
  items: VenueSummaryDTO[];
  total: number;
  page: number;
  pageSize: number;
  /** Lot `availableOn` — ÉCHO de la date annotée, `null` si la question n'a pas
   *  été posée. Même raison que les bornes effectives de D49 : sans écho,
   *  l'appelant devrait PRÉSUMER que la réponse porte sur la date qu'il croit
   *  avoir envoyée. C'est aussi lui qui désambiguïse les deux `null` de
   *  `availableOnDate` — question non posée, ou salle sans créneau actif. */
  availableOn: string | null;
}

/**
 * Vue ADMIN (Lot A3) = vue pro + les deux taux D35 — la SEULE surface de
 * l'API où ces taux existent. rejectionReason reste exclu (phase 12).
 */
export interface VenueAdminDTO extends VenueProDTO {
  /** Points de base (250 = 2,50 %), borné 100–500 (CHECK SQL). */
  commissionRateBps: number;
  /** Points de base, borné 0–commissionRateBps (CHECK SQL, D35). */
  cashbackRateBps: number;
}

export interface VenuePublicCityDTO {
  id: string;
  nameFr: string;
  nameAr: string;
}

/**
 * Détail public d'une salle (GET /venues/:slug, Lot A3). JAMAIS de taux ici ;
 * publicationStatus omis (toujours PUBLISHED par construction) ; `status`
 * présent pour le bandeau « indisponible » d'A8 (D33 : ACTIVE ou
 * TEMPORARILY_UNAVAILABLE — HIDDEN est un 404, même en accès direct).
 */
export interface VenuePublicDTO {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  taglineFr: string | null;
  taglineAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  districtFr: string | null;
  districtAr: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** D36 (A9) : plus de minimum — « jusqu'à N invités ». */
  capacityMax: number;
  /** Centimes de DZD (invariant : argent en entiers). */
  basePriceCents: number;
  bookingMode: BookingMode;
  /** D81 (E1a) — exposée AVANT la demande, et pas seulement au récapitulatif :
   *  l'acompte est la première question que se pose un client, et la découvrir
   *  à la dernière étape est la meilleure façon de le faire abandonner. */
  depositRateBps: number | null;
  depositAmountCents: number | null;
  status: VenueAvailabilityStatus;
  city: VenuePublicCityDTO;
  /** Référentiel complet (clé stable + libellés + icône), trié par nameFr. */
  amenities: AmenityDTO[];
  /** D65 (A13) — styles de la salle, triés par `sortOrder` (ordre éditorial). */
  styles: VenueStyleDTO[];
  /** D66 (A13) — `null` : la salle ne l'a pas encore déclaré. */
  ceremonyType: CeremonyType | null;
  /** Lot A4 — galerie (ordre du tableau = sortOrder ; couverture = 1ʳᵉ). */
  photos: VenuePublicPhotoDTO[];
  /** D45 (A6a) — identifiant du modèle Matterport, `null` si la salle n'a pas
   *  de scan. A8 monte l'iframe AU GESTE UTILISATEUR, jamais automatiquement
   *  (tiers, coût réseau — cible Android bas de gamme, backlog 24.6). */
  matterportModelId: string | null;
  /** E2d — catalogue de prestations, ACTIVES seulement, triées par `sortOrder`.
   *
   *  Le pro voit aussi les retirées ; le public, jamais : une prestation qu'on
   *  ne peut plus commander n'a rien à faire sur une fiche.
   *
   *  Exposé sur le DÉTAIL et non sur la liste : un catalogue n'aide pas à
   *  choisir entre deux salles dans une grille, et l'y charger alourdirait
   *  chaque carte pour rien (cible Android bas de gamme). */
  services: ServiceDTO[];
}

/* ══════════════════════════ Lot B3 — disponibilité ═══════════════════════════
 * D48 (fuseau) · D49 (bornes) · D50 (contrat public) · D51 (blocages pro)
 */

/** D48 — l'Algérie est à UTC+1 toute l'année : aucune heure d'été depuis 1981.
 *  Cette constante est le SEUL endroit du dépôt où ce fait est écrit. Le fuseau
 *  se décide à la frontière HTTP et nulle part ailleurs — ni colonne, ni
 *  variable d'environnement : un fuseau configurable est un fuseau qui finit
 *  faux, et les moteurs (disponibilité, prix) restent purs en ne manipulant que
 *  des instants. */
export const ALGERIA_UTC_OFFSET_MINUTES = 60;

/** D46 — on ne réserve pas au-delà de 18 mois. Constante partagée, jamais une
 *  colonne : c'est une règle commerciale unique, pas un réglage par salle. */
export const BOOKING_HORIZON_MONTHS = 18;



/** Nombre maximal de jours RENDUS par une fenêtre, bornes incluses. 92 est le
 *  plus long trimestre civil (juillet + août + septembre), soit exactement le
 *  trois-mois qu'un calendrier affiche d'un coup. */
export const AVAILABILITY_MAX_WINDOW_DAYS = 92;

/** État d'un créneau à une date donnée. BLOCKED prime sur tout (le pro a fermé),
 *  BOOKED sur REQUESTED (une demande ne verrouille rien). */
export const SLOT_AVAILABILITY_STATUSES = ["AVAILABLE", "REQUESTED", "BOOKED", "BLOCKED"] as const;
export type SlotAvailabilityStatus = (typeof SLOT_AVAILABILITY_STATUSES)[number];

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CIVIL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** `2026-02-31` passe la regex et n'existe pas : une expression régulière ne
 *  valide pas un calendrier. On valide par ALLER-RETOUR — la date reconstruite
 *  doit rendre les mêmes composantes. */
export function isRealCivilDate(value: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** D51 — date-heure civile LOCALE, sans décalage. Accepter un ISO offsetté
 *  laisserait un navigateur étranger créer un blocage aux mauvaises heures
 *  d'Alger, ce que D48 interdit précisément. */
export function isRealCivilDateTime(value: string): boolean {
  if (!CIVIL_DATETIME_PATTERN.test(value)) return false;
  if (!isRealCivilDate(value.slice(0, 10))) return false;
  return Number(value.slice(11, 13)) <= 23 && Number(value.slice(14, 16)) <= 59;
}

/** Fenêtre [from, to], bornes INCLUSES. Partagée par la disponibilité publique
 *  et la liste pro des blocages : une seconde règle de fenêtre serait une
 *  seconde chose à faire diverger.
 *
 *  D49 — ce schéma ne refuse QUE ce qui est déterministe : forme, date
 *  irréelle, ordre, largeur. Le passé et l'horizon, eux, dépendent de l'instant
 *  de la requête et sont ÉCRÊTÉS côté service, jamais rejetés : un navigateur
 *  au Canada ne calcule pas le même « aujourd'hui » qu'Alger, et un 400 sur
 *  cette frontière serait intermittent et incompréhensible. */
export const availabilityWindowQuerySchema = z
  .object({
    from: z.string().refine(isRealCivilDate, "venue.validation.dateFormat"),
    to: z.string().refine(isRealCivilDate, "venue.validation.dateFormat")
  })
  .strict()
  .superRefine((value, ctx) => {
    const from = Date.parse(`${value.from}T00:00:00Z`);
    const to = Date.parse(`${value.to}T00:00:00Z`);
    if (to < from) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "venue.validation.dateRange" });
      return;
    }
    if ((to - from) / 86_400_000 + 1 > AVAILABILITY_MAX_WINDOW_DAYS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "venue.validation.windowTooWide" });
    }
  });
export type AvailabilityWindowQueryInput = z.infer<typeof availabilityWindowQuerySchema>;

/** D50 — métadonnées d'un créneau, servies UNE fois par réponse. Les répéter
 *  dans chacun des 92 jours multiplierait la charge utile sans rien apprendre. */
export interface VenueAvailabilitySlotDTO {
  id: string;
  nameFr: string;
  nameAr: string;
  startMinutes: number;
  /** Peut dépasser 1440 : franchir minuit est le cas NORMAL (20h → 02h = 1560). */
  endMinutes: number;
}

/** D50 — pas de `ruleId` : le moteur le produit pour l'UI pro de B4, mais un
 *  identifiant de règle n'apprend rien à un client et exposerait la cardinalité
 *  de la grille tarifaire du pro. */
export interface VenueAvailabilityDaySlotDTO {
  slotTemplateId: string;
  status: SlotAvailabilityStatus;
  priceCents: number;
}

export interface VenueAvailabilityDayDTO {
  /** Date CIVILE locale, `YYYY-MM-DD`. */
  date: string;
  isHoliday: boolean;
  /** Même cardinalité et même ordre que `slots`, et répète quand même
   *  `slotTemplateId` : le contrat reste auto-descriptif, donc immunisé contre
   *  un bug d'ordre côté client. */
  slots: VenueAvailabilityDaySlotDTO[];
}

export interface VenueAvailabilityResponse {
  venueId: string;
  slug: string;
  bookingMode: BookingMode;
  /** D49 — bornes EFFECTIVES après écrêtage, jamais celles demandées. */
  from: string;
  to: string;
  /** Créneaux ACTIFS de la salle, triés comme partout ailleurs (heure, puis id). */
  slots: VenueAvailabilitySlotDTO[];
  days: VenueAvailabilityDayDTO[];
}

/** D51 — SYMÉTRIE : le pro relit exactement le repère civil local qu'il a
 *  écrit. Renvoyer de l'UTC forcerait le front pro à reconvertir, donc à
 *  héberger une seconde décision de fuseau. `createdAt` fait exception : c'est
 *  une métadonnée d'audit, pas une heure d'événement. */
export interface AvailabilityBlockDTO {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdAt: string;
}

export const availabilityBlockCreateSchema = z
  .object({
    startsAt: z.string().refine(isRealCivilDateTime, "venue.validation.dateFormat"),
    endsAt: z.string().refine(isRealCivilDateTime, "venue.validation.dateFormat"),
    reason: optionalText(300, "venue.validation.reasonTooLong").nullish()
  })
  .strict()
  .superRefine((value, ctx) => {
    // Format à largeur fixe : la comparaison lexicographique est exacte, et
    // évite de reconvertir en instants pour un simple test d'ordre.
    if (value.endsAt <= value.startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "venue.validation.blockEndBeforeStart" });
    }
  });
export type AvailabilityBlockCreateInput = z.infer<typeof availabilityBlockCreateSchema>;

/** D57 — l'Algérie utilise EXCLUSIVEMENT le format 24 h. Pas d'AM/PM, nulle
 *  part : ni dans un écran, ni dans un e-mail, ni dans un SMS.
 *
 *  Cette fonction est le SEUL formateur d'heure murale de la plateforme.
 *  `Intl.DateTimeFormat` est écarté ici : selon la locale et le moteur, il
 *  bascule en AM/PM sans prévenir (`en-US` le fait, et un navigateur configuré
 *  en anglais est courant). Une concaténation ne peut pas dériver.
 *
 *  ⚠ `<input type="time">` reste rendu par le NAVIGATEUR, dans SA locale : un
 *  navigateur en anglais y affichera un sélecteur AM/PM, et rien en HTML ne
 *  permet de l'en empêcher. La valeur transmise, elle, est toujours `HH:mm` sur
 *  24 h — le contrat est donc sauf, seul le widget natif varie. Tout affichage
 *  d'heure fait par NOUS passe par ici.
 *
 *  Accepte des minutes absolues pouvant dépasser 1440 (créneau franchissant
 *  minuit, D52) et rend l'heure MURALE correspondante : 1560 → "02:00". */
export function formatWallClock(minutes: number): string {
  const wall = ((Math.trunc(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wall / 60);
  const m = wall % 60;
  return `${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`;
}

/** Plage horaire d'un créneau en 24 h. Le séparateur est un tiret demi-cadratin
 *  entouré d'espaces insécables : en RTL, un tiret nu se réordonne
 *  visuellement et « 20:00–02:00 » se lit à l'envers. */
export function formatSlotRange(startMinutes: number, endMinutes: number): string {
  return `${formatWallClock(startMinutes)}\u00a0–\u00a0${formatWallClock(endMinutes)}`;
}


/* ═══════════════════════ Flux C — Visites (D47) ══════════════════════════════
 * Les visites ne sont PAS des réservations de fête et ne partagent AUCUNE
 * structure avec elles : ni `SlotTemplate`, ni `PricingRule`, ni contrainte
 * d'exclusion. Un pro déclare ici QUAND il fait visiter, pas ce qu'il vend.
 */

/** Plage HEBDOMADAIRE de visite : « le dimanche de 09:00 à 17:00 ». Elle se
 *  répète chaque semaine — ce n'est pas une date.
 *
 *  ⚠ `endMinutes` est plafonné à 1440 par le CHECK
 *  `visit_availabilities_minutes_valid`, contrairement aux créneaux de fête
 *  (2880, D52). Ce n'est pas un oubli : une visite est un rendez-vous de
 *  journée ou de soirée — 18:00→21:00 est le cas réel le plus tardif —, jamais
 *  une nuit à cheval sur deux jours. Le schéma fait autorité (D55). */
export interface VisitAvailabilityDTO {
  id: string;
  /** 0 = dimanche … 6 = samedi (D56, numérotation JS et contrat API). */
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  createdAt: string;
}

const visitWindowShape = {
  dayOfWeek: z.number().int().min(0, "venue.validation.visitDayInvalid").max(6, "venue.validation.visitDayInvalid"),
  startMinutes: z
    .number()
    .int()
    .min(0, "venue.validation.visitOutOfDay")
    .max(1439, "venue.validation.visitOutOfDay"),
  endMinutes: z.number().int().min(1, "venue.validation.visitOutOfDay").max(1440, "venue.validation.visitOutOfDay")
};

/** Une plage doit se terminer APRÈS son début, et dans la même journée. */
const endsAfterStart = (value: { startMinutes?: number; endMinutes?: number }, ctx: z.RefinementCtx): void => {
  if (
    value.startMinutes !== undefined &&
    value.endMinutes !== undefined &&
    value.endMinutes <= value.startMinutes
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endMinutes"], message: "venue.validation.slotEndBeforeStart" });
  }
};

export const visitAvailabilityCreateSchema = z.object(visitWindowShape).strict().superRefine(endsAfterStart);
export type VisitAvailabilityCreateInput = z.infer<typeof visitAvailabilityCreateSchema>;

/** PATCH partiel `.strict()`, même patron que les créneaux de fête.
 *  `isActive: false` = plage SUSPENDUE sans la perdre : un pro qui arrête les
 *  visites du vendredi pendant le ramadan la réactivera après. */
export const visitAvailabilityUpdateSchema = z
  .object({ ...visitWindowShape, isActive: z.boolean() })
  .partial()
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: "venue.validation.emptyUpdate" });
    }
    endsAfterStart(value, ctx);
  });
export type VisitAvailabilityUpdateInput = z.infer<typeof visitAvailabilityUpdateSchema>;


/** D58 — une visite dure 30 minutes, pour TOUTE la plateforme.
 *
 *  Constante partagée, jamais une colonne : une durée par salle donnerait à
 *  chaque pro un réglage de plus à comprendre pour un gain nul, et rendrait
 *  incomparables les créneaux de deux salles voisines. Si un jour la durée doit
 *  varier, elle variera ici pour tout le monde — et ce sera une décision
 *  produit, pas un champ de formulaire.
 *
 *  Conséquence directe du découpage : une plage ne rend que des créneaux
 *  ENTIERS. Une plage 09:00→09:20 ne produit AUCUN créneau, elle n'en produit
 *  pas un de 20 minutes. */
export const VISIT_DURATION_MINUTES = 30;

/** Créneau de visite CONCRET, à une date donnée — contrairement à
 *  `VisitAvailabilityDTO` qui décrit une règle hebdomadaire. */
export interface VisitSlotDTO {
  /** Date civile locale `YYYY-MM-DD`. */
  date: string;
  /** Minutes depuis minuit, début du rendez-vous. */
  startMinutes: number;
  /** D59 (supersède D47) — un créneau pris est EXCLUSIF : personne d'autre ne
   *  peut le prendre. Il reste RENDU, marqué `taken`, plutôt que retiré de la
   *  liste : voir qu'un horaire est occupé aide à en choisir un autre, alors
   *  qu'une liste qui se contracte silencieusement donne l'impression que la
   *  salle ne fait pas de visites ce jour-là.
   *  Garanti en base par l'index unique partiel
   *  `visit_bookings_no_double_confirmed`, pas seulement par le service. */
  taken: boolean;
}

export interface VenueVisitSlotsResponse {
  venueId: string;
  slug: string;
  /** Bornes EFFECTIVES après écrêtage (D49), jamais celles demandées. */
  from: string;
  to: string;
  durationMinutes: number;
  slots: VisitSlotDTO[];
}


/** D60 — le pro choisit ses canaux de notification. DEUX drapeaux et non un
 *  enum { EMAIL, SMS, BOTH } : un enum explose dès le troisième canal
 *  (EMAIL_PUSH, SMS_PUSH, EMAIL_SMS_PUSH…), deux drapeaux se combinent.
 *
 *  Le transport SMS est **WhatsApp** : c'est ce que les pros algériens
 *  utilisent réellement pour leur activité, pas le SMS opérateur. Le numéro
 *  destinataire est `ProProfile.phone`, déjà normalisé en +213.
 *
 *  ⚠ Tout couper est INTERDIT (`CHECK pro_profiles_one_channel_required`) : un
 *  pro sans canal ne verrait plus jamais une demande de visite arriver. */
export interface ProNotificationChannelsDTO {
  notifyByEmail: boolean;
  notifyBySms: boolean;
}

/* ── Lot C3b — les rendez-vous vus par le PRO ────────────────────────────────
 *
 *  ⚠ D70 — la fenêtre de lecture des rendez-vous n'est PAS écrêtée au présent,
 *  contrairement à celle des disponibilités (D49). Une disponibilité passée
 *  n'est rien ; un rendez-vous passé est une information — qui est venu, qui ne
 *  s'est pas présenté. Écrêter effacerait l'historique du pro à chaque requête.
 *  Le schéma de fenêtre (`availabilityWindowQuerySchema`) est réutilisé tel quel
 *  pour la forme et la largeur maximale ; c'est l'ÉCRÊTAGE qui ne s'applique
 *  pas, pas la validation. */

/** Rendez-vous vu par le pro. Il porte le CONTACT du client — c'est toute la
 *  raison d'être de cette lecture : rappeler avant la visite, ou prévenir en
 *  cas d'empêchement. Le téléphone peut manquer (D61 le rend facultatif) ;
 *  l'e-mail, jamais. */
export interface ProVisitBookingDTO {
  id: string;
  /** Repère civil d'Alger `YYYY-MM-DD`, redérivé de `scheduledAt` (symétrie
   *  D51). `string` et non un type dédié : `packages/types` n'en expose pas —
   *  la forme est garantie par `isRealCivilDate` à la frontière. */
  date: string;
  startMinutes: number;
  scheduledAt: string;
  status: VisitStatus;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientEmail: string;
  contactPhone: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export const proNotificationChannelsSchema = z
  .object({ notifyByEmail: z.boolean(), notifyBySms: z.boolean() })
  .strict()
  .refine((v) => v.notifyByEmail || v.notifyBySms, {
    path: ["notifyByEmail"],
    message: "account.validation.oneChannelRequired"
  });
export type ProNotificationChannelsInput = z.infer<typeof proNotificationChannelsSchema>;


/* ═════════════ Flux C, Lot C3 — prise de rendez-vous (D61, D62) ══════════════ */

/** D61 — le client renvoie le créneau qu'il a CHOISI, dans le repère où il l'a
 *  reçu : une date civile et des minutes depuis minuit. **Jamais un instant
 *  ISO** — accepter un horodatage offsetté laisserait le navigateur choisir le
 *  fuseau, ce que D48 interdit précisément ; la conversion en instant se fait
 *  côté serveur, une seule fois, avec le décalage d'Alger et lui seul.
 *
 *  `phone` est OPTIONNEL (décision de Ko) : exiger un numéro à l'étape du
 *  rendez-vous coûterait des rendez-vous, et le pro dispose toujours de
 *  l'e-mail du client. Le numéro du PRO, lui, est structurellement obligatoire
 *  — c'est le destinataire WhatsApp de D60.
 *
 *  ⚠ `startMinutes` est borné à la JOURNÉE (0–1439), pas à « 1440 − 30 » : ce
 *  schéma dit seulement « une minute réelle du jour ». Savoir si un créneau
 *  EXISTE appartient au découpage des plages (`computeVisitSlots`), et une
 *  borne ne se valide jamais deux fois (D55). */
export const visitBookingCreateSchema = z
  .object({
    date: z.string().refine(isRealCivilDate, "venue.validation.dateFormat"),
    startMinutes: z
      .number()
      .int()
      .min(0, "venue.validation.visitOutOfDay")
      .max(1439, "venue.validation.visitOutOfDay"),
    phone: dzPhoneSchema.optional()
  })
  .strict();
export type VisitBookingCreateInput = z.infer<typeof visitBookingCreateSchema>;

/** Rendez-vous de visite tel que le client le relit.
 *
 *  ⚠ Pas de `durationMinutes` : `VISIT_DURATION_MINUTES` est une constante
 *  partagée que le front importe (D58). La répéter sur chaque ligne serait une
 *  occasion de divergence pour une valeur que la plateforme connaît déjà.
 *
 *  `date` et `startMinutes` sont REDÉRIVÉS de `scheduledAt` par l'arithmétique
 *  civile du serveur (symétrie D51) : le client relit exactement le repère
 *  qu'il a envoyé, et n'héberge aucune seconde décision de fuseau. */
export interface VisitBookingDTO {
  id: string;
  venueId: string;
  venueSlug: string;
  venueNameFr: string;
  venueNameAr: string;
  /** Date civile locale `YYYY-MM-DD`. */
  date: string;
  startMinutes: number;
  /** Instant absolu, pour tout tri ou comparaison — jamais pour l'affichage. */
  scheduledAt: string;
  status: VisitStatus;
  /** D61 — SNAPSHOT du contact au moment du rendez-vous. `null` quand ni le
   *  corps ni le profil ne portaient de numéro. */
  contactPhone: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
