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

  // ── Garde production (finding Lot 0) : plus de défaut silencieux en prod ──
  describe("NODE_ENV=production : CLIENT_URL / PRO_URL / AUTH_COOKIE_SECURE exigées explicitement", () => {
    const prodEnv = {
      ...baseEnv,
      NODE_ENV: "production",
      CLIENT_URL: "https://zwadj.dz",
      PRO_URL: "https://pro.zwadj.dz",
      AUTH_COOKIE_SECURE: "true"
    };
    const omit = (obj: Record<string, unknown>, key: string): Record<string, unknown> => {
      const copy = { ...obj };
      delete copy[key];
      return copy;
    };

    it("boote quand les trois sont fournies", () => {
      expect(validateEnv(prodEnv).AUTH_COOKIE_SECURE).toBe(true);
    });

    it.each(["CLIENT_URL", "PRO_URL", "AUTH_COOKIE_SECURE"] as const)(
      "refuse de booter sans %s en nommant la variable",
      (key) => {
        expect(() => validateEnv(omit(prodEnv, key))).toThrow(new RegExp(key));
      }
    );

    it("refuse une valeur vide (une chaîne vide n'est pas « définie »)", () => {
      expect(() => validateEnv({ ...prodEnv, AUTH_COOKIE_SECURE: "" })).toThrow(/AUTH_COOKIE_SECURE/);
    });

    it("liste TOUTES les manquantes d'un coup (pas une découverte au compte-gouttes)", () => {
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: "production" })).toThrow(
        /CLIENT_URL[\s\S]*PRO_URL[\s\S]*AUTH_COOKIE_SECURE/
      );
    });

    it("hors prod, les défauts dev restent intacts (aucune friction ajoutée)", () => {
      const env = validateEnv({ ...baseEnv, NODE_ENV: "development" });
      expect(env.CLIENT_URL).toBe("http://localhost:3000");
      expect(env.AUTH_COOKIE_SECURE).toBe(false);
    });

    it("JWT_ACCESS_SECRET : comportement inchangé (déjà requis partout, jamais de défaut)", () => {
      expect(() => validateEnv(omit(prodEnv, "JWT_ACCESS_SECRET"))).toThrow(/JWT_ACCESS_SECRET/);
    });
  });
});
