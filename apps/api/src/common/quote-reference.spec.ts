import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` — même raison que `phone.spec.ts` et `contact.spec.ts` : `packages/types` n'a pas de lanceur de tests,
// et un test qui ne tourne pas est pire que pas de test.
import { QUOTE_DOCUMENT_LOCALES, formatQuoteReference, quoteDocumentFilename } from "@zwadj/types";

// ══ Rang 39 (D333, L35-3) — LA RÉFÉRENCE D'UN DEVIS ET LE NOM DE SON FICHIER : UNE formule, que le serveur et l'écran partagent ═════════════════════════
// R3 (ratifiée par Ko le 11/10/2026) : « Les deux numéros ont 4 chiffres au moins, plus au-delà de 9 999. — Référence (application et PDF) :
// `DEVIS-2026-0001-0089 v1`. Fichier : `DEVIS-2026-0001-0089_fr_v1.pdf`. » Les exemples de R3 sont l'AUTORITÉ de ce fichier ; le reste se dérive.

describe("formatQuoteReference — la forme de R3", () => {
  it("⛔ l'exemple de R3 : année 2026, salle 1, devis 89, version 1 ⇒ `DEVIS-2026-0001-0089 v1`", () => {
    expect(formatQuoteReference({ year: 2026, venueNumber: 1, quoteNumber: 89, version: 1 })).toBe("DEVIS-2026-0001-0089 v1");
  });

  it("⛔ la salle et le devis ne se confondent pas : deux valeurs DIFFÉRENTES (une fixture symétrique cacherait une interversion)", () => {
    expect(formatQuoteReference({ year: 2027, venueNumber: 7, quoteNumber: 12, version: 3 })).toBe("DEVIS-2027-0007-0012 v3");
    expect(formatQuoteReference({ year: 2027, venueNumber: 12, quoteNumber: 7, version: 3 })).toBe("DEVIS-2027-0012-0007 v3");
  });

  it.each([
    [1, "0001"],
    [9, "0009"],
    [10, "0010"],
    [999, "0999"],
    [9_999, "9999"],
    [10_000, "10000"],
    [123_456, "123456"]
  ])("⛔ quatre chiffres AU MOINS, jamais de troncature : %i ⇒ %s (pour la salle ET pour le devis)", (n, attendu) => {
    expect(formatQuoteReference({ year: 2026, venueNumber: n, quoteNumber: 1, version: 1 })).toBe(`DEVIS-2026-${attendu}-0001 v1`);
    expect(formatQuoteReference({ year: 2026, venueNumber: 1, quoteNumber: n, version: 1 })).toBe(`DEVIS-2026-0001-${attendu} v1`);
  });

  it("⚠ la version s'écrit telle quelle, sans remplissage : `v1`, `v2`, `v12`", () => {
    for (const version of [1, 2, 12]) {
      expect(formatQuoteReference({ year: 2026, venueNumber: 1, quoteNumber: 89, version })).toBe(`DEVIS-2026-0001-0089 v${version}`);
    }
  });

  it("⛔ une révision garde l'année et les deux numéros : SEULE la version change", () => {
    const base = { year: 2026, venueNumber: 3, quoteNumber: 14 };
    const [v1, v2] = [1, 2].map((version) => formatQuoteReference({ ...base, version }));
    expect(v1!.replace(/ v1$/, "")).toBe(v2!.replace(/ v2$/, ""));
    expect(v1).not.toBe(v2);
  });

  it.each([
    ["NaN", Number.NaN],
    ["zéro", 0],
    ["négatif", -1],
    ["décimal", 1.5],
    ["infini", Number.POSITIVE_INFINITY]
  ])("⛔ une référence FAUSSE ne s'imprime pas : %s LÈVE, pour chacune des quatre parties", (_nom, valeur) => {
    const bonnes = { year: 2026, venueNumber: 1, quoteNumber: 89, version: 1 };
    for (const partie of ["venueNumber", "quoteNumber", "version"] as const) {
      expect(() => formatQuoteReference({ ...bonnes, [partie]: valeur }), partie).toThrow(RangeError);
    }
    expect(() => formatQuoteReference({ ...bonnes, year: valeur })).toThrow(RangeError);
  });

  it("⛔ une année hors de la plage de la base (2000 à 9999) LÈVE aussi — la base la refuserait par son `CHECK`", () => {
    const bonnes = { venueNumber: 1, quoteNumber: 89, version: 1 };
    expect(() => formatQuoteReference({ ...bonnes, year: 1999 })).toThrow(RangeError);
    expect(() => formatQuoteReference({ ...bonnes, year: 10_000 })).toThrow(RangeError);
    expect(formatQuoteReference({ ...bonnes, year: 2000 })).toBe("DEVIS-2000-0001-0089 v1");
    expect(formatQuoteReference({ ...bonnes, year: 9999 })).toBe("DEVIS-9999-0001-0089 v1");
  });
});

describe("quoteDocumentFilename — K-7 : le nom du fichier SE DÉRIVE de la référence", () => {
  it("⛔ l'exemple de R3 : `DEVIS-2026-0001-0089_fr_v1.pdf`, et `_ar_` pour l'arabe", () => {
    const devis = { reference: "DEVIS-2026-0001-0089 v1" };
    expect(quoteDocumentFilename(devis, "fr")).toBe("DEVIS-2026-0001-0089_fr_v1.pdf");
    expect(quoteDocumentFilename(devis, "ar")).toBe("DEVIS-2026-0001-0089_ar_v1.pdf");
  });

  it("⛔ pour CHAQUE langue de l'autorité (`QUOTE_DOCUMENT_LOCALES`) et chaque version : base de la référence + langue + version, construits SANS la fonction testée", () => {
    for (const locale of QUOTE_DOCUMENT_LOCALES) {
      for (const version of [1, 2, 12]) {
        const reference = formatQuoteReference({ year: 2026, venueNumber: 3, quoteNumber: 14, version });
        const [base, v] = reference.split(" ");
        expect(quoteDocumentFilename({ reference }, locale)).toBe(`${base}_${locale}_${v}.pdf`);
      }
    }
  });

  it("⚠ la langue et la version ne se confondent pas dans le nom : `_fr_v2` ≠ `_ar_v2` ≠ `_fr_v1`", () => {
    const noms = new Set<string>();
    for (const locale of QUOTE_DOCUMENT_LOCALES) {
      for (const version of [1, 2]) noms.add(quoteDocumentFilename({ reference: formatQuoteReference({ year: 2026, venueNumber: 1, quoteNumber: 1, version }) }, locale));
    }
    expect(noms.size).toBe(QUOTE_DOCUMENT_LOCALES.length * 2);
  });

  it("⚠ aucun caractère à risque dans un nom de fichier : lettres latines, chiffres, `-`, `_` et le point de l'extension", () => {
    for (const locale of QUOTE_DOCUMENT_LOCALES) {
      expect(quoteDocumentFilename({ reference: "DEVIS-2026-0001-0089 v1" }, locale)).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });

  it.each([
    ["l'ancienne forme (huit caractères de l'identifiant)", "01a10f0a-v2"],
    ["une chaîne vide", ""],
    ["sans version", "DEVIS-2026-0001-0089"],
    ["moins de quatre chiffres", "DEVIS-2026-1-89 v1"],
    ["un nom de fichier injecté", "DEVIS-2026-0001-0089 v1/../../x"]
  ])("⛔ une chaîne qui n'est pas une référence LÈVE, elle ne devient pas un nom de fichier : %s", (_nom, reference) => {
    expect(() => quoteDocumentFilename({ reference }, "fr")).toThrow(TypeError);
  });
});
