import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import fr from "../../packages/i18n/messages/fr.json";
import { DATABASE_URL, PRO } from "../playwright.config";
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
} from "../fixtures/harness";

/**
 * RANG 37 (D331), LOT L35-1 — « MA SALLE » : LA LISTE DES SALLES EST RELUE APRÈS TOUTE MODIFICATION, DANS UN VRAI NAVIGATEUR.
 *
 * Ce qu'aucun test de composant ne voit : le VRAI serveur (la salle n'existe qu'une fois la requête RÉPONDUE), le VRAI routeur (une navigation interne ne recharge pas le document),
 * et — pour la publication — un acte fait dans une AUTRE session, par un autre compte, auquel le navigateur du pro n'est averti de rien. Le défaut est celui du relevé 4 de D327
 * (S4 à S8, reproduit dans un navigateur) ; la décision 2 du relecteur (D331) : la publication n'a pas d'écran administrateur, elle se prouve ICI, et non par Ko.
 *
 * ⚠ CHAQUE TEST POSE UN TÉMOIN SUR `window` (`markPage`) APRÈS le chargement du document et le LIT (`pageStillAlive`) AVANT son verdict : si le document était rechargé, la liste serait
 * fraîche pour la mauvaise raison et le test serait vert sans mesurer ce qu'il prétend (D127, A5). Aucune lecture n'est faite après un `page.goto` ou un `page.reload`.
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SES comptes et SES salles ; les noms sont FICTIFS.
 */
const V = fr.venue.ui;

test.beforeAll(() => {
  seedReferentials();
});

async function ouvrir(browser: Browser, compte: Account): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript((lang) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", lang);
    } catch {
      /* stockage indisponible : la page reste en français */
    }
  }, "fr");
  await loginContext(contexte, compte);
  const page = await contexte.newPage();
  return { contexte, page };
}

const cartes = (page: Page) => page.locator("main ul li h2");
const navSalles = (page: Page) => page.getByRole("link", { name: /^(Ma salle|Mes salles)$/ }).first();
const navTableauDeBord = (page: Page) => page.getByRole("link", { name: V.nav.dashboard, exact: true }).first();

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

/** Une salle créée par l'API réelle pour ce pro (brouillon). Rend son identifiant. */
async function salleDuPro(pro: Account, nomFr: string, avecCreneau = false): Promise<string> {
  const jeton = await accessTokenOf(pro);
  const wilayas = await apiCall("GET", "/wilayas");
  // ⚠ Forme RELEVÉE dans `WilayaDTO` (`packages/types/src/referentials.ts`) : les wilayas hors couverture ont `cities: []` — la première du tri par code n'a AUCUNE commune.
  const avecCommunes = (wilayas.json as { cities: { id: string }[] }[]).find((w) => w.cities.length > 0);
  expect(avecCommunes, "aucune wilaya n'a de commune : seedReferentials() n'a pas rempli le référentiel").toBeDefined();
  const cityId = avecCommunes!.cities[0]!.id;
  const res = await apiCall("POST", "/venues", jeton, { cityId, nameFr: nomFr, nameAr: "قاعة", capacityMax: 300, basePriceCents: 10_000_000, bookingMode: "SINGLE_SLOT" });
  expect(res.status, res.text).toBe(201);
  const { id } = res.json as { id: string };
  if (avecCreneau) {
    // La garde « au moins un créneau actif » : sans lui l'administrateur ne peut pas publier.
    const creneau = await apiCall("POST", `/venues/${id}/slot-templates`, jeton, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 10_000_000 });
    expect(creneau.status, creneau.text).toBe(201);
  }
  return id;
}

/** Un compte ADMIN : aucun chemin du produit n'en crée un (décision n° 4) — l'élévation passe par la base, comme `createPublishedVenue`. */
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

