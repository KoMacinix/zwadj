import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import fr from "../../packages/i18n/messages/fr.json";
import ar from "../../packages/i18n/messages/ar.json";
import { PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 33 (D326) — LA REMISE DU DEVIS, DE BOUT EN BOUT, DANS UN VRAI NAVIGATEUR : un bouton enregistre le canal ET télécharge le PDF, et la fenêtre dit ce qui a eu lieu.
 *
 * Ce qu'aucun test de composant ne voit : le téléchargement RÉEL (l'événement `download` du navigateur, le fichier sur disque), le PDF rendu par le VRAI serveur (le
 * moteur est le Chromium de Playwright), et la route protégée appelée avec le VRAI jeton. jsdom n'a ni téléchargement ni moteur de rendu.
 *
 * ⛔ RÈGLE DES MONTANTS : le PDF est généré CÔTÉ SERVEUR à partir des valeurs STOCKÉES ; ce test ne calcule aucun montant. Le fichier est lu en OCTETS (%PDF-, police embarquée) —
 * le détail des montants imprimés est mesuré par `apps/api/test/int/quote-document.int-spec.ts` et par la preuve de l'arabe.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro. Aucune date n'est écrite : le calendrier propose le premier jour libre.
 */
const W = fr.venue.ui.walkin;
const WA = ar.venue.ui.walkin;
const CLIENT = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", invites: "150", email: "amina@example.com" };

// `createPublishedVenue` exige les référentiels (une salle exige une commune) : le semis de PRODUCTION, idempotent — comme les autres specs qui créent une salle.
test.beforeAll(() => {
  seedReferentials();
});

async function ouvrir(browser: Browser, langue: "fr" | "ar" = "fr"): Promise<{ salle: Awaited<ReturnType<typeof createPublishedVenue>>; contexte: BrowserContext; page: Page }> {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext({ acceptDownloads: true });
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
  await expect(page.getByRole("heading", { level: 1, name: (langue === "fr" ? W : WA).title })).toBeVisible();
  return { salle, contexte, page };
}

/** Du formulaire client — AVEC une adresse, pour que le canal « e-mail » soit actif — jusqu'au devis CALCULÉ ; rend l'identifiant du devis créé par le serveur. */
async function jusquAuDevis(page: Page, libelles: typeof W = W): Promise<string> {
  await page.getByLabel(libelles.firstName, { exact: true }).fill(CLIENT.prenom);
  await page.getByLabel(libelles.lastName, { exact: true }).fill(CLIENT.nom);
  await page.getByLabel(libelles.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByLabel(libelles.email, { exact: true }).fill(CLIENT.email);
  await page.getByLabel(libelles.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: libelles.continue, exact: true }).click();
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour, "le calendrier du parcours ne propose aucun jour libre").toBeEnabled();
  await jour.click();
  const creneau = page.locator("button.cal-slot-pick:not([disabled])").first();
  await expect(creneau, "le jour choisi ne propose aucun créneau libre").toBeEnabled();
  await creneau.click();
  await page.getByRole("button", { name: libelles.seeQuote, exact: true }).click();
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: libelles.compute, exact: true }).click();
  return ((await (await reponse).json()) as { id: string }).id;
}

const NOM_DE_FICHIER = /^devis-\d{4}-\d{2}-\d{2}-v\d+-[0-9a-f]{8}\.pdf$/;

