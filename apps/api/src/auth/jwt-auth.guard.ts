import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AuthErrorCode } from "@zwadj/types";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

/**
 * Guard d'authentification GLOBAL (Lot 2, D6) : implémentation directe sur
 * @nestjs/jwt — pas de passport/passport-jwt (deux dépendances évitées pour
 * zéro douleur retirée, AGENTS.md « un pattern doit enlever une vraie
 * douleur »). Toute route est fermée par défaut ; @Public() ouvre.
 *
 * Un seul code UNAUTHENTICATED pour token absent/malformé/expiré/mal signé :
 * le détail est sans valeur pour un client légitime (réponse identique :
 * se reconnecter) et ne ferait qu'aider un attaquant à calibrer ses essais.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractBearerToken(request);
    if (!token) throw this.unauthenticated();

    let payload: AccessTokenPayload;
    try {
      // Secret + algorithme (HS256) viennent de la config du JwtModule (auth.module).
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    request.user = { userId: payload.sub, role: payload.role };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, token, ...rest] = header.split(" ");
    if (rest.length > 0 || scheme?.toLowerCase() !== "bearer" || !token) return undefined;
    return token;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      code: AuthErrorCode.UNAUTHENTICATED,
      message: "auth.errors.unauthenticated"
    });
  }
}
