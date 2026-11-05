/**
 * K-14 — L'ACTIVATION DE LA COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341). PostgreSQL RÉEL, application complète.
 *
 * Ce que ce spec prouve, et que le spec du service ne peut pas : que le drapeau, le Manager, l'appareil, la session et l'audit naissent DANS UNE TRANSACTION (MP-40), que dix activations simultanées font UN
 * Manager (MP-22), qu'un échec d'insertion du Manager défait le drapeau posé une instruction plus tôt, qu'aucun jeton ni mot de passe n'est stocké en clair (MP-11), et que les cookies posés ont les attributs de S-99.
 *
 * ⛔ « avant l'activation, l'app Pro marche comme aujourd'hui » (MP-35) se mesure par la SUITE e2e existante, inchangée, et par les specs d'intégration existantes qui n'activent rien ; ce spec en pose seulement
 * la garde de principe (`staff-session-guard.int-spec.ts`).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { STAFF_LIMITS, StaffErrorCode } from "@zwadj/types";
import { STAFF_COMMON_PASSWORDS } from "../../src/staff/staff-common-passwords";
import { passwordSchema } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
import { Jar, MOT_DE_PASSE_PRO, MOT_DE_PASSE_STAFF, activer, appeler, codeDe, compterLignes, creerPro, lignesAudit, lireCookies, sha256 } from "./staff-helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("K-14 — l'activation nominale", () => {
  it("201 : le Manager est rendu ; le drapeau de la salle est posé ; UN membre MANAGER ACTIF, UN appareil, UNE session ; le mot de passe est haché en argon2id", async () => {
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    expect(res.status).toBe(201);
    const membre = (res.body as { member: { id: string; accountName: string; role: string; mustChangePassword: boolean } }).member;
    expect(membre).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), accountName: "Amine", role: "MANAGER", mustChangePassword: false });

    const profil = await ctx.prisma.$queryRaw<Array<{ actif: boolean }>>`SELECT (staff_layer_enabled_at IS NOT NULL) AS actif FROM pro_profiles WHERE id = ${pro.proProfileId}::uuid`;
    expect(profil).toEqual([{ actif: true }]);
    const membres = await ctx.prisma.$queryRaw<Array<{ role: string; status: string; account_name_key: string; password_hash: string; disabled_at: Date | null; must_change_password: boolean; pin_hash: string | null }>>`
      SELECT role::text AS role, status::text AS status, account_name_key, password_hash, disabled_at, must_change_password, pin_hash FROM pro_staff_members`;
    expect(membres).toHaveLength(1);
    expect(membres[0]).toMatchObject({ role: "MANAGER", status: "ACTIVE", account_name_key: "amine", disabled_at: null, must_change_password: false, pin_hash: null });
    expect(membres[0]!.password_hash.startsWith("$argon2id$")).toBe(true);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions")).toBe(1);
  });

  it("⛔ MP-40 — Manager, appareil et session sont liés : la session pointe l'appareil créé, qui pointe le Manager ; les trois échéances sont celles du levier (mot de passe 90 jours, appareil 90 jours, session 12 h)", async () => {
    const pro = await creerPro(ctx);
    await activer(ctx, pro);
    const l = await ctx.prisma.$queryRaw<Array<{ memb: string; app_memb: string; sess_app: string; app: string; jours_mdp: number; jours_app: number; heures_sess: number }>>`
      SELECT m.id::text AS memb, d.member_id::text AS app_memb, s.device_id::text AS sess_app, d.id::text AS app,
             extract(epoch FROM (m.password_expires_at - m.password_changed_at)) / 86400 AS jours_mdp,
             extract(epoch FROM (d.expires_at - d.created_at)) / 86400 AS jours_app,
             extract(epoch FROM (s.expires_at - s.created_at)) / 3600 AS heures_sess
        FROM pro_staff_members m JOIN pro_staff_devices d ON d.member_id = m.id JOIN pro_staff_sessions s ON s.member_id = m.id`;
    expect(l).toHaveLength(1);
    expect(l[0]!.app_memb).toBe(l[0]!.memb);
    expect(l[0]!.sess_app).toBe(l[0]!.app);
    expect(Number(l[0]!.jours_mdp)).toBeCloseTo(STAFF_LIMITS.PASSWORD_VALIDITY_DAYS, 3);
    expect(Number(l[0]!.jours_app)).toBeCloseTo(STAFF_LIMITS.PIN_VALIDITY_DAYS, 3);
    expect(Number(l[0]!.heures_sess)).toBeCloseTo(STAFF_LIMITS.SESSION_MAX_HOURS, 3);
  });

  it("⛔ S-99 / MP-37 — le cookie de SESSION : `HttpOnly`, `SameSite=Strict`, chemin `/api/v1`, AUCUNE échéance côté navigateur ; son hachage SHA-256 est celui de la base", async () => {
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    const session = lireCookies(res).find((c) => c.name === "zwadj_ss");
    expect(session).toBeDefined();
    expect(session!.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session!.attributs.has("httponly")).toBe(true);
    expect(session!.attributs.get("samesite")).toBe("Strict");
    expect(session!.attributs.get("path")).toBe("/api/v1");
    expect(session!.attributs.has("max-age"), "pas de Max-Age : la durée de vie est côté serveur").toBe(false);
    expect(session!.attributs.has("expires"), "pas d'Expires : cookie de session du navigateur").toBe(false);
    const ligne = await ctx.prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM pro_staff_sessions WHERE token_hash = ${sha256(session!.value)}`;
    expect(ligne[0]!.n).toBe(1);
  });

  it("⛔ S-99 / R-6 (D341) / MP-37 — le cookie d'APPAREIL : un par membre, `zwadj_dv_<suffixe>`, `HttpOnly`, `SameSite=Strict`, chemin `/api/v1/pro/staff`, échéance = la durée du PIN ; son hachage est celui de la base", async () => {
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    const appareils = lireCookies(res).filter((c) => c.name.startsWith("zwadj_dv_"));
    expect(appareils).toHaveLength(1);
    const a = appareils[0]!;
    expect(a.name).toMatch(/^zwadj_dv_[A-Za-z0-9_-]{8}$/);
    expect(a.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.attributs.has("httponly")).toBe(true);
    expect(a.attributs.get("samesite")).toBe("Strict");
    expect(a.attributs.get("path")).toBe("/api/v1/pro/staff");
    expect(Number(a.attributs.get("max-age"))).toBe(STAFF_LIMITS.PIN_VALIDITY_DAYS * 24 * 60 * 60);
    const ligne = await ctx.prisma.$queryRaw<Array<{ n: number; label: string }>>`SELECT count(*)::int AS n, max(label) AS label FROM pro_staff_devices WHERE token_hash = ${sha256(a.value)}`;
    expect(ligne[0]).toEqual({ n: 1, label: "Poste" });
  });

  it("⛔ MP-11 — AUCUN jeton ni mot de passe en clair en base : ni la session, ni l'appareil, ni le mot de passe du Manager ne figurent dans une seule colonne des tables du personnel ni de l'audit", async () => {
    const pro = await creerPro(ctx);
    const { res, jar } = await activer(ctx, pro);
    expect(res.status).toBe(201);
    const clair = [jar.session()!, jar.appareils()[0]!.value, MOT_DE_PASSE_STAFF];
    const toutes = JSON.stringify([
      await ctx.prisma.$queryRawUnsafe("SELECT * FROM pro_staff_members"),
      await ctx.prisma.$queryRawUnsafe("SELECT * FROM pro_staff_devices"),
      await ctx.prisma.$queryRawUnsafe("SELECT * FROM pro_staff_sessions"),
      await ctx.prisma.$queryRawUnsafe("SELECT * FROM audit_logs")
    ]);
    expect(toutes.length).toBeGreaterThan(200);
    for (const secret of clair) expect(toutes, "une valeur secrète est stockée en clair").not.toContain(secret);
  });

  it("⛔ MP-33 — UNE ligne d'audit `staff.activate`, écrite par la même transaction : l'acteur est le compte commun ET le Manager créé ; la charge utile ne porte que le rôle", async () => {
    const pro = await creerPro(ctx);
    const { res } = await activer(ctx, pro);
    const membreId = (res.body as { member: { id: string } }).member.id;
    const lignes = await lignesAudit(ctx.prisma, "staff.activate");
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ actor_id: pro.userId, actor_role: "PRO", actor_member_id: membreId, entity_type: "staff_member", entity_id: membreId, before: null });
    expect(lignes[0]!.after).toEqual({ role: "MANAGER" });
  });
});

describe("MP-22 — l'activation CONCURRENTE", () => {
  it.each([1, 2, 3])("⛔ dix activations simultanées (manche %i) : UNE réussit (201), les neuf autres rendent 409 `STAFF_ALREADY_ACTIVATED` ; un seul Manager, un seul appareil, une seule session, une seule ligne d'audit", async () => {
    const pro = await creerPro(ctx);
    const reponses = await Promise.all(Array.from({ length: 10 }, () => activer(ctx, pro)));
    const statuts = reponses.map((r) => r.res.status).sort();
    expect(statuts).toEqual([201, 409, 409, 409, 409, 409, 409, 409, 409, 409]);
    for (const { res } of reponses.filter((r) => r.res.status === 409)) expect(codeDe(res)).toBe(StaffErrorCode.STAFF_ALREADY_ACTIVATED);
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions")).toBe(1);
    expect(await lignesAudit(ctx.prisma, "staff.activate")).toHaveLength(1);
  });

  it("une seconde activation APRÈS la première : 409 `STAFF_ALREADY_ACTIVATED` (le drapeau ne se repose pas), et rien n'est ajouté", async () => {
    const pro = await creerPro(ctx);
    await activer(ctx, pro);
    const { res } = await activer(ctx, pro, new Jar(), "Autre", MOT_DE_PASSE_STAFF);
    expect(res.status).toBe(409);
    expect(codeDe(res)).toBe("STAFF_ALREADY_ACTIVATED");
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(1);
  });
});

describe("l'ACTIVATION REFUSÉE", () => {
  it("⛔ MP-23 — e-mail NON vérifié (changé depuis la connexion) : 403 `STAFF_EMAIL_NOT_VERIFIED`, RIEN n'est créé, le drapeau reste éteint", async () => {
    const pro = await creerPro(ctx);
    await ctx.prisma.$executeRaw`UPDATE users SET email_verified_at = NULL WHERE id = ${pro.userId}::uuid`;
    const { res } = await activer(ctx, pro);
    expect(res.status).toBe(403);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_EMAIL_NOT_VERIFIED);
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(0);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_profiles WHERE id = ${pro.proProfileId}::uuid AND staff_layer_enabled_at IS NOT NULL`).toHaveLength(0);
  });

  it("⛔ MP-23 — un CLIENT, un ADMIN : 403 `FORBIDDEN` (le rôle) ; sans Bearer : 401 `UNAUTHENTICATED` ; rien n'est créé", async () => {
    await registerUser(ctx, { role: "CLIENT", email: "client@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Aya", lastName: "B" });
    await verifyLastRegistered(ctx);
    const clientToken = await loginAs(ctx, "client@example.dz", MOT_DE_PASSE_PRO);
    await registerUser(ctx, { role: "CLIENT", email: "admin@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Adm", lastName: "In" });
    await verifyLastRegistered(ctx);
    await ctx.prisma.user.update({ where: { email: "admin@example.dz" }, data: { role: "ADMIN" } });
    const adminToken = await loginAs(ctx, "admin@example.dz", MOT_DE_PASSE_PRO);
    const corps = { accountName: "Amine", password: MOT_DE_PASSE_STAFF };
    for (const [nom, bearer, statut, code] of [
      ["client", clientToken, 403, "FORBIDDEN"],
      ["admin", adminToken, 403, "FORBIDDEN"],
      ["anonyme", undefined, 401, "UNAUTHENTICATED"]
    ] as const) {
      const res = await appeler(ctx, bearer, undefined, "post", "/api/v1/pro/staff/activate", corps);
      expect(res.status, nom).toBe(statut);
      expect(codeDe(res), nom).toBe(code);
    }
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(0);
  });

  it("⛔ MP-34 — les CINQ routes du personnel sont réservées au PRO : un CLIENT et un ADMIN reçoivent 403 `FORBIDDEN` sur chacune (l'état et la déconnexion comprises), un anonyme 401 `UNAUTHENTICATED`", async () => {
    await registerUser(ctx, { role: "CLIENT", email: "client2@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Aya", lastName: "B" });
    await verifyLastRegistered(ctx);
    const clientToken = await loginAs(ctx, "client2@example.dz", MOT_DE_PASSE_PRO);
    await registerUser(ctx, { role: "CLIENT", email: "admin2@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Adm", lastName: "In" });
    await verifyLastRegistered(ctx);
    await ctx.prisma.user.update({ where: { email: "admin2@example.dz" }, data: { role: "ADMIN" } });
    const adminToken = await loginAs(ctx, "admin2@example.dz", MOT_DE_PASSE_PRO);
    const routes: Array<["get" | "post", string, unknown]> = [
      ["post", "/api/v1/pro/staff/activate", { accountName: "Amine", password: MOT_DE_PASSE_STAFF }],
      ["post", "/api/v1/pro/staff/login", { accountName: "Amine", password: MOT_DE_PASSE_STAFF }],
      ["post", "/api/v1/pro/staff/logout", undefined],
      ["get", "/api/v1/pro/staff/session", undefined],
      ["post", "/api/v1/pro/staff/password", { currentPassword: MOT_DE_PASSE_STAFF, newPassword: "Nouveau-mot-de-passe-7" }]
    ];
    for (const [methode, chemin, corps] of routes) {
      for (const [nom, bearer, statut, code] of [
        ["client", clientToken, 403, "FORBIDDEN"],
        ["admin", adminToken, 403, "FORBIDDEN"],
        ["anonyme", undefined, 401, "UNAUTHENTICATED"]
      ] as const) {
        const res = await appeler(ctx, bearer, undefined, methode, chemin, corps);
        expect(res.status, `${nom} ${methode.toUpperCase()} ${chemin}`).toBe(statut);
        expect(codeDe(res), `${nom} ${methode.toUpperCase()} ${chemin}`).toBe(code);
      }
    }
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(0);
  });

  it("⛔ MP-24 — un mot de passe COURANT (une entrée de la liste qui passe déjà le schéma, dérivée de la liste) : 400 `STAFF_PASSWORD_COMMON`, rien n'est créé", async () => {
    const pro = await creerPro(ctx);
    const courant = STAFF_COMMON_PASSWORDS.find((p) => passwordSchema.safeParse(p).success)!;
    const { res } = await activer(ctx, pro, new Jar(), "Amine", courant);
    expect(res.status).toBe(400);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_PASSWORD_COMMON);
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(0);
  });

  it("la validation du corps : mot de passe trop faible, nom invalide, clé inconnue (`role`), corps vide → 400 avec les clés localisables", async () => {
    const pro = await creerPro(ctx);
    const cas: Array<[string, unknown, string]> = [
      ["mot de passe trop court", { accountName: "Amine", password: "court1" }, "auth.validation.passwordTooShort"],
      ["nom invalide", { accountName: "<b>", password: MOT_DE_PASSE_STAFF }, "staff.validation.accountNameInvalid"],
      ["nom trop court", { accountName: "a", password: MOT_DE_PASSE_STAFF }, "staff.validation.accountNameTooShort"],
      ["clé inconnue", { accountName: "Amine", password: MOT_DE_PASSE_STAFF, role: "EMPLOYEE" }, "staff.validation.unknownKey"],
      ["corps vide", {}, "staff.validation.accountNameRequired"]
    ];
    for (const [nom, corps, cle] of cas) {
      const res = await appeler(ctx, pro.token, undefined, "post", "/api/v1/pro/staff/activate", corps);
      expect(res.status, nom).toBe(400);
      expect(JSON.stringify(res.body), nom).toContain(cle);
    }
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(0);
  });

  it("⛔ la transaction est ATOMIQUE : si l'insertion du Manager échoue (un membre de même clé existe, drapeau éteint par une intervention manuelle), le drapeau posé une instruction plus tôt est DÉFAIT — 409 `STAFF_ACCOUNT_NAME_TAKEN`, drapeau toujours éteint", async () => {
    const pro = await creerPro(ctx);
    await ctx.prisma.$executeRaw`
      INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at)
      VALUES (${pro.proProfileId}::uuid, 'amine', 'amine', 'MANAGER', 'x', now(), now() + interval '90 days')`;
    const { res } = await activer(ctx, pro, new Jar(), "AMINE");
    expect(res.status).toBe(409);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_profiles WHERE id = ${pro.proProfileId}::uuid AND staff_layer_enabled_at IS NOT NULL`, "le drapeau n'a pas survécu au refus").toHaveLength(0);
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(0);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions")).toBe(0);
    expect(await lignesAudit(ctx.prisma, "staff.activate")).toHaveLength(0);
  });
});

describe("l'activation d'UN pro n'affecte pas les autres", () => {
  it("la couche d'une salle n'allume pas celle d'une autre : l'autre salle reste éteinte", async () => {
    const a = await creerPro(ctx);
    const b = await creerPro(ctx);
    await activer(ctx, a);
    const profils = await ctx.prisma.$queryRaw<Array<{ id: string; actif: boolean }>>`SELECT id::text AS id, (staff_layer_enabled_at IS NOT NULL) AS actif FROM pro_profiles WHERE id IN (${a.proProfileId}::uuid, ${b.proProfileId}::uuid)`;
    expect(Object.fromEntries(profils.map((p) => [p.id, p.actif]))).toEqual({ [a.proProfileId]: true, [b.proProfileId]: false });
  });
});
