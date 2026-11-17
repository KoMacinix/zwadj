// Intégration ADM-1 (D349, rang 51, R-5, D-8) — le JOURNAL des actions admin, sur PostgreSQL réel : publier, rejeter, approuver une suppression, rejeter une suppression écrivent UNE ligne
// d'`audit_logs` DANS la transaction de l'action.
//
// ⛔ MD-ADM-6 — « une action sans trace, ou une trace sans action » se MESURE par un échec forcé dans la transaction : un déclencheur posé sur `audit_logs` (le temps d'un test) refuse l'insertion
// d'UNE action ; la route répond 500 et l'état doit être EXACTEMENT celui d'avant — puis le déclencheur est retiré et le MÊME appel réussit : ce qui a échoué est bien le journal, pas autre chose.
// Le déclencheur est retiré dans un `finally` : une fuite se verrait dans le test suivant, et on chercherait au mauvais endroit (leçon D-fuites).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AdminAuditAction, AdminAuditEntity } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const NOTE = "Note de décision très confidentielle";

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let adminId: string;
let cityId: string;
let n = 0;

async function session(user: Record<string, unknown>, role?: "ADMIN"): Promise<string> {
  await registerUser(ctx, user);
  await verifyLastRegistered(ctx);
  if (role) await ctx.prisma.user.update({ where: { email: user.email as string }, data: { role } });
  return loginAs(ctx, user.email as string, user.password as string);
}

async function seedVenue(ownerId: string, o: { deleted?: boolean } = {}): Promise<string> {
  n += 1;
  return (
    await ctx.prisma.venue.create({
      data: {
        ownerId,
        cityId,
        slug: `salle-${n}`,
        nameFr: `Salle ${n}`,
        nameAr: `قاعة ${n}`,
        capacityMax: 300,
        basePriceCents: 18_000_000,
        deletedAt: o.deleted ? new Date("2026-10-01T00:00:00Z") : null,
        slotTemplates: { create: [{ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 18_000_000 }] }
      },
      select: { id: true }
    })
  ).id;
}

/** Un pro inscrit (vraie route) et son profil. */
async function proProfileOf(user: Record<string, unknown>) {
  await session(user);
  return ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: user.email as string } } });
}

/** Un pro inscrit, ses salles (vivantes et supprimées), et une demande de suppression PENDING déposée par la VRAIE route. */
async function proWithDeletionRequest(user: Record<string, unknown>, vivantes: number, supprimees = 0) {
  const token = await session(user);
  const profil = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: user.email as string } } });
  for (let i = 0; i < vivantes; i += 1) await seedVenue(profil.id);
  for (let i = 0; i < supprimees; i += 1) await seedVenue(profil.id, { deleted: true });
  const res = await api().post("/api/v1/me/deletion-request").set(authH(token)).send({ reason: "Je ferme" });
  if (res.status !== 201) throw new Error(`demande de suppression de test : ${res.status} ${JSON.stringify(res.body)}`);
  return { requestId: (res.body as { id: string }).id, userId: profil.userId, profilId: profil.id, token };
}

const journalOf = (entityId: string) => ctx.prisma.auditLog.findMany({ where: { entityId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

/** Un déclencheur qui refuse l'insertion d'UNE action du journal : l'échec forcé de MD-ADM-6. */
async function forceAuditFailure(action: string): Promise<void> {
  await ctx.prisma.$executeRawUnsafe(
    "CREATE OR REPLACE FUNCTION adm1_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé du journal (test ADM-1)'; END; $$"
  );
  await ctx.prisma.$executeRawUnsafe(
    `CREATE TRIGGER adm1_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION adm1_fail_audit()`
  );
}
/** Un déclencheur DIFFÉRÉ : il refuse la transaction AU COMMIT, après que TOUT a été écrit — y compris la ligne du journal. Il distingue « la ligne est DANS la transaction » (elle disparaît avec elle) de
 *  « la ligne est écrite à côté » (elle survivrait) : le déclencheur d'insertion ci-dessus ne le voit pas, l'écriture hors transaction échouant aussi. */
async function forceCommitFailure(table: "venues" | "account_deletion_requests"): Promise<void> {
  await ctx.prisma.$executeRawUnsafe(
    "CREATE OR REPLACE FUNCTION adm1_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé au commit (test ADM-1)'; END; $$"
  );
  await ctx.prisma.$executeRawUnsafe(
    `CREATE CONSTRAINT TRIGGER adm1_fail_commit AFTER UPDATE ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adm1_fail_commit()`
  );
}
async function restoreAudit(): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_audit ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS adm1_fail_audit()");
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_commit ON venues");
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS adm1_fail_commit ON account_deletion_requests");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS adm1_fail_commit()");
}

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await restoreAudit();
  await ctx.app.close();
});
beforeEach(async () => {
  await restoreAudit();
  await truncateAll(ctx.prisma);
  n = 0;
  adminToken = await session(ADMIN, "ADMIN");
  adminId = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } })).id;
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  cityId = (await ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 } })).id;
});

