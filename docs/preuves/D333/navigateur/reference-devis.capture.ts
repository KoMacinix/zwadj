import { expect, test, type Browser } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { PRO } from "../../../../e2e/playwright.config";
import { createPublishedVenue, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D333 — RANG 39, CAPTURES (lot de CODE ; cette sonde ne touche pas au code du dépôt, elle le JOUE).
 *
 * Ce que Ko regarde : la RÉFÉRENCE du devis (« DEVIS-AAAA-NNNN-MMMM v1 ») telle qu'un pro la voit, en français et en arabe, à 1 280 et à 360 px —
 *  (1) sous le titre du devis, juste après « Calculer le devis » ;
 *  (2) dans la fenêtre de remise, après le choix de la langue du PDF ;
 *  (3) dans le NOM du fichier téléchargé (relevé, pas capturé : un nom de fichier n'a pas d'image).
 * Elle ne JUGE rien : elle écrit des fichiers et des lignes `MESURE …`. Les verdicts sont ceux des tests (`e2e/specs/r33-remise-devis.e2e.ts`). Les noms sont FICTIFS.
 * Patron de `docs/preuves/D332/navigateur/pdf-devis.capture.ts`.
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D333/navigateur/playwright.capture.config.ts
 */
const SORTIE = resolve(__dirname, "images");
type Langue = "fr" | "ar";
const CATALOGUE = { fr: fr.venue.ui, ar: ar.venue.ui } as const;
const LARGEURS = [1280, 360] as const;
const CLIENT = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", email: "amina@example.com", invites: "150" };

test.beforeAll(() => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
});

async function ouvrir(browser: Browser, salle: Awaited<ReturnType<typeof createPublishedVenue>>, langue: Langue, largeur: number) {
  const contexte = await browser.newContext({ viewport: { width: largeur, height: largeur === 360 ? 780 : 900 }, acceptDownloads: true });
  await contexte.addInitScript((lang) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", lang);
    } catch {
      /* stockage indisponible : la page reste en français */
    }
  }, langue);
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: CATALOGUE[langue].walkin.title })).toBeVisible();
  return { contexte, page };
}

test("la référence du devis : à l'écran après le calcul, dans la fenêtre de remise, dans le nom du fichier — français et arabe, 1 280 et 360 px", async ({ browser }) => {
  const salle = await createPublishedVenue();
  for (const langue of ["fr", "ar"] as const) {
    const W = CATALOGUE[langue].walkin;
    for (const largeur of LARGEURS) {
      const { contexte, page } = await ouvrir(browser, salle, langue, largeur);
      await page.getByLabel(W.firstName, { exact: true }).fill(CLIENT.prenom);
      await page.getByLabel(W.lastName, { exact: true }).fill(CLIENT.nom);
      await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
      await page.getByLabel(W.email, { exact: true }).fill(CLIENT.email);
      await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
      await page.getByRole("button", { name: W.continue, exact: true }).click();
      const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
      await expect(jour).toBeEnabled();
      await jour.click();
      await page.locator("button.cal-slot-pick:not([disabled])").first().click();
      await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
      const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
      await page.getByRole("button", { name: W.compute, exact: true }).click();
      const devis = (await (await reponse).json()) as { id: string; reference: string };
      const ligne = page.locator("p.wk-reference");
      await expect(ligne).toBeVisible();
      await ligne.scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(SORTIE, `reference-${langue}-${largeur}.png`) });
      const m = await ligne.evaluate((e) => ({
        texte: e.textContent,
        largeur: Math.round(e.getBoundingClientRect().width),
        deborde: e.scrollWidth > e.clientWidth,
        dir: getComputedStyle(e).direction,
        pageDeborde: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }));
      console.log(`MESURE référence ${langue} ${largeur}px : serveur « ${devis.reference} » · à l'écran « ${m.texte} » · boîte ${m.largeur}px · déborde ${m.deborde} · direction ${m.dir} · page déborde ${m.pageDeborde}`);

      await page.getByRole("button", { name: CATALOGUE[langue].quotes.sv_PRINT, exact: true }).click();
      const boite = page.getByRole("dialog", { name: W.langDialogTitle });
      await expect(boite).toBeVisible();
      const telechargement = page.waitForEvent("download");
      await boite.getByRole("button", { name: langue === "fr" ? W.langFrench : W.langArabic, exact: true }).click();
      const fichier = await telechargement;
      console.log(`MESURE fichier ${langue} ${largeur}px : « ${fichier.suggestedFilename()} »`);
      const fenetre = page.getByRole("dialog", { name: W.remitTitleDone });
      await expect(fenetre).toBeVisible();
      await page.screenshot({ path: resolve(SORTIE, `remise-${langue}-${largeur}.png`) });
      const f = await fenetre.evaluate((e) => ({ texte: (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 400), deborde: e.scrollWidth > e.clientWidth }));
      console.log(`MESURE remise ${langue} ${largeur}px : déborde ${f.deborde} · texte « ${f.texte} »`);
      await contexte.close();
    }
  }
});
