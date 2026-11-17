// Intégration ADM-2 (D350, rang 52, R-2) — la file des suppressions de compte sous COURSE, sur PostgreSQL réel.
//
// POURQUOI AVANT LES ÉCRANS. L'écran d'ADM-2 donne un bouton à une action IRRÉVERSIBLE (l'approbation anonymise le compte et archive ses salles). Le relecteur a constaté PAR LECTURE que
// `approve` lit la demande « en attente » AVANT sa transaction puis écrit par `id` (D117 / D121) ; l'annulation par l'utilisateur, elle, est un check-and-set. Ce fichier MESURE ce que la lecture
// laisse craindre : deux approbations simultanées, une approbation pendant que l'utilisateur ANNULE, un rejet contre une approbation (dans les deux ordres).
//
// ⚠ L'ENTRELACEMENT EST FORCÉ, PAS ESPÉRÉ. Un décalage de quelques millisecondes (patron de `admin-moderation.int-spec.ts`) balaie des entrelacements sans en garantir aucun. Ici une transaction
// tenue HORS du service verrouille la ligne de la demande ; les requêtes partent, on ATTEND (par `pg_stat_activity`) qu'elles soient bloquées sur le verrou, puis on le relâche. L'ordre d'arrivée
// est celui qu'on a choisi : PostgreSQL réveille les attentes dans l'ordre où elles se sont mises en file.
// ⛔ Les verdicts s'écrivent par `expect` de vitest (D305) : un `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError`.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AdminAuditAction, AdminAuditEntity, type DeletionRequestDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
import { holdRow, waitBlocked as waitBlockedOn } from "./row-lock";

let ctx: TestContext;

const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };
const NOT_PENDING = "DELETION_REQUEST_NOT_PENDING";

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let clientToken: string;
let requestId: string;

beforeAll(async () => {
  ctx = await createTestApp();
  // Un serveur qui ÉCOUTE : sans lui, supertest ouvre et FERME un serveur éphémère par requête, et des requêtes qui attendent chacune un verrou se marchent dessus (`read ECONNRESET`).
  await ctx.app.listen(0);
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
  ctx.emails.length = 0;
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await registerUser(ctx, CLIENT);
  clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
  const created = await api().post("/api/v1/me/deletion-request").set(authH(clientToken)).send({});
  requestId = (created.body as DeletionRequestDTO).id;
  ctx.emails.length = 0;
});

const approve = (id = requestId) => api().post(`/api/v1/admin/deletion-requests/${id}/approve`).set(authH(adminToken)).send({}).then((r) => r);
const rejectIt = (id = requestId) =>
  api().post(`/api/v1/admin/deletion-requests/${id}/reject`).set(authH(adminToken)).send({ decisionNote: "Commissions en cours." }).then((r) => r);

const holdRequestRow = (action?: Parameters<typeof holdRow>[3]) => holdRow(ctx.prisma, "account_deletion_requests", requestId, action);
const waitBlocked = (n: number) => waitBlockedOn(ctx.prisma, n);

