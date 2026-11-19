// LE SERVICE DU PERSONNEL (K-19 à K-22) — rang 56, L36-3a-2 (D354). Ce que ce fichier mesure, avec des doubles de port (`satisfies`, jamais `as unknown as`, D258) : l'ORCHESTRATION — le mot de passe temporaire est
// GÉNÉRÉ, hacbé, jamais transmis en clair au magasin, rendu UNE fois ; l'état de chaque membre est jugé par `etatDuCompte` avec l'horloge de la BASE (S-101) ; les refus du magasin deviennent des erreurs MÉTIER
// (jamais un 500) ; les identifiants de l'acteur viennent du contexte posé par le garde, jamais du corps de la requête.
// ⚠ Ce qui se joue en SQL (la course, l'audit dans la transaction, les verrous) ne se mesure PAS ici : ce sont les specs d'intégration sur PostgreSQL réel.
// ⚠ UNE ASSERTION NATIVE par cas (D352). Aucune valeur attendue tapée de mémoire : les états viennent de lignes choisies pour LEUR cas ; le mot de passe se juge par le contrat (`passwordSchema`).
import { createHash } from "node:crypto";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { StaffAccountState, StaffErrorCode, StaffRole, StaffStatus, normalizeStaffAccountName, passwordSchema } from "@zwadj/types";
import type { StaffContext } from "./staff-decorators";
import { StaffMembersService } from "./staff-members.service";
import type { MemberListRow, StaffActor, StaffStore } from "./staff-store.types";

const MAINTENANT = new Date("2026-11-19T10:00:00.000Z");
const JOUR = 24 * 60 * 60_000;
/** Un « hachage » qui ne CONTIENT PAS son entrée (le premier double, `HACHE(${clair})`, la contenait : « le clair a atteint le magasin » se déclarait alors vrai pour un code correct). */
const hacher = (clair: string): string => `HACHE-${createHash("sha256").update(clair).digest("hex")}`;
const acteur: StaffActor = { userId: "11111111-1111-4111-8111-111111111111", role: "PRO" };
const staff: StaffContext = {
  sessionId: "22222222-2222-4222-8222-222222222222",
  memberId: "33333333-3333-4333-8333-333333333333",
  role: StaffRole.MANAGER,
  accountName: "Amine",
  mustChangePassword: false,
  proProfileId: "44444444-4444-4444-8444-444444444444"
};

const ligne = (surcharge: Partial<MemberListRow> = {}): MemberListRow => ({
  id: "55555555-5555-4555-8555-555555555555",
  accountName: "Karim",
  role: StaffRole.EMPLOYEE,
  status: StaffStatus.ACTIVE,
  mustChangePassword: false,
  passwordExpiresAt: new Date(MAINTENANT.getTime() + 60 * JOUR),
  lastLoginAt: null,
  createdAt: new Date("2026-11-01T08:00:00.000Z"),
  now: MAINTENANT,
  ...surcharge
});

/** 32 octets → un jeton base64url, comme `TokenService.generate()` (256 bits). Une suite d'octets VALIDE (tous acceptés, un chiffre) et deux suites qui font REFAIRE un tirage. */
const jeton = (octets: number[]): string => Buffer.from(octets).toString("base64url");
const OCTETS_VALIDES = Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 248);
const OCTETS_REJETES = new Array<number>(32).fill(255); // < 12 octets acceptés → refaire
const OCTETS_SANS_CHIFFRE = new Array<number>(32).fill(0); // « A » × 12 : pas de chiffre → refaire

function fabrique(magasin: Partial<Pick<StaffStore, "listMembers" | "createMember" | "resetMemberPassword" | "disableMember">> = {}, jetons: string[] = [jeton(OCTETS_VALIDES)]) {
  const file = [...jetons];
  const defauts = {
    listMembers: vi.fn(async (_proProfileId: string): Promise<MemberListRow[]> => []),
    createMember: vi.fn<StaffStore["createMember"]>(async () => ({ ok: true as const, member: ligne() })),
    resetMemberPassword: vi.fn<StaffStore["resetMemberPassword"]>(async () => ({ ok: true as const, member: ligne(), sessionsEnded: 0, devicesRevoked: 0 })),
    disableMember: vi.fn<StaffStore["disableMember"]>(async () => ({ ok: true as const, member: ligne({ status: StaffStatus.DISABLED }), sessionsEnded: 0, alreadyDisabled: false }))
  };
  // `satisfies` vérifie le double fusionné contre le port ; l'objet rendu garde les TYPES des espions par défaut (`.mock.calls` typé) — une union avec `Partial<…>` les aurait perdus (patron de `staff-session.service.spec.ts`).
  const fusionne = { ...defauts, ...magasin } satisfies Pick<StaffStore, "listMembers" | "createMember" | "resetMemberPassword" | "disableMember">;
  const store = fusionne as typeof defauts;
  const passwords = { hash: vi.fn(async (clair: string) => hacher(clair)) };
  const tokens = { generate: vi.fn(() => file.shift() ?? jeton(OCTETS_VALIDES)) };
  const service = new StaffMembersService(store as unknown as StaffStore, passwords as never, tokens as never);
  return { service, store, passwords, tokens };
}

