// Spec unitaire de VenuesAdminService, Prisma mocké — branches pures.
//
// Lot A3 : publish idempotent SANS écriture (updatedAt intact), fusion des taux contre l'existant (égalité admise, dépassement refusé), 404 court-circuit uuid.
// ADM-1 (D349, rang 51) : publier devient un CHECK-AND-SET dans une transaction (R-5, MD-ADM-4) qui efface le motif d'un refus (R-2) et écrit UNE ligne de journal ; la file
// « en attente », le détail et le rejet (D-4, D-6). Le bout-en-bout (course réelle, rollback sur échec du journal, forme sur le fil) vit en intégration.
//
// ⛔ R-1 — LE TAUX N'EST NI TOUCHÉ NI JOURNALISÉ. `setRates` garde ses trois tests, inchangés ; les méthodes neuves ne lisent ni n'écrivent un taux (sauf le DÉTAIL, qui l'AFFICHE).
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminAuditAction, AdminAuditEntity, UserRole, VenueModerationErrorCode, VenuePublicationStatus } from "@zwadj/types";
import { venuePublishEntry, venueRejectEntry } from "../common/admin-audit";
import type { PrismaService } from "../prisma/prisma.service";
import { PUBLISHABLE_FROM, REJECTABLE_FROM } from "./venue-review-queue";
import { REVIEW_QUEUE_WHERE, VenuesAdminService } from "./venues-admin.service";

const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const ADMIN = { userId: "018f0000-0000-7000-8000-0000000000ad", role: UserRole.ADMIN } as const;
const REJETE_LE = new Date("2026-11-10T09:30:00.000Z");

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    slug: "salle-el-ferdous",
    cityId: "018f0000-0000-7000-8000-00000000cccc",
    nameFr: "Salle El Ferdous",
    nameAr: "قاعة الفردوس",
    taglineFr: null,
    taglineAr: null,
    descriptionFr: null,
    descriptionAr: null,
    districtFr: null,
    districtAr: null,
    address: null,
    lat: null,
    lng: null,
    capacityMax: 450,
    basePriceCents: 18_000_000,
    bookingMode: "SINGLE_SLOT",
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenities: [],
    styles: [], // relation VenueStyleLink (ids seuls) — A13/D65
    ceremonyType: null, // D66 — non déclaré par cette salle
    photos: [],
    slotTemplates: [],
    matterportModelId: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    commissionRateBps: 100,
    cashbackRateBps: 0,
    rejectionReason: null,
    ...overrides
  };
}

function queueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    number: 12,
    slug: "salle-el-ferdous",
    nameFr: "Salle El Ferdous",
    nameAr: "قاعة الفردوس",
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-21T10:00:00.000Z"),
    rejectionReason: null,
    city: { nameFr: "Hydra", nameAr: "حيدرة" },
    owner: { businessName: "Salles Pro" },
    _count: { slotTemplates: 2 },
    ...overrides
  };
}

const fakeStorage = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  publicUrl: (key: string) => `/api/v1/media/${key}`
} as unknown as import("../media/media.types").MediaStorage;

function buildService() {
  // D46 (B1) — la publication compte les créneaux ACTIFS : sans ce double, la garde ferait échouer tous les scénarios de publication.
  // ADM-1 — `$transaction` rejoue le rappel sur le MÊME double : ce qui est écrit « dans la transaction » est ce qui est appelé pendant le rappel.
  const prisma = {
    venue: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    slotTemplate: { count: vi.fn().mockResolvedValue(1) },
    auditLog: {
      create: vi.fn().mockResolvedValue({ createdAt: REJETE_LE }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([])
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma))
  };
  return { service: new VenuesAdminService(prisma as unknown as PrismaService, fakeStorage), prisma };
}

/** Rend l'erreur levée par la promesse (ou `null` si elle se résout). ⛔ Les verdicts de ce lot s'écrivent en assertions NATIVES (`toBeInstanceOf`, `toBe`, `toEqual`) : le matcher `toSatisfy` lève une `Error`
 *  et non une `AssertionError`, et n'est donc pas une morsure sous la lecture de R1 (D304, D305, D316) — mesuré sur la première campagne du lot (S-5, S-6, S-11, S-12). */
