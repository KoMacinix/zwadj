import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../../packages/i18n/messages/fr.json";
import { API, PRO } from "../../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../../../../../e2e/fixtures/harness";

/**
 * D327 — RANG 34, RELEVÉ n° 4 : « MA SALLE » DANS UN VRAI NAVIGATEUR (lot DOCUMENTAIRE : aucune ligne de code du dépôt n'est touchée).
 *
 * Ko a REPRODUIT le défaut le 08/10/2026 : « une salle créée n'apparaît toujours qu'après actualisation de la page » — alors que D326 le déclarait réparé. D326 avait mesuré UN seul parcours (un pro
 * SANS salle crée la sienne, puis clique le lien « Ma salle » de la coquille : `docs/preuves/D326/navigateur/assistant.capture.ts`). Cette sonde rejoue ce parcours ET ceux que Ko a pu faire : un pro AVEC
 * une salle, la création par le MENU DE COMPTE (« Nouvelle salle »), le retour par le lien « Retour à mes salles » de l'étape 2, le retour par le bouton « Précédent » du NAVIGATEUR. Elle mesure ensuite ce que le
 * dernier point de la consigne demande — ÉDITER, PUBLIER, SUPPRIMER une salle : la liste le montre-t-elle SANS actualiser ?
 *
 * Elle ne JUGE rien : elle écrit des lignes `MESURE …` (ce que la liste affiche, dans le même navigateur, sans aucun rechargement entre l'action et la lecture) et des images. Toute lecture « après
 * actualisation » est faite par `page.reload()` et dite comme telle. Les noms de salle sont FICTIFS.
 */
const ici = __dirname;
const IMAGES = resolve(ici, "images");
const e2e = resolve(ici, "../../../../../e2e");
const require_ = createRequire(resolve(e2e, "package.json"));
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";
const V = fr.venue.ui;

test.beforeAll(() => {
  mkdirSync(IMAGES, { recursive: true });
  seedReferentials();
});

const mesure = (texte: string) => console.log(`MESURE ${texte}`);

async function ouvrir(browser: Browser, compte: Parameters<typeof loginContext>[1]): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), "fr");
  await loginContext(contexte, compte);
  const page = await contexte.newPage();
  return { contexte, page };
}

/** Remplit l'étape 1 de l'assistant (création) et la valide ; attend l'étape 2 (la salle existe). */
async function creer(page: Page, nomFr: string) {
  await page.getByLabel(V.form.nameFr, { exact: true }).fill(nomFr);
  await page.getByLabel(V.form.nameAr, { exact: true }).fill("قاعة تجريبية");
  const commune = page.getByLabel(V.form.city, { exact: true });
  await expect(commune.locator("option:not([value=''])").first()).toBeAttached();
  await commune.selectOption((await commune.locator("option:not([value=''])").first().getAttribute("value")) as string);
  await page.getByLabel(V.form.capacityMax, { exact: true }).fill("400");
  await page.getByLabel(V.form.basePrice, { exact: true }).fill("150000");
  const reponse = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/v1/venues" && r.request().method() === "POST");
  await page.getByRole("button", { name: V.wizard.createAndContinue }).click();
  expect((await reponse).status()).toBe(201);
  await expect(page.getByText("Étape 2 sur 7")).toBeVisible();
}

/** Ce que la LISTE affiche maintenant : les noms des cartes. `null` si la liste n'est pas rendue (chargement, erreur, état vide). */
async function cartes(page: Page): Promise<{ titres: string[]; vide: boolean; badges: string[] }> {
  await page.waitForTimeout(900); // la relecture du fournisseur est asynchrone : on lui laisse le temps qu'un humain lui laisse
  const titres = await page.locator("main ul li h2").allTextContents();
  const vide = await page.getByText(V.list.empty.title).isVisible().catch(() => false);
  const badges = await page.locator("main ul li").evaluateAll((lis) => lis.map((li) => (li.textContent ?? "").replace(/\s+/g, " ").slice(0, 160)));
  return { titres, vide, badges };
}
const navSalles = (page: Page) => page.getByRole("link", { name: /^(Ma salle|Mes salles)$/ }).first();

test("S1 — un pro SANS salle crée la sienne, puis clique « Ma salle » (le parcours de D326)", async ({ browser }) => {
  const compte = await createVerifiedAccount("PRO");
  const { contexte, page } = await ouvrir(browser, compte);
  await page.goto(`${PRO}/salles/nouvelle`);
  await creer(page, "S1 Première salle");
  await navSalles(page).click();
  const c = await cartes(page);
  mesure(`S1 · SANS rechargement · liste : ${JSON.stringify(c.titres)} · état vide affiché : ${c.vide}`);
  await page.screenshot({ path: resolve(IMAGES, "S1-sans-rechargement.png") });
  await page.reload();
  const r = await cartes(page);
  mesure(`S1 · APRÈS rechargement · liste : ${JSON.stringify(r.titres)}`);
  await contexte.close();
});

