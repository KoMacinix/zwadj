// Intégration — rang 58, L36-3b (D356, R-6, réponse de Ko 1 d) : LA LIGNE D'AUDIT `quote.promote` PORTE `actor_member_id`, sur PostgreSQL réel. CHEMIN D'IDENTITÉ pour l'acteur ; la PROMOTION elle-même ne change pas.
//
// ⛔ LA RÉPONSE DE KO (consigne, 1 d) : « toute ligne d'audit QUI EXISTE DÉJÀ et qu'une action de personnel écrit porte `actor_member_id` — donc `quote.promote` (DR4) le reçoit dans ce lot ». Avant ce lot (D355,
// S-260) la ligne n'écrivait que le compte COMMUN : la couche activée, le journal ne disait pas QUI avait promu.
// ⛔ CE QUI NE CHANGE PAS (D316, par la fonction : si la promotion devait changer autrement, ARRÊT) : la route, son corps, sa réponse, son statut, les copies du nom, le numéro, les montants — seule la clé `actorMemberId`
// de la ligne d'audit s'ajoute. Trois cas : le Manager, un EMPLOYÉ (le membre qui AGIT, pas le propriétaire du compte commun), et la couche ÉTEINTE (nul, comme avant — un témoin déjà vert).
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { QuoteDTO } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { Jar, appeler, creerPro, lignesAudit, membreActif, proActive, type ProFixture } from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

const EVENT_DATE = "2027-09-18";
const NOM = { clientNameLatin: "Amina Bensalem", clientNameAr: "آمنة بن سالم" };

interface Salle {
  venueId: string;
  slotId: string;
}

/** Une salle du PRO et un créneau, par les vraies routes (avec les cookies du pot quand la couche est activée). */
async function salleDe(pro: ProFixture, jar: Jar | undefined): Promise<Salle> {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 } });
  const cree = await appeler(ctx, pro.token, jar, "post", "/api/v1/venues", { cityId: city.id, nameFr: "Salle El Ryad", nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" });
  expect(cree.status, JSON.stringify(cree.body)).toBe(201);
  const venueId = (cree.body as { id: string }).id;
  const creneau = await appeler(ctx, pro.token, jar, "post", `/api/v1/venues/${venueId}/slot-templates`, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000 });
  expect(creneau.status, JSON.stringify(creneau.body)).toBe(201);
  return { venueId, slotId: (creneau.body as { id: string }).id };
}

/** Un BROUILLON (K-4 amendé : `isOfficial: false`) puis la fiche du pro (K-2), puis la PROMOTION. Rend la réponse de la promotion et l'identifiant du devis. */
async function promouvoir(pro: ProFixture, jar: Jar | undefined, salle: Salle): Promise<{ res: Awaited<ReturnType<typeof appeler>>; quoteId: string; ficheId: string }> {
  const brouillon = await appeler(ctx, pro.token, jar, "post", `/api/v1/venues/${salle.venueId}/quotes`, { eventDate: EVENT_DATE, slotTemplateId: salle.slotId, guests: 250, isOfficial: false });
  expect(brouillon.status, JSON.stringify(brouillon.body)).toBe(201);
  const quoteId = (brouillon.body as QuoteDTO).id;
  const fiche = await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/clients", { phone: `+2135500000${String(Math.floor(Math.random() * 90) + 10)}`, nameLatin: "Amina Bensalem" });
  expect(fiche.status, JSON.stringify(fiche.body)).toBe(200);
  const ficheId = (fiche.body as { record: { id: string } }).record.id;
  const res = await appeler(ctx, pro.token, jar, "post", `/api/v1/quotes/${quoteId}/promote`, { clientRecordId: ficheId, ...NOM });
  return { res, quoteId, ficheId };
}

describe("⛔ R-6 — `quote.promote` porte le MEMBRE qui agit quand une session de personnel existe", () => {
  it("le MANAGER promeut : la ligne porte son identifiant dans `actor_member_id` ; le compte commun et son rôle sont ceux d'avant ; `before` et `after` sont inchangés", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const salle = await salleDe(m.pro, m.jar);
    const { res, quoteId, ficheId } = await promouvoir(m.pro, m.jar, salle);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const lignes = await lignesAudit(ctx.prisma, "quote.promote");
    expect(lignes).toHaveLength(1);
    const l = lignes[0]!;
    expect({ actor_id: l.actor_id, actor_role: l.actor_role, actor_member_id: l.actor_member_id, entity_type: l.entity_type, entity_id: l.entity_id }).toEqual({
      actor_id: m.pro.userId,
      actor_role: "PRO",
      actor_member_id: m.membreId,
      entity_type: "quote",
      entity_id: quoteId
    });
    expect(l.before).toEqual({ isOfficial: false, clientRecordId: null });
    expect(l.after).toEqual({ isOfficial: true, clientRecordId: ficheId });
  });

  it("⛔ un EMPLOYÉ promeut : la ligne porte l'EMPLOYÉ, pas le Manager ni le propriétaire — c'est le membre dont la session a passé le garde, celui qui AGIT", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const salle = await salleDe(m.pro, m.jar);
    const e = await membreActif(ctx, m.pro, m.jar, "Karim", "EMPLOYEE");
    const { res } = await promouvoir(m.pro, e.jar, salle);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const lignes = await lignesAudit(ctx.prisma, "quote.promote");
    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.actor_member_id).toBe(e.id);
    expect(lignes[0]!.actor_member_id).not.toBe(m.membreId);
    expect(lignes[0]!.actor_id, "le compte commun reste celui du Bearer").toBe(m.pro.userId);
  });

  it("la couche ÉTEINTE : `actor_member_id` reste NUL, la ligne est celle d'avant (le témoin déjà vert : une garde posée sur un comportement tenu)", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const salle = await salleDe(pro, undefined);
    const { res } = await promouvoir(pro, undefined, salle);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const lignes = await lignesAudit(ctx.prisma, "quote.promote");
    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.actor_member_id).toBeNull();
    expect(lignes[0]!.actor_id).toBe(pro.userId);
    expect(lignes[0]!.actor_role).toBe("PRO");
  });

  it("⛔ la PROMOTION ne change pas (D316) : le devis promu est officiel, au même numéro, au même statut ; la ligne reste UNE seule ; AUCUN nom, AUCUN numéro de téléphone ne figure dans la ligne", async () => {
    await truncateAll(ctx.prisma);
    const m = await proActive(ctx);
    const salle = await salleDe(m.pro, m.jar);
    const { res } = await promouvoir(m.pro, m.jar, salle);
    const promu = res.body as QuoteDTO;
    expect(promu.isOfficial).toBe(true);
    expect(promu.status).toBe("DRAFT");
    expect(promu.reference.startsWith("DEVIS-")).toBe(true);
    const lignes = await lignesAudit(ctx.prisma, "quote.promote");
    expect(lignes).toHaveLength(1);
    const ecrit = JSON.stringify(lignes[0]);
    for (const interdit of ["Amina", "Bensalem", "آمنة", "+213"]) expect(ecrit.includes(interdit), `« ${interdit} » dans ${ecrit}`).toBe(false);
  });
});
