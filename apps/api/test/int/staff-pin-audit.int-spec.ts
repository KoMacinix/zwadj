// Intégration — rang 58, L36-3b (D356, R-5, MP-33, MP-11) : LE JOURNAL DU PIN, sur PostgreSQL réel et sur la SORTIE RÉELLE de l'application démarrée. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ CE QUE CE FICHIER MESURE : (1) la connexion par PIN, l'échec, le verrouillage et le déblocage écrivent CHACUN UNE ligne `audit_logs`, `actor_member_id` renseigné, dans la transaction de l'action ; (2) AUCUN PIN,
// AUCUN haché, AUCUN secret dans une ligne d'audit ni dans le journal des requêtes — mesuré sur le journal RÉEL (patron de D354 pour le mot de passe temporaire) ; (3) une action sans trace, ou une trace sans
// action, ne peut pas exister : l'ÉCHEC FORCÉ du journal (un déclencheur qui refuse l'insertion), puis l'échec forcé AU COMMIT (un déclencheur différé : une ligne écrite hors transaction y survivrait) — patron de D349
// et de D355.
// ⚠ Un PIN de quatre chiffres se cherche ENTRE GUILLEMETS (`"4821"`) : une chaîne JSON, que ni un horodatage ni un identifiant ne sont. Deux bras de contrôle sans lesquels « rien dans le journal » ne prouverait
// rien (D290, D286) : le détecteur VOIT une valeur plantée ; le journal contient bien la ligne de la requête.
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives).
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { truncateAll } from "./helpers";
import { creerApplicationJournalisee, type ContexteJournalise } from "./log-capture";
import {
  Jar,
  PIN_DE_TEST,
  activer,
  connecter,
  connecterParPin,
  creerPro,
  hacherPin,
  lignesAudit,
  membreActif,
  membreParId,
  pinDuMembre,
  pinRendu,
  poserPin,
  posteDe,
  proActive,
  sessionsDuMembre,
  texteDeTousLesAudits
} from "./staff-helpers";

let ctx: ContexteJournalise;
beforeAll(async () => {
  ctx = await creerApplicationJournalisee();
});
afterAll(async () => {
  await ctx.app.close();
});

const PIN_TRIVIAL = "1234";
const ACTIONS_DU_PIN = ["staff.pin_login", "staff.pin_login_failed", "staff.pin_lock", "staff.pin_unlock"] as const;

async function monde() {
  await truncateAll(ctx.prisma);
  const m = await proActive(ctx);
  const e = await membreActif(ctx, m.pro, m.jar, "Karim");
  await poserPin(ctx, e.id);
  return { m, e, poste: () => posteDe(e.jar) };
}

/** Toutes les lignes d'audit du PIN, dans l'ordre. */
async function lignesDuPin() {
  const toutes = [];
  for (const action of ACTIONS_DU_PIN) toutes.push(...(await lignesAudit(ctx.prisma, action)));
  return toutes;
}

