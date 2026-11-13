// Spec du module PUR de la carte (lot CA-1, session « carte »). Aucune base,
// aucun Nest : la forme d'un point et l'enveloppe se rejouent en millisecondes.
import { describe, expect, it } from "vitest";
import type { VenueMapPointDTO } from "@zwadj/types";
import { HAS_COORDINATES, VENUE_MAP_SELECT, toVenueMapPoint, venueMapResponse, type VenueMapRow } from "./venue-map";

const urlOf = (key: string): string => `/api/v1/media/${key}`;

/** Un `Decimal` de Prisma, réduit à ce que le module en lit. */
const decimal = (value: number) => ({ toNumber: () => value });

function ligne(over: Partial<VenueMapRow> = {}): VenueMapRow {
  return {
    id: "018f0000-0000-7000-8000-000000000001",
    slug: "salle-el-bahia",
    nameFr: "Salle El Bahia",
    nameAr: "قاعة البهية",
    lat: decimal(36.7453),
    lng: decimal(3.0319),
    basePriceCents: 18_000_000,
    capacityMax: 450,
    photos: [{ thumbKey: "abc-thumb.webp" }],
    ...over
  };
}

/** ⚠ L'AUTORITÉ EST LE TYPE, pas une liste recopiée : `Record<keyof DTO, true>`
 *  ne compile plus dès qu'un champ entre dans le contrat ou en sort (porté par
 *  `tsc`). Le test compare ensuite les clés RENDUES à celles-ci. */
const CLES_DU_CONTRAT: Record<keyof VenueMapPointDTO, true> = {
  id: true,
  slug: true,
  nameFr: true,
  nameAr: true,
  lat: true,
  lng: true,
  basePriceCents: true,
  capacityMax: true,
  coverThumbUrl: true
};

describe("toVenueMapPoint — la forme d'un point", () => {
  it("rend exactement les champs du contrat, coordonnées en NOMBRES, prix et capacité tels que lus", () => {
    const point = toVenueMapPoint(ligne(), urlOf);
    expect(point).toEqual({
      id: "018f0000-0000-7000-8000-000000000001",
      slug: "salle-el-bahia",
      nameFr: "Salle El Bahia",
      nameAr: "قاعة البهية",
      lat: 36.7453,
      lng: 3.0319,
      basePriceCents: 18_000_000,
      capacityMax: 450,
      coverThumbUrl: "/api/v1/media/abc-thumb.webp"
    });
    expect(Object.keys(point ?? {}).sort()).toEqual(Object.keys(CLES_DU_CONTRAT).sort());
  });

  it("⛔ aucun champ en plus ne sort, même si la ligne lue en porte (taux, adresse, propriétaire)", () => {
    const riche = { ...ligne(), commissionRateBps: 250, cashbackRateBps: 100, address: "12 rue", ownerId: "x" };
    const point = toVenueMapPoint(riche, urlOf);
    expect(Object.keys(point ?? {}).sort()).toEqual(Object.keys(CLES_DU_CONTRAT).sort());
  });

  it("salle sans photo : vignette `null`, pas une adresse inventée", () => {
    expect(toVenueMapPoint(ligne({ photos: [] }), urlOf)?.coverThumbUrl).toBeNull();
  });

  it("⚠ une SEULE coordonnée n'est pas une position : latitude seule ⇒ pas de point", () => {
    expect(toVenueMapPoint(ligne({ lng: null }), urlOf)).toBeNull();
  });

  it("⚠ longitude seule ⇒ pas de point non plus (les deux sens se mesurent)", () => {
    expect(toVenueMapPoint(ligne({ lat: null }), urlOf)).toBeNull();
  });
});

describe("venueMapResponse — l'enveloppe", () => {
  const base = { urlOf, requestedOn: undefined };

  it("le nombre de salles SANS coordonnées est le total des filtres moins les salles situées", () => {
    const res = venueMapResponse({ ...base, rows: [ligne()], total: 7, located: 4, limit: 500 });
    expect(res.total).toBe(7);
    expect(res.withoutCoordinates).toBe(3);
  });

  it("au plafond PILE, rien n'est tronqué (`>` et pas `>=`)", () => {
    const rows = [ligne({ id: "a" }), ligne({ id: "b" })];
    const res = venueMapResponse({ ...base, rows, total: 2, located: 2, limit: 2 });
    expect(res.truncated).toBe(false);
    expect(res.points.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("⛔ une salle située de plus que le plafond : `truncated` le DIT, et les points s'arrêtent au plafond", () => {
    const rows = [ligne({ id: "a" }), ligne({ id: "b" }), ligne({ id: "c" })];
    const res = venueMapResponse({ ...base, rows, total: 3, located: 3, limit: 2 });
    expect(res.truncated).toBe(true);
    expect(res.points.map((p) => p.id)).toEqual(["a", "b"]);
    expect(res.limit).toBe(2);
  });

  it("l'écho de la date : la date demandée, ou `null` si aucune (une réponse paramétrée porte l'écho de son paramètre)", () => {
    expect(venueMapResponse({ ...base, rows: [], total: 0, located: 0, limit: 500, requestedOn: "2026-06-02" }).availableOn).toBe(
      "2026-06-02"
    );
    expect(venueMapResponse({ ...base, rows: [], total: 0, located: 0, limit: 500 }).availableOn).toBeNull();
  });

  it("deux comptes lus à deux instants (une salle supprimée entre les deux) ne rendent jamais un nombre négatif", () => {
    expect(venueMapResponse({ ...base, rows: [], total: 3, located: 4, limit: 500 }).withoutCoordinates).toBe(0);
  });
});

describe("ce que la requête demande à la base", () => {
  it("« avoir des coordonnées » = latitude ET longitude non nulles", () => {
    expect(HAS_COORDINATES).toEqual({ lat: { not: null }, lng: { not: null } });
  });

  it("⛔ le SELECT ne lit ni taux, ni adresse, ni propriétaire : ce qui n'est pas lu ne peut pas sortir", () => {
    expect(Object.keys(VENUE_MAP_SELECT).sort()).toEqual(
      ["basePriceCents", "capacityMax", "id", "lat", "lng", "nameAr", "nameFr", "photos", "slug"].sort()
    );
    expect(VENUE_MAP_SELECT.photos.take).toBe(1);
    expect(Object.keys(VENUE_MAP_SELECT.photos.select)).toEqual(["thumbKey"]);
  });
});
