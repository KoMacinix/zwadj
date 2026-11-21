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

// ⛔ Rang 58 (D356) — ce que le CAS d'`openSession` et le verrou de `changePassword` rendent maintenant du PIN du membre (sa PRÉSENCE, son échéance, son verrou, son compteur) et l'heure de la BASE : de quoi appliquer
// `etatDuPin`, la SEULE règle. Les cinq états sont déclarés ici une fois ; aucun test ne recopie la règle.
const INSTANT_BASE = new Date("2026-11-19T10:00:00.000Z");
const PIN_VALABLE = { hasPin: true, pinExpiresAt: new Date("2027-01-01T00:00:00.000Z"), pinLockedAt: null, pinFailedCount: 0, now: INSTANT_BASE };
const PIN_ABSENT = { hasPin: false, pinExpiresAt: null, pinLockedAt: null, pinFailedCount: 0, now: INSTANT_BASE };
const PIN_EXPIRE = { ...PIN_VALABLE, pinExpiresAt: new Date("2026-11-18T10:00:00.000Z") };
const PIN_VERROUILLE = { ...PIN_VALABLE, pinLockedAt: new Date("2026-11-19T09:00:00.000Z"), pinFailedCount: STAFF_LIMITS.PIN_MAX_FAILURES };
const PIN_AU_PLAFOND_SANS_VERROU = { ...PIN_VALABLE, pinFailedCount: STAFF_LIMITS.PIN_MAX_FAILURES };
const LIGNE_PIN_VALABLE = { ...LIGNE_MEMBRE, ...PIN_VALABLE };
const LIGNE_PIN_ABSENT = { ...LIGNE_MEMBRE, ...PIN_ABSENT };
const LIGNE_PIN_EXPIRE = { ...LIGNE_MEMBRE, ...PIN_EXPIRE };
const LIGNE_PIN_VERROUILLE = { ...LIGNE_MEMBRE, ...PIN_VERROUILLE };
const LIGNE_PIN_AU_PLAFOND = { ...LIGNE_MEMBRE, ...PIN_AU_PLAFOND_SANS_VERROU };

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
    pinHash: "PIN-HASH-ACTIVATION",
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

  it("⛔ rang 58 (R-4, MP-12) — le PIN du Manager s'INSTALLE dans l'INSERT du membre, UNE instruction : le haché CANDIDAT en paramètre, son échéance par le levier (`PIN_VALIDITY_DAYS`) ; aucune instruction de plus, et le haché n'entre jamais dans la ligne d'audit", async () => {
    const f = faux([1, [LIGNE_MEMBRE], [{ id: "d1" }], [{ id: "s1" }]], { profil });
    await f.store.activate(entree);
    const insertion = f.appels[1]!;
    expect(insertion.sql).toContain("pin_hash, pin_generated_at, pin_expires_at)");
    expect(insertion.sql).toMatch(/pin_expires_at\) VALUES/);
    expect(insertion.sql).toMatch(/pin_expires_at\) VALUES .* now\(\) \+ make_interval\(days => \?::int\)\) ON CONFLICT/);
    expect(insertion.valeurs, "le profil, le nom, sa clé, le hachage du mot de passe, SA durée, le haché du PIN, SA durée").toEqual([SALLE, "Amine", "amine", "HASH", STAFF_LIMITS.PASSWORD_VALIDITY_DAYS, "PIN-HASH-ACTIVATION", STAFF_LIMITS.PIN_VALIDITY_DAYS]);
    expect(f.appels).toHaveLength(4);
    expect(JSON.stringify(f.audits[0]!.data)).not.toContain("PIN-HASH-ACTIVATION");
  });
});

