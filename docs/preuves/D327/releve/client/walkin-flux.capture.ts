import { expect, test, type Browser, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../../packages/i18n/messages/fr.json";
import { API, PRO } from "../../../../../e2e/playwright.config";
import { accessTokenOf, createPublishedVenue, loginContext, seedReferentials } from "../../../../../e2e/fixtures/harness";

/**
 * D327 — RANG 34, RELEVÉ n° 2 : LE NOM DU CLIENT, DANS LE PARCOURS « SUR PLACE » — OÙ VA CHAQUE CHAMP, ET QUAND (lot DOCUMENTAIRE : aucune ligne de code du dépôt n'est touchée).
 *
 * La sonde joue le parcours sur place DANS UN VRAI NAVIGATEUR (le Pro, Vite en développement, contre l'API réelle et la base JETABLE `zwadj_e2e`), avec des valeurs FICTIVES de client (prénom, nom, mobile,
 * e-mail, invités), et journalise TOUTE requête que le navigateur envoie à l'API — méthode, chemin, corps JSON — étiquetée par la PHASE où elle part :
 *   « formulaire » (champs remplis, rien n'est parti) → « date, créneau, prestations » → « Calculer » (création du devis) → « remise » (un bouton de canal) → « conclusion » (« Enregistrer sans bloquer »
 *   ou « Bloquer la date »).
 * Elle relit ensuite la BASE (le devis, la réservation créée) et appelle `GET /quotes/:id/document?locale=fr` pour lire ce que le PDF imprime pour le nom — APRÈS la conclusion, c'est-à-dire quand le contact
 * est enfin enregistré quelque part.
 *
 * Elle ne JUGE rien : elle écrit des lignes `PHASE …`, `REQ …` et `MESURE …`. Ceci répond, pour chaque champ, « où sa valeur va (devis, réservation, nulle part) et à quel moment ».
 */
const W = fr.venue.ui.walkin;
const ici = __dirname;
const SORTIE = resolve(ici, "sortie");
const e2e = resolve(ici, "../../../../../e2e");
const require_ = createRequire(resolve(e2e, "package.json"));
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";
// Valeurs FICTIVES. Le prénom et le nom portent un espace et un tiret : ce qui entre doit ressortir tel quel, ou ne pas ressortir du tout.
const CLIENT = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", invites: "150", email: "amina@example.com" };

test.beforeAll(() => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
});

const sql = async (texte: string, params: unknown[] = []) => {
  const { Client } = require_("pg") as typeof import("pg");
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(texte, params)).rows as Record<string, unknown>[];
  } finally {
    await db.end();
  }
};

let rang = 0;
const phase = (nom: string) => console.log(`PHASE ${++rang} ${nom}`);

function espionner(page: Page): void {
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.origin !== API) return;
    const corps = r.method() === "GET" || r.postData() === null ? "" : ` corps=${r.postData()}`;
    console.log(`REQ ${r.method()} ${url.pathname}${url.search}${corps}`);
  });
}

async function jouer(browser: Browser, canal: "PRINT" | "SMS", issue: "standby" | "lock") {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext({ acceptDownloads: true });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), "fr");
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: W.title })).toBeVisible();
  espionner(page);

  phase(`${canal}/${issue} · formulaire : prénom, nom, mobile, e-mail, invités saisis (rien n'est encore parti vers l'API)`);
  await page.getByLabel(W.firstName, { exact: true }).fill(CLIENT.prenom);
  await page.getByLabel(W.lastName, { exact: true }).fill(CLIENT.nom);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByLabel(W.email, { exact: true }).fill(CLIENT.email);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: W.continue, exact: true }).click();

  phase(`${canal}/${issue} · date, créneau, prestations (le calendrier lit les disponibilités)`);
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour).toBeEnabled();
  await jour.click();
  const creneau = page.locator("button.cal-slot-pick:not([disabled])").first();
  await expect(creneau).toBeEnabled();
  await creneau.click();
  await page.getByRole("button", { name: W.seeQuote, exact: true }).click();

  phase(`${canal}/${issue} · « ${W.compute} » : création du devis`);
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  const devisId = ((await (await reponse).json()) as { id: string }).id;

  phase(`${canal}/${issue} · remise : le bouton « ${canal} » (enregistre le canal ET télécharge le PDF)`);
  const libelle = (fr.venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string;
  const telechargement = page.waitForEvent("download");
  await page.getByRole("button", { name: libelle, exact: true }).click();
  const fichier = await telechargement;
  const octets = readFileSync((await fichier.path()) as string);
  writeFileSync(resolve(SORTIE, `pdf-telecharge-${canal}-${issue}-avant-conclusion.pdf`), octets);
  console.log(`MESURE ${canal}/${issue} · PDF téléchargé À LA REMISE (avant toute conclusion) : ${fichier.suggestedFilename()} · ${octets.length} octets`);
  await page.getByRole("button", { name: W.doneDialogClose }).click();

  const avant = await sql(`SELECT status::text AS statut, client_id, sent_via FROM quotes WHERE id = $1::uuid`, [devisId]);
  const reservationsAvant = await sql(`SELECT count(*)::int AS n FROM bookings WHERE quote_id = $1::uuid`, [devisId]);
  console.log(`MESURE ${canal}/${issue} · en base APRÈS la remise : devis ${JSON.stringify(avant[0])} · réservations liées : ${reservationsAvant[0]!.n}`);

  phase(`${canal}/${issue} · conclusion : « ${issue === "lock" ? W.lockDate : W.standby} »`);
  await page.getByRole("button", { name: issue === "lock" ? W.lockDate : W.standby, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const apres = await sql(`SELECT status::text AS statut, client_id, sent_via FROM quotes WHERE id = $1::uuid`, [devisId]);
  const resa = await sql(
    `SELECT status::text AS statut, source::text AS source, client_id, contact_first_name, contact_last_name, contact_phone, contact_email FROM bookings WHERE quote_id = $1::uuid`,
    [devisId]
  );
  console.log(`MESURE ${canal}/${issue} · en base APRÈS la conclusion : devis ${JSON.stringify(apres[0])}`);
  console.log(`MESURE ${canal}/${issue} · en base APRÈS la conclusion : réservation ${JSON.stringify(resa[0])}`);
  const usagers = await sql(`SELECT count(*)::int AS n FROM users WHERE email = $1`, [CLIENT.email]);
  console.log(`MESURE ${canal}/${issue} · comptes users à l'adresse saisie : ${usagers[0]!.n}`);

  // Le PDF APRÈS la conclusion : le contact est enregistré (sur la réservation) — le PDF le lit-il ?
  const token = await accessTokenOf(salle.pro);
  for (const l of ["fr", "ar"] as const) {
    const res = await fetch(`${API}/api/v1/quotes/${devisId}/document?locale=${l}`, { headers: { authorization: `Bearer ${token}` } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status === 200) writeFileSync(resolve(SORTIE, `pdf-apres-conclusion-${canal}-${issue}-${l}.pdf`), buf);
    console.log(`MESURE ${canal}/${issue} · GET document ${l} APRÈS la conclusion → HTTP ${res.status}${res.status === 200 ? ` · ${buf.length} octets` : ` · ${buf.toString("utf-8").slice(0, 200)}`}`);
  }
  await contexte.close();
}

test("parcours sur place — « PRINT » puis « Enregistrer sans bloquer » : où va chaque champ, et quand", async ({ browser }) => {
  await jouer(browser, "PRINT", "standby");
});

test("parcours sur place — « SMS » puis « Bloquer la date » : où va chaque champ, et quand", async ({ browser }) => {
  await jouer(browser, "SMS", "lock");
});
