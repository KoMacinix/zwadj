// Lot `availableOn` — `searchVenues` traduit la réponse HTTP en ISSUE.
//
// ⚠ POURQUOI CE FICHIER EXISTE : LE HARNAIS DE NEUTRALISATION L'A EXIGÉ.
// La vue avait bien un test « date passée », mais il lui passait directement
// `{ kind: "past-date" }` en prop — il prouvait le RENDU du refus, jamais sa
// RECONNAISSANCE. Neutraliser la ligne qui lit le code d'erreur laissait donc
// tout vert : la garde était muette, et personne ne l'aurait vu en relecture.
// C'est le même angle mort que « vérifier qu'un composant est monté, pas
// seulement écrit » (leçon R1).
import { VenueErrorCode } from "@zwadj/types";
import { getAmenities, getVenueMap, getVenueStyles, getWilayas, searchVenues } from "./api";

/** Réponse minimale : seuls `ok`, `status` et `json` sont lus par `searchVenues`. */
function reponse(status: number, body: unknown | (() => never)) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (typeof body === "function") (body as () => never)();
      return body;
    }
  } as unknown as Response;
}

const stubFetch = (res: Response | Error) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (res instanceof Error) throw res;
      return res;
    })
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchVenues — les trois issues", () => {
  it("200 : `ok`, avec le corps tel quel — l'écho `availableOn` compris", async () => {
    const data = { items: [], total: 0, page: 1, pageSize: 12, availableOn: "2026-06-02" };
    stubFetch(reponse(200, data));
    const out = await searchVenues(new URLSearchParams({ availableOn: "2026-06-02" }));
    expect(out).toEqual({ kind: "ok", data });
  });

  it("⚠ 400 + `AVAILABLE_ON_PAST` ⇒ `past-date`, JAMAIS `unreachable`", async () => {
    // Le cas que la neutralisation a révélé non couvert. Replié sur la panne,
    // l'écran dirait « réessayez » d'une requête qui ne marchera jamais.
    // ⚠ ENVELOPPE RÉELLE d'`AllExceptionsFilter`, relevée de
    // `packages/api-client/src/auth-client.test.ts` — le code est SOUS
    // `message`. La première version de ce test posait `{ code }` à la racine :
    // il validait la forme que j'avais imaginée, pas celle que l'API produit.
    stubFetch(
      reponse(400, {
        statusCode: 400,
        message: { code: VenueErrorCode.AVAILABLE_ON_PAST, message: "venue.errors.availableOnPast" },
        path: "/api/v1/venues",
        timestamp: "2026-06-01T11:00:00.000Z"
      })
    );
    expect(await searchVenues(new URLSearchParams({ availableOn: "2020-01-01" }))).toEqual({ kind: "past-date" });
  });

  it("⚠ 400 + `AVAILABLE_ON_BEYOND_HORIZON` ⇒ `beyond-horizon`, PAS `past-date`", async () => {
    // ⛔ LES DEUX REFUS SONT CONFRONTÉS, pas mesurés chacun dans son coin
    // (D227). Les confondre afficherait « cette date est déjà passée » à qui a
    // demandé une date de 2029 : le conseil serait exactement à l'envers.
    // ⚠ Enveloppe RÉELLE d'`AllExceptionsFilter` : le code est SOUS `message`.
    stubFetch(
      reponse(400, {
        statusCode: 400,
        message: {
          code: VenueErrorCode.AVAILABLE_ON_BEYOND_HORIZON,
          message: "venue.errors.availableOnBeyondHorizon"
        },
        path: "/api/v1/venues",
        timestamp: "2026-06-01T11:00:00.000Z"
      })
    );
    const out = await searchVenues(new URLSearchParams({ availableOn: "2099-06-02" }));
    expect(out).toEqual({ kind: "beyond-horizon" });
    expect(out).not.toEqual({ kind: "past-date" });
    expect(out).not.toEqual({ kind: "unreachable" });
  });

  it("400 d'un AUTRE code ⇒ `unreachable` : on lit le CODE, pas le statut seul", async () => {
    // Un paramètre bricolé à la main peut produire un 400 sans rapport avec la
    // date. Le confondre afficherait « cette date est déjà passée » à qui n'a
    // demandé aucune date.
    stubFetch(reponse(400, { statusCode: 400, message: { code: "SOMETHING_ELSE" } }));
    expect(await searchVenues(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("⚠ le code à la RACINE n'est PAS reconnu : c'est la forme imaginée, pas celle du filtre", async () => {
    // Garde de non-régression sur la faute exacte qui a été commise.
    stubFetch(reponse(400, { code: VenueErrorCode.AVAILABLE_ON_PAST }));
    expect(await searchVenues(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("400 au corps ILLISIBLE ⇒ `unreachable`, sans exception qui remonte", async () => {
    stubFetch(
      reponse(400, () => {
        throw new SyntaxError("Unexpected token < in JSON");
      })
    );
    expect(await searchVenues(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("500 ⇒ `unreachable`, et le corps n'est même pas lu", async () => {
    stubFetch(reponse(500, { statusCode: 500, message: { code: VenueErrorCode.AVAILABLE_ON_PAST } }));
    // ⚠ Même en portant le code, un 500 n'est pas un refus métier : c'est une
    // panne. Le statut décide d'abord.
    expect(await searchVenues(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("réseau coupé ⇒ `unreachable`, jamais une exception qui casserait la page", async () => {
    stubFetch(new TypeError("fetch failed"));
    expect(await searchVenues(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });
});

// ── Carte (session « carte », lot CA-2) ──────────────────────────────────────
describe("getVenueMap — les points de la carte", () => {
  const data = { points: [], total: 3, withoutCoordinates: 3, truncated: false, limit: 500, availableOn: null };

  it("200 : `ok`, avec le corps tel quel, demandé à la route de carte avec LA requête reçue", async () => {
    stubFetch(reponse(200, data));
    const out = await getVenueMap(new URLSearchParams({ cityId: "abc", guests: "120" }));
    expect(out).toEqual({ kind: "ok", data });
    const appel = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls[0]?.[0] ?? "";
    expect(new URL(appel).pathname).toBe("/api/v1/venue-map");
    expect(new URL(appel).search).toBe("?cityId=abc&guests=120");
  });

  it("⛔ la carte est lue SANS CACHE : le second argument de `fetch` porte `cache: \"no-store\"` (D353, R-4)", async () => {
    // ⚠ La fonction est appelée depuis le NAVIGATEUR : une réponse gardée annoncerait des points de salles masquées ou retirées. Ce test existe
    // parce que la suite ENTIÈRE du client restait VERTE sous `cache: "force-cache"` (mesuré, D351, `docs/preuves/D351/r4/`) : aucune assertion
    // ne lisait cette option. Le verdict est une VALEUR lue (`toBe`), jamais « un objet d'options quelconque ».
    stubFetch(reponse(200, data));
    await getVenueMap(new URLSearchParams({ cityId: "abc" }));
    const options = (fetch as unknown as { mock: { calls: [string, RequestInit | undefined][] } }).mock.calls[0]?.[1];
    expect(options?.cache).toBe("no-store");
  });

  it("sans filtre : aucun « ? » orphelin", async () => {
    stubFetch(reponse(200, data));
    await getVenueMap(new URLSearchParams());
    const appel = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls[0]?.[0] ?? "";
    expect(appel.endsWith("/api/v1/venue-map")).toBe(true);
  });

  it("⛔ 500 ⇒ `unreachable` : une panne ne se dit pas « zéro salle »", async () => {
    stubFetch(reponse(500, { message: "boom" }));
    expect(await getVenueMap(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("⛔ 200 dont `points` n'est pas un tableau ⇒ `unreachable`, pas une carte vide", async () => {
    stubFetch(reponse(200, { ...data, points: null }));
    expect(await getVenueMap(new URLSearchParams())).toEqual({ kind: "unreachable" });
    stubFetch(reponse(200, null));
    expect(await getVenueMap(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });

  it("corps illisible ou réseau coupé ⇒ `unreachable`, jamais une exception", async () => {
    stubFetch(reponse(200, () => { throw new SyntaxError("Unexpected token"); }));
    expect(await getVenueMap(new URLSearchParams())).toEqual({ kind: "unreachable" });
    stubFetch(new TypeError("fetch failed"));
    expect(await getVenueMap(new URLSearchParams())).toEqual({ kind: "unreachable" });
  });
});

// ── Référentiels (D353, R-3) : ce que le site garde en mémoire, et ce qu'il ne doit pas garder ──────────────────────────────────────────────────────────────
// ⛔ Une liste PLEINE peut rester gardée une heure ; une réponse VIDE ou en ÉCHEC ne doit jamais l'être. MESURÉ sur un build de production (`docs/preuves/D353/mesures/`) : le cache de
// données de Next garde une réponse 200 VIDE toute la fenêtre, ne garde ni un 500 ni une exception, et garde une liste pleine pendant une panne. Ces tests posent chaque cas.
// ⚠ Un double de `fetch` à RÉPONSES SUCCESSIVES (une par appel) : `stubFetch` rend la même réponse à tous les appels et ne verrait pas la relecture.
function stubFetchSuite(...reponses: (Response | Error)[]) {
  const file = [...reponses];
  const mock = vi.fn(async (_url: string, _options?: RequestInit) => {
    const prochaine = file.shift();
    if (prochaine === undefined) throw new Error("appel imprévu : plus aucune réponse préparée");
    if (prochaine instanceof Error) throw prochaine;
    return prochaine;
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const REFERENTIELS: [string, () => Promise<unknown[]>, string][] = [
  ["getWilayas", getWilayas, "wilayas"],
  ["getAmenities", getAmenities, "amenities"],
  ["getVenueStyles", getVenueStyles, "venue-styles"]
];

describe.each(REFERENTIELS)("%s — la mémoire d'un référentiel (D353, R-3)", (_nom, lire, chemin) => {
  const pleine = [{ id: "a1" }, { id: "b2" }];

  it("⛔ liste PLEINE : UNE seule lecture, gardée une heure (`revalidate: 3600`), rendue telle quelle", async () => {
    const mock = stubFetchSuite(reponse(200, pleine));
    expect(await lire()).toEqual(pleine);
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, options] = mock.mock.calls[0] ?? ["", undefined];
    expect(new URL(url).pathname).toBe(`/api/v1/${chemin}`);
    expect(options?.next?.revalidate).toBe(3600);
    expect(options?.cache).toBeUndefined();
  });

  it("⛔ réponse VIDE gardée : relue SANS CACHE, et c'est la RELECTURE qui est rendue — une liste vide gardée n'est jamais crue", async () => {
    const mock = stubFetchSuite(reponse(200, []), reponse(200, pleine));
    expect(await lire()).toEqual(pleine);
    expect(mock).toHaveBeenCalledTimes(2);
    const [url, options] = mock.mock.calls[1] ?? ["", undefined];
    expect(new URL(url).pathname).toBe(`/api/v1/${chemin}`);
    expect(options?.cache).toBe("no-store");
    expect(options?.next).toBeUndefined();
  });

  it("l'API est vraiment vide : `[]`, après la relecture (rien n'est inventé)", async () => {
    const mock = stubFetchSuite(reponse(200, []), reponse(200, []));
    expect(await lire()).toEqual([]);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("⛔ réponse non ok : `[]` et UNE seule lecture — un échec n'est pas relu, il n'est pas non plus gardé par Next (mesuré)", async () => {
    const mock = stubFetchSuite(reponse(500, { message: "boom" }));
    expect(await lire()).toEqual([]);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("exception à la première lecture : `[]`, jamais une exception qui remonte", async () => {
    const mock = stubFetchSuite(new TypeError("fetch failed"));
    expect(await lire()).toEqual([]);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("⛔ la RELECTURE qui échoue (500, puis exception) : `[]`, jamais la liste vide gardée prise pour une réponse, jamais une exception", async () => {
    stubFetchSuite(reponse(200, []), reponse(500, { message: "boom" }));
    expect(await lire()).toEqual([]);
    stubFetchSuite(reponse(200, []), new TypeError("fetch failed"));
    expect(await lire()).toEqual([]);
  });
});
