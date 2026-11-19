/**
 * « JAMAIS ZÉRO MANAGER » SOUS COURSE — rang 56, L36-3a-2 (D354, R-4, K-22, MP-6, MP-31, S-101, S-243). PostgreSQL RÉEL.
 *
 * ⛔ LA RÈGLE (DR5) : « jamais zéro Manager actif (service, verrou de ligne sur pro_profiles) ». Aucun déclencheur en base (cadrage D340, § 3.2) : la garde est le VERROU DE L1 (le profil), puis le COMPTAGE des
 * Managers actifs SOUS ce verrou. Deux désactivations simultanées se SÉRIALISENT sur L1 : la seconde voit un seul Manager actif et refuse (409). Un comptage fait AVANT le verrou les laisserait réussir toutes
 * les deux — et la salle n'aurait plus de Manager.
 *
 * ⛔ UNE RÉPÉTITION N'EST PAS UN ENTRELACEMENT (S-243, lecture adverse 6.d) : « 2 requêtes simultanées répétées 30 fois » peut ne JAMAIS entrelacer (mesuré à D349 : un décalage de millisecondes balaie des
 * entrelacements sans en garantir aucun). On joue donc les DEUX : l'entrelacement FORCÉ — une transaction tenue HORS du service verrouille la ligne du profil, les deux requêtes partent, on ATTEND (par
 * `pg_stat_activity`) qu'elles soient bloquées sur ce verrou, puis on le relâche — et la répétition (30 manches), qui garde l'invariant sur les ordres d'arrivée que la machine produit.
 * ⚠ Les verdicts se lisent en `expect` de vitest sur `res.status` et sur des comptes lus EN BASE (D305).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaffAccountState, StaffErrorCode } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { holdRow, waitBlocked } from "./row-lock";
import { appeler, codeDe, compterManagersActifs, creerMembre, lignesAudit, membreActif, membreParId, proActive, rearmerMembre, sessionsDuMembre } from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

const disable = (id: string) => `/api/v1/pro/staff/members/${id}/disable`;
type Salle = Awaited<ReturnType<typeof proActive>>;

/** Une salle avec deux Managers actifs, chacun avec sa propre session : M1 (celui de l'activation) et M2. */
async function salleADeuxManagers(): Promise<{ salle: Salle; m1: { id: string; jar: Salle["jar"] }; m2: { id: string; jar: Salle["jar"] } }> {
  const salle = await proActive(ctx);
  const second = await membreActif(ctx, salle.pro, salle.jar, "Second", "MANAGER");
  return { salle, m1: { id: salle.membreId, jar: salle.jar }, m2: { id: second.id, jar: second.jar } };
}

describe("le dernier Manager actif — jamais désactivé, même par lui-même (MP-31)", () => {
  it("⛔ un Manager SEUL qui se désactive lui-même : 409 `STAFF_LAST_MANAGER` ; il reste ACTIF, sa session est VIVANTE, aucune ligne d'audit de désactivation", async () => {
    await truncateAll(ctx.prisma);
    const salle = await proActive(ctx);
    const res = await appeler(ctx, salle.pro.token, salle.jar, "post", disable(salle.membreId));
    expect([res.status, codeDe(res)]).toEqual([409, StaffErrorCode.STAFF_LAST_MANAGER]);
    expect((await membreParId(ctx.prisma, salle.membreId)).status).toBe("ACTIVE");
    for (const s of await sessionsDuMembre(ctx.prisma, salle.membreId)) expect(s.ended_at).toBeNull();
    expect((await lignesAudit(ctx.prisma, "staff.member_disable")).length).toBe(0);
    expect((await appeler(ctx, salle.pro.token, salle.jar, "get", "/api/v1/pro/venues")).status).toBe(200);
  });

  it("⛔ un second Manager DÉSACTIVÉ ne compte pas : le Manager restant, seul actif, ne peut pas se désactiver (409)", async () => {
    await truncateAll(ctx.prisma);
    const { salle, m2 } = await salleADeuxManagers();
    expect((await appeler(ctx, salle.pro.token, salle.jar, "post", disable(m2.id))).status).toBe(200);
    const res = await appeler(ctx, salle.pro.token, salle.jar, "post", disable(salle.membreId));
    expect([res.status, codeDe(res)]).toEqual([409, StaffErrorCode.STAFF_LAST_MANAGER]);
    expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId)).toBe(1);
  });

  it("un EMPLOYÉ se désactive quel que soit le nombre de Managers (la règle ne vise que les Managers) : le Manager seul désactive son employé, 200", async () => {
    await truncateAll(ctx.prisma);
    const salle = await proActive(ctx);
    const e = await creerMembre(ctx, salle.pro, salle.jar, "Employe");
    const res = await appeler(ctx, salle.pro.token, salle.jar, "post", disable(e.id));
    expect([res.status, (res.body as { member: { state: string } }).member.state]).toEqual([200, StaffAccountState.DISABLED]);
    expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId)).toBe(1);
  });
});

