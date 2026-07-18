import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthErrorCode, type UserRole } from "@zwadj/types";
import { ROLES_KEY } from "./auth.decorators";
import type { AuthenticatedUser } from "./auth.types";

/**
 * Guard RBAC GLOBAL (Lot 2, D6) — s'exécute APRÈS JwtAuthGuard (ordre
 * d'enregistrement dans app.module). Sans métadonnée @Roles : passe (une
 * route authentifiée sans restriction de rôle est le cas nominal, ex. /auth/me).
 * La matrice de permissions fine et les contrôles de propriété (« un pro ne
 * touche que SES salles ») restent au backlog 5.2 — hors périmètre Lot 2.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    // Défense en profondeur : @Public + @Roles combinés (ou guard mal ordonné)
    // laisseraient passer une requête anonyme jusqu'ici — on exige l'identité
    // avant de juger le rôle. 401, pas 403 : le problème est l'absence d'identité.
    if (!user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.UNAUTHENTICATED,
        message: "auth.errors.unauthenticated"
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: AuthErrorCode.FORBIDDEN,
        message: "auth.errors.forbidden"
      });
    }
    return true;
  }
}
