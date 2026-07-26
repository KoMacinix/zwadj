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
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    accountDeletionArchivedVenue: { createMany: vi.fn().mockResolvedValue({}) },
    venue: { findMany: vi.fn().mockResolvedValue(living), updateMany: vi.fn().mockResolvedValue({}) },
    user: { update: vi.fn().mockResolvedValue({}) },
    proProfile: { update: vi.fn().mockResolvedValue({}) },
    refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    passwordResetToken: { updateMany: vi.fn().mockResolvedValue({}) },
    emailVerificationToken: { updateMany: vi.fn().mockResolvedValue({}) },
    emailChangeToken: { updateMany: vi.fn().mockResolvedValue({}) },
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
