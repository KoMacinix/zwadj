/**
 * K-18 — LE CHANGEMENT DE MOT DE PASSE DU MEMBRE — rang 44, L36-3a-1 (D341, S-102, S-105, MP-5, MP-19, MP-24). PostgreSQL RÉEL, argon2 RÉEL.
 *
 * Ce que ce spec prouve : que le changement met fin aux AUTRES sessions du membre sans toucher à la courante ni à l'appareil (MP-5, S-105), qu'un mot de passe courant ou réutilisé est refusé (MP-24),
 * que le compteur de la pause est PARTAGÉ avec la connexion (un mauvais mot de passe actuel compte), qu'un remplacement concurrent ne peut pas réussir deux fois (le hachage lu est la condition du
 * remplacement), et que les comptes d'argon2 sont ceux que le service annonce.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_LIMITS, StaffErrorCode, passwordSchema } from "@zwadj/types";
import { PasswordService } from "../../src/auth/password.service";
import { STAFF_COMMON_PASSWORDS } from "../../src/staff/staff-common-passwords";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { Jar, MOT_DE_PASSE_STAFF, appeler, codeDe, compterLignes, connecter, lignesAudit, proActive, sessionParJeton } from "./staff-helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
  vi.restoreAllMocks();
});

const NOUVEAU = "Nouveau-mot-de-passe-7";
const route = "/api/v1/pro/staff/password";
const changer = (bearer: string, jar: Jar | undefined, courant: string, nouveau: string) => appeler(ctx, bearer, jar, "post", route, { currentPassword: courant, newPassword: nouveau });
const etatMembre = async (id: string) =>
  (await ctx.prisma.$queryRaw<Array<{ h: string; echecs: number; en_pause: boolean; change: boolean; mdp_modifie_il_y_a: number; expire_dans_jours: number }>>`
    SELECT password_hash AS h, password_failed_count AS echecs, (password_locked_until IS NOT NULL AND password_locked_until > now()) AS en_pause, must_change_password AS change,
           extract(epoch FROM (now() - password_changed_at)) AS mdp_modifie_il_y_a, extract(epoch FROM (password_expires_at - now())) / 86400 AS expire_dans_jours
      FROM pro_staff_members WHERE id = ${id}::uuid`)[0]!;

describe("K-18 — le changement nominal", () => {
  it("200 : le membre est rendu ; le hachage est REMPLACÉ (argon2id) ; les dates sont réécrites (changé maintenant, expire dans 90 jours) ; `mustChangePassword` est faux ; UNE ligne d'audit", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const avant = await etatMembre(membreId);
    const res = await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ member: { id: membreId, accountName: "Amine", role: "MANAGER", mustChangePassword: false } });
    const apres = await etatMembre(membreId);
    expect(apres.h).not.toBe(avant.h);
    expect(apres.h.startsWith("$argon2id$")).toBe(true);
    expect(Number(apres.mdp_modifie_il_y_a)).toBeLessThan(30);
    expect(Number(apres.expire_dans_jours)).toBeCloseTo(STAFF_LIMITS.PASSWORD_VALIDITY_DAYS, 2);
    expect(apres.change).toBe(false);
    const audit = await lignesAudit(ctx.prisma, "staff.password_change");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor_member_id: membreId, entity_type: "staff_member", entity_id: membreId });
    expect(JSON.stringify(audit[0])).not.toContain(NOUVEAU);
    expect(JSON.stringify(audit[0])).not.toContain(MOT_DE_PASSE_STAFF);
  });

  it("le nouveau mot de passe ouvre une session ; l'ancien ne l'ouvre plus", async () => {
    const { pro, jar } = await proActive(ctx);
    await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect((await connecter(ctx, pro, new Jar(), "Amine", NOUVEAU)).status).toBe(200);
    expect((await connecter(ctx, pro, new Jar(), "Amine", MOT_DE_PASSE_STAFF)).status).toBe(401);
  });

  it("⛔ MP-5 / S-105 — les AUTRES sessions du membre prennent `PASSWORD_CHANGED` ; la session courante et l'appareil RESTENT ; la requête de l'autre poste est refusée à l'instant (MP-19)", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const autrePoste = new Jar();
    expect((await connecter(ctx, pro, autrePoste)).status).toBe(200);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions")).toBe(2);
    const res = await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect(res.status).toBe(200);
    const autre = await sessionParJeton(ctx.prisma, autrePoste.session()!);
    expect(autre.end_reason).toBe("PASSWORD_CHANGED");
    expect(autre.ended_at).not.toBeNull();
    const courante = await sessionParJeton(ctx.prisma, jar.session()!);
    expect(courante.ended_at, "la session qui change son mot de passe reste ouverte").toBeNull();
    expect((await appeler(ctx, pro.token, jar, "get", "/api/v1/pro/venues")).status).toBe(200);
    const refus = await appeler(ctx, pro.token, autrePoste, "get", "/api/v1/pro/venues");
    expect(refus.status).toBe(401);
    expect(codeDe(refus)).toBe("STAFF_SESSION_REQUIRED");
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_devices WHERE revoked_at IS NULL AND member_id = ${membreId}::uuid`).toHaveLength(2);
    expect((await lignesAudit(ctx.prisma, "staff.password_change"))[0]!.after).toEqual({ otherSessionsEnded: 1 });
  });

  it("les sessions d'un AUTRE membre ou d'une autre salle ne sont pas touchées", async () => {
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    await changer(a.pro.token, a.jar, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect((await sessionParJeton(ctx.prisma, b.jar.session()!)).ended_at).toBeNull();
  });
});

describe("K-18 — les refus", () => {
  it("⛔ un mot de passe ACTUEL faux : 400 `STAFF_CURRENT_PASSWORD_INVALID`, UN échec compté, une ligne d'audit `staff.password_change_failed`, le hachage est INCHANGÉ, les autres sessions aussi", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const avant = await etatMembre(membreId);
    const res = await changer(pro.token, jar, "Mauvais-actuel-1", NOUVEAU);
    expect(res.status).toBe(400);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_CURRENT_PASSWORD_INVALID);
    const apres = await etatMembre(membreId);
    expect(apres.h).toBe(avant.h);
    expect(apres.echecs).toBe(1);
    expect(await lignesAudit(ctx.prisma, "staff.password_change_failed")).toHaveLength(1);
    expect(await lignesAudit(ctx.prisma, "staff.password_change")).toHaveLength(0);
  });

  it("⛔ MP-24 — un nouveau mot de passe IDENTIQUE à l'actuel : 400 `STAFF_PASSWORD_REUSED`, le hachage est inchangé, et le compteur est REMIS À ZÉRO (le bon mot de passe actuel n'est pas un échec)", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    await changer(pro.token, jar, "Faux-1", NOUVEAU);
    await changer(pro.token, jar, "Faux-2", NOUVEAU);
    expect((await etatMembre(membreId)).echecs).toBe(2);
    const avant = await etatMembre(membreId);
    const res = await changer(pro.token, jar, MOT_DE_PASSE_STAFF, MOT_DE_PASSE_STAFF);
    expect(res.status).toBe(400);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_PASSWORD_REUSED);
    const apres = await etatMembre(membreId);
    expect(apres.h).toBe(avant.h);
    expect(apres.echecs).toBe(0);
  });

  it("⛔ MP-24 — un nouveau mot de passe COURANT (une entrée de la liste qui passe le schéma, dérivée de la liste) : 400 `STAFF_PASSWORD_COMMON`, AUCUN essai consommé", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const courant = STAFF_COMMON_PASSWORDS.find((p) => passwordSchema.safeParse(p).success)!;
    const res = await changer(pro.token, jar, MOT_DE_PASSE_STAFF, courant);
    expect(res.status).toBe(400);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_PASSWORD_COMMON);
    expect((await etatMembre(membreId)).echecs).toBe(0);
  });

  it("la validation du corps : nouveau mot de passe trop faible, actuel manquant, clé inconnue → 400", async () => {
    const { pro, jar } = await proActive(ctx);
    for (const [nom, corps, cle] of [
      ["trop faible", { currentPassword: MOT_DE_PASSE_STAFF, newPassword: "court1" }, "auth.validation.passwordTooShort"],
      ["actuel manquant", { newPassword: NOUVEAU }, "staff.validation.currentPasswordRequired"],
      ["clé inconnue", { currentPassword: MOT_DE_PASSE_STAFF, newPassword: NOUVEAU, memberId: "x" }, "staff.validation.unknownKey"]
    ] as const) {
      const res = await appeler(ctx, pro.token, jar, "post", route, corps);
      expect(res.status, nom).toBe(400);
      expect(JSON.stringify(res.body), nom).toContain(cle);
    }
  });

  it("sans session de personnel (couche activée, pas de cookie) : 401 `STAFF_SESSION_REQUIRED` ; couche éteinte : 401 aussi (le changement est celui d'un MEMBRE, il en faut un)", async () => {
    const { pro } = await proActive(ctx);
    const sans = await changer(pro.token, undefined, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect(sans.status).toBe(401);
    expect(codeDe(sans)).toBe("STAFF_SESSION_REQUIRED");
    await truncateAll(ctx.prisma);
    const sansCouche = await (await import("./staff-helpers")).creerPro(ctx);
    const res = await changer(sansCouche.token, undefined, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_SESSION_REQUIRED");
  });
});

describe("S-102 — le compteur est PARTAGÉ avec la connexion", () => {
  it("⛔ trois connexions fausses et deux changements faux = cinq comptés : la pause court ; ensuite le BON mot de passe est refusé des deux côtés (même refus, vrai hachage non vérifié)", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    for (let i = 0; i < 3; i += 1) await connecter(ctx, pro, new Jar(), "Amine", "Mauvais-mot-de-passe-1");
    for (let i = 0; i < 2; i += 1) await changer(pro.token, jar, "Mauvais-actuel-1", NOUVEAU);
    const c = await etatMembre(membreId);
    expect(c.echecs).toBe(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(c.en_pause).toBe(true);

    const passwords = ctx.app.get(PasswordService, { strict: false });
    const verif = vi.spyOn(passwords, "verify");
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    const changement = await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU);
    expect(changement.status).toBe(400);
    expect(codeDe(changement)).toBe("STAFF_CURRENT_PASSWORD_INVALID");
    const connexion = await connecter(ctx, pro, new Jar());
    expect(connexion.status).toBe(401);
    expect(codeDe(connexion)).toBe("STAFF_INVALID_CREDENTIALS");
    expect(verif.mock.calls.filter(([hash]) => hash === c.h)).toHaveLength(0);
    expect(factice).toHaveBeenCalledTimes(2);
    expect((await etatMembre(membreId)).h, "rien n'a été remplacé pendant la pause").toBe(c.h);
  });

  it("⛔ un changement réussi remet la pause et les compteurs à zéro", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    await changer(pro.token, jar, "Faux-1", NOUVEAU);
    await changer(pro.token, jar, "Faux-2", NOUVEAU);
    expect((await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU)).status).toBe(200);
    expect((await etatMembre(membreId)).echecs).toBe(0);
  });
});

describe("la CONCURRENCE du remplacement", () => {
  it("⛔ deux changements simultanés avec le MÊME mot de passe actuel : UN réussit (200), l'autre est refusé (400 `STAFF_CURRENT_PASSWORD_INVALID`) — le hachage lu est la condition du remplacement, jamais deux remplacements", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const [r1, r2] = await Promise.all([changer(pro.token, jar, MOT_DE_PASSE_STAFF, "Premier-nouveau-mdp-1"), changer(pro.token, jar, MOT_DE_PASSE_STAFF, "Second-nouveau-mdp-2")]);
    expect([r1.status, r2.status].sort()).toEqual([200, 400]);
    const perdant = r1.status === 400 ? r1 : r2;
    expect(codeDe(perdant)).toBe("STAFF_CURRENT_PASSWORD_INVALID");
    expect(await lignesAudit(ctx.prisma, "staff.password_change")).toHaveLength(1);
    const gagnant = r1.status === 200 ? "Premier-nouveau-mdp-1" : "Second-nouveau-mdp-2";
    expect((await connecter(ctx, pro, new Jar(), "Amine", gagnant)).status).toBe(200);
    expect((await etatMembre(membreId)).echecs).toBe(0);
  });
});

describe("les comptes d'argon2 d'un changement réussi", () => {
  it("⛔ un seul hachage réel de l'ACTUEL, un second pour la comparaison de RÉUTILISATION (contre le même hachage), un seul `hash` du nouveau — et aucun factice", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const h = (await etatMembre(membreId)).h;
    const passwords = ctx.app.get(PasswordService, { strict: false });
    const verif = vi.spyOn(passwords, "verify");
    const hachage = vi.spyOn(passwords, "hash");
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    expect((await changer(pro.token, jar, MOT_DE_PASSE_STAFF, NOUVEAU)).status).toBe(200);
    expect(verif.mock.calls.filter(([hash]) => hash === h)).toHaveLength(2);
    expect(hachage).toHaveBeenCalledTimes(1);
    expect(factice).not.toHaveBeenCalled();
  });
});
