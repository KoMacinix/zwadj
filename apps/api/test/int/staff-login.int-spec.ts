/**
 * K-15 / K-16 / K-17 — SE CONNECTER, SE DÉCONNECTER, LIRE L'ÉTAT — rang 44, L36-3a-1 (D341). PostgreSQL RÉEL, argon2 RÉEL.
 *
 * Ce que ce spec prouve et que le spec du service ne peut pas : la RÉSERVATION ATOMIQUE de la tentative (vingt connexions parallèles = cinq comptées, MP-16/MP-17, S-102), la pause de 15 minutes qui n'est JAMAIS définitive,
 * l'identité À L'OCTET de tous les refus (R-3 (D341), MP-8), le plafond et l'inactivité mesurés par vieillissement SQL (l'horloge qui décide est celle de la base, MP-13), la réutilisation d'un appareil et son refus
 * pour un autre membre ou une autre salle (MP-3), la révocation à l'instant (MP-19), et — par la sortie RÉELLE du journal — qu'aucun jeton de personnel n'y est écrit (MP-11).
 *
 * ⚠ Les comptes d'argon2 se mesurent par ESPION sur `PasswordService` (jamais par chronomètre, D290). `verifyAgainstDummy` appelle `verify` en interne : le « vrai » hachage se reconnaît donc au HACHAGE du membre
 * qu'il reçoit, pas au simple nombre d'appels de `verify`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_LIMITS, StaffErrorCode } from "@zwadj/types";
import { PasswordService } from "../../src/auth/password.service";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { creerApplicationJournalisee, type ContexteJournalise } from "./log-capture";
import {
  Jar,
  MOT_DE_PASSE_STAFF,
  activer,
  appeler,
  atteindrePlafond,
  codeDe,
  compterLignes,
  connecter,
  corpsStable,
  creerPro,
  lignesAudit,
  lireCookies,
  proActive,
  rendreInactive,
  sessionParJeton,
  sha256
} from "./staff-helpers";

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

const hachageDuMembre = async (membreId: string): Promise<string> =>
  (await ctx.prisma.$queryRaw<Array<{ h: string }>>`SELECT password_hash AS h FROM pro_staff_members WHERE id = ${membreId}::uuid`)[0]!.h;
const compteurs = async (membreId: string) =>
  (await ctx.prisma.$queryRaw<Array<{ echecs: number; en_pause: boolean; minutes_restantes: number | null; derniere: Date | null }>>`
    SELECT password_failed_count AS echecs, (password_locked_until IS NOT NULL AND password_locked_until > now()) AS en_pause,
           extract(epoch FROM (password_locked_until - now())) / 60 AS minutes_restantes, last_login_at AS derniere
      FROM pro_staff_members WHERE id = ${membreId}::uuid`)[0]!;
const MAUVAIS = "Mauvais-mot-de-passe-1";

describe("K-15 — la connexion nominale", () => {
  it("200 : le membre est rendu, une SESSION neuve est ouverte et son cookie posé, `last_login_at` est écrit, les compteurs sont à zéro, UNE ligne d'audit `staff.login`", async () => {
    const { pro, membreId } = await proActive(ctx);
    const res = await connecter(ctx, pro, new Jar());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ member: { id: membreId, accountName: "Amine", role: "MANAGER", mustChangePassword: false } });
    const session = lireCookies(res).find((c) => c.name === "zwadj_ss");
    expect(session?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session!.attributs.get("samesite")).toBe("Strict");
    expect(session!.attributs.has("max-age")).toBe(false);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions")).toBe(2);
    const c = await compteurs(membreId);
    expect(c.echecs).toBe(0);
    expect(c.derniere).not.toBeNull();
    const audit = await lignesAudit(ctx.prisma, "staff.login");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor_id: pro.userId, actor_role: "PRO", actor_member_id: membreId, entity_type: "staff_session" });
  });

  it("la recherche du membre se fait sur la CLÉ normalisée : « AMINE », « amine » et « Âmine » ouvrent le même compte", async () => {
    const { pro, membreId } = await proActive(ctx);
    for (const nom of ["AMINE", "amine", "Âmine", "  Amine  "]) {
      const res = await connecter(ctx, pro, new Jar(), nom);
      expect(res.status, nom).toBe(200);
      expect((res.body as { member: { id: string } }).member.id, nom).toBe(membreId);
    }
  });

  it("⛔ MP-3 — un poste déjà reconnu (son cookie d'appareil) RÉUTILISE l'appareil : aucun cookie d'appareil neuf, aucune ligne d'appareil de plus, `last_used_at` écrit", async () => {
    const { pro, jar } = await proActive(ctx);
    const res = await connecter(ctx, pro, jar);
    expect(res.status).toBe(200);
    expect(lireCookies(res).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(0);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(1);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_devices WHERE last_used_at IS NOT NULL`).toHaveLength(1);
    const audit = await lignesAudit(ctx.prisma, "staff.login");
    expect((audit[0]!.after as { deviceReused: boolean }).deviceReused).toBe(true);
  });

  it("un poste NEUF (aucun cookie d'appareil) reçoit un appareil neuf et son cookie", async () => {
    const { pro } = await proActive(ctx);
    const res = await connecter(ctx, pro, new Jar());
    expect(lireCookies(res).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(2);
  });

  it("⛔ MP-3 — le cookie d'appareil d'un AUTRE MEMBRE de la même salle n'est pas réutilisé : un appareil neuf est créé, l'appareil de l'autre n'est pas touché", async () => {
    const { pro } = await proActive(ctx);
    const jeton = "E".repeat(43);
    await ctx.prisma.$executeRaw`
      INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at)
      VALUES (${pro.proProfileId}::uuid, 'Sara', 'sara', 'EMPLOYEE', 'x', now(), now() + interval '90 days')`;
    await ctx.prisma.$executeRaw`
      INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at)
      SELECT id, ${sha256(jeton)}, 'Poste', now() + interval '90 days' FROM pro_staff_members WHERE account_name_key = 'sara'`;
    const jar = new Jar();
    jar.poser("zwadj_dv_sara0001", jeton, "/api/v1/pro/staff");
    const res = await connecter(ctx, pro, jar);
    expect(res.status).toBe(200);
    expect(lireCookies(res).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(1);
    expect(await compterLignes(ctx.prisma, "pro_staff_devices")).toBe(3);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_devices WHERE token_hash = ${sha256(jeton)} AND last_used_at IS NOT NULL`, "l'appareil de Sara n'a pas été touché").toHaveLength(0);
  });

  it("⛔ MP-3 — le cookie d'appareil d'une AUTRE SALLE n'est pas réutilisé, même pour le même nom de compte", async () => {
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    const jar = new Jar();
    jar.poser(b.jar.appareils()[0]!.name, b.jar.appareils()[0]!.value, "/api/v1/pro/staff");
    const res = await connecter(ctx, a.pro, jar);
    expect(res.status).toBe(200);
    expect(lireCookies(res).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(1);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_devices WHERE token_hash = ${sha256(b.jar.appareils()[0]!.value)} AND last_used_at IS NOT NULL`, "l'appareil de l'autre salle n'a pas été touché").toHaveLength(0);
  });

  it("un appareil RÉVOQUÉ ou EXPIRÉ n'est pas réutilisé", async () => {
    const { pro, jar } = await proActive(ctx);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_devices SET revoked_at = now()`;
    const r1 = await connecter(ctx, pro, jar.copie());
    expect(lireCookies(r1).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(1);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_devices SET revoked_at = NULL, created_at = now() - interval '100 days', expires_at = now() - interval '1 day'`;
    const r2 = await connecter(ctx, pro, jar.copie());
    expect(lireCookies(r2).filter((c) => c.name.startsWith("zwadj_dv_"))).toHaveLength(1);
  });

  it("⛔ MP-8 — un mot de passe juste ne paie QU'UN hachage réel, aucun factice", async () => {
    const { pro, membreId } = await proActive(ctx);
    const passwords = ctx.app.get(PasswordService, { strict: false });
    const verif = vi.spyOn(passwords, "verify");
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    const h = await hachageDuMembre(membreId);
    expect((await connecter(ctx, pro, new Jar())).status).toBe(200);
    expect(verif.mock.calls.filter(([hash]) => hash === h)).toHaveLength(1);
    expect(factice).not.toHaveBeenCalled();
  });
});

describe("R-3 (D341) / MP-8 — tous les refus sont IDENTIQUES à l'octet", () => {
  it("⛔ compte inconnu, mauvais mot de passe, membre désactivé, salle sans couche : même statut 401, même code `STAFF_INVALID_CREDENTIALS`, même corps (hors horodatage)", async () => {
    const { pro, membreId } = await proActive(ctx);
    const sansCouche = await creerPro(ctx);
    const rendus = new Map<string, string>();
    rendus.set("inconnu", corpsStable(await connecter(ctx, pro, new Jar(), "Inconnu")));
    rendus.set("mauvais mot de passe", corpsStable(await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS)));
    rendus.set("salle sans couche", corpsStable(await connecter(ctx, sansCouche, new Jar(), "Amine")));
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${membreId}::uuid`;
    rendus.set("désactivé", corpsStable(await connecter(ctx, pro, new Jar())));
    expect([...rendus.values()].every((v) => v.includes('"status":401'))).toBe(true);
    expect(new Set(rendus.values()).size, JSON.stringify([...rendus])).toBe(1);
    const res = await connecter(ctx, pro, new Jar(), "Inconnu");
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_INVALID_CREDENTIALS);
    expect((res.body as { message: { message: string } }).message.message).toBe("staff.errors.invalidCredentials");
  });

  it("⛔ MP-4 — un membre DÉSACTIVÉ n'accumule AUCUN échec et ne paie qu'un hachage FACTICE (compte éteint = compte inconnu)", async () => {
    const { pro, membreId } = await proActive(ctx);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${membreId}::uuid`;
    const passwords = ctx.app.get(PasswordService, { strict: false });
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    const h = await hachageDuMembre(membreId);
    const verif = vi.spyOn(passwords, "verify");
    const res = await connecter(ctx, pro, new Jar());
    expect(res.status).toBe(401);
    expect(factice).toHaveBeenCalledTimes(1);
    expect(verif.mock.calls.filter(([hash]) => hash === h)).toHaveLength(0);
    expect((await compteurs(membreId)).echecs).toBe(0);
  });

  it("⛔ MP-18 — le nom d'un membre d'une AUTRE salle est inconnu ici : 401 identique, aucun compteur de l'autre salle ne bouge", async () => {
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    const autre = await creerPro(ctx);
    await activer(ctx, autre, new Jar(), "Karim");
    const res = await connecter(ctx, a.pro, new Jar(), "Karim");
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_INVALID_CREDENTIALS");
    expect((await compteurs(b.membreId)).echecs).toBe(0);
  });
});

describe("MP-16 / MP-17 / S-102 — la pause de 5 échecs, jamais définitive", () => {
  it("⛔ VINGT connexions parallèles au mauvais mot de passe : exactement CINQ comptées, au plus CINQ vérifications du VRAI hachage, les quinze autres paient le factice ; vingt corps identiques ; la pause court", async () => {
    const { pro, membreId } = await proActive(ctx);
    const passwords = ctx.app.get(PasswordService, { strict: false });
    const h = await hachageDuMembre(membreId);
    const verif = vi.spyOn(passwords, "verify");
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    const reponses = await Promise.all(Array.from({ length: 20 }, () => connecter(ctx, pro, new Jar(), "Amine", MAUVAIS)));
    expect(reponses.map((r) => r.status)).toEqual(Array(20).fill(401));
    expect(new Set(reponses.map(corpsStable)).size, "tous les refus sont identiques à l'octet").toBe(1);
    expect(verif.mock.calls.filter(([hash]) => hash === h), "MP-17 : au plus cinq vérifications du VRAI hachage").toHaveLength(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(factice, "R-3 (D341) : les autres paient le factice, au même coût").toHaveBeenCalledTimes(20 - STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    const c = await compteurs(membreId);
    expect(c.echecs, "S-102 : cinq comptées, pas vingt").toBe(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(c.en_pause).toBe(true);
    expect(Number(c.minutes_restantes)).toBeGreaterThan(STAFF_LIMITS.PASSWORD_PAUSE_MINUTES - 1);
    expect(Number(c.minutes_restantes)).toBeLessThanOrEqual(STAFF_LIMITS.PASSWORD_PAUSE_MINUTES);
    expect(await lignesAudit(ctx.prisma, "staff.login_failed")).toHaveLength(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(await lignesAudit(ctx.prisma, "staff.password_pause")).toHaveLength(1);
  });

  it("⛔ PENDANT la pause, le BON mot de passe est refusé du même refus, sans vérifier le vrai hachage, sans toucher aux compteurs — et la pause ne se prolonge pas", async () => {
    const { pro, membreId } = await proActive(ctx);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES; i += 1) await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    const avant = await ctx.prisma.$queryRaw<Array<{ jusqua: Date }>>`SELECT password_locked_until AS jusqua FROM pro_staff_members WHERE id = ${membreId}::uuid`;
    const passwords = ctx.app.get(PasswordService, { strict: false });
    const h = await hachageDuMembre(membreId);
    const verif = vi.spyOn(passwords, "verify");
    const factice = vi.spyOn(passwords, "verifyAgainstDummy");
    const res = await connecter(ctx, pro, new Jar());
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_INVALID_CREDENTIALS);
    expect(verif.mock.calls.filter(([hash]) => hash === h)).toHaveLength(0);
    expect(factice).toHaveBeenCalledTimes(1);
    const apres = await ctx.prisma.$queryRaw<Array<{ jusqua: Date }>>`SELECT password_locked_until AS jusqua FROM pro_staff_members WHERE id = ${membreId}::uuid`;
    expect(apres[0]!.jusqua.getTime(), "la pause n'est pas rallongée par les tentatives qu'elle refuse").toBe(avant[0]!.jusqua.getTime());
    expect((await compteurs(membreId)).echecs).toBe(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(await compterLignes(ctx.prisma, "pro_staff_sessions"), "aucune session neuve").toBe(1);
  });

  it("⛔ la pause n'est JAMAIS définitive : une fois son échéance passée (vieillissement SQL), le bon mot de passe ouvre une session et remet les compteurs à zéro", async () => {
    const { pro, membreId } = await proActive(ctx);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES; i += 1) await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    expect((await compteurs(membreId)).en_pause).toBe(true);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET password_locked_until = now() - interval '1 second' WHERE id = ${membreId}::uuid`;
    const res = await connecter(ctx, pro, new Jar());
    expect(res.status).toBe(200);
    const c = await compteurs(membreId);
    expect(c.echecs).toBe(0);
    expect(c.en_pause).toBe(false);
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_members WHERE id = ${membreId}::uuid AND password_locked_until IS NULL`).toHaveLength(1);
  });

  it("⛔ après l'échéance, un mauvais mot de passe REPART du début (1 échec, pas 6) : le compteur ne survit pas à la pause", async () => {
    const { pro, membreId } = await proActive(ctx);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES; i += 1) await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET password_locked_until = now() - interval '1 second' WHERE id = ${membreId}::uuid`;
    const res = await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    expect(res.status).toBe(401);
    const c = await compteurs(membreId);
    expect(c.echecs).toBe(1);
    expect(c.en_pause).toBe(false);
  });

  it("quatre échecs ne font PAS de pause ; un bon mot de passe les remet à zéro (échecs CONSÉCUTIFS)", async () => {
    const { pro, membreId } = await proActive(ctx);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES - 1; i += 1) await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    expect((await compteurs(membreId)).en_pause).toBe(false);
    expect((await connecter(ctx, pro, new Jar())).status).toBe(200);
    expect((await compteurs(membreId)).echecs).toBe(0);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES - 1; i += 1) await connecter(ctx, pro, new Jar(), "Amine", MAUVAIS);
    expect((await compteurs(membreId)).en_pause, "quatre de plus après un succès : toujours pas de pause").toBe(false);
  });

  it("la pause d'un membre ne touche pas un autre membre, ni une autre salle", async () => {
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    for (let i = 0; i < STAFF_LIMITS.PASSWORD_MAX_FAILURES; i += 1) await connecter(ctx, a.pro, new Jar(), "Amine", MAUVAIS);
    expect((await compteurs(a.membreId)).en_pause).toBe(true);
    expect((await compteurs(b.membreId)).en_pause).toBe(false);
    expect((await connecter(ctx, b.pro, new Jar())).status).toBe(200);
  });
});

describe("MP-13 — l'inactivité et le plafond, côté serveur, à l'heure de la BASE", () => {
  const route = "/api/v1/pro/venues";
  const seuil = STAFF_LIMITS.IDLE_TIMEOUT_MINUTES * 60;

  it("⛔ JUSTE AVANT le seuil (9 min 30 s) : la requête passe ET l'activité est rafraîchie (la fenêtre glisse)", async () => {
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await rendreInactive(ctx.prisma, s.id, seuil - 30);
    expect((await appeler(ctx, pro.token, jar, "get", route)).status).toBe(200);
    const apres = await sessionParJeton(ctx.prisma, jar.session()!);
    const age = await ctx.prisma.$queryRaw<Array<{ secondes: number }>>`SELECT extract(epoch FROM (now() - last_activity_at)) AS secondes FROM pro_staff_sessions WHERE id = ${s.id}::uuid`;
    expect(Number(age[0]!.secondes)).toBeLessThan(10);
    expect(apres.ended_at).toBeNull();
  });

  it("⛔ JUSTE APRÈS le seuil (10 min 30 s) : 401 `STAFF_SESSION_REQUIRED`, et la fin `IDLE` est ÉCRITE sur la ligne de la session", async () => {
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await rendreInactive(ctx.prisma, s.id, seuil + 30);
    const res = await appeler(ctx, pro.token, jar, "get", route);
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe(StaffErrorCode.STAFF_SESSION_REQUIRED);
    const apres = await sessionParJeton(ctx.prisma, jar.session()!);
    expect(apres.end_reason).toBe("IDLE");
    expect(apres.ended_at).not.toBeNull();
  });

  it("⛔ le PLAFOND absolu atteint (12 h), activité récente : 401, et RIEN n'est écrit (l'énumération des fins n'a pas de valeur « plafond »)", async () => {
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await atteindrePlafond(ctx.prisma, s.id);
    const res = await appeler(ctx, pro.token, jar, "get", route);
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_SESSION_REQUIRED");
    const apres = await sessionParJeton(ctx.prisma, jar.session()!);
    expect(apres.ended_at).toBeNull();
    expect(apres.end_reason).toBeNull();
  });

  it("une session inactive ne ressuscite pas : une fois refusée, un second essai est refusé aussi (la fin est écrite)", async () => {
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await rendreInactive(ctx.prisma, s.id, seuil + 30);
    expect((await appeler(ctx, pro.token, jar, "get", route)).status).toBe(401);
    expect((await appeler(ctx, pro.token, jar, "get", route)).status).toBe(401);
  });
});

describe("K-16 — la déconnexion, MP-19 — le jeton rejoué", () => {
  it("200 `{ status: 'ok' }` : la session courante prend `LOGOUT`, le cookie de session est EFFACÉ, l'APPAREIL reste, UNE ligne d'audit `staff.logout`", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const jeton = jar.session()!;
    const res = await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/logout");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(jar.session(), "le pot a absorbé l'effacement").toBeUndefined();
    const s = await sessionParJeton(ctx.prisma, jeton);
    expect(s.end_reason).toBe("LOGOUT");
    expect(s.ended_at).not.toBeNull();
    expect(await ctx.prisma.$queryRaw`SELECT 1 FROM pro_staff_devices WHERE revoked_at IS NULL`).toHaveLength(1);
    const audit = await lignesAudit(ctx.prisma, "staff.logout");
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor_member_id: membreId, entity_type: "staff_session" });
  });

  it("⛔ MP-19 — rejouer l'ANCIEN cookie après la déconnexion : 401 `STAFF_SESSION_REQUIRED` à l'instant (révocable à l'instant)", async () => {
    const { pro, jar } = await proActive(ctx);
    const ancien = jar.copie();
    await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/logout");
    const res = await appeler(ctx, pro.token, ancien, "get", "/api/v1/pro/venues");
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_SESSION_REQUIRED");
  });

  it("se déconnecter deux fois : la seconde est refusée (la session n'existe plus) ; aucune seconde ligne d'audit", async () => {
    const { pro, jar } = await proActive(ctx);
    const ancien = jar.copie();
    await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/logout");
    const res = await appeler(ctx, pro.token, ancien, "post", "/api/v1/pro/staff/logout");
    expect(res.status).toBe(401);
    expect(await lignesAudit(ctx.prisma, "staff.logout")).toHaveLength(1);
  });

  it("⛔ MP-4 — un membre DÉSACTIVÉ pendant que sa session est ouverte : la requête suivante est refusée (401) et la session prend la fin `DISABLED`", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const jeton = jar.session()!;
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${membreId}::uuid`;
    const res = await appeler(ctx, pro.token, jar, "get", "/api/v1/pro/venues");
    expect(res.status).toBe(401);
    expect((await sessionParJeton(ctx.prisma, jeton)).end_reason).toBe("DISABLED");
  });

  it("se déconnecter AVANT toute activation : 401 `STAFF_SESSION_REQUIRED` (il n'y a rien à fermer ; la route n'est pas exemptée)", async () => {
    const pro = await creerPro(ctx);
    const res = await appeler(ctx, pro.token, undefined, "post", "/api/v1/pro/staff/logout");
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("STAFF_SESSION_REQUIRED");
  });
});

describe("K-17 — l'état de session : exemptée, jamais un refus, jamais une prolongation", () => {
  const etat = (ctx2: TestContext, bearer: string, jar?: Jar) => appeler(ctx2, bearer, jar, "get", "/api/v1/pro/staff/session");

  it("avant l'activation : `{ enabled: false, member: null, knownMembers: [] }`", async () => {
    const pro = await creerPro(ctx);
    const res = await etat(ctx, pro.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, member: null, knownMembers: [] });
  });

  it("activée, session valide et poste reconnu : le membre de la session ET les membres reconnus sur ce poste (identifiant, nom de compte, rôle — RIEN d'autre)", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    const res = await etat(ctx, pro.token, jar);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: true,
      member: { id: membreId, accountName: "Amine", role: "MANAGER", mustChangePassword: false },
      knownMembers: [{ id: membreId, accountName: "Amine", role: "MANAGER" }]
    });
  });

  it("activée, SANS cookie de session : 200 (jamais 401), `member: null` ; les membres reconnus viennent des cookies d'appareil seuls", async () => {
    const { pro, jar, membreId } = await proActive(ctx);
    jar.retirer("zwadj_ss");
    const res = await etat(ctx, pro.token, jar);
    expect(res.status).toBe(200);
    expect((res.body as { member: unknown }).member).toBeNull();
    expect((res.body as { knownMembers: unknown[] }).knownMembers).toEqual([{ id: membreId, accountName: "Amine", role: "MANAGER" }]);
  });

  it("⛔ une session TERMINÉE n'est pas rendue comme vivante (200, `member: null`) — et le poste reste reconnu", async () => {
    const { pro, jar } = await proActive(ctx);
    const ancien = jar.copie();
    await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/logout");
    const res = await etat(ctx, pro.token, ancien);
    expect(res.status).toBe(200);
    expect((res.body as { member: unknown }).member).toBeNull();
  });

  it("⛔ la lecture de l'état NE PROLONGE PAS la session : une session inactive depuis 9 minutes l'est toujours après la lecture", async () => {
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await rendreInactive(ctx.prisma, s.id, 9 * 60);
    expect((await etat(ctx, pro.token, jar)).status).toBe(200);
    const age = await ctx.prisma.$queryRaw<Array<{ secondes: number }>>`SELECT extract(epoch FROM (now() - last_activity_at)) AS secondes FROM pro_staff_sessions WHERE id = ${s.id}::uuid`;
    expect(Number(age[0]!.secondes)).toBeGreaterThanOrEqual(9 * 60);
  });

  it("⛔ MP-3 — seuls les membres de CETTE salle sont reconnus : le cookie d'appareil d'une autre salle n'ajoute personne ; un appareil révoqué ou expiré non plus", async () => {
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    const jar = a.jar.copie();
    jar.poser(b.jar.appareils()[0]!.name, b.jar.appareils()[0]!.value, "/api/v1/pro/staff");
    const res = await etat(ctx, a.pro.token, jar);
    expect((res.body as { knownMembers: unknown[] }).knownMembers).toEqual([{ id: a.membreId, accountName: "Amine", role: "MANAGER" }]);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_devices SET revoked_at = now()`;
    expect(((await etat(ctx, a.pro.token, a.jar)).body as { knownMembers: unknown[] }).knownMembers).toEqual([]);
  });

  it("un CLIENT ou un anonyme : 403 / 401, jamais l'état", async () => {
    const res = await appeler(ctx, undefined, undefined, "get", "/api/v1/pro/staff/session");
    expect(res.status).toBe(401);
    expect(codeDe(res)).toBe("UNAUTHENTICATED");
  });
});

describe("MP-11 — AUCUN jeton du personnel dans la sortie RÉELLE du journal des requêtes", () => {
  let journalise: ContexteJournalise;
  beforeAll(async () => {
    journalise = await creerApplicationJournalisee();
  });
  afterAll(async () => {
    await journalise.app.close();
  });

  it("⛔ activer, se connecter, se déconnecter, lire l'état, changer son mot de passe : les valeurs des cookies posés et les mots de passe ne sont NULLE PART dans la sortie, et chaque route a bien été journalisée", async () => {
    await truncateAll(journalise.prisma);
    const pro = await creerPro(journalise);
    journalise.vider();
    const jar = new Jar();
    const valeurs: string[] = [];
    const noter = (res: Awaited<ReturnType<typeof appeler>>) => valeurs.push(...lireCookies(res).filter((c) => c.value !== "").map((c) => c.value));

    noter((await activer(journalise, pro, jar)).res);
    noter(await connecter(journalise, pro, jar));
    noter(await appeler(journalise, pro.token, jar, "get", "/api/v1/pro/staff/session"));
    noter(await appeler(journalise, pro.token, jar, "post", "/api/v1/pro/staff/password", { currentPassword: MOT_DE_PASSE_STAFF, newPassword: "Nouveau-mot-de-passe-7" }));
    noter(await appeler(journalise, pro.token, jar, "post", "/api/v1/pro/staff/logout"));

    for (const [m, p] of [["POST", "/api/v1/pro/staff/activate"], ["POST", "/api/v1/pro/staff/login"], ["GET", "/api/v1/pro/staff/session"], ["POST", "/api/v1/pro/staff/password"], ["POST", "/api/v1/pro/staff/logout"]] as const) {
      await journalise.attendreRequete(m, p);
    }
    const sortie = journalise.sortie();
    expect(valeurs.length, "des cookies ont bien été posés (sinon cette garde ne mesure rien)").toBeGreaterThanOrEqual(4);
    for (const v of valeurs) expect(sortie, "une valeur de cookie du personnel est dans le journal").not.toContain(v);
    for (const secret of [MOT_DE_PASSE_STAFF, "Nouveau-mot-de-passe-7"]) expect(sortie).not.toContain(secret);
    expect(journalise.lignes().length).toBeGreaterThanOrEqual(5);
  });
});
