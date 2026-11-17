import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { ADMIN_TEXTS } from "../../apps/pro/src/admin/admin-texts";
import { CLIENT, DATABASE_URL, PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createVerifiedAccount, loginContext, seedReferentials, type Account } from "../fixtures/harness";

/**
 * RANG 52 (D350), LOT ADM-2 — LES ÉCRANS `/admin` DE L'APP PRO ET LE PRO QUI LIT SON REFUS : LE CHEMIN RÉEL, DANS UN VRAI NAVIGATEUR (MD-ADM-16).
 *
 * « Une fixture ADMIN par `UPDATE` SQL ne prouve ni (c1) ni (c2) » (cadrage du rang 28, MD-ADM-16) : ici l'ADMIN SE CONNECTE par l'écran de connexion du Pro et arrive sous `/admin` ; seule l'ÉLÉVATION du
 * compte passe par la base e2e (aucun chemin du produit ne crée un ADMIN — le script du premier admin est un geste de Ko, jamais joué ici, R-10), comme `r37` et `r50`.
 *  · E-1 : connexion ADMIN → la file → le détail → publier ; la salle se voit sur le site CLIENT ; `noindex` posé pendant l'écran ;
 *  · E-2 : rejeter → le PRO lit le motif, en français ET en arabe, et l'en-tête de sa salle ne dit plus « en attente » ;
 *  · E-3 : corriger le motif → le pro lit le NOUVEAU motif, plus l'ancien ;
 *  · E-4 : une suppression de compte rejetée (le compte reste actif), puis une autre approuvée APRÈS la confirmation qui dit l'irréversible (le compte ne se connecte plus) ;
 *  · E-5 : un PRO sous `/admin` lit un refus explicite et n'atteint aucune donnée ; puis, dans le MÊME navigateur, un ADMIN qui se connecte ne voit rien du PRO (MD-ADM-10).
 * ⚠ Les libellés viennent des TEXTES de l'application (l'autorité : `ADMIN_TEXTS` pour l'administration, les catalogues pour le pro), jamais recopiés. Les noms sont FICTIFS.
 * ⚠ Rien n'écrit sur la base de développement de Ko : l'API et l'application tournent sur la pile e2e (`zwadj_e2e`, ports dédiés).
 */
const MSG = { fr, ar } as const;
const T = ADMIN_TEXTS;
const LOGIN = fr.auth.ui.login;

test.beforeAll(() => {
  seedReferentials();
});

/** Un compte ADMIN : élévation en base e2e (aucun chemin du produit n'en crée un). */
async function compteAdmin(): Promise<Account> {
  const admin = await createVerifiedAccount("CLIENT");
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [admin.email]);
  } finally {
    await db.end();
  }
  return admin;
}

/** Un BROUILLON : le pro crée sa salle et un créneau par l'API réelle ; l'admin ne la publie PAS (c'est ce que les écrans font). */
async function brouillon(pro: Account, nom: string): Promise<{ id: string; slug: string; nameFr: string }> {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  let cityId: string;
  try {
    const { rows } = await db.query<{ id: string }>(`SELECT id FROM cities ORDER BY name_fr LIMIT 1`);
    if (rows[0] === undefined) throw new Error("Aucune commune : seedReferentials() n'a pas été appelé.");
    cityId = rows[0].id;
  } finally {
    await db.end();
  }
  const token = await accessTokenOf(pro);
  const nameFr = `${nom} ${randomUUID().slice(0, 8)}`;
  const venue = await apiCall("POST", "/venues", token, { cityId, nameFr, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" });
  expect(venue.status, venue.text).toBe(201);
  const { id, slug } = venue.json as { id: string; slug: string };
  const slot = await apiCall("POST", `/venues/${id}/slot-templates`, token, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 18_000_000 });
  expect(slot.status, slot.text).toBe(201);
  return { id, slug, nameFr };
}

async function nouveauContexte(browser: Browser): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  return { contexte, page: await contexte.newPage() };
}

