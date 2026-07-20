import type { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { GoogleAuthLibraryVerifier } from "./google-verifier";
import { GoogleAuthDisabledError, GoogleTokenInvalidError } from "./google.types";

/**
 * Adapter réel du port Google (Lot 8) : la SEULE logique maison est ici testée —
 * garde « fonctionnalité éteinte », enveloppement d'erreurs sans oracle,
 * audience transmise, normalisation des claims. `google-auth-library` est
 * mockée (exception assumée à la convention « pas de vi.mock » : le réseau
 * Google est la frontière même que ce fichier encapsule) ; la vérification
 * réelle contre Google relève de la validation locale avec un vrai
 * GOOGLE_CLIENT_ID.
 */

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(() => ({ verifyIdToken }))
}));

const CLIENT_ID = "1234567890-abc.apps.googleusercontent.com";

function makeVerifier(clientId: string | undefined): GoogleAuthLibraryVerifier {
  const config = { get: vi.fn().mockReturnValue(clientId) };
  return new GoogleAuthLibraryVerifier(config as unknown as ConfigService);
}

function ticketWith(payload: Record<string, unknown> | undefined): { getPayload: () => unknown } {
  return { getPayload: () => payload };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GoogleAuthLibraryVerifier (adapter google-auth-library, Lot 8)", () => {
  it("GOOGLE_CLIENT_ID absente : GoogleAuthDisabledError — la lib n'est JAMAIS sollicitée", async () => {
    const verifier = makeVerifier(undefined);

    await expect(verifier.verify("tok")).rejects.toBeInstanceOf(GoogleAuthDisabledError);
    expect(OAuth2Client).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("transmet idToken ET audience = GOOGLE_CLIENT_ID (un token authentique d'une AUTRE app est rejeté par la lib)", async () => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: "s-1", email: "aya@example.dz", email_verified: true })
    );

    await verifier.verify("tok-gis");

    expect(OAuth2Client).toHaveBeenCalledWith(CLIENT_ID);
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "tok-gis", audience: CLIENT_ID });
  });

  it("la lib rejette (signature/audience/expiration/forme) : UN seul GoogleTokenInvalidError, sans détail", async () => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockRejectedValue(new Error("Token used too late : détail interne de la lib"));

    await expect(verifier.verify("tok")).rejects.toBeInstanceOf(GoogleTokenInvalidError);
  });

  it.each([
    ["payload absent", undefined],
    ["sans sub", { email: "aya@example.dz", email_verified: true }],
    ["sans email", { sub: "s-1", email_verified: true }]
  ])("ticket %s : GoogleTokenInvalidError (claims essentiels manquants)", async (_label, payload) => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockResolvedValue(ticketWith(payload as Record<string, unknown> | undefined));

    await expect(verifier.verify("tok")).rejects.toBeInstanceOf(GoogleTokenInvalidError);
  });

  it("mapping heureux : email trim+lowercase (aligné emailSchema), noms projetés, emailVerified strict", async () => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockResolvedValue(
      ticketWith({
        sub: "s-1",
        email: " AYA@Example.DZ ",
        email_verified: true,
        given_name: "Aya",
        family_name: "Boudiaf"
      })
    );

    await expect(verifier.verify("tok")).resolves.toEqual({
      sub: "s-1",
      email: "aya@example.dz",
      emailVerified: true,
      givenName: "Aya",
      familyName: "Boudiaf"
    });
  });

  it("claims optionnels absents : noms → null, email_verified absent → false (jamais « vérifié par défaut »)", async () => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockResolvedValue(ticketWith({ sub: "s-1", email: "aya@example.dz" }));

    await expect(verifier.verify("tok")).resolves.toEqual({
      sub: "s-1",
      email: "aya@example.dz",
      emailVerified: false,
      givenName: null,
      familyName: null
    });
  });

  it("client OAuth2 construit UNE fois puis réutilisé (paresseux — l'API boote sans Google)", async () => {
    const verifier = makeVerifier(CLIENT_ID);
    verifyIdToken.mockResolvedValue(ticketWith({ sub: "s-1", email: "aya@example.dz", email_verified: true }));

    await verifier.verify("tok-1");
    await verifier.verify("tok-2");

    expect(OAuth2Client).toHaveBeenCalledTimes(1);
  });
});
