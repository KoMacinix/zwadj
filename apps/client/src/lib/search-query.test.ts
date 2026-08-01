// Lot A7 — la traduction URL ↔ API est pure, donc testée ici plutôt qu'à
// travers le DOM. C'est là que vivent les deux conversions qui coûtent cher si
// elles se trompent : dinars → centimes (facteur 100) et amenities répétées →
// liste jointe.
import { pageWindow, parseSearchParams, toApiQuery, toPublicQuery } from "../lib/search-query";

describe("parseSearchParams", () => {
  it("l'URL nue donne l'état par défaut : tri « recent », page 1, aucun filtre", () => {
    expect(parseSearchParams({})).toEqual({
      cityId: "",
      guests: "",
      maxCapacity: "",
      minPrice: "",
      maxPrice: "",
      amenities: [],
      styles: [],
      ceremonyType: "",
      sort: "recent",
      page: 1
    });
  });

  it("les cases répétées sont collectées, dédoublonnées et triées", () => {
    const state = parseSearchParams({ amenities: ["parking", "wifi", "parking"] });
    expect(state.amenities).toEqual(["parking", "wifi"]);
  });

  it("la forme jointe par virgules est acceptée aussi : une URL copiée depuis l'API ne perd pas ses filtres", () => {
    expect(parseSearchParams({ amenities: "wifi,parking" }).amenities).toEqual(["parking", "wifi"]);
  });

  it("une saisie non entière est REJETÉE côté front : elle ne doit jamais produire un 400 sur une page indexée", () => {
    const state = parseSearchParams({ guests: "abc", minPrice: "12.5", maxPrice: "-3" });
    expect([state.guests, state.minPrice, state.maxPrice]).toEqual(["", "", ""]);
  });

  it("un tri inconnu retombe sur « recent », une page absurde sur 1 — jamais une erreur", () => {
    expect(parseSearchParams({ sort: "peu_importe", page: "0" }).sort).toBe("recent");
    expect(parseSearchParams({ page: "-4" }).page).toBe(1);
    expect(parseSearchParams({ page: "abc" }).page).toBe(1);
  });

  it("les clés marketing sont ignorées sans bruit", () => {
    expect(parseSearchParams({ utm_source: "facebook", fbclid: "xyz" }).sort).toBe("recent");
  });
});

  it("D69 — une poignée EN BUTÉE n'est pas un filtre : elle est effacée dès la lecture", () => {
    const state = parseSearchParams({
      guests: "20",
      maxCapacity: "500",
      minPrice: "0",
      maxPrice: "1500000"
    });
    // Les quatre valeurs sont les bornes exactes du panneau : au repos, il ne
    // filtre rien. Les garder exclurait la salle de 1 200 places d'une recherche
    // que personne n'a touchée.
    expect([state.guests, state.maxCapacity, state.minPrice, state.maxPrice]).toEqual(["", "", "", ""]);
  });

  it("une valeur AU-DELÀ de la butée veut dire « tout », pas « rien »", () => {
    const state = parseSearchParams({ maxCapacity: "9000", maxPrice: "99000000" });
    expect([state.maxCapacity, state.maxPrice]).toEqual(["", ""]);
  });

  it("une poignée à l'INTÉRIEUR de la course filtre normalement", () => {
    const state = parseSearchParams({ guests: "120", maxCapacity: "300" });
    expect([state.guests, state.maxCapacity]).toEqual(["120", "300"]);
  });

  it("plage INVERSÉE : redressée, jamais transmise — l'API la refuserait en 400 (D68)", () => {
    const state = parseSearchParams({ guests: "400", maxCapacity: "100" });
    expect([state.guests, state.maxCapacity]).toEqual(["100", "400"]);

    const prices = parseSearchParams({ minPrice: "900000", maxPrice: "200000" });
    expect([prices.minPrice, prices.maxPrice]).toEqual(["200000", "900000"]);
  });

  it("un type de cérémonie inconnu est ignoré, les styles suivent la règle des amenities", () => {
    const state = parseSearchParams({ ceremonyType: "chateau", styles: ["jardin", "jardin", "Royal!"] });
    expect(state.ceremonyType).toBe("");
    expect(state.styles).toEqual(["jardin"]);
  });

