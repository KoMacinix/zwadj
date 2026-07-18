import { createHash } from "node:crypto";
import request from "supertest";
import { createTestApp, extractToken, refreshCookieOf, registerUser, truncateAll, type TestContext } from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya" };
const NEW_PASSWORD = "NouveauMdp2";

describe("POST /api/v1/auth/reset-password (intégration — D15/D16/D17)", () => {
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
  const login = (password: string) =>
    request(server()).post("/api/v1/auth/login").send({ email: CLIENT.email, password });
  const reset = (token: string, password: string) =>
    request(server()).post("/api/v1/auth/reset-password").send({ token, password });
  /** register + forgot → retourne le token de reset extrait de l'email réel. */
  const obtainResetToken = async (): Promise<string> => {
    await request(server()).post("/api/v1/auth/forgot-password").send({ email: CLIENT.email });
    return extractToken(ctx.emails.at(-1)!.text);
  };

  it("flux complet : reset → 200, l'ANCIEN mot de passe est refusé, le NOUVEAU connecte", async () => {
    await registerUser(ctx, CLIENT);
    const token = await obtainResetToken();

    const res = await reset(token, NEW_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });

    expect((await login(CLIENT.password)).status).toBe(401); // l'ancien ne passe plus
    expect((await login(NEW_PASSWORD)).status).toBe(200); // le nouveau connecte
  });

  it("D15 : TOUTES les sessions actives tombent au reset — les deux refresh échouent ensuite", async () => {
    await registerUser(ctx, CLIENT);
    const sessionA = refreshCookieOf(await login(CLIENT.password))!.raw;
    const sessionB = refreshCookieOf(await login(CLIENT.password))!.raw;
    const token = await obtainResetToken();

    await reset(token, NEW_PASSWORD);

    expect(await ctx.prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
    for (const raw of [sessionA, sessionB]) {
      const res = await request(server()).post("/api/v1/auth/refresh").set("Cookie", `zwadj_rt=${raw}`);
      expect(res.status).toBe(401); // l'éventuel attaquant est déconnecté aussi
    }
  });

  it("D16 usage unique : rejouer le MÊME token → 400 TOKEN_INVALID_OR_EXPIRED, le mdp ne rechange pas", async () => {
    await registerUser(ctx, CLIENT);
    const token = await obtainResetToken();
    await reset(token, NEW_PASSWORD);

    const replay = await reset(token, "EncoreUnAutre3");
    expect(replay.status).toBe(400);
    expect(replay.body.message).toEqual({
      code: "TOKEN_INVALID_OR_EXPIRED",
      message: "auth.errors.tokenInvalidOrExpired"
    });
    expect((await login(NEW_PASSWORD)).status).toBe(200); // toujours le mdp du 1er reset
    expect((await login("EncoreUnAutre3")).status).toBe(401);
  });

  it("token expiré : 400 (même code — D16), le mot de passe n'a PAS changé", async () => {
    await registerUser(ctx, CLIENT);
    const token = await obtainResetToken();
    await ctx.prisma.passwordResetToken.updateMany({
      where: { tokenHash: createHash("sha256").update(token).digest("hex") },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    expect((await reset(token, NEW_PASSWORD)).status).toBe(400);
    expect((await login(CLIENT.password)).status).toBe(200); // l'ancien mdp fonctionne toujours
  });

  it("token inconnu (43 chars forgés) : 400, même code que expiré/consommé — pas d'oracle", async () => {
    const res = await reset("A".repeat(43), NEW_PASSWORD);
    expect(res.status).toBe(400);
    expect(res.body.message.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });

  it("mot de passe faible : 400 de validation avec les clés i18n partagées (mêmes règles qu'au register)", async () => {
    await registerUser(ctx, CLIENT);
    const token = await obtainResetToken();

    const res = await reset(token, "court1");
    expect(res.status).toBe(400);
    const issues = res.body.message.issues as { path: string; message: string }[];
    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "password", message: "auth.validation.passwordTooShort" })])
    );
    // le token n'est PAS consommé par une tentative invalide : il resservira
    expect((await reset(token, NEW_PASSWORD)).status).toBe(200);
  });

  it("D17 : le reset ne connecte pas (aucun Set-Cookie) et ne vérifie pas l'email (flux distincts)", async () => {
    await registerUser(ctx, CLIENT);
    const token = await obtainResetToken();

    const res = await reset(token, NEW_PASSWORD);
    expect(refreshCookieOf(res)).toBeUndefined(); // ni cookie…
    expect(JSON.stringify(res.body)).not.toContain("accessToken"); // …ni access token

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });
    expect(user.emailVerifiedAt).toBeNull(); // posséder la boîte mail ne vaut PAS vérification ici
  });
});
