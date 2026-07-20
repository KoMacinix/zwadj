import request from "supertest";
import { createTestApp, extractToken, truncateAll, type TestContext } from "./helpers";

describe("POST /api/v1/auth/resend-verification (intégration, anti-énumération)", () => {
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

  it("email inconnu : 202 {status:'ok'} constant, aucun email envoyé", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/resend-verification")
      .send({ email: "inconnu@example.dz" });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "ok" });
    expect(ctx.emails).toHaveLength(0);
  });

  it("compte non vérifié : 202, nouveau lien envoyé, l'ANCIEN token devient invalide", async () => {
    const server = ctx.app.getHttpServer();
    await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });
    const oldToken = extractToken(ctx.emails[0]!.text);

    const res = await request(server).post("/api/v1/auth/resend-verification").send({ email: "aya@example.dz" });
    expect(res.status).toBe(202);
    expect(ctx.emails).toHaveLength(2);
    const newToken = extractToken(ctx.emails[1]!.text);
    expect(newToken).not.toBe(oldToken);

    // Un seul lien valide à la fois : l'ancien est tombé, le nouveau fonctionne
    expect((await request(server).get(`/api/v1/auth/verify-email/${oldToken}`)).status).toBe(400);
    expect((await request(server).get(`/api/v1/auth/verify-email/${newToken}`)).status).toBe(200);
  });

  it("compte déjà vérifié : 202 constant, aucun nouvel email", async () => {
    const server = ctx.app.getHttpServer();
    await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });
    const token = extractToken(ctx.emails[0]!.text);
    await request(server).get(`/api/v1/auth/verify-email/${token}`);
    ctx.emails.length = 0;

    const res = await request(server).post("/api/v1/auth/resend-verification").send({ email: "aya@example.dz" });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "ok" });
    expect(ctx.emails).toHaveLength(0);
  });
});
