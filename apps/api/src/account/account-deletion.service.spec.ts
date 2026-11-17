// Tests unitaires de l'EXÉCUTION d'une suppression (D37/D41) — la partie du
// lot où une erreur coûte des données. Ce qui est prouvé sans base :
//  - AUCUN `delete` n'est appelé, nulle part (règle 1) ;
//  - seules les salles VIVANTES sont archivées, et la trace correspond
//    exactement à ce qui a été archivé (règle 3) ;
//  - `googleSub` est bien remis à null — sans ça, un clic Google
//    ressusciterait le compte ;
//  - l'adresse est capturée AVANT l'anonymisation, sinon l'e-mail de décision
//    n'aurait plus de destinataire ;
//  - un refus ne touche PAS le compte.
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@zwadj/types";
import { deletionDecisionEntry } from "../common/admin-audit";
import { AccountDeletionService } from "./account-deletion.service";

const USER_ID = "00000000-0000-7000-8000-000000000001";
const ADMIN_ID = "00000000-0000-7000-8000-0000000000ad";
const REQUEST_ID = "00000000-0000-7000-8000-0000000000re";

const REQUEST_ROW = {
  id: REQUEST_ID,
  status: "PENDING" as const,
  reason: null,
  requestedAt: new Date("2026-07-01T10:00:00Z"),
  decidedAt: null,
  decisionNote: null
};

function build(opts: { pro?: boolean; livingVenues?: string[]; status?: string } = {}) {
  const pending = {
    id: REQUEST_ID,
    userId: USER_ID,
    status: opts.status ?? "PENDING",
    user: {
      email: "pro@example.dz",
      role: opts.pro === false ? "CLIENT" : "PRO",
      locale: "fr",
      proProfile: opts.pro === false ? null : { id: "pro-1" }
    }
  };
  const living = (opts.livingVenues ?? ["v1", "v2"]).map((id) => ({ id }));

  const prisma = {
    accountDeletionRequest: {
      findUnique: vi.fn().mockResolvedValue(pending),
      findFirst: vi.fn().mockResolvedValue(REQUEST_ROW),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(REQUEST_ROW),
      update: vi.fn().mockResolvedValue({ ...REQUEST_ROW, status: "APPROVED" }),
      // D350 (R-2) : le contrôle de statut est un CHECK-AND-SET (`updateMany` conditionné à PENDING) — sur une demande qui n'est plus en attente, la base rend 0 ligne touchée.
      updateMany: vi.fn().mockResolvedValue({ count: opts.status !== undefined && opts.status !== "PENDING" ? 0 : 1 })
    },
    accountDeletionArchivedVenue: { createMany: vi.fn().mockResolvedValue({}) },
    venue: { findMany: vi.fn().mockResolvedValue(living), updateMany: vi.fn().mockResolvedValue({}) },
    user: { update: vi.fn().mockResolvedValue({}) },
    proProfile: { update: vi.fn().mockResolvedValue({}) },
    refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    passwordResetToken: { updateMany: vi.fn().mockResolvedValue({}) },
    emailVerificationToken: { updateMany: vi.fn().mockResolvedValue({}) },
    emailChangeToken: { updateMany: vi.fn().mockResolvedValue({}) },
    // ADM-1 (D349, R-5) — le journal des décisions admin s'écrit DANS la transaction, sur le même double.
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma))
  };
  const account = { requireActiveActor: vi.fn().mockResolvedValue({ id: USER_ID }) };
  const tokens = { hash: vi.fn((v: string) => `sha256(${v})`) };
  const emails = {
    sendDeletionApproved: vi.fn().mockResolvedValue(undefined),
    sendDeletionRejected: vi.fn().mockResolvedValue(undefined)
  };
  const logger = { setContext: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() };

  const service = new AccountDeletionService(
    prisma as never,
    account as never,
    tokens as never,
    emails as never,
    logger as never
  );
  return { service, prisma, emails };
}

