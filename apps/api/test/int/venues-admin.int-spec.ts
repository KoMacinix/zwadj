// Intégration Lot A3 — endpoints ADMIN (publication + taux D35) sur base
// PostgreSQL réelle. Ce qui ne se prouve QU'ICI : les guards @Roles(ADMIN)
// (CLIENT et PRO refusés), la publication vue depuis la liste publique, et
// surtout le CHECK SQL venues_cashback_rate_range — le filet mécanique D35
// sous la validation applicative (écriture Prisma directe rejetée par Postgres).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueAdminDTO, VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Session ADMIN : registre CLIENT vérifié puis élévation en base (patron rbac). */
async function adminSession(): Promise<string> {
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  return loginAs(ctx, ADMIN.email, ADMIN.password);
}

/** Session PRO complète + une salle DRAFT créée via la vraie route (retourne
 *  aussi le token pro, pour vérifier qu'un pro ne voit jamais les taux). */
async function proWithVenue(): Promise<{ proToken: string; venue: VenueProDTO }> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const proToken = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const res = await api()
    .post("/api/v1/venues")
    .set(authH(proToken))
    .send({
      cityId: city.id,
      nameFr: "Salle El Ferdous",
      nameAr: "قاعة الفردوس",
      capacityMin: 100,
      capacityMax: 450,
      basePriceCents: 18_000_000
    });
  if (res.status !== 201) throw new Error(`seed pro venue: ${res.status} ${JSON.stringify(res.body)}`);
  return { proToken, venue: res.body as VenueProDTO };
}

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Accès admin (guards)", () => {
  it("anonyme → 401 ; CLIENT → 403 ; PRO → 403 (même sur SA salle) — publish et taux", async () => {
    const { proToken, venue } = await proWithVenue();

    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).expect(401);

    await registerUser(ctx, { role: "CLIENT", email: "c@example.dz", password: "Motdepasse1", firstName: "C", lastName: "L" });
    const clientToken = await loginAs(ctx, "c@example.dz", "Motdepasse1");
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(clientToken)).expect(403);

    // Un PRO reste interdit d'admin, y compris sur sa propre salle.
    await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(proToken)).expect(403);
    await api()
      .patch(`/api/v1/admin/venues/${venue.id}/commission-rate`)
      .set(authH(proToken))
      .send({ cashbackRateBps: 100 })
      .expect(403);
  });
});

describe("POST /admin/venues/:id/publish — one-way idempotent", () => {
  it("rend la salle visible publiquement ; re-publier = 200 sans changer updatedAt", async () => {
    const { venue } = await proWithVenue();
    const adminToken = await adminSession();

    // Avant publication : absente de la liste publique.
    expect((await api().get("/api/v1/venues").expect(200)).body.total).toBe(0);

    const first = await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(adminToken)).expect(200);
    const published = first.body as VenueAdminDTO;
    expect(published.publicationStatus).toBe("PUBLISHED");
    expect(published.commissionRateBps).toBe(100); // la vue ADMIN porte les taux
    expect(published.cashbackRateBps).toBe(0);

    // Désormais visible publiquement.
    expect((await api().get("/api/v1/venues").expect(200)).body.total).toBe(1);

    // Idempotence : deuxième publish sans effet, updatedAt figé.
    const again = await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(adminToken)).expect(200);
    expect((again.body as VenueAdminDTO).updatedAt).toBe(published.updatedAt);
  });

  it("404 indistincts : salle supprimée, uuid inconnu, id malformé — réponse identique", async () => {
    const { proToken, venue } = await proWithVenue();
    const adminToken = await adminSession();
    await api().delete(`/api/v1/venues/${venue.id}`).set(authH(proToken)).expect(204); // soft delete

    for (const id of [venue.id, "018f0000-0000-7000-8000-0000000000ff", "pas-un-uuid"]) {
      const res = await api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(adminToken));
      expect(res.status).toBe(404);
      expect(res.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
    }
  });
});

describe("PATCH /admin/venues/:id/commission-rate — les deux taux D35", () => {
  it("pose les deux, puis un seul (fusion avec l'existant) ; validation applicative du dépassement", async () => {
    const { venue } = await proWithVenue();
    const adminToken = await adminSession();
    const patch = (body: Record<string, unknown>) =>
      api().patch(`/api/v1/admin/venues/${venue.id}/commission-rate`).set(authH(adminToken)).send(body);

    const both = await patch({ commissionRateBps: 300, cashbackRateBps: 150 }).expect(200);
    expect([both.body.commissionRateBps, both.body.cashbackRateBps]).toEqual([300, 150]);

    // cashbackRateBps seul, sous la commission stockée (300) : OK, commission inchangée.
    const one = await patch({ cashbackRateBps: 250 }).expect(200);
    expect([one.body.commissionRateBps, one.body.cashbackRateBps]).toEqual([300, 250]);

    // cashback seul AU-DESSUS de la commission stockée : 400 explicite (pas l'erreur SQL).
    const bad = await patch({ cashbackRateBps: 400 });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toEqual({ code: "CASHBACK_EXCEEDS_COMMISSION", message: "venue.errors.cashbackExceedsCommission" });

    // Abaisser la commission SOUS le cashback stocké (250) : refusé aussi.
    const badCommission = await patch({ commissionRateBps: 100 });
    expect(badCommission.status).toBe(400);
    expect(badCommission.body.message.code).toBe("CASHBACK_EXCEEDS_COMMISSION");

    // Bornes Zod : commission hors 100–500, cashback négatif, corps vide, clé interdite.
    expect((await patch({ commissionRateBps: 99 })).status).toBe(400);
    expect((await patch({ cashbackRateBps: -1 })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ basePriceCents: 1 })).status).toBe(400); // .strict()
  });

  it("CHECK SQL venues_cashback_rate_range : Postgres rejette cashback > commission même en écriture directe", async () => {
    const { venue } = await proWithVenue();
    // On contourne délibérément la couche service pour éprouver le FILET mécanique.
    await expect(
      ctx.prisma.venue.update({ where: { id: venue.id }, data: { commissionRateBps: 200, cashbackRateBps: 300 } })
    ).rejects.toThrow();

    // La contrainte tolère l'égalité (D35 : cashback ≤ commission).
    const ok = await ctx.prisma.venue.update({
      where: { id: venue.id },
      data: { commissionRateBps: 300, cashbackRateBps: 300 }
    });
    expect(ok.cashbackRateBps).toBe(300);
  });
});