for (const [canal, langue] of [["PRINT", "fr"], ["EMAIL", "fr"], ["SMS", "ar"]] as const) {
  test(`« ${canal} » en ${langue} : le navigateur TÉLÉCHARGE un vrai PDF, le serveur ENREGISTRE le canal, la fenêtre le DIT`, async ({ browser }) => {
    const libelles = langue === "fr" ? W : WA;
    const catalogue = langue === "fr" ? fr : ar;
    const { salle, contexte, page } = await ouvrir(browser, langue);
    const devisId = await jusquAuDevis(page, libelles);

    const libelle = (catalogue.venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string;
    const telechargement = page.waitForEvent("download");
    await page.getByRole("button", { name: libelle, exact: true }).click();
    const fichier = await telechargement;

    // Le fichier : un nom sans donnée personnelle, des octets de PDF, la police du dépôt embarquée (ce n'est pas une page d'erreur enregistrée sous .pdf).
    expect(fichier.suggestedFilename()).toMatch(NOM_DE_FICHIER);
    expect(fichier.suggestedFilename()).toContain(devisId.slice(0, 8));
    const octets = readFileSync((await fichier.path()) as string);
    expect(octets.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(octets.toString("latin1")).toContain("ReadexPro");

    // La fenêtre dit les DEUX issues, et — pour le SMS et l'e-mail — que Zwadj n'envoie PAS encore : aucun écran ne dit que Zwadj a envoyé quoi que ce soit.
    const fenetre = page.getByRole("dialog", { name: libelles.remitTitleDone });
    await expect(fenetre).toBeVisible();
    await expect(fenetre).toContainText(libelles.remitPdfDone);
    await expect(fenetre).toContainText(libelles.remitRecorded.replace("{channel}", libelle));
    if (canal === "SMS") await expect(fenetre).toContainText(libelles.remitNotSentSMS);
    if (canal === "EMAIL") await expect(fenetre).toContainText(libelles.remitNotSentEMAIL);
    if (canal === "PRINT") await expect(fenetre).not.toContainText("n'envoie pas");

    // Le SERVEUR a écrit le canal — la fenêtre dit ce qui a eu lieu, elle ne le suppose pas.
    const token = await accessTokenOf(salle.pro);
    const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token);
    expect(liste.status).toBe(200);
    const devis = (liste.json as { id: string; sentVia: string | null }[]).find((q) => q.id === devisId);
    expect(devis?.sentVia).toBe(canal);

    await page.getByRole("button", { name: libelles.doneDialogClose }).click();
    await expect(fenetre).toHaveCount(0);
    await contexte.close();
  });
}

test("le canal « e-mail » est INACTIF sans adresse, ACTIF avec — et rien n'est téléchargé tant qu'il est grisé", async ({ browser }) => {
  const { contexte, page } = await ouvrir(browser);
  await page.getByLabel(W.firstName, { exact: true }).fill(CLIENT.prenom);
  await page.getByLabel(W.lastName, { exact: true }).fill(CLIENT.nom);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour).toBeEnabled();
  await jour.click();
  await page.locator("button.cal-slot-pick:not([disabled])").first().click();
  await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  const email = page.getByRole("button", { name: fr.venue.ui.quotes.sv_EMAIL, exact: true });
  await expect(email).toBeDisabled();
  await expect(page.locator("#wk-deliver-reason")).toContainText(W.deliverEmailRequired);
  await expect(email).toHaveAttribute("aria-describedby", "wk-deliver-reason");
  await contexte.close();
});

test("⛔ une révision rend le PDF de l'ancienne version REFUSÉ (409) et celui de la nouvelle servi — la décision 1, de bout en bout", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  const v1 = await jusquAuDevis(page);
  await contexte.close();
  const token = await accessTokenOf(salle.pro);
  const avant = await apiCall("GET", `/quotes/${v1}/document?locale=fr`, token);
  expect(avant.status, "la v1 est encore la dernière version : le PDF est servi").toBe(200);
  // Le pro change une condition (le nombre d'invités) : le serveur RÉVISE la chaîne — une version N+1, la v1 ne bouge pas. Les conditions de la v1 sont RELUES chez le serveur.
  const lue = ((await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token)).json as { id: string; eventDate: string; slotTemplateId: string }[]).find((q) => q.id === v1)!;
  const revision = await apiCall("POST", `/quotes/${v1}/revise`, token, { eventDate: lue.eventDate, slotTemplateId: lue.slotTemplateId, guests: 120 });
  expect(revision.status).toBe(201);
  const v2 = (revision.json as { id: string }).id;
  const ancienne = await apiCall("GET", `/quotes/${v1}/document?locale=fr`, token);
  expect(ancienne.status, "la v1 n'est plus la version active").toBe(409);
  expect(ancienne.text).toContain("QUOTE_VERSION_NOT_ACTIVE");
  const nouvelle = await apiCall("GET", `/quotes/${v2}/document?locale=fr`, token);
  expect(nouvelle.status).toBe(200);
});
