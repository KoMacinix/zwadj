// Intégration ADM-1 (D349, rang 51, R-6, D-3) — le PREMIER admin : la fonction que le script `prisma/promote-first-admin.ts` appelle, jouée sur la base d'INTÉGRATION (jamais sur la base de
// développement de Ko). « Promeut un compte EXISTANT, vérifié et actif, refuse sinon. Aucun mot de passe manipulé. »
//
// Ce qui ne se prouve QU'ICI : le rôle devient réellement ADMIN pour l'API (une connexion neuve porte le rôle, une route ADMIN s'ouvre), le hachage du mot de passe est INTACT, deux promotions
// simultanées n'écrivent qu'UNE ligne de journal, et un journal qui échoue annule la promotion.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AdminAuditAction, AdminAuditEntity } from "@zwadj/types";
import { promoteFirstAdmin, type PromotionDb } from "../../src/admin/first-admin";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const KO = { role: "CLIENT", email: "ko@example.dz", password: "Motdepasse1", firstName: "Ko", lastName: "Admin" };
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };

const api = () => request(ctx.app.getHttpServer());
// ⚠ Le client Prisma n'est pas assignable à l'interface minimale de la fonction (ses délégués sont des génériques surchargés) : le cast est à la FRONTIÈRE, une seule fois.
const db = () => ctx.prisma as unknown as PromotionDb;

async function inscrire(user: Record<string, unknown>, verifier = true): Promise<void> {
  await registerUser(ctx, user);
  if (verifier) await verifyLastRegistered(ctx);
}
const compte = (email: string) => ctx.prisma.user.findUniqueOrThrow({ where: { email } });
const lignesDePromotion = () => ctx.prisma.auditLog.findMany({ where: { action: AdminAuditAction.USER_PROMOTE_ADMIN } });

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_promote ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS adm1_fail_promote()");
  await ctx.app.close();
});
beforeEach(async () => {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_promote ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS adm1_fail_promote()");
  await truncateAll(ctx.prisma);
});

describe("un compte vérifié et actif est promu", () => {
  it("le rôle devient ADMIN ; une connexion NEUVE ouvre les routes ADMIN ; le hachage du mot de passe est INTACT ; UNE ligne de journal sans e-mail", async () => {
    await inscrire(KO);
    const avant = await compte(KO.email);
    expect(avant.role).toBe("CLIENT");
    expect((await api().get("/api/v1/admin/venues/pending-publication").set({ Authorization: `Bearer ${await loginAs(ctx, KO.email, KO.password)}` })).status).toBe(403);

    const r = await promoteFirstAdmin(db(), KO.email);
    expect(r).toEqual({ outcome: "PROMOTED", userId: avant.id });

    const apres = await compte(KO.email);
    expect(apres.role).toBe("ADMIN");
    expect(apres.passwordHash).toBe(avant.passwordHash); // « aucun mot de passe manipulé »
    expect(apres.status).toBe("ACTIVE");
    // le rôle est une claim du jeton : c'est la connexion SUIVANTE qui le porte (D4 — borné par JWT_ACCESS_TTL, écrit)
    const token = await loginAs(ctx, KO.email, KO.password);
    expect((await api().get("/api/v1/admin/venues/pending-publication").set({ Authorization: `Bearer ${token}` })).status).toBe(200);

    const lignes = await lignesDePromotion();
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      actorId: null,
      actorRole: "SCRIPT",
      action: AdminAuditAction.USER_PROMOTE_ADMIN,
      entityType: AdminAuditEntity.USER,
      entityId: avant.id,
      before: { role: "CLIENT" },
      after: { role: "ADMIN" }
    });
    expect(JSON.stringify(lignes[0])).not.toContain(KO.email);
  });

  it("l'adresse saisie au terminal est normalisée : majuscules et espaces autour ne font pas échouer", async () => {
    await inscrire(KO);
    expect((await promoteFirstAdmin(db(), `  ${KO.email.toUpperCase()} `)).outcome).toBe("PROMOTED");
  });

  it("--dry-run : dit ce qui SERAIT fait, n'écrit RIEN (ni rôle, ni ligne)", async () => {
    await inscrire(KO);
    expect((await promoteFirstAdmin(db(), KO.email, { dryRun: true })).outcome).toBe("WOULD_PROMOTE");
    expect((await compte(KO.email)).role).toBe("CLIENT");
    expect(await lignesDePromotion()).toHaveLength(0);
  });
});

