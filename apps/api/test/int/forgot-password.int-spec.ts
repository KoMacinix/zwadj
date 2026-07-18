import { createHash } from "node:crypto";
import request from "supertest";
import { createTestApp, extractToken, registerUser, truncateAll, type TestContext } from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya" };
const PRO = {
  role: "PRO",
  email: "salle@example.dz",
  password: "Motdepasse1",
  businessName: "Salle El Ryad",
  phone: "+213551234567",
  locale: "ar"
};

describe("POST /api/v1/auth/forgot-password (intégration — D14 anti-énumération)", () => {
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

  const forgot = (email: string) =>
    request(ctx.app.getHttpServer()).post("/api/v1/auth/forgot-password").send({ email });

  it("email inconnu : 202 { status: 'ok' } constant, AUCUN email, AUCUNE ligne", async () => {
    const res = await forgot("inconnu@example.dz");
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "ok" });
    expect(ctx.emails).toHaveLength(0);
    expect(await ctx.prisma.passwordResetToken.count()).toBe(0);
  });

  it("compte existant : 202 IDENTIQUE, email de reset envoyé, hash (jamais le brut) en base, TTL ~30 min", async () => {
    await registerUser(ctx, CLIENT);
    ctx.emails.length = 0; // on écarte l'email de vérification du register

    const res = await forgot(CLIENT.email);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "ok" }); // même corps que le cas inconnu

    expect(ctx.emails).toHaveLength(1);
    const raw = extractToken(ctx.emails[0]!.text);

    const rows = await ctx.prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(rows[0]!.usedAt).toBeNull();
    const ttlMinutes = (rows[0]!.expiresAt.getTime() - Date.now()) / 60_000;
    expect(ttlMinutes).toBeGreaterThan(28);
    expect(ttlMinutes).toBeLessThanOrEqual(30);
  });

  it("deux demandes d'affilée : seul le DERNIER lien reste valide (les précédents non consommés tombent)", async () => {
    await registerUser(ctx, CLIENT);
    ctx.emails.length = 0;

    await forgot(CLIENT.email);
    const firstRaw = extractToken(ctx.emails.at(-1)!.text);
    await forgot(CLIENT.email);
    const secondRaw = extractToken(ctx.emails.at(-1)!.text);
    expect(secondRaw).not.toBe(firstRaw);

    const rows = await ctx.prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1); // l'ancien est supprimé, pas seulement expiré
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(secondRaw).digest("hex"));
  });

  it("le lien pointe vers le bon front : CLIENT → CLIENT_URL/{locale}/…, PRO → PRO_URL sans préfixe", async () => {
    await registerUser(ctx, CLIENT);
    await registerUser(ctx, PRO);
    ctx.emails.length = 0;

    await forgot(CLIENT.email);
    expect(ctx.emails.at(-1)!.text).toContain("http://localhost:3000/fr/auth/reinitialisation?token=");
    await forgot(PRO.email);
    expect(ctx.emails.at(-1)!.text).toContain("http://localhost:5173/auth/reinitialisation?token=");
    expect(ctx.emails.at(-1)!.subject).toBe("إعادة تعيين كلمة المرور — زواج"); // locale ar du PRO respectée
  });
});
