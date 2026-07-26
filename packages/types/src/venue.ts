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
  MATTERPORT_ALREADY_LINKED: "MATTERPORT_ALREADY_LINKED"
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
  /** D45 (A6a) — identifiant du modèle Matterport, `null` si la salle n'a pas
   *  de scan. A8 monte l'iframe AU GESTE UTILISATEUR, jamais automatiquement
   *  (tiers, coût réseau — cible Android bas de gamme, backlog 24.6). */
  matterportModelId: string | null;
}
