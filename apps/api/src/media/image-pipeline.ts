// Pipeline images du Flux A (Lot A0) — fonctions PURES, sans Nest : testées
// unitairement, consommées par les endpoints d'upload au Lot A4.
//
// Deux garanties non négociables (invariant AGENTS.md) :
//   1. le format est établi par SNIFFING sharp — jamais par le Content-Type
//      déclaré ni l'extension du nom de fichier utilisateur ;
//   2. la sortie est TOUJOURS ré-encodée (webp) : les métadonnées EXIF —
//      position GPS du domicile d'un pro incluse — ne survivent JAMAIS.
import sharp, { type Metadata, type OutputInfo } from "sharp";
import { ACCEPTED_IMAGE_FORMATS, VENUE_PHOTO_LIMITS, type MediaErrorCode } from "@zwadj/types";

/** Sous-ensemble VALIDATION du MediaErrorCode partagé (A4-⑤) — dérivé par
 *  Extract : impossible de dériver du référentiel sans erreur de compilation. */
export type MediaValidationCode = Extract<
  MediaErrorCode,
  "MEDIA_UNSUPPORTED_FORMAT" | "MEDIA_TOO_LARGE" | "MEDIA_TOO_SMALL"
>;

/** Refus de validation : le Lot A4 le mappera sur un 400 avec code stable. */
export class MediaValidationError extends Error {
  constructor(
    readonly code: MediaValidationCode,
    message: string
  ) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: "image/webp";
  extension: "webp";
}

/** Toute image traitée sort en deux variantes : la grande + sa vignette. */
export interface ProcessedImagePair {
  large: ProcessedImage;
  thumb: ProcessedImage;
}

interface SniffedSource {
  /** Dimensions APRÈS application de l'orientation EXIF (5-8 ⇒ inversion). */
  width: number;
  height: number;
}

async function sniff(input: Buffer, maxBytes: number): Promise<SniffedSource> {
  // L'ordre compte : la borne d'octets d'abord (aucun octet confié à sharp
  // au-delà), le format ensuite, les dimensions en dernier.
  if (input.byteLength > maxBytes) {
    throw new MediaValidationError("MEDIA_TOO_LARGE", `Fichier de ${input.byteLength} octets > ${maxBytes}`);
  }
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new MediaValidationError("MEDIA_UNSUPPORTED_FORMAT", "Fichier illisible comme image");
  }
  if (!meta.format || !(ACCEPTED_IMAGE_FORMATS as readonly string[]).includes(meta.format)) {
    throw new MediaValidationError("MEDIA_UNSUPPORTED_FORMAT", `Format ${meta.format ?? "inconnu"} refusé`);
  }
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = (swapped ? meta.height : meta.width) ?? 0;
  const height = (swapped ? meta.width : meta.height) ?? 0;
  return { width, height };
}

function pack(result: { data: Buffer; info: OutputInfo }): ProcessedImage {
  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    contentType: "image/webp",
    extension: "webp"
  };
}

/** Photo classique → { large ≤ 1920, thumb ≤ 480 } (webp, EXIF évaporé). */
export async function processVenuePhoto(input: Buffer): Promise<ProcessedImagePair> {
  const { maxBytes, minWidth, minHeight, variants } = VENUE_PHOTO_LIMITS;
  const src = await sniff(input, maxBytes);
  if (src.width < minWidth || src.height < minHeight) {
    throw new MediaValidationError(
      "MEDIA_TOO_SMALL",
      `${src.width}×${src.height} < minimum ${minWidth}×${minHeight}`
    );
  }
  // .rotate() sans argument applique l'orientation EXIF puis la retire — la
  // photo servie est droite partout, y compris hors navigateurs.
  const large = pack(
    await sharp(input)
      .rotate()
      .resize({ width: variants.large.maxEdge, height: variants.large.maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: variants.large.quality })
      .toBuffer({ resolveWithObject: true })
  );
  const thumb = pack(
    await sharp(input)
      .rotate()
      .resize({ width: variants.thumb.maxEdge, height: variants.thumb.maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: variants.thumb.quality })
      .toBuffer({ resolveWithObject: true })
  );
  return { large, thumb };
}
