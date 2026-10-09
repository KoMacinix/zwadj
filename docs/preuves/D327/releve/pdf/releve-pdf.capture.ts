import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { API } from "../../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, seedReferentials } from "../../../../../e2e/fixtures/harness";

/**
 * D327 — RANG 34, RELEVÉ n° 1 : LE PDF DU DEVIS TEL QU'IL EST (lot DOCUMENTAIRE : aucune ligne de code du dépôt n'est touchée).
 *
 * Ce que la sonde fait, et rien d'autre : elle crée par l'API RÉELLE (pas un modèle brouillon : c'est la route de production) une salle, des prestations de quatre types, et des devis
 * dans les trois cas que Ko nomme — (a) SANS prestation ; (b) avec des prestations SANS quantité (FIXED : le serveur stocke 1) ; (c) avec des prestations À QUANTITÉ (PER_GUEST : le nombre
 * d'invités ; PER_UNIT : la quantité choisie ; TIERED : un palier) —, puis elle appelle `GET /api/v1/quotes/:id/document?locale=fr|ar` AVEC LE JETON DU PRO et écrit les octets reçus.
 * Aucun devis n'est lié à un compte (`clientId` absent) : c'est le seul cas que le produit fabrique aujourd'hui (le parcours sur place n'envoie jamais de `clientId`).
 *
 * Elle relève aussi (question 3 de la lecture adverse) ce que la route répond pour CHAQUE statut de devis — ouvert (DRAFT), hérité (SENT, DECLINED, SUPERSEDED), ACCEPTED, CANCELLED — et
 * pour une ancienne version. ⚠ ACCEPTED, SENT, DECLINED et SUPERSEDED ne s'obtiennent PAS par un chemin du produit (aucun code ne les écrit) : la sonde les pose par SQL sur la base JETABLE
 * `zwadj_e2e`, et l'écrit dans chaque ligne de sa sortie (`posé par SQL`). CANCELLED, lui, s'obtient par la route `POST /quotes/:id/cancel` du produit.
 *
 * Elle ne JUGE rien : elle écrit `MESURE …` et des fichiers sous `sortie/`. Les contrôles (colonnes, alignement, images) sont des scripts SÉPARÉS (`analyser-pdf.py`, `rasteriser.mjs`).
 * Données : TOUTES fictives (salle, prestations, montants) ; aucun nom de client n'est saisi dans ce relevé.
 */
const ici = __dirname;
const SORTIE = resolve(ici, "sortie");
const e2e = resolve(ici, "../../../../../e2e");
const require_ = createRequire(resolve(e2e, "package.json"));
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";

interface Stocke {
  id: string; version: number; status: string; clientId: string | null; guests: number; eventDate: string; slotTemplateId: string | null;
  basePriceCents: number; servicesTotalCents: number; totalCents: number; depositCents: number;
  lines: { serviceId: string; nameFr: string; nameAr: string; pricingType: string; unitPriceCents: number; quantity: number; lineTotalCents: number }[];
}

const mesure = (texte: string) => console.log(`MESURE ${texte}`);

