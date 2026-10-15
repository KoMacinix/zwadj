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

/** Rang 39 (D333) — lit une référence `DEVIS-AAAA-SSSS-QQQQ vN` en nombres : la FORME de R3, pas une valeur attendue. */
function lire(reference: string) {
  const m = /^DEVIS-(\d{4})-(\d{4,})-(\d{4,}) v(\d+)$/u.exec(reference);
  if (m === null) throw new Error(`pas une référence : ${reference}`);
  return { annee: Number(m[1]), salle: Number(m[2]), devis: Number(m[3]), version: Number(m[4]) };
}

/** Du formulaire client — AVEC une adresse, pour que le canal « e-mail » soit actif — jusqu'au devis CALCULÉ ; rend l'identifiant ET la référence du devis créé par le serveur (la référence est celle de la RÉPONSE de l'API, jamais une valeur écrite ici ; elle doit être à l'écran). */
async function jusquAuDevis(page: Page, libelles: typeof W = W): Promise<{ id: string; reference: string }> {
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
  const devis = (await (await reponse).json()) as { id: string; reference: string };
  // Rang 39 (DB-10) : la référence rendue par le serveur s'affiche juste après le calcul, isolée de gauche à droite.
  await expect(page.locator('bdi[dir="ltr"]', { hasText: devis.reference }), "la référence du devis est à l'écran").toBeVisible();
  return { id: devis.id, reference: devis.reference };
}

const NOM_DE_FICHIER = /^DEVIS-\d{4}-\d{4,}-\d{4,}_(fr|ar)_v\d+\.pdf$/;

/**
 * RANG 38 (D332) — chaque bouton de remise ouvre D'ABORD la boîte de langue ; l'enregistrement du canal ET le téléchargement partent au CHOIX du pro. Les libellés de la boîte sont dans la
 * langue de l'INTERFACE (les catalogues) ; le choix est celui du PDF. Les trois cas croisent les deux langues : la langue du PDF n'est jamais celle de l'interface par défaut.
 * La langue APPLIQUÉE par le serveur se lit dans l'en-tête `Content-Language` de la réponse du navigateur — pas dans le texte du PDF (illisible sans moteur), et pas dans un mock.
 */
const LANGUES = {
  fr: { interface: fr.venue.ui.walkin, libelle: fr.venue.ui.walkin.langFrench },
  ar: { interface: ar.venue.ui.walkin, libelle: ar.venue.ui.walkin.langArabic }
} as const;

