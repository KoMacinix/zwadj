// L'ADAPTATEUR PRISMA de la couche du personnel — rang 44, L36-3a-1 (D341). Joué avec un faux client : il enregistre, dans l'ORDRE, chaque requête brute (texte normalisé, paramètres) et chaque
// écriture d'audit. Ce que ce spec mesure, c'est ce que l'intégration ne dit pas aussi vite : que la RÉSERVATION est UNE instruction (jamais lire puis écrire), que le garde ne lit aucune durée
// écrite en dur (les durées sont des PARAMÈTRES issus du levier unique, MP-43), que la lecture seule de l'état n'écrit rien, que les écritures d'une activation ne partent pas quand le drapeau est déjà
// pris, et que l'audit n'a qu'UN site d'écriture, à charge utile fermée (MP-33).
//
// ⚠ Ce spec est couplé à l'ORDRE des instructions : c'est voulu (la séquence L1 → L2 → L3 → L4 du cadrage, § 3.1, est la preuve de l'absence d'interblocage). La base réelle tranche les comportements
// dans `test/int/staff-*.int-spec.ts`.
import { describe, expect, it, vi } from "vitest";
import { STAFF_LIMITS } from "@zwadj/types";
import { PrismaStaffStore } from "./staff-store.prisma";

const SALLE = "018f0000-0000-7000-8000-0000000000b1";
const UTILISATEUR = "018f0000-0000-7000-8000-0000000000c1";
const MEMBRE = "018f0000-0000-7000-8000-0000000000a1";
const acteur = { userId: UTILISATEUR, role: "PRO" } as const;

interface Appel {
  type: "query" | "execute";
  sql: string;
  valeurs: unknown[];
}

/** Texte de la requête, blancs comprimés (la mise en forme n'est pas une règle). */
const normaliser = (strings: TemplateStringsArray): string => strings.join("?").replace(/\s+/g, " ").trim();

function faux(reponses: unknown[] = [], extra: { profil?: unknown; membre?: unknown } = {}) {
  const appels: Appel[] = [];
  const audits: Array<{ data: Record<string, unknown> }> = [];
  const issues: string[] = [];
  const file = [...reponses];
  const suivante = (type: Appel["type"], strings: TemplateStringsArray, valeurs: unknown[]): unknown => {
    appels.push({ type, sql: normaliser(strings), valeurs });
    // Une instruction que le scénario n'a pas prévue est un ÉCHEC D'ASSERTION (`expect.fail`), pas une `Error` quelconque : sous une mutation du code, c'est souvent ce qui rougit, et un rouge qui n'est pas
    // une assertion n'est pas une morsure que la campagne de neutralisation sache lire (R1, D304/D305).
    if (file.length === 0) expect.fail(`réponse non prévue pour : ${normaliser(strings)}`);
    return file.shift();
  };
  const client = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...valeurs: unknown[]) => suivante("query", strings, valeurs)),
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...valeurs: unknown[]) => suivante("execute", strings, valeurs)),
    auditLog: { create: vi.fn(async (args: { data: Record<string, unknown> }) => { audits.push(args); return {}; }) },
    proProfile: { findUnique: vi.fn(async () => extra.profil ?? null) },
    proStaffMember: { findFirst: vi.fn(async () => extra.membre ?? null) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      try {
        const r = await fn(client);
        issues.push("validée");
        return r;
      } catch (e) {
        issues.push("annulée");
        throw e;
      }
    })
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { store: new PrismaStaffStore(client as any), client, appels, audits, issues, restant: () => file.length };
}

const LIGNE_MEMBRE = { id: MEMBRE, accountName: "Amine", role: "MANAGER", mustChangePassword: false };