describe("chaque action écrit UNE ligne, avec son acteur, son entité et l'avant → après", () => {
  it("publier une salle : `venue.publish`, entité `venue`, l'admin, le statut avant → après", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    expect((await api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(adminToken))).status).toBe(200);

    const lignes = await journalOf(id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      actorId: adminId,
      actorRole: "ADMIN",
      actorMemberId: null,
      action: AdminAuditAction.VENUE_PUBLISH,
      entityType: AdminAuditEntity.VENUE,
      entityId: id,
      before: { publicationStatus: "DRAFT" },
      after: { publicationStatus: "PUBLISHED" }
    });
  });

  it("approuver une suppression : `account_deletion.approve`, le NOMBRE de salles archivées (vivantes seulement) — et NI l'adresse e-mail, NI la note, NI l'identifiant du compte", async () => {
    const { requestId, userId } = await proWithDeletionRequest(PRO, 2, 1);
    const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/approve`).set(authH(adminToken)).send({ decisionNote: NOTE });
    expect(res.status).toBe(200);

    const lignes = await journalOf(requestId);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      actorId: adminId,
      actorRole: "ADMIN",
      action: AdminAuditAction.DELETION_APPROVE,
      entityType: AdminAuditEntity.DELETION_REQUEST,
      entityId: requestId,
      before: { status: "PENDING" },
      after: { status: "APPROVED", archivedVenues: 2 }
    });
    const brut = JSON.stringify(lignes[0]);
    expect(brut).not.toContain(PRO.email);
    expect(brut).not.toContain(NOTE);
    expect(brut).not.toContain(userId);
  });

  it("rejeter une suppression : `account_deletion.reject`, sans la note", async () => {
    const { requestId } = await proWithDeletionRequest(PRO, 1);
    const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/reject`).set(authH(adminToken)).send({ decisionNote: NOTE });
    expect(res.status).toBe(200);

    const lignes = await journalOf(requestId);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      action: AdminAuditAction.DELETION_REJECT,
      entityType: AdminAuditEntity.DELETION_REQUEST,
      entityId: requestId,
      before: { status: "PENDING" },
      after: { status: "REJECTED" }
    });
    expect(JSON.stringify(lignes[0])).not.toContain(NOTE);
  });

  it("une demande déjà décidée : 400, AUCUNE nouvelle ligne", async () => {
    const { requestId } = await proWithDeletionRequest(PRO, 1);
    await api().post(`/api/v1/admin/deletion-requests/${requestId}/reject`).set(authH(adminToken)).send({});
    const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/approve`).set(authH(adminToken)).send({});
    expect(res.status).toBe(400);
    expect(await journalOf(requestId)).toHaveLength(1);
  });

  it("R-1 — le réglage des taux n'écrit AUCUNE ligne (MD-ADM-17 : il n'est pas journalisé)", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    const res = await api().patch(`/api/v1/admin/venues/${id}/commission-rate`).set(authH(adminToken)).send({ commissionRateBps: 300, cashbackRateBps: 100 });
    expect(res.status).toBe(200);
    expect(await ctx.prisma.auditLog.count()).toBe(0);
  });
});

describe("MD-ADM-6 — un journal qui échoue ANNULE l'action (échec forcé dans la transaction)", () => {
  it("publier : la route répond 500, la salle reste un BROUILLON, aucune ligne ; sans le déclencheur, le même appel réussit", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    const avant = await ctx.prisma.venue.findUniqueOrThrow({ where: { id } });
    try {
      await forceAuditFailure(AdminAuditAction.VENUE_PUBLISH);
      const res = await api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(adminToken));
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    const apres = await ctx.prisma.venue.findUniqueOrThrow({ where: { id } });
    expect(apres.publicationStatus).toBe("DRAFT");
    expect(apres.updatedAt.toISOString()).toBe(avant.updatedAt.toISOString());
    expect(await journalOf(id)).toHaveLength(0);

    expect((await api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(adminToken))).status).toBe(200);
    expect(await journalOf(id)).toHaveLength(1);
  });

  it("rejeter une salle : 500, AUCUN motif écrit, aucune ligne ; sans le déclencheur, le même appel réussit", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    try {
      await forceAuditFailure(AdminAuditAction.VENUE_REJECT);
      const res = await api().post(`/api/v1/admin/venues/${id}/reject`).set(authH(adminToken)).send({ reason: "Un motif" });
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.venue.findUniqueOrThrow({ where: { id } })).rejectionReason).toBeNull();
    expect(await journalOf(id)).toHaveLength(0);

    expect((await api().post(`/api/v1/admin/venues/${id}/reject`).set(authH(adminToken)).send({ reason: "Un motif" })).status).toBe(200);
    expect(await journalOf(id)).toHaveLength(1);
  });

  it("approuver une suppression : 500, le compte N'EST PAS anonymisé, les salles ne sont PAS archivées, la demande reste PENDING, aucun e-mail ne part, aucune ligne", async () => {
    const { requestId, userId, profilId } = await proWithDeletionRequest(PRO, 2);
    const emailsAvant = ctx.emails.length;
    try {
      await forceAuditFailure(AdminAuditAction.DELETION_APPROVE);
      const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/approve`).set(authH(adminToken)).send({});
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    const compte = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(compte.status).toBe("ACTIVE");
    expect(compte.email).toBe(PRO.email);
    expect(compte.passwordHash).not.toBeNull();
    expect(await ctx.prisma.venue.count({ where: { ownerId: profilId, deletedAt: null } })).toBe(2);
    expect((await ctx.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe("PENDING");
    expect(await ctx.prisma.accountDeletionArchivedVenue.count({ where: { requestId } })).toBe(0);
    expect(ctx.emails.length).toBe(emailsAvant);
    expect(await journalOf(requestId)).toHaveLength(0);

    expect((await api().post(`/api/v1/admin/deletion-requests/${requestId}/approve`).set(authH(adminToken)).send({})).status).toBe(200);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } })).status).toBe("ANONYMIZED");
    expect(await journalOf(requestId)).toHaveLength(1);
  });

  it("rejeter une suppression : 500, la demande reste PENDING, l'utilisateur n'est PAS notifié, aucune ligne ; sans le déclencheur, le même appel réussit", async () => {
    const { requestId } = await proWithDeletionRequest(PRO, 1);
    const emailsAvant = ctx.emails.length;
    try {
      await forceAuditFailure(AdminAuditAction.DELETION_REJECT);
      const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/reject`).set(authH(adminToken)).send({ decisionNote: NOTE });
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe("PENDING");
    expect(ctx.emails.length).toBe(emailsAvant);
    expect(await journalOf(requestId)).toHaveLength(0);

    expect((await api().post(`/api/v1/admin/deletion-requests/${requestId}/reject`).set(authH(adminToken)).send({ decisionNote: NOTE })).status).toBe(200);
    expect((await ctx.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe("REJECTED");
  });
});

describe("MD-ADM-6 — un échec au COMMIT annule AUSSI la ligne du journal (elle est DANS la transaction, pas à côté)", () => {
  it("publier : un échec au COMMIT annule aussi la ligne", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    try {
      await forceCommitFailure("venues");
      const res = await api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(adminToken));
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.venue.findUniqueOrThrow({ where: { id } })).publicationStatus).toBe("DRAFT");
    expect(await journalOf(id)).toHaveLength(0);
  });

  it("rejeter une salle : un échec au COMMIT annule aussi la ligne", async () => {
    const profil = await proProfileOf(PRO);
    const id = await seedVenue(profil.id);
    try {
      await forceCommitFailure("venues");
      const res = await api().post(`/api/v1/admin/venues/${id}/reject`).set(authH(adminToken)).send({ reason: "Un motif" });
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.venue.findUniqueOrThrow({ where: { id } })).rejectionReason).toBeNull();
    expect(await journalOf(id)).toHaveLength(0);
  });

  it("approuver une suppression : un échec au COMMIT annule aussi la ligne", async () => {
    const { requestId, userId } = await proWithDeletionRequest(PRO, 1);
    try {
      await forceCommitFailure("account_deletion_requests");
      const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/approve`).set(authH(adminToken)).send({});
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } })).status).toBe("ACTIVE");
    expect(await journalOf(requestId)).toHaveLength(0);
  });

  it("rejeter une suppression : un échec au COMMIT annule aussi la ligne", async () => {
    const { requestId } = await proWithDeletionRequest(PRO, 1);
    try {
      await forceCommitFailure("account_deletion_requests");
      const res = await api().post(`/api/v1/admin/deletion-requests/${requestId}/reject`).set(authH(adminToken)).send({});
      expect(res.status).toBe(500);
    } finally {
      await restoreAudit();
    }
    expect((await ctx.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe("PENDING");
    expect(await journalOf(requestId)).toHaveLength(0);
  });
});
