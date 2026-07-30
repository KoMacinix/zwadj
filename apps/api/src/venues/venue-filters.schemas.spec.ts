// Schéma des filtres de recherche — Flux A, Lot A13 (D65, D66, D68).
//
// Ce qui se joue ici : les messages sont des CLÉS i18n (contrat des fronts), et
// la table CEREMONY_TYPE_MATCHES est la règle UNIQUE du filtre inclusif. Si
// quelqu'un la « simplifie » en égalité, ces tests tombent avant l'écran.
import { describe, expect, it } from "vitest";
import { CEREMONY_TYPE_MATCHES, venueListQuerySchema } from "@zwadj/types";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  return result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);
}

describe("venueListQuerySchema — bornes de capacité (D68)", () => {
  it("les deux poignées coexistent : 20 → 500 est accepté", () => {
    const parsed = venueListQuerySchema.safeParse({ guests: "20", maxCapacity: "500" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guests).toBe(20);
      expect(parsed.data.maxCapacity).toBe(500);
    }
  });

  it("une plage INVERSÉE est refusée : elle ne rend rien et n'a rien à afficher", () => {
    expect(messages(venueListQuerySchema.safeParse({ guests: "500", maxCapacity: "20" }))).toContain(
      "venue.validation.capacityRangeInvalid"
    );
  });

  it("les deux bornes ÉGALES passent — « exactement 200 places » est une demande réelle", () => {
    expect(venueListQuerySchema.safeParse({ guests: "200", maxCapacity: "200" }).success).toBe(true);
  });

  it("une seule poignée reste valide : l'autre borne est simplement absente", () => {
    expect(venueListQuerySchema.safeParse({ guests: "20" }).success).toBe(true);
    expect(venueListQuerySchema.safeParse({ maxCapacity: "500" }).success).toBe(true);
  });
});

describe("venueListQuerySchema — styles et type de cérémonie (D65, D66)", () => {
  it("plusieurs clés séparées par des virgules", () => {
    const parsed = venueListQuerySchema.safeParse({ styles: "jardin,bord-de-mer" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.styles).toBe("jardin,bord-de-mer");
  });

  it("une clé mal formée est refusée (espace, majuscule, virgule pendante)", () => {
    for (const styles of ["Jardin", "jardin, bord-de-mer", "jardin,", ",jardin"]) {
      expect(messages(venueListQuerySchema.safeParse({ styles }))).toContain("venue.validation.stylesFilterInvalid");
    }
  });

  it("le type de cérémonie n'accepte QUE les trois valeurs, en minuscules", () => {
    for (const value of ["indoor", "outdoor", "mixed"]) {
      expect(venueListQuerySchema.safeParse({ ceremonyType: value }).success).toBe(true);
    }
    expect(messages(venueListQuerySchema.safeParse({ ceremonyType: "INDOOR" }))).toContain(
      "venue.validation.ceremonyTypeInvalid"
    );
  });
});

describe("CEREMONY_TYPE_MATCHES — l'asymétrie est la règle (D66)", () => {
  it("« intérieur » et « extérieur » acceptent MIXED, « mixte » n'accepte que MIXED", () => {
    expect(CEREMONY_TYPE_MATCHES.indoor).toEqual(["INDOOR", "MIXED"]);
    expect(CEREMONY_TYPE_MATCHES.outdoor).toEqual(["OUTDOOR", "MIXED"]);
    expect(CEREMONY_TYPE_MATCHES.mixed).toEqual(["MIXED"]);
  });

  it("aucun filtre ne se réduit à une égalité — sinon les salles mixtes disparaîtraient", () => {
    expect(CEREMONY_TYPE_MATCHES.indoor).toContain("MIXED");
    expect(CEREMONY_TYPE_MATCHES.outdoor).toContain("MIXED");
  });
});
