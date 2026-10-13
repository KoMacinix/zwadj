import { expect, test, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { DATABASE_URL, PRO } from "../../../../e2e/playwright.config";
import {
  accessTokenOf,
  apiCall,
  createPublishedVenue,
  createVerifiedAccount,
  loginContext,
  markPage,
  pageStillAlive,
  seedReferentials,
  type Account
} from "../../../../e2e/fixtures/harness";

/**
 * D331 — RANG 37, CAPTURES DE « MA SALLE » (lot de CODE ; cette sonde ne touche pas au code du dépôt, elle le JOUE).
 *
 * Pour chaque langue (français, arabe) et chaque largeur (1 280 et 360 px) : la liste « Ma salle » telle qu'un pro la voit APRÈS chacun des quatre chemins — création, édition, suppression depuis
 * l'assistant, publication faite ailleurs — SANS rechargement entre le geste et la lecture (un témoin sur `window` le prouve à chaque image). Elle ne JUGE rien : elle écrit des lignes
 * `MESURE …` (ce que la liste affiche, le mot du menu) et des images. Les verdicts sont ceux de `e2e/specs/r37-ma-salle.e2e.ts` et des tests de composant ; les images servent à la LECTURE
 * HUMAINE (la mise en page à 360 px, le sens de lecture en arabe, un mot du menu qui ne se coupe pas). Les noms de salle sont FICTIFS.
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D331/navigateur/playwright.capture.config.ts
 */
const ici = __dirname;
const IMAGES = resolve(ici, "images");
type Langue = "fr" | "ar";
const MESSAGES = { fr: fr.venue.ui, ar: ar.venue.ui } as const;
const LARGEURS = [1280, 360] as const;

test.beforeAll(() => {
  mkdirSync(IMAGES, { recursive: true });
  seedReferentials();
});

const mesure = (texte: string) => console.log(`MESURE ${texte}`);

async function ouvrir(browser: Browser, compte: Account, langue: Langue, largeur: number) {
  const contexte = await browser.newContext({ viewport: { width: largeur, height: largeur === 360 ? 780 : 900 } });
  await contexte.addInitScript((l) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", l);
    } catch {
      /* stockage indisponible : la page reste dans sa langue par défaut */
    }
  }, langue);
  await loginContext(contexte, compte);
  return { contexte, page: await contexte.newPage() };
}

const cartes = (page: Page) => page.locator("main ul li h2");

/** Le mot du menu « Ma salle / Mes salles » : le lien de la navigation, ou — si la navigation est repliée à cette largeur — rien (le mesure dit « absent »). */
async function libelleDuMenu(page: Page, V: (typeof MESSAGES)[Langue]): Promise<string> {
  const lien = page.getByRole("link", { name: new RegExp(`^(${V.nav.myVenue}|${V.nav.myVenues})$`) }).first();
  return (await lien.isVisible().catch(() => false)) ? ((await lien.textContent()) ?? "").trim() : "(absent à cette largeur)";
}

/** Revient à la liste SANS recharger : le lien de la navigation s'il est visible, sinon le lien « Retour à mes salles » de la page. */
async function versLaListe(page: Page, V: (typeof MESSAGES)[Langue]) {
  const nav = page.getByRole("link", { name: new RegExp(`^(${V.nav.myVenue}|${V.nav.myVenues})$`) }).first();
  if (await nav.isVisible().catch(() => false)) await nav.click();
  else await page.getByRole("link", { name: V.form.back }).first().click();
}

async function lire(page: Page, V: (typeof MESSAGES)[Langue], etat: string, langue: Langue, largeur: number) {
  await page.waitForTimeout(900); // la relecture est asynchrone : on lui laisse le temps qu'un humain lui laisse
  const titres = await cartes(page).allTextContents();
  const vide = await page.getByText(V.list.empty.title).isVisible().catch(() => false);
  const vivante = await pageStillAlive(page);
  mesure(`${etat} · ${langue} · ${largeur} px · liste : ${JSON.stringify(titres)} · état vide affiché : ${vide} · menu : « ${await libelleDuMenu(page, V)} » · document NON rechargé : ${vivante}`);
  await page.screenshot({ path: resolve(IMAGES, `${etat}-${langue}-${largeur}.png`) });
  expect(vivante, "le document a été rechargé : l'image ne montrerait pas ce qu'elle prétend").toBe(true);
}

async function creer(page: Page, V: (typeof MESSAGES)[Langue], nomFr: string) {
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
  await expect(page.getByText(V.wizard.progress.replace("{n}", "2").replace("{total}", "7"))).toBeVisible();
}

