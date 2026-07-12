// Constantes de la tranche Auth (Lot 0). Les durées de vie des tokens de
// vérification/reset sont des invariants produit simples — pas des knobs env.
export const AUTH = {
  /** TTL du token de vérification email. */
  EMAIL_VERIFICATION_TTL_HOURS: 48,
  /** TTL du token de réinitialisation mot de passe. */
  PASSWORD_RESET_TTL_MINUTES: 30,
  /** Nom du cookie httpOnly portant le refresh token (D2). */
  REFRESH_COOKIE_NAME: "zwadj_rt",
  /** Le cookie refresh n'est envoyé que sur les routes auth (D2 : path restreint). */
  REFRESH_COOKIE_PATH: "/api/v1/auth"
} as const;