describe("readLayer — UNE lecture du drapeau, par le compte commun (limite 6 du cadrage)", () => {
  it("lit le profil du compte (id et drapeau) et ne fait aucune requête brute", async () => {
    const date = new Date("2026-11-01T10:00:00Z");
    const f = faux([], { profil: { id: SALLE, staffLayerEnabledAt: date } });
    expect(await f.store.readLayer(UTILISATEUR)).toEqual({ proProfileId: SALLE, enabledAt: date });
    expect(f.appels).toHaveLength(0);
    expect(f.client.proProfile.findUnique).toHaveBeenCalledTimes(1);
    // La clé de recherche est le COMPTE COMMUN (`userId`), jamais l'identifiant du profil : un profil cherché par la mauvaise colonne ne trouverait personne.
    expect(f.client.proProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: UTILISATEUR } }));
  });

  it("un compte sans profil ⇒ null", async () => {
    expect(await faux().store.readLayer(UTILISATEUR)).toBeNull();
  });
});

describe("reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction", () => {
  const ligne = { passwordHash: "H", failedCount: 3, pausedNow: false };

  it("⛔ UNE seule instruction SQL, aucune transaction : lire puis écrire laisserait N requêtes parallèles faire N vérifications", async () => {
    const f = faux([[ligne]]);
    await f.store.reservePasswordAttempt(MEMBRE);
    expect(f.appels).toHaveLength(1);
    expect(f.appels[0]!.type).toBe("query");
    expect(f.client.$transaction).not.toHaveBeenCalled();
  });

  it("⛔ l'instruction VERROUILLE la ligne (`FOR UPDATE`), n'admet qu'un membre ACTIF hors pause, incrémente et RENVOIE — le tout dans la même instruction", async () => {
    const f = faux([[ligne]]);
    await f.store.reservePasswordAttempt(MEMBRE);
    const sql = f.appels[0]!.sql;
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("status = 'ACTIVE'");
    expect(sql).toContain("password_locked_until IS NULL OR password_locked_until <= now()");
    expect(sql).toContain("password_failed_count");
    expect(sql).toMatch(/RETURNING/);
    expect(sql, "le compteur repart après l'échéance de la pause").toMatch(/password_locked_until IS NOT NULL AND password_locked_until <= now\(\) THEN 0/);
  });

  it("⛔ MP-43 — le seuil et la durée de pause sont des PARAMÈTRES issus du levier unique, jamais des littéraux du SQL", async () => {
    const f = faux([[ligne]]);
    await f.store.reservePasswordAttempt(MEMBRE);
    const { sql, valeurs } = f.appels[0]!;
    expect(valeurs).toContain(STAFF_LIMITS.PASSWORD_MAX_FAILURES);
    expect(valeurs).toContain(STAFF_LIMITS.PASSWORD_PAUSE_MINUTES);
    expect(valeurs).toContain(MEMBRE);
    expect(sql).not.toMatch(/interval\s*'/i);
    expect(sql).not.toMatch(/make_interval\(\s*mins\s*=>\s*\d/);
  });

  it("⛔ MP-41 — le temps vient de la BASE (`now()`), jamais d'un paramètre horodaté par l'API", async () => {
    const f = faux([[ligne]]);
    await f.store.reservePasswordAttempt(MEMBRE);
    expect(f.appels[0]!.sql).toContain("now()");
    expect(f.appels[0]!.valeurs.some((v) => v instanceof Date)).toBe(false);
  });

  it("aucune ligne rendue ⇒ `reserved: false` (membre éteint, inconnu, ou EN PAUSE : le service ne distingue pas, il paie le factice)", async () => {
    expect(await faux([[]]).store.reservePasswordAttempt(MEMBRE)).toEqual({ reserved: false });
  });

  it("une ligne rendue ⇒ le hachage à vérifier, le compte après incrément, et si CETTE réservation a déclenché la pause", async () => {
    expect(await faux([[{ passwordHash: "H", failedCount: 5, pausedNow: true }]]).store.reservePasswordAttempt(MEMBRE)).toEqual({
      reserved: true,
      passwordHash: "H",
      failedCount: 5,
      pausedNow: true
    });
  });
});

describe("touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4)", () => {
  const vivante = { sessionId: "s1", memberId: MEMBRE, role: "MANAGER", accountName: "Amine", mustChangePassword: false };

  it("⛔ l'UPDATE joint le membre et exige : jeton, MÊME salle que le Bearer, membre ACTIF, session non terminée, plafond non atteint, inactivité non dépassée", async () => {
    const f = faux([[vivante]]);
    await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    expect(f.appels).toHaveLength(1);
    const sql = f.appels[0]!.sql;
    expect(sql).toMatch(/^UPDATE pro_staff_sessions/);
    expect(sql).toContain("s.token_hash =");
    expect(sql).toContain("m.pro_profile_id =");
    expect(sql).toContain("m.status = 'ACTIVE'");
    expect(sql).toContain("s.ended_at IS NULL");
    expect(sql).toContain("s.expires_at > now()");
    expect(sql).toMatch(/s\.last_activity_at > now\(\) - make_interval\(mins => \?/);
    expect(sql).toMatch(/SET last_activity_at = now\(\)/);
    expect(sql).toMatch(/RETURNING/);
  });

  it("⛔ MP-43 — la durée d'inactivité est le PARAMÈTRE du levier unique ; aucune durée en dur dans le texte", async () => {
    const f = faux([[vivante]]);
    await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    const { sql, valeurs } = f.appels[0]!;
    expect(valeurs).toContain(STAFF_LIMITS.IDLE_TIMEOUT_MINUTES);
    expect(valeurs).toContain("h");
    expect(valeurs).toContain(SALLE);
    expect(sql).not.toMatch(/interval\s*'/i);
  });

  it("une session vivante est rendue (identité du contexte posé par le garde) ; AUCUNE autre instruction", async () => {
    const f = faux([[vivante]]);
    expect(await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: true, session: vivante });
    expect(f.appels).toHaveLength(1);
  });

  // 0 ligne ⇒ une SONDE lit pourquoi, la politique pure classe, et seule une cause qui s'écrit écrit.
  const sonde = (surcharge: Record<string, unknown>) => ({ found: true, sameVenue: true, ended: false, memberActive: true, capped: false, idle: false, sessionId: "s9", ...surcharge });

  it("⛔ MP-13 — inactive : la fin IDLE s'écrit, conditionnée à `ended_at IS NULL` (jamais deux fins)", async () => {
    const f = faux([[], [sonde({ idle: true })], 1]);
    expect(await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: false });
    expect(f.appels).toHaveLength(3);
    expect(f.appels[2]!.type).toBe("execute");
    expect(f.appels[2]!.sql).toMatch(/UPDATE pro_staff_sessions SET ended_at = now\(\), end_reason = \?::"StaffSessionEndReason"/);
    // Le prédicat est LE DERNIER de l'instruction, tel quel : une sous-chaîne `ended_at IS NULL` se retrouverait dans une tautologie (`… OR ended_at IS NOT NULL`) qui laisserait écrire une seconde fin.
    expect(f.appels[2]!.sql).toMatch(/WHERE id = \?::uuid AND ended_at IS NULL$/);
    expect(f.appels[2]!.valeurs).toContain("IDLE");
    expect(f.appels[2]!.valeurs).toContain("s9");
  });

  it("⛔ MP-4 — membre désactivé, session ouverte : la fin DISABLED s'écrit", async () => {
    const f = faux([[], [sonde({ memberActive: false })], 1]);
    await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    expect(f.appels[2]!.valeurs).toContain("DISABLED");
  });

  it("⛔ MP-18 — session d'une AUTRE salle : RIEN ne s'écrit (on ne termine pas la session d'autrui)", async () => {
    const f = faux([[], [sonde({ sameVenue: false })]]);
    expect(await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: false });
    expect(f.appels).toHaveLength(2);
    expect(f.appels.filter((a) => a.type === "execute")).toHaveLength(0);
  });

  it("⛔ MP-13 — PLAFOND atteint : rien ne s'écrit (l'énumération des fins n'a pas de valeur « plafond »)", async () => {
    const f = faux([[], [sonde({ capped: true })]]);
    await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    expect(f.appels.filter((a) => a.type === "execute")).toHaveLength(0);
  });

  it("⛔ MP-19 — session déjà terminée, ou jeton inconnu : rien ne s'écrit", async () => {
    const f1 = faux([[], [sonde({ ended: true })]]);
    await f1.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    expect(f1.appels.filter((a) => a.type === "execute")).toHaveLength(0);
    const f2 = faux([[], []]);
    expect(await f2.store.touchSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: false });
    expect(f2.appels).toHaveLength(2);
  });

  it("la sonde calcule les drapeaux AVEC L'HEURE DE LA BASE et la durée en paramètre", async () => {
    const f = faux([[], [sonde({ ended: true })]]);
    await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE });
    const s = f.appels[1]!;
    expect(s.sql).toContain("now()");
    expect(s.sql).not.toMatch(/interval\s*'/i);
    expect(s.valeurs).toContain(STAFF_LIMITS.IDLE_TIMEOUT_MINUTES);
  });
});