/**
 * La file est PAGINÉE et PARTAGÉE avec les autres specs de la suite (qui laissent des brouillons) : la salle n'est pas forcément sur la première page, et les plus récentes sont rangées en dernier. On avance
 * page après page (au plus vingt) jusqu'à la trouver — jamais une supposition sur le nombre de salles en attente.
 */
async function lienDeLaFile(page: Page, nameFr: string) {
  const lien = page.getByRole("link", { name: nameFr });
  for (let numero = 1; numero <= 20; numero += 1) {
    await expect(page.getByRole("list").first()).toBeVisible({ timeout: 15_000 });
    if ((await lien.count()) > 0) return lien;
    const suivante = page.getByRole("button", { name: T.queue.pagination.next });
    if ((await suivante.count()) === 0 || (await suivante.isDisabled())) break;
    await suivante.click();
    await expect(page).toHaveURL(new RegExp(`page=${numero + 1}$`));
  }
  throw new Error(`la salle « ${nameFr} » n'est dans aucune page de la file`);
}

/** LE CHEMIN RÉEL : l'ADMIN se connecte par l'écran de connexion du Pro et arrive SOUS `/admin` (la destination suit le rôle). */
async function connecterAdminParEcran(page: Page, admin: Account): Promise<void> {
  await page.goto(`${PRO}/auth/connexion`);
  await page.getByLabel(LOGIN.email).fill(admin.email);
  await page.getByLabel(LOGIN.password).fill(admin.password);
  await page.getByRole("button", { name: LOGIN.submit }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: T.queue.title })).toBeVisible();
}

