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
  REFRESH_COOKIE_PATH: "/api/v1/auth",
  /** Chemin (côté fronts) de la page de vérification email — Lots 5/6 l'implémentent. */
  VERIFY_EMAIL_PATH: "/auth/verification-email",
  /** Chemin (côté fronts) de la page de réinitialisation — Lots 5/6 l'implémentent. */
  RESET_PASSWORD_PATH: "/auth/reinitialisation",
  /** TTL du token de changement d'e-mail (A10) — aligné sur la vérification
   *  initiale : c'est la même preuve de possession d'une boîte mail. */
  EMAIL_CHANGE_TTL_HOURS: 48,
  /** Chemin (côté fronts) de la page de confirmation de changement d'e-mail —
   *  A11 l'implémente. Le lien part À LA NOUVELLE adresse. */
  CONFIRM_EMAIL_CHANGE_PATH: "/auth/confirmation-email"
} as const;
