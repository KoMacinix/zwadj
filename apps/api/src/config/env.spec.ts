import { validateEnv } from "./env";

const baseEnv = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_ACCESS_SECRET: "s".repeat(40)
};

// ⚠ E3b : allumer les paiements EXIGE désormais une configuration Chargily.
// Ces deux valeurs ne sont pas un décor : les fixtures qui allument le drapeau
// sans elles ont ROUGI à l'ajout de la règle, et c'est ce qu'on attend d'elle.
const chargilyEnv = {
  CHARGILY_BASE_URL: "https://pay.chargily.net/test/api/v2",
  CHARGILY_SECRET_KEY: "test_sk_JETON_DE_TEST_SANS_VALEUR"
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
  describe("NODE_ENV=production : CINQ variables exigées explicitement (E3a en ajoute une)", () => {
    const prodEnv = {
      ...baseEnv,
      NODE_ENV: "production",
      CLIENT_URL: "https://zwadj.dz",
      PRO_URL: "https://pro.zwadj.dz",
      AUTH_COOKIE_SECURE: "true",
      GOOGLE_CLIENT_ID: "1234567890-abc.apps.googleusercontent.com", // Lot 8
      // ⚠ AJOUTÉE PAR E3a, et son ajout a fait ROUGIR deux tests existants —
      // « boote quand les quatre sont fournies » et celui de JWT_ACCESS_SECRET,
      // qui attendait une erreur nommant une AUTRE variable. C'est exactement ce
      // qu'on veut d'une liste d'exigences de production : l'étendre doit se
      // voir. Une fixture qu'on aurait complétée sans lire l'échec aurait masqué
      // le changement.
      // ⚠ ELLE A ROUGI À NOUVEAU À L'ARRIVÉE D'E3b : allumer le drapeau sans
      // clé Chargily ne boote plus. Fixture complétée APRÈS lecture de l'échec,
      // jamais avant — une fixture rafistolée sans lire ce qu'elle dit masque
      // précisément le changement qu'elle aurait dû signaler.
      PAYMENTS_ENABLED: "true",
      ...chargilyEnv
    };
    const omit = (obj: Record<string, unknown>, key: string): Record<string, unknown> => {
      const copy = { ...obj };
      delete copy[key];
      return copy;
    };

    it("boote quand les quatre sont fournies", () => {
      expect(validateEnv(prodEnv).AUTH_COOKIE_SECURE).toBe(true);
    });

    it.each(["CLIENT_URL", "PRO_URL", "AUTH_COOKIE_SECURE", "GOOGLE_CLIENT_ID"] as const)(
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
        /CLIENT_URL[\s\S]*PRO_URL[\s\S]*AUTH_COOKIE_SECURE[\s\S]*GOOGLE_CLIENT_ID/
      );
    });

    it("hors prod, les défauts dev restent intacts (aucune friction ajoutée)", () => {
      const env = validateEnv({ ...baseEnv, NODE_ENV: "development" });
      expect(env.CLIENT_URL).toBe("http://localhost:3000");
      expect(env.AUTH_COOKIE_SECURE).toBe(false);
    });

    it("GOOGLE_CLIENT_ID hors prod : ABSENTE = toléré (undefined), l'API boote — /auth/google répondra 503 (Lot 8)", () => {
      const env = validateEnv({ ...baseEnv, NODE_ENV: "development" });
      expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    });

    it("JWT_ACCESS_SECRET : comportement inchangé (déjà requis partout, jamais de défaut)", () => {
      expect(() => validateEnv(omit(prodEnv, "JWT_ACCESS_SECRET"))).toThrow(/JWT_ACCESS_SECRET/);
    });

    it("⚠ PAYMENTS_ENABLED est EXPLICITE en production : l'oublier fait REFUSER le boot", () => {
      // Le défaut `false` protège de l'allumage accidentel ; cette exigence-ci
      // protège de l'INVERSE — croire les paiements actifs alors que la variable
      // a été oubliée au déploiement. Sur le chemin de l'argent, les deux
      // erreurs coûtent, et aucune ne doit pouvoir se produire en silence.
      expect(() => validateEnv(omit(prodEnv, "PAYMENTS_ENABLED"))).toThrow(/PAYMENTS_ENABLED/);
    });
  });

  // ── E3a — le drapeau maître du chemin de l'argent ─────────────────────────
  describe("PAYMENTS_ENABLED (E3a)", () => {
    it("⚠ ABSENT ⇒ ÉTEINT. Le seul défaut acceptable sur le chemin de l'argent", () => {
      // Un drapeau de paiement dont l'absence vaudrait « activé » s'allumerait
      // tout seul le jour d'un déploiement où la variable manque. Le sens du
      // défaut est une décision de sécurité, pas une commodité.
      expect(validateEnv({ ...baseEnv, NODE_ENV: "development" }).PAYMENTS_ENABLED).toBe(false);
    });

    it('⚠ la chaîne "false" vaut FAUX — `Boolean("false")` vaut vrai', () => {
      // Le piège des variables d'environnement : ce sont des CHAÎNES. Une
      // conversion naïve allumerait les paiements sur la valeur qui dit de ne
      // pas les allumer.
      expect(validateEnv({ ...baseEnv, PAYMENTS_ENABLED: "false" }).PAYMENTS_ENABLED).toBe(false);
      expect(validateEnv({ ...baseEnv, PAYMENTS_ENABLED: "0" }).PAYMENTS_ENABLED).toBe(false);
      // Et l'ÉCART : les deux seules valeurs qui allument. ⚠ Elles exigent
      // maintenant la config Chargily — sans quoi le boot échoue (E3b).
      expect(validateEnv({ ...baseEnv, ...chargilyEnv, PAYMENTS_ENABLED: "true" }).PAYMENTS_ENABLED).toBe(true);
      expect(validateEnv({ ...baseEnv, ...chargilyEnv, PAYMENTS_ENABLED: "1" }).PAYMENTS_ENABLED).toBe(true);
    });

    it("⚠ une valeur INATTENDUE n'allume pas — « oui », « yes », « on » restent éteints", () => {
      // Le cas qui distingue « la variable est renseignée » de « elle dit oui ».
      for (const valeur of ["oui", "yes", "on", "TRUE", "enabled", " true "]) {
        expect(
          validateEnv({ ...baseEnv, PAYMENTS_ENABLED: valeur }).PAYMENTS_ENABLED,
          `« ${valeur} » ne doit pas allumer les paiements`
        ).toBe(false);
      }
    });

  });

  // ── Configuration Chargily (E3b) ─────────────────────────────────────────
  describe("Chargily : la clé et l'URL sont exigées DÈS QUE le drapeau est allumé", () => {
    it("⚠ drapeau ALLUMÉ sans clé ⇒ le boot ÉCHOUE, en nommant la variable", () => {
      // Avant cette règle, cette configuration bootait : l'exploitant croyait
      // les paiements ouverts, chaque tentative rendait 503, et rien au
      // démarrage ne disait pourquoi. Une panne muette coûte plus qu'un refus
      // de démarrer.
      expect(() =>
        validateEnv({ ...baseEnv, PAYMENTS_ENABLED: "true", CHARGILY_BASE_URL: chargilyEnv.CHARGILY_BASE_URL })
      ).toThrow(/CHARGILY_SECRET_KEY/);
    });

    it("⚠ drapeau ALLUMÉ sans URL ⇒ le boot ÉCHOUE aussi", () => {
      // Et il n'y a AUCUN défaut sur l'URL : seule celle du bac à sable a été
      // observée. Un défaut pointant le test ferait qu'une production mal
      // configurée encaisserait dans le vide, sans erreur nulle part.
      expect(() =>
        validateEnv({ ...baseEnv, PAYMENTS_ENABLED: "true", CHARGILY_SECRET_KEY: chargilyEnv.CHARGILY_SECRET_KEY })
      ).toThrow(/CHARGILY_BASE_URL/);
    });

    it("drapeau ÉTEINT ⇒ ni l'une ni l'autre n'est exigée (poste de dev inchangé)", () => {
      const env = validateEnv({ ...baseEnv, NODE_ENV: "development" });
      expect(env.PAYMENTS_ENABLED).toBe(false);
      expect(env.CHARGILY_SECRET_KEY).toBeUndefined();
    });

    it("⚠ le contrôle NE DÉPEND PAS de NODE_ENV : une recette allumée sans clé est aussi cassée", () => {
      // Il ne vit donc pas dans PROD_REQUIRED_EXPLICIT, qui ne regarde que la
      // production. Le drapeau, lui, s'allume partout.
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: "development", PAYMENTS_ENABLED: "true" })).toThrow(
        /CHARGILY/
      );
    });

    it("refuse une URL Chargily qui n'en est pas une", () => {
      expect(() =>
        validateEnv({ ...baseEnv, ...chargilyEnv, PAYMENTS_ENABLED: "true", CHARGILY_BASE_URL: "pas-une-url" })
      ).toThrow(/CHARGILY_BASE_URL/);
    });

    it("délai d'attente : défaut appliqué, bornes tenues", () => {
      expect(validateEnv({ ...baseEnv, ...chargilyEnv, PAYMENTS_ENABLED: "true" }).CHARGILY_TIMEOUT_MS).toBe(10_000);
      expect(() =>
        validateEnv({ ...baseEnv, ...chargilyEnv, PAYMENTS_ENABLED: "true", CHARGILY_TIMEOUT_MS: "10" })
      ).toThrow(/CHARGILY_TIMEOUT_MS/);
    });
  });
});
