import type { UserRole } from "@zwadj/types";

/**
 * Claims du JWT d'accès (D4) : le strict minimum — `sub` (id utilisateur) et
 * `role` (lu par RolesGuard sans aller-retour BDD). Volontairement AUCUNE
 * autre donnée : pas d'email ni de PII (le JWT transite en clair côté client),
 * pas d'`emailVerified` (figé 15 min, il serait périmé juste après la
 * vérification — `/auth/me` fait foi pour les données fraîches).
 * Type interne à l'API : les fronts traitent le JWT comme opaque.
 */
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

/** Ce que JwtAuthGuard attache à `request.user` après vérification de la
 *  signature — exposé aux handlers via le décorateur `@CurrentUser()`. */
export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}
