import { z } from "zod";

// Schéma Zod des variables d'environnement — validées au démarrage :
// l'API refuse de booter avec une config invalide (invariant : entrées validées).
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
      message: "DATABASE_URL doit être une URL PostgreSQL"
    }),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  // ── Auth (Lot 0) ───────────────────────────────────────────────────────────
  /** Secret HS256 du JWT d'accès — ≥ 32 caractères. Générer : openssl rand -base64 48 */
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET doit faire au moins 32 caractères"),
  /** Durée de vie du JWT d'accès (format @nestjs/jwt : 900s, 15m, 1h…) */
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+(s|m|h|d)$/, "JWT_ACCESS_TTL doit être de la forme 900s / 15m / 1h")
    .default("15m"),
  /** Durée de vie du refresh token opaque, en jours (persisté hashé en base). */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** URLs publiques des fronts — utilisées pour les liens des emails (vérif/reset). */
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  PRO_URL: z.string().url().default("http://localhost:5173"),
  /** Secure sur le cookie refresh (true en prod derrière HTTPS). */
  AUTH_COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  /** Expéditeur affiché par la primitive email. */
  EMAIL_FROM: z.string().default("Zwadj <no-reply@zwadj.dz>")
  // Chargily : clés ajoutées ici à la tranche Paiement (Phase 7) — placeholder volontaire.
});

export type Env = z.infer<typeof envSchema>;

/**
 * Variables SANS filet en production (finding Lot 0) : leurs défauts sont des
 * valeurs de dev (localhost, cookie non Secure) — les laisser s'appliquer
 * silencieusement en prod serait un incident (liens d'emails cassés, refresh
 * token sur HTTP). Le contrôle porte sur les valeurs BRUTES : une fois le
 * `.default()` Zod appliqué, l'absence n'est plus détectable.
 * `JWT_ACCESS_SECRET` n'est pas listé : il n'a jamais eu de défaut, le schéma
 * l'exige déjà partout.
 */
const PROD_REQUIRED_EXPLICIT = ["CLIENT_URL", "PRO_URL", "AUTH_COOKIE_SECURE"] as const;

export function validateEnv(config: Record<string, unknown>): Env {
  if (config.NODE_ENV === "production") {
    const missing = PROD_REQUIRED_EXPLICIT.filter((key) => {
      const value = config[key];
      return value === undefined || value === null || value === "";
    });
    if (missing.length > 0) {
      throw new Error(
        `Variables d'environnement à définir EXPLICITEMENT en production (aucun défaut appliqué) :\n` +
          missing.map((k) => `  - ${k}`).join("\n")
      );
    }
  }

  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables d'environnement invalides :\n${details}`);
  }
  return parsed.data;
}
