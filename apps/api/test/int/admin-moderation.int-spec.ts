// Intégration ADM-1 (D349, rang 51) — la MODÉRATION des salles par l'admin, sur PostgreSQL réel : la file « en attente de publication », le détail, le rejet avec motif obligatoire,
// publier qui efface le motif, la course publier / rejeter (MD-ADM-4) et la route de LECTURE du refus par le pro (R-3).
//
// Ce qui ne se prouve QU'ICI : le filtre vit dans le `where` (le total et la dernière page sont vrais, MD-ADM-8), le statut se décide DANS la transaction (deux gestes simultanés ne laissent
// jamais une salle publiée avec un motif de rejet), la date d'un refus est celle de la ligne du journal, et le contrat étroit du pro ne laisse rien passer d'autre.
// ⛔ Les verdicts s'écrivent par `expect` de vitest (D305) : un `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError`.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AdminAuditAction, AdminAuditEntity } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
import { holdRow, waitBlocked } from "./row-lock";

let ctx: TestContext;

const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const PRO2 = { role: "PRO", email: "pro2@example.dz", password: "Motdepasse1", businessName: "Autres Salles", phone: "+213550000010" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Cli", lastName: "Ent" };
const MOTIF = "Les photos sont floues. Merci de les remplacer.";
const NOT_FOUND = { code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" };

const api = () => request(ctx.app.getHttpServer());
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let adminId: string;
let proToken: string;
let proProfileId: string;
let cityId: string;
let n = 0;

async function session(user: Record<string, unknown>, role?: "ADMIN"): Promise<string> {
  await registerUser(ctx, user);
  await verifyLastRegistered(ctx);
  if (role) await ctx.prisma.user.update({ where: { email: user.email as string }, data: { role } });
  return loginAs(ctx, user.email as string, user.password as string);
}

/** Une salle posée DIRECTEMENT en base (aucune route : on prépare un ÉTAT, on ne teste pas la création). `minutes` ordonne `createdAt` de façon déterministe. */
async function seedVenue(
  o: {
    name?: string;
    publicationStatus?: "DRAFT" | "PUBLISHED";
    deleted?: boolean;
    rejectionReason?: string | null;
    slots?: boolean[]; // l'état `isActive` de chaque créneau ; défaut : un créneau actif
    minutes?: number;
    ownerId?: string;
  } = {}
): Promise<string> {
  n += 1;
  const row = await ctx.prisma.venue.create({
    data: {
      ownerId: o.ownerId ?? proProfileId,
      cityId,
      slug: `salle-${n}`,
      nameFr: o.name ?? `Salle ${n}`,
      nameAr: `قاعة ${n}`,
      capacityMax: 300,
      basePriceCents: 18_000_000,
      publicationStatus: o.publicationStatus ?? "DRAFT",
      deletedAt: o.deleted ? new Date("2026-10-01T00:00:00Z") : null,
      rejectionReason: o.rejectionReason ?? null,
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, o.minutes ?? n, 0)),
      slotTemplates: {
        create: (o.slots ?? [true]).map((isActive, i) => ({
          nameFr: `Créneau ${i}`,
          nameAr: "فترة",
          startMinutes: 600 + 180 * i,
          endMinutes: 720 + 180 * i,
          basePriceCents: 18_000_000,
          isActive
        }))
      }
    },
    select: { id: true }
  });
  return row.id;
}

const journalOf = (entityId: string) =>
  ctx.prisma.auditLog.findMany({ where: { entityId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
const venueOf = (id: string) => ctx.prisma.venue.findUniqueOrThrow({ where: { id } });
const reject = (id: string, body: Record<string, unknown> = { reason: MOTIF }, token = adminToken) =>
  api().post(`/api/v1/admin/venues/${id}/reject`).set(authH(token)).send(body);
const publish = (id: string, token = adminToken) => api().post(`/api/v1/admin/venues/${id}/publish`).set(authH(token));
const queue = (query = "", token = adminToken) => api().get(`/api/v1/admin/venues/pending-publication${query}`).set(authH(token));
const idsOf = (res: { body: { items: { id: string }[] } }) => res.body.items.map((i) => i.id);

beforeAll(async () => {
  ctx = await createTestApp();
  // Un serveur qui ÉCOUTE : sans lui, supertest ouvre et FERME un serveur éphémère par requête, et deux requêtes décalées dans le temps (la course) se marchent dessus (`read ECONNRESET`).
  await ctx.app.listen(0);
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
  n = 0;
  adminToken = await session(ADMIN, "ADMIN");
  adminId = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } })).id;
  proToken = await session(PRO);
  proProfileId = (await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO.email } } })).id;
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  cityId = (await ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 } })).id;
});

