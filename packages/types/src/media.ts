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