describe("K-19 — la liste", () => {
  it("demande les membres de la salle du GARDE (jamais une salle venue du corps), et chaque membre est rendu avec son ÉTAT jugé à l'heure de la base", async () => {
    const lignes = [
      ligne({ id: "a", accountName: "Actif" }),
      ligne({ id: "b", accountName: "Temporaire", mustChangePassword: true, passwordExpiresAt: new Date(MAINTENANT.getTime() + 3 * JOUR) }),
      ligne({ id: "c", accountName: "TemporaireExpire", mustChangePassword: true, passwordExpiresAt: new Date(MAINTENANT.getTime() - 1) }),
      ligne({ id: "d", accountName: "Ordinaire90j", passwordExpiresAt: new Date(MAINTENANT.getTime() - JOUR) }),
      ligne({ id: "e", accountName: "Desactive", status: StaffStatus.DISABLED })
    ];
    const { service, store } = fabrique({ listMembers: vi.fn(async () => lignes) });
    const out = await service.list(staff);
    expect(store.listMembers).toHaveBeenCalledTimes(1);
    expect(store.listMembers).toHaveBeenCalledWith(staff.proProfileId);
    expect(out.members.map((m) => [m.accountName, m.state])).toEqual([
      ["Actif", StaffAccountState.ACTIVE],
      ["Temporaire", StaffAccountState.MUST_CHANGE_PASSWORD],
      ["TemporaireExpire", StaffAccountState.TEMPORARY_EXPIRED],
      ["Ordinaire90j", StaffAccountState.MUST_CHANGE_PASSWORD],
      ["Desactive", StaffAccountState.DISABLED]
    ]);
  });

  it("⛔ chaque membre n'a QUE les champs listés : jamais un hachage, un compteur, un verrou, une date d'échéance de mot de passe ; les dates sont des chaînes ISO", async () => {
    const { service } = fabrique({ listMembers: vi.fn(async () => [ligne({ lastLoginAt: new Date("2026-11-18T09:30:00.000Z") })]) });
    const out = await service.list(staff);
    const m = out.members[0]!;
    expect(Object.keys(m).sort()).toEqual(["accountName", "createdAt", "id", "lastLoginAt", "role", "state"]);
    expect(m.lastLoginAt).toBe("2026-11-18T09:30:00.000Z");
    expect(m.createdAt).toBe("2026-11-01T08:00:00.000Z");
  });

  it("une connexion jamais faite : `lastLoginAt` est null, pas une date inventée", async () => {
    const { service } = fabrique({ listMembers: vi.fn(async () => [ligne({ lastLoginAt: null })]) });
    expect((await service.list(staff)).members[0]!.lastLoginAt).toBeNull();
  });
});