describe("GET /admin/venues/pending-publication — la file (D-6 l2, MD-ADM-8)", () => {
  it("ne rend QUE les brouillons vivants qui ont au moins un créneau ACTIF — jamais une publiée, une supprimée, une sans créneau, une dont les créneaux sont tous inactifs", async () => {
    const a = await seedVenue();
    const b = await seedVenue();
    await seedVenue({ publicationStatus: "PUBLISHED" });
    await seedVenue({ deleted: true });
    await seedVenue({ slots: [] });
    await seedVenue({ slots: [false] });
    const mixte = await seedVenue({ slots: [false, true] }); // un seul créneau actif suffit

    const res = await queue();
    expect(res.status).toBe(200);
    expect(idsOf(res)).toEqual([a, b, mixte]);
    expect(res.body.total).toBe(3);
  });

  it("MD-ADM-8 — le filtre vit dans le WHERE : le total est celui du jeu FILTRÉ et la dernière page n'est pas vide", async () => {
    const attendus: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      attendus.push(await seedVenue());
      await seedVenue({ publicationStatus: "PUBLISHED" }); // du bruit entre les lignes qualifiées
      await seedVenue({ slots: [] });
    }
    const vus: string[] = [];
    for (const page of [1, 2, 3]) {
      const res = await queue(`?page=${page}&pageSize=2`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 5, page, pageSize: 2 });
      vus.push(...idsOf(res));
    }
    expect(vus).toEqual(attendus);
    expect(idsOf(await queue("?page=4&pageSize=2"))).toEqual([]); // au-delà de la fin : vide, jamais un retour au début
  });

  it("R-2 — les salles déjà rejetées RESTENT dans la file, rangées APRÈS les autres ; chaque groupe par date de création ; une page peut chevaucher les deux", async () => {
    const r1 = await seedVenue({ minutes: 1, rejectionReason: "M1" });
    const n1 = await seedVenue({ minutes: 2 });
    const r2 = await seedVenue({ minutes: 3, rejectionReason: "M2" });
    const n2 = await seedVenue({ minutes: 4 });

    expect(idsOf(await queue())).toEqual([n1, n2, r1, r2]);
    expect(idsOf(await queue("?page=1&pageSize=3"))).toEqual([n1, n2, r1]);
    expect(idsOf(await queue("?page=2&pageSize=3"))).toEqual([r2]);
    expect(idsOf(await queue("?page=2&pageSize=2"))).toEqual([r1, r2]);
  });

  it("une salle rejetée porte son motif et la DATE de la ligne du journal ; une autre n'a pas de refus", async () => {
    const libre = await seedVenue({ minutes: 1 });
    const rejetee = await seedVenue({ minutes: 2 });
    expect((await reject(rejetee)).status).toBe(200);
    const ligne = (await journalOf(rejetee)).find((l) => l.action === AdminAuditAction.VENUE_REJECT);

    const res = await queue();
    const items = res.body.items as { id: string; rejection: unknown; ownerBusinessName: string; activeSlotCount: number; cityNameFr: string }[];
    expect(items.find((i) => i.id === libre)?.rejection).toBeNull();
    expect(items.find((i) => i.id === rejetee)?.rejection).toEqual({ reason: MOTIF, rejectedAt: ligne!.createdAt.toISOString() });
    expect(items[0]).toMatchObject({ ownerBusinessName: "Salles Pro", cityNameFr: "Hydra", activeSlotCount: 1 });
  });

  it("R-1 — la réponse ne porte AUCUN taux, nulle part", async () => {
    await seedVenue();
    const res = await queue();
    expect(JSON.stringify(res.body)).not.toMatch(/commissionRateBps|cashbackRateBps/);
  });

  it("les paramètres hors bornes sont refusés : taille 51, page 0, clé inconnue", async () => {
    expect((await queue("?pageSize=51")).status).toBe(400);
    expect((await queue("?page=0")).status).toBe(400);
    expect((await queue("?status=PUBLISHED")).status).toBe(400);
  });

  it("l'URL `pending-publication` n'est PAS lue comme un identifiant (la route statique passe avant `:id`)", async () => {
    const res = await queue();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
  });
});

