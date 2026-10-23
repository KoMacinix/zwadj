import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import fr from "../../packages/i18n/messages/fr.json";
import { PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 41 (D336, L35-4 amendé) — LA FICHE CLIENT D'UN PRO ET LE NOM SUR LE DEVIS, DE BOUT EN BOUT, DANS UN VRAI NAVIGATEUR, contre le VRAI serveur et sa base.
 *
 * Ce qu'aucun test de composant ne voit : la recherche (K-1) et la création (K-2) servies par la vraie API, la normalisation et l'unicité de la BASE, la copie du
 * nom écrite sur le devis (K-4) puis complétée par la boîte de langue (K-5) — sur le devis ET, quand C-C3 le permet, sur la fiche —, le PDF téléchargé dans la
 * langue choisie, et la conversion PRÉREMPLIE (K-12) dont le corps est lu sur la VRAIE requête du navigateur.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro : les fiches sont au pro, aucun test ne voit celles d'un
 * autre. ⚠ Le numéro du client n'est JAMAIS celui du pro (`+213550000001`, `createVerifiedAccount`) — sauf dans le test qui mesure justement son refus (MD-4).
 */
const W = fr.venue.ui.walkin;
const CLIENT = { chiffres: "661234567", e164: "+213661234567", nomLatin: "Amina Bensalem", nomArabe: "أمينة بن سالم", invites: "150" };
/** Le numéro du PRO de `createVerifiedAccount`, en chiffres nationaux. */
const NUMERO_DU_PRO = "550000001";

type FicheRendue = { id: string; phone: string | null; email: string | null; nameAr: string | null; nameLatin: string | null; linked: boolean };
type DevisRendu = { id: string; reference: string; clientRecordId: string | null; clientNameAr: string | null; clientNameLatin: string | null };

test.beforeAll(() => {
  seedReferentials();
});

async function ouvrir(browser: Browser): Promise<{ salle: Awaited<ReturnType<typeof createPublishedVenue>>; contexte: BrowserContext; page: Page }> {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext({ acceptDownloads: true });
  await contexte.addInitScript(() => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", "fr");
    } catch {
      /* stockage indisponible : la page reste en français */
    }
  });
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: W.title })).toBeVisible();
  return { salle, contexte, page };
}

const question = (page: Page) => page.locator("#wk-question");
const estCreation = (r: { url(): string; request(): { method(): string } }) => new URL(r.url()).pathname.endsWith("/pro/clients") && r.request().method() === "POST";

/** Du jour au devis CALCULÉ ; rend le devis tel que le SERVEUR l'a créé (la réponse de l'API, jamais une valeur écrite ici). Aucune date n'est écrite : le premier jour libre. */
async function jusquAuDevis(page: Page): Promise<DevisRendu> {
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour, "le calendrier du parcours ne propose aucun jour libre").toBeEnabled();
  await jour.click();
  const creneau = page.locator("button.cal-slot-pick:not([disabled])").first();
  await expect(creneau, "le jour choisi ne propose aucun créneau libre").toBeEnabled();
  await creneau.click();
  await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  const devis = (await (await reponse).json()) as DevisRendu;
  await expect(page.locator('bdi[dir="ltr"]', { hasText: devis.reference }), "la référence du devis est à l'écran").toBeVisible();
  return devis;
}

test("⛔ le CONTACT d'abord : sans fiche, elle se CRÉE au « Continuer » de l'étape Client ; le devis porte la fiche et la COPIE du nom ; la conversion PRÉREMPLIE envoie ce que l'écran affiche, et la fiche n'est pas réécrite", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  await expect(question(page), "la première question est celle du contact").toHaveText(W.qContact);

  // K-1 — la recherche part au « Continuer » du contact, par le NUMÉRO, au format du contrat.
  const recherche = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith("/pro/clients/lookup"));
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const trouvee = await recherche;
  expect(trouvee.request().postDataJSON()).toEqual({ phone: CLIENT.e164 });
  expect(trouvee.status()).toBe(200);
  expect(await trouvee.json()).toEqual({ found: false });
  await expect(question(page)).toHaveText(W.qClient);
  await expect(page.getByText(W.ficheNew, { exact: true })).toBeVisible();

  // K-2 — la fiche se crée au « Continuer » de l'étape Client, avec le contact et le nom TAPÉS.
  await page.getByLabel(W.nameLatin, { exact: true }).fill(CLIENT.nomLatin);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  const creation = page.waitForResponse(estCreation);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const creee = await creation;
  expect(creee.request().postDataJSON()).toEqual({ phone: CLIENT.e164, nameLatin: CLIENT.nomLatin });
  const { created, record: fiche } = (await creee.json()) as { created: boolean; record: FicheRendue };
  expect(created).toBe(true);
  expect(fiche).toMatchObject({ phone: CLIENT.e164, email: null, nameLatin: CLIENT.nomLatin, nameAr: null, linked: false });

  // K-4 — le devis porte la fiche et la copie des noms de l'écran, celle de l'autre écriture absente.
  const devis = await jusquAuDevis(page);
  expect(devis).toMatchObject({ clientRecordId: fiche.id, clientNameLatin: CLIENT.nomLatin, clientNameAr: null });

  // K-12 — la conversion PRÉREMPLIE : la copie coupée au PREMIER espace (MD-9), le numéro de la fiche, en chiffres nationaux.
  await expect(page.getByLabel(W.firstName, { exact: true })).toHaveValue("Amina");
  await expect(page.getByLabel(W.lastName, { exact: true })).toHaveValue("Bensalem");
  await expect(page.getByLabel(W.phone, { exact: true })).toHaveValue(CLIENT.chiffres);
  // Le pro corrige le nom : l'envoi porte la valeur de l'ÉCRAN, lue sur la VRAIE requête.
  await page.getByLabel(W.lastName, { exact: true }).fill("Bensalem-Haddad");
  const conversion = page.waitForRequest((r) => new URL(r.url()).pathname.endsWith(`/quotes/${devis.id}/convert`));
  await page.getByRole("button", { name: W.standby, exact: true }).click();
  expect((await conversion).postDataJSON()).toEqual({ contactFirstName: "Amina", contactLastName: "Bensalem-Haddad", contactPhone: CLIENT.e164, paymentMethod: "CASH" });
  await expect(page.getByRole("dialog", { name: W.doneTitleStandby })).toBeVisible();

  // ⛔ MD-17 — la conversion n'a RIEN écrit dans la fiche : la recherche la rend à l'identique, date de modification comprise.
  const relue = await apiCall("POST", "/pro/clients/lookup", await accessTokenOf(salle.pro), { phone: CLIENT.e164 });
  expect(relue.status).toBe(200);
  expect(relue.json).toEqual({ found: true, record: fiche });
  await contexte.close();
});

