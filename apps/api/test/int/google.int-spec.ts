import request from "supertest";
import type { GoogleIdTokenPayload } from "../../src/auth/google.types";
import { createTestApp, extractToken, refreshCookieOf, registerUser, truncateAll, type TestContext } from "./helpers";

/**
 * /auth/google (Lot 8) contre la VRAIE base : création, liaison, refus par
 * rôle, anti-énumération étendue (D5) et parcours hybride mot de passe ↔
 * Google. Le port Google est substitué par la table ctx.googleTokens
 * (helpers) — un token absent de la table est invalide ; la vérification
 * contre Google réel relève de la validation locale (GOOGLE_CLIENT_ID).
 */

const PAYLOAD: GoogleIdTokenPayload = {
  sub: "google-sub-aya",
  email: "aya@example.dz",
  emailVerified: true,
  givenName: "Aya",
  familyName: "Boudiaf"
};
const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };
const PRO = {
  role: "PRO",
  email: "salle@example.dz",
  password: "Motdepasse1",
  businessName: "Salle El Ryad",
  phone: "+213551234567"
};

describe("POST /api/v1/auth/google (intégration, base réelle — Lot 8)", () => {
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
    ctx.googleTokens.clear();
  });

  const server = () => ctx.app.getHttpServer();
  const google = (body: Record<string, unknown>) => request(server()).post("/api/v1/auth/google").send(body);
  const login = (email: string, password: string) =>
    request(server()).post("/api/v1/auth/login").send({ email, password });

  it("token inconnu du vérificateur : 401 GOOGLE_TOKEN_INVALID, aucun compte créé", async () => {
    const res = await google({ idToken: "jamais-vu" });

    expect(res.status).toBe(401);
    expect(res.body.message).toEqual({ code: "GOOGLE_TOKEN_INVALID", message: "auth.errors.googleTokenInvalid" });
    expect(await ctx.prisma.user.count()).toBe(0);
  });

  it("corps invalide (idToken vide) : 400 Zod AVANT tout appel au vérificateur", async () => {
    const res = await google({ idToken: "" });

    expect(res.status).toBe(400);
    const issues = res.body.message.issues as { path: string }[];
    expect(issues.some((i) => i.path === "idToken")).toBe(true);
  });

  it("email_verified=false côté Google : 403 GOOGLE_EMAIL_NOT_VERIFIED, aucun compte créé", async () => {
    ctx.googleTokens.set("tok-non-verifie", { ...PAYLOAD, emailVerified: false });
    const res = await google({ idToken: "tok-non-verifie" });

    expect(res.status).toBe(403);
    expect(res.body.message.code).toBe("GOOGLE_EMAIL_NOT_VERIFIED");
    expect(await ctx.prisma.user.count()).toBe(0);
  });

  it("email introuvable : création CLIENT — 200, DTO complet, cookie persistant (D30), état en base conforme", async () => {
    ctx.googleTokens.set("tok-aya", PAYLOAD);
    const res = await google({ idToken: "tok-aya", locale: "ar" });

    expect(res.status).toBe(200); // sémantique « se connecter », même à la création
    expect(res.body.user).toMatchObject({
      email: "aya@example.dz",
      role: "CLIENT",
      locale: "ar", // la locale du front n'est utilisée QU'à la création
      emailVerified: true,
      firstName: "Aya",
      lastName: "Boudiaf",
      proProfile: null
    });
    expect(res.body.user).not.toHaveProperty("googleSub"); // jamais exposé au DTO
    expect((res.body.accessToken as string).split(".")).toHaveLength(3);

    // D30 — cookie TOUJOURS persistant : Expires présent (pas un cookie de session).
    const cookie = refreshCookieOf(res);
    expect(cookie).toBeDefined();
    expect(cookie!.attributes).toMatch(/expires=/i);
    expect(cookie!.attributes.toLowerCase()).toContain("httponly");

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    expect(user.passwordHash).toBeNull(); // compte Google-only
    expect(user.googleSub).toBe("google-sub-aya");
    expect(user.emailVerifiedAt).not.toBeNull(); // Google a déjà vérifié cet email
    expect(user.locale).toBe("ar");
  });

  it("second login Google (même token) : AUCUN doublon — même compte, nouvelle session", async () => {
    ctx.googleTokens.set("tok-aya", PAYLOAD);
    expect((await google({ idToken: "tok-aya" })).status).toBe(200);
    const again = await google({ idToken: "tok-aya" });

    expect(again.status).toBe(200);
    expect(await ctx.prisma.user.count()).toBe(1);
    expect(await ctx.prisma.refreshToken.count()).toBe(2); // une session par login
    expect(refreshCookieOf(again)!.attributes).toMatch(/expires=/i); // D30 aussi en pure connexion
  });

  it("compte classique CLIENT existant (non vérifié) : liaison — googleSub posé, email marqué vérifié, mot de passe conservé", async () => {
    await registerUser(ctx, CLIENT); // via la vraie route : hash argon2, emailVerifiedAt null
    ctx.googleTokens.set("tok-aya", PAYLOAD);

    const res = await google({ idToken: "tok-aya" });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true); // backfill : Google a vérifié CET email

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });
    expect(user.googleSub).toBe("google-sub-aya");
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).not.toBeNull(); // compte HYBRIDE : le mot de passe reste valable

    expect((await login(CLIENT.email, CLIENT.password)).status).toBe(200); // les deux voies coexistent
  });

  it("email lié à un compte PRO : 403 GOOGLE_ACCOUNT_NOT_CLIENT — AUCUNE liaison effectuée", async () => {
    await registerUser(ctx, PRO);
    ctx.googleTokens.set("tok-salle", { ...PAYLOAD, sub: "google-sub-salle", email: PRO.email });

    const res = await google({ idToken: "tok-salle" });
    expect(res.status).toBe(403);
    expect(res.body.message).toEqual({
      code: "GOOGLE_ACCOUNT_NOT_CLIENT",
      message: "auth.errors.googleAccountNotClient"
    });

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: PRO.email } });
    expect(user.googleSub).toBeNull();
    expect(user.emailVerifiedAt).toBeNull(); // pas de backfill non plus
  });

  it("login classique sur compte Google-only : 401 au corps IDENTIQUE à « email inconnu » (D5 étendu)", async () => {
    ctx.googleTokens.set("tok-aya", PAYLOAD);
    await google({ idToken: "tok-aya" }); // crée le compte sans mot de passe

    const googleOnly = await login("aya@example.dz", "Motdepasse1");
    const unknown = await login("inconnu@example.dz", "Motdepasse1");

    expect(googleOnly.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(googleOnly.body.message).toEqual(unknown.body.message); // aucun oracle
    expect(googleOnly.body.message).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "auth.errors.invalidCredentials"
    });
  });

  it("parcours HYBRIDE : compte Google-only → forgot/reset pose un mot de passe → les DEUX voies connectent", async () => {
    ctx.googleTokens.set("tok-aya", PAYLOAD);
    await google({ idToken: "tok-aya" });

    // forgot-password fonctionne sur un compte sans mot de passe (cadrage OAuth, P1)
    const forgot = await request(server()).post("/api/v1/auth/forgot-password").send({ email: "aya@example.dz" });
    expect(forgot.status).toBe(202);
    const token = extractToken(ctx.emails.at(-1)!.text);

    const reset = await request(server())
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "NouveauMdp2" });
    expect(reset.status).toBe(200);

    expect((await login("aya@example.dz", "NouveauMdp2")).status).toBe(200); // voie mot de passe ouverte
    expect((await google({ idToken: "tok-aya" })).status).toBe(200); // voie Google toujours ouverte
    expect(await ctx.prisma.user.count()).toBe(1);
  });

  it("même email, identité Google DIFFÉRENTE (sub ≠) : 409 GOOGLE_ACCOUNT_CONFLICT, le lien existant est intact", async () => {
    ctx.googleTokens.set("tok-a", PAYLOAD);
    ctx.googleTokens.set("tok-b", { ...PAYLOAD, sub: "google-sub-usurpateur" });
    await google({ idToken: "tok-a" });

    const res = await google({ idToken: "tok-b" });
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("GOOGLE_ACCOUNT_CONFLICT");

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    expect(user.googleSub).toBe("google-sub-aya"); // pas d'écrasement silencieux
  });
});
