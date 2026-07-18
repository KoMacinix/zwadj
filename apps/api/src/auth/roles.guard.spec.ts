import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "./auth.decorators";
import type { AuthenticatedUser } from "./auth.types";
import { RolesGuard } from "./roles.guard";

// Sondes décorées avec le VRAI @Roles — Reflector réel, comme en prod.
class NoRolesProbe {
  handler(): void {}
}
class AdminOnlyProbe {
  @Roles("ADMIN")
  handler(): void {}
}
class AdminOrProProbe {
  @Roles("ADMIN", "PRO")
  handler(): void {}
}
@Roles("ADMIN")
class ClassLevelProbe {
  handler(): void {}
}
@Roles("ADMIN")
class MethodOverridesClassProbe {
  @Roles("PRO")
  handler(): void {}
}

function contextFor(
  probe: { new (): { handler(): void } },
  user: AuthenticatedUser | undefined
): ExecutionContext {
  return {
    getHandler: () => probe.prototype.handler,
    getClass: () => probe,
    switchToHttp: () => ({ getRequest: () => ({ user }) })
  } as unknown as ExecutionContext;
}

describe("RolesGuard (@Roles — RBAC, D6)", () => {
  const guard = new RolesGuard(new Reflector());
  const client: AuthenticatedUser = { userId: "u1", role: "CLIENT" };
  const pro: AuthenticatedUser = { userId: "u2", role: "PRO" };
  const admin: AuthenticatedUser = { userId: "u3", role: "ADMIN" };

  it("sans métadonnée @Roles : passe (cas nominal d'une route juste authentifiée, ex. /auth/me)", () => {
    expect(guard.canActivate(contextFor(NoRolesProbe, client))).toBe(true);
  });

  it("rôle autorisé : passe", () => {
    expect(guard.canActivate(contextFor(AdminOnlyProbe, admin))).toBe(true);
  });

  it("rôle insuffisant : 403 FORBIDDEN avec la clé i18n", () => {
    const attempt = (): boolean => guard.canActivate(contextFor(AdminOnlyProbe, client));
    expect(attempt).toThrow(ForbiddenException);
    try {
      attempt();
    } catch (e) {
      expect((e as ForbiddenException).getResponse()).toEqual({
        code: "FORBIDDEN",
        message: "auth.errors.forbidden"
      });
    }
  });

  it("liste de rôles : chacun des rôles listés passe, les autres non", () => {
    expect(guard.canActivate(contextFor(AdminOrProProbe, pro))).toBe(true);
    expect(guard.canActivate(contextFor(AdminOrProProbe, admin))).toBe(true);
    expect(() => guard.canActivate(contextFor(AdminOrProProbe, client))).toThrow(ForbiddenException);
  });

  it("@Roles au niveau CLASSE s'applique à toutes les méthodes", () => {
    expect(() => guard.canActivate(contextFor(ClassLevelProbe, pro))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor(ClassLevelProbe, admin))).toBe(true);
  });

  it("@Roles de MÉTHODE remplace celui de la classe (sémantique getAllAndOverride, verrouillée ici)", () => {
    expect(guard.canActivate(contextFor(MethodOverridesClassProbe, pro))).toBe(true);
    expect(() => guard.canActivate(contextFor(MethodOverridesClassProbe, admin))).toThrow(ForbiddenException);
  });

  it("défense en profondeur : @Roles sans identité (ex. combiné à @Public) → 401, pas 403", () => {
    expect(() => guard.canActivate(contextFor(AdminOnlyProbe, undefined))).toThrow(UnauthorizedException);
  });
});
