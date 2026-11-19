/**
 * LE PERSONNEL : CRÉER, LISTER, RÉINITIALISER, DÉSACTIVER — rang 56, L36-3a-2 (D354, K-19 à K-22, R-5, R-6, MP-19, MP-29 à MP-33). PostgreSQL RÉEL, les VRAIES routes, les vrais hachages argon2.
 *
 * ⛔ CE QUE CE FICHIER MESURE, ET QUE LES SPECS UNITAIRES NE VOIENT PAS : (1) le mot de passe temporaire est rendu UNE fois, `Cache-Control: no-store`, haché en base, jamais dans l'audit ni dans la liste ;
 * (2) une réinitialisation met fin à TOUTES les sessions et révoque TOUS les appareils — le jeton rejoué est refusé ; (3) une désactivation finit les sessions `DISABLED` ; (4) un membre d'une AUTRE salle est
 * un 404 indiscernable d'un identifiant inventé ; (5) R-6 — « une action sans trace, ou une trace sans action » se MESURE par un échec FORCÉ dans la transaction : un déclencheur refuse l'insertion de la ligne
 * d'audit, un autre refuse le COMMIT ; l'état doit être EXACTEMENT celui d'avant (patron de D349), puis le MÊME appel réussit une fois le déclencheur retiré.
 * ⚠ Les verdicts se lisent en `expect` de vitest sur `res.status` (D305 : `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_LIMITS, StaffAccountState, StaffErrorCode } from "@zwadj/types";
import { PasswordService } from "../../src/auth/password.service";
import { TEMPORARY_PASSWORD_ALPHABET, TEMPORARY_PASSWORD_LENGTH } from "../../src/staff/staff-temporary-password";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import {
  Jar,
  appareilsDuMembre,
  appeler,
  codeDe,
  compterLignes,
  connecter,
  corpsStable,
  creerMembre,
  creerPro,
  echeanceDuMotDePasse,
  lignesAudit,
  membreActif,
  membreParId,
  proActive,
  sessionsDuMembre,
  texteDeTousLesAudits
} from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

const url = (suffixe = "") => `/api/v1/pro/staff/members${suffixe}`;
const UUID_INVENTE = "00000000-0000-7000-8000-00000000000a";

/** Vrai si l'écart entre deux colonnes de date du membre est EXACTEMENT `jours` jours : les deux sont posées par le `now()` de la MÊME instruction. */
async function ecartEnJours(id: string, jours: number): Promise<boolean> {
  const r = await ctx.prisma.$queryRaw<Array<{ ok: boolean }>>`SELECT (password_expires_at - password_changed_at) = make_interval(days => ${jours}::int) AS ok FROM pro_staff_members WHERE id = ${id}::uuid`;
  return r[0]!.ok;
}