test("⛔ un second passage du même numéro RETROUVE la fiche (aucune seconde fiche) ; la boîte de langue DEMANDE le nom arabe, le complète sur le devis ET sur la fiche (C-C3), PUIS télécharge le PDF en arabe", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  const token = await accessTokenOf(salle.pro);
  // Le « premier passage » : la fiche existe déjà chez CE pro, créée par la route elle-même (K-2).
  const existante = await apiCall("POST", "/pro/clients", token, { phone: CLIENT.e164, nameLatin: CLIENT.nomLatin });
  expect(existante.status).toBe(200);
  const fiche = (existante.json as { record: FicheRendue }).record;
  const creations: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.endsWith("/pro/clients") && r.method() === "POST") creations.push(r.url());
  });

  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await expect(page.getByText(W.ficheFound, { exact: true })).toBeVisible();
  await expect(page.getByLabel(W.nameLatin, { exact: true }), "le nom de la fiche PRÉREMPLIT ce devis").toHaveValue(CLIENT.nomLatin);
  await expect(page.getByLabel(W.nameLatin, { exact: true }), "une fiche non liée : le nom reste modifiable").toBeEnabled();
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const devis = await jusquAuDevis(page);
  expect(creations, "la fiche trouvée n'est pas recréée").toEqual([]);
  expect(devis).toMatchObject({ clientRecordId: fiche.id, clientNameLatin: CLIENT.nomLatin, clientNameAr: null });

  // K-5 — l'impression en ARABE : la copie arabe manque, la boîte de langue la DEMANDE, et rien ne part avant.
  const parties: string[] = [];
  page.on("request", (r) => {
    const chemin = new URL(r.url()).pathname;
    if (chemin.endsWith("/deliver") || chemin.endsWith("/document")) parties.push(chemin);
  });
  await page.getByRole("button", { name: fr.venue.ui.quotes.sv_PRINT, exact: true }).click();
  await page.getByRole("dialog", { name: W.langDialogTitle }).getByRole("button", { name: W.langArabic, exact: true }).click();
  const demande = page.getByRole("dialog", { name: W.nameDialogTitleAr });
  await expect(demande).toBeVisible();
  expect(parties, "la question du nom est ouverte : ni l'enregistrement ni le PDF ne sont partis").toEqual([]);
  await demande.getByLabel(W.nameAr, { exact: true }).fill(CLIENT.nomArabe);
  const complement = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/quotes/${devis.id}/client-name`));
  const pdf = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/quotes/${devis.id}/document`));
  const telechargement = page.waitForEvent("download");
  await demande.getByRole("button", { name: W.nameDialogConfirm, exact: true }).click();

  const complete = await complement;
  expect(complete.request().postDataJSON()).toEqual({ locale: "ar", name: CLIENT.nomArabe });
  expect(complete.status()).toBe(201);
  expect(((await complete.json()) as DevisRendu).clientNameAr).toBe(CLIENT.nomArabe);
  const document = await pdf;
  expect(new URL(document.url()).searchParams.get("locale")).toBe("ar");
  expect(document.headers()["content-language"]).toBe("ar");
  const fichier = await telechargement;
  expect(readFileSync((await fichier.path()) as string).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  await expect(page.getByRole("dialog", { name: W.remitTitleDone })).toBeVisible();

  // C-C3 — le nom LATIN du devis est celui de la fiche : la fiche reçoit aussi le nom arabe ; son nom latin ne bouge pas.
  const relue = await apiCall("POST", "/pro/clients/lookup", token, { phone: CLIENT.e164 });
  expect((relue.json as { record: FicheRendue }).record).toMatchObject({ id: fiche.id, nameLatin: CLIENT.nomLatin, nameAr: CLIENT.nomArabe });
  await contexte.close();
});

test("⛔ MD-4 — le numéro du PRO lui-même est refusé à la création de la fiche : l'erreur est DITE, on reste à l'étape Client, aucun devis", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(NUMERO_DU_PRO);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await page.getByLabel(W.nameLatin, { exact: true }).fill(CLIENT.nomLatin);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  const creation = page.waitForResponse(estCreation);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const refus = await creation;
  expect(refus.status()).toBe(400);
  expect(await refus.text()).toContain("CLIENT_IS_PRO_CONTACT");
  await expect(page.getByRole("alert")).toContainText(fr.clientRecord.errors.isProContact);
  await expect(question(page), "on reste à l'étape Client").toHaveText(W.qClient);
  const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, await accessTokenOf(salle.pro));
  expect(liste.status).toBe(200);
  expect(liste.json, "aucun devis").toEqual([]);
  await contexte.close();
});