describe("GET /admin/venues/:id — le détail", () => {
  it("rend la vue admin (les taux EXISTANTS, en lecture), le numéro, la ville, le propriétaire, les créneaux actifs ; un brouillon jamais rejeté n'a pas de refus", async () => {
    const id = await seedVenue({ slots: [true, true, false] });
    const res = await api().get(`/api/v1/admin/venues/${id}`).set(authH(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      publicationStatus: "DRAFT",
      commissionRateBps: 100,
      cashbackRateBps: 0,
      cityNameFr: "Hydra",
      ownerBusinessName: "Salles Pro",
      activeSlotCount: 2,
      rejection: null
    });
    expect(typeof res.body.number).toBe("number");
    expect(res.body.slotTemplates).toHaveLength(3);
    expect(Object.keys(res.body)).not.toContain("rejectionReason");
  });

  it("une salle PUBLIÉE se lit aussi (l'admin voit toute salle vivante) ; une rejetée porte son motif et sa date", async () => {
    const publiee = await seedVenue({ publicationStatus: "PUBLISHED" });
    expect((await api().get(`/api/v1/admin/venues/${publiee}`).set(authH(adminToken))).status).toBe(200);

    const rejetee = await seedVenue();
    await reject(rejetee);
    const ligne = (await journalOf(rejetee)).find((l) => l.action === AdminAuditAction.VENUE_REJECT);
    const res = await api().get(`/api/v1/admin/venues/${rejetee}`).set(authH(adminToken));
    expect(res.body.rejection).toEqual({ reason: MOTIF, rejectedAt: ligne!.createdAt.toISOString() });
  });

  it("404 indistincts : supprimée, uuid inconnu, id malformé — la même réponse", async () => {
    const supprimee = await seedVenue({ deleted: true });
    for (const id of [supprimee, "018f0000-0000-7000-8000-0000000000ff", "pas-un-uuid"]) {
      const res = await api().get(`/api/v1/admin/venues/${id}`).set(authH(adminToken));
      expect(res.status).toBe(404);
      expect(res.body.message).toEqual(NOT_FOUND);
    }
  });
});

