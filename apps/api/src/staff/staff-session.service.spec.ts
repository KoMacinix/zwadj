// Le SERVICE de la couche du personnel — rang 44, L36-3a-1 (D341). Joué avec des doubles du port (`satisfies`, D258) : la base n'est pas là, et argon2 non plus (D271 : le hachage réel vit en `test:int`).
// Ce que ce spec mesure : l'ORDRE des appels, le NOMBRE de vérifications de mot de passe (réelle / factice) — par ESPION, jamais par chronomètre (D290) —, l'identité à l'octet des refus,
// et ce que le service demande au magasin.
//
// ⛔ MP-8 / MP-17 / R-3 (D341) : un compte inconnu, un membre désactivé, une pause et un mauvais mot de passe rendent LE MÊME corps et paient UN argon2. Le VRAI hachage n'est vérifié que quand
// la tentative a été RÉSERVÉE par le magasin.
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { passwordSchema, StaffErrorCode, STAFF_DEVICE_DEFAULT_LABEL, type StaffLoginInput } from "@zwadj/types";
import { STAFF_COMMON_PASSWORDS } from "./staff-common-passwords";
import { StaffSessionService } from "./staff-session.service";
import type { StaffStore } from "./staff-store.types";

const SALLE = "018f0000-0000-7000-8000-0000000000b1";
const UTILISATEUR = "018f0000-0000-7000-8000-0000000000c1";
const user = { userId: UTILISATEUR, role: "PRO" } as const;
const MEMBRE = { id: "m1", accountName: "Amine", role: "MANAGER", mustChangePassword: false } as const;
// Le membre TEL QUE LE MAGASIN LE RETROUVE : son état, l'échéance de son mot de passe et l'HEURE DE LA BASE (S-101, S-241) — `etatDuCompte` n'a pas d'autre horloge.
const HEURE_BASE = new Date("2026-11-19T10:00:00.000Z");
const ACTIF = { ...MEMBRE, status: "ACTIVE", passwordExpiresAt: new Date("2027-01-01T00:00:00.000Z"), now: HEURE_BASE } as const;
const ms = (n: number): Date => new Date(HEURE_BASE.getTime() + n);
const staff = { sessionId: "s1", memberId: "m1", role: "MANAGER", accountName: "Amine", mustChangePassword: false, proProfileId: SALLE } as const;

function monde(surcharge: Partial<StaffStore> = {}, hachage: { verify?: (hash: string, clair: string) => boolean } = {}) {
  let n = 0;
  const jeton = () => `jeton-${String((n += 1)).padStart(36, "0")}`; // 42 + ... : une forme de jeton déterministe
  const defauts = {
    readLayer: vi.fn(async () => ({ proProfileId: SALLE, enabledAt: new Date("2026-11-01T10:00:00Z") })),
    activate: vi.fn<StaffStore["activate"]>(async () => ({ ok: true as const, member: MEMBRE, sessionId: "s1" })),
    findMember: vi.fn(async () => ACTIF),
    reservePasswordAttempt: vi.fn(async () => ({ reserved: true as const, passwordHash: "HASH-ACTUEL", failedCount: 1, pausedNow: false })),
    recordPasswordFailure: vi.fn(async () => undefined),
    resetPasswordAttempts: vi.fn(async () => undefined),
    openSession: vi.fn<StaffStore["openSession"]>(async () => ({ ok: true as const, member: MEMBRE, sessionId: "s1", deviceReused: false })),
    touchSession: vi.fn(async () => ({ ok: false as const })),
    peekSession: vi.fn(async () => ({ ok: false as const })),
    closeSession: vi.fn(async () => undefined),
    changePassword: vi.fn<StaffStore["changePassword"]>(async () => ({ ok: true as const, member: MEMBRE, otherSessionsEnded: 2 })),
    listKnownMembers: vi.fn(async () => []),
    // Rang 56 (D354) : les quatre méthodes de gestion du personnel — le service de SESSION n'en appelle aucune ; le double doit seulement satisfaire le port.
    listMembers: vi.fn(async () => []),
    createMember: vi.fn<StaffStore["createMember"]>(async () => ({ ok: false as const, reason: "accountNameTaken" as const })),
    resetMemberPassword: vi.fn<StaffStore["resetMemberPassword"]>(async () => ({ ok: false as const, reason: "notFound" as const })),
    disableMember: vi.fn<StaffStore["disableMember"]>(async () => ({ ok: false as const, reason: "notFound" as const }))
  };
  // `satisfies` vérifie le double fusionné contre le port ; l'objet rendu garde les TYPES des espions par défaut (`.mock.calls` typé) — une union avec `Partial<StaffStore>` les aurait perdus.
  const magasin = { ...defauts, ...surcharge } satisfies StaffStore;
  const mots = {
    hash: vi.fn(async (clair: string) => `HACHE(${clair})`),
    verify: vi.fn(async (hash: string, clair: string) => hachage.verify?.(hash, clair) ?? false),
    verifyAgainstDummy: vi.fn(async (): Promise<false> => false)
  };
  const jetons = { generate: vi.fn(jeton), hash: vi.fn((t: string) => `sha(${t})`) };
  return { service: new StaffSessionService(magasin, mots, jetons), magasin: magasin as typeof defauts, mots, jetons };
}