const requestRow = () => ctx.prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } });
const userRow = () => ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT.email } });
const journal = () =>
  ctx.prisma.auditLog.findMany({ where: { entityType: AdminAuditEntity.DELETION_REQUEST, entityId: requestId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
/** Les e-mails de DÉCISION partis (l'adresse a été capturée avant l'anonymisation : c'est elle qui les reçoit). */
const decisionEmails = () => ctx.emails.filter((m) => m.to === CLIENT.email);

describe("R-2 — approuver pendant que l'utilisateur ANNULE : le compte ne s'anonymise pas", () => {
  it("l'annulation (validée) précède l'écriture de l'approbation : 400 DELETION_REQUEST_NOT_PENDING, la demande reste ANNULÉE, le compte ACTIF, aucune ligne de journal, aucun e-mail", async () => {
    // L'utilisateur annule : sa transaction a ÉCRIT « annulée » et n'a pas encore validé. L'approbation lit « en attente » (la ligne annulée n'est pas encore visible), puis bute sur le verrou.
    const annulation = holdRequestRow(async (tx) => {
      await tx.accountDeletionRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", decidedAt: new Date() } });
    });
    await annulation.ready;
    const reponse = approve();
    try {
      await waitBlocked(1);
    } finally {
      annulation.release();
    }
    await annulation.done;
    const res = await reponse;

    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(res.body.message.code).toBe(NOT_PENDING);
    expect((await requestRow()).status).toBe("CANCELLED");
    expect((await userRow()).status).toBe("ACTIVE");
    expect(await journal()).toHaveLength(0);
    expect(decisionEmails()).toHaveLength(0);
  });
});

describe("R-2 — approuver DEUX fois en même temps : une approbation, une trace, un e-mail", () => {
  it("deux approbations bloquées sur la même demande : l'une gagne (200), l'autre est refusée (400 DELETION_REQUEST_NOT_PENDING) ; UNE ligne `account_deletion.approve` ; UN e-mail", async () => {
    const verrou = holdRequestRow();
    await verrou.ready;
    const a = approve();
    await waitBlocked(1);
    const b = approve();
    try {
      await waitBlocked(2);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const [ra, rb] = await Promise.all([a, b]);

    const statuts = [ra.status, rb.status].sort();
    expect(statuts, `${JSON.stringify(ra.body)} / ${JSON.stringify(rb.body)}`).toEqual([200, 400]);
    const perdante = ra.status === 400 ? ra : rb;
    expect(perdante.body.message.code).toBe(NOT_PENDING);
    expect((await requestRow()).status).toBe("APPROVED");
    expect((await userRow()).status).toBe("ANONYMIZED");
    const lignes = await journal();
    expect(lignes).toHaveLength(1);
    expect(lignes[0]?.action).toBe(AdminAuditAction.DELETION_APPROVE);
    expect(decisionEmails()).toHaveLength(1);
  });
});

describe("R-2 — rejeter × approuver : une décision, une seule, dans l'ordre d'arrivée", () => {
  it("le REJET arrive en premier, l'approbation derrière : le rejet gagne (200), l'approbation est refusée (400) ; le compte reste ACTIF ; UNE ligne `account_deletion.reject`", async () => {
    const verrou = holdRequestRow();
    await verrou.ready;
    const rejet = rejectIt();
    await waitBlocked(1);
    const approbation = approve();
    try {
      await waitBlocked(2);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const [rr, ra] = await Promise.all([rejet, approbation]);

    expect([rr.status, ra.status], `${JSON.stringify(rr.body)} / ${JSON.stringify(ra.body)}`).toEqual([200, 400]);
    expect(ra.body.message.code).toBe(NOT_PENDING);
    expect((await requestRow()).status).toBe("REJECTED");
    expect((await userRow()).status).toBe("ACTIVE");
    const lignes = await journal();
    expect(lignes.map((l) => l.action)).toEqual([AdminAuditAction.DELETION_REJECT]);
  });

  it("l'APPROBATION arrive en première, le rejet derrière : l'approbation gagne (200), le rejet est refusé (400) ; le compte est ANONYMISÉ ; UNE ligne `account_deletion.approve` ; le compte supprimé ne reçoit PAS d'e-mail de refus", async () => {
    const verrou = holdRequestRow();
    await verrou.ready;
    const approbation = approve();
    await waitBlocked(1);
    const rejet = rejectIt();
    try {
      await waitBlocked(2);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const [ra, rr] = await Promise.all([approbation, rejet]);

    expect([ra.status, rr.status], `${JSON.stringify(ra.body)} / ${JSON.stringify(rr.body)}`).toEqual([200, 400]);
    expect(rr.body.message.code).toBe(NOT_PENDING);
    expect((await requestRow()).status).toBe("APPROVED");
    expect((await userRow()).status).toBe("ANONYMIZED");
    const lignes = await journal();
    expect(lignes.map((l) => l.action)).toEqual([AdminAuditAction.DELETION_APPROVE]);
    expect(decisionEmails()).toHaveLength(1);
  });
});