describe("openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse", () => {
  // `expectedPasswordHash` (D355, R-1) : le hachage lu par la RÉSERVATION de la tentative — l'ouverture lui est CONDITIONNÉE, dans le CAS du membre.
  const entree = {
    actor: acteur,
    proProfileId: SALLE,
    memberId: MEMBRE,
    sessionTokenHash: "hs",
    candidateDeviceHashes: ["h-candidat"],
    newDeviceTokenHash: "hd",
    deviceLabel: "Poste",
    expectedPasswordHash: "HASH-LU-A-LA-RESERVATION",
    newPinHash: "PIN-CANDIDAT"
  };
  const appareil = (surcharge: Record<string, unknown> = {}) => ({ id: "d0", memberId: MEMBRE, proProfileId: SALLE, revoked: false, expired: false, ...surcharge });

  it("⛔ le CAS du membre est la PREMIÈRE instruction (`status = 'ACTIVE'`, la salle, remise à zéro du compteur) ; compte 0 ⇒ `memberChanged` SANS autre écriture (connexion ‖ désactivation, D305)", async () => {
    const f = faux([[]]);
    expect(await f.store.openSession(entree)).toEqual({ ok: false, reason: "memberChanged" });
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

  it("⛔ R-1 (D355) — le CAS porte le HACHAGE lu à la réservation, dans le WHERE de la MÊME instruction que `status = 'ACTIVE'` : une réinitialisation ou un changement de mot de passe entre la réservation et l'ouverture ne trouve plus la ligne", async () => {
    const f = faux([[]]);
    await f.store.openSession(entree);
    const premier = f.appels[0]!;
    const where = premier.sql.slice(premier.sql.indexOf(" WHERE "), premier.sql.indexOf(" RETURNING "));
    expect(where, "le WHERE de l'UPDATE du membre a été isolé").toContain("pro_profile_id =");
    expect(where, "le statut et le hachage sont dans le MÊME WHERE : l'un sans l'autre laisserait passer l'ouverture d'un mot de passe remplacé").toContain("status = 'ACTIVE'");
    expect(where).toContain("password_hash = ?");
    expect(premier.valeurs, "les paramètres : le membre, sa salle, le hachage LU (jamais le jeton ni un autre secret)").toEqual([MEMBRE, SALLE, "HASH-LU-A-LA-RESERVATION"]);
  });

  it("⛔ R-1 (D355) — le CAS refusé ne laisse AUCUNE écriture : ni appareil, ni session, ni audit `staff.login` (compte 0 ⇒ la transaction s'arrête là)", async () => {
    const f = faux([[]]);
    expect(await f.store.openSession(entree)).toEqual({ ok: false, reason: "memberChanged" });
    expect(f.appels.map((a) => a.sql).filter((s) => /^INSERT/.test(s))).toEqual([]);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ un appareil reconnu (lui-même, sa salle, ni révoqué ni expiré) est RÉUTILISÉ : on le marque utilisé, on n'en crée pas", async () => {
    const f = faux([[LIGNE_PIN_VALABLE], [appareil()], 1, [{ id: "s1" }]]);
    expect(await f.store.openSession(entree)).toEqual({ ok: true, member: LIGNE_MEMBRE, sessionId: "s1", deviceReused: true, pinIssued: false });
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
    const f = faux([[LIGNE_PIN_VALABLE], [appareil({ memberId: "autre" }), appareil({ id: "d2", proProfileId: "autre-salle" })], [{ id: "dn" }], [{ id: "s1" }]]);
    const r = await f.store.openSession(entree);
    expect(r).toMatchObject({ ok: true, deviceReused: false });
    const sqls = f.appels.map((a) => a.sql);
    expect(sqls[2]).toMatch(/^INSERT INTO pro_staff_devices/);
    expect(f.appels[2]!.valeurs).toContain("hd");
  });

  it("sans cookie d'appareil présenté : AUCUNE lecture d'appareils, un appareil neuf directement", async () => {
    const f = faux([[LIGNE_PIN_VALABLE], [{ id: "dn" }], [{ id: "s1" }]]);
    await f.store.openSession({ ...entree, candidateDeviceHashes: [] });
    expect(f.appels.map((a) => a.sql).some((s) => /^SELECT .* FROM pro_staff_devices/.test(s))).toBe(false);
  });

  it("⛔ MP-43 / R-6 (D341) — l'échéance d'un appareil neuf est la durée du PIN, la session le plafond : des paramètres du levier", async () => {
    const f = faux([[LIGNE_PIN_VALABLE], [], [{ id: "dn" }], [{ id: "s1" }]]);
    await f.store.openSession(entree);
    const insertionAppareil = f.appels.find((a) => /^INSERT INTO pro_staff_devices/.test(a.sql))!;
    const insertionSession = f.appels.find((a) => /^INSERT INTO pro_staff_sessions/.test(a.sql))!;
    expect(insertionAppareil.valeurs).toContain(STAFF_LIMITS.PIN_VALIDITY_DAYS);
    expect(insertionSession.valeurs).toContain(STAFF_LIMITS.SESSION_MAX_HOURS);
  });

  it("l'audit `staff.login` est écrit dans la transaction, sans secret : le membre et si l'appareil était déjà reconnu", async () => {
    const f = faux([[LIGNE_PIN_VALABLE], [appareil()], 1, [{ id: "s1" }]]);
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
    const f = faux([[PIN_VALABLE], [LIGNE_MEMBRE], 2]);
    const r = await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF", newPinHash: "PIN-CANDIDAT" });
    expect(r).toEqual({ ok: true, member: LIGNE_MEMBRE, otherSessionsEnded: 2, pinIssued: false });
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
    const f = faux([[PIN_VALABLE], []]);
    expect(await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF", newPinHash: "PIN-CANDIDAT" })).toEqual({ ok: false, reason: "changedConcurrently" });
    expect(f.appels).toHaveLength(2);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ changePassword : le membre introuvable ou éteint (le verrou ne rend AUCUNE ligne) ⇒ `changedConcurrently`, aucun remplacement ne part", async () => {
    const f = faux([[]]);
    expect(await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF", newPinHash: "PIN-CANDIDAT" })).toEqual({ ok: false, reason: "changedConcurrently" });
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
      entrees.push(async () => { await f.store.activate({ actor: acteur, accountName: "SECRET-NOM", accountNameKey: "secret-nom", passwordHash: "SECRET-HASH", pinHash: "SECRET-PIN-ACTIVATION", sessionTokenHash: "SECRET-JETON-S", deviceTokenHash: "SECRET-JETON-D", deviceLabel: "Poste" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    {
      const f = faux([[LIGNE_PIN_VALABLE], [], [{ id: "d1" }], [{ id: "s1" }]]);
      entrees.push(async () => { await f.store.openSession({ actor: acteur, proProfileId: SALLE, memberId: MEMBRE, expectedPasswordHash: "SECRET-HASH-LU", sessionTokenHash: "SECRET-JETON-S", candidateDeviceHashes: ["SECRET-JETON-C"], newDeviceTokenHash: "SECRET-JETON-D", deviceLabel: "Poste", newPinHash: "SECRET-PIN-CANDIDAT" }); lignes.push(...f.audits.map((a) => a.data)); });
    }
    {
      const f = faux([[PIN_VALABLE], [LIGNE_MEMBRE], 1]);
      entrees.push(async () => { await f.store.changePassword({ actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "SECRET-HASH-ANCIEN", newPasswordHash: "SECRET-HASH-NEUF", newPinHash: "SECRET-PIN-CANDIDAT" }); lignes.push(...f.audits.map((a) => a.data)); });
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

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// RANG 56, L36-3a-2 (D354) — K-19 à K-22 et l'état du compte (S-104, S-241). Même méthode : un faux client qui enregistre l'ORDRE des instructions, car l'ordre des verrous (L1 le profil < L2 les membres
// < L3 les appareils < L4 les sessions, cadrage § 3.1) est ce qui rend l'interblocage IMPOSSIBLE, et qu'un spec d'intégration qui n'en a pas trouvé n'en dit rien.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MAINTENANT_BASE = new Date("2026-11-19T10:00:00.000Z");
const MANAGER_ACTEUR = "018f0000-0000-7000-8000-0000000000d1";
const CIBLE = "018f0000-0000-7000-8000-0000000000e1";
const LIGNE_LISTE = {
  id: CIBLE,
  accountName: "Karim",
  role: "EMPLOYEE",
  status: "ACTIVE",
  mustChangePassword: true,
  passwordExpiresAt: new Date("2026-11-26T10:00:00.000Z"),
  lastLoginAt: null,
  createdAt: MAINTENANT_BASE,
  now: MAINTENANT_BASE
};
/** Un secret qui ne doit apparaître dans AUCUNE colonne lue par la liste ni dans aucune charge d'audit. */
const SECRETS_EN_BASE = /password_hash|pin_hash|pin_|password_failed_count|password_locked_until|token_hash/;

describe("findMember — rend l'ÉCHÉANCE du mot de passe et l'HEURE DE LA BASE dans la MÊME instruction (S-104, S-241)", () => {
  it("⛔ UNE requête brute (plus de lecture par l'ORM : l'heure ne se lit que par `now()`) qui filtre par la salle ET la clé du nom, sans aucune écriture", async () => {
    const f = faux([[{ id: MEMBRE, accountName: "Amine", role: "MANAGER", status: "ACTIVE", mustChangePassword: false, passwordExpiresAt: MAINTENANT_BASE, now: MAINTENANT_BASE }]]);
    const m = await f.store.findMember(SALLE, "amine");
    expect(f.appels).toHaveLength(1);
    const { sql, valeurs } = f.appels[0]!;
    expect(f.appels[0]!.type).toBe("query");
    expect(sql).toMatch(/^SELECT/);
    expect(sql).toContain("pro_profile_id =");
    expect(sql).toContain("account_name_key =");
    expect(sql).toContain('password_expires_at AS "passwordExpiresAt"');
    expect(sql).toContain('now() AS "now"');
    expect(valeurs).toEqual(expect.arrayContaining([SALLE, "amine"]));
    expect(m?.id).toBe(MEMBRE);
    expect(f.client.proStaffMember.findFirst).not.toHaveBeenCalled();
  });

  it("aucun membre : null ; et AUCUN hachage de mot de passe n'est lu (il n'est rendu que par la réservation)", async () => {
    const f = faux([[]]);
    expect(await f.store.findMember(SALLE, "inconnu")).toBeNull();
    expect(f.appels[0]!.sql).not.toMatch(/password_hash/);
  });
});

describe("touchSession et peekSession — rendent le statut, l'échéance du mot de passe et l'HEURE DE LA BASE (S-241)", () => {
  const vivante = { sessionId: "s1", memberId: MEMBRE, role: "MANAGER", accountName: "Amine", mustChangePassword: false, status: "ACTIVE", passwordExpiresAt: MAINTENANT_BASE, now: MAINTENANT_BASE };

  it("⛔ touchSession : l'instruction RETURNING porte `status`, `password_expires_at` et `now()` de la base ; aucune date ne voyage en paramètre", async () => {
    const f = faux([[vivante]]);
    expect(await f.store.touchSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: true, session: vivante });
    const { sql, valeurs } = f.appels[0]!;
    expect(sql).toContain('m.status::text AS status');
    expect(sql).toContain('m.password_expires_at AS "passwordExpiresAt"');
    expect(sql).toContain('now() AS "now"');
    expect(valeurs.some((v) => v instanceof Date)).toBe(false);
  });

  it("⛔ peekSession : les MÊMES colonnes, en lecture seule — le garde et l'état jugent le compte de la même façon", async () => {
    const f = faux([[vivante]]);
    expect(await f.store.peekSession({ tokenHash: "h", proProfileId: SALLE })).toEqual({ ok: true, session: vivante });
    const { sql } = f.appels[0]!;
    expect(sql).toMatch(/^SELECT/);
    expect(sql).toContain('m.status::text AS status');
    expect(sql).toContain('m.password_expires_at AS "passwordExpiresAt"');
    expect(sql).toContain('now() AS "now"');
  });
});

describe("listMembers — K-19 : UNE lecture, les membres de la salle, aucun secret", () => {
  it("⛔ une seule requête brute, en lecture seule (ni écriture, ni transaction, ni audit), filtrée par la salle, ordonnée de façon stable", async () => {
    const f = faux([[LIGNE_LISTE]]);
    expect(await f.store.listMembers(SALLE)).toEqual([LIGNE_LISTE]);
    expect(f.appels).toHaveLength(1);
    expect(f.appels[0]!.type).toBe("query");
    expect(f.appels[0]!.sql).toMatch(/^SELECT/);
    expect(f.appels[0]!.sql).toContain("pro_profile_id =");
    expect(f.appels[0]!.sql).toMatch(/ORDER BY created_at, id/);
    expect(f.appels[0]!.valeurs).toEqual([SALLE]);
    expect(f.client.$transaction).not.toHaveBeenCalled();
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ la liste ne SÉLECTIONNE aucun secret : ni hachage de mot de passe ou de PIN, ni compteur, ni verrou, ni jeton (un SELECT qui ne les lit pas ne peut pas les rendre)", async () => {
    const f = faux([[LIGNE_LISTE]]);
    await f.store.listMembers(SALLE);
    expect(f.appels[0]!.sql).not.toMatch(SECRETS_EN_BASE);
    expect(f.appels[0]!.sql).toContain('now() AS "now"');
  });
});

describe("createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours", () => {
  const entree = { actor: acteur, actorMemberId: MANAGER_ACTEUR, proProfileId: SALLE, accountName: "Karim", accountNameKey: "karim", role: "EMPLOYEE" as const, passwordHash: "SECRET-HASH" };

  it("⛔ l'insertion est atomique (`ON CONFLICT … DO NOTHING`, jamais « lire puis insérer »), pose `must_change_password` et l'échéance TEMPORAIRE par PARAMÈTRE du levier, et rattache le créateur", async () => {
    const f = faux([[LIGNE_LISTE]]);
    const r = await f.store.createMember(entree);
    expect(r).toEqual({ ok: true, member: LIGNE_LISTE });
    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    expect(f.appels).toHaveLength(1);
    const { sql, valeurs } = f.appels[0]!;
    expect(sql).toMatch(/^INSERT INTO pro_staff_members/);
    expect(sql).toContain("ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING");
    expect(sql).toContain("must_change_password");
    expect(sql).toContain("password_changed_at");
    expect(sql).toMatch(/\btrue\b/);
    expect(sql).toContain("created_by_member_id");
    expect(sql).toMatch(/now\(\) \+ make_interval\(days => \?/);
    expect(sql).not.toMatch(/interval\s*'/i);
    expect(sql).toContain('now() AS "now"');
    expect(valeurs).toContain(STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS);
    expect(STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS).toBe(7);
    expect(valeurs).toEqual(expect.arrayContaining([SALLE, "Karim", "karim", "EMPLOYEE", "SECRET-HASH", MANAGER_ACTEUR]));
  });

  it("⛔ R-6 — la ligne d'audit s'écrit DANS la transaction, avec le MANAGER pour acteur (et le compte commun), et ne porte que le rôle ; la transaction est validée", async () => {
    const f = faux([[LIGNE_LISTE]]);
    await f.store.createMember(entree);
    expect(f.audits).toHaveLength(1);
    expect(f.audits[0]!.data).toEqual({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MANAGER_ACTEUR, action: "staff.member_create", entityType: "staff_member", entityId: CIBLE, after: { role: "EMPLOYEE" } });
    expect(JSON.stringify(f.audits)).not.toMatch(/SECRET|Karim|karim/);
    expect(f.issues).toEqual(["validée"]);
  });

  it("⛔ un nom déjà pris (l'insertion ne rend aucune ligne) : `accountNameTaken`, AUCUNE ligne d'audit — une action sans effet n'a pas de trace", async () => {
    const f = faux([[]]);
    expect(await f.store.createMember(entree)).toEqual({ ok: false, reason: "accountNameTaken" });
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ R-6 — l'audit est écrit APRÈS l'insertion et par le même client de transaction : un échec de l'audit ANNULE la création (une action sans trace n'existe pas)", async () => {
    const f = faux([[LIGNE_LISTE]]);
    f.client.auditLog.create.mockRejectedValueOnce(new Error("audit refusé"));
    await expect(f.store.createMember(entree)).rejects.toThrow("audit refusé");
    expect(f.issues).toEqual(["annulée"]);
  });
});

describe("resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction", () => {
  const entree = { actor: acteur, actorMemberId: MANAGER_ACTEUR, proProfileId: SALLE, memberId: CIBLE, passwordHash: "SECRET-HASH" };

  it("⛔ l'ORDRE : le verrou du membre (`FOR UPDATE`, sa salle), le remplacement du mot de passe, la révocation des appareils, la fin de TOUTES les sessions, l'audit — jamais l'inverse (L2 < L3 < L4)", async () => {
    const f = faux([[{ id: CIBLE, status: "ACTIVE" }], [LIGNE_LISTE], 2, 3]);
    const r = await f.store.resetMemberPassword(entree);
    expect(r).toEqual({ ok: true, member: LIGNE_LISTE, sessionsEnded: 3, devicesRevoked: 2 });
    expect(f.appels.map((a) => a.type)).toEqual(["query", "query", "execute", "execute"]);
    const [verrou, remplace, appareils, sessions] = f.appels.map((a) => a.sql);
    expect(verrou).toMatch(/^SELECT/);
    expect(verrou).toContain("FROM pro_staff_members");
    expect(verrou).toContain("pro_profile_id =");
    expect(verrou).toContain("FOR UPDATE");
    expect(remplace).toMatch(/^UPDATE pro_staff_members/);
    expect(appareils).toMatch(/^UPDATE pro_staff_devices/);
    expect(sessions).toMatch(/^UPDATE pro_staff_sessions/);
    expect(f.issues).toEqual(["validée"]);
  });

  it("⛔ le remplacement pose le hachage, `must_change_password = true`, l'échéance TEMPORAIRE par paramètre, remet les compteurs et la pause à zéro — et EFFACE le PIN (les cinq colonnes `pin_*`) : il se réémettra à la prochaine connexion par mot de passe (K-21, rang 58)", async () => {
    const f = faux([[{ id: CIBLE, status: "ACTIVE" }], [LIGNE_LISTE], 0, 0]);
    await f.store.resetMemberPassword(entree);
    const { sql, valeurs } = f.appels[1]!;
    expect(sql).toContain("password_hash =");
    expect(sql).toContain("password_changed_at = now()");
    expect(sql).toContain("must_change_password = true");
    expect(sql).toMatch(/password_expires_at = now\(\) \+ make_interval\(days => \?/);
    expect(sql).toContain("password_failed_count = 0");
    expect(sql).toContain("password_locked_until = NULL");
    for (const colonne of ["pin_hash = NULL", "pin_generated_at = NULL", "pin_expires_at = NULL", "pin_failed_count = 0", "pin_locked_at = NULL"]) expect(sql, colonne).toContain(colonne);
    expect(sql).not.toMatch(/interval\s*'/i);
    expect(valeurs).toEqual(expect.arrayContaining(["SECRET-HASH", STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS, CIBLE]));
  });

  it("⛔ S-105 — TOUTES les sessions du membre prennent fin `PASSWORD_CHANGED` (aucune n'est épargnée : pas de `id <>`), TOUS ses appareils sont révoqués, chacun sous sa propre condition (`… IS NULL`)", async () => {
    const f = faux([[{ id: CIBLE, status: "ACTIVE" }], [LIGNE_LISTE], 1, 1]);
    await f.store.resetMemberPassword(entree);
    expect(f.appels[2]!.sql).toContain("revoked_at = now()");
    expect(f.appels[2]!.sql).toContain("revoked_at IS NULL");
    expect(f.appels[3]!.sql).toContain("ended_at = now()");
    expect(f.appels[3]!.sql).toContain("end_reason = 'PASSWORD_CHANGED'");
    expect(f.appels[3]!.sql).toContain("ended_at IS NULL");
    expect(f.appels[3]!.sql).not.toMatch(/id <>/);
  });

  it("⛔ R-6 — l'audit dans la transaction : le MANAGER pour acteur, les COMPTES de sessions et d'appareils pour charge utile — jamais le temporaire, jamais un hachage", async () => {
    const f = faux([[{ id: CIBLE, status: "ACTIVE" }], [LIGNE_LISTE], 2, 3]);
    await f.store.resetMemberPassword(entree);
    expect(f.audits).toHaveLength(1);
    expect(f.audits[0]!.data).toEqual({
      actorId: UTILISATEUR,
      actorRole: "PRO",
      actorMemberId: MANAGER_ACTEUR,
      action: "staff.member_reset_password",
      entityType: "staff_member",
      entityId: CIBLE,
      after: { sessionsEnded: 3, devicesRevoked: 2 }
    });
    expect(JSON.stringify(f.audits)).not.toMatch(/SECRET/);
  });

  it("⛔ un membre introuvable DANS CETTE SALLE : `notFound`, AUCUNE écriture ; un membre désactivé : `disabled`, AUCUNE écriture ni audit", async () => {
    const f1 = faux([[]]);
    expect(await f1.store.resetMemberPassword(entree)).toEqual({ ok: false, reason: "notFound" });
    expect(f1.appels).toHaveLength(1);
    expect(f1.audits).toHaveLength(0);
    const f2 = faux([[{ id: CIBLE, status: "DISABLED" }]]);
    expect(await f2.store.resetMemberPassword(entree)).toEqual({ ok: false, reason: "disabled" });
    expect(f2.appels).toHaveLength(1);
    expect(f2.audits).toHaveLength(0);
  });
});

describe("disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le membre (L2), les sessions (L4)", () => {
  const entree = { actor: acteur, actorMemberId: MANAGER_ACTEUR, proProfileId: SALLE, memberId: CIBLE };
  const MANAGER_CIBLE = { ...LIGNE_LISTE, role: "MANAGER", mustChangePassword: false };
  const DESACTIVE = { ...LIGNE_LISTE, status: "DISABLED" };

  it("⛔ MP-6 — l'ORDRE : verrou du PROFIL (`FOR UPDATE`) AVANT le verrou du membre, le COMPTAGE des Managers actifs APRÈS les deux verrous et AVANT toute écriture, puis le CAS du statut, puis les sessions", async () => {
    const f = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 2 }], [DESACTIVE], 1]);
    const r = await f.store.disableMember(entree);
    expect(r).toEqual({ ok: true, member: DESACTIVE, sessionsEnded: 1, alreadyDisabled: false });
    expect(f.appels.map((a) => a.type)).toEqual(["query", "query", "query", "query", "execute"]);
    const [profil, membre, compte, cas, sessions] = f.appels.map((a) => a.sql);
    expect(profil).toContain("FROM pro_profiles");
    expect(profil).toContain("FOR UPDATE");
    expect(membre).toContain("FROM pro_staff_members");
    expect(membre).toContain("FOR UPDATE");
    expect(compte).toMatch(/count\(/i);
    expect(compte).toContain("role = 'MANAGER'");
    expect(compte).toContain("status = 'ACTIVE'");
    expect(cas).toMatch(/^UPDATE pro_staff_members/);
    expect(sessions).toMatch(/^UPDATE pro_staff_sessions/);
    expect(f.issues).toEqual(["validée"]);
  });

  it("⛔ MP-30 — le CAS de la transition : `status = 'DISABLED'` posé SOUS `status = 'ACTIVE'` (D305), avec `disabled_at = now()` ; les sessions finissent `DISABLED`, sous `ended_at IS NULL`", async () => {
    const f = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 2 }], [DESACTIVE], 2]);
    await f.store.disableMember(entree);
    const cas = f.appels[3]!.sql;
    expect(cas).toContain("status = 'DISABLED'");
    expect(cas).toContain("disabled_at = now()");
    expect(cas).toMatch(/WHERE id = \?::uuid AND status = 'ACTIVE'/);
    expect(f.appels[4]!.sql).toContain("end_reason = 'DISABLED'");
    expect(f.appels[4]!.sql).toContain("ended_at IS NULL");
  });

  it("⛔ le DERNIER Manager actif : `lastManager`, trois lectures et AUCUNE écriture ni audit ; la transaction se referme sans effet", async () => {
    const f = faux([[{ id: SALLE }], [MANAGER_CIBLE], [{ n: 1 }]]);
    expect(await f.store.disableMember(entree)).toEqual({ ok: false, reason: "lastManager" });
    expect(f.appels).toHaveLength(3);
    expect(f.audits).toHaveLength(0);
  });

  it("un EMPLOYÉ se désactive même quand il n'y a qu'UN Manager (la règle ne vise que les Managers)", async () => {
    const f = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 1 }], [DESACTIVE], 0]);
    expect((await f.store.disableMember(entree)).ok).toBe(true);
  });

  it("⛔ patron de D349 — un membre DÉJÀ désactivé : succès SANS écriture et SANS ligne d'audit (une répétition ne fait pas une seconde trace)", async () => {
    const f = faux([[{ id: SALLE }], [DESACTIVE], [{ n: 2 }]]);
    expect(await f.store.disableMember(entree)).toEqual({ ok: true, member: DESACTIVE, sessionsEnded: 0, alreadyDisabled: true });
    expect(f.appels).toHaveLength(3);
    expect(f.audits).toHaveLength(0);
  });

  it("un membre introuvable DANS CETTE SALLE : `notFound` après les deux verrous, AUCUNE écriture", async () => {
    const f = faux([[{ id: SALLE }], []]);
    expect(await f.store.disableMember(entree)).toEqual({ ok: false, reason: "notFound" });
    expect(f.appels).toHaveLength(2);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ compte = 1 EXIGÉ : si le CAS ne rend aucune ligne (le statut a bougé sous nos pieds — impossible sous verrou, mais l'écrire est une garde), la transaction est ANNULÉE bruyamment, jamais un succès", async () => {
    const f = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 2 }], []]);
    await expect(f.store.disableMember(entree)).rejects.toThrow();
    expect(f.issues).toEqual(["annulée"]);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ R-6 — l'audit dans la transaction, MANAGER pour acteur, rôle du membre et nombre de sessions pour charge utile ; un échec de l'audit ANNULE la désactivation", async () => {
    const f = faux([[{ id: SALLE }], [MANAGER_CIBLE], [{ n: 2 }], [{ ...DESACTIVE, role: "MANAGER" }], 4]);
    await f.store.disableMember(entree);
    expect(f.audits[0]!.data).toEqual({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MANAGER_ACTEUR, action: "staff.member_disable", entityType: "staff_member", entityId: CIBLE, after: { role: "MANAGER", sessionsEnded: 4 } });
    const g = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 2 }], [DESACTIVE], 0]);
    g.client.auditLog.create.mockRejectedValueOnce(new Error("audit refusé"));
    await expect(g.store.disableMember(entree)).rejects.toThrow("audit refusé");
    expect(g.issues).toEqual(["annulée"]);
  });

  it("⛔ rang 58 (K-22) — la désactivation EFFACE le PIN dans le MÊME UPDATE que le statut (les cinq colonnes `pin_*`) : un membre éteint ne garde aucun haché de PIN", async () => {
    const f = faux([[{ id: SALLE }], [LIGNE_LISTE], [{ n: 2 }], [DESACTIVE], 0]);
    await f.store.disableMember(entree);
    const cas = f.appels[3]!.sql;
    for (const colonne of ["pin_hash = NULL", "pin_generated_at = NULL", "pin_expires_at = NULL", "pin_failed_count = 0", "pin_locked_at = NULL"]) expect(cas, colonne).toContain(colonne);
  });
});

