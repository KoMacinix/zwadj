// Spec unitaire de slugify (Lot A2) — fonction pure, cas réels du marché :
// accents FR, ligatures, noms saisis en arabe, ponctuation, longueur.
import { describe, expect, it } from "vitest";
import { SLUG_FALLBACK, SLUG_MAX_BASE_LENGTH, slugify } from "./slug";

describe("slugify", () => {
  it("cas nominal : minuscules + tirets", () => {
    expect(slugify("Salle El Ferdous")).toBe("salle-el-ferdous");
  });

  it("translittère les accents et ligatures françaises (é è ï ç œ æ)", () => {
    expect(slugify("Château Néïla & Cœur d'Æther")).toBe("chateau-neila-coeur-d-aether");
  });

  it("effondre ponctuation/espaces multiples et rogne les tirets de bord", () => {
    expect(slugify("  --Le   Grand,, Palais !!  ")).toBe("le-grand-palais");
  });

  it("nom saisi en arabe dans nameFr : repli stable (le service suffixera les collisions)", () => {
    expect(slugify("قاعة الأفراح")).toBe(SLUG_FALLBACK);
  });

  it("chiffres conservés", () => {
    expect(slugify("Salle 2000")).toBe("salle-2000");
  });

  it("casquette de longueur SANS tiret orphelin en fin", () => {
    const long = slugify(`${"a".repeat(SLUG_MAX_BASE_LENGTH - 1)} bcdef`);
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX_BASE_LENGTH);
    expect(long.endsWith("-")).toBe(false);
    expect(long).toBe("a".repeat(SLUG_MAX_BASE_LENGTH - 1));
  });
});
