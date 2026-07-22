// Limites médias du Flux A (« limites médias proposées » approuvées à
// l'addendum) — PARTAGÉES : le pipeline API (Lot A0) les APPLIQUE, les
// endpoints (A4) les posent aussi au niveau Multer, les UI Pro (A6a/A6b) les
// réutilisent en pré-validation avant upload (confort, jamais une sécurité).
// Tailles en OCTETS, dimensions en PIXELS.

/** Formats acceptés EN ENTRÉE (vérifiés par sniffing sharp, jamais par le
 *  Content-Type déclaré ni l'extension du fichier utilisateur). La sortie du
 *  pipeline est TOUJOURS du webp ré-encodé. */
export const ACCEPTED_IMAGE_FORMATS = ["jpeg", "png", "webp"] as const;
export type AcceptedImageFormat = (typeof ACCEPTED_IMAGE_FORMATS)[number];

/** Types MIME correspondants — pour l'attribut `accept` des inputs (A6a). */
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Photos classiques d'une salle. */
export const VENUE_PHOTO_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10 Mo par fichier source
  minWidth: 800,
  minHeight: 600,
  /** Variantes produites (webp) : grande image plafonnée, vignette de grille. */
  variants: {
    large: { maxEdge: 1920, quality: 80 },
    thumb: { maxEdge: 480, quality: 75 }
  }
} as const;

/**
 * Plafonds PAR SALLE (arbitrage A4-⑥, jamais de non-plafonné) : l'upload est
 * un chemin authentifié mais abusable — ré-encodage sharp (CPU) + 2 objets
 * stockés par fichier, sur adapter disque local au MVP. Valeurs de DÉPART, à
 * caler par l'équipe terrain/SEO ; relever = changer une constante, jamais une
 * migration. Bonus : protège l'UX magazine (~5 photos) et garde le signal
 * « complétude » interprétable.
 */
export const VENUE_MEDIA_CAPS = {
  photosPerVenue: 30,
  scenes360PerVenue: 12
} as const;

/**
 * Codes d'erreur MÉDIA (namespace i18n media.errors.*) — codes PIPELINE
 * (format/taille/ratio) + plafonds, réutilisables hors du domaine salle.
 * Les codes RELATIONNELS (photo introuvable dans MA salle, ordre périmé…)
 * restent venue-scopés dans VenueErrorCode (arbitrage A4-⑤).
 */
export const MediaErrorCode = {
  /** Requête multipart sans fichier (ou champ mal nommé). */
  MEDIA_FILE_REQUIRED: "MEDIA_FILE_REQUIRED",
  MEDIA_UNSUPPORTED_FORMAT: "MEDIA_UNSUPPORTED_FORMAT",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  MEDIA_TOO_SMALL: "MEDIA_TOO_SMALL",
  MEDIA_BAD_ASPECT_RATIO: "MEDIA_BAD_ASPECT_RATIO",
  MEDIA_PHOTO_LIMIT_REACHED: "MEDIA_PHOTO_LIMIT_REACHED",
  MEDIA_SCENE_LIMIT_REACHED: "MEDIA_SCENE_LIMIT_REACHED"
} as const;
export type MediaErrorCode = (typeof MediaErrorCode)[keyof typeof MediaErrorCode];

/** Photos 360° équirectangulaires (scènes du tour). */
export const VENUE_PHOTO_360_LIMITS = {
  maxBytes: 25 * 1024 * 1024, // 25 Mo par fichier source
  minWidth: 2048,
  /** Ratio équirectangulaire largeur/hauteur exigé, avec tolérance relative
   *  (recadrages d'appareils à ±2 %). */
  aspectRatio: 2,
  aspectRatioTolerance: 0.02,
  /** Largeur plafond de la scène servie au viewer. */
  maxOutputWidth: 8192,
  quality: 80,
  /** Vignette 2:1 (cartes, listes de scènes de l'éditeur A6b). */
  thumb: { width: 640, height: 320, quality: 75 }
} as const;