describe("K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois", () => {
  it("⛔ le magasin ne reçoit QUE le hachage ; le clair n'apparaît dans AUCUN argument du magasin ; il est rendu dans la réponse, une fois, avec son échéance", async () => {
    const { service, store, passwords } = fabrique({
      createMember: vi.fn(async () => ({ ok: true as const, member: ligne({ mustChangePassword: true, passwordExpiresAt: new Date(MAINTENANT.getTime() + 7 * JOUR) }) }))
    });
    const out = await service.create(acteur, staff, { accountName: "Karim", role: StaffRole.EMPLOYEE });
    const clair = out.temporaryPassword;
    expect(passwordSchema.safeParse(clair).success, "le temporaire est accepté par le contrat de mot de passe").toBe(true);
    expect(passwords.hash).toHaveBeenCalledTimes(1);
    expect(passwords.hash).toHaveBeenCalledWith(clair);
    const appels = JSON.stringify(store.createMember.mock.calls);
    expect(appels.includes(clair), "le clair a atteint le magasin").toBe(false);
    expect(appels.includes(hacher(clair)), "le magasin reçoit le hachage").toBe(true);
    expect(out.temporaryPasswordExpiresAt).toBe("2026-11-26T10:00:00.000Z");
  });

  it("⛔ l'ACTEUR vient du contexte du garde : le membre qui crée (audit, `created_by`), la salle, le compte commun — jamais du corps ; la clé du nom est celle de la fonction PARTAGÉE (S-110)", async () => {
    const { service, store } = fabrique();
    await service.create(acteur, staff, { accountName: "  Amine  Éric ", role: StaffRole.MANAGER });
    const arg = store.createMember.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(arg.actor).toEqual(acteur);
    expect(arg.actorMemberId).toBe(staff.memberId);
    expect(arg.proProfileId).toBe(staff.proProfileId);
    expect(arg.role).toBe(StaffRole.MANAGER);
    expect(arg.accountNameKey).toBe(normalizeStaffAccountName("  Amine  Éric "));
    expect(arg.accountName).toBe("  Amine  Éric ");
  });

  it("⛔ un tirage qui ne ferait pas un mot de passe VALABLE (pas assez d'octets acceptés, ou pas de chiffre) est REFAIT — jamais un mot de passe plus court ni refusé par le contrat", async () => {
    const { service, tokens, passwords } = fabrique({}, [jeton(OCTETS_REJETES), jeton(OCTETS_SANS_CHIFFRE), jeton(OCTETS_VALIDES)]);
    const out = await service.create(acteur, staff, { accountName: "Karim", role: StaffRole.EMPLOYEE });
    expect(tokens.generate).toHaveBeenCalledTimes(3);
    expect(passwordSchema.safeParse(out.temporaryPassword).success).toBe(true);
    expect(passwords.hash).toHaveBeenCalledTimes(1);
  });

  it("deux créations donnent deux mots de passe différents (deux tirages différents)", async () => {
    const autres = Array.from({ length: 32 }, (_, i) => (i * 11 + 5) % 248);
    const { service } = fabrique({}, [jeton(OCTETS_VALIDES), jeton(autres)]);
    const a = await service.create(acteur, staff, { accountName: "Un", role: StaffRole.EMPLOYEE });
    const b = await service.create(acteur, staff, { accountName: "Deux", role: StaffRole.EMPLOYEE });
    expect(a.temporaryPassword).not.toBe(b.temporaryPassword);
  });

  it("⛔ un nom déjà pris (à la normalisation près) : 409 `STAFF_ACCOUNT_NAME_TAKEN`, une erreur MÉTIER — la base a refusé, jamais un 500", async () => {
    const { service } = fabrique({ createMember: vi.fn(async () => ({ ok: false as const, reason: "accountNameTaken" as const })) });
    const erreur = await service.create(acteur, staff, { accountName: "Karim", role: StaffRole.EMPLOYEE }).catch((e: unknown) => e);
    expect(erreur instanceof ConflictException).toBe(true);
    expect((erreur as ConflictException).getResponse()).toEqual({ code: StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN, message: "staff.errors.accountNameTaken" });
  });

  it("le membre rendu porte son état : un temporaire neuf est « MUST_CHANGE_PASSWORD »", async () => {
    const { service } = fabrique({
      createMember: vi.fn(async () => ({ ok: true as const, member: ligne({ mustChangePassword: true, passwordExpiresAt: new Date(MAINTENANT.getTime() + 7 * JOUR) }) }))
    });
    expect((await service.create(acteur, staff, { accountName: "Karim", role: StaffRole.EMPLOYEE })).member.state).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
  });
});