describe("K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
  });

  it("⛔ 201, `Cache-Control: no-store`, une forme EXACTE : le membre, le temporaire (12 caractères de l'alphabet), son échéance ; l'état est « mot de passe à changer »", async () => {
    const { res, id, temporaryPassword } = await creerMembre(ctx, m.pro, m.jar, "Karim");
    expect(res.status).toBe(201);
    expect(res.headers["cache-control"]).toBe("no-store");
    const corps = res.body as Record<string, unknown>;
    expect(Object.keys(corps).sort()).toEqual(["member", "temporaryPassword", "temporaryPasswordExpiresAt"]);
    expect(Object.keys(corps.member as object).sort()).toEqual(["accountName", "createdAt", "id", "lastLoginAt", "role", "state"]);
    expect(corps.member).toMatchObject({ id, accountName: "Karim", role: "EMPLOYEE", state: StaffAccountState.MUST_CHANGE_PASSWORD, lastLoginAt: null });
    expect(temporaryPassword).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
    expect([...temporaryPassword].every((c) => TEMPORARY_PASSWORD_ALPHABET.includes(c))).toBe(true);
  });

  it("⛔ en BASE : le hachage argon2 ne contient pas le clair mais le VÉRIFIE ; `must_change_password` est vrai ; l'échéance est de SEPT jours exactement (le levier) ; le créateur est le Manager ; l'échéance rendue est celle de la base", async () => {
    const { id, temporaryPassword, res } = await creerMembre(ctx, m.pro, m.jar, "Leila");
    expect(res.status).toBe(201);
    const ligne = await membreParId(ctx.prisma, id);
    expect(ligne.password_hash.startsWith("$argon2id$")).toBe(true);
    expect(ligne.password_hash.includes(temporaryPassword)).toBe(false);
    expect(await ctx.app.get(PasswordService).verify(ligne.password_hash, temporaryPassword)).toBe(true);
    expect(ligne.must_change_password).toBe(true);
    expect(await ecartEnJours(id, STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS)).toBe(true);
    expect(STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS).toBe(7);
    expect(ligne.created_by_member_id).toBe(m.membreId);
    expect(ligne.status).toBe("ACTIVE");
    expect((res.body as { temporaryPasswordExpiresAt: string }).temporaryPasswordExpiresAt).toBe(ligne.password_expires_at.toISOString());
  });

  it("⛔ R-6 — UNE ligne d'audit `staff.member_create`, le MANAGER pour acteur, le rôle pour seule charge utile ; ni le temporaire ni le nom de compte n'entrent dans AUCUNE ligne d'audit", async () => {
    const { id, temporaryPassword } = await creerMembre(ctx, m.pro, m.jar, "Samir");
    const lignes = (await lignesAudit(ctx.prisma, "staff.member_create")).filter((l) => l.entity_id === id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ actor_id: m.pro.userId, actor_role: "PRO", actor_member_id: m.membreId, entity_type: "staff_member", entity_id: id, after: { role: "EMPLOYEE" } });
    expect(lignes[0]!.before).toBeNull();
    const tout = await texteDeTousLesAudits(ctx.prisma);
    expect(tout.includes(temporaryPassword)).toBe(false);
    expect(tout.includes("Samir")).toBe(false);
  });

  it("le rôle MANAGER se choisit à la création (DR5 : « un second Manager le réinitialise ») : 201, rôle MANAGER, état « à changer »", async () => {
    const { res } = await creerMembre(ctx, m.pro, m.jar, "Responsable2", "MANAGER");
    expect(res.status).toBe(201);
    expect((res.body as { member: { role: string } }).member.role).toBe("MANAGER");
  });

  it("⛔ un nom déjà pris À LA NORMALISATION PRÈS (casse, accents) : 409 `STAFF_ACCOUNT_NAME_TAKEN`, aucune ligne de plus, aucun audit de plus, aucun temporaire dans la réponse", async () => {
    const avant = await compterLignes(ctx.prisma, "pro_staff_members");
    const auditsAvant = (await lignesAudit(ctx.prisma, "staff.member_create")).length;
    for (const nom of ["KARIM", "karim", "Karím"]) {
      const { res } = await creerMembre(ctx, m.pro, m.jar, nom);
      expect(res.status, nom).toBe(409);
      expect(codeDe(res), nom).toBe(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN);
      expect(JSON.stringify(res.body)).not.toContain("temporaryPassword");
    }
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(avant);
    expect((await lignesAudit(ctx.prisma, "staff.member_create")).length).toBe(auditsAvant);
  });

  it("⛔ un corps invalide est un 400, sans écriture : rôle absent, rôle inconnu, mot de passe CHOISI (le temporaire est généré), créateur forcé — une clé inconnue est refusée, pas ignorée", async () => {
    const avant = await compterLignes(ctx.prisma, "pro_staff_members");
    for (const corps of [{ accountName: "Zed" }, { accountName: "Zed", role: "ADMIN" }, { accountName: "Zed", role: "EMPLOYEE", password: "Motdepasse1" }, { accountName: "Zed", role: "EMPLOYEE", createdByMemberId: UUID_INVENTE }]) {
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(), corps);
      expect(res.status, JSON.stringify(corps)).toBe(400);
    }
    expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(avant);
  });

  it("couche ÉTEINTE (aucune activation) ou SANS session : 401 `STAFF_SESSION_REQUIRED` — une route de MEMBRE n'a pas de sens sans membre", async () => {
    const eteinte = await creerPro(ctx);
    const r1 = await appeler(ctx, eteinte.token, undefined, "post", url(), { accountName: "Zed", role: "EMPLOYEE" });
    expect([r1.status, codeDe(r1)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
    const r2 = await appeler(ctx, m.pro.token, undefined, "post", url(), { accountName: "Zed", role: "EMPLOYEE" });
    expect([r2.status, codeDe(r2)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
  });
});

describe("K-19 — lister les membres : ceux de MA salle, leur ÉTAT, aucun secret", () => {
  let a: Awaited<ReturnType<typeof proActive>>;
  let b: Awaited<ReturnType<typeof proActive>>;
  let listeA: { members: Array<{ id: string; accountName: string; role: string; state: string; lastLoginAt: string | null; createdAt: string }> };
  let texteA: string;

  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    a = await proActive(ctx, "Amine");
    b = await proActive(ctx, "AmineB");
    await creerMembre(ctx, a.pro, a.jar, "Karim"); // temporaire neuf : à changer
    await membreActif(ctx, a.pro, a.jar, "Leila"); // actif
    const sami = await creerMembre(ctx, a.pro, a.jar, "Sami"); // temporaire EXPIRÉ
    await echeanceDuMotDePasse(ctx.prisma, sami.id, -1);
    const nadia = await creerMembre(ctx, a.pro, a.jar, "Nadia"); // désactivée
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${nadia.id}::uuid`;
    await creerMembre(ctx, b.pro, b.jar, "Karim"); // le MÊME nom dans l'autre salle : permis (unique par salle)
    const res = await appeler(ctx, a.pro.token, a.jar, "get", url());
    expect(res.status).toBe(200);
    listeA = res.body as typeof listeA;
    texteA = JSON.stringify(res.body);
  });

  it("⛔ les membres de la salle A, DANS L'ORDRE DE CRÉATION, avec l'état jugé par la règle : actif, à changer, actif, temporaire expiré, désactivé", () => {
    expect(listeA.members.map((x) => [x.accountName, x.state])).toEqual([
      ["Amine", StaffAccountState.ACTIVE],
      ["Karim", StaffAccountState.MUST_CHANGE_PASSWORD],
      ["Leila", StaffAccountState.ACTIVE],
      ["Sami", StaffAccountState.TEMPORARY_EXPIRED],
      ["Nadia", StaffAccountState.DISABLED]
    ]);
    expect(listeA.members.map((x) => x.role)).toEqual(["MANAGER", "EMPLOYEE", "EMPLOYEE", "EMPLOYEE", "EMPLOYEE"]);
  });

  it("⛔ jamais un membre d'une AUTRE salle : B a son propre « Karim » et son propre Manager, et rien n'en fuit dans la liste de A", async () => {
    const res = await appeler(ctx, b.pro.token, b.jar, "get", url());
    const idsB = (res.body as typeof listeA).members.map((x) => x.id);
    expect(idsB).toHaveLength(2);
    for (const id of idsB) expect(listeA.members.map((x) => x.id)).not.toContain(id);
  });

  it("⛔ chaque membre n'a QUE six champs ; la dernière connexion est une date ISO pour qui s'est connecté et null pour les autres ; AUCUN hachage, compteur, verrou, jeton, échéance, ni mot de passe dans le texte de la réponse", () => {
    for (const m of listeA.members) expect(Object.keys(m).sort()).toEqual(["accountName", "createdAt", "id", "lastLoginAt", "role", "state"]);
    const par = Object.fromEntries(listeA.members.map((x) => [x.accountName, x.lastLoginAt]));
    expect(par.Leila).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(par.Karim).toBeNull();
    // Les CLÉS sont déjà exactes (six, ci-dessus) : ce motif ne lit que les VALEURS — jamais « password » ni « expire » (l'état « MUST_CHANGE_PASSWORD » ou « TEMPORARY_EXPIRED » est une valeur légitime, le premier jet les refusait).
    expect(texteA).not.toMatch(/argon2|hash|failed|locked|token|expiresAt/i);
  });

  it("⛔ MP-11 — le temporaire d'un membre n'est JAMAIS relisible : ni dans la liste, ni après une seconde lecture (il n'a été rendu qu'à la création)", async () => {
    const { temporaryPassword } = await creerMembre(ctx, a.pro, a.jar, "Relu");
    const res = await appeler(ctx, a.pro.token, a.jar, "get", url());
    expect(JSON.stringify(res.body).includes(temporaryPassword)).toBe(false);
  });
});

describe("K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105, MP-19, MP-29)", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  let e: { id: string; jar: Jar; password: string };
  let jar2: Jar;
  let reponse: { status: number; cacheControl: string | undefined; corps: { member: { id: string; state: string }; temporaryPassword: string; temporaryPasswordExpiresAt: string } };
  let hashAvant: string;

  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
    e = await membreActif(ctx, m.pro, m.jar, "Karim");
    jar2 = new Jar(); // un SECOND poste du même membre : une seconde session, un second appareil
    expect((await connecter(ctx, m.pro, jar2, "Karim", e.password)).status).toBe(200);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET password_failed_count = 3, password_locked_until = now() + interval '1 hour' WHERE id = ${e.id}::uuid`;
    hashAvant = (await membreParId(ctx.prisma, e.id)).password_hash;
    const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/reset-password`));
    reponse = { status: res.status, cacheControl: res.headers["cache-control"], corps: res.body as typeof reponse.corps };
  });

  it("⛔ 200, `Cache-Control: no-store`, le membre et un temporaire NEUF (12 caractères de l'alphabet, jamais l'ancien mot de passe), l'état « à changer »", () => {
    expect(reponse.status).toBe(200);
    expect(reponse.cacheControl).toBe("no-store");
    expect(Object.keys(reponse.corps).sort()).toEqual(["member", "temporaryPassword", "temporaryPasswordExpiresAt"]);
    expect(reponse.corps.member.id).toBe(e.id);
    expect(reponse.corps.member.state).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
    expect(reponse.corps.temporaryPassword).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
    expect(reponse.corps.temporaryPassword).not.toBe(e.password);
  });

  it("⛔ en BASE : le hachage a CHANGÉ et vérifie le temporaire ; `must_change_password` vrai ; SEPT jours ; compteur d'échecs et pause remis à zéro ; le clair n'est nulle part", async () => {
    const ligne = await membreParId(ctx.prisma, e.id);
    expect(ligne.password_hash).not.toBe(hashAvant);
    expect(await ctx.app.get(PasswordService).verify(ligne.password_hash, reponse.corps.temporaryPassword)).toBe(true);
    expect(await ctx.app.get(PasswordService).verify(ligne.password_hash, e.password)).toBe(false);
    expect(ligne.must_change_password).toBe(true);
    expect(await ecartEnJours(e.id, STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS)).toBe(true);
    expect(ligne.password_failed_count).toBe(0);
    expect(ligne.password_locked_until).toBeNull();
    expect(ligne.password_hash.includes(reponse.corps.temporaryPassword)).toBe(false);
  });

  it("⛔ S-105 — TOUTES les sessions du membre (deux postes) ont pris fin, `PASSWORD_CHANGED`, et TOUS ses appareils sont révoqués", async () => {
    const sessions = await sessionsDuMembre(ctx.prisma, e.id);
    expect(sessions).toHaveLength(2);
    for (const s of sessions) expect([s.ended_at !== null, s.end_reason]).toEqual([true, "PASSWORD_CHANGED"]);
    const appareils = await appareilsDuMembre(ctx.prisma, e.id);
    expect(appareils).toHaveLength(2);
    for (const a of appareils) expect(a.revoked_at).not.toBeNull();
  });

  it("⛔ MP-19 — le JETON REJOUÉ : l'ancien cookie de session de CHACUN des deux postes est refusé, 401 `STAFF_SESSION_REQUIRED`", async () => {
    for (const jar of [e.jar, jar2]) {
      const res = await appeler(ctx, m.pro.token, jar, "get", "/api/v1/pro/venues");
      expect([res.status, codeDe(res)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
    }
  });

  it("⛔ l'ANCIEN mot de passe ne connecte plus (le même 401 qu'un mauvais mot de passe) ; le TEMPORAIRE connecte, avec « mot de passe à changer »", async () => {
    const ancien = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    expect([ancien.status, codeDe(ancien)]).toEqual([401, StaffErrorCode.STAFF_INVALID_CREDENTIALS]);
    const neuf = await connecter(ctx, m.pro, new Jar(), "Karim", reponse.corps.temporaryPassword);
    expect(neuf.status).toBe(200);
    expect((neuf.body as { member: { mustChangePassword: boolean } }).member.mustChangePassword).toBe(true);
  });

  it("⛔ R-6 — UNE ligne d'audit `staff.member_reset_password`, le MANAGER pour acteur, les COMPTES pour charge utile ; le temporaire n'est dans aucune ligne", async () => {
    const lignes = (await lignesAudit(ctx.prisma, "staff.member_reset_password")).filter((l) => l.entity_id === e.id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ actor_id: m.pro.userId, actor_member_id: m.membreId, entity_type: "staff_member", after: { sessionsEnded: 2, devicesRevoked: 2 } });
    expect((await texteDeTousLesAudits(ctx.prisma)).includes(reponse.corps.temporaryPassword)).toBe(false);
  });

  it("une SECONDE réinitialisation rend un AUTRE temporaire (rien n'est mémorisé) ; la liste ne le contient pas", async () => {
    const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/reset-password`));
    expect(res.status).toBe(200);
    const second = (res.body as { temporaryPassword: string }).temporaryPassword;
    expect(second).not.toBe(reponse.corps.temporaryPassword);
    const liste = await appeler(ctx, m.pro.token, m.jar, "get", url());
    expect(JSON.stringify(liste.body).includes(second)).toBe(false);
  });

  it("⛔ un membre DÉSACTIVÉ : 409 `STAFF_MEMBER_DISABLED`, le hachage ne change pas, aucune ligne d'audit de plus", async () => {
    const d = await creerMembre(ctx, m.pro, m.jar, "Eteint");
    await ctx.prisma.$executeRaw`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE id = ${d.id}::uuid`;
    const avant = (await membreParId(ctx.prisma, d.id)).password_hash;
    const auditsAvant = (await lignesAudit(ctx.prisma, "staff.member_reset_password")).length;
    const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${d.id}/reset-password`));
    expect([res.status, codeDe(res)]).toEqual([409, StaffErrorCode.STAFF_MEMBER_DISABLED]);
    expect((await membreParId(ctx.prisma, d.id)).password_hash).toBe(avant);
    expect((await lignesAudit(ctx.prisma, "staff.member_reset_password")).length).toBe(auditsAvant);
  });

  it("⛔ un membre d'une AUTRE salle et un identifiant inventé donnent le MÊME 404 `STAFF_MEMBER_NOT_FOUND` (octet pour octet, hors horodatage) ; le membre étranger n'est pas touché ; un identifiant qui n'est pas un UUID est un 400", async () => {
    const autre = await proActive(ctx);
    const etranger = await creerMembre(ctx, autre.pro, autre.jar, "Etranger");
    const avant = (await membreParId(ctx.prisma, etranger.id)).password_hash;
    const r1 = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${etranger.id}/reset-password`));
    const r2 = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${UUID_INVENTE}/reset-password`));
    expect([r1.status, codeDe(r1)]).toEqual([404, StaffErrorCode.STAFF_MEMBER_NOT_FOUND]);
    expect(corpsStable(r1).replace(etranger.id, "ID")).toBe(corpsStable(r2).replace(UUID_INVENTE, "ID"));
    expect((await membreParId(ctx.prisma, etranger.id)).password_hash).toBe(avant);
    const r3 = await appeler(ctx, m.pro.token, m.jar, "post", url("/pas-un-uuid/reset-password"));
    expect(r3.status).toBe(400);
  });
});

describe("K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31)", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  let e: { id: string; jar: Jar; password: string };
  let jar2: Jar;
  let premiere: { status: number; corps: { member: { id: string; state: string } } };
  let disabledAt: Date | null;

  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
    e = await membreActif(ctx, m.pro, m.jar, "Karim");
    jar2 = new Jar();
    expect((await connecter(ctx, m.pro, jar2, "Karim", e.password)).status).toBe(200);
    const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/disable`));
    premiere = { status: res.status, corps: res.body as typeof premiere.corps };
    disabledAt = (await membreParId(ctx.prisma, e.id)).disabled_at;
  });

  it("⛔ 200, le membre rendu est DÉSACTIVÉ ; en base `status = DISABLED` et `disabled_at` posé", async () => {
    expect(premiere.status).toBe(200);
    expect([premiere.corps.member.id, premiere.corps.member.state]).toEqual([e.id, StaffAccountState.DISABLED]);
    const ligne = await membreParId(ctx.prisma, e.id);
    expect([ligne.status, ligne.disabled_at !== null]).toEqual(["DISABLED", true]);
  });

  it("⛔ MP-30 — TOUTES ses sessions ont pris fin `DISABLED` (deux postes) ; le jeton rejoué est refusé 401 `STAFF_SESSION_REQUIRED`", async () => {
    const sessions = await sessionsDuMembre(ctx.prisma, e.id);
    expect(sessions).toHaveLength(2);
    for (const s of sessions) expect([s.ended_at !== null, s.end_reason]).toEqual([true, "DISABLED"]);
    for (const jar of [e.jar, jar2]) {
      const res = await appeler(ctx, m.pro.token, jar, "get", "/api/v1/pro/venues");
      expect([res.status, codeDe(res)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
    }
  });

  it("⛔ le membre désactivé ne se connecte plus : le MÊME 401 `STAFF_INVALID_CREDENTIALS` qu'un mauvais mot de passe, à l'octet près", async () => {
    const desactive = await connecter(ctx, m.pro, new Jar(), "Karim", e.password);
    const faux = await connecter(ctx, m.pro, new Jar(), "Karim", "Mauvais-mot-de-passe9");
    expect([desactive.status, codeDe(desactive)]).toEqual([401, StaffErrorCode.STAFF_INVALID_CREDENTIALS]);
    expect(corpsStable(desactive)).toBe(corpsStable(faux));
  });

  it("⛔ R-6 — UNE ligne d'audit `staff.member_disable`, le MANAGER pour acteur, le rôle et le nombre de sessions pour charge utile", async () => {
    const lignes = (await lignesAudit(ctx.prisma, "staff.member_disable")).filter((l) => l.entity_id === e.id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ actor_id: m.pro.userId, actor_member_id: m.membreId, entity_type: "staff_member", after: { role: "EMPLOYEE", sessionsEnded: 2 } });
  });

  it("⛔ patron de D349 — une désactivation RÉPÉTÉE est un 200 SANS écriture : la date de désactivation ne bouge pas, aucune ligne d'audit de plus", async () => {
    const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/disable`));
    expect([res.status, (res.body as { member: { state: string } }).member.state]).toEqual([200, StaffAccountState.DISABLED]);
    expect((await membreParId(ctx.prisma, e.id)).disabled_at).toEqual(disabledAt);
    expect((await lignesAudit(ctx.prisma, "staff.member_disable")).filter((l) => l.entity_id === e.id)).toHaveLength(1);
  });

  it("un membre d'une AUTRE salle ou inventé : 404 `STAFF_MEMBER_NOT_FOUND`, le membre étranger reste ACTIF", async () => {
    const autre = await proActive(ctx);
    const etranger = await creerMembre(ctx, autre.pro, autre.jar, "Etranger");
    const r1 = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${etranger.id}/disable`));
    const r2 = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${UUID_INVENTE}/disable`));
    expect([r1.status, codeDe(r1)]).toEqual([404, StaffErrorCode.STAFF_MEMBER_NOT_FOUND]);
    expect([r2.status, codeDe(r2)]).toEqual([404, StaffErrorCode.STAFF_MEMBER_NOT_FOUND]);
    expect((await membreParId(ctx.prisma, etranger.id)).status).toBe("ACTIVE");
  });

  it("⛔ MP-31 — un Manager se désactive LUI-MÊME quand un autre Manager reste : 200 ; sa propre session prend fin ; la salle garde son Manager", async () => {
    await truncateAll(ctx.prisma);
    const salle = await proActive(ctx);
    const second = await membreActif(ctx, salle.pro, salle.jar, "Second", "MANAGER");
    const res = await appeler(ctx, salle.pro.token, salle.jar, "post", url(`/${salle.membreId}/disable`));
    expect([res.status, (res.body as { member: { state: string } }).member.state]).toEqual([200, StaffAccountState.DISABLED]);
    const apres = await appeler(ctx, salle.pro.token, salle.jar, "get", "/api/v1/pro/venues");
    expect([apres.status, codeDe(apres)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
    const encore = await appeler(ctx, salle.pro.token, second.jar, "get", url());
    expect(encore.status).toBe(200);
  });
});

// ── R-6 : UNE ACTION SANS TRACE OU UNE TRACE SANS ACTION SE MESURE PAR UN ÉCHEC FORCÉ (patron de D349) ─────────────────────────────────────────────────────────────────────────────────────────────────
async function forcerEchecDuJournal(action: string): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r56_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé du journal (test R-6, D354)'; END; $$");
  await ctx.prisma.$executeRawUnsafe(`CREATE TRIGGER r56_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION r56_fail_audit()`);
}
async function forcerEchecAuCommit(evenement: "INSERT" | "UPDATE"): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r56_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé au commit (test R-6, D354)'; END; $$");
  await ctx.prisma.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER r56_fail_commit AFTER ${evenement} ON pro_staff_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION r56_fail_commit()`);
}
async function retirerLesEchecs(): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r56_fail_audit ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS r56_fail_audit()");
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r56_fail_commit ON pro_staff_members");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS r56_fail_commit()");
}

