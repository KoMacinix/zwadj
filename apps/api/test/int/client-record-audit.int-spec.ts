// Intégration — rang 57 (D355), R-2 : le JOURNAL de la création et de la modification d'une FICHE CLIENT (DR5), sur PostgreSQL réel. CHEMIN D'IDENTITÉ : méthode RENFORCÉE.
//
// ⛔ LA CARTE (`docs/preuves/D355/carte-fiches.md`) : QUATRE écritures de la table `pro_client_records` — K-2 (créer), K-3 (compléter un nom), K-3b (modifier), K-5 (la boîte de langue d'un devis complète
// aussi la fiche, sous C-C3). Chacune écrit UNE ligne `audit_logs` DANS la transaction de l'écriture, SEULEMENT quand la fiche a VRAIMENT été écrite, avec `actor_member_id` = le membre dont la session a passé
// le garde (la couche activée) ou NULL (couche éteinte : l'acteur est le compte commun). La ligne dit QUI, QUELLE fiche, QUELS champs — jamais une valeur (MP-33 ; même règle que D349 et S-81).
//
// ⛔ CE QUE CE FICHIER MESURE : (1) une ligne par écriture, avec son acteur, son entité et ses champs ; (2) AUCUNE ligne pour une action qui n'écrit rien (une fiche rendue telle quelle, un refus, une
// violation d'unicité) ; (3) AUCUNE valeur personnelle dans TOUT le journal ; (4) la concurrence (dix créations simultanées du même numéro : une fiche, une ligne) ; (5) l'échec forcé dans la transaction
// (MD-ADM-6, patron de D349) : un déclencheur d'insertion refuse la ligne ⇒ l'écriture n'a pas eu lieu ; un déclencheur DIFFÉRÉ refuse le commit ⇒ la ligne n'a pas survécu — « une action sans trace ou une
// trace sans action » ne peuvent pas exister. Le patron de D349 ne connaît que `venues` et `account_deletion_requests` : il est REPRODUIT ici pour `pro_client_records` (S-259).
// ⚠ Les verdicts passent par `expect` de vitest (assertions natives), jamais par `.expect(<statut>)` de supertest (D305, S-192 refusée, D352).
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { QuoteDTO } from "@zwadj/types";
import { createTestApp, registerUser, truncateAll, type TestContext } from "./helpers";
import { Jar, appeler, creerPro, membreActif, proActive, type ProFixture } from "./staff-helpers";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await restaurer();
  await ctx.app.close();
});
afterEach(async () => {
  // Un déclencheur laissé en base se verrait dans le test SUIVANT, et on chercherait au mauvais endroit : il est retiré quoi qu'il arrive.
  await restaurer();
});

interface LigneJournal {
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_member_id: string | null;
  entity_type: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
}

/** Toutes les lignes de journal des fiches, dans l'ordre. */
const lignesFiche = (): Promise<LigneJournal[]> =>
  ctx.prisma.$queryRaw<LigneJournal[]>`
    SELECT action, actor_id::text AS actor_id, actor_role, actor_member_id::text AS actor_member_id, entity_type, entity_id, before, after
      FROM audit_logs WHERE action LIKE 'client_record.%' ORDER BY created_at, id`;
const lignesDe = async (ficheId: string): Promise<LigneJournal[]> => (await lignesFiche()).filter((l) => l.entity_id === ficheId);

let n = 0;
/** Toute valeur personnelle que ce fichier GÉNÈRE (numéro sous ses deux formes, e-mail) : ce que le journal ne doit contenir NULLE PART. Une sous-chaîne générique (« 0555 ») pourrait tomber par hasard dans un
 *  identifiant : le test chercherait alors un faux rouge intermittent (D275). */
const valeursGenerees: string[] = [];
const telephone = (): string => {
  const numero = `0555${String((n += 1)).padStart(6, "0")}`;
  valeursGenerees.push(numero, `+213${numero.slice(1)}`);
  return numero;
};
const courriel = (): string => {
  const adresse = `client${(n += 1)}@example.dz`;
  valeursGenerees.push(adresse);
  return adresse;
};
/** Une date d'événement DÉRIVÉE de l'horloge (+ 120 jours), jamais une date écrite : elle cesserait d'être valable (leçon de la fixture « très loin »). */
const dateEvenement = (): string => new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);

