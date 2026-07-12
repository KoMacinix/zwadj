import { validateEnv } from "./env";

const baseEnv = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_ACCESS_SECRET: "s".repeat(40)
};

describe("validateEnv (schéma Zod des variables d'environnement)", () => {
  it("accepte une config minimale et applique les défauts auth", () => {
    const env = validateEnv(baseEnv);
    expect(env.PORT).toBe(3001);
    expect(env.JWT_ACCESS_TTL).toBe("15m");
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.CLIENT_URL).toBe("http://localhost:3000");
    expect(env.AUTH_COOKIE_SECURE).toBe(false);
  });

  it("refuse un JWT_ACCESS_SECRET trop court (< 32) en nommant la variable", () => {
    expect(() => validateEnv({ ...baseEnv, JWT_ACCESS_SECRET: "court" })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("refuse un JWT_ACCESS_TTL mal formé", () => {
    expect(() => validateEnv({ ...baseEnv, JWT_ACCESS_TTL: "15x" })).toThrow(/JWT_ACCESS_TTL/);
  });

  it("refuse l'absence totale de JWT_ACCESS_SECRET (l'API ne boote pas sans)", () => {
    expect(() => validateEnv({ DATABASE_URL: baseEnv.DATABASE_URL })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("parse CORS_ORIGINS en liste et AUTH_COOKIE_SECURE en booléen", () => {
    const env = validateEnv({ ...baseEnv, CORS_ORIGINS: "https://a.dz, https://b.dz", AUTH_COOKIE_SECURE: "true" });
    expect(env.CORS_ORIGINS).toEqual(["https://a.dz", "https://b.dz"]);
    expect(env.AUTH_COOKIE_SECURE).toBe(true);
  });
});
