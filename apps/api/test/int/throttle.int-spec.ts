// Preuve POSITIVE du rate-limiting (le Lot 0 n'avait prouvé que le SkipThrottle) :
// ce spec fige les VRAIES limites AVANT tout import de l'app — l'isolation de
// modules de Vitest fait relire auth.throttle.ts avec ces valeurs.
process.env.THROTTLE_RESEND_LIMIT = "3";
process.env.THROTTLE_LOGIN_LIMIT = "10";
process.env.THROTTLE_REFRESH_LIMIT = "30";
process.env.THROTTLE_LOGOUT_LIMIT = "10";
process.env.THROTTLE_FORGOT_LIMIT = "3";
process.env.THROTTLE_RESET_LIMIT = "10";
process.env.THROTTLE_AUTH_TTL_MS = "900000";

import request from "supertest";
import type { TestContext } from "./helpers";

describe("Rate limiting /auth (limites réelles)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    const { createTestApp } = await import("./helpers"); // import APRÈS le gel des limites
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it("resend-verification : 3 requêtes passent, la 4e est rejetée en 429 avec Retry-After", async () => {
    const server = ctx.app.getHttpServer();
    const payload = { email: "inconnu@example.dz" };

    for (let i = 1; i <= 3; i++) {
      const res = await request(server).post("/api/v1/auth/resend-verification").send(payload);
      expect(res.status).toBe(202);
    }

    const blocked = await request(server).post("/api/v1/auth/resend-verification").send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.body.statusCode).toBe(429);
  });

  it("login (D8) : 10 tentatives passent (ici en 401), la 11e est rejetée en 429 — le throttle précède l'auth", async () => {
    const server = ctx.app.getHttpServer();
    const payload = { email: "brute-force@example.dz", password: "Tentative1" };

    for (let i = 1; i <= 10; i++) {
      const res = await request(server).post("/api/v1/auth/login").send(payload);
      expect(res.status).toBe(401); // compte inexistant : chaque essai paie aussi l'argon2 factice (D5)
    }

    const blocked = await request(server).post("/api/v1/auth/login").send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("refresh (D13) : 30 requêtes passent (401 sans cookie), la 31e est rejetée en 429", async () => {
    const server = ctx.app.getHttpServer();
    for (let i = 1; i <= 30; i++) {
      expect((await request(server).post("/api/v1/auth/refresh")).status).toBe(401);
    }
    const blocked = await request(server).post("/api/v1/auth/refresh");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("logout (D13) : 10 requêtes passent (200 idempotent), la 11e est rejetée en 429", async () => {
    const server = ctx.app.getHttpServer();
    for (let i = 1; i <= 10; i++) {
      expect((await request(server).post("/api/v1/auth/logout")).status).toBe(200);
    }
    const blocked = await request(server).post("/api/v1/auth/logout");
    expect(blocked.status).toBe(429);
  });

  it("forgot-password (Lot 4) : 3 demandes passent (202 constant), la 4e est rejetée en 429", async () => {
    const server = ctx.app.getHttpServer();
    const payload = { email: "quelquun@example.dz" };
    for (let i = 1; i <= 3; i++) {
      expect((await request(server).post("/api/v1/auth/forgot-password").send(payload)).status).toBe(202);
    }
    const blocked = await request(server).post("/api/v1/auth/forgot-password").send(payload);
    expect(blocked.status).toBe(429);
  });

  it("reset-password (Lot 4) : 10 tentatives passent (ici 400), la 11e est rejetée en 429", async () => {
    const server = ctx.app.getHttpServer();
    const payload = { token: "A".repeat(43), password: "NouveauMdp1" };
    for (let i = 1; i <= 10; i++) {
      expect((await request(server).post("/api/v1/auth/reset-password").send(payload)).status).toBe(400);
    }
    const blocked = await request(server).post("/api/v1/auth/reset-password").send(payload);
    expect(blocked.status).toBe(429);
  });
});