test("S2 — un pro AVEC une salle crée une seconde salle par le MENU DE COMPTE, puis clique « Mes salles »", async ({ browser }) => {
  const existante = await createPublishedVenue();
  const { contexte, page } = await ouvrir(browser, existante.pro);
  await page.goto(`${PRO}/salles`);
  await expect(page.locator("main ul li h2").first()).toBeVisible();
  mesure(`S2 · avant · liste : ${JSON.stringify(await page.locator("main ul li h2").allTextContents())} · libellé de la navigation : « ${await navSalles(page).textContent()} »`);
  await page.getByRole("button", { name: fr.account.ui.menu.trigger }).click();
  await page.getByRole("menuitem", { name: V.list.new }).click();
  await expect(page.getByRole("heading", { level: 1, name: V.form.createTitle })).toBeVisible();
  await creer(page, "S2 Seconde salle");
  await navSalles(page).click();
  const c = await cartes(page);
  mesure(`S2 · SANS rechargement · liste : ${JSON.stringify(c.titres)} · libellé de la navigation : « ${await navSalles(page).textContent()} »`);
  await page.screenshot({ path: resolve(IMAGES, "S2-sans-rechargement.png") });
  await page.reload();
  const r = await cartes(page);
  mesure(`S2 · APRÈS rechargement · liste : ${JSON.stringify(r.titres)} · libellé : « ${await navSalles(page).textContent()} »`);
  await contexte.close();
});

test("S3 — comme S2, mais le retour se fait par le lien « Retour à mes salles » de l'étape 2, puis par « Précédent » du navigateur", async ({ browser }) => {
  const existante = await createPublishedVenue();
  const { contexte, page } = await ouvrir(browser, existante.pro);
  await page.goto(`${PRO}/salles`);
  await expect(page.locator("main ul li h2").first()).toBeVisible();
  await page.getByRole("button", { name: fr.account.ui.menu.trigger }).click();
  await page.getByRole("menuitem", { name: V.list.new }).click();
  await creer(page, "S3 Troisième salle");
  await page.getByRole("link", { name: V.form.back }).first().click();
  const c = await cartes(page);
  mesure(`S3 · lien « Retour à mes salles » · SANS rechargement · liste : ${JSON.stringify(c.titres)}`);
  await page.goBack();
  await page.goBack();
  await page.waitForTimeout(600);
  mesure(`S3 · après deux « Précédent » du navigateur · URL : ${new URL(page.url()).pathname}`);
  await page.goto(`${PRO}/salles`); // lecture de contrôle APRÈS un chargement complet : ce que la base contient
  mesure(`S3 · contrôle APRÈS chargement complet · liste : ${JSON.stringify((await cartes(page)).titres)}`);
  await contexte.close();
});

test("S4 — ÉDITER : le nom d'une salle est modifié par l'assistant, puis la liste est relue SANS actualiser", async ({ browser }) => {
  const existante = await createPublishedVenue();
  const { contexte, page } = await ouvrir(browser, existante.pro);
  await page.goto(`${PRO}/salles`);
  await expect(page.locator("main ul li h2").first()).toBeVisible();
  const avant = await page.locator("main ul li h2").allTextContents();
  await page.getByRole("link", { name: V.list.edit }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
  const champ = page.getByLabel(V.form.nameFr, { exact: true });
  await expect(champ).toBeVisible();
  await champ.fill("S4 Nom modifié");
  const maj = page.waitForResponse((r) => /\/api\/v1\/venues\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: V.wizard.next }).click();
  expect((await maj).status()).toBe(200);
  await page.getByRole("link", { name: V.form.back }).first().click();
  const c = await cartes(page);
  mesure(`S4 · avant : ${JSON.stringify(avant)} · après l'édition (PATCH 200), SANS rechargement : ${JSON.stringify(c.titres)}`);
  await page.screenshot({ path: resolve(IMAGES, "S4-apres-edition-sans-rechargement.png") });
  await page.reload();
  mesure(`S4 · APRÈS rechargement : ${JSON.stringify((await cartes(page)).titres)}`);
  await contexte.close();
});

