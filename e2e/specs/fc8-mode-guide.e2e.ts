import { expect, test } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT } from "../playwright.config";
import { seedReferentials } from "../fixtures/harness";

/**
 * FC-8 (session `front-client`) — LE LOT ③ : L'ASSISTANT EST UN MODE DE `/salles` (D229, D230, D231), DANS UN VRAI NAVIGATEUR.
 *
 * ⚠ CE QUE LES TESTS UNITAIRES NE VOIENT PAS (D205) : la page `/salles` est un composant SERVEUR — c'est elle qui lit `guide`
 * (`parseGuide`) et le passe à la vue ; et chaque réponse est une NAVIGATION réelle (le routeur de l'application), après laquelle
 * le serveur rend la page de nouveau, à l'étape suivante. Ici on mesure le parcours tel qu'un visiteur le vit.
 * ⚠ Joué AVEC et SANS JavaScript : sans lui, `/salles?guide=…` doit rester la page de résultats entière (le panneau ne s'y monte
 * pas) ; et en ARABE, depuis l'entrée « Li hwas lqa » de l'accueil.
 * ⚠ Les libellés viennent des CATALOGUES, jamais d'une chaîne tapée ici.
 */
test.beforeAll(() => {
  seedReferentials();
});

test("fr — `/salles?guide=guests` ouvre l'assistant par-dessus les résultats ; chaque réponse pousse l'URL ; « Voir les salles » le ferme", async ({ page }) => {
  await page.goto(`${CLIENT}/fr/salles?guide=guests`);
  const boite = page.getByRole("dialog");
  await expect(boite).toBeVisible();
  await expect(boite.locator("#wz-question")).toHaveText(fr.wizard.qGuests);

  await boite.getByLabel(fr.wizard.stepGuests).fill("250");
  await boite.getByRole("button", { name: fr.wizard.continue }).click();
  await expect(page).toHaveURL(/[?&]guide=budget(&|$)/);
  await expect(page).toHaveURL(/[?&]guests=250(&|$)/);

  await page.getByRole("dialog").getByRole("button", { name: fr.wizard.budgetAny }).click();
  await expect(page).toHaveURL(/[?&]guide=taste(&|$)/);

  await page.getByRole("dialog").getByRole("button", { name: fr.wizard.see }).click();
  await expect(page).not.toHaveURL(/[?&]guide=/);
  await expect(page).toHaveURL(/[?&]guests=250(&|$)/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("fr — une valeur INCONNUE de `guide` n'ouvre rien (D230) : la page de résultats seule", async ({ page }) => {
  await page.goto(`${CLIENT}/fr/salles?guide=nimporte`);
  await expect(page.locator(".search-shell")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

// ⚠ SANS JAVASCRIPT, mesuré sur le HTML SERVI et non à l'écran : relevé contre l'état d'AVANT ce lot, la page `/salles` sans
// JavaScript reste sur la roue de `loading.tsx` (le contenu diffusé n'est révélé que par un script) — un défaut ANTÉRIEUR, rapporté
// au rapport de FC-8, hors de ce lot. Ce que ce lot doit garantir se lit dans le document : le panneau n'y est PAS (il se monte
// côté client), le formulaire de recherche, si.
test("fr — sans JavaScript, le HTML servi de `/salles?guide=city` ne porte AUCUN panneau, et porte le formulaire de recherche", async ({ request }) => {
  const reponse = await request.get(`${CLIENT}/fr/salles?guide=city`);
  expect(reponse.status()).toBe(200);
  const html = await reponse.text();
  expect(html.includes('role="dialog"')).toBe(false);
  expect(html.includes('class="filters"')).toBe(true);
});

test("ar — « Li hwas lqa » de l'accueil ouvre l'assistant à la commune, en arabe", async ({ page }) => {
  await page.goto(`${CLIENT}/ar`);
  await page.getByRole("link", { name: ar.home.search.assistant }).click();
  await expect(page).toHaveURL(/\/ar\/salles\?guide=city$/);
  await expect(page.getByRole("dialog").locator("#wz-question")).toHaveText(ar.wizard.qCity);
});