describe("POST /admin/venues/:id/reject — D-4, R-2", () => {
  it("la salle reste en BROUILLON avec son créneau ; le motif est stocké (rogné) ; la réponse dit le refus ; UNE ligne de journal le porte", async () => {
    const id = await seedVenue();
    const res = await reject(id, { reason: `  ${MOTIF}  ` });

    expect(res.status).toBe(200);
    const ligne = (await journalOf(id))[0]!;
    expect(res.body).toEqual({ id, publicationStatus: "DRAFT", rejection: { reason: MOTIF, rejectedAt: ligne.createdAt.toISOString() } });
    const salle = await venueOf(id);
    expect(salle.publicationStatus).toBe("DRAFT");
    expect(salle.rejectionReason).toBe(MOTIF);
    expect(await ctx.prisma.slotTemplate.count({ where: { venueId: id, isActive: true } })).toBe(1); // le créneau est INTACT

    expect(await journalOf(id)).toHaveLength(1);
    expect(ligne).toMatchObject({
      actorId: adminId,
      actorRole: "ADMIN",
      action: AdminAuditAction.VENUE_REJECT,
      entityType: AdminAuditEntity.VENUE,
      entityId: id,
      before: { rejectionReason: null },
      after: { rejectionReason: MOTIF }
    });
  });

  it("le motif est OBLIGATOIRE : corps vide, motif vide ou blanc, trop long, clé inconnue ⇒ 400, rien n'est écrit", async () => {
    const id = await seedVenue();
    for (const body of [{}, { reason: "" }, { reason: "   " }, { reason: "x".repeat(1001) }, { reason: MOTIF, publicationStatus: "PUBLISHED" }]) {
      expect((await reject(id, body)).status).toBe(400);
    }
    expect((await venueOf(id)).rejectionReason).toBeNull();
    expect(await journalOf(id)).toHaveLength(0);
  });

  it("404 indistincts : supprimée, uuid inconnu, id malformé — la même réponse, AUCUNE ligne de journal", async () => {
    const supprimee = await seedVenue({ deleted: true });
    for (const id of [supprimee, "018f0000-0000-7000-8000-0000000000ff", "pas-un-uuid"]) {
      const res = await reject(id);
      expect(res.status).toBe(404);
      expect(res.body.message).toEqual(NOT_FOUND);
    }
    expect(await ctx.prisma.auditLog.count()).toBe(0);
  });

  it("MD-ADM-4 — rejeter une salle PUBLIÉE est refusé (409 VENUE_NOT_DRAFT) : rien n'est écrit, aucune ligne de journal", async () => {
    const id = await seedVenue({ publicationStatus: "PUBLISHED" });
    const res = await reject(id);
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("VENUE_NOT_DRAFT");
    expect((await venueOf(id)).rejectionReason).toBeNull();
    expect(await journalOf(id)).toHaveLength(0);
  });

  it("« même état, même requête, même réponse » — rejeter DEUX FOIS avec le même motif : la même réponse, UNE seule ligne de journal", async () => {
    const id = await seedVenue();
    const un = await reject(id);
    const deux = await reject(id);
    expect(un.status).toBe(200);
    expect(deux.status).toBe(200);
    expect(deux.body).toEqual(un.body);
    expect(await journalOf(id)).toHaveLength(1);
  });

  it("R-3 (D350, 1 c de la consigne) — un AUTRE motif sur une salle déjà rejetée la CORRIGE : 200, le nouveau motif REMPLACE l'ancien sur la salle, la réponse porte le nouveau motif, la salle reste un brouillon", async () => {
    const id = await seedVenue();
    await reject(id);
    const res = await reject(id, { reason: "Un autre motif" });
    expect(res.status).toBe(200);
    expect(res.body.publicationStatus).toBe("DRAFT");
    expect(res.body.rejection.reason).toBe("Un autre motif");
    const salle = await venueOf(id);
    expect(salle.rejectionReason).toBe("Un autre motif");
    expect(salle.publicationStatus).toBe("DRAFT");
  });

  it("la ligne de journal d'une correction garde l'ANCIEN et le NOUVEAU motif (avant / après) ; la première ligne garde « jamais rejetée » ; la correction est la ligne la PLUS RÉCENTE (la date du refus)", async () => {
    const id = await seedVenue();
    await reject(id);
    const corrigee = await reject(id, { reason: "Un autre motif" });
    const lignes = await journalOf(id);
    expect(lignes).toHaveLength(2);
    expect(lignes.map((l) => l.action)).toEqual([AdminAuditAction.VENUE_REJECT, AdminAuditAction.VENUE_REJECT]);
    expect(lignes[0]?.before).toEqual({ rejectionReason: null });
    expect(lignes[0]?.after).toEqual({ rejectionReason: MOTIF });
    expect(lignes[1]?.before).toEqual({ rejectionReason: MOTIF });
    expect(lignes[1]?.after).toEqual({ rejectionReason: "Un autre motif" });
    // La date de la réponse est celle de la ligne de la CORRECTION, pas celle du premier rejet.
    expect(corrigee.body.rejection.rejectedAt).toBe(lignes[1]?.createdAt.toISOString());
  });

  it("MD-ADM-4 — corriger avec le MÊME motif que celui en vigueur (rejeu) : 200, la même réponse, AUCUNE ligne de plus", async () => {
    const id = await seedVenue();
    await reject(id);
    await reject(id, { reason: "Un autre motif" });
    const rejeu = await reject(id, { reason: "Un autre motif" });
    const encore = await reject(id, { reason: "  Un autre motif  " });
    expect(rejeu.status).toBe(200);
    expect(encore.status).toBe(200);
    expect(encore.body).toEqual(rejeu.body);
    expect(await journalOf(id)).toHaveLength(2);
  });

  it("corriger TROIS fois de suite : la chaîne du journal est continue (chaque ligne part du motif en vigueur) et la salle porte le dernier motif", async () => {
    const id = await seedVenue();
    for (const reason of ["Premier", "Deuxième", "Troisième"]) expect((await reject(id, { reason })).status).toBe(200);
    const lignes = await journalOf(id);
    expect(lignes.map((l) => [l.before, l.after])).toEqual([
      [{ rejectionReason: null }, { rejectionReason: "Premier" }],
      [{ rejectionReason: "Premier" }, { rejectionReason: "Deuxième" }],
      [{ rejectionReason: "Deuxième" }, { rejectionReason: "Troisième" }]
    ]);
    expect((await venueOf(id)).rejectionReason).toBe("Troisième");
  });

  it("la file ET le détail montrent le NOUVEAU motif et la date de la CORRECTION", async () => {
    const id = await seedVenue();
    await reject(id);
    const corrigee = await reject(id, { reason: "Un autre motif" });
    const file = await queue();
    const ligne = (file.body.items as { id: string; rejection: { reason: string; rejectedAt: string } | null }[]).find((i) => i.id === id);
    expect(ligne?.rejection?.reason).toBe("Un autre motif");
    expect(ligne?.rejection?.rejectedAt).toBe(corrigee.body.rejection.rejectedAt);
    const detail = await api().get(`/api/v1/admin/venues/${id}`).set(authH(adminToken));
    expect(detail.body.rejection.reason).toBe("Un autre motif");
    expect(detail.body.rejection.rejectedAt).toBe(corrigee.body.rejection.rejectedAt);
  });

  it("le motif corrigé est ROGNÉ et BORNÉ comme le premier : trop long ⇒ 400, rien n'est écrit, l'ancien motif reste, aucune ligne de plus", async () => {
    const id = await seedVenue();
    await reject(id);
    const trop = await reject(id, { reason: "x".repeat(1001) });
    const vide = await reject(id, { reason: "   " });
    expect([trop.status, vide.status]).toEqual([400, 400]);
    expect((await venueOf(id)).rejectionReason).toBe(MOTIF);
    expect(await journalOf(id)).toHaveLength(1);
  });

  it("rejetée, PUBLIÉE (le motif s'efface), puis un rejet : 409 VENUE_NOT_DRAFT — le sens unique d'A3-④ tient, la salle publiée ne se corrige pas", async () => {
    const id = await seedVenue();
    await reject(id);
    expect((await publish(id)).status).toBe(200);
    const res = await reject(id, { reason: "Trop tard." });
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("VENUE_NOT_DRAFT");
    const salle = await venueOf(id);
    expect(salle.publicationStatus).toBe("PUBLISHED");
    expect(salle.rejectionReason).toBeNull();
  });
});