const CORPS_CONNEXION: StaffLoginInput = { accountName: "Amine", password: "Motdepasse1" };
const SANS_COOKIE = { session: undefined, devices: [] } as const;

async function corpsDuRefus(promesse: Promise<unknown>): Promise<{ status: number; corps: unknown }> {
  try {
    await promesse;
  } catch (e) {
    const h = e as { getStatus(): number; getResponse(): unknown };
    return { status: h.getStatus(), corps: h.getResponse() };
  }
  // Un refus attendu qui n'arrive pas est un ÉCHEC D'ASSERTION (`expect.fail`), pas une `Error` quelconque : sous une mutation du code, c'est ce qui rougit, et la campagne de neutralisation ne sait lire
  // comme une morsure qu'une assertion (R1, D304/D305).
  return expect.fail("un refus était attendu");
}

describe("login — la connexion par nom de compte et mot de passe (K-15)", () => {
  it("⛔ MP-8 — un mot de passe juste : UN seul hachage réel, AUCUN factice ; le membre est rendu, une session s'ouvre, le jeton de session est posé", async () => {
    const m = monde({}, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    expect(m.mots.verify).toHaveBeenCalledTimes(1);
    expect(m.mots.verify).toHaveBeenCalledWith("HASH-ACTUEL", "Motdepasse1");
    expect(m.mots.verifyAgainstDummy).not.toHaveBeenCalled();
    expect(r.body).toEqual({ member: MEMBRE });
    expect(r.cookies.session).toBeTypeOf("string");
    expect(m.magasin.openSession).toHaveBeenCalledTimes(1);
  });

  it("la recherche du membre se fait par la CLÉ normalisée du nom, dans la salle du Bearer (jamais par le nom tel que tapé)", async () => {
    const m = monde({}, { verify: () => true });
    await m.service.login(user, { accountName: "  ÉMILIE  ", password: "Motdepasse1" }, SANS_COOKIE);
    expect(m.magasin.findMember).toHaveBeenCalledWith(SALLE, "emilie");
  });

  it("⛔ un compte INCONNU : un seul hachage FACTICE, JAMAIS le réel, aucune réservation, aucune ligne d'échec — et le refus est `STAFF_INVALID_CREDENTIALS` (401)", async () => {
    const m = monde({ findMember: vi.fn(async () => null) });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: StaffErrorCode.STAFF_INVALID_CREDENTIALS, message: "staff.errors.invalidCredentials" });
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.mots.verify).not.toHaveBeenCalled();
    expect(m.magasin.reservePasswordAttempt).not.toHaveBeenCalled();
    expect(m.magasin.recordPasswordFailure).not.toHaveBeenCalled();
    expect(m.magasin.openSession).not.toHaveBeenCalled();
  });

  it("un PRO sans profil (aucune salle) est traité comme un compte inconnu : factice, même refus", async () => {
    const m = monde({ readLayer: vi.fn(async () => null) });
    const { status } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.magasin.findMember).not.toHaveBeenCalled();
  });

  it("⛔ un membre DÉSACTIVÉ est un compte inconnu pour la connexion : factice, AUCUNE réservation (on ne compte pas d'échec sur un compte éteint), même refus", async () => {
    const m = monde({ findMember: vi.fn(async () => ({ ...ACTIF, status: "DISABLED" as const })) });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: "STAFF_INVALID_CREDENTIALS", message: "staff.errors.invalidCredentials" });
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.mots.verify).not.toHaveBeenCalled();
    expect(m.magasin.reservePasswordAttempt).not.toHaveBeenCalled();
  });

  it("⛔ MP-8 — un MAUVAIS mot de passe : un seul hachage réel (contre le hachage RENDU par la réservation), l'échec est consigné avec son compte, le refus est le même", async () => {
    const m = monde({}, { verify: () => false });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: "STAFF_INVALID_CREDENTIALS", message: "staff.errors.invalidCredentials" });
    expect(m.mots.verify).toHaveBeenCalledTimes(1);
    expect(m.mots.verifyAgainstDummy).not.toHaveBeenCalled();
    expect(m.magasin.recordPasswordFailure).toHaveBeenCalledWith({ actor: user, memberId: "m1", failedCount: 1, pausedNow: false, action: "staff.login_failed" });
    expect(m.magasin.openSession).not.toHaveBeenCalled();
  });

  it("⛔ MP-16 — l'échec qui FRANCHIT le seuil est consigné tel que la réservation le rend : le compte d'échecs ET `pausedNow: true` (c'est ce booléen qui fait écrire la ligne de pause)", async () => {
    const m = monde({ reservePasswordAttempt: vi.fn(async () => ({ reserved: true as const, passwordHash: "HASH-ACTUEL", failedCount: 5, pausedNow: true })) }, { verify: () => false });
    await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(m.magasin.recordPasswordFailure).toHaveBeenCalledWith({ actor: user, memberId: "m1", failedCount: 5, pausedNow: true, action: "staff.login_failed" });
  });

  it("⛔ R-3 (D341) — PENDANT LA PAUSE (réservation refusée) : le FACTICE, JAMAIS le vrai hachage (même avec le bon mot de passe), AUCUN échec consigné — et le MÊME corps que le mauvais mot de passe", async () => {
    const m = monde({ reservePasswordAttempt: vi.fn(async () => ({ reserved: false as const })) }, { verify: () => true });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: "STAFF_INVALID_CREDENTIALS", message: "staff.errors.invalidCredentials" });
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.mots.verify, "le bon mot de passe n'est PAS vérifié pendant la pause").not.toHaveBeenCalled();
    expect(m.magasin.recordPasswordFailure).not.toHaveBeenCalled();
    expect(m.magasin.openSession).not.toHaveBeenCalled();
  });

  it("⛔ MP-8 / R-3 — inconnu, désactivé, en pause et mauvais mot de passe : QUATRE refus au corps IDENTIQUE à l'octet et au statut identique", async () => {
    const cas: Array<[string, Partial<StaffStore>, boolean]> = [
      ["inconnu", { findMember: vi.fn(async () => null) }, false],
      ["désactivé", { findMember: vi.fn(async () => ({ ...ACTIF, status: "DISABLED" as const })) }, false],
      ["en pause", { reservePasswordAttempt: vi.fn(async () => ({ reserved: false as const })) }, true],
      ["mauvais mot de passe", {}, false]
    ];
    const rendus = new Set<string>();
    for (const [, surcharge, verifieOk] of cas) {
      const m = monde(surcharge, { verify: () => verifieOk });
      const r = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
      rendus.add(JSON.stringify(r));
    }
    expect(rendus.size).toBe(1);
  });

  it("⛔ un mot de passe juste mais un membre devenu inactif entre la réservation et l'ouverture (désactivation concurrente) : le MÊME refus, aucune session", async () => {
    const m = monde({ openSession: vi.fn(async () => ({ ok: false as const, reason: "memberInactive" as const })) }, { verify: () => true });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: "STAFF_INVALID_CREDENTIALS", message: "staff.errors.invalidCredentials" });
  });

  it("la clé de la tentative est réservée AVANT toute vérification : l'ordre des appels est findMember, reservePasswordAttempt, verify, openSession", async () => {
    const ordre: string[] = [];
    const m = monde(
      {
        findMember: vi.fn(async () => { ordre.push("findMember"); return ACTIF; }),
        reservePasswordAttempt: vi.fn(async () => { ordre.push("reserve"); return { reserved: true as const, passwordHash: "H", failedCount: 1, pausedNow: false }; }),
        openSession: vi.fn(async () => { ordre.push("openSession"); return { ok: true as const, member: MEMBRE, sessionId: "s1", deviceReused: false }; })
      },
      { verify: () => { ordre.push("verify"); return true; } }
    );
    await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    expect(ordre).toEqual(["findMember", "reserve", "verify", "openSession"]);
  });

  // ── S-104 (R-3, D354) : le mot de passe À CHANGER et le TEMPORAIRE EXPIRÉ ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  it("⛔ S-104 — un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est ADMISE (vrai hachage vérifié, session ouverte), et le membre rendu dit `mustChangePassword: true`", async () => {
    const m = monde({ findMember: vi.fn(async () => ({ ...ACTIF, passwordExpiresAt: ms(-1) })) }, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    expect(m.mots.verify).toHaveBeenCalledTimes(1);
    expect(m.magasin.openSession).toHaveBeenCalledTimes(1);
    expect(r.body.member.mustChangePassword).toBe(true);
  });

  it("⛔ S-104 — un TEMPORAIRE non expiré (must_change_password) : la connexion est admise, et le membre rendu dit `mustChangePassword: true`", async () => {
    const m = monde({ findMember: vi.fn(async () => ({ ...ACTIF, mustChangePassword: true, passwordExpiresAt: ms(7 * 24 * 60 * 60_000) })) }, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    expect(m.magasin.openSession).toHaveBeenCalledTimes(1);
    expect(r.body.member.mustChangePassword).toBe(true);
  });

  it("⛔ S-104 — un mot de passe valable : `mustChangePassword: false` (l'état est jugé, il n'est pas copié de la colonne)", async () => {
    const m = monde({}, { verify: () => true });
    expect((await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE)).body.member.mustChangePassword).toBe(false);
  });

  it("⛔ S-104 — un TEMPORAIRE EXPIRÉ : la connexion est REFUSÉE comme un compte inconnu — le FACTICE, JAMAIS le vrai hachage (même avec le bon mot de passe), AUCUNE réservation (rien à compter), aucune session — et le MÊME corps", async () => {
    const m = monde({ findMember: vi.fn(async () => ({ ...ACTIF, mustChangePassword: true, passwordExpiresAt: ms(0) })) }, { verify: () => true });
    const { status, corps } = await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(status).toBe(401);
    expect(corps).toEqual({ code: StaffErrorCode.STAFF_INVALID_CREDENTIALS, message: "staff.errors.invalidCredentials" });
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.mots.verify).not.toHaveBeenCalled();
    expect(m.magasin.reservePasswordAttempt).not.toHaveBeenCalled();
    expect(m.magasin.recordPasswordFailure).not.toHaveBeenCalled();
    expect(m.magasin.openSession).not.toHaveBeenCalled();
  });

  it("⛔ S-104 — le temporaire expiré rend EXACTEMENT le corps d'un compte inconnu, d'un désactivé et d'un mauvais mot de passe (aucun refus ne dit pourquoi)", async () => {
    const refus = async (surcharge: Partial<StaffStore>, verify: boolean) => JSON.stringify(await corpsDuRefus(monde(surcharge, { verify: () => verify }).service.login(user, CORPS_CONNEXION, SANS_COOKIE)));
    const inconnu = await refus({ findMember: vi.fn(async () => null) }, true);
    const desactive = await refus({ findMember: vi.fn(async () => ({ ...ACTIF, status: "DISABLED" as const })) }, true);
    const faux = await refus({}, false);
    const expire = await refus({ findMember: vi.fn(async () => ({ ...ACTIF, mustChangePassword: true, passwordExpiresAt: ms(-1) })) }, true);
    expect(new Set([inconnu, desactive, faux, expire]).size).toBe(1);
  });

  it("⛔ MP-41 — l'état est jugé à l'HEURE DE LA BASE rendue avec le membre : une échéance future de l'horloge réelle mais passée de la base est expirée", async () => {
    const m = monde({ findMember: vi.fn(async () => ({ ...ACTIF, mustChangePassword: true, passwordExpiresAt: new Date("2099-01-01T00:00:00.000Z"), now: new Date("2099-06-01T00:00:00.000Z") })) }, { verify: () => true });
    await corpsDuRefus(m.service.login(user, CORPS_CONNEXION, SANS_COOKIE));
    expect(m.magasin.openSession).not.toHaveBeenCalled();
  });

  it("l'appareil : sans cookie d'appareil, un jeton neuf est offert (le magasin le crée) et le cookie d'appareil est posé", async () => {
    const m = monde({}, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    expect(r.cookies.device).toBeDefined();
    expect(r.cookies.device!.suffix).toMatch(/^[A-Za-z0-9_-]{8}$/);
    expect(r.cookies.device!.token).toBeTypeOf("string");
    const entree = m.magasin.openSession.mock.calls[0]![0];
    expect(entree.candidateDeviceHashes).toEqual([]);
    expect(entree.deviceLabel).toBe(STAFF_DEVICE_DEFAULT_LABEL);
  });

  it("⛔ MP-3 — les cookies d'appareil présentés sont transmis HACHÉS (jamais en clair), et quand le magasin RÉUTILISE un appareil reconnu, aucun cookie d'appareil neuf n'est posé", async () => {
    const m = monde({ openSession: vi.fn(async () => ({ ok: true as const, member: MEMBRE, sessionId: "s1", deviceReused: true })) }, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, { session: undefined, devices: [{ name: "zwadj_dv_abcd1234", value: "valeur-claire-1" }, { name: "zwadj_dv_wxyz9876", value: "valeur-claire-2" }] });
    const entree = m.magasin.openSession.mock.calls[0]![0];
    expect(entree.candidateDeviceHashes).toEqual(["sha(valeur-claire-1)", "sha(valeur-claire-2)"]);
    // Le double de hachage écrit `sha(<valeur>)` : les formes HACHÉES attendues contiennent donc le mot « valeur-claire ». On les retire, puis la valeur CLAIRE ne doit plus figurer NULLE PART dans ce que reçoit le magasin.
    const sansLesHaches = JSON.stringify(entree).replaceAll("sha(valeur-claire-1)", "").replaceAll("sha(valeur-claire-2)", "");
    expect(sansLesHaches).not.toContain("valeur-claire");
    expect(r.cookies.device).toBeUndefined();
  });

  it("les jetons de session et d'appareil sont transmis HACHÉS, et le jeton de session posé en cookie est le jeton en clair dont le hachage a été donné", async () => {
    const m = monde({}, { verify: () => true });
    const r = await m.service.login(user, CORPS_CONNEXION, SANS_COOKIE);
    const entree = m.magasin.openSession.mock.calls[0]![0];
    expect(entree.sessionTokenHash).toBe(`sha(${r.cookies.session as string})`);
    expect(entree.newDeviceTokenHash).toBe(`sha(${r.cookies.device!.token})`);
    expect(entree.actor).toEqual(user);
    expect(entree.proProfileId).toBe(SALLE);
    expect(entree.memberId).toBe("m1");
  });
});