const erreurDe = (p: Promise<unknown>): Promise<unknown> => p.then(() => null, (e: unknown) => e);

const codeOf = (e: unknown): string | undefined => (e as { getResponse?: () => { code?: string } }).getResponse?.().code;

describe("VenuesAdminService.publish", () => {
  it("id hors motif UUID : 404 VENUE_NOT_FOUND sans toucher la base, sans ouvrir de transaction", async () => {
    const { service, prisma } = buildService();
    const echec = await erreurDe(service.publish("pas-un-uuid", ADMIN));
    expect(echec).toBeInstanceOf(NotFoundException);
    expect(codeOf(echec)).toBe("VENUE_NOT_FOUND");
    expect(prisma.venue.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("DRAFT → UN updateMany conditionné au statut (check-and-set), qui efface le motif ; le WHERE admin voit toutes les vivantes", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow());
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });
    prisma.venue.findUniqueOrThrow.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    const dto = await service.publish(VENUE_ID, ADMIN);

    expect(prisma.venue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID, deletedAt: null } })
    );
    expect(prisma.venue.updateMany).toHaveBeenCalledWith({
      where: { id: VENUE_ID, deletedAt: null, publicationStatus: { in: [...PUBLISHABLE_FROM] } },
      data: { publicationStatus: VenuePublicationStatus.PUBLISHED, rejectionReason: null }
    });
    expect(prisma.venue.update).not.toHaveBeenCalled(); // plus d'écriture par `id` seul : le statut source est dans le WHERE (D117, D121)
    expect(dto.publicationStatus).toBe("PUBLISHED");
    expect(dto.commissionRateBps).toBe(100); // la vue admin porte les taux
    expect(dto.cashbackRateBps).toBe(0);
  });

  it("R-5 — la ligne de journal s'écrit DANS la transaction, APRÈS l'écriture, avec l'acteur et le statut de départ", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow());
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });
    prisma.venue.findUniqueOrThrow.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    await service.publish(VENUE_ID, ADMIN);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: venuePublishEntry(ADMIN, VENUE_ID, VenuePublicationStatus.DRAFT) });
    expect(prisma.auditLog.create.mock.calls[0]?.[0]).toMatchObject({
      data: { action: AdminAuditAction.VENUE_PUBLISH, entityType: AdminAuditEntity.VENUE, entityId: VENUE_ID, actorId: ADMIN.userId }
    });
    // l'ordre : on n'écrit la trace qu'une fois l'écriture faite, dans le même rappel de transaction
    expect(prisma.venue.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prisma.auditLog.create.mock.invocationCallOrder[0]!);
  });

  it("D46 — sans créneau ACTIF : 409 SLOT_TEMPLATE_REQUIRED, aucune écriture, aucune ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow());
    prisma.slotTemplate.count.mockResolvedValue(0);

    const echec = await erreurDe(service.publish(VENUE_ID, ADMIN));
    expect(echec).toBeInstanceOf(ConflictException);
    expect(codeOf(echec)).toBe("SLOT_TEMPLATE_REQUIRED");
    expect(prisma.venue.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("déjà PUBLISHED : idempotent — AUCUNE écriture, AUCUNE ligne de journal (updatedAt intact, tri « recent » non faussé)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    const dto = await service.publish(VENUE_ID, ADMIN);

    expect(prisma.venue.update).not.toHaveBeenCalled();
    expect(prisma.venue.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(dto.publicationStatus).toBe("PUBLISHED");
  });

  it("MD-ADM-4 — la course perdue : le compte est 0 parce qu'un AUTRE geste a publié entre-temps ⇒ 200 idempotent, AUCUNE ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst
      .mockResolvedValueOnce(adminRow()) // vue DRAFT à la lecture…
      .mockResolvedValueOnce(adminRow({ publicationStatus: "PUBLISHED" })); // …publiée quand on relit pour choisir le code
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });
    // le chemin d'un SUCCÈS (compte 1) relit la salle : sans ce double, une mutation « compte 0 = succès » tomberait sur un TypeError au lieu d'atteindre l'assertion du journal
    prisma.venue.findUniqueOrThrow.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    const dto = await service.publish(VENUE_ID, ADMIN);

    expect(dto.publicationStatus).toBe("PUBLISHED");
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("MD-ADM-4 — le compte est 0 parce que la salle a été SUPPRIMÉE entre-temps ⇒ 404 indistinct, AUCUNE ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValueOnce(adminRow()).mockResolvedValueOnce(null);
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });

    const echec = await erreurDe(service.publish(VENUE_ID, ADMIN));
    expect(echec).toBeInstanceOf(NotFoundException);
    expect(codeOf(echec)).toBe("VENUE_NOT_FOUND");
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("MD-ADM-6 — un journal qui échoue fait ÉCHOUER la publication (l'erreur remonte : la transaction l'annule, mesuré en intégration)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow());
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditLog.create.mockRejectedValue(new Error("journal indisponible"));

    await expect(service.publish(VENUE_ID, ADMIN)).rejects.toThrow("journal indisponible");
  });
});

