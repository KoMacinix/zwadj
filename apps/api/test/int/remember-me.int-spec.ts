// Lot 7 (D27) — « Se souvenir de moi », prouvé sur base RÉELLE.
// Conditions exigées à la revue :
//   1. rememberMe:false au login ⇒ refresh_tokens.persistent = false EN BASE
//      (pas seulement le défaut du schéma), et cookie de SESSION (sans Expires).
//   2. La révocation globale sur rejeu détecté (D10, Lot 3) tue les sessions
//      persistent ET session SANS distinction — aucun filtre sur le flag.
import request from "supertest";
import { createTestApp, refreshCookieOf, registerUser, truncateAll, type TestContext } from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya" };

describe("POST /api/v1/auth/login + refresh (intégration — rememberMe / persistent, D27)", () => {
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
    await registerUser(ctx, CLIENT);
  });

  const server = () => ctx.app.getHttpServer();
  const login = (rememberMe?: boolean) =>
    request(server())
      .post("/api/v1/auth/login")
      .send(
        rememberMe === undefined
          ? { email: CLIENT.email, password: CLIENT.password }
          : { email: CLIENT.email, password: CLIENT.password, rememberMe }
      );
  const refreshWith = (rawCookie: string) =>
    request(server()).post("/api/v1/auth/refresh").set("Cookie", `zwadj_rt=${rawCookie}`);

  it("rememberMe: false — la ligne créée porte persistent=false EN BASE, cookie SANS Expires/Max-Age", async () => {
    const res = await login(false);
    expect(res.status).toBe(200);

    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.persistent).toBe(false); // condition 1 : la valeur vient du login, pas du défaut

    const cookie = refreshCookieOf(res);
    expect(cookie).toBeDefined();
    expect(cookie!.attributes).not.toMatch(/expires=/i);
    expect(cookie!.attributes).not.toMatch(/max-age=/i);
    expect(cookie!.attributes.toLowerCase()).toContain("httponly");
  });

  it("rememberMe omis (défaut) et rememberMe: true — persistent=true en base, cookie AVEC Expires", async () => {
    const byDefault = await login();
    expect(refreshCookieOf(byDefault)!.attributes).toMatch(/expires=/i);

    const explicit = await login(true);
    expect(refreshCookieOf(explicit)!.attributes).toMatch(/expires=/i);

    const rows = await ctx.prisma.refreshToken.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.persistent)).toBe(true);
  });

  it("rotation D9 : le mode SESSION est préservé (nouvelle ligne persistent=false, cookie sans Expires)", async () => {
    const first = await login(false);
    const firstCookie = refreshCookieOf(first)!;

    const rotated = await refreshWith(firstCookie.raw);
    expect(rotated.status).toBe(200);
    const rotatedCookie = refreshCookieOf(rotated)!;
    expect(rotatedCookie.attributes).not.toMatch(/expires=/i);
    expect(rotatedCookie.attributes).not.toMatch(/max-age=/i);

    const rows = await ctx.prisma.refreshToken.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.revokedAt).not.toBeNull(); // l'ancien est consommé
    expect(rows[1]!.revokedAt).toBeNull();
    expect(rows[1]!.persistent).toBe(false); // le successeur hérite du mode
  });

  it("réutilisation détectée (D10) : révocation de TOUTES les sessions, persistent ET session confondues", async () => {
    // Session A persistante + session B « session » pour le même utilisateur.
    const a = refreshCookieOf(await login(true))!;
    const b = refreshCookieOf(await login(false))!;

    // Consommer A (rotation légitime), puis REJOUER l'ancien A : signal de vol.
    expect((await refreshWith(a.raw)).status).toBe(200);
    expect((await refreshWith(a.raw)).status).toBe(401);

    // Condition 2 : la révocation globale ignore le flag — la session B
    // (persistent=false) ET le successeur légitime de A tombent aussi.
    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(3); // A, successeur de A, B
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
    const sessionRow = rows.find((r) => !r.persistent);
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.revokedAt).not.toBeNull();

    // Et B ne peut effectivement plus servir.
    expect((await refreshWith(b.raw)).status).toBe(401);
  });
});
