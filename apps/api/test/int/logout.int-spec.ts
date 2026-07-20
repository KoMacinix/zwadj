import { createHash } from "node:crypto";
import request from "supertest";
import { createTestApp, refreshCookieOf, registerUser, truncateAll, type TestContext } from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };

describe("POST /api/v1/auth/logout (intégration — D11 idempotent)", () => {
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
  const logoutWith = (rawCookie?: string) => {
    const req = request(server()).post("/api/v1/auth/logout");
    return rawCookie === undefined ? req : req.set("Cookie", `zwadj_rt=${rawCookie}`);
  };

  it("session valide : 200 {status:'ok'}, ligne révoquée, cookie EFFACÉ aux bons attributs", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;

    const res = await logoutWith(raw);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });

    // La révocation est en base…
    const row = await ctx.prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(raw).digest("hex") }
    });
    expect(row.revokedAt).not.toBeNull();

    // …et le navigateur reçoit l'ordre d'effacement : même nom + même Path
    // (sinon express n'écrase pas le bon cookie), valeur vidée, expiration passée.
    const cleared = refreshCookieOf(res);
    expect(cleared).toBeDefined();
    expect(cleared!.raw).toBe("");
    expect(cleared!.attributes).toContain("Path=/api/v1/auth");
    const expires = cleared!.attributes.match(/Expires=([^;]+)/)![1]!;
    expect(new Date(expires).getTime()).toBeLessThan(Date.now());
  });

  it.each([
    ["sans cookie", undefined],
    ["cookie inconnu", "A".repeat(43)]
  ])("idempotence (%s) : 200 {status:'ok'} constant", async (_label, raw) => {
    const res = await logoutWith(raw as string | undefined);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("double logout : 200 les deux fois, la date de révocation ne bouge pas au second", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;
    const hash = createHash("sha256").update(raw).digest("hex");

    expect((await logoutWith(raw)).status).toBe(200);
    const firstRevokedAt = (await ctx.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hash } }))
      .revokedAt;

    expect((await logoutWith(raw)).status).toBe(200); // rejouer le logout ne lève jamais
    const secondRevokedAt = (await ctx.prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: hash } }))
      .revokedAt;
    expect(secondRevokedAt).toEqual(firstRevokedAt); // updateMany conditionné à revokedAt IS NULL
  });

  it("portée D11 : ne révoque QUE la session de ce navigateur — l'autre appareil continue de refresh", async () => {
    await registerUser(ctx, CLIENT);
    const sessionA = refreshCookieOf(await login())!.raw;
    const sessionB = refreshCookieOf(await login())!.raw;

    await logoutWith(sessionA);

    const stillAlive = await request(server()).post("/api/v1/auth/refresh").set("Cookie", `zwadj_rt=${sessionB}`);
    expect(stillAlive.status).toBe(200); // B n'est pas concerné par le logout de A
  });

  it("rejeu d'un token POST-logout sur /refresh : traité en réutilisation (D10) — strict et assumé", async () => {
    await registerUser(ctx, CLIENT);
    const sessionA = refreshCookieOf(await login())!.raw;
    const sessionB = refreshCookieOf(await login())!.raw;
    await logoutWith(sessionA);

    // Un token révoqué par logout qui RESSERT sur /refresh est indistinguable
    // d'un vol : le cookie a été effacé du navigateur légitime au logout, donc
    // celui qui le rejoue en détient une copie → révocation globale (D10).
    const replay = await request(server()).post("/api/v1/auth/refresh").set("Cookie", `zwadj_rt=${sessionA}`);
    expect(replay.status).toBe(401);
    expect((await request(server()).post("/api/v1/auth/refresh").set("Cookie", `zwadj_rt=${sessionB}`)).status).toBe(
      401
    );
    expect(await ctx.prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });
});
