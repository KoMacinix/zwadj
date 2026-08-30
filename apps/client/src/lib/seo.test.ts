// Lot `availableOn`, volet SEO — le module est PUR, donc testé ici et non à
// travers un rendu de page. Ce qui est prouvé :
//   1. la règle mord sur les variantes DÉJÀ existantes (pagination, filtres) et
//      pas seulement sur le paramètre du jour ;
//   2. `follow` reste vrai même en `noindex` — sans lui, l'exploration des
//      fiches de salles serait coupée, et ce sont les seules pages qu'on veut
//      réellement indexer ;
//   3. la liste des paramètres de variante ne peut pas se désynchroniser de ce
//      que `toPublicQuery` sait produire.
import { absoluteUrl, isVariant, publicMetadata, SEARCH_VARIANT_PARAMS, SITE_ORIGIN } from "./seo";
import { parseSearchParams, toPublicQuery } from "./search-query";

describe("isVariant — ce qui fait d'une page de recherche une seconde adresse", () => {
  it("l'URL NUE n'est pas une variante : c'est elle qu'on veut indexée", () => {
    expect(isVariant({})).toBe(false);
  });

  it("⛔ LE PROBLÈME EXISTAIT DÉJÀ : pagination et filtres sont des variantes, pas seulement `availableOn`", () => {
    expect(isVariant({ page: "2" })).toBe(true);
    expect(isVariant({ cityId: "5b4f…" })).toBe(true);
    expect(isVariant({ amenities: ["wifi", "parking"] })).toBe(true);
    expect(isVariant({ sort: "price_asc" })).toBe(true);
    expect(isVariant({ availableOn: "2026-06-02" })).toBe(true);
  });

  it("une clé VIDE n'est pas une variante : un `<form method=\"get\">` soumet ses champs vides", () => {
    // Sans cette règle, la page nue-en-pratique — celle qu'on atteint en
    // validant le formulaire sans rien cocher — sortirait en `noindex`.
    expect(isVariant({ cityId: "", guests: "", amenities: [""] })).toBe(false);
  });

  it("une clé INCONNUE (utm_*, fbclid) n'est pas une variante : une URL marketing n'a pas à désindexer la page", () => {
    expect(isVariant({ utm_source: "facebook", fbclid: "abc" })).toBe(false);
  });
});

describe("publicMetadata — robots + canonical", () => {
  it("page nue : indexable, canonical sur elle-même", () => {
    const meta = publicMetadata({ locale: "fr", canonicalPath: "/salles", indexable: true });
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(`${SITE_ORIGIN}/fr/salles`);
  });

  it("⚠ VARIANTE : `noindex` MAIS `follow` — le chemin vers les fiches ne doit jamais être coupé", () => {
    const meta = publicMetadata({ locale: "fr", canonicalPath: "/salles", indexable: false });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("la canonical d'une variante désigne la page NUE, pas l'URL courante", () => {
    const meta = publicMetadata({ locale: "ar", canonicalPath: "/salles", indexable: false });
    expect(meta.alternates?.canonical).toBe(`${SITE_ORIGIN}/ar/salles`);
    expect(meta.alternates?.canonical).not.toContain("?");
  });

  it("le préfixe de locale est porté par la canonical : le site en a deux, et elles ne sont pas la même page", () => {
    expect(absoluteUrl("fr", "/salles")).not.toBe(absoluteUrl("ar", "/salles"));
  });
});

describe("la liste des paramètres de variante ne peut pas se désynchroniser", () => {
  it("⚠ TOUTE clé que `toPublicQuery` sait produire est déclarée variante", () => {
    // Une clé qui s'ajouterait à `toPublicQuery` sans venir ici ouvrirait une
    // seconde adresse INDEXÉE en silence — exactement le défaut que ce lot
    // corrige. Les valeurs sont choisies pour qu'aucune ne soit omise :
    // `toPublicQuery` tait les valeurs par défaut et les poignées en butée.
    const state = parseSearchParams({
      cityId: "c1",
      guests: "150",
      maxCapacity: "400",
      minPrice: "100000",
      maxPrice: "900000",
      amenities: ["wifi"],
      styles: ["royal"],
      ceremonyType: "outdoor",
      availableOn: "2026-06-02",
      sort: "price_asc",
      page: "3"
    });
    const produced = [...new URLSearchParams(toPublicQuery(state, 3).slice(1)).keys()];
    expect(produced.length).toBeGreaterThan(0);
    for (const key of produced) {
      expect(SEARCH_VARIANT_PARAMS as readonly string[]).toContain(key);
    }
  });
});
