import { expect, test } from "@playwright/test";
import fr from "../../packages/i18n/messages/fr.json";
import { PRO } from "../playwright.config";
import { createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 30 (D322) — LE LIEN « CALENDRIER DE LA SALLE » DE L'ASSISTANT, DANS UN VRAI NAVIGATEUR.
 *
 * Le défaut (mode K-a) : le bas de l'assistant d'une salle (`apps/pro/src/venues/edit-venue-page.tsx`) portait un lien vers
 * `/salles/<id>/calendrier`, route SUPPRIMÉE par le lot UIP-A (D130). Il s'affichait dès la salle chargée, et son clic
 * tombait sur `<Route path="*">`, qui redirige vers `/` : le tableau de bord, SANS 404 — rien ne disait que le lien était
 * mort. Six semaines de portes vertes : aucun test ne cliquait ce lien, et un test jsdom de la table de routes ne dit pas
 * ce que fait un vrai navigateur (K-d).
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro.
 */
test.beforeAll(() => {
  seedReferentials();
});

test("le lien « Calendrier de la salle » de l'assistant mène au calendrier — pas au tableau de bord", async ({ browser }) => {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext();
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/salles/${salle.id}`);

  const lien = page.getByRole("link", { name: fr.venue.ui.calendar.title, exact: true });
  await expect(lien).toBeVisible();
  await lien.click();

  // L'adresse est celle d'une route DÉCLARÉE, et la page rendue est le calendrier.
  await expect(page).toHaveURL(`${PRO}/calendrier`);
  await expect(page.getByRole("heading", { level: 1, name: fr.venue.ui.calendar.title })).toBeVisible();
  await contexte.close();
});