describe("peekSession — la LECTURE SEULE de l'état (K-17) ne prolonge jamais et n'écrit jamais", () => {
  it("⛔ n'émet AUCUN `UPDATE` ni `INSERT` : une lecture, avec les MÊMES prédicats que le garde", async () => {
    const f = faux([[{ sessionId: "s1", memberId: MEMBRE, role: "MANAGER", accountName: "Amine", mustChangePassword: false }]]);
    await f.store.peekSession({ tokenHash: "h", proProfileId: SALLE });
    const sql = f.appels.map((a) => a.sql).join(" ");
    expect(sql).not.toMatch(/\bUPDATE\b|\bINSERT\b|\bDELETE\b/);
    expect(f.appels.filter((a) => a.type === "execute")).toHaveLength(0);
    for (const predicat of ["s.token_hash =", "m.pro_profile_id =", "m.status = 'ACTIVE'", "s.ended_at IS NULL", "s.expires_at > now()"]) expect(sql, predicat).toContain(predicat);
    expect(sql).toMatch(/s\.last_activity_at > now\(\) - make_interval\(mins => \?/);
  });

  it("⛔ MP-43 — même durée d'inactivité (paramètre), même séparation : le garde et l'état jugent la session de la MÊME façon", async () => {
    const f = faux([[]]);
    expect(await f.store.peekSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: false });
    expect(f.appels[0]!.valeurs).toContain(STAFF_LIMITS.IDLE_TIMEOUT_MINUTES);
    expect(f.appels).toHaveLength(1);
  });
});

