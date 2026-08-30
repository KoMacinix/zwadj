// Lot A7 — la traduction URL ↔ API est pure, donc testée ici plutôt qu'à
// travers le DOM. C'est là que vivent les deux conversions qui coûtent cher si
// elles se trompent : dinars → centimes (facteur 100) et amenities répétées →
// liste jointe.
import {
  BUDGET_CEILING,
  BUDGET_FLOOR,
  BUDGET_TIERS,
  centsFromDinars,
  dinarsFromCents,
  pageWindow,
  parseSearchParams,
  toApiQuery,
  toPublicQuery
} from "../lib/search-query";

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
      availableOn: "",
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

describe("⛔ D228 — le repli `maxPriceCents` → `maxPrice`", () => {
  // ⚠ CE QUE CE BLOC RATTRAPE. L'URL publique porte des DINARS, l'API des
  // CENTIMES, et les deux formulaires du front écrivaient le nom de l'API dans
  // l'URL. `parseSearchParams` ne lisant que `maxPrice`, un visiteur qui
  // choisissait « 500 000 DA » recevait le catalogue entier — sans message,
  // sans erreur, sans rien à l'écran qui le dise.
  // ⛔ DETTE DATÉE AU 19/11/2026 : ce bloc entier se retire avec le repli.

  it("un ancien lien partagé retrouve son plafond, et l'API le reçoit", () => {
    // L'ALLER-RETOUR COMPLET, pas seulement l'état : c'est ce que l'API reçoit
    // qui filtre, et c'est là que le facteur 100 se trompe de sens.
    const state = parseSearchParams({ maxPriceCents: "50000000" });
    expect(state.maxPrice).toBe("500000");
    expect(toApiQuery(state).get("maxPriceCents")).toBe("50000000");
  });

  it("⚠ le repli ne va JAMAIS dans l'autre sens : `maxPrice` gagne toujours", () => {
    // Sans cette règle, le mauvais nom deviendrait une source normale et la
    // dette ne se paierait jamais.
    const state = parseSearchParams({ maxPrice: "300000", maxPriceCents: "50000000" });
    expect(state.maxPrice).toBe("300000");
  });

  it("⚠ `?maxPrice=` VIDE coupe le repli — le visiteur vient d'effacer son plafond", () => {
    // Un `<form method="get">` soumet ses champs vides : « peu importe » s'écrit
    // exactement comme ça. Replier ici ressusciterait un filtre effacé.
    const state = parseSearchParams({ maxPrice: "", maxPriceCents: "50000000" });
    expect(state.maxPrice).toBe("");
  });

  it("⚠ une valeur MALFORMÉE sous le bon nom se laisse tomber, elle n'est pas remplacée", () => {
    // La PRÉSENCE décide de la branche, la VALIDITÉ décide de la valeur (D228).
    const state = parseSearchParams({ maxPrice: "trois-cents-mille", maxPriceCents: "50000000" });
    expect(state.maxPrice).toBe("");
  });

  it("⚠ un reste non nul est ABANDONNÉ, jamais arrondi", () => {
    // `50000001` centimes ne vient d'aucun de nos formulaires : c'est une URL
    // bricolée. L'arrondir poserait un plafond que personne n'a demandé.
    expect(parseSearchParams({ maxPriceCents: "50000001" }).maxPrice).toBe("");
    expect(parseSearchParams({ maxPriceCents: "99" }).maxPrice).toBe("");
  });

  it("`dinarsFromCents` rend le montant EXACT, ou rien", () => {
    expect(dinarsFromCents("50000000")).toBe("500000");
    expect(dinarsFromCents("100")).toBe("1");
    expect(dinarsFromCents("0")).toBe("0");
    expect(dinarsFromCents("50000001")).toBe("");
    expect(dinarsFromCents("-100")).toBe("");
    expect(dinarsFromCents("1e4")).toBe("");
    expect(dinarsFromCents("")).toBe("");
  });

  it("⛔ l'URL publique ne réémet JAMAIS l'ancien nom", () => {
    // Le repli sert à LIRE le passé, jamais à le reproduire : sinon les liens
    // au mauvais nom continueraient de naître, et la dette n'aurait pas de fin.
    const url = toPublicQuery(parseSearchParams({ maxPriceCents: "50000000" }));
    expect(url).toContain("maxPrice=500000");
    expect(url).not.toContain("maxPriceCents");
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

// ── Lot `availableOn` ───────────────────────────────────────────────────────
describe("availableOn — la date d'annotation", () => {
  it("D55 — LE CAS RÉEL D'ABORD : une vraie date passe intacte, dans les deux sens", () => {
    // La date de la maquette (« Mar 2 Juin 2026 »). Si la validation la
    // refusait, ce serait la validation qui aurait tort.
    const state = parseSearchParams({ availableOn: "2026-06-02" });
    expect(state.availableOn).toBe("2026-06-02");
    expect(toApiQuery(state).get("availableOn")).toBe("2026-06-02");
    expect(toPublicQuery(state)).toContain("availableOn=2026-06-02");
  });

  it("une date à la BONNE FORME mais IRRÉELLE est abandonnée : février n'a pas de 31", () => {
    // Le piège que `isRealCivilDate` existe pour attraper. L'envoyer produirait
    // un 400 sur une page publique indexée.
    expect(parseSearchParams({ availableOn: "2026-02-31" }).availableOn).toBe("");
  });

  it("le 29 février d'une année BISSEXTILE est accepté, celui d'une année commune non", () => {
    expect(parseSearchParams({ availableOn: "2028-02-29" }).availableOn).toBe("2028-02-29");
    expect(parseSearchParams({ availableOn: "2027-02-29" }).availableOn).toBe("");
  });

  it("une forme non conforme est abandonnée, jamais réécrite", () => {
    for (const bad of ["2026-6-2", "02/06/2026", "hier", "2026-06-02T20:00", ""]) {
      expect(parseSearchParams({ availableOn: bad }).availableOn).toBe("");
    }
  });

  it("ABSENTE de l'URL ⇒ ABSENTE des deux querystrings : on ne pose pas une question qu'on n'a pas reçue", () => {
    const state = parseSearchParams({});
    expect(toApiQuery(state).has("availableOn")).toBe(false);
    expect(toPublicQuery(state)).not.toContain("availableOn");
  });

  it("⚠ AUCUNE notion de « passé » ici : une date de 2020 traverse et part à l'API, seule autorité", () => {
    // Trancher ici créerait une SECONDE autorité sur « aujourd'hui », qui
    // divergerait de l'horloge d'Alger dès qu'un navigateur est ailleurs.
    // C'est l'API qui refuse (400 AVAILABLE_ON_PAST).
    const state = parseSearchParams({ availableOn: "2020-01-01" });
    expect(state.availableOn).toBe("2020-01-01");
    expect(toApiQuery(state).get("availableOn")).toBe("2020-01-01");
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
    // ⚠ CHEMIN MIS À JOUR LE 23/08/2026 (D234) — la page a changé de dossier,
    // pas de comportement. Elle vit désormais sous le groupe de routes
    // `(recherche)`, invisible dans l'URL, qui borne la frontière Suspense de
    // `loading.tsx` à la SEULE page de liste : au-dessus de `salles/[slug]`,
    // cette frontière faisait sortir en 200 le 404 d'une salle dépubliée.
    // L'assertion, elle, est inchangée.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "app", "[locale]", "salles", "(recherche)", "page.tsx"),
      "utf8"
    );
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});

/* ── D254 — LA GARDE QUI MANQUAIT ───────────────────────────────────
   Un commentaire dans `home-view.tsx` avertissait déjà que 2 000 000 et
   4 000 000 DA dépassaient la butée. Il n'a rien empêché pendant toute la vie
   du défaut. Ce qui suit n'avertit pas : ça TOMBE. */
describe("BUDGET_TIERS — l'autorité unique des paliers", () => {
  it("⛔ AUCUN palier n'atteint la butée — un palier en butée ne filtre RIEN (D69)", () => {
    // C'est LE défaut B de D228, réduit à une assertion. `>=` et pas `>` :
    // `atCeiling` efface dès l'égalité, donc un palier ÉGAL à la butée est
    // déjà mort. La borne est écrite ici APRÈS avoir été mesurée sur le
    // parseur, pas devinée (D55).
    for (const palier of BUDGET_TIERS) {
      expect(palier).toBeLessThan(BUDGET_CEILING);
      expect(palier).toBeGreaterThan(BUDGET_FLOOR);
    }
  });

  it("⛔ chaque palier SURVIT à l'aller-retour URL → état → API", () => {
    // La garde ci-dessus dit que le palier est SOUS la butée. Celle-ci dit
    // qu'il arrive intact à l'API : les deux ensemble couvrent l'erreur
    // d'unité (facteur 100) ET l'effacement par butée, qui sont deux façons
    // différentes de rendre un plafond inopérant sans rien afficher.
    for (const palier of BUDGET_TIERS) {
      const etat = parseSearchParams({ maxPrice: String(palier) });
      expect(etat.maxPrice).toBe(String(palier));
      expect(toApiQuery(etat).get("maxPriceCents")).toBe(String(palier * 100));
      expect(toPublicQuery(etat)).toContain(`maxPrice=${palier}`);
    }
  });

  it("les paliers sont strictement croissants et sans doublon", () => {
    // Deux paliers égaux, c'est deux entrées indiscernables dans le menu ;
    // un ordre inversé, c'est une liste qui se lit de travers. Aucun des deux
    // ne casse un filtre — raison de plus pour qu'un test le dise.
    const croissants = [...BUDGET_TIERS].sort((a, b) => a - b);
    expect([...BUDGET_TIERS]).toEqual(croissants);
    expect(new Set(BUDGET_TIERS).size).toBe(BUDGET_TIERS.length);
  });

  it("⚠ `centsFromDinars` et `dinarsFromCents` sont réciproques sur les paliers", () => {
    // Les deux seules conversions du front, confrontées. Prises séparément
    // elles ont chacune l'air juste ; c'est leur désaccord qui coûte.
    for (const palier of BUDGET_TIERS) {
      expect(dinarsFromCents(String(centsFromDinars(palier)))).toBe(String(palier));
    }
  });
});
