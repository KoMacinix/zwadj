import { z } from "zod";
import { BookingMode, VenueAvailabilityStatus, type VenuePublicationStatus } from "./enums";
import { VENUE_MEDIA_CAPS } from "./media";
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
  publicationStatus: VenuePublicationStatus;
  /** Lot A4 — règle verrouillée : couverture = PREMIÈRE photo par sortOrder
   *  (thumb 480). Sert les cartes A7, les OG tags (9.9) et schema.org (23.8) ;
   *  le réordonnancement des photos fait donc office de sélecteur de
   *  couverture. `null` : salle sans photo. */
  coverThumbUrl: string | null;
  /** Lot A4 — signal « complétude » (le tri recommandé du 23.8 le consommera). */
  photoCount: number;
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
    amenityIds: z.array(z.string().uuid("venue.validation.amenityInvalid")).max(50, "venue.validation.amenitiesTooMany").optional()
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    // Paire lat/lng : fournis ensemble, effacés ensemble.
    const latGiven = v.lat !== undefined;
    const lngGiven = v.lng !== undefined;
    if (latGiven !== lngGiven || (latGiven && lngGiven && (v.lat === null) !== (v.lng === null))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lng"], message: "venue.validation.coordsPair" });
    }
  })
  .refine((v) => Object.keys(v).length > 0, { message: "venue.validation.emptyUpdate" });
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;

/** Codes d'erreur métier venues (stables, consommés par les fronts). */
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
  SCENE_NOT_FOUND: "SCENE_NOT_FOUND",
  LINK_NOT_FOUND: "LINK_NOT_FOUND",
  /** Lot A4 — réordonnancement : l'ensemble envoyé ≠ l'ensemble stocké
   *  (photo supprimée dans un autre onglet…). Côté A6a : « rafraîchissez puis
   *  réessayez », jamais un échec muet. */
  PHOTO_ORDER_MISMATCH: "PHOTO_ORDER_MISMATCH",
  /** Lot A4 — la paire (A,B) existe déjà, y compris inversée (B,A) — index
   *  unique LEAST/GREATEST (renfort D34 n°3). */
  LINK_ALREADY_EXISTS: "LINK_ALREADY_EXISTS"
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
  /** Lecture seule pour le pro — la publication est un acte admin (A3). */
  publicationStatus: VenuePublicationStatus;
  /** D33 — libre-service via PATCH. */
  status: VenueAvailabilityStatus;
  /** A3-① : ids d'équipements, triés — remplacés en bloc via PATCH amenityIds. */
  amenityIds: string[];
  /** Lot A4 — photos triées par sortOrder (l'ordre du tableau = l'affichage). */
  photos: VenuePhotoDTO[];
  /** Lot A4 — scènes du tour, triées par (createdAt, id), AVEC vignettes
   *  (bande de scènes A6b — le public n'en reçoit pas, arbitrage A4-①). */
  photos360: VenuePhoto360SceneDTO[];
  /** Lot A4 — liaisons du tour (éditeur A6b). */
  links360: VenuePhoto360LinkDTO[];
  /** Lot A4 — même contrat que le public : aperçu Pannellum direct en A6b,
   *  la règle de scène d'ouverture n'est JAMAIS réimplémentée côté front. */
  viewer360: Viewer360Data | null;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lot A4 — Médias (photos + tour 360° multi-scènes, D34).
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

/** Scène 360°, vue PRO (A6a/A6b). thumbUrl vit ICI et pas dans Viewer360Data :
 *  Pannellum ne consomme pas de vignette de scène — le payload public reste
 *  lean (cible Android bas de gamme, backlog 24.6). Promotion future côté
 *  public = un ajout d'une ligne, la colonne existe. */
export interface VenuePhoto360SceneDTO {
  id: string;
  url: string;
  /** Bande de scènes de l'éditeur A6b (640×320). */
  thumbUrl: string;
  capturedAt: string | null;
  createdAt: string;
}

/** Liaison bidirectionnelle entre deux scènes (D34), vue PRO — la position du
 *  hotspot est propre à CHAQUE sens (les deux positions physiques diffèrent). */
