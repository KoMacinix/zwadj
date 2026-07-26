import request from "supertest";
import {
  createTestApp,
  loginAs,
  registerUser,
  truncateAll,
  verifyLastRegistered,
  type TestContext
} from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };
const PRO = {
  role: "PRO",
  email: "salle@example.dz",
  password: "Motdepasse1",
  businessName: "Salle El Ryad",
  phone: "+213551234567"
};

describe("GET /api/v1/auth/me (intégration — JwtAuthGuard réel + lecture fraîche)", () => {
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

  const me = (token?: string) => {
    const req = request(ctx.app.getHttpServer()).get("/api/v1/auth/me");
    return token === undefined ? req : req.set("Authorization", `Bearer ${token}`);
  };

  it("sans token : 401 UNAUTHENTICATED (fermé par défaut)", async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.message).toEqual({ code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" });
  });

  it("token à la signature invalide : 401 — le guard vérifie vraiment HS256", async () => {
    await registerUser(ctx, CLIENT);
    const good = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const [h, p] = good.split(".");
    const res = await me(`${h}.${p}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
    expect(res.status).toBe(401);
  });

  it("CLIENT authentifié : 200 avec le DTO complet (jamais le hash)", async () => {
    await registerUser(ctx, CLIENT);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const res = await me(token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: "aya@example.dz",
      role: "CLIENT",
      locale: "fr",
      emailVerified: false,
      firstName: "Aya",
      lastName: "Boudiaf",
      proProfile: null
    });
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("emailVerifiedAt");
  });

  it("FRAÎCHEUR (raison d'être de D4) : email vérifié APRÈS le login → /me le voit avec le MÊME token", async () => {
    await registerUser(ctx, CLIENT);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);

    expect((await me(token)).body.emailVerified).toBe(false); // avant vérification
    await verifyLastRegistered(ctx); // l'utilisateur clique le lien pendant sa session
    const after = await me(token); // token INCHANGÉ

    expect(after.status).toBe(200);
    expect(after.body.emailVerified).toBe(true); // le bandeau D1 peut tomber sans re-login
  });

  it("PRO vérifié : le bloc proProfile est exposé", async () => {
    await registerUser(ctx, PRO);
    await verifyLastRegistered(ctx);
    const token = await loginAs(ctx, PRO.email, PRO.password);
    const res = await me(token);

    expect(res.status).toBe(200);
    expect(res.body.proProfile).toEqual({ businessName: "Salle El Ryad", phone: "+213551234567", phone2: null });
  });

  it("compte supprimé après émission du token : 401 (l'identité n'existe plus)", async () => {
    await registerUser(ctx, CLIENT);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);
    await ctx.prisma.user.delete({ where: { email: CLIENT.email } });

    const res = await me(token);
    expect(res.status).toBe(401);
    expect(res.body.message.code).toBe("UNAUTHENTICATED");
  });
});
