import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Public } from "./auth.decorators";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";
import { JwtAuthGuard } from "./jwt-auth.guard";

const SECRET = "unit-test-secret-0123456789-0123456789";
const jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: "15m" } });

// Contrôleurs-sondes : le Reflector RÉEL lit les métadonnées posées par les
// VRAIS décorateurs — le spec prouve donc guard ET décorateur ensemble.
class ProtectedProbe {
  handler(): void {}
}
class PublicMethodProbe {
  @Public()
  handler(): void {}
}
@Public()
class PublicClassProbe {
  handler(): void {}
}

interface FakeRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

function contextFor(probe: { new (): { handler(): void } }, request: FakeRequest): ExecutionContext {
  return {
    getHandler: () => probe.prototype.handler,
    getClass: () => probe,
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard (fermé par défaut, @Public pour ouvrir — D6)", () => {
  const guard = new JwtAuthGuard(jwt, new Reflector());
  const payload: AccessTokenPayload = { sub: "user-123", role: "CLIENT" };

  it("laisse passer une route @Public (méthode) sans regarder l'Authorization", async () => {
    const request: FakeRequest = { headers: {} };
    await expect(guard.canActivate(contextFor(PublicMethodProbe, request))).resolves.toBe(true);
    expect(request.user).toBeUndefined(); // pas d'identité fabriquée en douce
  });

  it("laisse passer un contrôleur @Public (classe) — motif /health", async () => {
    await expect(guard.canActivate(contextFor(PublicClassProbe, { headers: {} }))).resolves.toBe(true);
  });

  it("token valide : passe et attache { userId, role } à la requête", async () => {
    const request: FakeRequest = { headers: { authorization: `Bearer ${await jwt.signAsync(payload)}` } };
    await expect(guard.canActivate(contextFor(ProtectedProbe, request))).resolves.toBe(true);
    expect(request.user).toEqual({ userId: "user-123", role: "CLIENT" });
  });

  it("schéma « bearer » insensible à la casse (RFC 7235)", async () => {
    const request: FakeRequest = { headers: { authorization: `bearer ${await jwt.signAsync(payload)}` } };
    await expect(guard.canActivate(contextFor(ProtectedProbe, request))).resolves.toBe(true);
  });

  const expectUnauthenticated = async (request: FakeRequest): Promise<void> => {
    const attempt = guard.canActivate(contextFor(ProtectedProbe, request));
    await expect(attempt).rejects.toThrow(UnauthorizedException);
    await attempt.catch((e: UnauthorizedException) => {
      expect(e.getResponse()).toEqual({ code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" });
    });
  };

  it("sans header Authorization : 401 UNAUTHENTICATED", async () => {
    await expectUnauthenticated({ headers: {} });
  });

  it.each([
    ["schéma inconnu", "Token abc"],
    ["Bearer sans token", "Bearer"],
    ["Bearer avec espaces surnuméraires", "Bearer a b"],
    ["token nu sans schéma", "abc.def.ghi"]
  ])("header malformé (%s) : 401 UNAUTHENTICATED", async (_label, authorization) => {
    await expectUnauthenticated({ headers: { authorization } });
  });

  it("signature invalide (autre secret) : 401 — même code, pas de détail exploitable", async () => {
    const other = new JwtService({ secret: "another-secret-9876543210-9876543210" });
    await expectUnauthenticated({ headers: { authorization: `Bearer ${await other.signAsync(payload)}` } });
  });

  it("token expiré : 401 — même code que les autres échecs (pas d'oracle)", async () => {
    const expired = await jwt.signAsync(payload, { expiresIn: "-10s" });
    await expectUnauthenticated({ headers: { authorization: `Bearer ${expired}` } });
  });

  it("token forgé « alg: none » : rejeté (la vérification exige la signature HS256)", async () => {
    const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString("base64url");
    const forged = `${b64({ alg: "none", typ: "JWT" })}.${b64({ ...payload, exp: 9999999999 })}.`;
    await expectUnauthenticated({ headers: { authorization: `Bearer ${forged}` } });
  });
});
