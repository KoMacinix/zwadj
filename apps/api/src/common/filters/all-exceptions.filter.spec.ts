// Point B, volet API — le 404 de ROUTAGE entre dans la forme commune.
//
// ⚠ CE QUI EST EN JEU. Toute erreur métier du dépôt sort en
// `{ statusCode, message: { code, message }, path, timestamp }`, et
// `packages/api-client` lit `body.message?.code`. Une route inconnue, elle,
// sortait en `message: "Cannot GET /api/v1/salles"` — une chaîne. L'appelant y
// trouvait `undefined` et repliait sur « UNKNOWN » : une faute de frappe dans
// une URL et une panne serveur devenaient indiscernables côté client.
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { AllExceptionsFilter, ROUTE_NOT_FOUND } from "./all-exceptions.filter";

/** Hôte minimal : seuls `getResponse` et `getRequest` sont lus par le filtre. */
function host(url = "/api/v1/inconnu") {
  const json = vi.fn<(body: unknown) => void>();
  const status = vi.fn<(code: number) => { json: typeof json }>(() => ({ json }));
  return {
    host: { switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ url }) }) } as unknown as ArgumentsHost,
    status,
    json
  };
}

type Enveloppe = { statusCode: number; message: unknown; path: string; timestamp: string };

const rendu = (exception: unknown, url?: string): { statut: number; corps: Enveloppe } => {
  const h = host(url);
  new AllExceptionsFilter().catch(exception, h.host);
  // ⚠ Indexation VÉRIFIÉE (`noUncheckedIndexedAccess`) : sur un filtre qui
  // n'aurait rien écrit, l'échec doit dire « n'a rien rendu », pas « cannot
  // read property of undefined ».
  const appelStatus = h.status.mock.calls[0];
  const appelJson = h.json.mock.calls[0];
  if (appelStatus === undefined || appelJson === undefined) throw new Error("le filtre n'a rien rendu");
  return { statut: appelStatus[0], corps: appelJson[0] as Enveloppe };
};

describe("AllExceptionsFilter — 404 de routage", () => {
  it("⚠ ROUTE INCONNUE : l'enveloppe automatique de Nest devient `{ code, message }`", () => {
    // ⚠ Forme MESURÉE de ce que Nest fabrique faute de contrôleur :
    // { message: "Cannot GET …", error: "Not Found", statusCode: 404 }. Ce
    // n'est PAS une chaîne — la première version de ce filtre testait
    // `typeof body === "string"` et ne se serait jamais déclenchée.
    const { statut, corps } = rendu(new NotFoundException("Cannot GET /api/v1/inconnu"));
    expect(statut).toBe(HttpStatus.NOT_FOUND);
    expect(corps.message).toEqual({ code: ROUTE_NOT_FOUND, message: "common.errors.routeNotFound" });
  });

  it("⚠ UN 404 MÉTIER N'EST PAS TOUCHÉ : son code est un contrat que les deux fronts consomment", () => {
    // La garde qui compte. Réécrire tous les 404 aurait effacé
    // `VENUE_NOT_FOUND`, `BOOKING_NOT_FOUND`… et cassé chaque écran qui les
    // traduit — sans qu'aucun test de routage ne s'en aperçoive.
    const metier = { code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" };
    expect(rendu(new NotFoundException(metier)).corps.message).toEqual(metier);
  });

  it("les autres statuts traversent INTACTS, enveloppe automatique comprise", () => {
    // Attendu RELEVÉ du système, pas rédigé : Nest enveloppe la chaîne.
    expect(rendu(new BadRequestException("Validation failed")).corps.message).toEqual({
      message: "Validation failed",
      error: "Bad Request",
      statusCode: 400
    });
    const issues = { issues: [{ path: "email", message: "auth.validation.emailInvalid" }] };
    expect(rendu(new BadRequestException(issues)).corps.message).toEqual(issues);
  });

  it("⚠ UN 404 SANS `code` mais AVEC un corps objet est bien réécrit", () => {
    // Le cas exact que la première version ratait : c'est la forme normale du
    // 404 de routage, et elle n'est pas une chaîne.
    const brut = { message: "Cannot POST /api/v1/x", error: "Not Found", statusCode: 404 };
    expect(rendu(new NotFoundException(brut)).corps.message).toEqual({
      code: ROUTE_NOT_FOUND,
      message: "common.errors.routeNotFound"
    });
  });

  it("une exception NON HTTP reste un 500 opaque : jamais de détail interne en sortie", () => {
    const { statut, corps } = rendu(new Error("connect ECONNREFUSED 10.0.0.4:5432"));
    expect(statut).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(corps.message).toBe("Internal server error");
    expect(JSON.stringify(corps)).not.toContain("ECONNREFUSED");
  });

  it("l'enveloppe garde `path` et `timestamp` — le contrat n'a pas bougé", () => {
    const { corps } = rendu(new HttpException("x", 418), "/api/v1/the/pot");
    expect(corps.path).toBe("/api/v1/the/pot");
    expect(typeof corps.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(corps.timestamp))).toBe(false);
  });
});
