import { resolve } from "node:path";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { CLIENT, PRO } from "../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, createVerifiedAccount, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D325 — CAPTURES DU RANG 32 (pièce jetable, versée avec ce qu'elle a produit).
 *
 * Elle rejoue le parcours sur la pile e2e dédiée (ports 3100/3101/5273, base `zwadj_e2e`) et PHOTOGRAPHIE ce qui se voit : le champ de téléphone et son drapeau, les
 * erreurs, la raison du bouton grisé, le rail, le calendrier (week-end, jour bloqué), la fenêtre de confirmation, « Enregistrer » à l'étape 7 — en français et en
 * arabe, à 1280 et à 360 px. Chaque fichier écrit est imprimé : une capture manquante se voit, elle ne disparaît pas en silence.
 *
 * ⚠ Une capture n'est pas une porte. Elle montre ce que la spec e2e (`e2e/specs/r32-nouvelle-reservation.e2e.ts`) a mesuré ; elle ne remplace aucune assertion, et le
 * drapeau est à FAIRE VÉRIFIER PAR KO (un dessin ne se mesure pas : il se regarde).
 */
const SORTIE = resolve(__dirname);
const LANGUES = { fr: { W: fr.venue.ui.walkin, F: fr.venue.ui.form, B: fr.venueDetail.booking, V: fr.venueDetail.visit, cal: fr.venue.ui.calendar }, ar: { W: ar.venue.ui.walkin, F: ar.venue.ui.form, B: ar.venueDetail.booking, V: ar.venueDetail.visit, cal: ar.venue.ui.calendar } } as const;
type Langue = keyof typeof LANGUES;

const ecrites: string[] = [];
async function photo(cible: Page | ReturnType<Page["locator"]>, nom: string, options: Record<string, unknown> = {}) {
  const fichier = resolve(SORTIE, `${nom}.png`);
  await (cible as Page).screenshot({ path: fichier, ...options });
  ecrites.push(nom);
  console.log(`CAPTURE ${nom}.png`);
}

test.beforeAll(() => seedReferentials());
test.afterAll(() => console.log(`CAPTURES ÉCRITES : ${ecrites.length}`));

async function ouvrirPro(browser: Browser, langue: Langue, viewport: { width: number; height: number }, dsf = 1) {
  const salle = await createPublishedVenue();
  const contexte: BrowserContext = await browser.newContext({ viewport, deviceScaleFactor: dsf });
  await contexte.addInitScript((lang) => window.localStorage.setItem("zwadj.pro.lang", lang), langue);
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: LANGUES[langue].W.title })).toBeVisible();
  await page.waitForTimeout(500);
  return { salle, contexte, page };
}

/**
 * Choisir un jour libre puis un créneau dans le panneau de demande, DANS LA LANGUE JOUÉE. L'aide partagée `e2e/fixtures/panneau-reservation.ts` lit `fr.json` seul : elle
 * cherche « …, disponible » et ne trouve rien en arabe. Elle n'est pas modifiée ici (un défaut croisé se rapporte, il ne se corrige pas dans un autre lot) ; cette variante
 * lit les mêmes clés — `venueDetail.booking.dayFree`, `venueDetail.calendar.slotsFor` — dans la langue de la page.
 */
async function choisirUneDateEn(panneau: ReturnType<Page["locator"]>, langue: Langue) {
  const m = langue === "fr" ? fr : ar;
  const echappe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const gabarit = (message: string) => new RegExp(`^${echappe(message).replace(echappe("{date}"), ".+")}$`);
  const jour = panneau.getByRole("button", { name: gabarit(m.venueDetail.booking.dayFree) }).first();
  await expect(jour, "le calendrier du panneau ne propose aucun jour libre").toBeEnabled();
  await jour.click();
  const creneau = panneau.getByRole("group", { name: gabarit(m.venueDetail.calendar.slotsFor) }).getByRole("button", { disabled: false }).first();
  await expect(creneau, "le jour choisi ne propose aucun créneau libre").toBeEnabled();
  await creneau.click();
}