describe("VenuesAdminService.reject (D-4, R-2) — la salle RESTE en brouillon, le motif est stocké et journalisé", () => {
  const MOTIF = "Les photos sont floues. Merci de les remplacer.";

  it("id hors motif UUID : 404 VENUE_NOT_FOUND sans toucher la base", async () => {
    const { service, prisma } = buildService();
    const echec = await erreurDe(service.reject("pas-un-uuid", ADMIN, { reason: MOTIF }));
    expect(echec).toBeInstanceOf(NotFoundException);
    expect(codeOf(echec)).toBe("VENUE_NOT_FOUND");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("un brouillon jamais rejeté : UN updateMany conditionné (DRAFT, vivante, jamais rejetée) qui n'écrit QUE le motif — le statut ne bouge pas", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.reject(VENUE_ID, ADMIN, { reason: MOTIF });

    expect(prisma.venue.updateMany).toHaveBeenCalledWith({
      where: { id: VENUE_ID, deletedAt: null, publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: null },
      data: { rejectionReason: MOTIF }
    });
    expect(Object.keys((prisma.venue.updateMany.mock.calls[0]?.[0] as { data: object }).data)).toEqual(["rejectionReason"]);
    expect(res).toEqual({
      id: VENUE_ID,
      publicationStatus: VenuePublicationStatus.DRAFT,
      rejection: { reason: MOTIF, rejectedAt: REJETE_LE.toISOString() }
    });
  });

  it("R-5 — UNE ligne de journal dans la transaction, qui porte le MOTIF ; la date rendue est celle de CETTE ligne", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });

    await service.reject(VENUE_ID, ADMIN, { reason: MOTIF });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect((prisma.auditLog.create.mock.calls[0]?.[0] as { data: unknown }).data).toEqual(venueRejectEntry(ADMIN, VENUE_ID, MOTIF));
    expect(prisma.venue.updateMany.mock.invocationCallOrder[0]).toBeLessThan(prisma.auditLog.create.mock.invocationCallOrder[0]!);
  });

  it("R-1 — le rejet n'écrit ni ne lit AUCUN taux : la charge utile de l'écriture et la réponse n'en portent pas", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.reject(VENUE_ID, ADMIN, { reason: MOTIF });

    const arg = JSON.stringify(prisma.venue.updateMany.mock.calls[0]?.[0]);
    expect(arg).not.toMatch(/commissionRateBps|cashbackRateBps/);
    expect(JSON.stringify(res)).not.toMatch(/commissionRateBps|cashbackRateBps/);
  });

  it("compte 0, salle absente ou supprimée : 404 indistinct, AUCUNE ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });
    prisma.venue.findFirst.mockResolvedValue(null);

    const echec = await erreurDe(service.reject(VENUE_ID, ADMIN, { reason: MOTIF }));
    expect(echec).toBeInstanceOf(NotFoundException);
    expect(codeOf(echec)).toBe("VENUE_NOT_FOUND");
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("MD-ADM-4 — compte 0 sur une salle PUBLIÉE : 409 VENUE_NOT_DRAFT (le sens unique), rien n'est écrit, AUCUNE ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });
    prisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID, publicationStatus: "PUBLISHED", rejectionReason: null });

    const echec = await erreurDe(service.reject(VENUE_ID, ADMIN, { reason: MOTIF }));
    expect(echec).toBeInstanceOf(ConflictException);
    expect(codeOf(echec)).toBe(VenueModerationErrorCode.VENUE_NOT_DRAFT);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("MD-ADM-4 « même état, même requête, même réponse » — le MÊME motif sur une salle déjà rejetée : 200, la même réponse, AUCUNE nouvelle ligne de journal", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });
    prisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID, publicationStatus: "DRAFT", rejectionReason: MOTIF });
    prisma.auditLog.findFirst.mockResolvedValue({ createdAt: REJETE_LE });

    const res = await service.reject(VENUE_ID, ADMIN, { reason: MOTIF }).catch((e: unknown) => e);

    expect(res).toEqual({
      id: VENUE_ID,
      publicationStatus: VenuePublicationStatus.DRAFT,
      rejection: { reason: MOTIF, rejectedAt: REJETE_LE.toISOString() }
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("DÉCISION MANQUANTE (R-2, rapportée) — un AUTRE motif sur une salle déjà rejetée : 409 VENUE_ALREADY_REJECTED, le motif stocké n'est PAS écrasé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 0 });
    prisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID, publicationStatus: "DRAFT", rejectionReason: "Un premier motif" });

    const echec = await erreurDe(service.reject(VENUE_ID, ADMIN, { reason: MOTIF }));
    expect(echec).toBeInstanceOf(ConflictException);
    expect(codeOf(echec)).toBe(VenueModerationErrorCode.VENUE_ALREADY_REJECTED);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.venue.updateMany).toHaveBeenCalledTimes(1); // la seule tentative est la conditionnée, jamais une seconde écriture
  });

  it("MD-ADM-6 — un journal qui échoue fait ÉCHOUER le rejet", async () => {
    const { service, prisma } = buildService();
    prisma.venue.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditLog.create.mockRejectedValue(new Error("journal indisponible"));

    await expect(service.reject(VENUE_ID, ADMIN, { reason: MOTIF })).rejects.toThrow("journal indisponible");
  });
});

