// Intégrité des DONNÉES de seed (Lot A1) — attrape les fautes de frappe et
// les dérives de périmètre avant même de toucher une base : comptes exacts
// décidés par Ko (58 wilayas / 23 villes / 23 équipements), unicité des clés
// naturelles, enveloppe GPS Algérie, liste d'amenities épinglée au cadrage.
import { describe, expect, it } from "vitest";
import { AMENITIES } from "./amenities";
import { CITIES } from "./cities";
import { WILAYAS } from "./wilayas";

describe("seed-data/wilayas", () => {
  it("exactement 58 wilayas, codes 1…58 sans trou ni doublon (décision réforme 2026 : 59–69 hors MVP)", () => {
    expect(WILAYAS).toHaveLength(58);
    const codes = WILAYAS.map((w) => w.code).sort((a, b) => a - b);
    expect(codes).toEqual(Array.from({ length: 58 }, (_, i) => i + 1));
  });

  it("libellés FR/AR tous renseignés, nameFr unique", () => {
    for (const w of WILAYAS) {
      expect(w.nameFr.trim().length, `wilaya ${w.code} : nameFr vide`).toBeGreaterThan(0);
      expect(w.nameAr.trim().length, `wilaya ${w.code} : nameAr vide`).toBeGreaterThan(0);
    }
    expect(new Set(WILAYAS.map((w) => w.nameFr)).size).toBe(WILAYAS.length);
  });
});

describe("seed-data/cities", () => {
  it("périmètre Lot A1 : exactement 23 communes, toutes rattachées à une wilaya seedée", () => {
    expect(CITIES).toHaveLength(23);
    const knownCodes = new Set(WILAYAS.map((w) => w.code));
    for (const c of CITIES) {
      expect(knownCodes.has(c.wilayaCode), `« ${c.nameFr} » : wilaya ${c.wilayaCode} absente du seed`).toBe(true);
    }
  });

  it("clé naturelle (wilayaCode, nameFr) unique — miroir de la contrainte city_natural_key", () => {
    const keys = CITIES.map((c) => `${c.wilayaCode}::${c.nameFr}`);
    expect(new Set(keys).size).toBe(CITIES.length);
  });

  it("GPS systématique et dans l'enveloppe Algérie (lat 18–38, lng −9–12)", () => {
    for (const c of CITIES) {
      expect(c.lat, `« ${c.nameFr} » : lat hors enveloppe`).toBeGreaterThanOrEqual(18);
      expect(c.lat, `« ${c.nameFr} » : lat hors enveloppe`).toBeLessThanOrEqual(38);
      expect(c.lng, `« ${c.nameFr} » : lng hors enveloppe`).toBeGreaterThanOrEqual(-9);
      expect(c.lng, `« ${c.nameFr} » : lng hors enveloppe`).toBeLessThanOrEqual(12);
    }
  });

  it("libellés FR/AR tous renseignés", () => {
    for (const c of CITIES) {
      expect(c.nameFr.trim().length).toBeGreaterThan(0);
      expect(c.nameAr.trim().length, `« ${c.nameFr} » : nameAr vide`).toBeGreaterThan(0);
    }
  });
});

describe("seed-data/amenities", () => {
  /** Liste VERROUILLÉE au cadrage Flux A — toute divergence d'amenities.ts
   *  avec elle doit être un acte conscient (mise à jour des deux côtés). */
  const LOCKED_KEYS = [
    "climatisation",
    "chauffage",
    "groupe-electrogene",
    "parking",
    "acces-pmr",
    "wifi",
    "traiteur-sur-place",
    "traiteur-externe-autorise",
    "cuisine-equipee",
    "chambre-froide",
    "vaisselle-mobilier",
    "espaces-separes",
    "salle-priere",
    "loge-mariee",
    "jardin",
    "espace-enfants",
    "hebergement",
    "sonorisation",
    "eclairage-scenique",
    "kosha",
    "ecran-projection",
    "securite",
    "decoration-incluse"
  ];

  it("exactement les 23 clés du cadrage, uniques, en kebab-case", () => {
    expect(AMENITIES).toHaveLength(23);
    const keys = AMENITIES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...LOCKED_KEYS].sort());
    for (const key of keys) {
      expect(key, `clé « ${key} » non kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("libellés FR/AR et icône lucide renseignés partout (kosha → sofa, arbitrage Lot A1)", () => {
    for (const a of AMENITIES) {
      expect(a.nameFr.trim().length, `${a.key} : nameFr vide`).toBeGreaterThan(0);
      expect(a.nameAr.trim().length, `${a.key} : nameAr vide`).toBeGreaterThan(0);
      expect(a.icon.trim().length, `${a.key} : icon vide`).toBeGreaterThan(0);
    }
    expect(AMENITIES.find((a) => a.key === "kosha")?.icon).toBe("sofa");
  });
});
