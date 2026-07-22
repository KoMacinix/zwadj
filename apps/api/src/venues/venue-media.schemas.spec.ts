// Spec des schémas Zod médias (Lot A4) — messages = CLÉS i18n (contrat des
// fronts), refus structurels : doublons d'ordre, auto-liaison, bornes des
// hotspots (yaw ±180, pitch ±90), corps vide, clés inconnues (.strict).
import { describe, expect, it } from "vitest";
import { venue360LinkCreateSchema, venuePhotoAltUpdateSchema, venuePhotoOrderSchema } from "@zwadj/types";

const ID_A = "018f0000-0000-7000-8000-000000000001";
const ID_B = "018f0000-0000-7000-8000-000000000002";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  return result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);
}

describe("venuePhotoAltUpdateSchema", () => {
  it("null = effacement explicite ; corps vide refusé (emptyUpdate) ; clé inconnue → unknownKey", () => {
    expect(venuePhotoAltUpdateSchema.safeParse({ altFr: null }).success).toBe(true);
    expect(messages(venuePhotoAltUpdateSchema.safeParse({}))).toContain("venue.validation.emptyUpdate");
    expect(messages(venuePhotoAltUpdateSchema.safeParse({ sortOrder: 3 }))).toContain("venue.validation.unknownKey");
  });

  it("301 caractères → altTooLong ; 300 passe", () => {
    expect(messages(venuePhotoAltUpdateSchema.safeParse({ altFr: "a".repeat(301) }))).toContain(
      "venue.validation.altTooLong"
    );
    expect(venuePhotoAltUpdateSchema.safeParse({ altAr: "أ".repeat(300) }).success).toBe(true);
  });
});

describe("venuePhotoOrderSchema — ensemble complet (A4-③)", () => {
  it("doublon → orderDuplicate ; liste vide → orderEmpty ; uuid malformé → photoIdInvalid", () => {
    expect(messages(venuePhotoOrderSchema.safeParse({ photoIds: [ID_A, ID_A] }))).toContain(
      "venue.validation.orderDuplicate"
    );
    expect(messages(venuePhotoOrderSchema.safeParse({ photoIds: [] }))).toContain("venue.validation.orderEmpty");
    expect(messages(venuePhotoOrderSchema.safeParse({ photoIds: ["pas-un-uuid"] }))).toContain(
      "venue.validation.photoIdInvalid"
    );
  });

  it("31 éléments (> plafond photos) → orderTooMany", () => {
    const ids = Array.from({ length: 31 }, (_, i) => `018f0000-0000-7000-8000-${String(i).padStart(12, "0")}`);
    expect(messages(venuePhotoOrderSchema.safeParse({ photoIds: ids }))).toContain("venue.validation.orderTooMany");
  });
});

describe("venue360LinkCreateSchema — D34", () => {
  const valid = { photoAId: ID_A, photoBId: ID_B, yawA: -180, pitchA: 90, yawB: 179.5, pitchB: -89.9 };

  it("liaison valide aux bornes exactes ; auto-liaison (A = B) → linkSamePhoto", () => {
    expect(venue360LinkCreateSchema.safeParse(valid).success).toBe(true);
    expect(messages(venue360LinkCreateSchema.safeParse({ ...valid, photoBId: ID_A }))).toContain(
      "venue.validation.linkSamePhoto"
    );
  });

  it("hors bornes (yaw 180.1, pitch -91) → hotspotRange ; hotspot manquant → hotspotRequired", () => {
    expect(messages(venue360LinkCreateSchema.safeParse({ ...valid, yawB: 180.1 }))).toContain(
      "venue.validation.hotspotRange"
    );
    expect(messages(venue360LinkCreateSchema.safeParse({ ...valid, pitchA: -91 }))).toContain(
      "venue.validation.hotspotRange"
    );
    const sansPitchB: Partial<typeof valid> = { ...valid };
    delete sansPitchB.pitchB;
    expect(messages(venue360LinkCreateSchema.safeParse(sansPitchB))).toContain("venue.validation.hotspotRequired");
  });
});