// ══ RANG 58, L36-3b (D356) — le PIN dans l'adaptateur : la RÉSERVATION atomique, l'ÉCHEC et le VERROU, l'OUVERTURE par PIN, la recherche d'un membre ════════════════════════════════════════════════════════════
// ⛔ Ce spec mesure ce que l'intégration ne dit pas aussi vite : que la réservation d'un essai est UNE instruction (jamais lire puis écrire : vingt requêtes parallèles feraient vingt vérifications), qu'elle porte
// TOUTES ses conditions (le verrou de ligne, le plafond, le verrou du PIN, l'échéance, l'APPAREIL vivant — la condition de MP-2), que le verrou ne se pose qu'au plafond ET sur CE PIN, que l'ouverture porte ses
// quatre conditions dans le CAS (R-3) et que le refus de l'appareil ANNULE la transaction. La base réelle tranche les comportements dans `test/int/staff-pin*.int-spec.ts`.
const HACHE_LU = "PIN-HASH-LU";
const HACHES_D_APPAREIL = ["sha-appareil-1", "sha-appareil-2"];

describe("findMemberById — K-23 : le membre par son identifiant, DANS la salle du Bearer, avec l'heure de la base, sans aucun secret", () => {
  it("UNE lecture ; l'identifiant ET la salle sont des paramètres (jamais un texte concaténé) ; le statut, l'échéance du mot de passe et `now()` de la BASE sont rendus ; ni haché de mot de passe, ni haché de PIN n'est sélectionné", async () => {
    const ligne = { id: MEMBRE, accountName: "Amine", role: "MANAGER", status: "ACTIVE", mustChangePassword: false, passwordExpiresAt: new Date("2027-01-01T00:00:00Z"), now: new Date("2026-11-19T10:00:00Z") };
    const f = faux([[ligne]]);
    expect(await f.store.findMemberById(SALLE, MEMBRE)).toEqual(ligne);
    expect(f.appels).toHaveLength(1);
    const a = f.appels[0]!;
    expect(a.type).toBe("query");
    expect(a.sql).toContain("FROM pro_staff_members");
    expect(a.sql).toMatch(/WHERE id = \?::uuid AND pro_profile_id = \?::uuid/);
    expect(a.valeurs).toEqual([MEMBRE, SALLE]);
    expect(a.sql).toContain('now() AS "now"');
    expect(a.sql).toContain('password_expires_at AS "passwordExpiresAt"');
    expect(a.sql).not.toContain("password_hash");
    expect(a.sql).not.toContain("pin_hash");
    expect(a.sql).not.toMatch(/FOR UPDATE/);
  });

  it("aucun membre ⇒ null", async () => {
    expect(await faux([[]]).store.findMemberById(SALLE, MEMBRE)).toBeNull();
  });
});