export interface VenuePhoto360LinkDTO {
  id: string;
  photoAId: string;
  photoBId: string;
  /** Degrés — yaw ∈ [-180, 180], pitch ∈ [-90, 90] (coordonnées Pannellum,
   *  produites par mouseEventToCoords() dans l'éditeur A6b). */
  yawA: number;
  pitchA: number;
  yawB: number;
  pitchB: number;
}

/** Contrat du composant <Viewer360 /> — strictement 1:1 Pannellum, STRICTEMENT
 *  piloté par les données (rien de codé en dur : un tour en boucle ou en
 *  chaîne n'est qu'un graphe de liaisons). Volontairement lean : pas de
 *  vignettes ici (arbitrage A4-①). */
export interface Viewer360Scene {
  id: string;
  url: string;
}
export interface Viewer360Link {
  photoAId: string;
  photoBId: string;
  yawA: number;
  pitchA: number;
  yawB: number;
  pitchB: number;
}
export interface Viewer360Data {
  /** Scène d'ouverture (D34) : la plus ancienne par (createdAt, id) — le
   *  tiebreak id rend le choix DÉTERMINISTE même sur créations groupées au
   *  même timestamp (même discipline que la pagination A3). */
  initialSceneId: string;
  scenes: Viewer360Scene[];
  links: Viewer360Link[];
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

const yawSchema = (requiredKey: string) =>
  z
    .number({ required_error: requiredKey, invalid_type_error: "venue.validation.hotspotRange" })
    .min(-180, "venue.validation.hotspotRange")
    .max(180, "venue.validation.hotspotRange");
const pitchSchema = (requiredKey: string) =>
  z
    .number({ required_error: requiredKey, invalid_type_error: "venue.validation.hotspotRange" })
    .min(-90, "venue.validation.hotspotRange")
    .max(90, "venue.validation.hotspotRange");

/** POST /venues/:id/photo-360-links — une liaison bidirectionnelle (D34), les
 *  DEUX positions de hotspot exigées d'emblée (l'éditeur A6b fait
 *  clic-pour-placer sur chaque sens avant d'envoyer). */
export const venue360LinkCreateSchema = z
  .object({
    photoAId: z
      .string({ required_error: "venue.validation.linkPhotosRequired" })
      .uuid("venue.validation.photoIdInvalid"),
    photoBId: z
      .string({ required_error: "venue.validation.linkPhotosRequired" })
      .uuid("venue.validation.photoIdInvalid"),
    yawA: yawSchema("venue.validation.hotspotRequired"),
    pitchA: pitchSchema("venue.validation.hotspotRequired"),
    yawB: yawSchema("venue.validation.hotspotRequired"),
    pitchB: pitchSchema("venue.validation.hotspotRequired")
  })
  .strict("venue.validation.unknownKey")
  .superRefine((v, ctx) => {
    if (v.photoAId === v.photoBId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["photoBId"], message: "venue.validation.linkSamePhoto" });
    }
  });
export type Venue360LinkCreateInput = z.infer<typeof venue360LinkCreateSchema>;

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
  });
export type VenueListQueryInput = z.infer<typeof venueListQuerySchema>;

/** Enveloppe de pagination offset (A3-⑤) — page/pageSize, défaut 12, max 50. */
export interface VenueListResponse {
  items: VenueSummaryDTO[];
  total: number;
  page: number;
  pageSize: number;
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
  status: VenueAvailabilityStatus;
  city: VenuePublicCityDTO;
  /** Référentiel complet (clé stable + libellés + icône), trié par nameFr. */
  amenities: AmenityDTO[];
  /** Lot A4 — galerie (ordre du tableau = sortOrder ; couverture = 1ʳᵉ). */
  photos: VenuePublicPhotoDTO[];
  /** Lot A4 — tour 360° lié (D34), `null` si la salle n'a aucune scène.
   *  Chargé au geste utilisateur côté A8, jamais automatiquement. */
  viewer360: Viewer360Data | null;
}