/** Les NOMS que les tests écrivent (latins et arabes) : ils ne peuvent pas tomber par hasard dans un identifiant (lettres hors de l'hexadécimal, ou écriture arabe). */
const NOMS_ECRITS = ["Amina", "Bensalem", "Ben Salem", "Yacine", "Karim Haddad", "آمنة", "ياسين", "أمينة"];

interface Monde {
  pro: ProFixture;
  /** Le pot de cookies de la session qui agit : celle du Manager (couche activée), ou `undefined` (couche éteinte). */
  jar: Jar | undefined;
  /** Le membre qui agit : le Manager activé, ou `null` (couche éteinte). */
  membre: string | null;
  employe: { id: string; jar: Jar } | null;
  venueId: string;
  slotId: string;
}

async function salleEtCreneau(pro: ProFixture, jar: Jar | undefined): Promise<{ venueId: string; slotId: string }> {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const ville = await ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 } });
  const salle = await appeler(ctx, pro.token, jar, "post", "/api/v1/venues", {
    cityId: ville.id,
    nameFr: "Salle El Ryad",
    nameAr: "قاعة",
    capacityMax: 400,
    basePriceCents: 18_000_000,
    bookingMode: "MULTI_SLOT"
  });
  expect(salle.status, JSON.stringify(salle.body)).toBe(201);
  const venueId = (salle.body as { id: string }).id;
  const creneau = await appeler(ctx, pro.token, jar, "post", `/api/v1/venues/${venueId}/slot-templates`, {
    nameFr: "Soirée",
    nameAr: "سهرة",
    startMinutes: 1200,
    endMinutes: 1560,
    basePriceCents: 20_000_000
  });
  expect(creneau.status, JSON.stringify(creneau.body)).toBe(201);
  return { venueId, slotId: (creneau.body as { id: string }).id };
}

/** Couche ÉTEINTE : un PRO connecté par son Bearer seul, aucune session de personnel. */
async function mondeEteint(): Promise<Monde> {
  await truncateAll(ctx.prisma);
  const pro = await creerPro(ctx);
  return { pro, jar: undefined, membre: null, employe: null, ...(await salleEtCreneau(pro, undefined)) };
}

/** Couche ACTIVÉE : le Manager (session ouverte, pot de cookies) et un Employé actif. */
async function mondeActive(): Promise<Monde> {
  await truncateAll(ctx.prisma);
  const { pro, jar, membreId } = await proActive(ctx);
  const employe = await membreActif(ctx, pro, jar, "Karim", "EMPLOYEE");
  return { pro, jar, membre: membreId, employe: { id: employe.id, jar: employe.jar }, ...(await salleEtCreneau(pro, jar)) };
}

// ── les quatre écritures, par les VRAIES routes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const creer = (m: Monde, qui: Jar | undefined, corps: Record<string, unknown>) => appeler(ctx, m.pro.token, qui, "post", "/api/v1/pro/clients", corps);
const completer = (m: Monde, qui: Jar | undefined, id: string, corps: Record<string, unknown>) => appeler(ctx, m.pro.token, qui, "patch", `/api/v1/pro/clients/${id}/names`, corps);
const modifier = (m: Monde, qui: Jar | undefined, id: string, corps: Record<string, unknown>) => appeler(ctx, m.pro.token, qui, "patch", `/api/v1/pro/clients/${id}`, corps);
const devisAvecFiche = (m: Monde, qui: Jar | undefined, corps: Record<string, unknown>) =>
  appeler(ctx, m.pro.token, qui, "post", `/api/v1/venues/${m.venueId}/quotes`, { eventDate: dateEvenement(), slotTemplateId: m.slotId, guests: 250, ...corps });
const boiteDeLangue = (m: Monde, qui: Jar | undefined, devisId: string, corps: Record<string, unknown>) => appeler(ctx, m.pro.token, qui, "post", `/api/v1/quotes/${devisId}/client-name`, corps);