describe("reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérification", () => {
  const entree = { proProfileId: SALLE, memberId: MEMBRE, deviceTokenHashes: HACHES_D_APPAREIL };

  it("⛔ UNE seule instruction (un `WITH … FOR UPDATE` puis `UPDATE … RETURNING`) : jamais lire puis écrire — le compteur est incrémenté DANS la réservation, avant toute vérification du PIN", async () => {
    const f = faux([[{ pinHash: HACHE_LU, failedCount: 1 }]]);
    expect(await f.store.reservePinAttempt(entree)).toEqual({ reserved: true, pinHash: HACHE_LU, failedCount: 1 });
    expect(f.appels).toHaveLength(1);
    const sql = f.appels[0]!.sql;
    expect(sql).toMatch(/^WITH cur AS \(/);
    expect(sql).toContain("FOR UPDATE OF m");
    expect(sql).toContain("UPDATE pro_staff_members m SET pin_failed_count = m.pin_failed_count + 1");
    expect(sql).toMatch(/RETURNING m\.pin_hash AS "pinHash", m\.pin_failed_count AS "failedCount"/);
  });

  it("⛔ le PLAFOND est un PARAMÈTRE du levier (`pin_failed_count < ?`), jamais un 3 écrit : les vingt requêtes parallèles ne passent pas le plafond", async () => {
    const f = faux([[{ pinHash: HACHE_LU, failedCount: 1 }]]);
    await f.store.reservePinAttempt(entree);
    const a = f.appels[0]!;
    expect(a.sql).toMatch(/m\.pin_failed_count < \?::int/);
    expect(a.valeurs).toContain(STAFF_LIMITS.PIN_MAX_FAILURES);
    expect(a.sql).not.toMatch(/pin_failed_count < \d/);
  });

  it("⛔ toutes les conditions sont DANS la même instruction : le membre de CETTE salle, ACTIF, un PIN, non expiré (heure de la base), non verrouillé, sous le plafond", async () => {
    const f = faux([[]]);
    await f.store.reservePinAttempt(entree);
    const sql = f.appels[0]!.sql;
    for (const condition of [
      "m.id = ?::uuid",
      "m.pro_profile_id = ?::uuid",
      "m.status = 'ACTIVE'",
      "m.pin_hash IS NOT NULL",
      "m.pin_expires_at > now()",
      "m.pin_locked_at IS NULL"
    ]) {
      expect(sql, condition).toContain(condition);
    }
  });

  it("⛔ MP-2 — la condition de l'APPAREIL est dans la réservation : un appareil de CE membre, présenté (par le HACHAGE du cookie), ni révoqué ni expiré (heure de la base) — sinon aucun essai n'est compté", async () => {
    const f = faux([[]]);
    await f.store.reservePinAttempt(entree);
    const a = f.appels[0]!;
    expect(a.sql).toContain("EXISTS (SELECT 1 FROM pro_staff_devices d");
    expect(a.sql).toContain("d.member_id = m.id");
    expect(a.sql).toMatch(/d\.token_hash = ANY\(\?::text\[\]\)/);
    expect(a.sql).toContain("d.revoked_at IS NULL");
    expect(a.sql).toContain("d.expires_at > now()");
    expect(a.valeurs).toContainEqual(HACHES_D_APPAREIL);
  });

  it("les paramètres sont l'identifiant du membre et la salle du Bearer (jamais un texte concaténé), dans l'ordre du texte", async () => {
    const f = faux([[]]);
    await f.store.reservePinAttempt(entree);
    expect(f.appels[0]!.valeurs).toEqual([MEMBRE, SALLE, STAFF_LIMITS.PIN_MAX_FAILURES, HACHES_D_APPAREIL]);
  });

  it("⛔ aucune ligne rendue ⇒ `reserved: false` (essais épuisés, PIN verrouillé, expiré ou absent, appareil non reconnu : le service ne distingue pas)", async () => {
    expect(await faux([[]]).store.reservePinAttempt(entree)).toEqual({ reserved: false });
  });

  it("aucune écriture hors de l'instruction : ni audit, ni transaction (un essai refusé n'écrit rien)", async () => {
    const f = faux([[]]);
    await f.store.reservePinAttempt(entree);
    expect(f.audits).toHaveLength(0);
    expect(f.client.$transaction).not.toHaveBeenCalled();
  });
});

describe("recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre", () => {
  const base = { actor: acteur, memberId: MEMBRE, expectedPinHash: HACHE_LU };

  it("⛔ SOUS le plafond (1 ou 2) : UNE ligne `staff.pin_login_failed` avec le compte, AUCUNE instruction SQL — ni verrou, ni fin de session", async () => {
    for (const compte of [1, STAFF_LIMITS.PIN_MAX_FAILURES - 1]) {
      const f = faux();
      expect(await f.store.recordPinFailure({ ...base, failedCount: compte })).toEqual({ locked: false, sessionsEnded: 0 });
      expect(f.appels, `compte ${compte}`).toHaveLength(0);
      expect(f.audits.map((a) => a.data.action)).toEqual(["staff.pin_login_failed"]);
      expect(f.audits[0]!.data).toMatchObject({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MEMBRE, entityType: "staff_member", entityId: MEMBRE, after: { failedCount: compte } });
    }
  });

  it("⛔ AU plafond : la ligne d'échec, puis le VERROU posé SOUS CONDITION (le PIN lu, non déjà verrouillé, le compte au plafond — le plafond est un paramètre), puis les sessions du membre terminées `PIN_LOCKED`, puis la ligne `staff.pin_lock`", async () => {
    const f = faux([1, 2]);
    const compte = STAFF_LIMITS.PIN_MAX_FAILURES;
    expect(await f.store.recordPinFailure({ ...base, failedCount: compte })).toEqual({ locked: true, sessionsEnded: 2 });
    expect(f.appels.map((a) => a.type)).toEqual(["execute", "execute"]);
    const verrou = f.appels[0]!;
    expect(verrou.sql).toMatch(/^UPDATE pro_staff_members SET pin_locked_at = now\(\)/);
    expect(verrou.sql).toContain("WHERE id = ?::uuid AND pin_hash = ? AND pin_locked_at IS NULL AND pin_failed_count >= ?::int");
    expect(verrou.valeurs).toEqual([MEMBRE, HACHE_LU, STAFF_LIMITS.PIN_MAX_FAILURES]);
    const fins = f.appels[1]!;
    expect(fins.sql).toContain("SET ended_at = now(), end_reason = 'PIN_LOCKED'");
    expect(fins.sql).toContain("WHERE member_id = ?::uuid AND ended_at IS NULL");
    expect(fins.valeurs).toEqual([MEMBRE]);
    expect(f.audits.map((a) => a.data.action)).toEqual(["staff.pin_login_failed", "staff.pin_lock"]);
    expect(f.audits[1]!.data).toMatchObject({ actorMemberId: MEMBRE, entityType: "staff_member", entityId: MEMBRE, after: { failedCount: compte, sessionsEnded: 2 } });
  });

  it("⛔ le verrou posé par un AUTRE (compte 0 ligne : déjà verrouillé, ou le PIN a été remplacé entre-temps) : AUCUNE fin de session, AUCUNE ligne de verrouillage — on ne verrouille pas le PIN NEUF", async () => {
    const f = faux([0]);
    expect(await f.store.recordPinFailure({ ...base, failedCount: STAFF_LIMITS.PIN_MAX_FAILURES })).toEqual({ locked: false, sessionsEnded: 0 });
    expect(f.appels).toHaveLength(1);
    expect(f.audits.map((a) => a.data.action)).toEqual(["staff.pin_login_failed"]);
  });

  it("tout est dans UNE transaction : la ligne d'échec, le verrou, les fins de session et la ligne de verrouillage se valident ou s'annulent ENSEMBLE", async () => {
    const f = faux([1, 0]);
    await f.store.recordPinFailure({ ...base, failedCount: STAFF_LIMITS.PIN_MAX_FAILURES });
    expect(f.client.$transaction).toHaveBeenCalledTimes(1);
    expect(f.issues).toEqual(["validée"]);
  });
});

describe("openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions de R-3 DANS le CAS", () => {
  const entree = { actor: acteur, proProfileId: SALLE, memberId: MEMBRE, expectedPinHash: HACHE_LU, sessionTokenHash: "sha-session", candidateDeviceHashes: HACHES_D_APPAREIL };
  // Le CAS rend les QUATRE champs du membre (la forme de `StaffMemberView`), rien de plus : ni haché, ni compteur.
  const LIGNE_PIN = LIGNE_MEMBRE;

  it("⛔ R-3 — le CAS du membre porte : sa salle, `status = 'ACTIVE'`, le haché de PIN LU à la réservation, `pin_locked_at IS NULL`, l'échéance du PIN contre `now()` ; il remet le compteur à zéro et écrit `last_login_at` — et il ne touche à AUCUNE colonne du mot de passe", async () => {
    const f = faux([[LIGNE_PIN], [{ id: "d1" }], 1, [{ id: "s1" }]]);
    await f.store.openSessionByPin(entree);
    const cas = f.appels[0]!;
    expect(cas.type).toBe("query");
    expect(cas.sql).toMatch(/^UPDATE pro_staff_members SET last_login_at = now\(\), pin_failed_count = 0/);
    for (const condition of ["WHERE id = ?::uuid", "pro_profile_id = ?::uuid", "status = 'ACTIVE'", "pin_hash = ?", "pin_locked_at IS NULL", "pin_expires_at > now()"]) {
      expect(cas.sql, condition).toContain(condition);
    }
    expect(cas.valeurs).toEqual([MEMBRE, SALLE, HACHE_LU]);
    expect(cas.sql).not.toContain("password_");
  });

  it("⛔ le CAS ne trouve rien (PIN remplacé, verrou posé, membre désactivé, PIN expiré) : `memberChanged`, AUCUNE autre instruction, aucune ligne d'audit", async () => {
    const f = faux([[]]);
    expect(await f.store.openSessionByPin(entree)).toEqual({ ok: false, reason: "memberChanged" });
    expect(f.appels).toHaveLength(1);
    expect(f.audits).toHaveLength(0);
  });

  it("⛔ L'APPAREIL se re-vérifie SOUS VERROU (`FOR UPDATE`, L3) : CE membre, un cookie présenté, ni révoqué ni expiré — et son `last_used_at` est écrit", async () => {
    const f = faux([[LIGNE_PIN], [{ id: "d1" }], 1, [{ id: "s1" }]]);
    await f.store.openSessionByPin(entree);
    const appareil = f.appels[1]!;
    expect(appareil.type).toBe("query");
    expect(appareil.sql).toContain("FROM pro_staff_devices d");
    expect(appareil.sql).toMatch(/d\.member_id = \?::uuid AND d\.token_hash = ANY\(\?::text\[\]\)/);
    expect(appareil.sql).toContain("d.revoked_at IS NULL");
    expect(appareil.sql).toContain("d.expires_at > now()");
    expect(appareil.sql).toMatch(/FOR UPDATE$/);
    expect(appareil.valeurs).toEqual([MEMBRE, HACHES_D_APPAREIL]);
    const touche = f.appels[2]!;
    expect(touche.type).toBe("execute");
    expect(touche.sql).toContain("UPDATE pro_staff_devices SET last_used_at = now()");
  });

  it("⛔ l'appareil a disparu entre le CAS et la re-vérification : la transaction est ANNULÉE (le CAS du membre aussi : `last_login_at` et le compteur ne restent pas écrits) — `memberChanged`, aucune session, aucune ligne d'audit", async () => {
    const f = faux([[LIGNE_PIN], []]);
    expect(await f.store.openSessionByPin(entree)).toEqual({ ok: false, reason: "memberChanged" });
    expect(f.issues, "la transaction est annulée, pas validée").toEqual(["annulée"]);
    expect(f.appels).toHaveLength(2);
    expect(f.audits).toHaveLength(0);
  });

  it("la session naît DANS la transaction, rattachée à l'appareil retrouvé, pour la durée du plafond (paramètre du levier, jamais un littéral) ; UNE ligne `staff.pin_login` pour CE membre, l'entité est la session", async () => {
    const f = faux([[LIGNE_PIN], [{ id: "d1" }], 1, [{ id: "s1" }]]);
    const r = await f.store.openSessionByPin(entree);
    expect(r).toEqual({ ok: true, member: LIGNE_MEMBRE, sessionId: "s1" });
    const insertion = f.appels[3]!;
    expect(insertion.sql).toContain("INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at)");
    expect(insertion.sql).toContain("make_interval(hours => ?::int)");
    expect(insertion.valeurs).toEqual([MEMBRE, "d1", "sha-session", STAFF_LIMITS.SESSION_MAX_HOURS]);
    expect(f.audits).toHaveLength(1);
    expect(f.audits[0]!.data).toMatchObject({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MEMBRE, action: "staff.pin_login", entityType: "staff_session", entityId: "s1", after: { memberId: MEMBRE } });
    expect(f.issues).toEqual(["validée"]);
  });
});

// ══ RANG 58, L36-3b (D356) — l'ÉMISSION du PIN par le mot de passe : la connexion (K-15) et le changement de mot de passe (K-18) ═════════════════════════════════════
// ⛔ UNE règle, `etatDuPin`, appliquée SOUS le verrou que le CAS du membre (ou le `FOR UPDATE` du changement) vient de prendre : un PIN VALABLE n'est ni remplacé ni rendu ; absent, expiré ou verrouillé, le haché
// CANDIDAT est installé. Le DÉBLOCAGE d'un PIN verrouillé est une action de DR5 : sa ligne `staff.pin_unlock` s'écrit dans la MÊME transaction, avant la ligne de la connexion ; l'ÉMISSION elle-même n'écrit AUCUNE ligne
// (réponse de Ko, 1 d : aucune action au-delà de la liste de DR5). Les cinq états viennent de constantes déclarées en tête de fichier, jamais d'une règle recopiée ici.
describe("l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux", () => {
  const entreeConnexion = {
    actor: acteur,
    proProfileId: SALLE,
    memberId: MEMBRE,
    sessionTokenHash: "hs",
    candidateDeviceHashes: [] as string[],
    newDeviceTokenHash: "hd",
    deviceLabel: "Poste",
    expectedPasswordHash: "HASH-LU",
    newPinHash: "PIN-CANDIDAT"
  };
  const entreeChangement = { actor: acteur, memberId: MEMBRE, currentSessionId: "s1", expectedPasswordHash: "H-LU", newPasswordHash: "H-NEUF", newPinHash: "PIN-CANDIDAT" };

  for (const [nom, ligne] of [
    ["ABSENT", LIGNE_PIN_ABSENT],
    ["EXPIRÉ", LIGNE_PIN_EXPIRE]
  ] as const) {
    it(`⛔ connexion : un PIN ${nom} est ÉMIS — le haché candidat s'installe sous le verrou (échéance par le levier, compteur à zéro, verrou levé), SANS ligne de déblocage ni ligne d'émission, et le résultat le dit`, async () => {
      const f = faux([[ligne], 1, [{ id: "dn" }], [{ id: "s1" }]]);
      expect(await f.store.openSession(entreeConnexion)).toEqual({ ok: true, member: LIGNE_MEMBRE, sessionId: "s1", deviceReused: false, pinIssued: true });
      const emission = f.appels[1]!;
      expect(emission.type).toBe("execute");
      expect(emission.sql).toMatch(/^UPDATE pro_staff_members SET pin_hash = \?, pin_generated_at = now\(\), pin_expires_at = now\(\) \+ make_interval\(days => \?::int\),/);
      expect(emission.sql).toContain("pin_failed_count = 0, pin_locked_at = NULL");
      expect(emission.sql).toMatch(/WHERE id = \?::uuid$/);
      expect(emission.valeurs).toEqual(["PIN-CANDIDAT", STAFF_LIMITS.PIN_VALIDITY_DAYS, MEMBRE]);
      expect(f.audits.map((a) => a.data.action)).toEqual(["staff.login"]);
    });
  }

  for (const [nom, ligne] of [
    ["VERROUILLÉ (le verrou est posé)", LIGNE_PIN_VERROUILLE],
    ["au PLAFOND d'échecs, verrou pas encore posé", LIGNE_PIN_AU_PLAFOND]
  ] as const) {
    it(`⛔ connexion : un PIN ${nom} est DÉBLOQUÉ par le mot de passe — un PIN neuf s'installe, et la ligne \`staff.pin_unlock\` (via: password) s'écrit AVANT la ligne de la connexion, dans la même transaction, sans le haché`, async () => {
      const f = faux([[ligne], 1, [{ id: "dn" }], [{ id: "s1" }]]);
      expect(await f.store.openSession(entreeConnexion)).toMatchObject({ ok: true, pinIssued: true });
      expect(f.audits.map((a) => a.data.action)).toEqual(["staff.pin_unlock", "staff.login"]);
      expect(f.audits[0]!.data).toMatchObject({ actorId: UTILISATEUR, actorRole: "PRO", actorMemberId: MEMBRE, entityType: "staff_member", entityId: MEMBRE });
      expect(f.audits[0]!.data.after).toEqual({ via: "password" });
      expect(JSON.stringify(f.audits.map((a) => a.data))).not.toContain("PIN-CANDIDAT");
      expect(f.issues).toEqual(["validée"]);
    });
  }

  it("⛔ connexion : un PIN VALABLE n'est NI remplacé NI rendu — aucune écriture sur ses colonnes, `pinIssued: false`, une seule ligne d'audit", async () => {
    const f = faux([[LIGNE_PIN_VALABLE], [{ id: "dn" }], [{ id: "s1" }]]);
    expect(await f.store.openSession(entreeConnexion)).toMatchObject({ ok: true, pinIssued: false });
    expect(f.appels.some((a) => /SET pin_hash =/.test(a.sql))).toBe(false);
    expect(f.audits.map((a) => a.data.action)).toEqual(["staff.login"]);
  });

  it("⛔ connexion — l'échéance d'un appareil NEUF ne dépasse jamais celle du PIN : `LEAST(durée de l'appareil, échéance du PIN lue sur le membre)`, lue APRÈS l'émission, dans la même transaction", async () => {
    const f = faux([[LIGNE_PIN_ABSENT], 1, [{ id: "dn" }], [{ id: "s1" }]]);
    await f.store.openSession(entreeConnexion);
    const appareil = f.appels.find((a) => /^INSERT INTO pro_staff_devices/.test(a.sql))!;
    expect(appareil.sql).toContain("LEAST(now() + make_interval(days => ?::int), (SELECT pin_expires_at FROM pro_staff_members WHERE id = ?::uuid))");
    expect(appareil.valeurs).toEqual([MEMBRE, "hd", "Poste", STAFF_LIMITS.PIN_VALIDITY_DAYS, MEMBRE]);
    const rangEmission = f.appels.findIndex((a) => /SET pin_hash =/.test(a.sql));
    const rangAppareil = f.appels.findIndex((a) => /^INSERT INTO pro_staff_devices/.test(a.sql));
    expect(rangEmission).toBeGreaterThanOrEqual(0);
    expect(rangAppareil).toBeGreaterThan(rangEmission);
  });

  it("⛔ connexion — l'émission refusée par la base (compte ≠ 1) ANNULE la transaction : aucune session, aucune ligne d'audit", async () => {
    const f = faux([[LIGNE_PIN_ABSENT], 0]);
    await expect(f.store.openSession(entreeConnexion)).rejects.toThrow(/compte = 1 exigé/);
    expect(f.issues).toEqual(["annulée"]);
    expect(f.audits).toHaveLength(0);
  });

  for (const [nom, ligne] of [
    ["ABSENT", PIN_ABSENT],
    ["EXPIRÉ", PIN_EXPIRE]
  ] as const) {
    it(`⛔ changement de mot de passe : un PIN ${nom} est ÉMIS par la MÊME règle — après le remplacement du hachage, AVANT la fin des autres sessions ; aucune ligne d'émission`, async () => {
      const f = faux([[ligne], [LIGNE_MEMBRE], 1, 0]);
      expect(await f.store.changePassword(entreeChangement)).toEqual({ ok: true, member: LIGNE_MEMBRE, otherSessionsEnded: 0, pinIssued: true });
      expect(f.appels[0]!.sql).toMatch(/FOR UPDATE$/);
      expect(f.appels[1]!.sql).toMatch(/^UPDATE pro_staff_members SET password_hash =/);
      expect(f.appels[2]!.sql).toMatch(/^UPDATE pro_staff_members SET pin_hash = \?, pin_generated_at = now\(\)/);
      expect(f.appels[2]!.valeurs).toEqual(["PIN-CANDIDAT", STAFF_LIMITS.PIN_VALIDITY_DAYS, MEMBRE]);
      expect(f.appels[3]!.sql).toMatch(/^UPDATE pro_staff_sessions SET ended_at = now\(\), end_reason = 'PASSWORD_CHANGED'/);
      expect(f.audits.map((a) => a.data.action)).toEqual(["staff.password_change"]);
    });
  }

  it("⛔ changement de mot de passe : un PIN VERROUILLÉ est DÉBLOQUÉ — la ligne `staff.pin_unlock` (via: password) précède la ligne du changement, sans le haché", async () => {
    const f = faux([[PIN_VERROUILLE], [LIGNE_MEMBRE], 1, 2]);
    expect(await f.store.changePassword(entreeChangement)).toMatchObject({ ok: true, pinIssued: true, otherSessionsEnded: 2 });
    expect(f.audits.map((a) => a.data.action)).toEqual(["staff.pin_unlock", "staff.password_change"]);
    expect(f.audits[0]!.data.after).toEqual({ via: "password" });
    expect(JSON.stringify(f.audits.map((a) => a.data))).not.toContain("PIN-CANDIDAT");
  });

  it("⛔ changement de mot de passe : un PIN VALABLE n'est NI remplacé NI rendu — trois instructions seulement, `pinIssued: false`", async () => {
    const f = faux([[PIN_VALABLE], [LIGNE_MEMBRE], 0]);
    expect(await f.store.changePassword(entreeChangement)).toMatchObject({ ok: true, pinIssued: false });
    expect(f.appels).toHaveLength(3);
    expect(f.appels.some((a) => /SET pin_hash =/.test(a.sql))).toBe(false);
  });

  it("⛔ changement de mot de passe — l'émission refusée par la base (compte ≠ 1) ANNULE la transaction : ni fin de session, ni ligne d'audit", async () => {
    const f = faux([[PIN_ABSENT], [LIGNE_MEMBRE], 0]);
    await expect(f.store.changePassword(entreeChangement)).rejects.toThrow(/compte = 1 exigé/);
    expect(f.issues).toEqual(["annulée"]);
    expect(f.audits).toHaveLength(0);
  });
});