async function salleDuPro(pro: Account, nomFr: string, avecCreneau = false, nomAr = "قاعة"): Promise<string> {
  const jeton = await accessTokenOf(pro);
  const wilayas = await apiCall("GET", "/wilayas");
  // Forme RELEVÉE dans `WilayaDTO` : les wilayas hors couverture ont `cities: []` (la première du tri par code n'a aucune commune).
  const avecCommunes = (wilayas.json as { cities: { id: string }[] }[]).find((w) => w.cities.length > 0);
  expect(avecCommunes, "aucune wilaya n'a de commune : seedReferentials() n'a pas rempli le référentiel").toBeDefined();
  const cityId = avecCommunes!.cities[0]!.id;
  const res = await apiCall("POST", "/venues", jeton, { cityId, nameFr: nomFr, nameAr: nomAr, capacityMax: 300, basePriceCents: 10_000_000, bookingMode: "SINGLE_SLOT" });
  expect(res.status, res.text).toBe(201);
  const { id } = res.json as { id: string };
  if (avecCreneau) {
    const creneau = await apiCall("POST", `/venues/${id}/slot-templates`, jeton, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 10_000_000 });
    expect(creneau.status, creneau.text).toBe(201);
  }
  return id;
}

async function compteAdmin(): Promise<Account> {
  const admin = await createVerifiedAccount("CLIENT");
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [admin.email]);
  } finally {
    await db.end();
  }
  return admin;
}

for (const langue of ["fr", "ar"] as const) {
  for (const largeur of LARGEURS) {
    test.describe(`${langue} · ${largeur} px`, () => {
      const V = MESSAGES[langue];

      test("création → « Ma salle »", async ({ browser }) => {
        const pro = await createVerifiedAccount("PRO");
        const { contexte, page } = await ouvrir(browser, pro, langue, largeur);
        await page.goto(`${PRO}/salles/nouvelle`);
        await markPage(page);
        await creer(page, V, "Salle Alger Centre");
        await versLaListe(page, V);
        await lire(page, V, "creation", langue, largeur);
        await contexte.close();
      });

      test("édition → retour à la liste (nom et prix modifiés)", async ({ browser }) => {
        const existante = await createPublishedVenue();
        const { contexte, page } = await ouvrir(browser, existante.pro, langue, largeur);
        await page.goto(`${PRO}/salles`);
        await expect(cartes(page).first()).toBeVisible();
        await markPage(page);
        await page.getByRole("link", { name: V.list.edit }).first().click();
        await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
        // La carte porte le nom de la langue de l'écran : on modifie LES DEUX noms pour que le changement se voie en français comme en arabe.
        await page.getByLabel(V.form.nameFr, { exact: true }).fill("Salle Les Jasmins");
        await page.getByLabel(V.form.nameAr, { exact: true }).fill("قاعة الياسمين");
        await page.getByLabel(V.form.basePrice, { exact: true }).fill("200000");
        const maj = page.waitForResponse((r) => /\/api\/v1\/venues\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH");
        await page.getByRole("button", { name: V.wizard.next }).click();
        expect((await maj).status()).toBe(200);
        await page.getByRole("link", { name: V.form.back }).first().click();
        await lire(page, V, "edition", langue, largeur);
        await contexte.close();
      });

      test("suppression depuis l'assistant → liste (une salle restante)", async ({ browser }) => {
        const existante = await createPublishedVenue();
        // En arabe la carte porte le nom ARABE : la salle à supprimer en a un qui la distingue de la première.
        await salleDuPro(existante.pro, "Salle à supprimer", false, "قاعة للحذف");
        const { contexte, page } = await ouvrir(browser, existante.pro, langue, largeur);
        await page.goto(`${PRO}/salles`);
        await expect(cartes(page)).toHaveCount(2);
        await markPage(page);
        await page.locator("main ul li").filter({ hasText: langue === "fr" ? "Salle à supprimer" : "قاعة للحذف" }).getByRole("link", { name: V.list.edit }).click();
        await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
        await page.getByRole("button", { name: V.list.delete }).click();
        await page.getByLabel(V.delete.title).getByRole("button", { name: V.delete.confirm }).click();
        await expect(page).toHaveURL(`${PRO}/salles`);
        await lire(page, V, "suppression", langue, largeur);
        await contexte.close();
      });

      test("publication faite ailleurs → entrée dans « Ma salle »", async ({ browser }) => {
        const pro = await createVerifiedAccount("PRO");
        const admin = await compteAdmin();
        const id = await salleDuPro(pro, "Salle à publier", true);
        const { contexte, page } = await ouvrir(browser, pro, langue, largeur);
        await page.goto(`${PRO}/salles`);
        await expect(cartes(page).first()).toBeVisible();
        await markPage(page);
        const publication = await apiCall("POST", `/admin/venues/${id}/publish`, await accessTokenOf(admin));
        expect(publication.status, publication.text).toBe(200);
        // Le pro ne reste pas sur la liste : il va sur un autre écran (le tableau de bord, par le menu), puis REVIENT — c'est l'entrée qui relit.
        await page.getByRole("link", { name: V.nav.dashboard, exact: true }).first().click();
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await versLaListe(page, V);
        await expect(page.getByText(V.publication.published)).toBeVisible();
        await lire(page, V, "publication", langue, largeur);
        await contexte.close();
      });
    });
  }
}