/** Une fiche créée par la vraie route K-2 ; rend son identifiant. */
async function ficheDe(m: Monde, qui: Jar | undefined, corps: Record<string, unknown>): Promise<string> {
  const res = await creer(m, qui, corps);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return (res.body as { record: { id: string } }).record.id;
}
/** Lie la fiche à un compte CLIENT inscrit par la vraie route (la fiche liée ne se modifie plus, MD-6) — UN e-mail par appel : un compte ne s'inscrit qu'une fois. */
async function lierUneFiche(ficheId: string, email: string): Promise<void> {
  await registerUser(ctx, { role: "CLIENT", email, password: "Motdepasse1", firstName: "Lie", lastName: "Compte", locale: "fr" });
  const compte = await ctx.prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  await ctx.prisma.$executeRaw`UPDATE pro_client_records SET linked_user_id = ${compte.id}::uuid, linked_at = now() WHERE id = ${ficheId}::uuid`;
}
const ficheEnBase = (id: string) =>
  ctx.prisma.$queryRaw<{ phone: string | null; email: string | null; name_ar: string | null; name_latin: string | null }[]>`SELECT phone, email, name_ar, name_latin FROM pro_client_records WHERE id = ${id}::uuid`.then((r) => r[0] ?? null);
const nombreDeFiches = async (): Promise<number> => (await ctx.prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pro_client_records`)[0]!.n;
const copieEnBase = (id: string) =>
  ctx.prisma.$queryRaw<{ client_name_ar: string | null; client_name_latin: string | null }[]>`SELECT client_name_ar, client_name_latin FROM quotes WHERE id = ${id}::uuid`.then((r) => r[0] ?? null);

// ── l'échec forcé (patron de D349, reproduit pour `pro_client_records`) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un déclencheur qui refuse l'insertion d'UNE action du journal : l'échec forcé de MD-ADM-6. */
async function forcerEchecDuJournal(action: string): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r57_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé du journal (test D355)'; END; $$");
  await ctx.prisma.$executeRawUnsafe(`CREATE TRIGGER r57_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION r57_fail_audit()`);
}
/** Un déclencheur DIFFÉRÉ sur la table des fiches : il refuse la transaction AU COMMIT, après que TOUT a été écrit — la ligne du journal comprise. Il distingue « la ligne est DANS la transaction » (elle disparaît
 *  avec elle) de « la ligne est écrite à côté » (elle survivrait) : le déclencheur d'insertion ci-dessus ne le voit pas, l'écriture hors transaction échouant aussi. */
async function forcerEchecAuCommit(): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("CREATE OR REPLACE FUNCTION r57_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'échec forcé au commit (test D355)'; END; $$");
  await ctx.prisma.$executeRawUnsafe("CREATE CONSTRAINT TRIGGER r57_fail_commit AFTER INSERT OR UPDATE ON pro_client_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION r57_fail_commit()");
}
async function restaurer(): Promise<void> {
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r57_fail_audit ON audit_logs");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS r57_fail_audit()");
  await ctx.prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS r57_fail_commit ON pro_client_records");
  await ctx.prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS r57_fail_commit()");
}

describe("⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member_id` NULL", () => {
  let m: Monde;
  beforeAll(async () => {
    m = await mondeEteint();
  });

  it("K-2 — la fiche créée : `client_record.create`, entité `client_record`, le compte commun, le rôle PRO, NULL pour le membre, les champs présents — `before` jamais écrit", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const lignes = await lignesDe(id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toEqual({
      action: "client_record.create",
      actor_id: m.pro.userId,
      actor_role: "PRO",
      actor_member_id: null,
      entity_type: "client_record",
      entity_id: id,
      before: null,
      after: { fields: ["phone", "nameLatin"] }
    });
  });

  it("⛔ K-2 — une fiche DÉJÀ existante, rendue telle quelle (`created: false`) : AUCUNE ligne de plus — rien n'a été écrit", async () => {
    const numero = telephone();
    const id = await ficheDe(m, undefined, { phone: numero, nameLatin: "Amina Bensalem" });
    const encore = await creer(m, undefined, { phone: numero, nameLatin: "Autre Nom" });
    expect(encore.status).toBe(200);
    expect((encore.body as { created: boolean }).created).toBe(false);
    expect(await lignesDe(id)).toHaveLength(1);
  });

  it("⛔ K-2 — les champs de la ligne sont ceux de la fiche créée, dans l'ordre fixe : un e-mail seul, puis les quatre", async () => {
    const seul = await ficheDe(m, undefined, { email: courriel(), nameLatin: "Yacine Bensalem" });
    const lignesSeul = await lignesDe(seul);
    expect(lignesSeul).toHaveLength(1);
    expect(lignesSeul[0]!.after).toEqual({ fields: ["email", "nameLatin"] });
    const tout = await ficheDe(m, undefined, { phone: telephone(), email: courriel(), nameAr: "آمنة بن سالم", nameLatin: "Amina Bensalem" });
    const lignesTout = await lignesDe(tout);
    expect(lignesTout).toHaveLength(1);
    expect(lignesTout[0]!.after).toEqual({ fields: ["phone", "email", "nameAr", "nameLatin"] });
  });

  it("K-3 — un nom complété : `client_record.complete_names`, le champ écrit ; un nom DÉJÀ présent refusé (409) : AUCUNE ligne de plus", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const ok = await completer(m, undefined, id, { nameAr: "آمنة بن سالم" });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const lignes = await lignesDe(id);
    expect(lignes.map((l) => l.action)).toEqual(["client_record.create", "client_record.complete_names"]);
    expect(lignes[1]).toMatchObject({ actor_id: m.pro.userId, actor_role: "PRO", actor_member_id: null, entity_type: "client_record", before: null, after: { fields: ["nameAr"] } });
    const refus = await completer(m, undefined, id, { nameAr: "أمينة" });
    expect(refus.status).toBe(409);
    expect(await lignesDe(id), "un refus n'écrit rien : aucune ligne").toHaveLength(2);
  });

  it("K-3b — une fiche modifiée : `client_record.update`, les champs ENVOYÉS dans l'ordre fixe, jamais leurs valeurs", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const res = await modifier(m, undefined, id, { nameLatin: "Amina Ben Salem", email: courriel() });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const lignes = await lignesDe(id);
    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toMatchObject({ action: "client_record.update", actor_id: m.pro.userId, actor_member_id: null, before: null, after: { fields: ["email", "nameLatin"] } });
  });

  it("⛔ K-3b — un refus (numéro déjà pris par une AUTRE fiche : 409 ; fiche d'un autre pro ou absente : 404 ; fiche LIÉE : 409) : AUCUNE ligne — la transaction annulée n'écrit rien", async () => {
    const a = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const numeroDeB = telephone();
    const b = await ficheDe(m, undefined, { phone: numeroDeB, nameLatin: "Yacine Bensalem" });
    const avant = (await lignesFiche()).length;
    const unicite = await modifier(m, undefined, a, { phone: numeroDeB });
    expect(unicite.status).toBe(409);
    const absente = await modifier(m, undefined, "018f0000-0000-7000-8000-0000000000ff", { nameLatin: "X" });
    expect(absente.status).toBe(404);
    await lierUneFiche(b, "lie-k3b@example.dz");
    const liee = await modifier(m, undefined, b, { nameLatin: "Autre Nom" });
    expect(liee.status).toBe(409);
    expect((await lignesFiche()).length, "trois refus, aucune ligne").toBe(avant);
  });

  it("K-5 — la boîte de langue complète la fiche (C-C3 : la même personne) : UNE ligne `client_record.complete_names`, le champ ET le devis, aucun nom", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const devis = (await devisAvecFiche(m, undefined, { clientRecordId: id, clientNameLatin: "Amina Bensalem" })).body as QuoteDTO;
    const res = await boiteDeLangue(m, undefined, devis.id, { locale: "ar", name: "آمنة بن سالم" });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(await ficheEnBase(id)).toMatchObject({ name_ar: "آمنة بن سالم" });
    const lignes = await lignesDe(id);
    expect(lignes.map((l) => l.action)).toEqual(["client_record.create", "client_record.complete_names"]);
    expect(lignes[1]).toMatchObject({ actor_id: m.pro.userId, actor_role: "PRO", actor_member_id: null, entity_type: "client_record", before: null, after: { fields: ["nameAr"], quoteId: devis.id } });
  });

  it("⛔ K-5 — l'AUTRE écriture est une AUTRE personne (C-C3 : la fiche reste intacte), ou un devis SANS fiche : la copie du devis est complétée, la fiche n'est pas écrite — AUCUNE ligne de fiche", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const autre = (await devisAvecFiche(m, undefined, { clientRecordId: id, clientNameLatin: "Yacine Bensalem" })).body as QuoteDTO;
    expect((await boiteDeLangue(m, undefined, autre.id, { locale: "ar", name: "ياسين بن سالم" })).status).toBe(201);
    expect(await ficheEnBase(id)).toMatchObject({ name_ar: null });
    expect((await copieEnBase(autre.id))?.client_name_ar).toBe("ياسين بن سالم");
    const sansFiche = (await devisAvecFiche(m, undefined, {})).body as QuoteDTO;
    expect((await boiteDeLangue(m, undefined, sansFiche.id, { locale: "fr", name: "Karim Haddad" })).status).toBe(201);
    expect((await lignesDe(id)).map((l) => l.action), "la fiche n'a que sa ligne de création").toEqual(["client_record.create"]);
  });

  it("⛔ K-5 — la fiche a DÉJÀ un nom dans cette langue : la copie du devis se complète, la fiche n'est pas écrite (l'`UPDATE` conditionné ne trouve rien) — AUCUNE ligne de fiche de plus", async () => {
    const deja = await ficheDe(m, undefined, { phone: telephone(), nameAr: "آمنة", nameLatin: "Amina Bensalem" });
    const q1 = (await devisAvecFiche(m, undefined, { clientRecordId: deja, clientNameLatin: "Amina Bensalem" })).body as QuoteDTO;
    expect((await boiteDeLangue(m, undefined, q1.id, { locale: "ar", name: "آمنة بن سالم" })).status).toBe(201);
    expect((await copieEnBase(q1.id))?.client_name_ar, "la copie du devis, elle, est complétée").toBe("آمنة بن سالم");
    expect((await ficheEnBase(deja))?.name_ar, "la fiche garde son nom").toBe("آمنة");
    expect((await lignesDe(deja)).map((l) => l.action)).toEqual(["client_record.create"]);
  });

  it("⛔ K-5 — la fiche est LIÉE à un compte : la copie du devis se complète, la fiche n'est jamais écrite — AUCUNE ligne de fiche de plus", async () => {
    const liee = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    await lierUneFiche(liee, "lie-k5@example.dz");
    const q2 = (await devisAvecFiche(m, undefined, { clientRecordId: liee, clientNameLatin: "Amina Bensalem" })).body as QuoteDTO;
    expect((await boiteDeLangue(m, undefined, q2.id, { locale: "ar", name: "آمنة بن سالم" })).status).toBe(201);
    expect((await copieEnBase(q2.id))?.client_name_ar).toBe("آمنة بن سالم");
    expect((await ficheEnBase(liee))?.name_ar, "une fiche liée n'est jamais complétée par la boîte de langue").toBeNull();
    expect((await lignesDe(liee)).map((l) => l.action)).toEqual(["client_record.create"]);
  });

  it("⛔ TOUT le journal : après les écritures ci-dessus, AUCUNE valeur personnelle — ni numéro, ni e-mail, ni nom — n'apparaît nulle part dans `audit_logs`, colonnes JSON comprises", async () => {
    const lignes = await ctx.prisma.$queryRawUnsafe<Array<{ t: string }>>("SELECT row_to_json(a)::text AS t FROM audit_logs a WHERE action LIKE 'client_record.%'");
    expect(lignes.length, "des lignes parcourues (un zéro sur zéro ligne ne prouve rien)").toBeGreaterThanOrEqual(8);
    const texte = lignes.map((l) => l.t).join("\n");
    expect(valeursGenerees.length, "des numéros et des e-mails ont bien été générés par les tests de ce fichier").toBeGreaterThanOrEqual(10);
    for (const valeur of [...valeursGenerees, ...NOMS_ECRITS]) expect(texte, `la valeur « ${valeur} » ne doit pas figurer au journal`).not.toContain(valeur);
  });

  it("⛔ MD-1 — DIX créations simultanées du même numéro : UNE fiche et UNE seule ligne de journal (l'écriture qui ne fait rien n'écrit rien)", async () => {
    const numero = telephone();
    const avantFiches = await nombreDeFiches();
    const avantLignes = (await lignesFiche()).length;
    const reponses = await Promise.all(Array.from({ length: 10 }, () => creer(m, undefined, { phone: numero, nameLatin: "Amina Bensalem" })));
    expect(reponses.every((r) => r.status === 200), JSON.stringify(reponses.map((r) => r.status))).toBe(true);
    expect(reponses.filter((r) => (r.body as { created: boolean }).created), "une seule réponse annonce la naissance de la fiche").toHaveLength(1);
    expect(await nombreDeFiches(), "une fiche de plus").toBe(avantFiches + 1);
    expect((await lignesFiche()).length, "une ligne de plus").toBe(avantLignes + 1);
  });
});