const SAISIE = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", invites: "150" };
async function remplir(page: Page, langue: Langue) {
  const { W } = LANGUES[langue];
  await page.getByLabel(W.firstName, { exact: true }).fill(SAISIE.prenom);
  await page.getByLabel(W.lastName, { exact: true }).fill(SAISIE.nom);
  await page.getByLabel(W.phone, { exact: true }).pressSequentially(SAISIE.chiffres);
  await page.getByLabel(W.guests, { exact: true }).fill(SAISIE.invites);
}
function prochainVendredi(delaiJours: number): string {
  const d = new Date(Date.now() + 3_600_000 + delaiJours * 86_400_000);
  while (new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

for (const langue of ["fr", "ar"] as const) {
  const { W, F, cal } = LANGUES[langue];

  test(`pro ${langue} — 1280 px : formulaire, erreurs, drapeau, calendrier, fenêtre`, async ({ browser }) => {
    const { salle, contexte, page } = await ouvrirPro(browser, langue, { width: 1280, height: 1000 });

    // 1 — formulaire vide : exemples dans les champs, étiquettes visibles, raison du bouton grisé.
    await photo(page, `pro-01-formulaire-vide-${langue}`, { fullPage: true });

    // 2 — erreurs : un chiffre dans le prénom, un premier chiffre refusé, un courriel à moitié tapé.
    await page.getByLabel(W.firstName, { exact: true }).fill("Amina1");
    await page.getByLabel(W.phone, { exact: true }).pressSequentially("0");
    await page.getByLabel(W.email, { exact: true }).fill("abc");
    await expect(page.getByRole("alert")).toHaveCount(3);
    await photo(page, `pro-02-erreurs-${langue}`, { fullPage: true });
    await page.getByLabel(W.firstName, { exact: true }).fill("");
    await page.getByLabel(W.phone, { exact: true }).fill("");
    await page.getByLabel(W.email, { exact: true }).fill("");

    // 3 — le calendrier : un vendredi BLOQUÉ, avec le week-end autour.
    const jeton = await accessTokenOf(salle.pro);
    const vendredi = prochainVendredi(3);
    const lendemain = new Date(Date.parse(`${vendredi}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const bloc = await apiCall("POST", `/venues/${salle.id}/availability-blocks`, jeton, { startsAt: `${vendredi}T00:00`, endsAt: `${lendemain}T00:00` });
    expect(bloc.status, bloc.text).toBe(201);
    await remplir(page, langue);
    await page.getByRole("button", { name: W.continue, exact: true }).click();
    if (Number(vendredi.slice(5, 7)) !== Number(new Date(Date.now() + 3_600_000).toISOString().slice(5, 7))) await page.getByRole("button", { name: cal.next, exact: true }).click();
    await expect(page.locator("td.cal-cell.is-weekend button.cal-day.is-blocked")).toHaveCount(1);
    await page.waitForTimeout(300);
    await photo(page, `pro-03-calendrier-${langue}`, { fullPage: true });

    // 4 — la fenêtre de confirmation, APRÈS la réponse du serveur.
    await page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first().click();
    await page.locator("button.cal-slot-pick:not([disabled])").first().click();
    await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
    await page.getByRole("button", { name: W.compute, exact: true }).click();
    await expect(page.locator(".wk-grand strong")).toBeVisible();
    await page.getByRole("button", { name: W.standby, exact: true }).click();
    await expect(page.getByRole("dialog", { name: W.doneTitleStandby })).toBeVisible();
    await photo(page, `pro-04-fenetre-${langue}`);
    await contexte.close();
  });

  test(`pro ${langue} — gros plan du drapeau (échelle 3)`, async ({ browser }) => {
    const { contexte, page } = await ouvrirPro(browser, langue, { width: 1280, height: 900 }, 3);
    await page.getByLabel(W.phone, { exact: true }).pressSequentially(SAISIE.chiffres);
    await photo(page.locator(".phone-field").first(), `pro-05-drapeau-${langue}`);
    await contexte.close();
  });

  test(`pro ${langue} — 360 px : le défaut ANTÉRIEUR tel quel, puis la mise en page avec la seule règle fautive neutralisée`, async ({ browser }) => {
    const { contexte, page } = await ouvrirPro(browser, langue, { width: 360, height: 780 });
    const colonnes = await page.evaluate(() => getComputedStyle(document.querySelector(".pro-layout") as Element).gridTemplateColumns);
    const debordement = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`MESURE 360 ${langue} · tel quel : grid-template-columns = « ${colonnes} », débordement = ${debordement} px`);
    await photo(page, `pro-06-360-tel-quel-${langue}`);
    await page.addStyleTag({ content: ".pro-layout { grid-template-columns: minmax(0, 1fr) !important; }" });
    const apres = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`MESURE 360 ${langue} · règle neutralisée : débordement = ${apres} px`);
    await photo(page, `pro-07-360-neutralise-${langue}`, { fullPage: true });
    // Les états du champ de téléphone et la ligne de boutons, à 360 px.
    await page.getByLabel(W.firstName, { exact: true }).fill("Amina1");
    await page.getByLabel(W.phone, { exact: true }).pressSequentially("0");
    await photo(page, `pro-08-360-erreurs-${langue}`, { fullPage: true });
    await page.getByLabel(W.firstName, { exact: true }).fill("");
    await page.getByLabel(W.phone, { exact: true }).fill("");
    await remplir(page, langue);
    await page.getByRole("button", { name: W.continue, exact: true }).click();
    // Les étapes s'animent à l'entrée : on attend la fin de l'animation avant de photographier (une capture en cours d'animation montre deux écrans superposés).
    await page.waitForTimeout(900);
    await photo(page, `pro-09a-360-date-${langue}`, { fullPage: true });
    await page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first().click();
    await page.waitForTimeout(900);
    await photo(page, `pro-09b-360-creneau-${langue}`, { fullPage: true });
    await page.locator("button.cal-slot-pick:not([disabled])").first().click();
    await page.waitForTimeout(900);
    await photo(page, `pro-09c-360-prestations-${langue}`, { fullPage: true });
    await contexte.close();
  });

  test(`pro ${langue} — « Enregistrer » à l'étape 7 de l'assistant de salle (point 14)`, async ({ browser }) => {
    const { salle, contexte, page } = await ouvrirPro(browser, langue, { width: 1280, height: 900 });
    await page.goto(`${PRO}/salles/${salle.id}?etape=7`);
    await expect(page.getByRole("heading", { name: (langue === "fr" ? fr : ar).venue.ui.wizard.step7 })).toBeVisible();
    await page.getByRole("button", { name: F.save, exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: F.nothingToSave })).toBeVisible();
    await page.waitForTimeout(300);
    await photo(page, `pro-10-enregistrer-etape7-${langue}`);
    await contexte.close();
  });

  test(`client ${langue} — 360 px : panneau de demande et panneau de visite, champ de téléphone`, async ({ browser }) => {
    const { B, V } = LANGUES[langue];
    const salle = await createPublishedVenue();
    const client = await createVerifiedAccount("CLIENT");
    const contexte = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await loginContext(contexte, client);
    const page = await contexte.newPage();
    await page.goto(`${CLIENT}/${langue}/salles/${salle.slug}`);
    const panneau = page.getByRole("region", { name: B.title });
    await expect(panneau.getByText(B.loading)).toHaveCount(0);
    await choisirUneDateEn(panneau, langue);
    await panneau.getByLabel(B.phone, { exact: true }).pressSequentially("0");
    await expect(panneau.getByRole("alert")).not.toHaveCount(0);
    await photo(panneau, `client-01-demande-360-${langue}`);
    const visite = page.getByRole("region", { name: V.title });
    if ((await visite.count()) > 0) {
      await visite.scrollIntoViewIfNeeded();
      await photo(visite, `client-02-visite-360-${langue}`);
    } else console.log(`SANS OBJET client ${langue} : aucun panneau de visite sur cette salle (aucune plage de visite créée par le harnais)`);
    await contexte.close();
  });
}