async function document(token: string, id: string, locale: "fr" | "ar", fichier?: string) {
  const res = await fetch(`${API}/api/v1/quotes/${id}/document?locale=${locale}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
  const octets = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type");
  const corps = type?.startsWith("application/pdf") ? null : octets.toString("utf-8");
  if (res.status === 200 && fichier !== undefined) writeFileSync(resolve(SORTIE, fichier), octets);
  return {
    status: res.status,
    type,
    disposition: res.headers.get("content-disposition"),
    langue: res.headers.get("content-language"),
    cache: res.headers.get("cache-control"),
    octets: octets.length,
    magique: octets.subarray(0, 5).toString("latin1"),
    corps: corps === null ? null : corps.slice(0, 300)
  };
}

test("relevé n° 1 : trois devis réels rendus par le moteur actuel, en français et en arabe ; la réponse de la route à chaque statut", async () => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
  const { Client } = require_("pg") as typeof import("pg");
  const sql = async (texte: string, params: unknown[] = []) => {
    const db = new Client({ connectionString: DATABASE_URL });
    await db.connect();
    try {
      return (await db.query(texte, params)).rows as Record<string, unknown>[];
    } finally {
      await db.end();
    }
  };

  // ── La salle (créée par l'API, publiée comme le feraient ses rôles) — nom FICTIF, deux langues ─────────────────────────────────────────────────────────
  const salle = await createPublishedVenue();
  const token = await accessTokenOf(salle.pro);
  const NOM_FR = "Dune et Plage";
  const NOM_AR = "الكثيب والشاطئ";
  expect((await apiCall("PATCH", `/venues/${salle.id}`, token, { nameFr: NOM_FR, nameAr: NOM_AR })).status).toBe(200);
  const fiche = await apiCall("GET", `/pro/venues/${salle.id}`, token);
  const slot = (fiche.json as { slotTemplates: { id: string; nameFr: string; nameAr: string; startMinutes: number; endMinutes: number }[] }).slotTemplates[0]!;
  mesure(`salle : nameFr « ${NOM_FR} » · nameAr « ${NOM_AR} » · créneau ${slot.nameFr} ${slot.startMinutes}→${slot.endMinutes}`);

  // ── Quatre prestations, une par type de tarification ──────────────────────────────────────────────────────────────────────────────────────────────────
  const creer = async (corps: Record<string, unknown>) => {
    const r = await apiCall("POST", `/venues/${salle.id}/services`, token, corps);
    expect(r.status, `POST services : ${r.text}`).toBe(201);
    return r.json as { id: string; tiers: { id: string; labelFr: string }[] };
  };
  const F1 = await creer({ pricingType: "FIXED", nameFr: "Animation musicale (orchestre)", nameAr: "تنشيط موسيقي بفرقة حيّة", fixedPriceCents: 4_500_000 });
  const F2 = await creer({ pricingType: "FIXED", nameFr: "Photographie et vidéo", nameAr: "تصوير فوتوغرافي وفيديو للحفل", fixedPriceCents: 3_000_000 });
  const G1 = await creer({ pricingType: "PER_GUEST", nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح للضيوف", perGuestPriceCents: 250_000 });
  const U1 = await creer({ pricingType: "PER_UNIT", nameFr: "Voiture de cortège", nameAr: "سيارة الموكب", perUnitPriceCents: 800_000, unitNameFr: "voiture", unitNameAr: "سيارة", minUnits: 1, maxUnits: 10 });
  const T1 = await creer({
    pricingType: "TIERED", nameFr: "Gâteau de mariage", nameAr: "كعكة الزفاف",
    tiers: [{ labelFr: "Trois étages", labelAr: "ثلاثة طوابق", priceCents: 1_200_000 }, { labelFr: "Cinq étages", labelAr: "خمسة طوابق", priceCents: 2_000_000 }]
  });

  const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const GUESTS = 150;
  const devis = async (jours: number, services: Record<string, unknown>[] | undefined) => {
    const r = await apiCall("POST", `/venues/${salle.id}/quotes`, token, { eventDate: dans(jours), slotTemplateId: slot.id, guests: GUESTS, ...(services === undefined ? {} : { services }) });
    return r;
  };
  const stocke = async (id: string): Promise<Stocke> => {
    const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token);
    return (liste.json as Stocke[]).find((q) => q.id === id)!;
  };

  // ── Ce que le PARCOURS SUR PLACE peut envoyer : `services: [{ serviceId }]`, jamais de `quantity` ni de `tierId` (walkin-journey.tsx, `body()`) ──────────────────────
  for (const [nom, s] of [["PER_UNIT sans quantity", U1], ["TIERED sans tierId", T1]] as const) {
    const r = await devis(70, [{ serviceId: s.id }]);
    mesure(`parcours-sur-place · ${nom} → HTTP ${r.status} ${r.text.slice(0, 160)}`);
  }

  // ── Les trois devis ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const A = await devis(60, undefined);
  const B = await devis(61, [{ serviceId: F1.id }, { serviceId: F2.id }]);
  const C = await devis(62, [{ serviceId: G1.id }, { serviceId: U1.id, quantity: 3 }, { serviceId: T1.id, tierId: T1.tiers[0]!.id }]);
  for (const [nom, r] of [["A", A], ["B", B], ["C", C]] as const) expect(r.status, `devis ${nom} : ${r.text}`).toBe(201);
  const ids = { A: (A.json as { id: string }).id, B: (B.json as { id: string }).id, C: (C.json as { id: string }).id };
  const stockes: Record<string, Stocke> = {};
  for (const k of ["A", "B", "C"] as const) {
    stockes[k] = await stocke(ids[k]);
    writeFileSync(resolve(SORTIE, `devis-${k}.stocke.json`), JSON.stringify(stockes[k], null, 2), "utf-8");
    const s = stockes[k];
    mesure(`devis ${k} · stocké : v${s.version} ${s.status} clientId=${s.clientId} · base ${s.basePriceCents} · prestations ${s.servicesTotalCents} · total ${s.totalCents} · acompte ${s.depositCents} · ${s.lines.length} ligne(s) : ` +
      s.lines.map((l) => `${l.pricingType}×${l.quantity}=${l.lineTotalCents}`).join(", "));
  }
  for (const k of ["A", "B", "C"] as const) {
    for (const l of ["fr", "ar"] as const) {
      const r = await document(token, ids[k], l, `devis-${k}-${l}.pdf`);
      mesure(`devis ${k} · document ${l} → HTTP ${r.status} · ${r.type} · ${r.octets} octets · magique « ${r.magique} » · Content-Language ${r.langue} · ${r.disposition}`);
    }
  }

  // ── La réponse de la route À CHAQUE STATUT (question 3) ───────────────────────────────────────────────────────────────────────────────────────────────────
  const statuts: { etiquette: string; origine: string; id: string }[] = [];
  const poser = async (etiquette: string, statut: string, jours: number) => {
    const r = await devis(jours, [{ serviceId: F1.id }]);
    expect(r.status).toBe(201);
    const id = (r.json as { id: string }).id;
    // ⚠ La base REFUSE un statut hors DRAFT/CANCELLED sans `sent_at` (`quotes_sent_at_coherent`) : la sonde pose les horodatages que les contraintes exigent.
    await sql(`UPDATE quotes SET status = $1::"QuoteStatus", sent_at = now(), accepted_at = CASE WHEN $1 = 'ACCEPTED' THEN now() ELSE accepted_at END WHERE id = $2::uuid`, [statut, id]);
    statuts.push({ etiquette, origine: "posé par SQL", id });
  };
  statuts.push({ etiquette: "DRAFT", origine: "créé par la route du produit", id: ids.B });
  await poser("SENT (hérité)", "SENT", 80);
  await poser("ACCEPTED", "ACCEPTED", 81);
  await poser("DECLINED (hérité)", "DECLINED", 82);
  await poser("SUPERSEDED (hérité)", "SUPERSEDED", 83);
  const annule = await devis(84, [{ serviceId: F1.id }]);
  const idAnnule = (annule.json as { id: string }).id;
  const rc = await apiCall("POST", `/quotes/${idAnnule}/cancel`, token, {});
  expect(rc.status, `cancel : ${rc.text}`).toBe(201);
  statuts.push({ etiquette: "CANCELLED", origine: "obtenu par POST /quotes/:id/cancel (la route du produit)", id: idAnnule });
  for (const s of statuts) {
    const lu = (await sql(`SELECT status::text AS status FROM quotes WHERE id = $1::uuid`, [s.id]))[0]!.status;
    const r = await document(token, s.id, "fr", s.etiquette === "ACCEPTED" ? "devis-ACCEPTED-fr.pdf" : s.etiquette === "DRAFT" ? undefined : undefined);
    mesure(`statut ${s.etiquette} (lu en base : ${String(lu)} ; ${s.origine}) → HTTP ${r.status}${r.status === 200 ? ` · ${r.type} · ${r.octets} octets · magique « ${r.magique} »` : ` · ${r.corps}`}`);
  }

  // ── Une ancienne version (décision 1 : refusée) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const rev = await apiCall("POST", `/quotes/${ids.B}/revise`, token, { eventDate: stockes.B!.eventDate, slotTemplateId: slot.id, guests: 120, services: [{ serviceId: F1.id }, { serviceId: F2.id }] });
  expect(rev.status, `revise : ${rev.text}`).toBe(201);
  const idV2 = (rev.json as { id: string }).id;
  const v1 = await document(token, ids.B, "fr");
  const v2 = await document(token, idV2, "fr");
  mesure(`ancienne version v1 d'une chaîne qui a une v2 → HTTP ${v1.status} · ${v1.corps}`);
  mesure(`dernière version v2 → HTTP ${v2.status} · ${v2.octets} octets`);

  // ── Le schéma réel : les colonnes de `quotes` (la base fait foi, pas schema.prisma) ──────────────────────────────────────────────────────────────────────────
  const colonnes = await sql(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'quotes' ORDER BY ordinal_position`);
  writeFileSync(resolve(SORTIE, "colonnes-quotes.json"), JSON.stringify(colonnes, null, 2), "utf-8");
  mesure(`colonnes de quotes (${colonnes.length}) : ${colonnes.map((c) => String(c.column_name)).join(", ")}`);
  writeFileSync(resolve(SORTIE, "ids.json"), JSON.stringify({ ...ids, v2: idV2, statuts }, null, 2), "utf-8");
});
