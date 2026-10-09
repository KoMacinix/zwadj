import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../../packages/i18n/messages/fr.json";
import { PRO } from "../../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../../../../../e2e/fixtures/harness";

/**
 * D327 — RANG 34, RELEVÉ n° 5 : CE QUI EXISTE D'UN « CLIENT » CÔTÉ PRO — ET COMMENT UN MÊME CLIENT VENU DEUX FOIS APPARAÎT AUJOURD'HUI (lot DOCUMENTAIRE : aucune ligne de code du dépôt n'est touchée).
 *
 * La sonde convertit quatre devis d'UNE même salle (la conversion est l'unique endroit où le contact est enregistré : `POST /quotes/:id/convert`) :
 *   A — « Amina Bensalem », mobile M1, e-mail E1 ;   B — EXACTEMENT les mêmes valeurs (le même client, venu une seconde fois) ;
 *   C — « amina BENSALEM » (casse différente), M1, E1 ;   D — « Amina Bensalem », un AUTRE mobile M2 (un homonyme, ou le même client avec un autre numéro).
 * Elle relit ce que le PRO voit : la réponse `GET /pro/venues/:id/bookings` (les clés, une ligne par réservation), la base (clés étrangères, comptes), et les écrans `/demandes` et `/reservations` dans
 * un vrai navigateur ; elle relève aussi les entrées de la navigation et du menu de compte (y a-t-il un « Clients » ?).
 * Ne JUGE rien : écrit des lignes `MESURE …` et des images. Valeurs FICTIVES.
 */
const ici = __dirname;
const IMAGES = resolve(ici, "images");
const e2e = resolve(ici, "../../../../../e2e");
const require_ = createRequire(resolve(e2e, "package.json"));
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";
const mesure = (t: string) => console.log(`MESURE ${t}`);

test.beforeAll(() => {
  mkdirSync(IMAGES, { recursive: true });
  seedReferentials();
});

test("un même client venu deux fois : ce que le Pro voit, ce que la base garde, et ce que le produit propose de « client »", async ({ browser }) => {
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
  const salle = await createPublishedVenue();
  const token = await accessTokenOf(salle.pro);
  const fiche = await apiCall("GET", `/pro/venues/${salle.id}`, token);
  const slot = (fiche.json as { slotTemplates: { id: string }[] }).slotTemplates[0]!;

  const M1 = "+213550000001";
  const M2 = "+213660000002";
  const contacts = [
    { etiquette: "A", contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: M1, contactEmail: "amina@example.com" },
    { etiquette: "B", contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: M1, contactEmail: "amina@example.com" },
    { etiquette: "C", contactFirstName: "amina", contactLastName: "BENSALEM", contactPhone: M1, contactEmail: "amina@example.com" },
    { etiquette: "D", contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: M2, contactEmail: "amina@example.com" }
  ];
  const dans = (j: number) => new Date(Date.now() + j * 86_400_000).toISOString().slice(0, 10);
  const idsReservation: Record<string, string> = {};
  for (const [i, c] of contacts.entries()) {
    const q = await apiCall("POST", `/venues/${salle.id}/quotes`, token, { eventDate: dans(60 + i * 3), slotTemplateId: slot.id, guests: 150 });
    expect(q.status, q.text).toBe(201);
    const { etiquette, ...corps } = c;
    const conv = await apiCall("POST", `/quotes/${(q.json as { id: string }).id}/convert`, token, { ...corps, paymentMethod: "CASH" });
    expect(conv.status, conv.text).toBe(201);
    idsReservation[etiquette] = ((conv.json as { bookingId: string | null }).bookingId ?? "").slice(0, 8);
  }

  // ── Ce que l'API rend au PRO : une ligne par RÉSERVATION, et rien d'autre ──────────────────────────────────────────────────────────────────────────────
  const liste = await apiCall("GET", `/pro/venues/${salle.id}/bookings`, token);
  const lignes = liste.json as Record<string, unknown>[];
  mesure(`GET /pro/venues/:id/bookings → HTTP ${liste.status} · ${lignes.length} lignes · clés d'une ligne : ${Object.keys(lignes[0]!).sort().join(", ")}`);
  for (const l of lignes) mesure(`ligne ${String(l.id).slice(0, 8)} · ${String(l.contactFirstName)} ${String(l.contactLastName)} · ${String(l.contactPhone)} · ${String(l.contactEmail)} · statut ${String(l.status)} · identifiant de client dans la ligne : ${"clientId" in l ? String(l.clientId) : "AUCUNE CLÉ"}`);

  // ── Ce que la BASE garde ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const b = await sql(`SELECT count(*)::int AS n, count(client_id)::int AS avec_client, count(DISTINCT contact_phone)::int AS telephones, count(DISTINCT (contact_first_name, contact_last_name))::int AS noms FROM bookings WHERE venue_id = $1::uuid`, [salle.id]);
  mesure(`bookings de la salle : ${JSON.stringify(b[0])}`);
  const u = await sql(`SELECT count(*)::int AS n FROM users WHERE email = 'amina@example.com' OR phone IN ($1, $2)`, [M1, M2]);
  mesure(`comptes users à l'e-mail ou à l'un des deux mobiles saisis : ${JSON.stringify(u[0])}`);
  const cols = await sql(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('users','bookings','quotes','visit_bookings') AND (column_name ~ '(name|phone|email|locale|contact)') ORDER BY table_name, ordinal_position`
  );
  mesure(`colonnes de nom / téléphone / e-mail / langue / contact (lues dans la base) : ${cols.map((c) => `${String(c.table_name)}.${String(c.column_name)}`).join(", ")}`);
  const contraintes = await sql(
    `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype IN ('u') ORDER BY conname`
  );
  mesure(`contraintes d'unicité de users : ${contraintes.map((c) => `${String(c.conname)} = ${String(c.def)}`).join(" | ")}`);
  const idx = await sql(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users' ORDER BY indexname`);
  mesure(`index de users : ${idx.map((i) => String(i.indexdef)).join(" | ")}`);

  // ── Ce que le PRO voit à l'écran ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), "fr");
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/demandes`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1200);
  const texteDemandes = ((await page.locator("main").innerText()) ?? "").replace(/\s+/g, " ").trim();
  mesure(`/demandes · texte de la page (${texteDemandes.length} caractères) : ${texteDemandes.slice(0, 1400)}`);
  const nbAmina = (texteDemandes.match(/Amina/gi) ?? []).length;
  mesure(`/demandes · occurrences du prénom « Amina » (insensible à la casse) : ${nbAmina} pour ${contacts.length} réservations`);
  await page.screenshot({ path: resolve(IMAGES, "demandes-meme-client-quatre-fois.png"), fullPage: true });
  const liens = await page.locator("header a, nav a").allTextContents();
  mesure(`navigation de la coquille Pro : ${JSON.stringify(liens.map((t) => t.trim()).filter((t) => t !== ""))}`);
  await page.getByRole("button", { name: fr.account.ui.menu.trigger }).click();
  const entrees = await page.getByRole("menuitem").allTextContents();
  mesure(`menu de compte : ${JSON.stringify(entrees.map((t) => t.trim()))}`);
  await contexte.close();
});
