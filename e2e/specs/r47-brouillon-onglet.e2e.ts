import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { PRO } from "../playwright.config";
import { createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 47 (D345) — LE PARCOURS « NOUVELLE RÉSERVATION » GARDE SON ÉTAPE ET SES SAISIES QUAND ON CHANGE D'ONGLET, DANS UN VRAI NAVIGATEUR.
 *
 * La demande de Ko (08/11/2026) : « garder en mémoire l'étape et les données du client sur place, et ne pas revenir au début dès qu'on passe à un onglet Demandes ou autre ».
 * Ce que cette spec joue, contre l'écran d'AUJOURD'HUI (contact d'abord, puis les noms — rang 41) et le vrai serveur :
 *   · une saisie NON validée, puis une étape VALIDÉE, survivent à un aller-retour par « Demandes » (navigation de l'application, jamais un rechargement) ;
 *   · « Recommencer » vide le parcours, et il le reste après un aller-retour ;
 *   · un RECHARGEMENT de la page vide tout (le brouillon vit en mémoire seulement, R-1/R-2) ;
 *   · le bouton porte le même rôle en arabe.
 *
 * ⚠ La navigation passe par les LIENS de la barre du haut, et un marqueur posé sur `window` PROUVE qu'aucun rechargement n'a eu lieu : sans lui, un `page.goto` aurait vidé la
 * mémoire et le test serait vert ou rouge pour une autre raison. ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro.
 * ⚠ Elle ne reprend rien de la spec du rang 32 (`docs/preuves/D325/navigateur/`), arrêtée par D344 : les gestes sont écrits pour l'écran d'aujourd'hui.
 */
const CLIENT = { chiffres: "661234567", nomLatin: "Amina Bensalem", invites: "150" };
const CATALOGUES = { fr, ar } as const;

test.beforeAll(() => {
  seedReferentials();
});

async function ouvrir(browser: Browser, langue: "fr" | "ar"): Promise<{ contexte: BrowserContext; page: Page }> {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext();
  await contexte.addInitScript((l) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", l);
    } catch {
      /* stockage indisponible : la page reste dans sa langue par défaut */
    }
  }, langue);
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: CATALOGUES[langue].venue.ui.walkin.title })).toBeVisible();
  return { contexte, page };
}

const question = (page: Page) => page.locator("#wk-question");

/** Un changement d'onglet de l'APPLICATION : un clic sur le lien de la barre du haut, jamais une navigation du navigateur. */
async function allerEtRevenir(page: Page, langue: "fr" | "ar") {
  const nav = CATALOGUES[langue].venue.ui.nav;
  const barre = page.getByRole("navigation", { name: nav.label });
  await barre.getByRole("link", { name: nav.requests, exact: true }).click();
  await expect(page, "l'onglet « Demandes » est ouvert").toHaveURL(`${PRO}/demandes`);
  await barre.getByRole("link", { name: nav.dashboard, exact: true }).click();
  await expect(page, "retour au tableau de bord").toHaveURL(`${PRO}/`);
}

/** Le marqueur posé avant le changement d'onglet : s'il a disparu, la page a été RECHARGÉE et le test ne mesure plus ce qu'il croit. */
const poserMarqueur = (page: Page) => page.evaluate(() => ((window as unknown as { __r47?: number }).__r47 = 47));
const marqueur = (page: Page) => page.evaluate(() => (window as unknown as { __r47?: number }).__r47);

test("⛔ (fr) une saisie non validée puis une étape validée survivent à un aller-retour par « Demandes » ; « Recommencer » vide ; un rechargement vide", async ({ browser }) => {
  const { contexte, page } = await ouvrir(browser, "fr");
  const W = CATALOGUES.fr.venue.ui.walkin;
  await poserMarqueur(page);

  // Étape CONTACT : un numéro tapé et VALIDÉ, puis l'étape CLIENT : un nom et un nombre d'invités tapés, NON validés.
  await expect(question(page)).toHaveText(W.qContact);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await expect(question(page)).toHaveText(W.qClient);
  await page.getByLabel(W.nameLatin, { exact: true }).fill(CLIENT.nomLatin);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);

  await allerEtRevenir(page, "fr");

  expect(await marqueur(page), "aucun rechargement : la page est la même").toBe(47);
  await expect(question(page), "la même étape").toHaveText(W.qClient);
  await expect(page.getByLabel(W.nameLatin, { exact: true })).toHaveValue(CLIENT.nomLatin);
  await expect(page.getByLabel(W.guests, { exact: true })).toHaveValue(CLIENT.invites);

  // L'étape CLIENT validée (la fiche se crée) : on est à la date ; un second aller-retour garde l'étape ET le récapitulatif des réponses.
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await expect(question(page)).toHaveText(W.qDate);
  await expect(page.getByRole("list", { name: W.recapLabel })).toContainText(CLIENT.nomLatin);

  await allerEtRevenir(page, "fr");

  expect(await marqueur(page)).toBe(47);
  await expect(question(page), "la même étape").toHaveText(W.qDate);
  await expect(page.getByRole("list", { name: W.recapLabel }), "le récapitulatif des réponses").toContainText(CLIENT.nomLatin);

  // « Recommencer » : tout est vide, et le reste après un aller-retour.
  await page.getByRole("button", { name: W.reset, exact: true }).click();
  await expect(question(page)).toHaveText(W.qContact);
  await allerEtRevenir(page, "fr");
  await expect(question(page)).toHaveText(W.qContact);
  await expect(page.getByLabel(W.phone, { exact: true })).toHaveValue("");

  // Un rechargement vide tout : on retape un numéro, on recharge.
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await expect(page.getByLabel(W.phone, { exact: true })).not.toHaveValue("");
  await page.reload();
  await expect(question(page)).toHaveText(W.qContact);
  await expect(page.getByLabel(W.phone, { exact: true })).toHaveValue("");
  expect(await marqueur(page), "la page a bien été rechargée").toBeUndefined();

  await contexte.close();
});

test("⛔ (ar) le même parcours : l'étape et la saisie survivent à l'aller-retour, et « إعادة البدء » vide", async ({ browser }) => {
  const { contexte, page } = await ouvrir(browser, "ar");
  const W = CATALOGUES.ar.venue.ui.walkin;
  await poserMarqueur(page);

  await expect(question(page)).toHaveText(W.qContact);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await expect(question(page)).toHaveText(W.qClient);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);

  await allerEtRevenir(page, "ar");

  expect(await marqueur(page)).toBe(47);
  await expect(question(page), "la même étape").toHaveText(W.qClient);
  await expect(page.getByLabel(W.guests, { exact: true })).toHaveValue(CLIENT.invites);

  await page.getByRole("button", { name: W.reset, exact: true }).click();
  await expect(question(page)).toHaveText(W.qContact);
  await allerEtRevenir(page, "ar");
  await expect(question(page)).toHaveText(W.qContact);
  await expect(page.getByLabel(W.phone, { exact: true })).toHaveValue("");

  await contexte.close();
});