for (const [canal, langueInterface, langueDuPdf] of [["PRINT", "fr", "ar"], ["EMAIL", "fr", "fr"], ["SMS", "ar", "fr"]] as const) {
  test(`« ${canal} », page ${langueInterface}, PDF ${langueDuPdf} : la boîte s'ouvre, le CHOIX lance le téléchargement d'un vrai PDF dans cette langue, le serveur ENREGISTRE le canal, la fenêtre le DIT`, async ({ browser }) => {
    const libelles = LANGUES[langueInterface].interface;
    const catalogue = langueInterface === "fr" ? fr : ar;
    const { salle, contexte, page } = await ouvrir(browser, langueInterface);
    const { id: devisId, reference } = await jusquAuDevis(page, libelles);

    const libelle = (catalogue.venue.ui.quotes as Record<string, string>)[`sv_${canal}`] as string;
    await page.getByRole("button", { name: libelle, exact: true }).click();

    // La boîte : dans la langue de l'INTERFACE, avec ses trois boutons. Rien n'est encore parti : le choix n'est pas fait.
    const boite = page.getByRole("dialog", { name: libelles.langDialogTitle });
    await expect(boite).toBeVisible();
    await expect(boite).toContainText(libelles.langDialogDescription);
    for (const nom of [libelles.langDialogCancel, fr.venue.ui.walkin.langFrench, ar.venue.ui.walkin.langArabic]) {
      await expect(boite.getByRole("button", { name: nom, exact: true })).toBeVisible();
    }
    const avant = ((await apiCall("GET", `/pro/venues/${salle.id}/quotes`, await accessTokenOf(salle.pro))).json as { id: string; sentVia: string | null }[]).find((q) => q.id === devisId);
    expect(avant?.sentVia, "la boîte est ouverte, aucun canal n'est encore enregistré").toBeNull();

    const reponse = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/quotes/${devisId}/document`));
    const telechargement = page.waitForEvent("download");
    await boite.getByRole("button", { name: LANGUES[langueDuPdf].libelle, exact: true }).click();
    const document = await reponse;
    const fichier = await telechargement;

    // La langue DEMANDÉE est la langue choisie, la langue APPLIQUÉE est la même (le compte du client n'y est pour rien).
    expect(new URL(document.url()).searchParams.get("locale")).toBe(langueDuPdf);
    expect(document.headers()["content-language"]).toBe(langueDuPdf);

    // Le fichier : un nom sans donnée personnelle, des octets de PDF, la police du dépôt embarquée (ce n'est pas une page d'erreur enregistrée sous .pdf).
    expect(fichier.suggestedFilename()).toMatch(NOM_DE_FICHIER);
    // Rang 39 (K-7) : le nom est la référence du devis (celle de la réponse de l'API), la langue CHOISIE et la version — construit par de simples chaînes.
    expect(fichier.suggestedFilename()).toBe(`${reference.replace(" v1", `_${langueDuPdf}_v1`)}.pdf`);
    const octets = readFileSync((await fichier.path()) as string);
    expect(octets.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(octets.toString("latin1")).toContain("ReadexPro");

    // La fenêtre de remise (dans la langue de l'INTERFACE) dit les DEUX issues, et — pour le SMS et l'e-mail — que Zwadj n'envoie PAS encore.
    const fenetre = page.getByRole("dialog", { name: libelles.remitTitleDone });
    await expect(fenetre).toBeVisible();
    await expect(boite).toHaveCount(0);
    await expect(fenetre).toContainText(libelles.remitPdfDone);
    await expect(fenetre).toContainText(libelles.remitRecorded.replace("{channel}", libelle));
    // Rang 39 (DB-10) : la fenêtre de remise porte la référence du devis remis.
    await expect(fenetre).toContainText(reference);
    if (canal === "SMS") await expect(fenetre).toContainText(libelles.remitNotSentSMS);
    if (canal === "EMAIL") await expect(fenetre).toContainText(libelles.remitNotSentEMAIL);
    if (canal === "PRINT") await expect(fenetre).not.toContainText("n'envoie pas");

    // Le SERVEUR a écrit le canal — la fenêtre dit ce qui a eu lieu, elle ne le suppose pas.
    const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, await accessTokenOf(salle.pro));
    expect(liste.status).toBe(200);
    const devis = (liste.json as { id: string; sentVia: string | null }[]).find((q) => q.id === devisId);
    expect(devis?.sentVia).toBe(canal);

    await page.getByRole("button", { name: libelles.doneDialogClose }).click();
    await expect(fenetre).toHaveCount(0);
    await contexte.close();
  });
}

test("⛔ ANNULER la boîte de langue — le bouton, puis Échap — n'enregistre RIEN, ne télécharge RIEN, n'ouvre PAS la fenêtre de remise : aucune requête ne part, le serveur n'a aucun canal", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  const { id: devisId } = await jusquAuDevis(page);
  const requetes: string[] = [];
  page.on("request", (r) => {
    const chemin = new URL(r.url()).pathname;
    if (chemin.endsWith("/document") || chemin.endsWith("/deliver")) requetes.push(`${r.method()} ${chemin}`);
  });
  const telechargements: string[] = [];
  page.on("download", (d) => telechargements.push(d.suggestedFilename()));

  const libelle = fr.venue.ui.quotes.sv_PRINT;
  for (const geste of ["bouton", "echap"] as const) {
    await page.getByRole("button", { name: libelle, exact: true }).click();
    const boite = page.getByRole("dialog", { name: W.langDialogTitle });
    await expect(boite).toBeVisible();
    if (geste === "bouton") await boite.getByRole("button", { name: W.langDialogCancel, exact: true }).click();
    else await page.keyboard.press("Escape");
    await expect(boite, `${geste} : la boîte est fermée`).toHaveCount(0);
    // Une attente BORNÉE, PUIS les verdicts, À CHAQUE GESTE : sans elle « aucune requête » serait vrai trop tôt, et — mesuré à la main (E-1) — une annulation qui remet quand même ferait échouer
    // la spec sur le CLIC SUIVANT (un délai d'action, qui n'est pas une morsure, D323) avant qu'aucune assertion ne la voie.
    await page.waitForTimeout(800);
    expect(requetes, `${geste} : aucune requête \`deliver\` ni \`document\` n'est partie`).toEqual([]);
    expect(telechargements, `${geste} : aucun téléchargement`).toEqual([]);
    await expect(page.getByRole("dialog", { name: W.remitTitleDone }), `${geste} : aucune fenêtre de remise`).toHaveCount(0);
    // Les boutons ne sont pas verrouillés : rien n'a été lancé, on peut recommencer.
    await expect(page.getByRole("button", { name: libelle, exact: true })).toBeEnabled();
  }

  const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, await accessTokenOf(salle.pro));
  expect(liste.status).toBe(200);
  const devis = (liste.json as { id: string; sentVia: string | null }[]).find((q) => q.id === devisId);
  expect(devis?.sentVia, "le serveur n'a enregistré aucun canal").toBeNull();
  await contexte.close();
});

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
  const { id: v1, reference: referenceV1 } = await jusquAuDevis(page);
  await contexte.close();
  const token = await accessTokenOf(salle.pro);
  const avant = await apiCall("GET", `/quotes/${v1}/document?locale=fr`, token);
  expect(avant.status, "la v1 est encore la dernière version : le PDF est servi").toBe(200);
  // Le pro change une condition (le nombre d'invités) : le serveur RÉVISE la chaîne — une version N+1, la v1 ne bouge pas. Les conditions de la v1 sont RELUES chez le serveur.
  const lue = ((await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token)).json as { id: string; eventDate: string; slotTemplateId: string }[]).find((q) => q.id === v1)!;
  const revision = await apiCall("POST", `/quotes/${v1}/revise`, token, { eventDate: lue.eventDate, slotTemplateId: lue.slotTemplateId, guests: 120 });
  expect(revision.status).toBe(201);
  const v2 = (revision.json as { id: string }).id;
  // Rang 39 : une révision garde l'année et les deux numéros de sa tête ; SEULE la version change (v1 → v2).
  expect(lire((revision.json as { reference: string }).reference)).toEqual({ ...lire(referenceV1), version: 2 });
  const ancienne = await apiCall("GET", `/quotes/${v1}/document?locale=fr`, token);
  expect(ancienne.status, "la v1 n'est plus la version active").toBe(409);
  expect(ancienne.text).toContain("QUOTE_VERSION_NOT_ACTIVE");
  const nouvelle = await apiCall("GET", `/quotes/${v2}/document?locale=fr`, token);
  expect(nouvelle.status).toBe(200);
});

test("⛔ rang 39 — un DEUXIÈME devis de la même salle prend le numéro SUIVANT, avec le même numéro de salle et la version 1 ; la référence de la liste est celle de la création", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  const { id: premier, reference: referencePremier } = await jusquAuDevis(page);
  await contexte.close();
  const token = await accessTokenOf(salle.pro);
  const lue = ((await apiCall("GET", `/pro/venues/${salle.id}/quotes`, token)).json as { id: string; reference: string; eventDate: string; slotTemplateId: string }[]).find((q) => q.id === premier)!;
  expect(lue.reference, "la liste du pro rend la référence de la création").toBe(referencePremier);
  const second = await apiCall("POST", `/venues/${salle.id}/quotes`, token, { eventDate: lue.eventDate, slotTemplateId: lue.slotTemplateId, guests: 90 });
  expect(second.status).toBe(201);
  const a = lire(referencePremier);
  const b = lire((second.json as { reference: string }).reference);
  expect(b).toEqual({ ...a, devis: a.devis + 1, version: 1 });
});