describe("toApiQuery", () => {
  it("convertit les DINARS de l'URL en CENTIMES pour l'API", () => {
    const query = toApiQuery(parseSearchParams({ minPrice: "100000", maxPrice: "400000" }));
    expect(query.get("minPriceCents")).toBe("10000000");
    expect(query.get("maxPriceCents")).toBe("40000000");
    // Le nom nu n'existe pas côté API : s'il fuitait, le filtre serait ignoré
    // en silence et la page mentirait sur ses résultats.
    expect(query.get("minPrice")).toBeNull();
  });

  it("joint les amenities par des virgules — la forme attendue par le contrat A3", () => {
    const query = toApiQuery(parseSearchParams({ amenities: ["wifi", "parking"] }));
    expect(query.get("amenities")).toBe("parking,wifi");
  });

  it("impose toujours tri, page et pageSize", () => {
    const query = toApiQuery(parseSearchParams({}));
    expect([query.get("sort"), query.get("page"), query.get("pageSize")]).toEqual(["recent", "1", "12"]);
  });

  it("n'envoie pas les filtres vides : `cityId=` serait un UUID invalide, donc un 400", () => {
    const query = toApiQuery(parseSearchParams({}));
    expect(query.has("cityId")).toBe(false);
    expect(query.has("guests")).toBe(false);
  });
});

  it("transporte le plafond de capacité, les styles joints et le type de cérémonie", () => {
    const query = toApiQuery(parseSearchParams({ maxCapacity: "300", styles: ["jardin", "royal"], ceremonyType: "outdoor" }));
    expect(query.get("maxCapacity")).toBe("300");
    expect(query.get("styles")).toBe("jardin,royal");
    expect(query.get("ceremonyType")).toBe("outdoor");
  });

describe("toPublicQuery", () => {
  it("omet les valeurs par défaut : l'URL nue et `?sort=recent&page=1` seraient du contenu dupliqué", () => {
    expect(toPublicQuery(parseSearchParams({}))).toBe("");
    expect(toPublicQuery(parseSearchParams({ sort: "recent", page: "1" }))).toBe("");
  });

  it("garde les DINARS et RÉPÈTE les amenities : c'est la forme canonique publique", () => {
    const state = parseSearchParams({ minPrice: "100000", amenities: ["wifi", "parking"] });
    const query = toPublicQuery(state);
    expect(query).toContain("minPrice=100000");
    expect(query).not.toContain("Cents");
    expect(query.match(/amenities=/g)).toHaveLength(2);
  });

  it("le numéro de page est un paramètre du lien, pas de l'état : la pagination réutilise les filtres", () => {
    const state = parseSearchParams({ cityId: "11111111-1111-4111-8111-111111111111", sort: "price_asc" });
    expect(toPublicQuery(state, 3)).toBe(
      "?cityId=11111111-1111-4111-8111-111111111111&sort=price_asc&page=3"
    );
  });
});

describe("pageWindow", () => {
  it("montre tout tant que ça tient", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("borne, voisins et ellipses au-delà : une salle de plus n'ajoute pas un lien de plus", () => {
    expect(pageWindow(9, 20)).toEqual([1, null, 8, 9, 10, null, 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 20]);
    expect(pageWindow(20, 20)).toEqual([1, null, 19, 20]);
  });
});

// Garde-fou de RENDU, dans l'esprit de `ui-tokens.test.ts` du Pro : la page est
// dynamique parce qu'elle attend `searchParams`, ce qu'aucun test de rendu ne
// montre. Si un refactor déplaçait cette lecture, la page redeviendrait
// prérenderable en silence — et un build de CI, API éteinte, figerait l'état
// d'erreur en HTML servi à tous.
describe("page de recherche — rendu à la demande", () => {
  it("déclare `dynamic = \"force-dynamic\"`", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "app", "[locale]", "salles", "page.tsx"),
      "utf8"
    );
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});
