// Tests du pipeline images (Lot A0). Les fixtures sont GÉNÉRÉES par sharp au
// vol (aucun binaire commité) ; les limites testées sont les VRAIES limites
// partagées de @zwadj/types — pas de version relâchée pour les tests.
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { VENUE_PHOTO_LIMITS } from "@zwadj/types";
import { MediaValidationError, processVenuePhoto } from "./image-pipeline";

async function image(width: number, height: number, format: "jpeg" | "png" = "jpeg"): Promise<Buffer> {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 120, g: 130, b: 140 } } });
  return format === "jpeg" ? base.jpeg({ quality: 70 }).toBuffer() : base.png().toBuffer();
}

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "AUCUNE_ERREUR";
  } catch (e) {
    return e instanceof MediaValidationError ? e.code : `AUTRE:${String(e)}`;
  }
}

let photo: Buffer; // 1600×1200, au-dessus des minima

beforeAll(async () => {
  photo = await image(1600, 1200);
});

describe("processVenuePhoto", () => {
  it("photo valide : deux variantes webp, dimensions plafonnées sans agrandissement", async () => {
    const out = await processVenuePhoto(photo);
    // 1600 < 1920 : la grande n'est PAS agrandie.
    expect([out.large.width, out.large.height]).toEqual([1600, 1200]);
    expect(out.large.contentType).toBe("image/webp");
    // Vignette bornée par le grand côté.
    expect(out.thumb.width).toBe(VENUE_PHOTO_LIMITS.variants.thumb.maxEdge);
    expect(out.thumb.height).toBe(360);
    // Sortie réellement webp (sniffée, pas déclarée).
    expect((await sharp(out.large.buffer).metadata()).format).toBe("webp");
  });

  it("au-delà du plafond : la grande redescend à 1920 de large", async () => {
    const wide = await image(2400, 1600);
    const out = await processVenuePhoto(wide);
    expect(out.large.width).toBe(VENUE_PHOTO_LIMITS.variants.large.maxEdge);
    expect(out.large.height).toBe(1280); // ratio conservé
  });

  it("refus : trop petite (MEDIA_TOO_SMALL), y compris sur UNE seule dimension", async () => {
    expect(await code(processVenuePhoto(await image(1600, 400)))).toBe("MEDIA_TOO_SMALL");
  });

  it("refus : contenu illisible comme image (MEDIA_UNSUPPORTED_FORMAT)", async () => {
    expect(await code(processVenuePhoto(Buffer.from("pas une image du tout")))).toBe("MEDIA_UNSUPPORTED_FORMAT");
  });

  it("refus : au-delà de la borne d'octets, AVANT tout décodage (MEDIA_TOO_LARGE)", async () => {
    expect(await code(processVenuePhoto(Buffer.alloc(VENUE_PHOTO_LIMITS.maxBytes + 1)))).toBe("MEDIA_TOO_LARGE");
  });

  // Récupéré du describe 360° retiré en A6a (D45) : la garantie « entrée PNG,
  // sortie webp quand même » est propre au PIPELINE, pas au type d'image.
  it("PNG accepté en entrée, sortie webp quand même", async () => {
    const out = await processVenuePhoto(await image(1600, 1200, "png"));
    expect((await sharp(out.large.buffer).metadata()).format).toBe("webp");
  });
});