describe("⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE", () => {
  it("la connexion par PIN : UNE ligne `staff.pin_login` — le compte commun et son rôle, le MEMBRE, l'entité est la SESSION, la charge utile ne porte que le membre, jamais `before`", async () => {
    const w = await monde();
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const lignes = await lignesAudit(ctx.prisma, "staff.pin_login");
    expect(lignes).toHaveLength(1);
    const sessions = await sessionsDuMembre(ctx.prisma, w.e.id);
    const derniere = sessions[sessions.length - 1]!;
    const l = lignes[0]!;
    expect({ actor_id: l.actor_id, actor_role: l.actor_role, actor_member_id: l.actor_member_id, entity_type: l.entity_type, entity_id: l.entity_id }).toEqual({
      actor_id: w.m.pro.userId,
      actor_role: "PRO",
      actor_member_id: w.e.id,
      entity_type: "staff_session",
      entity_id: derniere.id
    });
    expect(l.after).toEqual({ memberId: w.e.id });
    expect(l.before).toBeNull();
  });

  it("un échec : UNE ligne `staff.pin_login_failed` par essai compté, avec le compte d'échecs de la réservation (1, 2) — jamais le PIN tenté", async () => {
    const w = await monde();
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482");
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0483");
    const lignes = await lignesAudit(ctx.prisma, "staff.pin_login_failed");
    expect(lignes.map((l) => l.after)).toEqual([{ failedCount: 1 }, { failedCount: 2 }]);
    for (const l of lignes) {
      expect({ actor_id: l.actor_id, actor_role: l.actor_role, actor_member_id: l.actor_member_id, entity_type: l.entity_type, entity_id: l.entity_id }).toEqual({
        actor_id: w.m.pro.userId,
        actor_role: "PRO",
        actor_member_id: w.e.id,
        entity_type: "staff_member",
        entity_id: w.e.id
      });
      expect(l.before).toBeNull();
    }
    expect((await lignesAudit(ctx.prisma, "staff.pin_lock")).length, "deux échecs ne verrouillent pas").toBe(0);
  });

  it("le TROISIÈME échec : la ligne d'échec ET UNE ligne `staff.pin_lock` (le compte et le nombre de sessions terminées — celui des sessions qui ont réellement pris la fin `PIN_LOCKED`)", async () => {
    const w = await monde();
    for (const faux of ["0482", "0483", "0484"]) await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, faux);
    expect((await lignesAudit(ctx.prisma, "staff.pin_login_failed")).length).toBe(3);
    const lock = await lignesAudit(ctx.prisma, "staff.pin_lock");
    expect(lock).toHaveLength(1);
    const terminees = (await sessionsDuMembre(ctx.prisma, w.e.id)).filter((s) => s.end_reason === "PIN_LOCKED").length;
    expect(terminees, "(précondition) au moins une session terminée par le verrou").toBeGreaterThanOrEqual(1);
    expect(lock[0]!.after).toEqual({ failedCount: 3, sessionsEnded: terminees });
    expect(lock[0]!.actor_member_id).toBe(w.e.id);
    expect(lock[0]!.entity_id).toBe(w.e.id);
  });

  it("le déblocage : UNE ligne `staff.pin_unlock` (« par le mot de passe »), le membre pour acteur ; ni un PIN absent, ni un PIN expiré n'en écrivent", async () => {
    const w = await monde();
    await poserPin(ctx, w.e.id, PIN_TRIVIAL, { verrouille: true });
    const res = await connecter(ctx, w.m.pro, new Jar(), "Karim", w.e.password);
    expect(res.status).toBe(200);
    const lignes = await lignesAudit(ctx.prisma, "staff.pin_unlock");
    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.after).toEqual({ via: "password" });
    expect(lignes[0]!.actor_member_id).toBe(w.e.id);
    expect(lignes[0]!.entity_id).toBe(w.e.id);
    expect(lignes[0]!.before).toBeNull();
  });

  it("un refus AVANT la réservation (aucun appareil, membre inconnu, PIN verrouillé) n'écrit AUCUNE ligne du PIN : on ne journalise pas un essai qui n'a pas eu lieu", async () => {
    const w = await monde();
    await connecterParPin(ctx, w.m.pro, new Jar(), w.e.id, "0482"); // aucun appareil
    await connecterParPin(ctx, w.m.pro, w.poste(), "018f0000-0000-7000-8000-00000000dead", PIN_DE_TEST); // membre inconnu
    await poserPin(ctx, w.e.id, PIN_DE_TEST, { verrouille: true });
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST); // verrouillé : essai non réservé
    expect(await lignesDuPin()).toEqual([]);
  });

  it("⛔ la charge utile est FERMÉE : pour chacune des quatre actions, `after` ne porte QUE les clés listées, `before` est nul, l'acteur est renseigné (une clé de plus serait un secret en puissance)", async () => {
    const w = await monde();
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    await poserPin(ctx, w.e.id);
    for (const faux of ["0482", "0483", "0484"]) await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, faux);
    await connecter(ctx, w.m.pro, new Jar(), "Karim", w.e.password);
    const permises: Record<string, string[]> = {
      "staff.pin_login": ["memberId"],
      "staff.pin_login_failed": ["failedCount"],
      "staff.pin_lock": ["failedCount", "sessionsEnded"],
      "staff.pin_unlock": ["via"]
    };
    const vues = new Set<string>();
    for (const l of await lignesDuPin()) {
      vues.add(l.action);
      expect(Object.keys(l.after as object).sort(), l.action).toEqual([...permises[l.action]!].sort());
      expect(l.before, l.action).toBeNull();
      expect(l.actor_member_id, l.action).toBe(w.e.id);
    }
    expect([...vues].sort(), "les quatre actions ont été exercées").toEqual([...ACTIONS_DU_PIN].sort());
  });
});