describe("VenuesAdminService.listPending (D-6 l2, MD-ADM-8) — la file « en attente de publication »", () => {
  it("la condition de la file : brouillon VIVANT avec au moins un créneau ACTIF (la condition même de la publication)", () => {
    expect(REVIEW_QUEUE_WHERE).toEqual({
      deletedAt: null,
      publicationStatus: VenuePublicationStatus.DRAFT,
      slotTemplates: { some: { isActive: true } }
    });
  });

  it("MD-ADM-8 — le filtre vit dans le WHERE : le compte et la lecture de CHAQUE groupe partagent le MÊME where (D225)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.venue.findMany.mockResolvedValueOnce([queueRow({ id: "a" }), queueRow({ id: "b" })]).mockResolvedValueOnce([
      queueRow({ id: "c", rejectionReason: "Un motif" })
    ]);
    prisma.auditLog.findMany.mockResolvedValue([{ entityId: "c", createdAt: REJETE_LE }]);

    await service.listPending({ page: 1, pageSize: 10 });

    const whereCompte = prisma.venue.count.mock.calls.map((c) => (c[0] as { where: unknown }).where);
    const whereLecture = prisma.venue.findMany.mock.calls.map((c) => (c[0] as { where: unknown }).where);
    expect(whereCompte).toEqual([
      { ...REVIEW_QUEUE_WHERE, rejectionReason: null },
      { ...REVIEW_QUEUE_WHERE, rejectionReason: { not: null } }
    ]);
    expect(whereLecture).toEqual(whereCompte);
  });

  it("R-2 — les non rejetées d'abord, les rejetées ensuite ; chaque groupe trié par date de création puis id (déterministe)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prisma.venue.findMany
      .mockResolvedValueOnce([queueRow({ id: "libre" })])
      .mockResolvedValueOnce([queueRow({ id: "rejetee", rejectionReason: "Un motif" })]);
    prisma.auditLog.findMany.mockResolvedValue([{ entityId: "rejetee", createdAt: REJETE_LE }]);

    const page = await service.listPending({ page: 1, pageSize: 10 });

    expect(page.items.map((i) => i.id)).toEqual(["libre", "rejetee"]);
    for (const appel of prisma.venue.findMany.mock.calls) {
      expect((appel[0] as { orderBy: unknown }).orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    }
  });

  it("le total, la page et la taille sont l'ÉCHO de ce qui a été appliqué ; le total est celui du jeu FILTRÉ", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    prisma.venue.findMany.mockResolvedValue([]);

    const page = await service.listPending({ page: 2, pageSize: 4 });

    expect(page).toMatchObject({ total: 8, page: 2, pageSize: 4 });
  });

  it("une page qui tient dans le premier groupe n'interroge PAS le second ; une page à cheval interroge les deux avec les bons sauts", async () => {
    const un = buildService();
    un.prisma.venue.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    un.prisma.venue.findMany.mockResolvedValue([]);
    await un.service.listPending({ page: 1, pageSize: 4 });
    expect(un.prisma.venue.findMany).toHaveBeenCalledTimes(1);
    expect(un.prisma.venue.findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 0, take: 4 });

    const deux = buildService();
    deux.prisma.venue.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    deux.prisma.venue.findMany.mockResolvedValue([]);
    await deux.service.listPending({ page: 2, pageSize: 4 });
    expect(deux.prisma.venue.findMany).toHaveBeenCalledTimes(2);
    expect(deux.prisma.venue.findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 4, take: 1 });
    expect(deux.prisma.venue.findMany.mock.calls[1]?.[0]).toMatchObject({ skip: 0, take: 3 });
  });

  it("une page entièrement dans le second groupe passe son saut RELATIF au second ; le premier n'est pas interrogé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(2).mockResolvedValueOnce(9);
    prisma.venue.findMany.mockResolvedValue([]);

    await service.listPending({ page: 2, pageSize: 3 });

    expect(prisma.venue.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.venue.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { ...REVIEW_QUEUE_WHERE, rejectionReason: { not: null } }, skip: 1, take: 3 });
  });

  it("la forme d'une ligne : nom, ville, propriétaire, nombre de créneaux actifs, dates ISO ; « déjà rejetée » avec motif ET date LUE AU JOURNAL", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prisma.venue.findMany
      .mockResolvedValueOnce([queueRow({ id: "libre" })])
      .mockResolvedValueOnce([queueRow({ id: "rejetee", rejectionReason: "Un motif" })]);
    prisma.auditLog.findMany.mockResolvedValue([{ entityId: "rejetee", createdAt: REJETE_LE }]);

    const { items } = await service.listPending({ page: 1, pageSize: 10 });

    expect(items[0]).toEqual({
      id: "libre",
      number: 12,
      slug: "salle-el-ferdous",
      nameFr: "Salle El Ferdous",
      nameAr: "قاعة الفردوس",
      cityNameFr: "Hydra",
      cityNameAr: "حيدرة",
      ownerBusinessName: "Salles Pro",
      activeSlotCount: 2,
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-21T10:00:00.000Z",
      rejection: null
    });
    expect(items[1]?.rejection).toEqual({ reason: "Un motif", rejectedAt: REJETE_LE.toISOString() });
  });

  it("la date des refus se lit en UNE requête pour toute la page (pas une par ligne), sur les seules salles rejetées de la page", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    prisma.venue.findMany
      .mockResolvedValueOnce([queueRow({ id: "n1" }), queueRow({ id: "n2" })])
      .mockResolvedValueOnce([queueRow({ id: "r1", rejectionReason: "M1" }), queueRow({ id: "r2", rejectionReason: "M2" })]);
    prisma.auditLog.findMany.mockResolvedValue([]);

    await service.listPending({ page: 1, pageSize: 10 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { action: AdminAuditAction.VENUE_REJECT, entityType: AdminAuditEntity.VENUE, entityId: { in: ["r1", "r2"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
  });

  it("aucun refus sur la page : le journal n'est pas interrogé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.venue.findMany.mockResolvedValueOnce([queueRow()]);

    await service.listPending({ page: 1, pageSize: 10 });

    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("R-1 — la lecture de la file ne sélectionne AUCUN taux", async () => {
    const { service, prisma } = buildService();
    prisma.venue.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prisma.venue.findMany.mockResolvedValue([]);

    await service.listPending({ page: 1, pageSize: 10 });

    for (const appel of prisma.venue.findMany.mock.calls) {
      expect(JSON.stringify((appel[0] as { select: unknown }).select)).not.toMatch(/commissionRateBps|cashbackRateBps/);
    }
  });
});

describe("VenuesAdminService.detail — une salle pour l'admin (taux AFFICHÉS en lecture seule, R-1)", () => {
  it("id hors motif UUID : 404 sans toucher la base", async () => {
    const { service, prisma } = buildService();
    expect(await erreurDe(service.detail("pas-un-uuid"))).toBeInstanceOf(NotFoundException);
    expect(prisma.venue.findFirst).not.toHaveBeenCalled();
  });

  it("inexistante ou supprimée : le MÊME 404 (le WHERE admin exclut les supprimées)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(null);
    const echec = await erreurDe(service.detail(VENUE_ID));
    expect(echec).toBeInstanceOf(NotFoundException);
    expect(codeOf(echec)).toBe("VENUE_NOT_FOUND");
    expect(prisma.venue.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: VENUE_ID, deletedAt: null } }));
  });

  it("rend la vue admin + numéro, ville, propriétaire, créneaux actifs ; un brouillon jamais rejeté n'a pas de refus", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(
      adminRow({ number: 12, city: { nameFr: "Hydra", nameAr: "حيدرة" }, owner: { businessName: "Salles Pro" }, _count: { slotTemplates: 3 } })
    );

    const dto = await service.detail(VENUE_ID);

    expect(dto).toMatchObject({
      id: VENUE_ID,
      number: 12,
      cityNameFr: "Hydra",
      cityNameAr: "حيدرة",
      ownerBusinessName: "Salles Pro",
      activeSlotCount: 3,
      commissionRateBps: 100,
      cashbackRateBps: 0,
      rejection: null
    });
    expect(prisma.auditLog.findFirst).not.toHaveBeenCalled();
  });

  it("un brouillon rejeté : le motif et la date lue au journal ; la clé brute `rejectionReason` n'est JAMAIS une clé de la réponse", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(
      adminRow({
        number: 12,
        rejectionReason: "Un motif",
        city: { nameFr: "Hydra", nameAr: "حيدرة" },
        owner: { businessName: "Salles Pro" },
        _count: { slotTemplates: 1 }
      })
    );
    prisma.auditLog.findFirst.mockResolvedValue({ createdAt: REJETE_LE });

    const dto = await service.detail(VENUE_ID);

    expect(dto.rejection).toEqual({ reason: "Un motif", rejectedAt: REJETE_LE.toISOString() });
    expect(Object.keys(dto)).not.toContain("rejectionReason");
  });
});

