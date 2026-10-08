import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PRO } from "../../../../e2e/playwright.config";
import { createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D326 — L'ASSISTANT DE SALLE ET « MA SALLE », VUS DANS UN VRAI NAVIGATEUR (décision 11 (a) et (c) du relecteur).
 *
 * (a) « 1. 01L'essentiel » est d'abord CONSTATÉ dans un navigateur — il n'est pas mesuré à ce jour (D325 le dit : « constaté sur une capture, NON mesuré »). Cette sonde MESURE :
 *     le type de liste que le navigateur applique à l'`<ol>` de l'assistant, le texte de chaque entrée tel qu'un lecteur le lit, et prend les captures.
 * (c) La salle absente de « Ma salle » est d'abord REPRODUITE : un pro SANS salle crée la sienne par l'assistant, puis revient à la liste par la NAVIGATION INTERNE (aucun
 *     rechargement) ; la sonde écrit si la salle y est.
 *
 * Elle ne juge RIEN : elle écrit des lignes `MESURE …` et des images. Le jugement est dans les tests unitaires (`venue-wizard.test.tsx`, `create-venue-page.test.tsx`) ; ceci
 * montre ce que ni jsdom ni une relecture du CSS ne peuvent montrer (la feuille de style réellement appliquée). Rejouée AVANT puis APRÈS le correctif ; le préfixe de
 * `ETAT` dans l'environnement (`D326_ETAT=avant|apres`) range les images.
 */
const ETAT = process.env.D326_ETAT ?? "apres";
const SORTIE = resolve(__dirname, "captures", ETAT);
const LANGUES = ["fr", "ar"] as const;
type Langue = (typeof LANGUES)[number];

test.beforeAll(() => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
});

async function ouvrir(browser: Browser, langue: Langue, viewport: { width: number; height: number }, compte: Parameters<typeof loginContext>[1]) {
  const contexte: BrowserContext = await browser.newContext({ viewport });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), langue);
  await loginContext(contexte, compte);
  const page = await contexte.newPage();
  return { contexte, page };
}

async function photo(page: Page, nom: string, plein = true) {
  await page.screenshot({ path: resolve(SORTIE, `${nom}.png`), fullPage: plein });
  console.log(`CAPTURE ${ETAT}/${nom}.png`);
}

for (const langue of LANGUES) {
  for (const [nomVue, viewport] of [["1280", { width: 1280, height: 900 }], ["360", { width: 360, height: 780 }]] as const) {
    test(`assistant de salle — ${langue}, ${nomVue} px : l'état de la liste d'étapes, mesuré puis photographié`, async ({ browser }) => {
      const salle = await createPublishedVenue();
      const { contexte, page } = await ouvrir(browser, langue, viewport, salle.pro);
      await page.goto(`${PRO}/salles/${salle.id}?etape=3`);
      const barre = page.locator("nav").filter({ has: page.locator("ol") }).first();
      await expect(barre).toBeVisible();
      await page.waitForTimeout(400);
      const mesure = await page.evaluate(() => {
        const ol = document.querySelector("nav ol") as HTMLElement | null;
        if (ol === null) return null;
        const premier = ol.querySelector("li") as HTMLElement;
        const style = getComputedStyle(ol);
        const puce = getComputedStyle(premier);
        return {
          classes: ol.parentElement?.className ?? "",
          listStyleType: style.listStyleType,
          premierItemListStyle: puce.listStyleType,
          entrees: [...ol.querySelectorAll("li")].map((li) => (li.textContent ?? "").replace(/\s+/g, "·")),
          textesParEntree: [...ol.querySelectorAll("li")].map((li) => (li.textContent ?? "")),
          boutons: ol.querySelectorAll("button").length,
          dernier: ol.querySelectorAll("li").length
        };
      });
      console.log(`MESURE assistant ${ETAT} ${langue} ${nomVue} : ${JSON.stringify(mesure)}`);
      await photo(page, `assistant-${langue}-${nomVue}`);
      await barre.screenshot({ path: resolve(SORTIE, `assistant-liste-${langue}-${nomVue}.png`) });
      console.log(`CAPTURE ${ETAT}/assistant-liste-${langue}-${nomVue}.png`);
      await contexte.close();
    });
  }
}

test(`« Ma salle » — un pro sans salle crée la sienne par l'assistant puis revient à la liste par la NAVIGATION INTERNE (état : ${ETAT})`, async ({ browser }) => {
  const compte = await createVerifiedAccount("PRO");
  const { contexte, page } = await ouvrir(browser, "fr", { width: 1280, height: 900 }, compte);
  await page.goto(`${PRO}/salles/nouvelle`);
  await page.getByLabel("Nom (français)", { exact: true }).fill("Salle Capture D326");
  await page.getByLabel("Nom (arabe)", { exact: true }).fill("قاعة التقاط");
  const commune = page.getByLabel("Commune", { exact: true });
  const premiere = await commune.locator("option:not([value=''])").first().getAttribute("value");
  await commune.selectOption(premiere as string);
  await page.getByLabel("Capacité maximale", { exact: true }).fill("400");
  await page.getByLabel("Prix de base", { exact: true }).fill("150000");
  await page.getByRole("button", { name: "Créer la salle et continuer" }).click();
  await expect(page.getByText("Étape 2 sur 7")).toBeVisible();
  // NAVIGATION INTERNE : on clique le lien « Ma salle » de la coquille — aucun rechargement de page.
  await page.getByRole("link", { name: /^(Ma salle|Mes salles)$/ }).first().click();
  await page.waitForTimeout(800);
  const visible = await page.getByText("Salle Capture D326").first().isVisible().catch(() => false);
  const libelle = await page.getByRole("link", { name: /^(Ma salle|Mes salles)$/ }).first().textContent();
  console.log(`MESURE ma-salle ${ETAT} : la salle créée est dans la liste sans rafraîchir = ${visible} · libellé de la navigation = « ${libelle} » · URL = ${new URL(page.url()).pathname}`);
  await photo(page, "ma-salle-apres-creation");
  // Le même écran après un RECHARGEMENT : ce que le pro devait faire à la main.
  await page.reload();
  await page.waitForTimeout(800);
  const visibleApresRechargement = await page.getByText("Salle Capture D326").first().isVisible().catch(() => false);
  console.log(`MESURE ma-salle ${ETAT} : la salle est dans la liste APRÈS rechargement = ${visibleApresRechargement}`);
  await contexte.close();
});
