import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { UserRole } from "@zwadj/types";
import type { AuthenticatedUser } from "./auth.types";

/**
 * Décorateurs de la couche RBAC (Lot 2). Le modèle est « fermé par défaut » :
 * JwtAuthGuard est GLOBAL, donc toute nouvelle route est authentifiée sauf
 * opt-out explicite — on ne peut pas OUBLIER de protéger un endpoint,
 * seulement choisir de l'ouvrir.
 */

export const IS_PUBLIC_KEY = "zwadj:isPublic";
/** Opt-out d'authentification (login, register, verify-email, health…). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "zwadj:roles";
/** Restreint une route (ou un contrôleur) aux rôles listés — lu par RolesGuard. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

/** Injecte l'utilisateur authentifié ({ userId, role }) posé par JwtAuthGuard.
 *  Sur une route @Public sans JWT, il n'y a pas d'utilisateur : undefined. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  }
);
