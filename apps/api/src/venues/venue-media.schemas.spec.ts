// Spec des schémas Zod médias (Lot A4) — messages = CLÉS i18n (contrat des
// fronts), refus structurels : doublons d'ordre, corps vide, clés inconnues
// (.strict). Lot A6a (D45) : les liaisons/hotspots 360° ont disparu, remplacés
// par la normalisation d'une saisie Matterport (parseMatterportInput).
import { describe, expect, it } from "vitest";
import {
  parseMatterportInput,
  venuePhotoAltUpdateSchema,
  venuePhotoOrderSchema,
  venueVirtualTourUpdateSchema
} from "@zwadj/types";

const ID_A = "018f0000-0000-7000-8000-000000000001";

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

describe("venueVirtualTourUpdateSchema — D45", () => {
  it("chaîne vide ACCEPTÉE (c'est le signal de désactivation, pas une erreur)", () => {
    expect(venueVirtualTourUpdateSchema.safeParse({ matterportInput: "" }).success).toBe(true);
  });

  it("501 caractères → matterportTooLong ; clé inconnue → unknownKey ; champ absent → matterportRequired", () => {
    expect(messages(venueVirtualTourUpdateSchema.safeParse({ matterportInput: "a".repeat(501) }))).toContain(
      "venue.validation.matterportTooLong"
    );
    expect(messages(venueVirtualTourUpdateSchema.safeParse({ matterportModelId: "abc123" }))).toContain(
      "venue.validation.unknownKey"
    );
    expect(messages(venueVirtualTourUpdateSchema.safeParse({}))).toContain("venue.validation.matterportRequired");
  });

  // Le schéma ne juge QUE la forme « chaîne bornée » : un lien invalide passe
  // Zod et se fait refuser au service, avec le code INVALID_MATTERPORT_LINK.
  // Sans cette séparation, le pro recevrait un 400 de validation générique.
  it("un lien invalide passe le SCHÉMA — le fond se juge au service", () => {
    expect(venueVirtualTourUpdateSchema.safeParse({ matterportInput: "https://exemple.dz/x" }).success).toBe(true);
  });
});

describe("parseMatterportInput — D45", () => {
  const ID = "SxQL3iGyoDo";

  it("ID brut valide : rendu tel quel", () => {
    expect(parseMatterportInput(ID)).toBe(ID);
    expect(parseMatterportInput(`  ${ID}  `)).toBe(ID); // trim
  });

  it("URL de partage Matterport : l'ID est EXTRAIT du paramètre m", () => {
    expect(parseMatterportInput(`https://my.matterport.com/show/?m=${ID}`)).toBe(ID);
    // Sous-domaine quelconque, paramètres additionnels, casse de l'hôte.
    expect(parseMatterportInput(`https://MY.Matterport.COM/show/?m=${ID}&play=1`)).toBe(ID);
    expect(parseMatterportInput(`https://matterport.com/show/?m=${ID}`)).toBe(ID);
  });

  it("chaîne vide (ou blancs seuls) : signal de DÉSACTIVATION, distinct du rejet", () => {
    expect(parseMatterportInput("")).toBe("");
    expect(parseMatterportInput("   ")).toBe("");
  });

  it("rejets : domaine étranger, URL sans m, m malformé, schéma non http, garbage", () => {
    // Un domaine qui CONTIENT le mot mais n'est pas un sous-domaine : le test
    // doit porter sur le suffixe « .matterport.com », jamais sur includes().
    expect(parseMatterportInput(`https://matterport.com.attaquant.dz/show/?m=${ID}`)).toBeNull();
    expect(parseMatterportInput(`https://my.matterport.com.evil.dz/?m=${ID}`)).toBeNull();
    expect(parseMatterportInput(`https://exemple.dz/show/?m=${ID}`)).toBeNull();
    expect(parseMatterportInput("https://my.matterport.com/show/")).toBeNull();
    expect(parseMatterportInput("https://my.matterport.com/show/?m=trop-court!")).toBeNull();
    // `new URL()` accepte mailto:/javascript: — d'où le filtre de protocole.
    expect(parseMatterportInput(`mailto:${ID}`)).toBeNull();
    expect(parseMatterportInput(`javascript:alert(1)`)).toBeNull();
    expect(parseMatterportInput("pas un id du tout")).toBeNull();
  });

  it("bornes du format : 6 et 24 passent, 5 et 25 sont refusés", () => {
    expect(parseMatterportInput("a".repeat(6))).toBe("a".repeat(6));
    expect(parseMatterportInput("a".repeat(24))).toBe("a".repeat(24));
    expect(parseMatterportInput("a".repeat(5))).toBeNull();
    expect(parseMatterportInput("a".repeat(25))).toBeNull();
    // Même borne appliquée à l'ID extrait d'une URL, pas seulement à l'ID brut.
    expect(parseMatterportInput(`https://my.matterport.com/show/?m=${"a".repeat(25)}`)).toBeNull();
  });
});