describe("approve — anonymisation, JAMAIS de suppression", () => {
  it("aucun `delete` n'est appelé sur QUOI QUE CE SOIT", async () => {
    // La règle n°1 du lot, vérifiée mécaniquement plutôt qu'à la relecture :
    // commissions dues et historique de réservations doivent survivre.
    //
    // La preuve n'est PAS l'assertion finale — c'est le DOUBLE lui-même :
    // aucun modèle du mock n'expose `delete`/`deleteMany`, donc le moindre
    // appel lèverait « is not a function » et ferait tomber ce test.
    // L'assertion ci-dessous ne fait que rendre cette intention explicite
    // pour quiconque ajouterait une méthode au double plus tard.
    const { service, prisma } = build();
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).resolves.toBeDefined();

    const exposed = Object.values(prisma)
      .filter((m) => typeof m === "object" && m !== null)
      .flatMap((m) => Object.keys(m as object));
    expect(exposed.filter((k) => k === "delete" || k === "deleteMany")).toEqual([]);
  });

  it("seules les salles VIVANTES sont archivées, et la trace les recense EXACTEMENT", async () => {
    const { service, prisma } = build({ livingVenues: ["v1", "v2"] });
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);

    // Le prédicat `deletedAt: null` est ce qui empêche de ressusciter, plus
    // tard, des salles que le pro avait lui-même supprimées.
    expect(prisma.venue.findMany).toHaveBeenCalledWith({
      where: { ownerId: "pro-1", deletedAt: null },
      select: { id: true }
    });
    expect(prisma.venue.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["v1", "v2"] } },
      data: { deletedAt: expect.any(Date) }
    });
    const traced = prisma.accountDeletionArchivedVenue.createMany.mock.calls[0]?.[0] as {
      data: { venueId: string }[];
    };
    expect(traced.data.map((r) => r.venueId)).toEqual(["v1", "v2"]);
  });

  it("pro sans salle vivante : aucune écriture d'archive (pas de ligne vide)", async () => {
    const { service, prisma } = build({ livingVenues: [] });
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    expect(prisma.venue.updateMany).not.toHaveBeenCalled();
    expect(prisma.accountDeletionArchivedVenue.createMany).not.toHaveBeenCalled();
  });

  it("compte CLIENT (pas de ProProfile) : l'étape salles et l'étape profil pro sont sautées", async () => {
    const { service, prisma } = build({ pro: false });
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    expect(prisma.venue.findMany).not.toHaveBeenCalled();
    expect(prisma.proProfile.update).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled(); // l'anonymisation, elle, a bien lieu
  });

  it("googleSub remis à null, e-mail non routable, PII effacée", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);

    const data = prisma.user.update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.status).toBe("ANONYMIZED");
    // Sans ça, « Continuer avec Google » retrouverait le compte par son sub.
    expect(data.googleSub).toBeNull();
    expect(data.passwordHash).toBeNull();
    expect(data.firstName).toBeNull();
    expect(data.lastName).toBeNull();
    expect(data.phone).toBeNull();
    // TLD `.invalid` (RFC 2606) : ne peut pas être délégué, donc aucun courrier
    // ne partira jamais vers cette adresse.
    expect(String(data.email)).toMatch(/^deleted-[0-9a-f-]{36}@zwadj\.invalid$/);
  });

  it("sessions révoquées ET liens encore vivants invalidés (reset, vérification, changement d'e-mail)", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    // Un lien émis avant la décision resterait sinon cliquable après coup.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(prisma.emailVerificationToken.updateMany).toHaveBeenCalled();
    expect(prisma.emailChangeToken.updateMany).toHaveBeenCalled();
  });

  it("businessName CONSERVÉ, coordonnées effacées", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    const data = prisma.proProfile.update.mock.calls[0]?.[0].data as Record<string, unknown>;
    // `businessName` n'est pas une donnée personnelle — et c'est lui qui
    // permettra d'identifier les salles archivées si la personne revient.
    expect(data).not.toHaveProperty("businessName");
    expect(data.phone).toBe(""); // colonne NOT NULL : effacé, pas nul
    expect(data.phone2).toBeNull();
  });

  it("l'e-mail de décision part à l'adresse CAPTURÉE, avec le nombre de salles archivées", async () => {
    const { service, emails } = build({ livingVenues: ["v1", "v2", "v3"] });
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    expect(emails.sendDeletionApproved).toHaveBeenCalledWith(
      { email: "pro@example.dz", role: "PRO", locale: "fr" },
      3
    );
  });

  it("emailHash = SHA-256 de l'adresse RÉELLEMENT détruite", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    const data = prisma.accountDeletionRequest.update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.emailHash).toBe("sha256(pro@example.dz)");
    expect(data.decidedById).toBe(ADMIN_ID);
  });

  it("un e-mail qui échoue ne fait PAS échouer la décision (déjà commitée)", async () => {
    const { service, emails } = build();
    emails.sendDeletionApproved.mockRejectedValue(new Error("SMTP down"));
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).resolves.toBeDefined();
  });
});