describe("R-6 — une action sans trace, ou une trace sans action : un échec FORCÉ dans la transaction laisse l'état EXACTEMENT celui d'avant", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
  });
  afterAll(retirerLesEchecs);

  it("⛔ K-20 — le journal REFUSE sa ligne : 500, AUCUN membre créé ; le déclencheur retiré, le MÊME appel réussit (c'était bien le journal)", async () => {
    const avant = await compterLignes(ctx.prisma, "pro_staff_members");
    try {
      await forcerEchecDuJournal("staff.member_create");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(), { accountName: "Forcee", role: "EMPLOYEE" });
      expect(res.status).toBe(500);
      expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(avant);
    } finally {
      await retirerLesEchecs();
    }
    const ok = await appeler(ctx, m.pro.token, m.jar, "post", url(), { accountName: "Forcee", role: "EMPLOYEE" });
    expect(ok.status).toBe(201);
  });

  it("⛔ K-20 — le COMMIT est refusé : 500, ni membre NI ligne d'audit (une trace écrite hors transaction y survivrait) ; le même appel réussit ensuite", async () => {
    const avant = await compterLignes(ctx.prisma, "pro_staff_members");
    const auditsAvant = (await lignesAudit(ctx.prisma, "staff.member_create")).length;
    try {
      await forcerEchecAuCommit("INSERT");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(), { accountName: "Forcee2", role: "EMPLOYEE" });
      expect(res.status).toBe(500);
      expect(await compterLignes(ctx.prisma, "pro_staff_members")).toBe(avant);
      expect((await lignesAudit(ctx.prisma, "staff.member_create")).length).toBe(auditsAvant);
    } finally {
      await retirerLesEchecs();
    }
    expect((await appeler(ctx, m.pro.token, m.jar, "post", url(), { accountName: "Forcee2", role: "EMPLOYEE" })).status).toBe(201);
  });

  it("⛔ K-21 — le journal refuse : 500, le mot de passe, les sessions et les appareils sont EXACTEMENT ceux d'avant ; puis le même appel réussit", async () => {
    const e = await membreActif(ctx, m.pro, m.jar, "ReinitForcee");
    const avant = await membreParId(ctx.prisma, e.id);
    try {
      await forcerEchecDuJournal("staff.member_reset_password");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/reset-password`));
      expect(res.status).toBe(500);
      const apres = await membreParId(ctx.prisma, e.id);
      expect([apres.password_hash, apres.must_change_password]).toEqual([avant.password_hash, avant.must_change_password]);
      for (const s of await sessionsDuMembre(ctx.prisma, e.id)) expect(s.ended_at).toBeNull();
      for (const a of await appareilsDuMembre(ctx.prisma, e.id)) expect(a.revoked_at).toBeNull();
      const vivante = await appeler(ctx, m.pro.token, e.jar, "get", "/api/v1/pro/venues");
      expect(vivante.status).toBe(200);
    } finally {
      await retirerLesEchecs();
    }
    expect((await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/reset-password`))).status).toBe(200);
  });

  it("⛔ K-21 — le COMMIT est refusé : 500, rien n'a changé, aucune ligne d'audit", async () => {
    const e = await membreActif(ctx, m.pro, m.jar, "ReinitCommit");
    const avant = await membreParId(ctx.prisma, e.id);
    const auditsAvant = (await lignesAudit(ctx.prisma, "staff.member_reset_password")).length;
    try {
      await forcerEchecAuCommit("UPDATE");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/reset-password`));
      expect(res.status).toBe(500);
      expect((await membreParId(ctx.prisma, e.id)).password_hash).toBe(avant.password_hash);
      expect((await lignesAudit(ctx.prisma, "staff.member_reset_password")).length).toBe(auditsAvant);
    } finally {
      await retirerLesEchecs();
    }
  });

  it("⛔ K-22 — le journal refuse : 500, le membre reste ACTIF, ses sessions vivantes ; puis le même appel réussit", async () => {
    const e = await membreActif(ctx, m.pro, m.jar, "DesactForcee");
    try {
      await forcerEchecDuJournal("staff.member_disable");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/disable`));
      expect(res.status).toBe(500);
      expect((await membreParId(ctx.prisma, e.id)).status).toBe("ACTIVE");
      for (const s of await sessionsDuMembre(ctx.prisma, e.id)) expect(s.ended_at).toBeNull();
    } finally {
      await retirerLesEchecs();
    }
    expect((await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/disable`))).status).toBe(200);
  });

  it("⛔ K-22 — le COMMIT est refusé : 500, le membre reste ACTIF, aucune ligne d'audit", async () => {
    const e = await membreActif(ctx, m.pro, m.jar, "DesactCommit");
    const auditsAvant = (await lignesAudit(ctx.prisma, "staff.member_disable")).length;
    try {
      await forcerEchecAuCommit("UPDATE");
      const res = await appeler(ctx, m.pro.token, m.jar, "post", url(`/${e.id}/disable`));
      expect(res.status).toBe(500);
      expect((await membreParId(ctx.prisma, e.id)).status).toBe("ACTIVE");
      expect((await lignesAudit(ctx.prisma, "staff.member_disable")).length).toBe(auditsAvant);
    } finally {
      await retirerLesEchecs();
    }
  });
});
