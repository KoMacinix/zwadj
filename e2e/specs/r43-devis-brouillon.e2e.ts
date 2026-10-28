import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { DATABASE_URL, PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 43 (D339), L36-2 — LE DEVIS BROUILLON NON OFFICIEL, DE BOUT EN BOUT, DANS UN VRAI NAVIGATEUR, contre le VRAI serveur et sa base.
 *
 * Q1 de Ko (adoption du message du relecteur, 28/10/2026) : « Un second bouton à l'étape Contact, « Le client ne donne ni numéro ni e-mail », mène à la date, au créneau et aux
 * prestations, et finit sur un devis BROUILLON. » Ce que cette spec joue, de bout en bout : le brouillon créé au comptoir par ce bouton, son PDF téléchargé, la REMISE refusée par
 * le serveur, puis la promotion par l'écran (le contact, la fiche, le nom), le devis devenu officiel sous le MÊME numéro, et enfin la remise qui, elle, réussit.
 *
 * Ce qu'aucun test de composant ne voit : le refus de la base et de l'API à la remise d'un brouillon, la ligne d'audit écrite par la promotion, le PDF servi sous son nom
 * `BROUILLON-…`, et la parité FR = AR du même parcours.
 *
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro.
 */
const CLIENT = { chiffres: "661234567", e164: "+213661234567", nomLatin: "Amina Bensalem", nomArabe: "آمنة بن سالم", invites: "150" };
const CATALOGUES = { fr, ar } as const;

type DevisRendu = { id: string; isOfficial: boolean; reference: string; status: string; clientRecordId: string | null; clientNameAr: string | null; clientNameLatin: string | null; sentVia: string | null };

test.beforeAll(() => {
  seedReferentials();
});

async function ouvrir(browser: Browser, langue: "fr" | "ar"): Promise<{ salle: Awaited<ReturnType<typeof createPublishedVenue>>; contexte: BrowserContext; page: Page }> {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext({ acceptDownloads: true });
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
  return { salle, contexte, page };
}

const question = (page: Page) => page.locator("#wk-question");
const estCreationDeFiche = (r: { url(): string; request(): { method(): string } }) => new URL(r.url()).pathname.endsWith("/pro/clients") && r.request().method() === "POST";

/** Du jour au devis CALCULÉ ; rend le devis tel que le SERVEUR l'a créé (la réponse de l'API, jamais une valeur écrite ici). Aucune date n'est écrite : le premier jour libre. */
async function jusquAuDevis(page: Page, langue: "fr" | "ar"): Promise<DevisRendu> {
  const W = CATALOGUES[langue].venue.ui.walkin;
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

/** Une lecture de la base, dans l'état où le serveur l'a laissée — la connexion est fermée dans tous les cas. */
async function lire<T extends Record<string, unknown>>(texte: string, valeurs: unknown[]): Promise<T[]> {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    return (await db.query<T>(texte, valeurs)).rows;
  } finally {
    await db.end();
  }
}

for (const langue of ["fr", "ar"] as const) {
  const L = CATALOGUES[langue];
  const W = L.venue.ui.walkin;
  const nom = langue === "fr" ? CLIENT.nomLatin : CLIENT.nomArabe;
  const champNom = langue === "fr" ? W.nameLatin : W.nameAr;
  const copieDuNom = langue === "fr" ? "clientNameLatin" : "clientNameAr";

  test(`⛔ (${langue}) un brouillon créé au comptoir par le bouton de Q1 : sans nom, téléchargé sous son nom BROUILLON-…, REFUSÉ à la remise, PROMU par l'écran sous le même numéro, puis REMIS`, async ({ browser }) => {
    const { salle, contexte, page } = await ouvrir(browser, langue);
    const token = await accessTokenOf(salle.pro);

    // Q1 — le second bouton de l'étape Contact : rien n'est tapé, la recherche de fiche ne part pas.
    await expect(question(page)).toHaveText(W.qContact);
    const recherches: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.endsWith("/pro/clients/lookup") || (new URL(r.url()).pathname.endsWith("/pro/clients") && r.method() === "POST")) recherches.push(r.url());
    });
    await page.getByRole("button", { name: W.noContactButton, exact: true }).click();

    // Q2 — l'étape Client d'un brouillon : AUCUN champ de nom, le nombre d'invités SEUL.
    await expect(question(page)).toHaveText(W.qClient);
    await expect(page.getByLabel(W.nameLatin, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(W.nameAr, { exact: true })).toHaveCount(0);
    await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
    await page.getByRole("button", { name: W.continue, exact: true }).click();
    const brouillon = await jusquAuDevis(page, langue);
    expect(recherches, "ni recherche ni création de fiche pour un brouillon").toEqual([]);

    // Le serveur a créé un brouillon : non officiel, référence BROUILLON-…, ni fiche ni nom.
    expect(brouillon).toMatchObject({ isOfficial: false, status: "DRAFT", clientRecordId: null, clientNameAr: null, clientNameLatin: null, sentVia: null });
    expect(brouillon.reference).toMatch(/^BROUILLON-\d{4}-\d{4,}-0001 v1$/u);
    await expect(page.getByText(W.draftTitle, { exact: true })).toBeVisible();
    // Aucune remise n'est offerte à l'écran : aucun des cinq canaux.
    for (const canal of ["PRINT", "SMS", "EMAIL", "IN_PERSON", "PHONE"] as const) {
      await expect(page.getByRole("button", { name: (L.venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string, exact: true }), canal).toHaveCount(0);
    }

    // Le PDF du brouillon : téléchargé dans la langue choisie, sous le nom `BROUILLON-…`, SANS aucune remise enregistrée (ni `deliver`, ni `client-name`).
    const appels: string[] = [];
    page.on("request", (r) => {
      const chemin = new URL(r.url()).pathname;
      if (chemin.endsWith("/deliver") || chemin.endsWith("/client-name")) appels.push(chemin);
    });
    const telechargement = page.waitForEvent("download");
    await page.getByRole("button", { name: W.draftDownload, exact: true }).click();
    await page.getByRole("dialog", { name: W.langDialogTitle }).getByRole("button", { name: langue === "fr" ? W.langFrench : W.langArabic, exact: true }).click();
    const fichier = await telechargement;
    expect(fichier.suggestedFilename()).toBe(`${brouillon.reference.split(" ")[0]}_${langue}_v1.pdf`);
    expect(readFileSync((await fichier.path()) as string).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    await expect(page.getByText(W.draftDownloaded, { exact: true })).toBeVisible();
    expect(appels, "télécharger un brouillon n'enregistre aucune remise").toEqual([]);

    // La REMISE est REFUSÉE par le serveur (l'écran ne l'offre pas ; un appel direct l'essaie) : 409 `QUOTE_NOT_OFFICIAL`, et rien n'est écrit.
    const refus = await apiCall("POST", `/quotes/${brouillon.id}/deliver`, token, { sentVia: "PRINT" });
    expect(refus.status).toBe(409);
    expect(refus.text).toContain("QUOTE_NOT_OFFICIAL");
    expect(await lire(`SELECT sent_via, sent_at FROM quotes WHERE id = $1`, [brouillon.id])).toEqual([{ sent_via: null, sent_at: null }]);

    // La PROMOTION, par l'écran : le contact, la fiche, le nom, puis « Rendre le devis officiel ».
    await page.getByRole("button", { name: W.draftAddContact, exact: true }).click();
    await expect(question(page)).toHaveText(W.qContact);
    await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
    await page.getByRole("button", { name: W.continue, exact: true }).click();
    await expect(question(page)).toHaveText(W.qClient);
    await page.getByLabel(champNom, { exact: true }).fill(nom);
    const creation = page.waitForResponse(estCreationDeFiche);
    await page.getByRole("button", { name: W.continue, exact: true }).click();
    const fiche = ((await (await creation).json()) as { record: { id: string } }).record;
    await expect(question(page)).toHaveText(W.qQuote);
    // le total du brouillon n'a pas été jeté : la même référence est encore à l'écran
    await expect(page.locator('bdi[dir="ltr"]', { hasText: brouillon.reference })).toBeVisible();

    const promotion = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/quotes/${brouillon.id}/promote`));
    await page.getByRole("button", { name: W.draftMakeOfficial, exact: true }).click();
    const promue = await promotion;
    expect(promue.status()).toBe(201);
    expect(promue.request().postDataJSON()).toEqual({ clientRecordId: fiche.id, [copieDuNom]: nom });
    const officiel = (await promue.json()) as DevisRendu;
    expect(officiel).toMatchObject({ id: brouillon.id, isOfficial: true, clientRecordId: fiche.id });
    expect(officiel[copieDuNom as "clientNameLatin"]).toBe(nom);
    expect(officiel.reference, "même numéro, autre préfixe").toBe(brouillon.reference.replace("BROUILLON-", "DEVIS-"));
    await expect(page.getByText(W.draftOfficialDone, { exact: true })).toBeVisible();
    await expect(page.locator('bdi[dir="ltr"]', { hasText: officiel.reference })).toBeVisible();

    // La base : la ligne est officielle, la fiche et la copie du nom y sont ; UNE ligne d'audit, sans le nom ni le numéro du client.
    expect(await lire(`SELECT is_official, client_record_id::text AS fiche FROM quotes WHERE id = $1`, [brouillon.id])).toEqual([{ is_official: true, fiche: fiche.id }]);
    const audit = await lire<{ action: string; entity_id: string; actor_role: string; apres: string }>(
      `SELECT action, entity_id, actor_role, after::text AS apres FROM audit_logs WHERE entity_type = 'quote'`,
      []
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "quote.promote", entity_id: brouillon.id, actor_role: "PRO" });
    expect(audit[0]!.apres.includes(nom) || audit[0]!.apres.includes(CLIENT.e164), "la ligne d'audit ne porte ni le nom ni le numéro").toBe(false);

    // Et la REMISE, désormais permise : les cinq canaux sont là, l'impression enregistre sa remise et télécharge le PDF `DEVIS-…`.
    const impression = (L.venue.ui.quotes as Record<string, string>).sv_PRINT as string;
    const pdf = page.waitForEvent("download");
    await page.getByRole("button", { name: impression, exact: true }).click();
    await page.getByRole("dialog", { name: W.langDialogTitle }).getByRole("button", { name: langue === "fr" ? W.langFrench : W.langArabic, exact: true }).click();
    expect((await pdf).suggestedFilename()).toBe(`${officiel.reference.split(" ")[0]}_${langue}_v1.pdf`);
    await expect(page.getByRole("dialog", { name: W.remitTitleDone })).toBeVisible();
    expect(await lire<{ sent_via: string | null }>(`SELECT sent_via FROM quotes WHERE id = $1`, [brouillon.id])).toEqual([{ sent_via: "PRINT" }]);
    await contexte.close();
  });
}

test("⛔ le chemin ORDINAIRE ne crée jamais un brouillon : « Continuer » du contact, la fiche, les noms ⇒ un devis OFFICIEL `DEVIS-…`, avec sa fiche", async ({ browser }) => {
  const W = fr.venue.ui.walkin;
  const { contexte, page } = await ouvrir(browser, "fr");
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  await page.getByLabel(W.nameLatin, { exact: true }).fill(CLIENT.nomLatin);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: W.continue, exact: true }).click();
  const devis = await jusquAuDevis(page, "fr");
  expect(devis.isOfficial).toBe(true);
  expect(devis.reference).toMatch(/^DEVIS-\d{4}-\d{4,}-0001 v1$/u);
  expect(devis.clientRecordId).not.toBeNull();
  await expect(page.getByText(W.draftTitle, { exact: true })).toHaveCount(0);
  await contexte.close();
});