describe("activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit", () => {
  const entree = {
    actor: acteur,
    accountName: "Amine",
    accountNameKey: "amine",
    passwordHash: "HASH",
    sessionTokenHash: "hs",
    deviceTokenHash: "hd",
    deviceLabel: "Poste"
  };
  const profil = { id: SALLE, user: { emailVerifiedAt: new Date("2026-10-01T00:00:00Z") } };

  it("⛔ MP-22 — l'ordre : lecture du profil, CAS du drapeau (`staff_layer_enabled_at IS NULL`, compte 1), insertion du membre, de l'appareil, de la session, audit", async () => {
    const f = faux([1, [LIGNE_MEMBRE], [{ id: "d1" }], [{ id: "s1" }]], { profil });
    const r = await f.store.activate(entree);
    expect(r).toEqual({ ok: true, member: LIGNE_MEMBRE, sessionId: "s1" });
    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    const sqls = f.appels.map((a) => a.sql);
    expect(sqls[0]).toMatch(/^UPDATE pro_profiles SET staff_layer_enabled_at = now\(\)/);
    // Le check-and-set est le DERNIER prédicat de l'instruction, tel quel (D305) : une tautologie qui CONTIENDRAIT cette sous-chaîne (`… IS NULL OR … IS NOT NULL`) re-poserait le drapeau.
    expect(sqls[0]).toMatch(/WHERE id = \?::uuid AND staff_layer_enabled_at IS NULL$/);
    expect(sqls[1]).toMatch(/^INSERT INTO pro_staff_members/);
    expect(sqls[1]).toContain("ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING");
    expect(sqls[1]).toContain("'MANAGER'");
    expect(sqls[2]).toMatch(/^INSERT INTO pro_staff_devices/);
    expect(sqls[3]).toMatch(/^INSERT INTO pro_staff_sessions/);
    expect(f.audits).toHaveLength(1);
    expect(f.issues).toEqual(["validée"]);
  });

  it("⛔ MP-43 / R-6 (D341) — les échéances sont des PARAMÈTRES du levier : mot de passe 90 jours, appareil = durée du PIN, session = plafond ; aucune durée en dur", async () => {
    const f = faux([1, [LIGNE_MEMBRE], [{ id: "d1" }], [{ id: "s1" }]], { profil });
    await f.store.activate(entree);
    expect(f.appels[1]!.valeurs).toContain(STAFF_LIMITS.PASSWORD_VALIDITY_DAYS);
    expect(f.appels[2]!.valeurs).toContain(STAFF_LIMITS.PIN_VALIDITY_DAYS);
    expect(f.appels[3]!.valeurs).toContain(STAFF_LIMITS.SESSION_MAX_HOURS);
    for (const a of f.appels) expect(a.sql, a.sql).not.toMatch(/interval\s*'/i);
  });

  it("⛔ le drapeau déjà posé (compte 0) : AUCUNE écriture ne suit — ni membre, ni appareil, ni session, ni audit", async () => {
    const f = faux([0], { profil });
    expect(await f.store.activate(entree)).toEqual({ ok: false, reason: "alreadyActivated" });
    expect(f.appels).toHaveLength(1);
    expect(f.audits).toHaveLength(0);
  });

  it("un compte sans profil : refusé avant toute écriture", async () => {
    const f = faux([], {});
    expect(await f.store.activate(entree)).toEqual({ ok: false, reason: "profileMissing" });
    expect(f.appels).toHaveLength(0);
  });

  it("⛔ MP-23 — un e-mail non vérifié : refusé avant toute écriture", async () => {
    const f = faux([], { profil: { id: SALLE, user: { emailVerifiedAt: null } } });
    expect(await f.store.activate(entree)).toEqual({ ok: false, reason: "emailNotVerified" });
    expect(f.appels).toHaveLength(0);
  });

  it("⛔ un nom de compte déjà pris (insertion sans ligne) : la transaction est ANNULÉE — le drapeau posé une instruction plus tôt ne reste pas posé sans Manager", async () => {
    const f = faux([1, []], { profil });
    expect(await f.store.activate(entree)).toEqual({ ok: false, reason: "accountNameTaken" });
    expect(f.issues).toEqual(["annulée"]);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ MP-33 — la ligne d'audit est écrite DANS la transaction, avec le membre pour acteur, et ne porte que le rôle", async () => {
    const f = faux([1, [LIGNE_MEMBRE], [{ id: "d1" }], [{ id: "s1" }]], { profil });
    await f.store.activate(entree);
    expect(f.audits[0]!.data).toMatchObject({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MEMBRE, action: "staff.activate", entityType: "staff_member", entityId: MEMBRE });
    expect(f.audits[0]!.data.after).toEqual({ role: "MANAGER" });
  });
});

describe("openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse", () => {
  const entree = { actor: acteur, proProfileId: SALLE, memberId: MEMBRE, sessionTokenHash: "hs", candidateDeviceHashes: ["h-candidat"], newDeviceTokenHash: "hd", deviceLabel: "Poste" };
  const appareil = (surcharge: Record<string, unknown> = {}) => ({ id: "d0", memberId: MEMBRE, proProfileId: SALLE, revoked: false, expired: false, ...surcharge });

  it("⛔ le CAS du membre est la PREMIÈRE instruction (`status = 'ACTIVE'`, la salle, remise à zéro du compteur) ; compte 0 ⇒ `memberInactive` SANS autre écriture (connexion ‖ désactivation, D305)", async () => {
    const f = faux([[]]);
    expect(await f.store.openSession(entree)).toEqual({ ok: false, reason: "memberInactive" });
    expect(f.appels).toHaveLength(1);
    const sql = f.appels[0]!.sql;
    expect(sql).toMatch(/^UPDATE pro_staff_members/);
    expect(sql).toContain("status = 'ACTIVE'");
    expect(sql).toContain("pro_profile_id =");
    expect(sql).toContain("password_failed_count = 0");
    expect(sql).toContain("password_locked_until = NULL");
    expect(sql).toContain("last_login_at = now()");
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ un appareil reconnu (lui-même, sa salle, ni révoqué ni expiré) est RÉUTILISÉ : on le marque utilisé, on n'en crée pas", async () => {
    const f = faux([[LIGNE_MEMBRE], [appareil()], 1, [{ id: "s1" }]]);
    expect(await f.store.openSession(entree)).toEqual({ ok: true, member: LIGNE_MEMBRE, sessionId: "s1", deviceReused: true });
    const sqls = f.appels.map((a) => a.sql);
    expect(sqls[1]).toMatch(/FROM pro_staff_devices/);
    expect(sqls[1]).toContain("revoked_at IS NOT NULL");
    expect(sqls[1]).toMatch(/expires_at <= now\(\)/);
    expect(f.appels[1]!.valeurs).toContainEqual(["h-candidat"]);
    expect(sqls[2]).toMatch(/^UPDATE pro_staff_devices SET last_used_at = now\(\)/);
    expect(sqls.some((s) => /^INSERT INTO pro_staff_devices/.test(s))).toBe(false);
    expect(sqls[3]).toMatch(/^INSERT INTO pro_staff_sessions/);
  });

  it("⛔ MP-3 — l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est pas réutilisé : un appareil neuf est créé", async () => {
    const f = faux([[LIGNE_MEMBRE], [appareil({ memberId: "autre" }), appareil({ id: "d2", proProfileId: "autre-salle" })], [{ id: "dn" }], [{ id: "s1" }]]);
    const r = await f.store.openSession(entree);
    expect(r).toMatchObject({ ok: true, deviceReused: false });
    const sqls = f.appels.map((a) => a.sql);
    expect(sqls[2]).toMatch(/^INSERT INTO pro_staff_devices/);
    expect(f.appels[2]!.valeurs).toContain("hd");
  });

  it("sans cookie d'appareil présenté : AUCUNE lecture d'appareils, un appareil neuf directement", async () => {
    const f = faux([[LIGNE_MEMBRE], [{ id: "dn" }], [{ id: "s1" }]]);
    await f.store.openSession({ ...entree, candidateDeviceHashes: [] });
    expect(f.appels.map((a) => a.sql).some((s) => /^SELECT .* FROM pro_staff_devices/.test(s))).toBe(false);
  });

  it("⛔ MP-43 / R-6 (D341) — l'échéance d'un appareil neuf est la durée du PIN, la session le plafond : des paramètres du levier", async () => {
    const f = faux([[LIGNE_MEMBRE], [], [{ id: "dn" }], [{ id: "s1" }]]);
    await f.store.openSession(entree);
    const insertionAppareil = f.appels.find((a) => /^INSERT INTO pro_staff_devices/.test(a.sql))!;
    const insertionSession = f.appels.find((a) => /^INSERT INTO pro_staff_sessions/.test(a.sql))!;
    expect(insertionAppareil.valeurs).toContain(STAFF_LIMITS.PIN_VALIDITY_DAYS);
    expect(insertionSession.valeurs).toContain(STAFF_LIMITS.SESSION_MAX_HOURS);
  });

  it("l'audit `staff.login` est écrit dans la transaction, sans secret : le membre et si l'appareil était déjà reconnu", async () => {
    const f = faux([[LIGNE_MEMBRE], [appareil()], 1, [{ id: "s1" }]]);
    await f.store.openSession(entree);
    expect(f.audits[0]!.data).toMatchObject({ actorId: UTILISATEUR, actorMemberId: MEMBRE, action: "staff.login", entityType: "staff_session", entityId: "s1" });
    expect(f.audits[0]!.data.after).toEqual({ memberId: MEMBRE, deviceReused: true });
  });
});

describe("closeSession, changePassword, listKnownMembers, resetPasswordAttempts", () => {
  it("closeSession : la fin LOGOUT est conditionnée à `ended_at IS NULL` ; l'audit n'est écrit que si la session s'est VRAIMENT terminée (compte 1)", async () => {
    const f = faux([1]);
    await f.store.closeSession({ actor: acteur, sessionId: "s1", memberId: MEMBRE });
    expect(f.appels[0]!.sql).toMatch(/^UPDATE pro_staff_sessions SET ended_at = now\(\), end_reason = 'LOGOUT'/);
    expect(f.appels[0]!.sql).toMatch(/WHERE id = \?::uuid AND ended_at IS NULL$/);
    expect(f.audits[0]!.data).toMatchObject({ action: "staff.logout", entityType: "staff_session", entityId: "s1", actorMemberId: MEMBRE });

    const f0 = faux([0]);
    await f0.store.closeSession({ actor: acteur, sessionId: "s1", memberId: MEMBRE });
    expect(f0.audits).toHaveLength(0);
  });

  it("⛔ changePassword — verrou du membre d'abord (L2), remplacement CONDITIONNÉ au hachage lu, puis fin des AUTRES sessions (`id <> courante`), audit : MP-5", async () => {
    const f = faux([[{ id: MEMBRE }], [LIGNE_MEMBRE], 2]);
    const r = await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF" });
    expect(r).toEqual({ ok: true, member: LIGNE_MEMBRE, otherSessionsEnded: 2 });
    const sqls = f.appels.map((a) => a.sql);
    expect(sqls[0]).toMatch(/FOR UPDATE/);
    expect(sqls[1]).toMatch(/^UPDATE pro_staff_members SET password_hash =/);
    expect(sqls[1]).toContain("password_hash = ? AND");
    expect(sqls[1]).toContain("must_change_password = false");
    expect(sqls[1]).toContain("password_failed_count = 0");
    expect(f.appels[1]!.valeurs).toContain("H-LU");
    expect(f.appels[1]!.valeurs).toContain("H-NEUF");
    expect(f.appels[1]!.valeurs).toContain(STAFF_LIMITS.PASSWORD_VALIDITY_DAYS);
    expect(sqls[2]).toMatch(/^UPDATE pro_staff_sessions SET ended_at = now\(\), end_reason = 'PASSWORD_CHANGED'/);
    expect(sqls[2]).toMatch(/WHERE member_id = \?::uuid AND id <> \?::uuid AND ended_at IS NULL$/);
    expect(f.audits[0]!.data).toMatchObject({ action: "staff.password_change", entityType: "staff_member", entityId: MEMBRE });
    expect(f.audits[0]!.data.after).toEqual({ otherSessionsEnded: 2 });
  });

  it("changePassword : le hachage lu n'est plus le courant ⇒ `changedConcurrently`, RIEN n'est écrit de plus (ni sessions terminées, ni audit)", async () => {
    const f = faux([[{ id: MEMBRE }], []]);
    expect(await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF" })).toEqual({ ok: false, reason: "changedConcurrently" });
    expect(f.appels).toHaveLength(2);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ changePassword : le membre introuvable ou éteint (le verrou ne rend AUCUNE ligne) ⇒ `changedConcurrently`, aucun remplacement ne part", async () => {
    const f = faux([[]]);
    expect(await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF" })).toEqual({ ok: false, reason: "changedConcurrently" });
    expect(f.appels).toHaveLength(1);
    expect(f.audits).toHaveLength(0);
  });

  it("listKnownMembers : sans hachage d'appareil, AUCUNE requête ; sinon un membre actif de CETTE salle, appareil ni révoqué ni expiré", async () => {
    const f0 = faux();
    expect(await f0.store.listKnownMembers({ proProfileId: SALLE, deviceTokenHashes: [] })).toEqual([]);
    expect(f0.appels).toHaveLength(0);
    const f = faux([[{ id: MEMBRE, accountName: "Amine", role: "MANAGER" }]]);
    expect(await f.store.listKnownMembers({ proProfileId: SALLE, deviceTokenHashes: ["h1", "h2"] })).toEqual([{ id: MEMBRE, accountName: "Amine", role: "MANAGER" }]);
    const sql = f.appels[0]!.sql;
    expect(sql).toContain("d.revoked_at IS NULL");
    expect(sql).toContain("d.expires_at > now()");
    expect(sql).toContain("m.status = 'ACTIVE'");
    expect(sql).toContain("m.pro_profile_id =");
    expect(f.appels[0]!.valeurs).toContainEqual(["h1", "h2"]);
  });

  it("resetPasswordAttempts : remet le compteur et la pause à zéro, sous condition du membre", async () => {
    const f = faux([1]);
    await f.store.resetPasswordAttempts(MEMBRE);
    expect(f.appels[0]!.sql).toMatch(/^UPDATE pro_staff_members SET password_failed_count = 0, password_locked_until = NULL/);
  });
});

describe("recordPasswordFailure — l'échec consigné, sans secret", () => {
  it("⛔ MP-33 — une ligne `staff.login_failed` avec le compte d'échecs ; une seconde `staff.password_pause` SEULEMENT quand cet échec a déclenché la pause", async () => {
    const f = faux();
    await f.store.recordPasswordFailure({ actor: acteur, memberId: MEMBRE, failedCount: 2, pausedNow: false, action: "staff.login_failed" });
    expect(f.audits.map((a) => a.data.action)).toEqual(["staff.login_failed"]);
    expect(f.audits[0]!.data.after).toEqual({ failedCount: 2 });

    const g = faux();
    await g.store.recordPasswordFailure({ actor: acteur, memberId: MEMBRE, failedCount: STAFF_LIMITS.PASSWORD_MAX_FAILURES, pausedNow: true, action: "staff.login_failed" });
    expect(g.audits.map((a) => a.data.action)).toEqual(["staff.login_failed", "staff.password_pause"]);
    expect(g.audits[1]!.data.after).toEqual({ pausedMinutes: STAFF_LIMITS.PASSWORD_PAUSE_MINUTES });
  });

  it("l'échec d'un changement de mot de passe porte son propre nom d'action", async () => {
    const f = faux();
    await f.store.recordPasswordFailure({ actor: acteur, memberId: MEMBRE, failedCount: 1, pausedNow: false, action: "staff.password_change_failed" });
    expect(f.audits[0]!.data.action).toBe("staff.password_change_failed");
  });
});

describe("l'AUDIT — un seul site d'écriture, une charge utile FERMÉE (MP-33, MP-11)", () => {
  it("⛔ toute ligne d'audit porte les clés autorisées, et aucune valeur secrète ne peut s'y glisser (hachage, jeton, mot de passe, PIN, nom de compte)", async () => {
    const profil = { id: SALLE, user: { emailVerifiedAt: new Date() } };
    const lignes: Array<Record<string, unknown>> = [];
    const entrees: Array<() => Promise<unknown>> = [];
    {
      const f = faux([1, [LIGNE_MEMBRE], [{ id: "d1" }], [{ id: "s1" }]], { profil });
      entrees.push(async () => { await f.store.activate({ actor: acteur, accountName: "SECRET-NOM", accountNameKey: "secret-nom", passwordHash: "SECRET-HASH", sessionTokenHash: "SECRET-JETON-S", deviceTokenHash: "SECRET-JETON-D", deviceLabel: "Poste" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    {
      const f = faux([[LIGNE_MEMBRE], [], [{ id: "d1" }], [{ id: "s1" }]]);
      entrees.push(async () => { await f.store.openSession({ actor: acteur, proProfileId: SALLE, memberId: MEMBRE, sessionTokenHash: "SECRET-JETON-S", candidateDeviceHashes: ["SECRET-JETON-C"], newDeviceTokenHash: "SECRET-JETON-D", deviceLabel: "Poste" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    {
      const f = faux([[{ id: MEMBRE }], [LIGNE_MEMBRE], 1]);
      entrees.push(async () => { await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "SECRET-HASH-ANCIEN", newPasswordHash: "SECRET-HASH-NEUF" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    {
      const f = faux();
      entrees.push(async () => { await f.store.recordPasswordFailure({ actor: acteur, memberId: MEMBRE, failedCount: 5, pausedNow: true, action: "staff.login_failed" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    for (const e of entrees) await e();
    expect(lignes.length).toBeGreaterThanOrEqual(5);
    const AUTORISEES = ["actorId", "actorRole", "actorMemberId", "action", "entityType", "entityId", "after"].sort();
    for (const l of lignes) {
      expect(Object.keys(l).sort(), String(l.action)).toEqual(AUTORISEES);
      expect(JSON.stringify(l), String(l.action)).not.toMatch(/SECRET/);
    }
  });
});