test.describe("R37 — « Ma salle » est relue sans rechargement", () => {
  test("CRÉER : la salle créée est dans la liste quand on revient à « Ma salle » (menu du haut), sans rechargement", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const { contexte, page } = await ouvrir(browser, pro);
    await page.goto(`${PRO}/salles/nouvelle`);
    await markPage(page);
    await creer(page, "R37 Salle créée");
    await navSalles(page).click();
    await expect(cartes(page)).toHaveText(["R37 Salle créée"]);
    await expect(page.getByText(V.list.empty.title)).toHaveCount(0);
    expect(await pageStillAlive(page), "le document a été rechargé : ce n'est plus un retour sans rechargement").toBe(true);
    await contexte.close();
  });

  test("MODIFIER : le nouveau nom est dans la liste quand on revient par « Retour à mes salles », sans rechargement (et le nom de l'assistant est celui du SERVEUR)", async ({ browser }) => {
    const existante = await createPublishedVenue();
    const { contexte, page } = await ouvrir(browser, existante.pro);
    await page.goto(`${PRO}/salles`);
    await expect(cartes(page)).toHaveText([existante.nameFr]);
    await markPage(page);
    await page.getByRole("link", { name: V.list.edit }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
    await page.getByLabel(V.form.nameFr, { exact: true }).fill("R37 Nom modifié");
    const maj = page.waitForResponse((r) => /\/api\/v1\/venues\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: V.wizard.next }).click();
    expect((await maj).status()).toBe(200);
    await page.getByRole("link", { name: V.form.back }).first().click();
    await expect(cartes(page)).toHaveText(["R37 Nom modifié"]);
    expect(await pageStillAlive(page), "le document a été rechargé : ce n'est plus un retour sans rechargement").toBe(true);
    await contexte.close();
  });

  test("CRÉER puis CORRIGER dans la même session (S8 de D327) : la liste porte le nom corrigé, pas celui de la création", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const { contexte, page } = await ouvrir(browser, pro);
    await page.goto(`${PRO}/salles/nouvelle`);
    await markPage(page);
    await creer(page, "R37 nom à la création");
    await page.getByRole("button", { name: V.wizard.previous }).click();
    await page.getByLabel(V.form.nameFr, { exact: true }).fill("R37 nom corrigé");
    const maj = page.waitForResponse((r) => /\/api\/v1\/venues\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: V.wizard.next }).click();
    expect((await maj).status()).toBe(200);
    await navSalles(page).click();
    await expect(cartes(page)).toHaveText(["R37 nom corrigé"]);
    expect(await pageStillAlive(page), "le document a été rechargé").toBe(true);
    await contexte.close();
  });

  test("SUPPRIMER depuis l'assistant : la salle supprimée n'est plus dans la liste, et le libellé du menu repasse au singulier, sans rechargement", async ({ browser }) => {
    const existante = await createPublishedVenue();
    await salleDuPro(existante.pro, "R37 Seconde salle");
    const { contexte, page } = await ouvrir(browser, existante.pro);
    await page.goto(`${PRO}/salles`);
    await expect(cartes(page)).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Mes salles", exact: true }).first()).toBeVisible();
    await markPage(page);
    await page.locator("main ul li").filter({ hasText: "R37 Seconde salle" }).getByRole("link", { name: V.list.edit }).click();
    await expect(page.getByRole("heading", { level: 1, name: V.form.editTitle })).toBeVisible();
    await page.getByRole("button", { name: V.list.delete }).click();
    // ⚠ le bouton « Supprimer » existe deux fois (la page, et la fenêtre de confirmation) : le second est celui de la FENÊTRE.
    await page.getByLabel(V.delete.title).getByRole("button", { name: V.delete.confirm }).click();
    await expect(page).toHaveURL(`${PRO}/salles`);
    await expect(cartes(page)).toHaveText([existante.nameFr]);
    await expect(page.getByRole("link", { name: "Ma salle", exact: true }).first()).toBeVisible();
    expect(await pageStillAlive(page), "le document a été rechargé").toBe(true);
    await contexte.close();
  });

  test("PUBLIER (par un autre compte, pendant que le pro est dans l'application) : l'entrée dans « Ma salle » montre « Publiée », sans rechargement", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const admin = await compteAdmin();
    const id = await salleDuPro(pro, "R37 Salle à publier", true);
    const { contexte, page } = await ouvrir(browser, pro);
    await page.goto(`${PRO}/`);
    await markPage(page);
    await navSalles(page).click();
    await expect(cartes(page)).toHaveText(["R37 Salle à publier"]);
    // ⚠ Le statut est le texte NU d'un <span> dont un enfant porte le mot « Publication » : avec `exact: true`, Playwright compare « PublicationEn attente… » au libellé et ne trouve RIEN.
    await expect(page.getByText(V.publication.draft)).toBeVisible();
    // Le pro QUITTE la liste ; l'administrateur publie dans SA session — rien n'avertit le navigateur du pro.
    await navTableauDeBord(page).click();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const publication = await apiCall("POST", `/admin/venues/${id}/publish`, await accessTokenOf(admin));
    expect(publication.status, publication.text).toBe(200);
    // Il REVIENT sur « Ma salle » : c'est l'entrée dans la liste qui relit.
    await navSalles(page).click();
    await expect(page.getByText(V.publication.published)).toBeVisible();
    await expect(page.getByText(V.publication.draft)).toHaveCount(0);
    expect(await pageStillAlive(page), "le document a été rechargé : la liste serait fraîche pour la mauvaise raison").toBe(true);
    await contexte.close();
  });
});
