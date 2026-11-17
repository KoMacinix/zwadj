// ADM-1 (D349, rang 51, R-6, D-3) — le script du PREMIER admin : « promeut un compte EXISTANT, vérifié et actif, refuse sinon. Aucun mot de passe manipulé. »
// Module pur : la décision (`judgePromotion`) et l'écriture sur une base abstraite (`promoteFirstAdmin`). Le script lui-même (`prisma/promote-first-admin.ts`) n'est qu'une enveloppe.
//
// ⛔ Ce script n'est JAMAIS joué sur la base de développement de Ko par ce lot (R-6) : les tests passent par un double ici, et par la base d'INTÉGRATION dans `first-admin.int-spec.ts`.
import { describe, expect, it, vi } from "vitest";
import { AdminAuditAction, UserRole, UserStatus } from "@zwadj/types";
import { promoteAdminEntry } from "../common/admin-audit";
import { judgePromotion, normalizeAdminEmail, promoteFirstAdmin, type PromotableUser, type PromotionDb } from "./first-admin";

const ID = "018f0000-0000-7000-8000-00000000aaaa";
const VERIFIE = new Date("2026-11-01T10:00:00.000Z");

const compte = (o: Partial<PromotableUser> = {}): PromotableUser => ({
  id: ID,
  role: UserRole.CLIENT,
  status: UserStatus.ACTIVE,
  emailVerifiedAt: VERIFIE,
  ...o
});