/** Le pro ouvre SA salle à l'étape « Publication », dans la langue donnée. */
async function ouvrirEtapePublication(browser: Browser, pro: Account, venueId: string, lang: "fr" | "ar"): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript((l) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", l);
    } catch {
      /* stockage indisponible : la page reste en français */
    }
  }, lang);
  await loginContext(contexte, pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/salles/${venueId}?etape=7`);
  await expect(page.getByRole("heading", { name: MSG[lang].venue.ui.wizard.step7 })).toBeVisible({ timeout: 15_000 });
  return { contexte, page };
}

test.describe("ADM-2 — les écrans d'administration, le chemin réel", () => {
  test("E-1 : l'ADMIN se connecte, lit la file, ouvre le détail, publie — la salle se voit sur le site client ; `noindex` pendant l'écran", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const salle = await brouillon(pro, "Salle des Jasmins");
    const admin = await compteAdmin();
    const { contexte, page } = await nouveauContexte(browser);
    try {
      await connecterAdminParEcran(page, admin);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

      // La file : la salle est là (un brouillon vivant avec un créneau actif) ; son nom est le lien vers SON détail.
      await (await lienDeLaFile(page, salle.nameFr)).click();
      await expect(page).toHaveURL(new RegExp(`/admin/salles/${salle.id}$`));
      await expect(page.getByRole("heading", { level: 1, name: salle.nameFr })).toBeVisible();
      // MD-ADM-7 : les taux sont AFFICHÉS, jamais modifiables.
      await expect(page.getByText(T.review.ratesReadOnly)).toBeVisible();
      await expect(page.getByRole("spinbutton")).toHaveCount(0);

      // Avant la publication, le site client ne connaît pas la salle (404) ; après, il la montre.
      const avant = await page.request.get(`${CLIENT}/fr/salles/${salle.slug}`);
      expect(avant.status()).toBe(404);
      await page.getByRole("button", { name: T.review.publish }).click();
      await expect(page.getByText(T.review.published)).toBeVisible();
      await expect(page.getByText(T.review.status.PUBLISHED, { exact: true })).toBeVisible();

      const client = await contexte.newPage();
      const reponse = await client.goto(`${CLIENT}/fr/salles/${salle.slug}`);
      expect(reponse?.status()).toBe(200);
      await expect(client.getByRole("heading", { level: 1, name: salle.nameFr })).toBeVisible();

      // Quitter l'administration retire la balise : elle ne vit que pendant l'écran.
      await page.getByRole("button", { name: T.shell.logout }).click();
      await expect(page.getByRole("heading", { name: LOGIN.title })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    } finally {
      await contexte.close();
    }
  });

  test("E-2 : l'ADMIN rejette avec un motif — le PRO le lit à l'étape « Publication », en français ET en arabe, et son en-tête ne dit plus « en attente »", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const salle = await brouillon(pro, "Salle des Roses");
    const admin = await compteAdmin();
    const motif = `Les photos sont floues ${randomUUID().slice(0, 6)}. Merci de les remplacer.`;

    const { contexte, page } = await nouveauContexte(browser);
    try {
      await connecterAdminParEcran(page, admin);
      await page.goto(`${PRO}/admin/salles/${salle.id}`);
      await expect(page.getByRole("heading", { level: 1, name: salle.nameFr })).toBeVisible();
      // Sans motif : le message, rien ne part.
      await page.getByRole("button", { name: T.review.reject }).click();
      await expect(page.getByText(T.errors.validation["admin.validation.rejectionReasonRequired"])).toBeVisible();
      await page.getByLabel(T.review.reasonLabel).fill(motif);
      await page.getByRole("button", { name: T.review.reject }).click();
      await expect(page.getByText(T.review.rejectSaved)).toBeVisible();
      await expect(page.getByRole("button", { name: T.review.correct })).toBeVisible();
    } finally {
      await contexte.close();
    }

    for (const lang of ["fr", "ar"] as const) {
      const { contexte: c, page: p } = await ouvrirEtapePublication(browser, pro, salle.id, lang);
      try {
        const M = MSG[lang].publicationReview;
        await expect(p.getByText(M.noticeTitle)).toBeVisible();
        await expect(p.getByText(motif)).toBeVisible();
        await expect(p.getByText(M.noticeHelp)).toBeVisible();
        await expect(p.getByText(M.refusedBadge)).toBeVisible();
        // L'en-tête NE DIT PLUS « en attente de publication » (le défaut que ce lot corrige).
        await expect(p.getByText(MSG[lang].venue.ui.publication.draft)).toHaveCount(0);
      } finally {
        await c.close();
      }
    }
  });

  test("E-3 : l'ADMIN corrige le motif — le pro lit le NOUVEAU motif, plus l'ancien", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const salle = await brouillon(pro, "Salle des Lilas");
    const admin = await compteAdmin();
    const ancien = `Premier motif ${randomUUID().slice(0, 6)}`;
    const nouveau = `Motif corrigé ${randomUUID().slice(0, 6)}`;

    const { contexte, page } = await nouveauContexte(browser);
    try {
      await connecterAdminParEcran(page, admin);
      await page.goto(`${PRO}/admin/salles/${salle.id}`);
      await page.getByLabel(T.review.reasonLabel).fill(ancien);
      await page.getByRole("button", { name: T.review.reject }).click();
      await expect(page.getByText(T.review.rejectSaved)).toBeVisible();

      // Corriger : le champ part du motif EN VIGUEUR, le bouton dit « Corriger ».
      await expect(page.getByLabel(T.review.reasonLabel)).toHaveValue(ancien);
      await page.getByLabel(T.review.reasonLabel).fill(nouveau);
      await page.getByRole("button", { name: T.review.correct }).click();
      await expect(page.getByText(nouveau, { exact: true }).first()).toBeVisible();
    } finally {
      await contexte.close();
    }

    const { contexte: c, page: p } = await ouvrirEtapePublication(browser, pro, salle.id, "fr");
    try {
      await expect(p.getByText(nouveau)).toBeVisible();
      await expect(p.getByText(ancien)).toHaveCount(0);
    } finally {
      await c.close();
    }
  });

  test("E-4 : une suppression de compte rejetée (le compte reste actif), puis une autre approuvée APRÈS la confirmation qui dit l'irréversible (le compte ne se connecte plus)", async ({ browser }) => {
    const rejete = await createVerifiedAccount("CLIENT");
    const approuve = await createVerifiedAccount("CLIENT");
    for (const compte of [rejete, approuve]) {
      const demande = await apiCall("POST", "/me/deletion-request", await accessTokenOf(compte), {});
      expect(demande.status, demande.text).toBe(201);
    }
    const admin = await compteAdmin();
    const { contexte, page } = await nouveauContexte(browser);
    try {
      await connecterAdminParEcran(page, admin);
      await page.getByRole("link", { name: T.shell.deletions }).click();
      await expect(page.getByRole("heading", { level: 1, name: T.deletions.title })).toBeVisible();

      // REJETER : sans motif le message ; avec un motif la demande part, le compte reste actif.
      const carteRejete = page.getByRole("listitem").filter({ hasText: rejete.email });
      await carteRejete.getByRole("button", { name: T.deletions.reject }).click();
      await page.getByRole("button", { name: T.deletions.confirmReject }).click();
      await expect(page.getByText(T.errors.validation["admin.validation.decisionNoteRequired"])).toBeVisible();
      await page.getByLabel(T.deletions.noteLabel).fill("Commissions en cours de règlement.");
      await page.getByRole("button", { name: T.deletions.confirmReject }).click();
      await expect(page.getByText(T.deletions.rejected(rejete.email))).toBeVisible();
      expect((await apiCall("POST", "/auth/login", undefined, { email: rejete.email, password: rejete.password })).status).toBe(200);

      // APPROUVER : la confirmation d'abord ; annuler ne fait rien ; confirmer anonymise.
      const carteApprouve = page.getByRole("listitem").filter({ hasText: approuve.email });
      await carteApprouve.getByRole("button", { name: T.deletions.approve }).click();
      const boite = page.getByRole("dialog");
      await expect(boite.getByText(T.deletions.approveDialog.title)).toBeVisible();
      await expect(boite.getByText(T.deletions.approveDialog.description(0))).toBeVisible();
      await boite.getByRole("button", { name: T.deletions.approveDialog.cancel }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect((await apiCall("POST", "/auth/login", undefined, { email: approuve.email, password: approuve.password })).status).toBe(200);

      await carteApprouve.getByRole("button", { name: T.deletions.approve }).click();
      await page.getByRole("dialog").getByRole("button", { name: T.deletions.approveDialog.confirm }).click();
      await expect(page.getByText(T.deletions.approved(approuve.email))).toBeVisible();
      expect((await apiCall("POST", "/auth/login", undefined, { email: approuve.email, password: approuve.password })).status).toBe(401);
    } finally {
      await contexte.close();
    }
  });

  test("E-5 : un PRO sous `/admin` lit un refus explicite et n'atteint aucune donnée ; puis, dans le MÊME navigateur, un ADMIN qui se connecte ne voit rien du PRO (MD-ADM-10)", async ({ browser }) => {
    const pro = await createVerifiedAccount("PRO");
    const salle = await brouillon(pro, "Salle des Orangers");
    const admin = await compteAdmin();
    const { contexte, page } = await nouveauContexte(browser);
    try {
      await loginContext(contexte, pro);
      await page.goto(`${PRO}/admin`);
      await expect(page.getByRole("heading", { name: T.forbidden.title })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: T.queue.title })).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

      // Le PRO se déconnecte par le refus ; l'ADMIN se connecte dans le MÊME navigateur : il arrive sous `/admin` et rien de la salle du PRO ne se lit sous son compte.
      await page.getByRole("button", { name: T.forbidden.logout }).click();
      await connecterAdminParEcran(page, admin);
      await expect(await lienDeLaFile(page, salle.nameFr)).toBeVisible(); // la file de l'ADMIN montre la salle : c'est SA lecture, par SON jeton
      await page.goto(`${PRO}/salles`);
      // Hors de `/admin`, un ADMIN est renvoyé sous `/admin` : il n'a pas d'espace Pro.
      await expect(page).toHaveURL(/\/admin$/);
    } finally {
      await contexte.close();
    }
  });
});