describe("POST /admin/venues/:id/publish — publier efface le motif, le journal garde l'histoire (R-2)", () => {
  it("rejetée puis publiée : le motif est effacé de la colonne, la salle est PUBLIÉE, le journal porte le rejet ET la publication, dans cet ordre", async () => {
    const id = await seedVenue();
    await reject(id);
    const res = await publish(id);
    expect(res.status).toBe(200);
    expect(res.body.publicationStatus).toBe("PUBLISHED");

    const salle = await venueOf(id);
    expect(salle.publicationStatus).toBe("PUBLISHED");
    expect(salle.rejectionReason).toBeNull();
    const lignes = await journalOf(id);
    expect(lignes.map((l) => l.action)).toEqual([AdminAuditAction.VENUE_REJECT, AdminAuditAction.VENUE_PUBLISH]);
    expect(lignes[0]!.after).toEqual({ rejectionReason: MOTIF }); // l'histoire survit à l'effacement de la colonne
    expect(lignes[1]).toMatchObject({ actorId: adminId, actorRole: "ADMIN", entityType: AdminAuditEntity.VENUE, before: { publicationStatus: "DRAFT" }, after: { publicationStatus: "PUBLISHED" } });
  });

  it("re-publier est IDEMPOTENT : 200, AUCUNE nouvelle ligne de journal, `updatedAt` ne bouge pas", async () => {
    const id = await seedVenue();
    const un = await publish(id);
    const apres = await venueOf(id);
    const deux = await publish(id);
    expect(un.status).toBe(200);
    expect(deux.status).toBe(200);
    expect((await venueOf(id)).updatedAt.toISOString()).toBe(apres.updatedAt.toISOString());
    expect(await journalOf(id)).toHaveLength(1);
  });

  it("D46 — sans créneau ACTIF : 409 SLOT_TEMPLATE_REQUIRED, la salle reste un brouillon, aucune ligne de journal", async () => {
    const id = await seedVenue({ slots: [false] });
    const res = await publish(id);
    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("SLOT_TEMPLATE_REQUIRED");
    expect((await venueOf(id)).publicationStatus).toBe("DRAFT");
    expect(await journalOf(id)).toHaveLength(0);
  });

  it("404 sur une salle supprimée : aucune ligne de journal", async () => {
    const id = await seedVenue({ deleted: true });
    expect((await publish(id)).status).toBe(404);
    expect(await ctx.prisma.auditLog.count()).toBe(0);
  });
});