describe("K-21 — réinitialiser : un NOUVEAU temporaire, jamais le précédent", () => {
  it("⛔ génère un temporaire, le hache, ne transmet que le hachage, le rend UNE fois ; le magasin reçoit l'acteur, la salle du garde et le membre visé", async () => {
    const { service, store } = fabrique({
      resetMemberPassword: vi.fn(async () => ({ ok: true as const, member: ligne({ mustChangePassword: true, passwordExpiresAt: new Date(MAINTENANT.getTime() + 7 * JOUR) }), sessionsEnded: 2, devicesRevoked: 1 }))
    });
    const cible = "66666666-6666-4666-8666-666666666666";
    const out = await service.resetPassword(acteur, staff, cible);
    expect(passwordSchema.safeParse(out.temporaryPassword).success).toBe(true);
    const arg = store.resetMemberPassword.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(arg.memberId).toBe(cible);
    expect(arg.proProfileId).toBe(staff.proProfileId);
    expect(arg.actorMemberId).toBe(staff.memberId);
    expect(JSON.stringify(arg).includes(out.temporaryPassword)).toBe(false);
    expect(out.temporaryPasswordExpiresAt).toBe("2026-11-26T10:00:00.000Z");
  });

  it("⛔ le compte de sessions et d'appareils révoqués N'EST PAS rendu (un écran n'en a pas besoin, et c'est une information sur les postes d'autrui) : la réponse n'a que le membre et le temporaire", async () => {
    const { service } = fabrique({ resetMemberPassword: vi.fn(async () => ({ ok: true as const, member: ligne(), sessionsEnded: 3, devicesRevoked: 2 })) });
    const out = await service.resetPassword(acteur, staff, "66666666-6666-4666-8666-666666666666");
    expect(Object.keys(out).sort()).toEqual(["member", "temporaryPassword", "temporaryPasswordExpiresAt"]);
  });

  it("membre introuvable DANS CETTE SALLE : 404 `STAFF_MEMBER_NOT_FOUND` ; membre désactivé : 409 `STAFF_MEMBER_DISABLED` — des erreurs métier distinctes", async () => {
    const introuvable = fabrique({ resetMemberPassword: vi.fn(async () => ({ ok: false as const, reason: "notFound" as const })) });
    const e1 = await introuvable.service.resetPassword(acteur, staff, "66666666-6666-4666-8666-666666666666").catch((e: unknown) => e);
    expect(e1 instanceof NotFoundException).toBe(true);
    expect((e1 as NotFoundException).getResponse()).toEqual({ code: StaffErrorCode.STAFF_MEMBER_NOT_FOUND, message: "staff.errors.memberNotFound" });
    const desactive = fabrique({ resetMemberPassword: vi.fn(async () => ({ ok: false as const, reason: "disabled" as const })) });
    const e2 = await desactive.service.resetPassword(acteur, staff, "66666666-6666-4666-8666-666666666666").catch((e: unknown) => e);
    expect(e2 instanceof ConflictException).toBe(true);
    expect((e2 as ConflictException).getResponse()).toEqual({ code: StaffErrorCode.STAFF_MEMBER_DISABLED, message: "staff.errors.memberDisabled" });
  });
});

describe("K-22 — désactiver : « jamais zéro Manager »", () => {
  it("rend le membre DÉSACTIVÉ (état DISABLED) ; le magasin reçoit l'acteur, la salle du garde, le membre visé", async () => {
    const { service, store } = fabrique();
    const cible = "66666666-6666-4666-8666-666666666666";
    const out = await service.disable(acteur, staff, cible);
    expect(out.member.state).toBe(StaffAccountState.DISABLED);
    const arg = store.disableMember.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(arg).toMatchObject({ memberId: cible, proProfileId: staff.proProfileId, actorMemberId: staff.memberId, actor: acteur });
  });

  it("⛔ le dernier Manager : 409 `STAFF_LAST_MANAGER`, une erreur MÉTIER distincte d'un membre inconnu (404)", async () => {
    const dernier = fabrique({ disableMember: vi.fn(async () => ({ ok: false as const, reason: "lastManager" as const })) });
    const e1 = await dernier.service.disable(acteur, staff, "66666666-6666-4666-8666-666666666666").catch((e: unknown) => e);
    expect(e1 instanceof ConflictException).toBe(true);
    expect((e1 as ConflictException).getResponse()).toEqual({ code: StaffErrorCode.STAFF_LAST_MANAGER, message: "staff.errors.lastManager" });
    const inconnu = fabrique({ disableMember: vi.fn(async () => ({ ok: false as const, reason: "notFound" as const })) });
    const e2 = await inconnu.service.disable(acteur, staff, "66666666-6666-4666-8666-666666666666").catch((e: unknown) => e);
    expect(e2 instanceof NotFoundException).toBe(true);
    expect((e2 as NotFoundException).getResponse()).toEqual({ code: StaffErrorCode.STAFF_MEMBER_NOT_FOUND, message: "staff.errors.memberNotFound" });
  });

  it("⛔ une désactivation RÉPÉTÉE est un succès sans écriture (patron de D349) : le service rend le membre désactivé, il ne lève pas", async () => {
    const { service } = fabrique({ disableMember: vi.fn(async () => ({ ok: true as const, member: ligne({ status: StaffStatus.DISABLED }), sessionsEnded: 0, alreadyDisabled: true })) });
    const out = await service.disable(acteur, staff, "66666666-6666-4666-8666-666666666666");
    expect(out.member.state).toBe(StaffAccountState.DISABLED);
  });

  it("aucune erreur n'est un `ForbiddenException` : le refus de CAPACITÉ est celui du garde (une seule autorité sur la question, D78) — le service ne le redit pas", async () => {
    const { service } = fabrique({ disableMember: vi.fn(async () => ({ ok: false as const, reason: "lastManager" as const })) });
    const e = await service.disable(acteur, staff, "66666666-6666-4666-8666-666666666666").catch((x: unknown) => x);
    expect(e instanceof ForbiddenException).toBe(false);
  });
});