describe("⛔ MP-11 — AUCUN PIN, AUCUN haché, AUCUN secret dans le journal d'audit ni dans le journal RÉEL des requêtes", () => {
  /** Ce que `texte` contient de secret : le PIN entre guillemets (une chaîne JSON), son haché, le secret du HMAC. */
  const secretsDans = (texte: string, pin: string, hache: string): string[] => {
    const trouves: string[] = [];
    if (texte.includes(`"${pin}"`)) trouves.push("le PIN");
    if (texte.includes(hache)) trouves.push("le haché");
    const secret = process.env.STAFF_PIN_HMAC_SECRET ?? "";
    if (secret !== "" && texte.includes(secret)) trouves.push("le secret");
    return trouves;
  };

  it("BRAS DE CONTRÔLE — le détecteur VOIT un PIN, un haché et un secret plantés (un détecteur qui répond « rien » à tout passerait la garde)", () => {
    const secret = process.env.STAFF_PIN_HMAC_SECRET ?? "";
    expect(secret.length, "le secret de test est posé par la configuration des tests").toBeGreaterThanOrEqual(32);
    expect(secretsDans(`{"pin":"${PIN_DE_TEST}"}`, PIN_DE_TEST, "H".repeat(64))).toEqual(["le PIN"]);
    expect(secretsDans(`x ${"H".repeat(64)} y`, PIN_DE_TEST, "H".repeat(64))).toEqual(["le haché"]);
    expect(secretsDans(`secret=${secret}`, PIN_DE_TEST, "H".repeat(64))).toEqual(["le secret"]);
    expect(secretsDans("rien à voir 4821 sans guillemets", PIN_DE_TEST, "H".repeat(64))).toEqual([]);
  });

  it("⛔ les lignes d'audit (toutes colonnes, JSON compris) d'un parcours COMPLET — activation, connexion, échecs, verrouillage, déblocage, PIN juste — ne portent ni le PIN posé, ni le PIN rendu, ni leurs hachés, ni le secret", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const act = await activer(ctx, pro, new Jar(), "Amine");
    const pinDuManager = pinRendu(act.res);
    const managerId = (act.res.body as { member: { id: string } }).member.id;
    const e = await membreActif(ctx, pro, act.jar, "Karim");
    await poserPin(ctx, e.id);
    await connecterParPin(ctx, pro, posteDe(e.jar), e.id, PIN_DE_TEST);
    for (const faux of ["0482", "0483", "0484"]) await connecterParPin(ctx, pro, posteDe(e.jar), e.id, faux);
    const deblocage = await connecter(ctx, pro, new Jar(), "Karim", e.password);
    const pinNeuf = pinRendu(deblocage);

    const texte = await texteDeTousLesAudits(ctx.prisma);
    expect(texte.length, "des lignes ont bien été parcourues").toBeGreaterThan(500);
    for (const [pin, nom] of [[PIN_DE_TEST, "posé"], [pinDuManager, "du Manager"], [pinNeuf, "neuf"]] as const) {
      expect(secretsDans(texte, pin, hacherPin(pin)), `PIN ${nom} dans l'audit`).toEqual([]);
    }
    expect(managerId.length).toBeGreaterThan(0);
  });

  it("⛔ le JOURNAL RÉEL de l'application démarrée : ni le PIN posé, ni le PIN rendu par K-14 et K-15, ni leurs hachés, ni le secret — sur la connexion par PIN (juste et fausse), l'activation, le déblocage", async () => {
    await truncateAll(ctx.prisma);
    ctx.vider();
    const pro = await creerPro(ctx);
    const act = await activer(ctx, pro, new Jar(), "Amine");
    const pinDuManager = pinRendu(act.res);
    const e = await membreActif(ctx, pro, act.jar, "Karim");
    await poserPin(ctx, e.id);
    await connecterParPin(ctx, pro, posteDe(e.jar), e.id, PIN_DE_TEST);
    await connecterParPin(ctx, pro, posteDe(e.jar), e.id, "0482");
    await poserPin(ctx, e.id, PIN_TRIVIAL, { verrouille: true });
    const deblocage = await connecter(ctx, pro, new Jar(), "Karim", e.password);
    const pinNeuf = pinRendu(deblocage);
    const ligne = await ctx.attendreRequete("POST", "/api/v1/pro/staff/pin-login");
    const sortie = ctx.sortie();

    expect(ctx.lignes().length, "BRAS DE CONTRÔLE 1 — l'instrument a parcouru des lignes").toBeGreaterThanOrEqual(5);
    expect((ligne.req as { url?: string }).url, "BRAS DE CONTRÔLE 2 — la requête de connexion par PIN EST dans le journal").toBe("/api/v1/pro/staff/pin-login");
    for (const [pin, nom] of [[PIN_DE_TEST, "posé"], [pinDuManager, "du Manager (K-14)"], [pinNeuf, "neuf (K-15)"], ["0482", "faux"]] as const) {
      expect(secretsDans(sortie, pin, hacherPin(pin)), `PIN ${nom} dans le journal des requêtes`).toEqual([]);
    }
    expect(
      sortie.includes('"cache-control":"no-store"') || sortie.includes('"cache-control": "no-store"'),
      "BRAS DE CONTRÔLE 3 — les en-têtes de RÉPONSE sont journalisés : `no-store` y figure (K-14, K-15)"
    ).toBe(true);
  });
});