describe("transitions", () => {
  it("demande déjà décidée : 400 DELETION_REQUEST_NOT_PENDING, aucune écriture", async () => {
    const { service, prisma } = build({ status: "APPROVED" });
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("id inconnu : 404 DELETION_REQUEST_NOT_FOUND", async () => {
    const { service, prisma } = build();
    prisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    prisma.accountDeletionRequest.findUnique.mockResolvedValue(null);
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("reject : AUCUN effet sur le compte, qui reste ACTIVE — et l'utilisateur est notifié", async () => {
    const { service, prisma, emails } = build();
    await service.reject(REQUEST_ID, ADMIN_ID, "Commissions en cours de règlement.");

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.venue.updateMany).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(emails.sendDeletionRejected).toHaveBeenCalledWith(
      { email: "pro@example.dz", role: "PRO", locale: "fr" },
      "Commissions en cours de règlement."
    );
  });

  it("cancel sans demande en attente : 404 (check-and-set, 0 ligne touchée)", async () => {
    const { service, prisma } = build();
    prisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancel(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ADM-1 (D349, R-5) — « approuver » et « rejeter » une demande de suppression écrivent UNE ligne de journal DANS la transaction de la décision (D-8) :
// une décision sans trace, ou une trace sans décision, est MD-ADM-6. Le contrôle de statut n'est pas déplacé (rapporté au backlog, pas corrigé ici).
describe("journal des décisions admin (R-5, MD-ADM-6)", () => {
  const ADMIN = { userId: ADMIN_ID, role: UserRole.ADMIN } as const;

  it("approve : UNE ligne `account_deletion.approve`, dans la transaction, APRÈS la clôture de la demande, avec le nombre de salles archivées", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, "Note de décision confidentielle");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: deletionDecisionEntry(ADMIN, REQUEST_ID, "APPROVED", 2) });
    // l'ordre : la ligne n'est écrite qu'après la clôture de la demande (étape 5), dans le même rappel de transaction
    expect(prisma.accountDeletionRequest.update.mock.invocationCallOrder[0]).toBeLessThan(prisma.auditLog.create.mock.invocationCallOrder[0]!);
  });

  it("approve : AUCUNE donnée personnelle ni note de décision dans la ligne (ni l'adresse e-mail, ni l'identifiant du compte)", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, "Note de décision confidentielle");
    const ligne = JSON.stringify(prisma.auditLog.create.mock.calls[0]?.[0]);
    expect(ligne).not.toContain("pro@example.dz");
    expect(ligne).not.toContain("Note de décision confidentielle");
    expect(ligne).not.toContain(USER_ID);
  });

  it("approve : un compte sans salle vivante écrit `archivedVenues: 0` (le nombre est celui de ce qui a été archivé)", async () => {
    const { service, prisma } = build({ livingVenues: [] });
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: deletionDecisionEntry(ADMIN, REQUEST_ID, "APPROVED", 0) });
  });

  it("MD-ADM-6 — approve : un journal qui échoue fait ÉCHOUER la décision ; l'e-mail de décision ne part PAS (il part après le commit)", async () => {
    const { service, prisma, emails } = build();
    prisma.auditLog.create.mockRejectedValue(new Error("journal indisponible"));
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toThrow("journal indisponible");
    expect(emails.sendDeletionApproved).not.toHaveBeenCalled();
  });

  it("reject : UNE ligne `account_deletion.reject`, dans une TRANSACTION (il n'en avait aucune), APRÈS l'écriture de la décision", async () => {
    const { service, prisma } = build();
    await service.reject(REQUEST_ID, ADMIN_ID, "Pas maintenant");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: deletionDecisionEntry(ADMIN, REQUEST_ID, "REJECTED") });
    expect(prisma.accountDeletionRequest.update.mock.invocationCallOrder[0]).toBeLessThan(prisma.auditLog.create.mock.invocationCallOrder[0]!);
    expect(JSON.stringify(prisma.auditLog.create.mock.calls[0]?.[0])).not.toContain("Pas maintenant");
  });

  it("MD-ADM-6 — reject : un journal qui échoue fait ÉCHOUER le refus ; l'utilisateur n'est PAS notifié d'une décision qui n'a pas eu lieu", async () => {
    const { service, prisma, emails } = build();
    prisma.auditLog.create.mockRejectedValue(new Error("journal indisponible"));
    await expect(service.reject(REQUEST_ID, ADMIN_ID, undefined)).rejects.toThrow("journal indisponible");
    expect(emails.sendDeletionRejected).not.toHaveBeenCalled();
  });

  it("une demande déjà décidée n'écrit AUCUNE ligne de journal (400 avant toute écriture)", async () => {
    const { service, prisma } = build({ status: "APPROVED" });
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reject(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

// ── D350 (R-2) — le statut d'une demande se décide DANS la transaction, en check-and-set ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Le relecteur a constaté PAR LECTURE (et `test:int` le MESURE : `account-deletion-race.int-spec.ts`) que `approve` et `reject` lisaient « en attente » AVANT leur transaction puis écrivaient par `id` :
// deux approbations simultanées écrivaient deux lignes, une approbation pendant l'annulation anonymisait un compte dont la demande venait d'être annulée (D117, D121). Ici, ce qui se prouve sans base :
// la décision est UN `updateMany` conditionné à `PENDING`, PREMIER geste du rappel de la transaction, aucune lecture de la demande n'a lieu avant l'ouverture de la transaction, et un compte 0 n'écrit RIEN.
describe("R-2 (D350) — le statut se décide DANS la transaction, en check-and-set", () => {
  const ordre = (m: { mock: { invocationCallOrder: number[] } }, i = 0): number => m.mock.invocationCallOrder[i] as number;

  it("approve : AUCUNE lecture de la demande avant l'ouverture de la transaction (la lecture d'avant décidait, D117 / D121)", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    const lecture = [...prisma.accountDeletionRequest.findUnique.mock.invocationCallOrder, ...prisma.accountDeletionRequest.findFirst.mock.invocationCallOrder];
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    for (const o of lecture) expect(o).toBeGreaterThan(ordre(prisma.$transaction));
  });

  it("reject : AUCUNE lecture de la demande avant l'ouverture de la transaction", async () => {
    const { service, prisma } = build();
    await service.reject(REQUEST_ID, ADMIN_ID, "Pas maintenant");
    const lecture = [...prisma.accountDeletionRequest.findUnique.mock.invocationCallOrder, ...prisma.accountDeletionRequest.findFirst.mock.invocationCallOrder];
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    for (const o of lecture) expect(o).toBeGreaterThan(ordre(prisma.$transaction));
  });

  it("approve : le PREMIER geste de la transaction est le check-and-set — `updateMany` conditionné à PENDING, avant toute salle archivée, toute anonymisation, toute révocation", async () => {
    const { service, prisma } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);

    expect(prisma.accountDeletionRequest.updateMany).toHaveBeenCalledWith({ where: { id: REQUEST_ID, status: "PENDING" }, data: expect.objectContaining({ status: "APPROVED" }) });
    const cas = ordre(prisma.accountDeletionRequest.updateMany);
    expect(cas).toBeGreaterThan(ordre(prisma.$transaction));
    for (const effet of [prisma.venue.findMany, prisma.venue.updateMany, prisma.user.update, prisma.refreshToken.updateMany, prisma.proProfile.update, prisma.auditLog.create]) {
      expect(ordre(effet)).toBeGreaterThan(cas);
    }
  });

  it("reject : le PREMIER geste de la transaction est le check-and-set — `updateMany` conditionné à PENDING, avant la décision écrite et la ligne de journal", async () => {
    const { service, prisma } = build();
    await service.reject(REQUEST_ID, ADMIN_ID, "Pas maintenant");

    expect(prisma.accountDeletionRequest.updateMany).toHaveBeenCalledWith({ where: { id: REQUEST_ID, status: "PENDING" }, data: expect.objectContaining({ status: "REJECTED" }) });
    const cas = ordre(prisma.accountDeletionRequest.updateMany);
    expect(cas).toBeGreaterThan(ordre(prisma.$transaction));
    expect(ordre(prisma.accountDeletionRequest.update)).toBeGreaterThan(cas);
    expect(ordre(prisma.auditLog.create)).toBeGreaterThan(cas);
  });

  it("compte 0 parce que l'utilisateur a ANNULÉ entre-temps : 400 DELETION_REQUEST_NOT_PENDING — aucune salle archivée, aucun compte anonymisé, aucune ligne de journal, aucun e-mail", async () => {
    const { service, prisma, emails } = build();
    prisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    prisma.accountDeletionRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "CANCELLED" });

    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.venue.findMany).not.toHaveBeenCalled();
    expect(prisma.venue.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(emails.sendDeletionApproved).not.toHaveBeenCalled();
  });

  it("compte 0 parce qu'une AUTRE décision est passée avant (rejet, approbation) : 400 pour approve ET pour reject — rien n'est écrit, personne n'est notifié", async () => {
    for (const statut of ["APPROVED", "REJECTED"]) {
      const approuve = build({ status: statut });
      await expect(approuve.service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(BadRequestException);
      expect(approuve.prisma.user.update).not.toHaveBeenCalled();
      expect(approuve.prisma.auditLog.create).not.toHaveBeenCalled();
      expect(approuve.emails.sendDeletionApproved).not.toHaveBeenCalled();

      const rejete = build({ status: statut });
      await expect(rejete.service.reject(REQUEST_ID, ADMIN_ID, "Motif")).rejects.toBeInstanceOf(BadRequestException);
      expect(rejete.prisma.accountDeletionRequest.update).not.toHaveBeenCalled();
      expect(rejete.prisma.auditLog.create).not.toHaveBeenCalled();
      expect(rejete.emails.sendDeletionRejected).not.toHaveBeenCalled();
    }
  });

  it("compte 0 sur un id inconnu : 404 DELETION_REQUEST_NOT_FOUND, pour approve et pour reject", async () => {
    const { service, prisma } = build();
    prisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    prisma.accountDeletionRequest.findUnique.mockResolvedValue(null);
    await expect(service.approve(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.reject(REQUEST_ID, ADMIN_ID, undefined)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("compte 0 sur une demande que la relecture dit ENCORE en attente : une erreur d'ÉTAT IMPOSSIBLE, jamais un succès silencieux", async () => {
    const { service, prisma } = build();
    prisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    prisma.accountDeletionRequest.findUnique.mockResolvedValue({ id: REQUEST_ID, status: "PENDING" });
    const e = await service.approve(REQUEST_ID, ADMIN_ID, undefined).then(() => null, (x: unknown) => x);
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(BadRequestException);
    expect(e).not.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("l'e-mail de décision n'est lu qu'à l'INTÉRIEUR de la transaction, AVANT l'anonymisation : l'adresse capturée est celle de la ligne lue après le check-and-set", async () => {
    const { service, prisma, emails } = build();
    await service.approve(REQUEST_ID, ADMIN_ID, undefined);
    expect(ordre(prisma.accountDeletionRequest.findUnique)).toBeLessThan(ordre(prisma.user.update));
    expect(emails.sendDeletionApproved).toHaveBeenCalledWith({ email: "pro@example.dz", role: "PRO", locale: "fr" }, 2);
  });
});
