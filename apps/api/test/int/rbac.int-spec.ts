import { Controller, Get } from "@nestjs/common";
import request from "supertest";
import { Roles } from "../../src/auth/auth.decorators";
import { createTestApp, loginAs, registerUser, truncateAll, type TestContext } from "./helpers";

/**
 * Preuve RÉELLE de RolesGuard (spec Lot 2) : aucune route de domaine n'est
 * encore restreinte par rôle, donc on monte une sonde DANS L'APP DE TEST
 * UNIQUEMENT — les guards étant globaux (APP_GUARD), ils s'appliquent à elle
 * exactement comme aux futures routes admin/pro.
 */
@Controller("test-rbac")
class RbacProbeController {
  @Roles("ADMIN")
  @Get("admin-only")
  adminOnly(): { ok: true } {
    return { ok: true };
  }

  @Get("any-authenticated")
  anyAuthenticated(): { ok: true } {
    return { ok: true };
  }
}

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };

describe("RolesGuard global (intégration — sonde @Roles)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [RbacProbeController] });
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    ctx.emails.length = 0;
  });

  it("sans token : 401 dès JwtAuthGuard (RolesGuard n'est jamais atteint)", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/test-rbac/admin-only");
    expect(res.status).toBe(401);
    expect(res.body.message.code).toBe("UNAUTHENTICATED");
  });

  it("CLIENT sur une route @Roles('ADMIN') : 403 FORBIDDEN", async () => {
    await registerUser(ctx, CLIENT);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);

    const res = await request(ctx.app.getHttpServer())
      .get("/api/v1/test-rbac/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toEqual({ code: "FORBIDDEN", message: "auth.errors.forbidden" });
  });

  it("ADMIN sur la même route : 200 (le rôle du JWT est bien celui évalué)", async () => {
    await registerUser(ctx, CLIENT);
    await ctx.prisma.user.update({
      where: { email: CLIENT.email },
      data: { role: "ADMIN", emailVerifiedAt: new Date() } // D1 : ADMIN doit être vérifié pour se connecter
    });
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);

    const res = await request(ctx.app.getHttpServer())
      .get("/api/v1/test-rbac/admin-only")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("route authentifiée SANS @Roles : tout rôle connecté passe (cas nominal)", async () => {
    await registerUser(ctx, CLIENT);
    const token = await loginAs(ctx, CLIENT.email, CLIENT.password);

    const res = await request(ctx.app.getHttpServer())
      .get("/api/v1/test-rbac/any-authenticated")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("un rôle promu APRÈS l'émission du token ne s'applique qu'au prochain login (claims figées 15 min — compromis D4 assumé)", async () => {
    await registerUser(ctx, CLIENT);
    const oldToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
    await ctx.prisma.user.update({
      where: { email: CLIENT.email },
      data: { role: "ADMIN", emailVerifiedAt: new Date() }
    });

    const withOldToken = await request(ctx.app.getHttpServer())
      .get("/api/v1/test-rbac/admin-only")
      .set("Authorization", `Bearer ${oldToken}`);
    expect(withOldToken.status).toBe(403); // l'ancien JWT porte encore role=CLIENT

    const newToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const withNewToken = await request(ctx.app.getHttpServer())
      .get("/api/v1/test-rbac/admin-only")
      .set("Authorization", `Bearer ${newToken}`);
    expect(withNewToken.status).toBe(200);
  });
});
