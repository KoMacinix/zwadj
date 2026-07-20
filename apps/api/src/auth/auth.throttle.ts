/**
 * Limites de rate-limiting des routes /auth (par IP, fenêtre commune 15 min).
 *
 * Les variables THROTTLE_* sont un LEVIER DE TEST uniquement : les tests
 * d'intégration relâchent les limites (sauf le spec dédié au 429 qui garde
 * les vraies). Elles ne font volontairement PAS partie du schéma env validé —
 * en prod, rien n'est défini et les défauts ci-dessous s'appliquent.
 */
const num = (name: string, def: number): number => {
  const v = process.env[name];
  return v !== undefined && v !== "" ? Number(v) : def;
};

const TTL = num("THROTTLE_AUTH_TTL_MS", 15 * 60_000);

export const AUTH_THROTTLE = {
  /** Création de compte : 5 / 15 min / IP. */
  register: { limit: num("THROTTLE_REGISTER_LIMIT", 5), ttl: TTL },
  /** Vérification email (GET, anti-devinette de token) : 10 / 15 min / IP. */
  verifyEmail: { limit: num("THROTTLE_VERIFY_LIMIT", 10), ttl: TTL },
  /** Renvoi d'email de vérification : 3 / 15 min / IP. */
  resend: { limit: num("THROTTLE_RESEND_LIMIT", 3), ttl: TTL },
  /** Connexion (D8) : 10 / 15 min / IP — complété par le coût argon2id ;
   *  le lockout PAR COMPTE (Phase 13, P1) reste consciemment différé. */
  login: { limit: num("THROTTLE_LOGIN_LIMIT", 10), ttl: TTL },
  /** Refresh (D13) : 30 / 15 min / IP — un user actif consomme ~1/15 min,
   *  mais derrière un CGNAT algérien une limite basse étranglerait des
   *  foyers légitimes partageant la même IP. */
  refresh: { limit: num("THROTTLE_REFRESH_LIMIT", 30), ttl: TTL },
  /** Logout (D13) : 10 / 15 min / IP. */
  logout: { limit: num("THROTTLE_LOGOUT_LIMIT", 10), ttl: TTL },
  /** Forgot password (Lot 4) : 3 / 15 min / IP — envoie des emails, même
   *  budget que resend-verification. */
  forgot: { limit: num("THROTTLE_FORGOT_LIMIT", 3), ttl: TTL },
  /** Reset password (Lot 4) : 10 / 15 min / IP — porte un coût argon2 (hash
   *  du nouveau mot de passe), même budget que login. */
  reset: { limit: num("THROTTLE_RESET_LIMIT", 10), ttl: TTL },
  /** Google (Lot 8) : 5 / 15 min / IP — la route peut CRÉER un compte, même
   *  budget que register (cadrage OAuth : « ordre de grandeur register »).
   *  Un utilisateur légitime ne la sollicite qu'une fois par session. */
  google: { limit: num("THROTTLE_GOOGLE_LIMIT", 5), ttl: TTL }
} as const;