describe("⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id`)", () => {
  let m: Monde;
  beforeAll(async () => {
    m = await mondeActive();
  });

  it("le MANAGER écrit une fiche par K-2, K-3, K-3b et K-5 : chaque ligne porte son identifiant de membre ET celui du compte commun", async () => {
    const id = await ficheDe(m, m.jar, { phone: telephone(), nameLatin: "Amina Bensalem" });
    expect((await completer(m, m.jar, id, { nameAr: "آمنة بن سالم" })).status).toBe(200);
    expect((await modifier(m, m.jar, id, { email: courriel() })).status).toBe(200);
    const autre = await ficheDe(m, m.jar, { phone: telephone(), nameLatin: "Yacine Bensalem" });
    const devis = (await devisAvecFiche(m, m.jar, { clientRecordId: autre, clientNameLatin: "Yacine Bensalem" })).body as QuoteDTO;
    expect((await boiteDeLangue(m, m.jar, devis.id, { locale: "ar", name: "ياسين بن سالم" })).status).toBe(201);
    const lignes = [...(await lignesDe(id)), ...(await lignesDe(autre))];
    expect(lignes.map((l) => l.action).sort()).toEqual(["client_record.complete_names", "client_record.complete_names", "client_record.create", "client_record.create", "client_record.update"]);
    for (const l of lignes) {
      expect(l.actor_member_id, `${l.action} : le membre qui agit`).toBe(m.membre);
      expect(l.actor_id, `${l.action} : le compte commun`).toBe(m.pro.userId);
      expect(l.actor_role).toBe("PRO");
    }
  });

  it("⛔ l'EMPLOYÉ (capacité `clients` en écriture) écrit une fiche : la ligne porte l'identifiant de L'EMPLOYÉ, pas celui du Manager", async () => {
    const id = await ficheDe(m, m.employe!.jar, { phone: telephone(), nameLatin: "Amina Bensalem" });
    expect(m.employe!.id).not.toBe(m.membre);
    const lignesDeLEmploye = await lignesDe(id);
    expect(lignesDeLEmploye, "la création par l'employé a écrit sa ligne").toHaveLength(1);
    const ligne = lignesDeLEmploye[0]!;
    expect(ligne.action).toBe("client_record.create");
    expect(ligne.actor_member_id).toBe(m.employe!.id);
    expect(ligne.actor_id).toBe(m.pro.userId);
    expect((await completer(m, m.employe!.jar, id, { nameAr: "آمنة" })).status).toBe(200);
    expect((await lignesDe(id)).map((l) => l.actor_member_id)).toEqual([m.employe!.id, m.employe!.id]);
  });

  it("⛔ sans session de personnel (le garde refuse : 401) : AUCUNE fiche, AUCUNE ligne — une trace ne peut pas naître d'une action refusée", async () => {
    const avantFiches = await nombreDeFiches();
    const avantLignes = (await lignesFiche()).length;
    const sansSession = await creer(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    expect(sansSession.status).toBe(401);
    expect(await nombreDeFiches()).toBe(avantFiches);
    expect((await lignesFiche()).length).toBe(avantLignes);
  });
});

describe("⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ensemble", () => {
  let m: Monde;
  beforeAll(async () => {
    m = await mondeEteint();
  });

  it("K-2 — le journal refuse l'insertion : la route répond 500 et la fiche N'EXISTE PAS ; le déclencheur retiré, le MÊME appel réussit — ce qui a échoué est bien le journal", async () => {
    const numero = telephone();
    const avantFiches = await nombreDeFiches();
    await forcerEchecDuJournal("client_record.create");
    const echec = await creer(m, undefined, { phone: numero, nameLatin: "Amina Bensalem" });
    expect(echec.status, JSON.stringify(echec.body)).toBe(500);
    expect(await nombreDeFiches(), "action sans trace : la fiche n'a pas été créée").toBe(avantFiches);
    await restaurer();
    const reussi = await creer(m, undefined, { phone: numero, nameLatin: "Amina Bensalem" });
    expect(reussi.status).toBe(200);
    expect((reussi.body as { created: boolean }).created).toBe(true);
  });

  it("K-3 — le journal refuse l'insertion : 500, le nom N'EST PAS complété ; K-3b : 500, la fiche est INCHANGÉE", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    await forcerEchecDuJournal("client_record.complete_names");
    const completion = await completer(m, undefined, id, { nameAr: "آمنة بن سالم" });
    expect(completion.status).toBe(500);
    expect((await ficheEnBase(id))?.name_ar, "le nom n'est pas complété").toBeNull();
    await restaurer();
    await forcerEchecDuJournal("client_record.update");
    const modification = await modifier(m, undefined, id, { nameLatin: "Autre Nom" });
    expect(modification.status).toBe(500);
    expect((await ficheEnBase(id))?.name_latin, "la fiche est inchangée").toBe("Amina Bensalem");
    await restaurer();
    expect((await modifier(m, undefined, id, { nameLatin: "Autre Nom" })).status, "le même appel réussit sans le déclencheur").toBe(200);
  });

  it("K-5 — le journal refuse l'insertion : 500, la fiche ET la copie du devis sont INCHANGÉES (la copie est dans la même transaction que la fiche)", async () => {
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const devis = (await devisAvecFiche(m, undefined, { clientRecordId: id, clientNameLatin: "Amina Bensalem" })).body as QuoteDTO;
    await forcerEchecDuJournal("client_record.complete_names");
    const echec = await boiteDeLangue(m, undefined, devis.id, { locale: "ar", name: "آمنة بن سالم" });
    expect(echec.status, JSON.stringify(echec.body)).toBe(500);
    expect((await ficheEnBase(id))?.name_ar).toBeNull();
    expect((await copieEnBase(devis.id))?.client_name_ar, "la copie du nom sur le devis n'a pas survécu à l'échec de la ligne de la fiche").toBeNull();
    await restaurer();
    expect((await boiteDeLangue(m, undefined, devis.id, { locale: "ar", name: "آمنة بن سالم" })).status).toBe(201);
  });

  it("⛔ AU COMMIT — un déclencheur DIFFÉRÉ refuse la transaction après que tout a été écrit : AUCUNE ligne n'a survécu (une ligne écrite hors de la transaction y survivrait) — K-2, K-3, K-3b, K-5", async () => {
    // K-2
    const avantLignes = (await lignesFiche()).length;
    const avantFiches = await nombreDeFiches();
    await forcerEchecAuCommit();
    const creation = await creer(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    expect(creation.status, JSON.stringify(creation.body)).toBe(500);
    expect(await nombreDeFiches()).toBe(avantFiches);
    expect((await lignesFiche()).length, "K-2 : aucune ligne n'a survécu à l'échec du commit").toBe(avantLignes);
    await restaurer();

    // K-3, K-3b, K-5 : une fiche posée sans le déclencheur, puis écrite sous lui
    const id = await ficheDe(m, undefined, { phone: telephone(), nameLatin: "Amina Bensalem" });
    const devis = (await devisAvecFiche(m, undefined, { clientRecordId: id, clientNameLatin: "Amina Bensalem" })).body as QuoteDTO;
    const posees = (await lignesFiche()).length;
    await forcerEchecAuCommit();
    expect((await completer(m, undefined, id, { nameAr: "آمنة" })).status).toBe(500);
    expect((await modifier(m, undefined, id, { email: courriel() })).status).toBe(500);
    expect((await boiteDeLangue(m, undefined, devis.id, { locale: "ar", name: "آمنة بن سالم" })).status).toBe(500);
    expect((await lignesFiche()).length, "K-3, K-3b, K-5 : aucune ligne n'a survécu").toBe(posees);
    expect(await ficheEnBase(id), "la fiche est inchangée").toMatchObject({ name_ar: null, email: null, name_latin: "Amina Bensalem" });
    expect((await copieEnBase(devis.id))?.client_name_ar, "la copie du devis est inchangée").toBeNull();
  });
});