describe("MD-ADM-4 — la course publier / rejeter : le statut se décide DANS la transaction", () => {
  it("publier et rejeter en MÊME TEMPS, vingt fois : jamais une salle publiée qui garde un motif de rejet ; la trace correspond à ce qui s'est passé", async () => {
    for (let tour = 0; tour < 20; tour += 1) {
      const id = await seedVenue();
      // Le rejet part avec un décalage de 0 à 24 ms selon le tour. Sans lui, le rejet (deux écritures) finit presque toujours AVANT la publication (cinq) et la course « le rejet arrive APRÈS la publication »
      // ne se produit jamais : mesuré à la première campagne du lot, la mutation « le rejet n'est plus conditionné au statut » laissait ce test VERT. Le décalage balaie les entrelacements.
      const [p, r] = await Promise.all([publish(id), pause((tour % 5) * 6).then(() => reject(id))]);

      expect(p.status, `tour ${tour} : publier`).toBe(200);
      expect([200, 409], `tour ${tour} : rejeter`).toContain(r.status);
      const salle = await venueOf(id);
      expect(salle.publicationStatus, `tour ${tour}`).toBe("PUBLISHED");
      expect(salle.rejectionReason, `tour ${tour} : une salle publiée ne garde jamais son motif`).toBeNull();

      const actions = (await journalOf(id)).map((l) => l.action);
      expect(actions.filter((a) => a === AdminAuditAction.VENUE_PUBLISH), `tour ${tour}`).toHaveLength(1);
      // un rejet qui a répondu 200 a UNE ligne ; un rejet refusé n'en a AUCUNE (jamais une trace sans action, jamais une action sans trace)
      expect(actions.filter((a) => a === AdminAuditAction.VENUE_REJECT), `tour ${tour}`).toHaveLength(r.status === 200 ? 1 : 0);
      if (r.status === 409) expect(r.body.message.code).toBe("VENUE_NOT_DRAFT");
    }
  });

  it("rejeter DEUX FOIS en même temps (même motif) : deux 200, UNE ligne de journal", async () => {
    for (let tour = 0; tour < 8; tour += 1) {
      const id = await seedVenue();
      const [a, b] = await Promise.all([reject(id), reject(id)]);
      expect([a.status, b.status], `tour ${tour}`).toEqual([200, 200]);
      expect(a.body, `tour ${tour}`).toEqual(b.body);
      expect(await journalOf(id), `tour ${tour}`).toHaveLength(1);
    }
  });

  it("publier DEUX FOIS en même temps : deux 200, UNE ligne de journal", async () => {
    for (let tour = 0; tour < 8; tour += 1) {
      const id = await seedVenue();
      const [a, b] = await Promise.all([publish(id), publish(id)]);
      expect([a.status, b.status], `tour ${tour}`).toEqual([200, 200]);
      expect(await journalOf(id), `tour ${tour}`).toHaveLength(1);
    }
  });
});

