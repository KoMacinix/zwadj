// Carte — lot CA-2 (session « carte »). Le module PUR de `@zwadj/ui` : quel fond de carte, à quelle précision une
// coordonnée s'écrit, quelle boîte contient les points. `@zwadj/ui` n'a pas de lanceur de tests : ses gardes vivent chez ses
// consommateurs (comme `ui-phone-field.test.tsx`).
import { describe, expect, it } from "vitest";
import {
  COORDINATE_DECIMALS,
  DEV_MAP_TILES,
  boundsOf,
  isMapPosition,
  resolveMapTiles,
  roundCoordinate
} from "@zwadj/ui";

const VIDE = { url: undefined, attribution: undefined, attributionUrl: undefined };
const FOURNISSEUR = {
  url: "https://tuiles.exemple.dz/{z}/{x}/{y}.png",
  attribution: "© Fournisseur Exemple",
  attributionUrl: "https://tuiles.exemple.dz/licence"
};

describe("resolveMapTiles — quel fond de carte (R-2)", () => {
  it("⛔ PRODUCTION sans variable : PAS de carte — jamais le défaut de développement", () => {
    expect(resolveMapTiles({ production: true, ...VIDE })).toBeNull();
  });

  it("développement sans variable : le défaut de développement, avec SON attribution", () => {
    const tiles = resolveMapTiles({ production: false, ...VIDE });
    expect(tiles).toBe(DEV_MAP_TILES);
    expect(tiles?.attribution.length).toBeGreaterThan(0);
    expect(tiles?.attributionUrl).not.toBeNull();
  });

  it("des variables vides ou faites d'espaces valent « absentes »", () => {
    expect(resolveMapTiles({ production: true, url: "  ", attribution: "", attributionUrl: "" })).toBeNull();
    expect(resolveMapTiles({ production: false, url: "  ", attribution: "", attributionUrl: "" })).toBe(DEV_MAP_TILES);
  });

  it("adresse ET mention fournies : ce sont elles, en production comme en développement", () => {
    expect(resolveMapTiles({ production: true, ...FOURNISSEUR })).toEqual(FOURNISSEUR);
    expect(resolveMapTiles({ production: false, ...FOURNISSEUR })).toEqual(FOURNISSEUR);
  });

  it("⛔ une adresse SANS mention : pas de carte (on n'affiche pas les tuiles d'un tiers sans le créditer)", () => {
    expect(resolveMapTiles({ production: true, ...FOURNISSEUR, attribution: undefined })).toBeNull();
    expect(resolveMapTiles({ production: false, ...FOURNISSEUR, attribution: undefined })).toBeNull();
  });

  it("⛔ une mention SANS adresse : pas de carte non plus (elle créditerait le défaut de développement d'un autre nom)", () => {
    expect(resolveMapTiles({ production: false, ...FOURNISSEUR, url: undefined })).toBeNull();
  });

  it("une adresse qui n'est pas un gabarit de tuiles ({z}, {x}, {y}) est refusée", () => {
    for (const url of ["https://tuiles.exemple.dz/carte.png", "https://tuiles.exemple.dz/{z}/{x}.png", "tuiles.exemple.dz/{z}/{x}/{y}.png"]) {
      expect(resolveMapTiles({ production: true, ...FOURNISSEUR, url }), url).toBeNull();
    }
  });

  it("`http://` : admis hors production (serveur de tuiles local), refusé en production", () => {
    const url = "http://localhost:8080/{z}/{x}/{y}.png";
    expect(resolveMapTiles({ production: false, ...FOURNISSEUR, url })?.url).toBe(url);
    expect(resolveMapTiles({ production: true, ...FOURNISSEUR, url })).toBeNull();
  });

  it("le lien de la mention est facultatif, et n'est gardé que s'il est en `https://`", () => {
    expect(resolveMapTiles({ production: true, ...FOURNISSEUR, attributionUrl: undefined })?.attributionUrl).toBeNull();
    expect(resolveMapTiles({ production: true, ...FOURNISSEUR, attributionUrl: "javascript:alert(1)" })?.attributionUrl).toBeNull();
  });
});

describe("coordonnées", () => {
  it("une coordonnée s'écrit à la précision de la colonne (six décimales)", () => {
    expect(COORDINATE_DECIMALS).toBe(6);
    expect(roundCoordinate(36.75381234567)).toBe(36.753812);
    expect(roundCoordinate(3.0588999996)).toBe(3.0589);
  });

  it("une position plausible : les bornes du contrat, INCLUSES", () => {
    expect(isMapPosition({ lat: 90, lng: 180 })).toBe(true);
    expect(isMapPosition({ lat: -90, lng: -180 })).toBe(true);
    expect(isMapPosition({ lat: 90.000001, lng: 0 })).toBe(false);
    expect(isMapPosition({ lat: 0, lng: -180.000001 })).toBe(false);
    expect(isMapPosition({ lat: Number.NaN, lng: 0 })).toBe(false);
  });

  it("la boîte des points : `null` sans point, le point lui-même s'il est seul, les extrêmes sinon", () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([{ lat: 36.7, lng: 3.05 }])).toEqual({ south: 36.7, west: 3.05, north: 36.7, east: 3.05 });
    expect(
      boundsOf([
        { lat: 36.7, lng: 3.05 },
        { lat: 35.2, lng: -0.64 },
        { lat: 36.9, lng: 7.76 }
      ])
    ).toEqual({ south: 35.2, west: -0.64, north: 36.9, east: 7.76 });
  });
});