describe("deux Managers qui se désactivent l'un l'autre EN MÊME TEMPS (MP-6)", () => {
  it("⛔ ENTRELACEMENT FORCÉ — le verrou du profil (L1) est tenu hors du service ; les deux requêtes partent et se BLOQUENT dessus ; relâché, EXACTEMENT une réussit (200) et l'autre refuse (409 `STAFF_LAST_MANAGER`) : il reste UN Manager actif", async () => {
    await truncateAll(ctx.prisma);
    const { salle, m1, m2 } = await salleADeuxManagers();
    const verrou = holdRow(ctx.prisma, "pro_profiles", salle.pro.proProfileId);
    await verrou.ready;
    const a = appeler(ctx, salle.pro.token, m1.jar, "post", disable(m2.id));
    const b = appeler(ctx, salle.pro.token, m2.jar, "post", disable(m1.id));
    await waitBlocked(ctx.prisma, 2);
    verrou.release();
    await verrou.done;
    const [ra, rb] = await Promise.all([a, b]);
    expect([ra.status, rb.status].sort()).toEqual([200, 409]);
    const refus = ra.status === 409 ? ra : rb;
    expect(codeDe(refus)).toBe(StaffErrorCode.STAFF_LAST_MANAGER);
    expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId)).toBe(1);
    expect((await lignesAudit(ctx.prisma, "staff.member_disable")).length).toBe(1);
  });

  it("⛔ TROIS Managers en cycle (M1→M2, M2→M3, M3→M1), entrelacement FORCÉ : deux désactivations réussissent, la TROISIÈME refuse — il reste UN Manager actif, jamais zéro", async () => {
    await truncateAll(ctx.prisma);
    const { salle, m1, m2 } = await salleADeuxManagers();
    const troisieme = await membreActif(ctx, salle.pro, salle.jar, "Troisieme", "MANAGER");
    const verrou = holdRow(ctx.prisma, "pro_profiles", salle.pro.proProfileId);
    await verrou.ready;
    const a = appeler(ctx, salle.pro.token, m1.jar, "post", disable(m2.id));
    const b = appeler(ctx, salle.pro.token, m2.jar, "post", disable(troisieme.id));
    const c = appeler(ctx, salle.pro.token, troisieme.jar, "post", disable(m1.id));
    await waitBlocked(ctx.prisma, 3);
    verrou.release();
    await verrou.done;
    const statuts = (await Promise.all([a, b, c])).map((r) => r.status).sort();
    expect(statuts).toEqual([200, 200, 409]);
    expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId)).toBe(1);
  });

  it("⛔ RÉPÉTITION — 30 manches de deux désactivations simultanées SANS verrou forcé : à CHAQUE manche, exactement une réussit et il reste UN Manager actif (l'autre : 409, ou 401 si sa session a déjà pris fin)", async () => {
    await truncateAll(ctx.prisma);
    const { salle, m1, m2 } = await salleADeuxManagers();
    const issues: number[][] = [];
    for (let manche = 1; manche <= 30; manche += 1) {
      const [ra, rb] = await Promise.all([
        appeler(ctx, salle.pro.token, m1.jar, "post", disable(m2.id)),
        appeler(ctx, salle.pro.token, m2.jar, "post", disable(m1.id))
      ]);
      issues.push([ra.status, rb.status]);
      expect([ra.status, rb.status].filter((s) => s === 200), `manche ${manche} : ${ra.status} / ${rb.status}`).toHaveLength(1);
      expect([ra.status, rb.status].every((s) => s === 200 || s === 409 || s === 401), `manche ${manche} : ${ra.status} / ${rb.status}`).toBe(true);
      expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId), `manche ${manche}`).toBe(1);
      await rearmerMembre(ctx.prisma, m1.id);
      await rearmerMembre(ctx.prisma, m2.id);
    }
    expect(issues).toHaveLength(30);
  });
});