describe("R-3 — la course de deux corrections (MD-ADM-4) : l'entrelacement est FORCÉ par un verrou de ligne, pas par un décalage", () => {
  it("deux corrections à motifs DIFFÉRENTS sur une salle déjà rejetée, bloquées sur la même ligne : l'une passe (200), l'autre est refusée (409 VENUE_ALREADY_REJECTED, jamais écrasée) ; la salle porte le motif de la gagnante ; la chaîne du journal est continue", async () => {
    const id = await seedVenue();
    await reject(id);
    const verrou = holdRow(ctx.prisma, "venues", id);
    await verrou.ready;
    const a = reject(id, { reason: "Motif A" }).then((r) => r);
    await waitBlocked(ctx.prisma, 1);
    const b = reject(id, { reason: "Motif B" }).then((r) => r);
    try {
      await waitBlocked(ctx.prisma, 2);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const [ra, rb] = await Promise.all([a, b]);

    expect([ra.status, rb.status], `${JSON.stringify(ra.body)} / ${JSON.stringify(rb.body)}`).toEqual([200, 409]);
    expect(rb.body.message.code).toBe("VENUE_ALREADY_REJECTED");
    expect((await venueOf(id)).rejectionReason).toBe("Motif A");
    const lignes = await journalOf(id);
    expect(lignes.map((l) => [l.before, l.after])).toEqual([
      [{ rejectionReason: null }, { rejectionReason: MOTIF }],
      [{ rejectionReason: MOTIF }, { rejectionReason: "Motif A" }]
    ]);
  });

  it("une correction et une PUBLICATION bloquées sur la même ligne, la publication d'abord : la publication gagne, la correction est refusée (409 VENUE_NOT_DRAFT), la salle est publiée sans motif", async () => {
    const id = await seedVenue();
    await reject(id);
    const verrou = holdRow(ctx.prisma, "venues", id);
    await verrou.ready;
    const p = publish(id).then((r) => r);
    await waitBlocked(ctx.prisma, 1);
    const c = reject(id, { reason: "Trop tard." }).then((r) => r);
    try {
      await waitBlocked(ctx.prisma, 2);
    } finally {
      verrou.release();
    }
    await verrou.done;
    const [rp, rc] = await Promise.all([p, c]);

    expect([rp.status, rc.status], `${JSON.stringify(rp.body)} / ${JSON.stringify(rc.body)}`).toEqual([200, 409]);
    expect(rc.body.message.code).toBe("VENUE_NOT_DRAFT");
    const salle = await venueOf(id);
    expect(salle.publicationStatus).toBe("PUBLISHED");
    expect(salle.rejectionReason).toBeNull();
    expect((await journalOf(id)).map((l) => l.action)).toEqual([AdminAuditAction.VENUE_REJECT, AdminAuditAction.VENUE_PUBLISH]);
  });
});


describe("GET /pro/venues/:id/publication — le pro lit SON refus (R-3, D-5 p2)", () => {
  const read = (id: string, token = proToken) => api().get(`/api/v1/pro/venues/${id}/publication`).set(authH(token));

  it("l'état de publication, le motif et la date — rien d'autre ; la date est celle de la ligne du journal", async () => {
    const id = await seedVenue();
    const avant = await read(id);
    expect(avant.status).toBe(200);
    expect(avant.body).toEqual({ publicationStatus: "DRAFT", rejection: null });

    await reject(id);
    const ligne = (await journalOf(id)).find((l) => l.action === AdminAuditAction.VENUE_REJECT);
    const apres = await read(id);
    expect(apres.body).toEqual({ publicationStatus: "DRAFT", rejection: { reason: MOTIF, rejectedAt: ligne!.createdAt.toISOString() } });
    expect(Object.keys(apres.body).sort()).toEqual(["publicationStatus", "rejection"]);
    expect(Object.keys(apres.body.rejection).sort()).toEqual(["reason", "rejectedAt"]);

    await publish(id);
    expect((await read(id)).body).toEqual({ publicationStatus: "PUBLISHED", rejection: null });
  });

  it("404 indistincts : la salle d'un AUTRE pro, supprimée, uuid inconnu, id malformé — la même réponse", async () => {
    await session(PRO2);
    const autrePro = (await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO2.email } } })).id;
    const autre = await seedVenue({ ownerId: autrePro });
    await reject(autre);
    const supprimee = await seedVenue({ deleted: true });
    for (const id of [autre, supprimee, "018f0000-0000-7000-8000-0000000000ff", "pas-un-uuid"]) {
      const res = await read(id);
      expect(res.status).toBe(404);
      expect(res.body.message).toEqual(NOT_FOUND);
    }
  });

  it("les rôles : un ADMIN → 403, un CLIENT → 403, anonyme → 401", async () => {
    const id = await seedVenue();
    expect((await read(id, adminToken)).status).toBe(403);
    const clientToken = await session(CLIENT);
    expect((await read(id, clientToken)).status).toBe(403);
    expect((await api().get(`/api/v1/pro/venues/${id}/publication`)).status).toBe(401);
  });

  it("R-3 — le contrat PRINCIPAL ne change pas : même une salle rejetée ne laisse passer ni le motif, ni la date, ni `rejectionReason` dans `GET /pro/venues/:id` et `GET /pro/venues`", async () => {
    const id = await seedVenue();
    await reject(id);
    const detail = await api().get(`/api/v1/pro/venues/${id}`).set(authH(proToken));
    const liste = await api().get("/api/v1/pro/venues").set(authH(proToken));
    for (const res of [detail, liste]) {
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain("rejectionReason");
      expect(JSON.stringify(res.body)).not.toContain(MOTIF);
    }
  });
});
