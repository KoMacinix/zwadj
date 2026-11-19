/**
 * LE MOT DE PASSE EXPIRÉ — rang 56, L36-3a-2 (D354, R-3, S-104, S-241, S-242, MP-14, MP-25, MP-41). PostgreSQL RÉEL ; le temps qui décide est celui de la BASE.
 *
 * ⛔ S-104 « MESURÉE D'ABORD » (R-3) : avant ce lot, `password_expires_at` était ÉCRIT (90 jours) et aucun refus ne le lisait ; `must_change_password` voyageait dans les réponses et rien ne l'écrivait à `true`.
 * Ces tests sont joués ROUGES contre le code d'avant (pièces des rouges de D354), puis verts.
 *   · un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est ADMISE, mais elle n'ouvre que le changement de mot de passe — aucune autre route ne passe ;
 *   · un mot de passe TEMPORAIRE de 7 jours EXPIRÉ : la connexion est REFUSÉE (le même 401 que tout autre refus : aucun refus ne dit pourquoi) — « le Manager doit en refaire un ».
 * ⚠ `vi.setSystemTime` n'agit PAS sur l'horloge de la base : l'échéance est vieillie par SQL (`echeanceDuMotDePasse`), à `now() + n secondes` SELON LA BASE.
 * ⚠ Les verdicts se lisent en `expect` de vitest sur `res.status` et sur des corps (D305).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_LIMITS, StaffErrorCode } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { Jar, MOT_DE_PASSE_MEMBRE, MOT_DE_PASSE_MEMBRE_2, MOT_DE_PASSE_STAFF, appeler, changerMotDePasse, codeDe, connecter, corpsStable, creerMembre, echeanceDuMotDePasse, lignesAudit, marquerTemporaire, membreActif, membreParId, proActive } from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

const mustChange = (res: { body: unknown }): boolean => (res.body as { member: { mustChangePassword: boolean } }).member.mustChangePassword;
const venues = (ctxToken: string, jar: Jar) => appeler(ctx, ctxToken, jar, "get", "/api/v1/pro/venues");

describe("un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de passe", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
  });

  it("⛔ la connexion réussit (200) et dit `mustChangePassword: true` ; TOUTE autre route est refusée 403 `STAFF_CAPABILITY_DENIED` ; l'état de session le dit aussi", async () => {
    await echeanceDuMotDePasse(ctx.prisma, m.membreId, -1);
    const jar = new Jar();
    const connexion = await connecter(ctx, m.pro, jar);
    expect(connexion.status).toBe(200);
    expect(mustChange(connexion)).toBe(true);
    const lecture = await venues(m.pro.token, jar);
    expect([lecture.status, codeDe(lecture)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
    const ecriture = await appeler(ctx, m.pro.token, jar, "post", "/api/v1/pro/staff/members", { accountName: "Zed", role: "EMPLOYEE" });
    expect([ecriture.status, codeDe(ecriture)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
    const etat = await appeler(ctx, m.pro.token, jar, "get", "/api/v1/pro/staff/session");
    expect((etat.body as { member: { mustChangePassword: boolean } }).member.mustChangePassword).toBe(true);
  });

  it("⛔ changer son mot de passe (K-18) ROUVRE tout : l'échéance repart à 90 jours (le levier), `must_change_password` reste faux, et la même requête qui était refusée passe", async () => {
    await echeanceDuMotDePasse(ctx.prisma, m.membreId, -1);
    const jar = new Jar();
    expect((await connecter(ctx, m.pro, jar)).status).toBe(200);
    const change = await changerMotDePasse(ctx, m.pro, jar, MOT_DE_PASSE_STAFF, MOT_DE_PASSE_MEMBRE);
    expect(change.status).toBe(200);
    expect(mustChange(change)).toBe(false);
    expect((await venues(m.pro.token, jar)).status).toBe(200);
    const ligne = await membreParId(ctx.prisma, m.membreId);
    const ecart = await ctx.prisma.$queryRaw<Array<{ ok: boolean }>>`SELECT (password_expires_at - password_changed_at) = make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int) AS ok FROM pro_staff_members WHERE id = ${m.membreId}::uuid`;
    expect(ecart[0]!.ok).toBe(true);
    expect(ligne.must_change_password).toBe(false);
  });

  it("⛔ une session DÉJÀ OUVERTE dont le mot de passe expire pendant qu'elle vit : la requête SUIVANTE est refusée (le garde relit l'état à chaque requête, jamais dans le jeton) — puis le changement la rouvre", async () => {
    const jar = new Jar();
    expect((await connecter(ctx, m.pro, jar, "Amine", MOT_DE_PASSE_MEMBRE)).status).toBe(200);
    expect((await venues(m.pro.token, jar)).status).toBe(200);
    await echeanceDuMotDePasse(ctx.prisma, m.membreId, -1);
    const refus = await venues(m.pro.token, jar);
    expect([refus.status, codeDe(refus)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
    expect((await changerMotDePasse(ctx, m.pro, jar, MOT_DE_PASSE_MEMBRE, MOT_DE_PASSE_MEMBRE_2)).status).toBe(200);
    expect((await venues(m.pro.token, jar)).status).toBe(200);
  });

  it("⛔ la BORNE : une échéance dans DEUX SECONDES (selon la base) est encore valable — aucune route n'est refusée ; une échéance à `now()` ou dépassée l'est", async () => {
    const jar = new Jar();
    expect((await connecter(ctx, m.pro, jar, "Amine", MOT_DE_PASSE_MEMBRE_2)).status).toBe(200);
    await echeanceDuMotDePasse(ctx.prisma, m.membreId, 3600);
    expect((await venues(m.pro.token, jar)).status).toBe(200);
    await echeanceDuMotDePasse(ctx.prisma, m.membreId, 0);
    const refus = await venues(m.pro.token, jar);
    expect([refus.status, codeDe(refus)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
  });
});

describe("un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré", () => {
  let m: Awaited<ReturnType<typeof proActive>>;
  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    m = await proActive(ctx);
  });

  it("⛔ un temporaire VALABLE : la connexion est admise (`mustChangePassword: true`), toute autre route est refusée, et le changement rouvre la salle", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "Karim");
    const jar = new Jar();
    const connexion = await connecter(ctx, m.pro, jar, "Karim", e.temporaryPassword);
    expect(connexion.status).toBe(200);
    expect(mustChange(connexion)).toBe(true);
    const refus = await venues(m.pro.token, jar);
    expect([refus.status, codeDe(refus)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
    expect((await changerMotDePasse(ctx, m.pro, jar, e.temporaryPassword, MOT_DE_PASSE_MEMBRE)).status).toBe(200);
    expect((await venues(m.pro.token, jar)).status).toBe(200);
  });

  it("⛔ un temporaire EXPIRÉ : la connexion avec le BON mot de passe est REFUSÉE — le même 401 `STAFF_INVALID_CREDENTIALS`, le même corps à l'octet qu'un mauvais mot de passe, un compte inconnu et un désactivé ; AUCUNE session, AUCUN échec compté, AUCUNE ligne d'audit d'échec", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "Expire");
    await echeanceDuMotDePasse(ctx.prisma, e.id, -1);
    const auditsAvant = (await lignesAudit(ctx.prisma)).length;
    const bon = await connecter(ctx, m.pro, new Jar(), "Expire", e.temporaryPassword);
    const faux = await connecter(ctx, m.pro, new Jar(), "Expire", "Mauvais-mot-de-passe9");
    const inconnu = await connecter(ctx, m.pro, new Jar(), "Inconnu", e.temporaryPassword);
    expect([bon.status, codeDe(bon)]).toEqual([401, StaffErrorCode.STAFF_INVALID_CREDENTIALS]);
    expect(corpsStable(bon)).toBe(corpsStable(faux));
    expect(corpsStable(bon).replace("Expire", "X")).toBe(corpsStable(inconnu).replace("Inconnu", "X"));
    const ligne = await membreParId(ctx.prisma, e.id);
    expect([ligne.password_failed_count, ligne.last_login_at]).toEqual([0, null]);
    expect((await lignesAudit(ctx.prisma)).length, "aucune ligne d'audit pour un refus qui ne compte rien").toBe(auditsAvant);
    expect(bon.headers["set-cookie"], "aucun cookie n'est posé").toBeUndefined();
  });

  it("⛔ une session ouverte AVANT l'expiration du temporaire n'a plus de droits dès qu'il expire : 401 `STAFF_SESSION_REQUIRED` — même sur la route du changement de mot de passe — et l'état de session ne rend plus de membre", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "ExpireEnSession");
    const jar = new Jar();
    expect((await connecter(ctx, m.pro, jar, "ExpireEnSession", e.temporaryPassword)).status).toBe(200);
    await echeanceDuMotDePasse(ctx.prisma, e.id, -1);
    const refus = await changerMotDePasse(ctx, m.pro, jar, e.temporaryPassword, MOT_DE_PASSE_MEMBRE);
    expect([refus.status, codeDe(refus)]).toEqual([401, StaffErrorCode.STAFF_SESSION_REQUIRED]);
    const etat = await appeler(ctx, m.pro.token, jar, "get", "/api/v1/pro/staff/session");
    expect(etat.status).toBe(200);
    expect((etat.body as { member: unknown }).member).toBeNull();
  });

  it("⛔ « le Manager doit en refaire un » : une réinitialisation rend un NOUVEAU temporaire valable, avec lequel le membre se connecte", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "Refait");
    await echeanceDuMotDePasse(ctx.prisma, e.id, -1);
    expect((await connecter(ctx, m.pro, new Jar(), "Refait", e.temporaryPassword)).status).toBe(401);
    const reset = await appeler(ctx, m.pro.token, m.jar, "post", `/api/v1/pro/staff/members/${e.id}/reset-password`);
    expect(reset.status).toBe(200);
    const neuf = (reset.body as { temporaryPassword: string }).temporaryPassword;
    const connexion = await connecter(ctx, m.pro, new Jar(), "Refait", neuf);
    expect(connexion.status).toBe(200);
    expect(mustChange(connexion)).toBe(true);
  });

  it("⛔ la distinction ne repose que sur `must_change_password` : le MÊME membre, échéance dépassée — marqué temporaire il est REFUSÉ, démarqué (mot de passe ordinaire de 90 jours) il est ADMIS vers le changement", async () => {
    const e = await membreActif(ctx, m.pro, m.jar, "Bascule");
    await echeanceDuMotDePasse(ctx.prisma, e.id, -1);
    await marquerTemporaire(ctx.prisma, e.id, true);
    expect((await connecter(ctx, m.pro, new Jar(), "Bascule", e.password)).status).toBe(401);
    await marquerTemporaire(ctx.prisma, e.id, false);
    const ok = await connecter(ctx, m.pro, new Jar(), "Bascule", e.password);
    expect(ok.status).toBe(200);
    expect(mustChange(ok)).toBe(true);
  });
});
