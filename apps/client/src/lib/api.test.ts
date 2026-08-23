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
import { searchVenues } from "./api";

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