describe("judgePromotion — qui peut être promu", () => {
  it("un compte CLIENT, actif, à l'e-mail vérifié : promu", () => {
    expect(judgePromotion(compte())).toEqual({ ok: true, action: "PROMOTE" });
  });

  it("aucun compte : refus NOT_FOUND", () => {
    expect(judgePromotion(null)).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("un compte suspendu ou anonymisé : refus NOT_ACTIVE — pour CHAQUE statut autre que ACTIVE (dérivé de l'énumération)", () => {
    for (const status of Object.values(UserStatus).filter((s) => s !== UserStatus.ACTIVE)) {
      expect(judgePromotion(compte({ status })), status).toEqual({ ok: false, reason: "NOT_ACTIVE" });
    }
  });

  it("un compte dont l'e-mail n'est pas vérifié : refus EMAIL_NOT_VERIFIED (il ne pourrait de toute façon pas se connecter, D1)", () => {
    expect(judgePromotion(compte({ emailVerifiedAt: null }))).toEqual({ ok: false, reason: "EMAIL_NOT_VERIFIED" });
  });

  it("MD-ADM-3 « le mauvais compte » — un compte PRO est refusé (IS_PRO) : il perdrait l'accès à ses salles", () => {
    expect(judgePromotion(compte({ role: UserRole.PRO }))).toEqual({ ok: false, reason: "IS_PRO" });
  });

  it("un compte déjà ADMIN : rien à faire (ALREADY_ADMIN), pas un refus", () => {
    expect(judgePromotion(compte({ role: UserRole.ADMIN }))).toEqual({ ok: true, action: "ALREADY_ADMIN" });
  });

  it("l'ordre des refus : un compte suspendu ET non vérifié est refusé pour son statut ; un admin suspendu n'est PAS « déjà admin »", () => {
    expect(judgePromotion(compte({ status: UserStatus.SUSPENDED, emailVerifiedAt: null }))).toEqual({ ok: false, reason: "NOT_ACTIVE" });
    expect(judgePromotion(compte({ role: UserRole.ADMIN, status: UserStatus.SUSPENDED }))).toEqual({ ok: false, reason: "NOT_ACTIVE" });
  });
});

describe("normalizeAdminEmail — la saisie du terminal", () => {
  it("rogne les espaces et passe en minuscules (l'inscription stocke l'e-mail en minuscules)", () => {
    expect(normalizeAdminEmail("  Ko@Example.DZ \n")).toBe("ko@example.dz");
  });
});

function build(user: PromotableUser | null, count = 1) {
  const tx = {
    user: { findUnique: vi.fn().mockResolvedValue(user), updateMany: vi.fn().mockResolvedValue({ count }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) }
  };
  const db = { ...tx, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PromotionDb;
  return { db, tx };
}

describe("promoteFirstAdmin — ce que le script écrit", () => {
  it("promeut : UN updateMany conditionné (CLIENT, ACTIF, e-mail vérifié) qui n'écrit QUE le rôle — AUCUN mot de passe n'est lu ni écrit", async () => {
    const { db, tx } = build(compte());
    const r = await promoteFirstAdmin(db, " Ko@Example.dz ");

    expect(r).toEqual({ outcome: "PROMOTED", userId: ID });
    expect(tx.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "ko@example.dz" } }));
    // la lecture ne SÉLECTIONNE pas le hachage : le script ne peut pas le manipuler
    const select = (tx.user.findUnique.mock.calls[0]?.[0] as { select: Record<string, boolean> }).select;
    expect(Object.keys(select).sort()).toEqual(["emailVerifiedAt", "id", "role", "status"].sort());
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: ID, role: UserRole.CLIENT, status: UserStatus.ACTIVE, emailVerifiedAt: { not: null } },
      data: { role: UserRole.ADMIN }
    });
    expect(Object.keys((tx.user.updateMany.mock.calls[0]?.[0] as { data: object }).data)).toEqual(["role"]);
  });

  it("R-5/D-8 — UNE ligne de journal dans la MÊME transaction, après l'écriture, sans e-mail", async () => {
    const { db, tx } = build(compte());
    await promoteFirstAdmin(db, "ko@example.dz");

    expect((db as unknown as { $transaction: { mock: { calls: unknown[] } } }).$transaction.mock.calls).toHaveLength(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: promoteAdminEntry(ID, UserRole.CLIENT) });
    expect(tx.auditLog.create.mock.calls[0]?.[0]).toMatchObject({ data: { action: AdminAuditAction.USER_PROMOTE_ADMIN } });
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0]?.[0])).not.toContain("ko@example.dz");
    expect(tx.user.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.auditLog.create.mock.invocationCallOrder[0]!);
  });

  it("chaque refus : AUCUNE écriture, AUCUNE ligne de journal", async () => {
    for (const user of [null, compte({ status: UserStatus.SUSPENDED }), compte({ emailVerifiedAt: null }), compte({ role: UserRole.PRO })]) {
      const { db, tx } = build(user);
      const r = await promoteFirstAdmin(db, "ko@example.dz");
      expect(r.outcome).toBe("REFUSED");
      expect(tx.user.updateMany).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    }
  });

  it("un compte déjà ADMIN : ALREADY_ADMIN, aucune écriture, aucune ligne de journal (relancer le script est sans danger)", async () => {
    const { db, tx } = build(compte({ role: UserRole.ADMIN }));
    await expect(promoteFirstAdmin(db, "ko@example.dz")).resolves.toEqual({ outcome: "ALREADY_ADMIN", userId: ID });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("--dry-run : rend ce qui SERAIT fait, n'écrit RIEN", async () => {
    const { db, tx } = build(compte());
    await expect(promoteFirstAdmin(db, "ko@example.dz", { dryRun: true })).resolves.toEqual({ outcome: "WOULD_PROMOTE", userId: ID });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("la course perdue : le compte a changé entre la lecture et l'écriture (compte 0) ⇒ refus CHANGED, AUCUNE ligne de journal", async () => {
    const { db, tx } = build(compte(), 0);
    await expect(promoteFirstAdmin(db, "ko@example.dz")).resolves.toEqual({ outcome: "REFUSED", reason: "CHANGED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("un journal qui échoue fait ÉCHOUER la promotion (l'erreur remonte : la transaction l'annule)", async () => {
    const { db, tx } = build(compte());
    tx.auditLog.create.mockRejectedValue(new Error("journal indisponible"));
    await expect(promoteFirstAdmin(db, "ko@example.dz")).rejects.toThrow("journal indisponible");
  });
});
