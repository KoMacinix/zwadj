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
  EMAIL_FROM: z.string().default("Zwadj <no-reply@zwadj.dz>"),

  // ── Paiement (Phase 7, lot E3a) ────────────────────────────────────────────
  /**
   * DRAPEAU MAÎTRE DU CHEMIN DE L'ARGENT. Éteint, aucune route de paiement n'est
   * exposée et aucun webhook n'est accepté.
   *
   * ⚠ POURQUOI IL EXISTE AVANT LA MOINDRE LIGNE DE PAIEMENT (D126). Les
   * sous-lots E3b→E3e se livrent l'un après l'autre, chacun derrière ses six
   * portes. Sans drapeau, chaque livraison intermédiaire exposerait une moitié
   * de chemin de règlement en production — une session de paiement sans webhook,
   * ou un webhook sans bascule de statut. Le drapeau permet de LIVRER sans
   * ACTIVER, ce qui est la seule façon de découper un chemin monétaire.
   *
   * ⚠ DÉFAUT `false`, ET C'EST LE POINT. Un drapeau de paiement dont l'absence
   * vaut « activé » s'allumerait tout seul le jour d'un déploiement où la
   * variable manque. Le sens du défaut est ici une décision de sécurité, pas une
   * commodité : le seul défaut acceptable sur le chemin de l'argent est celui
   * qui ne fait rien.
   *
   * ⚠ Même transformation que `AUTH_COOKIE_SECURE` — relevée sur ce fichier, pas
   * écrite de mémoire : les variables d'environnement sont des CHAÎNES, et
   * `Boolean("false")` vaut `true`.
   */
  PAYMENTS_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  /** OAuth Google (Lot 8) : audience de vérification des ID tokens GIS
   *  (client ID « Web » du projet Google Cloud). ABSENTE hors production :
   *  l'API boote, /auth/google répond 503 GOOGLE_AUTH_DISABLED — un poste de
   *  dev sans projet Google Cloud reste pleinement fonctionnel. Exigée
   *  EXPLICITEMENT en production (PROD_REQUIRED_EXPLICIT ci-dessous). */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  /** Flux A (Lot A0) — racine DISQUE des médias (adapter dev/local du port
   *  MEDIA_STORAGE), résolue relativement au cwd de l'API. L'adapter
   *  S3-compatible de prod est différé (cadrage Flux A : bloque le
   *  déploiement, pas le code) — quand il arrivera, son driver et ses
   *  identifiants rejoindront PROD_REQUIRED_EXPLICIT ; d'ici là, aucune
   *  variable média n'est exigée au boot. */
  MEDIA_DISK_ROOT: z.string().min(1).default("var/media"),

  // ── Chargily (Phase 7, lot E3b) ────────────────────────────────────────────
  /**
   * Base COMPLÈTE de l'API Chargily, jusqu'à la version incluse.
   *
   * ⚠ AUCUN DÉFAUT, ET C'EST LE POINT. Seule la base de TEST a été observée en
   * bac à sable ; celle de production n'a jamais été capturée. Un défaut pointant
   * le test ferait qu'une production mal configurée encaisserait dans le vide :
   * des sessions qui s'ouvrent, un parcours qui semble marcher, et aucun dinar.
   * C'est le symétrique de `PAYMENTS_ENABLED` — là un drapeau qui s'allume seul,
   * ici une cible qui se choisit seule. Les deux erreurs coûtent.
   * Elle se relève du tableau de bord, elle ne se déduit pas de l'URL de test.
   */
  CHARGILY_BASE_URL: z.string().url().optional(),
  /** Clé secrète du marchand. ⚠ Jamais journalisée, jamais renvoyée par une
   *  route de diagnostic — elle n'apparaît que dans l'en-tête `Authorization`
   *  construit par `chargily.gateway.ts`. */
  CHARGILY_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Délai d'attente de l'appel sortant, en millisecondes.
   *
   * ⚠ C'est un CHOIX, pas une mesure — assumé comme tel et rendu réglable.
   * Trop court, on abandonne des sessions que Chargily a réellement créées
   * (mode de défaillance E3a-4, la pire des deux) ; trop long, un fournisseur
   * lent retient nos requêtes entrantes. La borne basse à 1 s interdit une
   * valeur qui échouerait à tous les coups.
   */
  CHARGILY_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000)
})
  /**
   * ⚠ ACTIVER LES PAIEMENTS SANS FOURNISSEUR EST UNE CONFIGURATION IMPOSSIBLE,
   * PAS UNE DÉGRADATION.
   *
   * `PAYMENTS_ENABLED=true` sans clé ni URL bootait jusqu'ici sur
   * `UnavailablePaymentGateway` : l'exploitant croyait les paiements ouverts,
   * l'application répondait 503 à chaque tentative, et rien dans les journaux de
   * démarrage ne disait pourquoi. Le boot échoue désormais, en nommant la
   * variable manquante.
   *
   * ⚠ Ce contrôle ne vit PAS dans `PROD_REQUIRED_EXPLICIT` : il ne dépend pas de
   * l'environnement mais du drapeau. Un bac de recette avec les paiements
   * allumés et sans clé est exactement aussi cassé qu'une production.
   */
  .superRefine((env, ctx) => {
    if (!env.PAYMENTS_ENABLED) return;
    for (const key of ["CHARGILY_BASE_URL", "CHARGILY_SECRET_KEY"] as const) {
      if (env[key] === undefined || env[key] === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} est obligatoire quand PAYMENTS_ENABLED vaut true`
        });
      }
    }
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
 * `GOOGLE_CLIENT_ID` (Lot 8) est un cas voisin : pas de défaut, mais son
 * ABSENCE est tolérée hors prod (503 sur /auth/google). En prod, le bouton
 * Google est visible côté Client — une absence silencieuse serait un incident
 * visible, donc même traitement fail-fast au boot.
 */
const PROD_REQUIRED_EXPLICIT = [
  "CLIENT_URL",
  "PRO_URL",
  "AUTH_COOKIE_SECURE",
  "GOOGLE_CLIENT_ID",
  // ⚠ EXPLICITE EN PRODUCTION, alors qu'il a déjà un défaut sûr. Le défaut
  // protège contre l'allumage accidentel ; cette liste-ci protège contre
  // l'inverse — croire les paiements actifs alors que la variable a été oubliée
  // au déploiement. Sur le chemin de l'argent, les deux erreurs coûtent, et
  // aucune ne doit pouvoir se produire en silence.
  "PAYMENTS_ENABLED"
] as const;

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