describe("activate — K-14 : le propriétaire crée le Manager", () => {
  const corps = { accountName: "Émilie B.", password: "Zq7!xvn3-Pk2" };

  it("crée le Manager : hachage du mot de passe, clé normalisée du nom, session ET appareil dans la même demande au magasin, libellé d'appareil constant", async () => {
    const m = monde();
    const r = await m.service.activate(user, corps);
    expect(m.mots.hash).toHaveBeenCalledWith("Zq7!xvn3-Pk2");
    const entree = m.magasin.activate.mock.calls[0]![0];
    expect(entree).toMatchObject({
      actor: user,
      accountName: "Émilie B.",
      accountNameKey: "emilie b.",
      passwordHash: "HACHE(Zq7!xvn3-Pk2)",
      deviceLabel: STAFF_DEVICE_DEFAULT_LABEL
    });
    expect(entree.sessionTokenHash).toBe(`sha(${r.cookies.session as string})`);
    expect(entree.deviceTokenHash).toBe(`sha(${r.cookies.device!.token})`);
    expect(r.body).toEqual({ member: MEMBRE });
  });

  it("⛔ MP-24 — un mot de passe COURANT est refusé (400 `STAFF_PASSWORD_COMMON`) AVANT tout hachage et tout appel au magasin — la valeur est DÉRIVÉE de la liste (une entrée qui passe déjà le schéma), jamais écrite de mémoire", async () => {
    const m = monde();
    const courant = STAFF_COMMON_PASSWORDS.find((p) => passwordSchema.safeParse(p).success);
    expect(courant, "la liste doit contenir une entrée que le schéma laisse passer, sinon ce test ne mesure rien").toBeDefined();
    const { status, corps: c } = await corpsDuRefus(m.service.activate(user, { accountName: "Amine", password: courant! }));
    expect(status).toBe(400);
    expect(c).toEqual({ code: StaffErrorCode.STAFF_PASSWORD_COMMON, message: "staff.errors.passwordCommon" });
    expect(m.mots.hash).not.toHaveBeenCalled();
    expect(m.magasin.activate).not.toHaveBeenCalled();
  });

  it("les quatre refus du magasin sont traduits en erreurs MÉTIER : 409 déjà activée, 403 e-mail non vérifié, 403 `FORBIDDEN` sans profil, 409 nom déjà pris", async () => {
    const cas: Array<[string, "alreadyActivated" | "emailNotVerified" | "profileMissing" | "accountNameTaken", number, string]> = [
      ["déjà activée", "alreadyActivated", 409, "STAFF_ALREADY_ACTIVATED"],
      ["e-mail non vérifié", "emailNotVerified", 403, "STAFF_EMAIL_NOT_VERIFIED"],
      ["sans profil", "profileMissing", 403, "FORBIDDEN"],
      ["nom déjà pris", "accountNameTaken", 409, "STAFF_ACCOUNT_NAME_TAKEN"]
    ];
    for (const [nom, raison, statut, code] of cas) {
      const m = monde({ activate: vi.fn(async () => ({ ok: false as const, reason: raison })) });
      const r = await corpsDuRefus(m.service.activate(user, corps));
      expect(r.status, nom).toBe(statut);
      expect((r.corps as { code: string }).code, nom).toBe(code);
    }
  });

  it("les erreurs sont du bon type Nest (BadRequest / Conflict / Forbidden) : la couche HTTP ne traduit rien d'autre", async () => {
    const m = monde({ activate: vi.fn(async () => ({ ok: false as const, reason: "alreadyActivated" as const })) });
    await expect(m.service.activate(user, corps)).rejects.toBeInstanceOf(ConflictException);
    const m2 = monde({ activate: vi.fn(async () => ({ ok: false as const, reason: "emailNotVerified" as const })) });
    await expect(m2.service.activate(user, corps)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102)", () => {
  const entree = { currentPassword: "Ancien1motdepasse", newPassword: "Zq7!xvn3-Pk2" };

  it("un mot de passe actuel juste : réserve, vérifie le réel, compare à l'actuel pour la réutilisation, hache le nouveau, remplace SOUS la condition du hachage lu, et rend le membre", async () => {
    const m = monde({}, { verify: (hash, clair) => hash === "HASH-ACTUEL" && clair === "Ancien1motdepasse" });
    const r = await m.service.changePassword(user, staff, entree);
    expect(m.magasin.reservePasswordAttempt).toHaveBeenCalledWith("m1");
    expect(m.mots.hash).toHaveBeenCalledWith("Zq7!xvn3-Pk2");
    expect(m.magasin.changePassword).toHaveBeenCalledWith({
      actor: user,
      memberId: "m1",
      currentSessionId: "s1",
      expectedPasswordHash: "HASH-ACTUEL",
      newPasswordHash: "HACHE(Zq7!xvn3-Pk2)"
    });
    expect(r.body).toEqual({ member: MEMBRE });
  });

  it("⛔ MP-5 — la session COURANTE est transmise : le magasin termine les AUTRES, pas celle-ci", async () => {
    // Le vérificateur DISCRIMINE (comme celui du premier cas) : « valide tout contre le hachage courant » ferait aussi passer le NOUVEAU mot de passe pour identique à l'actuel (la réutilisation est un second `verify`).
    const m = monde({}, { verify: (hash, clair) => hash === "HASH-ACTUEL" && clair === "Ancien1motdepasse" });
    await m.service.changePassword(user, staff, entree);
    expect(m.magasin.changePassword.mock.calls[0]![0].currentSessionId).toBe("s1");
  });

  it("⛔ un mot de passe actuel FAUX : 400 `STAFF_CURRENT_PASSWORD_INVALID`, l'échec est consigné et compté, rien n'est remplacé", async () => {
    const m = monde({}, { verify: () => false });
    const { status, corps } = await corpsDuRefus(m.service.changePassword(user, staff, entree));
    expect(status).toBe(400);
    expect(corps).toEqual({ code: StaffErrorCode.STAFF_CURRENT_PASSWORD_INVALID, message: "staff.errors.currentPasswordInvalid" });
    expect(m.magasin.recordPasswordFailure).toHaveBeenCalledWith({ actor: user, memberId: "m1", failedCount: 1, pausedNow: false, action: "staff.password_change_failed" });
    expect(m.magasin.changePassword).not.toHaveBeenCalled();
  });

  it("⛔ PENDANT LA PAUSE : le factice, jamais le vrai hachage, le MÊME refus, aucun échec consigné", async () => {
    const m = monde({ reservePasswordAttempt: vi.fn(async () => ({ reserved: false as const })) }, { verify: () => true });
    const { status, corps } = await corpsDuRefus(m.service.changePassword(user, staff, entree));
    expect(status).toBe(400);
    expect((corps as { code: string }).code).toBe("STAFF_CURRENT_PASSWORD_INVALID");
    expect(m.mots.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(m.mots.verify).not.toHaveBeenCalled();
    expect(m.magasin.recordPasswordFailure).not.toHaveBeenCalled();
  });

  it("⛔ MP-24 — un nouveau mot de passe IDENTIQUE à l'actuel : 400 `STAFF_PASSWORD_REUSED`, le compteur est remis à zéro (le bon mot de passe actuel n'est pas un échec), rien n'est remplacé", async () => {
    const m = monde({}, { verify: () => true });
    const { status, corps } = await corpsDuRefus(m.service.changePassword(user, staff, entree));
    expect(status).toBe(400);
    expect(corps).toEqual({ code: StaffErrorCode.STAFF_PASSWORD_REUSED, message: "staff.errors.passwordReused" });
    expect(m.mots.verify).toHaveBeenCalledTimes(2);
    expect(m.mots.verify).toHaveBeenNthCalledWith(2, "HASH-ACTUEL", "Zq7!xvn3-Pk2");
    expect(m.magasin.resetPasswordAttempts).toHaveBeenCalledWith("m1");
    expect(m.magasin.changePassword).not.toHaveBeenCalled();
  });

  it("⛔ MP-24 — un nouveau mot de passe COURANT est refusé AVANT toute réservation : un refus qui ne dit rien de l'actuel ne consomme pas d'essai", async () => {
    const m = monde();
    const courant = STAFF_COMMON_PASSWORDS.find((p) => passwordSchema.safeParse(p).success)!;
    const { status, corps } = await corpsDuRefus(m.service.changePassword(user, staff, { currentPassword: "Ancien1motdepasse", newPassword: courant }));
    expect(status).toBe(400);
    expect(corps).toEqual({ code: StaffErrorCode.STAFF_PASSWORD_COMMON, message: "staff.errors.passwordCommon" });
    expect(m.magasin.reservePasswordAttempt).not.toHaveBeenCalled();
    expect(m.mots.hash).not.toHaveBeenCalled();
  });

  it("un remplacement qui a perdu une course (le hachage lu n'est plus le courant) : le même refus que le mot de passe actuel faux", async () => {
    const m = monde({ changePassword: vi.fn(async () => ({ ok: false as const, reason: "changedConcurrently" as const })) }, { verify: (hash, clair) => hash === "HASH-ACTUEL" && clair === "Ancien1motdepasse" });
    const { status, corps } = await corpsDuRefus(m.service.changePassword(user, staff, entree));
    expect(status).toBe(400);
    expect((corps as { code: string }).code).toBe("STAFF_CURRENT_PASSWORD_INVALID");
  });
});

describe("logout — K-16", () => {
  it("termine la session COURANTE (celle du contexte posé par le garde) et demande l'effacement du cookie de session ; l'appareil reste", async () => {
    const m = monde();
    const r = await m.service.logout(user, staff);
    expect(m.magasin.closeSession).toHaveBeenCalledWith({ actor: user, sessionId: "s1", memberId: "m1" });
    expect(r.body).toEqual({ status: "ok" });
    expect(r.cookies.session).toBeNull();
    expect(r.cookies.device).toBeUndefined();
  });
});

describe("state — K-17 : exemptée, jamais un refus", () => {
  it("couche éteinte : `enabled: false`, aucun membre, et AUCUNE autre lecture", async () => {
    const m = monde({ readLayer: vi.fn(async () => ({ proProfileId: SALLE, enabledAt: null })) });
    const r = await m.service.state(user, { session: "x".repeat(43), devices: [] });
    expect(r).toEqual({ enabled: false, member: null, knownMembers: [] });
    expect(m.magasin.peekSession).not.toHaveBeenCalled();
    expect(m.magasin.listKnownMembers).not.toHaveBeenCalled();
  });

  it("couche activée, sans cookie de session : `member: null` (jamais un 401), les membres reconnus sur ce poste sont listés par le hachage de leurs cookies d'appareil", async () => {
    const m = monde({ listKnownMembers: vi.fn(async () => [{ id: "m1", accountName: "Amine", role: "MANAGER" as const }]) });
    const r = await m.service.state(user, { session: undefined, devices: [{ name: "zwadj_dv_abcd1234", value: "claire" }] });
    expect(r).toEqual({ enabled: true, member: null, knownMembers: [{ id: "m1", accountName: "Amine", role: "MANAGER" }] });
    expect(m.magasin.listKnownMembers).toHaveBeenCalledWith({ proProfileId: SALLE, deviceTokenHashes: ["sha(claire)"] });
    expect(m.magasin.peekSession).not.toHaveBeenCalled();
  });

  it("⛔ la lecture de l'état ne PROLONGE JAMAIS la session : elle passe par `peekSession` (lecture seule), jamais par `touchSession`", async () => {
    const m = monde({ peekSession: vi.fn(async () => ({ ok: true as const, session: { sessionId: "s1", memberId: "m1", role: "MANAGER" as const, accountName: "Amine", mustChangePassword: false, status: "ACTIVE" as const, passwordExpiresAt: ACTIF.passwordExpiresAt, now: HEURE_BASE } })) });
    const r = await m.service.state(user, { session: "y".repeat(43), devices: [] });
    expect(m.magasin.peekSession).toHaveBeenCalledWith({ tokenHash: `sha(${"y".repeat(43)})`, proProfileId: SALLE });
    expect(m.magasin.touchSession).not.toHaveBeenCalled();
    expect(r.member).toEqual({ id: "m1", accountName: "Amine", role: "MANAGER", mustChangePassword: false });
  });

  it("⛔ S-104 — l'état d'un membre dont le mot de passe est À CHANGER (temporaire, ou ordinaire expiré) dit `mustChangePassword: true` — jugé par `etatDuCompte`, pas copié de la colonne", async () => {
    const session = (surcharge: Record<string, unknown>) => ({ sessionId: "s1", memberId: "m1", role: "MANAGER" as const, accountName: "Amine", mustChangePassword: false, status: "ACTIVE" as const, passwordExpiresAt: ACTIF.passwordExpiresAt, now: HEURE_BASE, ...surcharge });
    const temporaire = monde({ peekSession: vi.fn(async () => ({ ok: true as const, session: session({ mustChangePassword: true, passwordExpiresAt: ms(1) }) })) });
    expect((await temporaire.service.state(user, { session: "y".repeat(43), devices: [] })).member?.mustChangePassword).toBe(true);
    const ordinaireExpire = monde({ peekSession: vi.fn(async () => ({ ok: true as const, session: session({ passwordExpiresAt: ms(0) }) })) });
    expect((await ordinaireExpire.service.state(user, { session: "y".repeat(43), devices: [] })).member?.mustChangePassword).toBe(true);
  });

  it("⛔ S-104 — un TEMPORAIRE EXPIRÉ n'a pas de session : l'état rend `member: null` (comme le garde le refuse), jamais un membre « connecté » qu'aucune route n'acceptera", async () => {
    const m = monde({ peekSession: vi.fn(async () => ({ ok: true as const, session: { sessionId: "s1", memberId: "m1", role: "MANAGER" as const, accountName: "Amine", mustChangePassword: true, status: "ACTIVE" as const, passwordExpiresAt: ms(0), now: HEURE_BASE } })) });
    const r = await m.service.state(user, { session: "y".repeat(43), devices: [] });
    expect(r.enabled).toBe(true);
    expect(r.member).toBeNull();
  });

  it("sans profil : couche éteinte, sans erreur", async () => {
    const m = monde({ readLayer: vi.fn(async () => null) });
    expect(await m.service.state(user, SANS_COOKIE)).toEqual({ enabled: false, member: null, knownMembers: [] });
  });
});
