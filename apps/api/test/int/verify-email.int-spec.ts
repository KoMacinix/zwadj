import request from "supertest";
import { createTestApp, extractToken, truncateAll, type TestContext } from "./helpers";

describe("GET /api/v1/auth/verify-email/:token (intégration)", () => {
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

  async function registerAndGetToken(email = "aya@example.dz"): Promise<string> {
    await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email, password: "Motdepasse1" });
    return extractToken(ctx.emails.at(-1)!.text);
  }

  it("flux complet : le lien reçu vérifie l'email (usage unique)", async () => {
    const token = await registerAndGetToken();
    const server = ctx.app.getHttpServer();

    const ok = await request(server).get(`/api/v1/auth/verify-email/${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ status: "verified" });

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    expect(user.emailVerifiedAt).not.toBeNull();
    const dbToken = await ctx.prisma.emailVerificationToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(dbToken.usedAt).not.toBeNull();

    // Rejeu du même token : refusé, un seul code (pas d'oracle)
    const replay = await request(server).get(`/api/v1/auth/verify-email/${token}`);
    expect(replay.status).toBe(400);
    expect(replay.body.message.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });

  it("token inconnu (forme valide) : 400 TOKEN_INVALID_OR_EXPIRED", async () => {
    const res = await request(ctx.app.getHttpServer()).get(`/api/v1/auth/verify-email/${"A".repeat(43)}`);
    expect(res.status).toBe(400);
    expect(res.body.message.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });

  it("token expiré : 400, l'email reste non vérifié", async () => {
    const token = await registerAndGetToken();
    await ctx.prisma.emailVerificationToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(ctx.app.getHttpServer()).get(`/api/v1/auth/verify-email/${token}`);
    expect(res.status).toBe(400);
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("token malformé : 400 de validation (clé i18n), sans toucher la base", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/auth/verify-email/court");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.message.issues)).toContain("auth.validation.tokenInvalid");
  });

  it("email déjà vérifié + second token valide : consommé, date de vérification inchangée", async () => {
    const token = await registerAndGetToken();
    const server = ctx.app.getHttpServer();
    await request(server).get(`/api/v1/auth/verify-email/${token}`);
    const first = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } })).emailVerifiedAt!;

    // Nouveau lien demandé après coup (resend) puis cliqué
    await request(server).post("/api/v1/auth/resend-verification").send({ email: "aya@example.dz" });
    // déjà vérifié → resend n'envoie rien ; on force un second token en base pour le cas limite
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    const { TokenService } = await import("../../src/auth/token.service");
    const tokens = new TokenService();
    const raw2 = tokens.generate();
    await ctx.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: tokens.hash(raw2), expiresAt: new Date(Date.now() + 3_600_000) }
    });

    const res = await request(server).get(`/api/v1/auth/verify-email/${raw2}`);
    expect(res.status).toBe(200);
    const after = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } })).emailVerifiedAt!;
    expect(after.toISOString()).toBe(first.toISOString()); // on garde la première date
  });
});
