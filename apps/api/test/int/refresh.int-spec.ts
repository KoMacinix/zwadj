import { createHash } from "node:crypto";
import request from "supertest";
import {
  createTestApp,
  refreshCookieOf,
  registerUser,
  truncateAll,
  verifyLastRegistered,
  type TestContext
} from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya" };

describe("POST /api/v1/auth/refresh (intégration — rotation D9, réutilisation D10, format D12)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    ctx.emails.length = 0;
  });

  const server = () => ctx.app.getHttpServer();
  const login = () =>
    request(server()).post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
  const refreshWith = (rawCookie?: string) => {
    const req = request(server()).post("/api/v1/auth/refresh");
    return rawCookie === undefined ? req : req.set("Cookie", `zwadj_rt=${rawCookie}`);
  };

  it("sans cookie : 401 UNAUTHENTICATED", async () => {
    const res = await refreshWith();
    expect(res.status).toBe(401);
    expect(res.body.message).toEqual({ code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" });
  });

  it("cookie forgé (43 chars valides mais inconnus) : 401, AUCUNE ligne touchée", async () => {
    await registerUser(ctx, CLIENT);
    await login();
    const res = await refreshWith("A".repeat(43));

    expect(res.status).toBe(401);
    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revokedAt).toBeNull(); // la session légitime n'a pas bougé
  });

  it("nominal (D9) : nouveau cookie ≠ ancien, ancienne ligne révoquée, nouvelle active, hash aligné", async () => {
    await registerUser(ctx, CLIENT);
    const oldRaw = refreshCookieOf(await login())!.raw;

    const res = await refreshWith(oldRaw);
    expect(res.status).toBe(200);

    const newCookie = refreshCookieOf(res);
    expect(newCookie).toBeDefined();
    expect(newCookie!.raw).not.toBe(oldRaw); // rotation, pas prolongation
    expect(newCookie!.attributes).toContain("HttpOnly");
    expect(newCookie!.attributes).toContain("Path=/api/v1/auth");
    expect(newCookie!.attributes).toContain("SameSite=Lax");
    expect(JSON.stringify(res.body)).not.toContain(newCookie!.raw); // D2 : jamais dans le corps

    const rows = await ctx.prisma.refreshToken.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(oldRaw).digest("hex"));
    expect(rows[0]!.revokedAt).not.toBeNull(); // l'ancien est consommé
    expect(rows[1]!.tokenHash).toBe(createHash("sha256").update(newCookie!.raw).digest("hex"));
    expect(rows[1]!.revokedAt).toBeNull(); // le neuf est la seule session active
  });

  it("D12 : réponse au format login ({ accessToken, user }), et l'access token émis fonctionne sur /me", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;

    const res = await refreshWith(raw);
    expect(res.body.user).toMatchObject({ email: "aya@example.dz", role: "CLIENT", proProfile: null });

    const me = await request(server())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken as string}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("aya@example.dz");
  });

  it("fraîcheur (D12) : email vérifié ENTRE login et refresh → le refresh renvoie emailVerified:true", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;
    await verifyLastRegistered(ctx);

    const res = await refreshWith(raw);
    expect(res.body.user.emailVerified).toBe(true); // sans re-login : mêmes données fraîches que /me
  });

  it("rotation en chaîne : 3 refresh → 4 lignes, SEULE la dernière active", async () => {
    await registerUser(ctx, CLIENT);
    let raw = refreshCookieOf(await login())!.raw;
    for (let i = 0; i < 3; i++) {
      const res = await refreshWith(raw);
      expect(res.status).toBe(200);
      raw = refreshCookieOf(res)!.raw;
    }

    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
    const active = rows.find((r) => r.revokedAt === null)!;
    expect(active.tokenHash).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("RÉUTILISATION (D10, chaîne complète) : rejouer un token consommé → 401 ET l'autre session du user tombe aussi", async () => {
    await registerUser(ctx, CLIENT);
    const sessionA = refreshCookieOf(await login())!.raw; // appareil A
    const sessionB = refreshCookieOf(await login())!.raw; // appareil B (2e session légitime)

    // A tourne normalement : A est consommé, A2 le remplace
    const rotated = await refreshWith(sessionA);
    const sessionA2 = refreshCookieOf(rotated)!.raw;

    // L'attaquant (ou un rejeu accidentel) présente A, déjà consommé
    const replay = await refreshWith(sessionA);
    expect(replay.status).toBe(401);
    expect(refreshCookieOf(replay)).toBeUndefined(); // aucun successeur émis

    // Révocation GLOBALE : plus aucune session active en base…
    const active = await ctx.prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(active).toBe(0);
    // …et ni A2 (le successeur légitime) ni B (l'autre appareil) ne marchent plus
    expect((await refreshWith(sessionA2)).status).toBe(401);
    expect((await refreshWith(sessionB)).status).toBe(401);
  });

  it("token expiré (non révoqué) : 401 simple — l'AUTRE session du user survit", async () => {
    await registerUser(ctx, CLIENT);
    const expired = refreshCookieOf(await login())!.raw;
    const alive = refreshCookieOf(await login())!.raw;
    await ctx.prisma.refreshToken.update({
      where: { tokenHash: createHash("sha256").update(expired).digest("hex") },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    expect((await refreshWith(expired)).status).toBe(401);
    expect((await refreshWith(alive)).status).toBe(200); // pas de révocation globale sur simple expiration
  });

  it("user supprimé : la cascade FK efface ses lignes → cookie inconnu → 401", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;
    await ctx.prisma.user.delete({ where: { email: CLIENT.email } });

    expect(await ctx.prisma.refreshToken.count()).toBe(0); // preuve de la cascade
    expect((await refreshWith(raw)).status).toBe(401);
  });
});