describe("VenuesAdminService.setRates — fusion D35 contre l'existant (R-1 : INCHANGÉ)", () => {
  it("cashback seul > commission stockée : 400 CASHBACK_EXCEEDS_COMMISSION, update jamais appelé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 200 }));

    await expect(service.setRates(VENUE_ID, { cashbackRateBps: 300 })).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "CASHBACK_EXCEEDS_COMMISSION"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });

  it("égalité admise (cashback = commission, D35 : ≤) ; corps partiel écrit tel quel", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 300 }));
    prisma.venue.update.mockResolvedValue(adminRow({ commissionRateBps: 300, cashbackRateBps: 300 }));

    const dto = await service.setRates(VENUE_ID, { cashbackRateBps: 300 });

    expect(prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID }, data: { cashbackRateBps: 300 } })
    );
    expect(dto.cashbackRateBps).toBe(300);
  });

  it("baisser la commission SOUS le cashback stocké est refusé aussi (fusion symétrique)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 400, cashbackRateBps: 300 }));

    await expect(service.setRates(VENUE_ID, { commissionRateBps: 200 })).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "CASHBACK_EXCEEDS_COMMISSION"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });

  it("R-1 — le réglage des taux n'écrit AUCUNE ligne de journal (il ne l'était pas avant, il ne l'est pas : MD-ADM-17)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 300 }));
    prisma.venue.update.mockResolvedValue(adminRow({ commissionRateBps: 300, cashbackRateBps: 200 }));

    await service.setRates(VENUE_ID, { cashbackRateBps: 200 });

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
