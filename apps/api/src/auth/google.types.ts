// Port de vérification d'ID token Google (Lot 8) — patron EMAIL_SENDER :
// adapter pour tout SDK externe (AGENTS.md), la logique métier (3 branches de
// /auth/google) ne dépend jamais de `google-auth-library` directement.
// Les tests d'intégration substituent une table idToken → payload à ce port ;
// la preuve avec un VRAI GOOGLE_CLIENT_ID reste la validation locale de Ko
// (Google est injoignable depuis le bac à sable — limite connue du cadrage).

/** Claims du token Google APRÈS vérification, réduits à ce que le flux
 *  consomme — noms camelCase côté port, le mapping snake_case (`given_name`…)
 *  reste enfermé dans l'adapter. */
export interface GoogleIdTokenPayload {
  /** Identifiant Google STABLE du compte (contrairement à l'email). */
  sub: string;
  /** Email normalisé lowercase (aligné sur emailSchema/la colonne unique). */
  email: string;
  /** Claim `email_verified` — le service REFUSE tout token où il n'est pas true. */
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
}

export interface GoogleTokenVerifier {
  /**
   * Vérifie signature, audience (= GOOGLE_CLIENT_ID) et expiration, puis
   * projette les claims. Rejette avec :
   * - GoogleAuthDisabledError si GOOGLE_CLIENT_ID n'est pas configurée ;
   * - GoogleTokenInvalidError pour TOUT autre échec (signature, audience,
   *   expiration, forme, claims essentiels absents) — indistincts, pas d'oracle.
   */
  verify(idToken: string): Promise<GoogleIdTokenPayload>;
}

/** Jeton d'injection du port (interface TS = pas de runtime, d'où le Symbol). */
export const GOOGLE_TOKEN_VERIFIER = Symbol("GOOGLE_TOKEN_VERIFIER");

/** GOOGLE_CLIENT_ID absente de l'env : la fonctionnalité est ÉTEINTE (dev sans
 *  projet Google Cloud) — le service la traduit en 503 GOOGLE_AUTH_DISABLED. */
export class GoogleAuthDisabledError extends Error {
  constructor() {
    super("GOOGLE_CLIENT_ID non configurée : vérification Google indisponible");
    this.name = "GoogleAuthDisabledError";
  }
}

/** Token invérifiable, quel qu'en soit le motif — traduit en 401 GOOGLE_TOKEN_INVALID. */
export class GoogleTokenInvalidError extends Error {
  constructor() {
    super("ID token Google invalide");
    this.name = "GoogleTokenInvalidError";
  }
}
