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

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };
const PRO = {
  role: "PRO",
  email: "salle@example.dz",
  password: "Motdepasse1",
  businessName: "Salle El Ryad",
  phone: "+213551234567",
  locale: "ar"
};

describe("POST /api/v1/auth/login (intégration, base réelle)", () => {
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

  const login = (email: string, password: string) =>
    request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });

  it("CLIENT non vérifié (D1) : 200, emailVerified:false pour le bandeau, access token + cookie refresh", async () => {
    await registerUser(ctx, CLIENT);
    const res = await login(CLIENT.email, CLIENT.password);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: "aya@example.dz",
      role: "CLIENT",
      emailVerified: false,
      firstName: "Aya",
      proProfile: null
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect((res.body.accessToken as string).split(".")).toHaveLength(3);
    expect(refreshCookieOf(res)).toBeDefined();
  });

  it("cookie zwadj_rt conforme D2/D7 : httpOnly, SameSite=Lax, Path=/api/v1/auth, Expires, valeur 256 bits ; JAMAIS dans le corps", async () => {
    await registerUser(ctx, CLIENT);
    const res = await login(CLIENT.email, CLIENT.password);

    const cookie = refreshCookieOf(res);
    expect(cookie).toBeDefined();
    expect(cookie!.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookie!.attributes).toContain("HttpOnly");
    expect(cookie!.attributes).toContain("Path=/api/v1/auth");
    expect(cookie!.attributes).toContain("SameSite=Lax");
    expect(cookie!.attributes).toContain("Expires=");
    expect(cookie!.attributes).not.toContain("Secure"); // env de test : AUTH_COOKIE_SECURE=false
    expect(JSON.stringify(res.body)).not.toContain(cookie!.raw); // D2 : le refresh ne sort QUE par le cookie
  });

  it("D7 : la ligne refresh_tokens porte le SHA-256 du cookie (jamais la valeur brute), expiration alignée", async () => {
    await registerUser(ctx, CLIENT);
    const res = await login(CLIENT.email, CLIENT.password);
    const raw = refreshCookieOf(res)!.raw;

    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(rows[0]!.tokenHash).not.toContain(raw.slice(0, 10));
    expect(rows[0]!.revokedAt).toBeNull();

    const expiresAttr = refreshCookieOf(res)!.attributes.match(/Expires=([^;]+)/)![1]!;
    expect(Math.abs(new Date(expiresAttr).getTime() - rows[0]!.expiresAt.getTime())).toBeLessThan(1000);

    // ~30 jours (défaut env) — borne large pour ne pas coupler le test à la valeur exacte
    const days = (rows[0]!.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(1);
  });

  it("PRO non vérifié (D1) : 403 EMAIL_NOT_VERIFIED, AUCUN cookie, AUCUNE session créée", async () => {
    await registerUser(ctx, PRO);
    const res = await login(PRO.email, PRO.password);

    expect(res.status).toBe(403);
    expect(res.body.message).toEqual({ code: "EMAIL_NOT_VERIFIED", message: "auth.errors.emailNotVerified" });
    expect(refreshCookieOf(res)).toBeUndefined();
    expect(await ctx.prisma.refreshToken.count()).toBe(0);
  });

  it("PRO vérifié : 200 avec le bloc proProfile (businessName, phone)", async () => {
    await registerUser(ctx, PRO);
    await verifyLastRegistered(ctx);
    const res = await login(PRO.email, PRO.password);

    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
    // D60 (F1) — les canaux voyagent avec la session dès la connexion.
    expect(res.body.user.proProfile).toEqual({
      businessName: "Salle El Ryad",
      phone: "+213551234567",
      phone2: null,
      notifyByEmail: true,
      notifyBySms: false
    });
  });

  it("ADMIN non vérifié : bloqué comme un PRO (D1 — seul CLIENT est exempté)", async () => {
    await registerUser(ctx, CLIENT);
    await ctx.prisma.user.update({ where: { email: CLIENT.email }, data: { role: "ADMIN" } });
    const res = await login(CLIENT.email, CLIENT.password);

    expect(res.status).toBe(403);
    expect(res.body.message.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("anti-énumération (D5) : email inconnu et mauvais mot de passe → 401 au corps indistinguable", async () => {
    await registerUser(ctx, CLIENT);
    const unknownEmail = await login("inconnu@example.dz", "Motdepasse1");
    const wrongPassword = await login(CLIENT.email, "Mauvaismdp9");

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    // Tout ce qui est comparable doit être IDENTIQUE (seul timestamp varie par nature)
    expect(unknownEmail.body.message).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "auth.errors.invalidCredentials"
    });
    expect(wrongPassword.body.message).toEqual(unknownEmail.body.message);
    expect(wrongPassword.body.statusCode).toBe(unknownEmail.body.statusCode);
    expect(wrongPassword.body.path).toBe(unknownEmail.body.path);
    expect(refreshCookieOf(unknownEmail)).toBeUndefined();
    expect(refreshCookieOf(wrongPassword)).toBeUndefined();
  });

  it("email insensible à la casse au login (normalisation partagée du schéma Zod)", async () => {
    await registerUser(ctx, CLIENT);
    const res = await login("AYA@Example.DZ", CLIENT.password);
    expect(res.status).toBe(200);
  });

  it("claims du JWT (D4) : sub + role, PAS d'email ni d'emailVerified", async () => {
    await registerUser(ctx, CLIENT);
    const res = await login(CLIENT.email, CLIENT.password);
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });

    const claims = JSON.parse(
      Buffer.from((res.body.accessToken as string).split(".")[1]!, "base64url").toString()
    ) as Record<string, unknown>;
    expect(claims.sub).toBe(user.id);
    expect(claims.role).toBe("CLIENT");
    expect(claims).not.toHaveProperty("email");
    expect(claims).not.toHaveProperty("emailVerified");
    expect(typeof claims.exp).toBe("number"); // TTL réellement posé par le JwtModule
  });

  it("deux logins = deux sessions distinctes en base (deux hashes différents)", async () => {
    await registerUser(ctx, CLIENT);
    const a = await login(CLIENT.email, CLIENT.password);
    const b = await login(CLIENT.email, CLIENT.password);

    expect(refreshCookieOf(a)!.raw).not.toBe(refreshCookieOf(b)!.raw);
    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(2);
    expect(rows[0]!.tokenHash).not.toBe(rows[1]!.tokenHash);
  });

  it("payload invalide : 400 avec les clés i18n (email manquant / mot de passe vide)", async () => {
    const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email: "pas-un-email" });
    expect(res.status).toBe(400);
    const issues = res.body.message.issues as { path: string; message: string }[];
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "email", message: "auth.validation.emailInvalid" }),
        expect.objectContaining({ path: "password", message: "auth.validation.passwordRequired" })
      ])
    );
  });
});
