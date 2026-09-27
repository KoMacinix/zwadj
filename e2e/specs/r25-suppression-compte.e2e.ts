import { expect, test } from "@playwright/test";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT, PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createVerifiedAccount, loginContext } from "../fixtures/harness";

/**
 * RANG 25 (D316), DÉFAUT 3 — LA SECTION « SUPPRIMER MON COMPTE » EN ERREUR.
 *
 * Mesuré par D315 : sans demande, `GET /me/deletion-request` rendait un 200
 * SANS CORPS ; le transport partagé refuse — délibérément — un corps vide hors
 * 204 et levait ; la section affichait « Impossible de vérifier » dans les DEUX
 * applications et ne proposait pas la demande (D37). Tout compte neuf était
 * dans ce cas.
 *
 * Quatre tests : deux applications × deux cas. « Aucune demande » est l'état
 * NORMAL d'un compte, pas une erreur. Le cas « avec une demande » ne rougissait
 * pas avant le correctif — il garde qu'on ne l'a pas cassé en réparant l'autre
 * (MD3-d).
 */
const D = fr.account.ui.deletion;
const echapper = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Le message d'attente porte une date : on en garde le début, jusqu'au gabarit. */
const EN_ATTENTE = new RegExp(`^${echapper(D.pending.slice(0, D.pending.indexOf("{")))}`);

const APPLICATIONS = [
  { nom: "client", role: "CLIENT" as const, url: `${CLIENT}/fr/compte` },
  { nom: "pro", role: "PRO" as const, url: `${PRO}/compte` }
];

for (const app of APPLICATIONS) {
  test(`${app.nom} — sans demande : la section propose la demande, sans erreur`, async ({ browser }) => {
    const compte = await createVerifiedAccount(app.role);
    const contexte = await browser.newContext();
    await loginContext(contexte, compte);
    const page = await contexte.newPage();
    await page.goto(app.url);

    const echec = page.getByText(D.loadFailed);
    const demander = page.getByRole("button", { name: D.submit });
    // La section a fini de charger — dans un sens ou dans l'autre.
    await expect(echec.or(demander)).toBeVisible();
    await expect(echec, "la section de suppression est en ERREUR pour un compte sans demande").toHaveCount(0);
    await expect(demander).toBeVisible();
    await contexte.close();
  });

  test(`${app.nom} — avec une demande : la section l'affiche en attente`, async ({ browser }) => {
    const compte = await createVerifiedAccount(app.role);
    const depot = await apiCall("POST", "/me/deletion-request", await accessTokenOf(compte), {});
    expect(depot.status).toBe(201);
    const contexte = await browser.newContext();
    await loginContext(contexte, compte);
    const page = await contexte.newPage();
    await page.goto(app.url);

    await expect(page.getByText(EN_ATTENTE)).toBeVisible();
    await expect(page.getByRole("button", { name: D.cancel })).toBeVisible();
    await expect(page.getByText(D.loadFailed)).toHaveCount(0);
    await contexte.close();
  });
}