describe("l'ordre des verrous L1 < L2 < L3 < L4 : AUCUN interblocage sous un mélange d'opérations simultanées (S-101)", () => {
  it("⛔ créer, réinitialiser, désactiver, lister et se désactiver mutuellement, TOUT EN MÊME TEMPS, cinq manches : aucune réponse 5xx (un interblocage détecté par PostgreSQL ferait une 500), et la salle garde un Manager actif", async () => {
    await truncateAll(ctx.prisma);
    const { salle, m1, m2 } = await salleADeuxManagers();
    const e1 = await membreActif(ctx, salle.pro, salle.jar, "Employe1");
    const e2 = await membreActif(ctx, salle.pro, salle.jar, "Employe2");
    const reponses: Array<{ manche: number; nom: string; status: number }> = [];
    for (let manche = 1; manche <= 5; manche += 1) {
      const t = salle.pro.token;
      const operations: Array<[string, Promise<{ status: number }>]> = [
        ["M1 réinitialise E1", appeler(ctx, t, m1.jar, "post", `/api/v1/pro/staff/members/${e1.id}/reset-password`)],
        ["M2 réinitialise E1", appeler(ctx, t, m2.jar, "post", `/api/v1/pro/staff/members/${e1.id}/reset-password`)],
        ["M1 désactive E2", appeler(ctx, t, m1.jar, "post", disable(e2.id))],
        ["M2 désactive E2", appeler(ctx, t, m2.jar, "post", disable(e2.id))],
        ["M1 crée", appeler(ctx, t, m1.jar, "post", "/api/v1/pro/staff/members", { accountName: `NouveauA${manche}`, role: "EMPLOYEE" })],
        ["M2 crée", appeler(ctx, t, m2.jar, "post", "/api/v1/pro/staff/members", { accountName: `NouveauB${manche}`, role: "MANAGER" })],
        ["M1 liste", appeler(ctx, t, m1.jar, "get", "/api/v1/pro/staff/members")],
        ["M2 liste", appeler(ctx, t, m2.jar, "get", "/api/v1/pro/staff/members")],
        ["M1 désactive M2", appeler(ctx, t, m1.jar, "post", disable(m2.id))],
        ["M2 désactive M1", appeler(ctx, t, m2.jar, "post", disable(m1.id))]
      ];
      const sorties = await Promise.all(operations.map(([nom, p]) => p.then((r) => ({ manche, nom, status: r.status }))));
      reponses.push(...sorties);
      expect(await compterManagersActifs(ctx.prisma, salle.pro.proProfileId), `manche ${manche}`).toBeGreaterThanOrEqual(1);
      await rearmerMembre(ctx.prisma, m1.id);
      await rearmerMembre(ctx.prisma, m2.id);
    }
    const cinqCents = reponses.filter((r) => r.status >= 500);
    expect(reponses).toHaveLength(50);
    expect(cinqCents, `réponses 5xx : ${JSON.stringify(cinqCents)}`).toEqual([]);
  });
});
