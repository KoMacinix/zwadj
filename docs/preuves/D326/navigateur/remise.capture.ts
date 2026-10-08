import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { PRO } from "../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D326 — LA REMISE DU DEVIS, VUE DANS UN VRAI NAVIGATEUR (captures du rang 33 : français et arabe, 1 280 et 360 px). Pièce jetable, versée ; elle ne juge RIEN.
 *
 * Trois vues par langue et par largeur :
 *   - `boutons`  : les CINQ canaux, le texte d'aide, le canal « e-mail » grisé avec sa raison (aucune adresse saisie) ;
 *   - `fenetre-ok` : après un clic sur un canal avec adresse (SMS) — enregistré ET PDF téléchargé, avec la ligne « Zwadj n'envoie pas encore » ;
 *   - `fenetre-pdf-refuse` : une révision a rendu le devis affiché non actif — le canal est enregistré, le PDF REFUSÉ (409) : la fenêtre le DIT.
 * Elle écrit aussi des lignes `MESURE …` : le débordement horizontal de la page (360 px), le nombre de boutons, le téléchargement observé.
 * Le texte des fenêtres vient des MESSAGES (l'autorité), jamais recopié.
 */
const SORTIE = resolve(__dirname, "captures", "apres");
const LANGUES = ["fr", "ar"] as const;
type Langue = (typeof LANGUES)[number];
const CLIENT = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", invites: "150", email: "amina@example.com" };

test.beforeAll(() => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
});

async function ouvrir(browser: Browser, langue: Langue, viewport: { width: number; height: number }) {
  const salle = await createPublishedVenue();
  const contexte: BrowserContext = await browser.newContext({ viewport, acceptDownloads: true });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), langue);
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  return { salle, contexte, page };
}

/** Du formulaire client au devis CALCULÉ ; `avecEmail` : l'adresse est saisie (canal « e-mail » actif) ou non (grisé, avec sa raison). */
async function jusquAuDevis(page: Page, langue: Langue, avecEmail: boolean): Promise<string> {
  const W = (langue === "fr" ? fr : ar).venue.ui.walkin;
  await page.getByLabel(W.firstName, { exact: true }).fill(CLIENT.prenom);
  await page.getByLabel(W.lastName, { exact: true }).fill(CLIENT.nom);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  if (avecEmail) await page.getByLabel(W.email, { exact: true }).fill(CLIENT.email);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour).toBeEnabled();
  await jour.click();
  const creneau = page.locator("button.cal-slot-pick:not([disabled])").first();
  await expect(creneau).toBeEnabled();
  await creneau.click();
  await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  return ((await (await reponse).json()) as { id: string }).id;
}

async function photo(page: Page, nom: string) {
  await page.screenshot({ path: resolve(SORTIE, `${nom}.png`), fullPage: true });
  console.log(`CAPTURE apres/${nom}.png`);
}

async function debordement(page: Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  console.log(`MESURE débordement ${etiquette} : scrollWidth ${m.scroll} · clientWidth ${m.client} · excédent ${m.scroll - m.client} px (attendu ≤ 0)`);
}

for (const langue of LANGUES) {
  for (const [nomVue, viewport] of [["1280", { width: 1280, height: 900 }], ["360", { width: 360, height: 780 }]] as const) {
    const L = langue === "fr" ? fr : ar;
    const W = L.venue.ui.walkin;

    test(`remise — ${langue}, ${nomVue} px : les cinq boutons (e-mail grisé) puis la fenêtre « tout a réussi »`, async ({ browser }) => {
      const { contexte, page } = await ouvrir(browser, langue, viewport);
      await jusquAuDevis(page, langue, false);
      const sv = (c: string) => (L.venue.ui.quotes as Record<string, string>)[`sv_${c}`] as string;
      const groupe = page.getByRole("group").filter({ has: page.getByRole("button", { name: sv("PRINT"), exact: true }) });
      await expect(groupe.getByRole("button")).toHaveCount(5);
      await expect(page.getByRole("button", { name: sv("EMAIL"), exact: true })).toBeDisabled();
      console.log(`MESURE boutons ${langue} ${nomVue} : 5 boutons, « ${sv("EMAIL")} » inactif, raison : « ${(await page.locator("#wk-deliver-reason").textContent()) ?? "—"} »`);
      await debordement(page, `${langue} ${nomVue} boutons`);
      await photo(page, `remise-${langue}-${nomVue}-boutons`);
      const telechargement = page.waitForEvent("download");
      await page.getByRole("button", { name: sv("SMS"), exact: true }).click();
      const fichier = await telechargement;
      console.log(`MESURE téléchargement ${langue} ${nomVue} : ${fichier.suggestedFilename()}`);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText(W.remitNotSentSMS);
      await debordement(page, `${langue} ${nomVue} fenêtre ok`);
      await photo(page, `remise-${langue}-${nomVue}-fenetre-ok`);
      await contexte.close();
    });

    test(`remise — ${langue}, ${nomVue} px : le PDF REFUSÉ (version non active), la fenêtre le dit`, async ({ browser }) => {
      const { salle, contexte, page } = await ouvrir(browser, langue, viewport);
      const devisId = await jusquAuDevis(page, langue, true);
      const token = await accessTokenOf(salle.pro);
      const liste = (await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token)).json as { id: string; eventDate: string; slotTemplateId: string }[];
      const lue = liste.find((q) => q.id === devisId)!;
      const revision = await apiCall("POST", `/quotes/${devisId}/revise`, token, { eventDate: lue.eventDate, slotTemplateId: lue.slotTemplateId, guests: 120 });
      expect(revision.status).toBe(201);
      const sv = (c: string) => (L.venue.ui.quotes as Record<string, string>)[`sv_${c}`] as string;
      await page.getByRole("button", { name: sv("EMAIL"), exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText(W.remitNotSentEMAIL);
      console.log(`MESURE fenêtre refus ${langue} ${nomVue} : « ${((await page.getByRole("dialog").textContent()) ?? "").replace(/\s+/g, " ")} »`);
      await debordement(page, `${langue} ${nomVue} fenêtre refus`);
      await photo(page, `remise-${langue}-${nomVue}-fenetre-pdf-refuse`);
      await contexte.close();
    });
  }
}