test("S5 — PUBLIER : l'administrateur publie la salle (route admin) pendant que le pro est dans l'application, puis la liste est relue SANS actualiser", async ({ browser }) => {
  const compte = await createVerifiedAccount("PRO");
  const admin = await createVerifiedAccount("CLIENT");
  const { Client } = require_("pg") as typeof import("pg");
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [admin.email]);
  } finally {
    await db.end();
  }
  const { contexte, page } = await ouvrir(browser, compte);
  await page.goto(`${PRO}/salles/nouvelle`);
  await creer(page, "S5 Salle à publier");
  const tPro = await accessTokenOf(compte);
  const liste = await apiCall("GET", "/pro/venues", tPro);
  const id = (liste.json as { id: string }[])[0]!.id;
  // Le pro doit avoir au moins un créneau actif pour que l'administrateur puisse publier (la garde « au moins un créneau actif »).
  const cree = await apiCall("POST", `/venues/${id}/slot-templates`, tPro, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 15_000_000 });
  expect(cree.status).toBe(201);
  await navSalles(page).click();
  const avant = await cartes(page);
  mesure(`S5 · AVANT la publication · carte : ${JSON.stringify(avant.badges)}`);
  const pub = await apiCall("POST", `/admin/venues/${id}/publish`, await accessTokenOf(admin));
  mesure(`S5 · publication par la route admin → HTTP ${pub.status}`);
  await page.getByRole("link", { name: /^Tableau de bord$/ }).first().click();
  await navSalles(page).click();
  const apres = await cartes(page);
  mesure(`S5 · APRÈS la publication, navigation INTERNE vers la liste (sans rechargement) : ${JSON.stringify(apres.badges)}`);
  await page.reload();
  mesure(`S5 · APRÈS rechargement : ${JSON.stringify((await cartes(page)).badges)}`);
  await contexte.close();
});

test("S6 — SUPPRIMER depuis l'ASSISTANT (« Supprimer » au pied de la page d'une salle), puis la liste SANS actualiser", async ({ browser }) => {
  const existante = await createPublishedVenue();
  const { contexte, page } = await ouvrir(browser, existante.pro);
  await page.goto(`${PRO}/salles`);
  await expect(page.locator("main ul li h2").first()).toBeVisible();
  await page.getByRole("link", { name: V.list.edit }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
  await page.getByRole("button", { name: V.list.delete }).click();
  // ⚠ le bouton « Supprimer » existe deux fois (la page, et la fenêtre de confirmation) : le second est celui de la FENÊTRE.
  await page.getByLabel(V.delete.title).getByRole("button", { name: V.delete.confirm }).click();
  await expect(page).toHaveURL(`${PRO}/salles`);
  const c = await cartes(page);
  mesure(`S6 · supprimée depuis l'assistant · liste SANS rechargement : ${JSON.stringify(c.titres)} · état vide affiché : ${c.vide}`);
  await page.screenshot({ path: resolve(IMAGES, "S6-apres-suppression-assistant.png") });
  await page.reload();
  const r = await cartes(page);
  mesure(`S6 · APRÈS rechargement : ${JSON.stringify(r.titres)} · état vide affiché : ${r.vide}`);
  await contexte.close();
});

test("S7 — SUPPRIMER depuis la LISTE (contrôle : le fournisseur y relit déjà)", async ({ browser }) => {
  const existante = await createPublishedVenue();
  const { contexte, page } = await ouvrir(browser, existante.pro);
  await page.goto(`${PRO}/salles`);
  await expect(page.locator("main ul li h2").first()).toBeVisible();
  await page.getByRole("button", { name: V.list.delete }).first().click();
  // ⚠ le bouton « Supprimer » existe deux fois (la page, et la fenêtre de confirmation) : le second est celui de la FENÊTRE.
  await page.getByLabel(V.delete.title).getByRole("button", { name: V.delete.confirm }).click();
  const c = await cartes(page);
  mesure(`S7 · supprimée depuis la liste · SANS rechargement : ${JSON.stringify(c.titres)} · état vide affiché : ${c.vide}`);
  await contexte.close();
});

test("S8 — CRÉER puis, dans la MÊME session, corriger le nom à l'étape 1 de l'assistant ; retour à la liste SANS actualiser (le geste que la base de Ko laisse supposer : créée, puis modifiée neuf minutes plus tard)", async ({ browser }) => {
  const compte = await createVerifiedAccount("PRO");
  const { contexte, page } = await ouvrir(browser, compte);
  await page.goto(`${PRO}/salles/nouvelle`);
  await creer(page, "S8 nom à la création");
  await page.getByRole("button", { name: V.wizard.previous }).click();
  const champ = page.getByLabel(V.form.nameFr, { exact: true });
  await expect(champ).toBeVisible();
  await champ.fill("S8 nom corrigé");
  const maj = page.waitForResponse((r) => /\/api\/v1\/venues\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: V.wizard.next }).click();
  expect((await maj).status()).toBe(200);
  await page.getByRole("link", { name: V.form.back }).first().click();
  const c = await cartes(page);
  mesure(`S8 · créée « S8 nom à la création », corrigée en « S8 nom corrigé » (PATCH 200) · liste SANS rechargement : ${JSON.stringify(c.titres)}`);
  await page.screenshot({ path: resolve(IMAGES, "S8-creee-puis-corrigee-sans-rechargement.png") });
  await page.reload();
  mesure(`S8 · APRÈS rechargement : ${JSON.stringify((await cartes(page)).titres)}`);
  await contexte.close();
});