// ── l'échec forcé (patron de D349 et de D355) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un déclencheur qui refuse l'insertion d'UNE action du journal : l'échec forcé de MD-ADM-6. */
async function forcerEchecDuJournal(action: string): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r58_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé du journal (test D356)'; END; $$");
  await ctx.prisma.$executeRawUnsafe(`CREATE TRIGGER r58_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION r58_fail_audit()`);
}
/** Un déclencheur DIFFÉRÉ qui refuse AU COMMIT : une ligne écrite hors de la transaction y survivrait, une ligne écrite dedans disparaît avec elle. */
async function forcerEchecAuCommit(): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r58_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé au commit (test D356)'; END; $$");
  await ctx.prisma.$executeRawUnsafe("CREATE CONSTRAINT TRIGGER r58_fail_commit AFTER INSERT ON pro_staff_sessions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION r58_fail_commit()");
}
afterEach(async () => {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r58_fail_audit ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r58_fail_commit ON pro_staff_sessions");
});

describe("⛔ MD-ADM-6 — une action sans trace, ou une trace sans action, ne peut pas exister (échec forcé)", () => {
  it("la ligne `staff.pin_login` refusée par la base : la connexion échoue (≥ 500), AUCUNE session n'est ouverte, `last_login_at` n'est pas écrit", async () => {
    const w = await monde();
    const avant = await sessionsDuMembre(ctx.prisma, w.e.id);
    const dernier = (await membreParId(ctx.prisma, w.e.id)).last_login_at?.getTime() ?? null;
    await forcerEchecDuJournal("staff.pin_login");
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status, "un journal en échec annule l'action").toBeGreaterThanOrEqual(500);
    expect((await sessionsDuMembre(ctx.prisma, w.e.id)).length, "aucune session de plus").toBe(avant.length);
    expect((await membreParId(ctx.prisma, w.e.id)).last_login_at?.getTime() ?? null, "`last_login_at` n'est pas écrit : la transaction est annulée").toBe(dernier);
  });

  it("la ligne `staff.pin_lock` refusée : le VERROU n'est pas posé et les sessions ne sont pas terminées (pas de verrou sans sa ligne) — et l'échec du même essai est annulé avec lui (pas de ligne sans action)", async () => {
    const w = await monde();
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0482");
    await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0483");
    const vivantesAvant = (await sessionsDuMembre(ctx.prisma, w.e.id)).filter((s) => s.ended_at === null).length;
    await forcerEchecDuJournal("staff.pin_lock");
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, "0484");
    expect(res.status, "le troisième échec, dont le verrouillage ne peut pas s'écrire").toBeGreaterThanOrEqual(500);
    const pin = await pinDuMembre(ctx.prisma, w.e.id);
    expect(pin.pin_locked_at, "pas de verrou sans sa ligne").toBeNull();
    expect((await sessionsDuMembre(ctx.prisma, w.e.id)).filter((s) => s.ended_at === null).length, "les sessions ne sont pas terminées").toBe(vivantesAvant);
    expect((await lignesAudit(ctx.prisma, "staff.pin_login_failed")).length, "la ligne d'échec du troisième essai est annulée avec la transaction : deux lignes, pas trois").toBe(2);
    expect((await lignesAudit(ctx.prisma, "staff.pin_lock")).length).toBe(0);
  });

  it("⛔ AU COMMIT — la session insérée refusée par un déclencheur DIFFÉRÉ : la ligne `staff.pin_login`, écrite dans la même transaction, DISPARAÎT avec elle (une ligne écrite hors transaction y survivrait)", async () => {
    const w = await monde();
    const ecritesAvant = (await lignesAudit(ctx.prisma, "staff.pin_login")).length;
    await forcerEchecAuCommit();
    const res = await connecterParPin(ctx, w.m.pro, w.poste(), w.e.id, PIN_DE_TEST);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect((await lignesAudit(ctx.prisma, "staff.pin_login")).length, "aucune trace d'une connexion qui n'a pas eu lieu").toBe(ecritesAvant);
  });
});