describe("tout autre compte est REFUSÉ — et rien n'est écrit", () => {
  it("adresse inconnue : NOT_FOUND", async () => {
    expect(await promoteFirstAdmin(db(), "personne@example.dz")).toEqual({ outcome: "REFUSED", reason: "NOT_FOUND" });
    expect(await lignesDePromotion()).toHaveLength(0);
  });

  it("e-mail NON vérifié : EMAIL_NOT_VERIFIED, le rôle ne bouge pas", async () => {
    await inscrire(KO, false);
    expect(await promoteFirstAdmin(db(), KO.email)).toMatchObject({ outcome: "REFUSED", reason: "EMAIL_NOT_VERIFIED" });
    expect((await compte(KO.email)).role).toBe("CLIENT");
    expect(await lignesDePromotion()).toHaveLength(0);
  });

  it("compte suspendu : NOT_ACTIVE", async () => {
    await inscrire(KO);
    await ctx.prisma.user.update({ where: { email: KO.email }, data: { status: "SUSPENDED" } });
    expect(await promoteFirstAdmin(db(), KO.email)).toMatchObject({ outcome: "REFUSED", reason: "NOT_ACTIVE" });
    expect((await compte(KO.email)).role).toBe("CLIENT");
  });

  it("MD-ADM-3 « le mauvais compte » — un compte PRO : IS_PRO, il garde son rôle et l'accès à ses salles", async () => {
    await inscrire(PRO);
    expect(await promoteFirstAdmin(db(), PRO.email)).toMatchObject({ outcome: "REFUSED", reason: "IS_PRO" });
    expect((await compte(PRO.email)).role).toBe("PRO");
    expect(await lignesDePromotion()).toHaveLength(0);
  });

  it("un compte déjà ADMIN : ALREADY_ADMIN, rien n'est écrit — relancer le script est sans danger", async () => {
    await inscrire(KO);
    await promoteFirstAdmin(db(), KO.email);
    const r = await promoteFirstAdmin(db(), KO.email);
    expect(r.outcome).toBe("ALREADY_ADMIN");
    expect(await lignesDePromotion()).toHaveLength(1);
  });
});

describe("atomicité (MD-ADM-6 appliqué au premier admin)", () => {
  it("DEUX promotions simultanées : un seul PROMOTED, UNE seule ligne de journal", async () => {
    for (let tour = 0; tour < 5; tour += 1) {
      await truncateAll(ctx.prisma);
      await inscrire(KO);
      const [a, b] = await Promise.all([promoteFirstAdmin(db(), KO.email), promoteFirstAdmin(db(), KO.email)]);
      expect([a.outcome, b.outcome].filter((o) => o === "PROMOTED"), `tour ${tour}`).toHaveLength(1);
      expect(await lignesDePromotion(), `tour ${tour}`).toHaveLength(1);
      expect((await compte(KO.email)).role).toBe("ADMIN");
    }
  });

  it("un journal qui échoue ANNULE la promotion : le compte reste CLIENT ; sans le déclencheur, le même appel réussit", async () => {
    await inscrire(KO);
    try {
      await ctx.prisma.$executeRawUnsafe(
        "CREATE OR REPLACE FUNCTION adm1_fail_promote() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé du journal (test ADM-1)'; END; $$"
      );
      await ctx.prisma.$executeRawUnsafe(
        `CREATE TRIGGER adm1_fail_promote BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${AdminAuditAction.USER_PROMOTE_ADMIN}') EXECUTE FUNCTION adm1_fail_promote()`
      );
      await expect(promoteFirstAdmin(db(), KO.email)).rejects.toThrow();
    } finally {
      await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_promote ON audit_logs");
      await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS adm1_fail_promote()");
    }
    expect((await compte(KO.email)).role).toBe("CLIENT");
    expect(await lignesDePromotion()).toHaveLength(0);

    expect((await promoteFirstAdmin(db(), KO.email)).outcome).toBe("PROMOTED");
  });
});
