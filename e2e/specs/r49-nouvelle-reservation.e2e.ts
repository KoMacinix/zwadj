import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../fixtures/harness";

/**
 * RANG 49 (D347) — LE PARCOURS « NOUVELLE RÉSERVATION » DU PRO, DANS UN VRAI NAVIGATEUR, contre le VRAI serveur et sa base.
 *
 * Elle remplace, pour les gardes qu'aucune autre spec ne mesure, la spec du rang 32 arrêtée par D344 (`docs/preuves/D325/navigateur/`, intacte). La CARTE
 * (`docs/preuves/D347/carte.md`) dit, garde par garde, ce que r41 / r43 / r47 mesurent déjà : r49 n'écrit QUE le reste.
 *   T1 les règles de SAISIE du contact et des noms (« Continuer » qui dit pourquoi, téléphone, e-mail, noms, exemples) ;
 *   T2 le parcours jusqu'à la demande enregistrée : montants du SERVEUR, rail, « Précédent », fenêtre APRÈS la réponse, « Nouveau devis », ligne écrite ;
 *   T3 « Bloquer la date » ; T4 un échec du serveur ne confirme rien ; T5 le calendrier (statut, hachurage, week-end) ; T6 l'arabe à 360 px.
 *
 * ⛔ RÈGLE DES MONTANTS (décision 2 du relecteur, D325) : le montant AFFICHÉ est lu dans la RÉPONSE du serveur et comparé à l'écran — jamais recalculé ici. La valeur ENREGISTRÉE
 * est relue côté serveur, par l'API, et comparée à ce qui a été SAISI.
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Chaque test crée SA salle et SON pro. Aucune date n'est écrite : le calendrier propose le premier jour libre
 * (D213, D227). ⚠ Un délai d'action (`click`, `goto`) n'est pas une morsure (D323) : seules comptent les assertions `expect(...)`.
 * ⚠ Les saisies ne reprennent rien de r32 (`remplirClient`) : l'écran est scindé depuis le rang 41 (contact, puis noms et invités).
 */
const W = fr.venue.ui.walkin;
const WA = ar.venue.ui.walkin;
const PHONE = fr.common.phone;
const PHONE_AR = ar.common.phone;
/** Le numéro du client (JAMAIS celui du pro, `550000001`, D336) : neuf chiffres nationaux, et ce que la base doit garder. */
const CLIENT = { chiffres: "661234567", e164: "+213661234567", nomLatin: "Amina Bensalem", prenom: "Amina", nom: "Bensalem", invites: "150" };

test.beforeAll(() => {
  seedReferentials();
});

type Salle = Awaited<ReturnType<typeof createPublishedVenue>>;
interface Parcours {
  salle: Salle;
  contexte: BrowserContext;
  page: Page;
}

/** Ouvre « Nouvelle réservation » comme le pro : connecté, sur le tableau de bord. `langue` est posée AVANT le chargement, comme le fait le sélecteur de langue. */
async function ouvrir(browser: Browser, langue: "fr" | "ar" = "fr", viewport?: { width: number; height: number }): Promise<Parcours> {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext(viewport ? { viewport } : {});
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

const question = (page: Page) => page.locator("#wk-question");
const raisons = (page: Page) => page.locator("#wk-continue-reason li");
const echappe = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Un message à trous (`{date}`, `{client}`) devient une expression qui accepte n'importe quelle valeur à leur place — l'attendu reste DÉRIVÉ du message. */
const gabarit = (message: string) => new RegExp(`^${echappe(message).replace(/\\\{[a-z]+\\\}/g, ".+")}$`);
const plat = (texte: string | null) => (texte ?? "").replace(/\s+/g, " ").trim();
/** `fr` en dinars sans décimale, espaces normalisés : la forme que rend `formatDZD`, dérivée d'`Intl` — pas tapée à la main (D209, n° 6). */
const dinars = (centimes: number) =>
  plat(new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(centimes / 100));

/** Contact (le téléphone du client) puis noms et invités, jusqu'à la fiche créée : l'étape suivante est la DATE. */
async function jusquAuxNoms(page: Page, libelles: typeof W = W) {
  await page.getByLabel(libelles.phone, { exact: true }).pressSequentially(CLIENT.chiffres);
  await page.getByRole("button", { name: libelles.continue, exact: true }).click();
  await expect(question(page)).toHaveText(libelles.qClient);
}
async function saisirNomsEtInvites(page: Page, libelles: typeof W = W) {
  await page.getByLabel(libelles.nameLatin, { exact: true }).fill(CLIENT.nomLatin);
  await page.getByLabel(libelles.guests, { exact: true }).fill(CLIENT.invites);
  await page.getByRole("button", { name: libelles.continue, exact: true }).click();
  await expect(question(page)).toHaveText(libelles.qDate);
}

/** Le premier jour LIBRE de la grille, puis le premier créneau libre de ce jour — comme un pro qui regarde le calendrier. */
async function choisirDateEtCreneau(page: Page) {
  const jour = page.locator("td.cal-cell button.cal-day.is-available:not([disabled])").first();
  await expect(jour, "le calendrier du parcours ne propose aucun jour libre").toBeEnabled();
  await jour.click();
  const creneau = page.locator("button.cal-slot-pick:not([disabled])").first();
  await expect(creneau, "le jour choisi ne propose aucun créneau libre").toBeEnabled();
  await creneau.click();
}

/** Du contact jusqu'au devis CALCULÉ ; rend la réponse du serveur (le montant qui fait foi). */
async function jusquAuDevis(page: Page): Promise<{ totalCents: number; depositCents: number }> {
  await jusquAuxNoms(page);
  await saisirNomsEtInvites(page);
  await choisirDateEtCreneau(page);
  await page.getByRole("button", { name: W.seeQuote, exact: true }).click();
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  const corps = (await (await reponse).json()) as { totalCents: number; depositCents: number };
  return { totalCents: corps.totalCents, depositCents: corps.depositCents };
}

const demandesDeLaSalle = async (salle: Salle) =>
  (await apiCall("GET", `/pro/venues/${salle.id}/bookings`, await accessTokenOf(salle.pro))).json as Array<{
    status: string;
    contactFirstName: string;
    contactLastName: string;
    contactPhone: string | null;
    contactEmail: string | null;
  }>;

test("⛔ T1 — les règles de SAISIE : « Continuer » DIT pourquoi, le téléphone refuse un mauvais premier chiffre, l'e-mail et les noms sont jugés, chaque champ porte un exemple", async ({ browser }) => {
  const { contexte, page } = await ouvrir(browser);

  // ── Étape CONTACT. « Continuer » grisé dit POURQUOI, et la raison est LIÉE au bouton (G1a).
  await expect(question(page)).toHaveText(W.qContact);
  const continuer = page.getByRole("button", { name: W.continue, exact: true });
  await expect(continuer).toBeDisabled();
  await expect(raisons(page)).toHaveText([W.needIdentifier]);
  await expect(continuer).toHaveAttribute("aria-describedby", "wk-continue-reason");

  // ── Exemples (G1e) : un format dans chaque champ, le libellé reste visible.
  const tel = page.getByLabel(W.phone, { exact: true });
  const courriel = page.getByLabel(W.contactEmail, { exact: true });
  await expect(tel).toHaveAttribute("placeholder", PHONE.placeholder.DZ);
  await expect(courriel).toHaveAttribute("placeholder", W.emailPlaceholder);
  await expect(page.locator("label", { hasText: new RegExp(`^${echappe(W.phone)}$`) })).toBeVisible();
  await expect(page.locator("label", { hasText: new RegExp(`^${echappe(W.contactEmail)}$`) })).toBeVisible();

  // ── Téléphone (G1c) : l'indicatif et le drapeau devant ; le premier chiffre refusé est GARDÉ SEUL, la saisie suivante est bloquée.
  await expect(page.getByRole("img", { name: new RegExp(`^${echappe(PHONE.country.DZ)}, `) })).toBeVisible();
  await tel.pressSequentially("0");
  await expect(tel).toHaveValue("0");
  await expect(page.getByRole("alert").filter({ hasText: PHONE.leadingDigit.DZ })).toBeVisible();
  await expect(raisons(page)).toHaveText([W.needPhoneLeading]);
  await tel.pressSequentially("55");
  await expect(tel, "la saisie suivante doit être bloquée").toHaveValue("0");
  await tel.fill("");
  // Treize caractères tapés dont deux lettres : seuls les chiffres passent, au plus NEUF (les quatre derniers chiffres tapés sont refusés).
  await tel.pressSequentially("66a1234b5678912");
  await expect(tel, "seuls les chiffres passent, au plus neuf").toHaveValue(CLIENT.chiffres);
  await expect(page.getByRole("alert")).toHaveCount(0);

  // ── E-mail (G1d) : une adresse à moitié tapée est refusée, et retient ; vide, elle ne retient rien.
  await courriel.fill("abc");
  await expect(page.getByRole("alert").filter({ hasText: W.emailInvalid })).toBeVisible();
  await expect(continuer, "un e-mail SAISI et invalide retient même avec un numéro valide").toBeDisabled();
  await expect(raisons(page)).toHaveText([W.needEmailValid]);
  await courriel.fill("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(continuer).toBeEnabled();
  await expect(continuer).not.toHaveAttribute("aria-describedby", /.+/);
  await expect(page.locator("#wk-continue-reason")).toHaveCount(0);
  await continuer.click();

  // ── Étape CLIENT. Il manque un nom et les invités : la liste le DIT, dans l'ordre de la règle.
  await expect(question(page)).toHaveText(W.qClient);
  const suite = page.getByRole("button", { name: W.continue, exact: true });
  await expect(suite).toBeDisabled();
  await expect(raisons(page)).toHaveText([W.needName, W.needGuests]);
  await expect(suite).toHaveAttribute("aria-describedby", "wk-continue-reason");
  const latin = page.getByLabel(W.nameLatin, { exact: true });
  const arabe = page.getByLabel(W.nameAr, { exact: true });
  await expect(latin).toHaveAttribute("placeholder", W.nameLatinPlaceholder);
  await expect(arabe).toHaveAttribute("placeholder", W.nameArPlaceholder);
  await expect(page.getByLabel(W.guests, { exact: true })).toHaveAttribute("placeholder", W.guestsPlaceholder);

  // ── Noms (G1b) : un chiffre est refusé sous le champ ; l'arabe et le tiret passent.
  await latin.fill("Amina1");
  await expect(page.getByRole("alert").filter({ hasText: W.nameLatinInvalid })).toBeVisible();
  await expect(raisons(page)).toHaveText([W.needNameLatinValid, W.needGuests]);
  await latin.fill("");
  await arabe.fill("أمينة");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await arabe.fill("");
  await latin.fill("Amina-Lyna");
  await expect(page.getByRole("alert")).toHaveCount(0);
  // Il reste les invités : « Continuer » ne dit plus QUE lui.
  await expect(raisons(page)).toHaveText([W.needGuests]);
  await page.getByLabel(W.guests, { exact: true }).fill(CLIENT.invites);
  await expect(suite).toBeEnabled();
  await expect(suite).not.toHaveAttribute("aria-describedby", /.+/);
  await contexte.close();
});

test("⛔ T2 — jusqu'à la demande enregistrée : montants du SERVEUR, rail, « Précédent » à gauche, fenêtre APRÈS la réponse, « Nouveau devis », ligne écrite = ligne saisie", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  await jusquAuxNoms(page);
  await saisirNomsEtInvites(page);
  await choisirDateEtCreneau(page);

  // ── « Précédent » (G1g) est à GAUCHE de l'action principale en français.
  const precedent = page.getByRole("button", { name: W.previous, exact: true });
  const voirDevis = page.getByRole("button", { name: W.seeQuote, exact: true });
  const [boitePrecedent, boiteSuivant] = [(await precedent.boundingBox()) as { x: number }, (await voirDevis.boundingBox()) as { x: number }];
  expect(boitePrecedent.x, "« Précédent » doit être à GAUCHE de « Voir le devis » en français").toBeLessThan(boiteSuivant.x);
  await voirDevis.click();
  const reponse = page.waitForResponse((r) => /\/venues\/[^/]+\/quotes$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: W.compute, exact: true }).click();
  const serveur = (await (await reponse).json()) as { totalCents: number; depositCents: number };

  // ── ⛔ G1h — le total et l'acompte AFFICHÉS sont ceux du serveur.
  await expect(page.locator(".wk-grand strong")).toHaveText(dinars(serveur.totalCents));
  await expect(page.locator(".wk-deposit strong")).toHaveText(dinars(serveur.depositCents));

  // ── G1i — le LIBELLÉ « Client » du rail ramène à l'étape sans rien effacer.
  const rail = page.getByRole("navigation", { name: W.progressLabel });
  await rail.getByText(W.stepClient, { exact: true }).click();
  await expect(question(page)).toHaveText(W.qClient);
  await expect(page.getByLabel(W.nameLatin, { exact: true })).toHaveValue(CLIENT.nomLatin);
  await expect(page.getByLabel(W.guests, { exact: true })).toHaveValue(CLIENT.invites);
  await rail.getByText(W.stepQuote, { exact: true }).click();
  await expect(page.locator(".wk-grand strong"), "le devis calculé est resté").toHaveText(dinars(serveur.totalCents));

  // ── G1j — la fenêtre ne s'ouvre PAS avant la réponse du serveur : la réponse de `convert` est RETENUE 1,5 s.
  await page.route(/\/quotes\/[^/]+\/convert$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  const conversion = page.waitForResponse((r) => /\/quotes\/[^/]+\/convert$/.test(new URL(r.url()).pathname));
  await page.getByRole("button", { name: W.standby, exact: true }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole("dialog"), "la fenêtre s'est ouverte AVANT la réponse du serveur").toHaveCount(0);
  await conversion;

  // ── G1k — la fenêtre nomme le client, dit l'action, porte la date ; « Fermer » la ferme.
  const fenetre = page.getByRole("dialog", { name: W.doneTitleStandby });
  await expect(fenetre).toBeVisible();
  const dit = fenetre.getByText(gabarit(W.doneDialogStandby));
  await expect(dit, "la fenêtre dit l'action, sur le modèle du message").toBeVisible();
  expect(plat(await dit.textContent()), "la fenêtre nomme le client").toContain(`${CLIENT.prenom} ${CLIENT.nom}`);
  expect(plat(await dit.textContent()), "la fenêtre porte une date").toMatch(/\d{1,2} \S+ \d{4}/);
  await fenetre.getByRole("button", { name: W.doneDialogClose, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // ── G1m — la ligne ÉCRITE est celle SAISIE (relue côté serveur, par l'API) ; jamais le corps de la requête (r41 le mesure).
  expect(await demandesDeLaSalle(salle), "une seule demande, celle qui vient d'être enregistrée").toMatchObject([
    { status: "PENDING", contactFirstName: CLIENT.prenom, contactLastName: CLIENT.nom, contactPhone: CLIENT.e164, contactEmail: null }
  ]);

  // ── G1l — « Recommencer » a disparu, « Nouveau devis » le remplace et repart du début, formulaire vidé.
  await expect(page.getByRole("button", { name: W.reset, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: W.newQuote, exact: true }).click();
  await expect(question(page)).toHaveText(W.qContact);
  await expect(page.getByLabel(W.phone, { exact: true })).toHaveValue("");
  await expect(page.getByLabel(W.contactEmail, { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: W.newQuote, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: W.reset, exact: true })).toBeVisible();
  await contexte.close();
});

test("⛔ T3 — « Bloquer la date » : la fenêtre dit « bloquée », et c'est ACCEPTED qui est écrit", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  await jusquAuDevis(page);
  await page.getByRole("button", { name: W.lockDate, exact: true }).click();
  const fenetre = page.getByRole("dialog", { name: W.doneTitleLocked });
  await expect(fenetre).toBeVisible();
  await expect(fenetre.getByText(gabarit(W.doneDialogLocked)), "la fenêtre dit « bloquée », sur le modèle du message").toBeVisible();
  await fenetre.getByRole("button", { name: W.doneDialogClose, exact: true }).click();
  expect((await demandesDeLaSalle(salle)).map((d) => d.status)).toEqual(["ACCEPTED"]);
  await contexte.close();
});

test("⛔ T4 — un échec du serveur ne confirme RIEN : la fenêtre reste fermée, l'erreur s'affiche, aucune ligne n'est écrite", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  await jusquAuDevis(page);
  await page.route(/\/quotes\/[^/]+\/convert$/, (route) =>
    route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ statusCode: 409, message: { code: "BOOKING_SLOT_TAKEN", message: "booking.errors.slotTaken" } }) })
  );
  await page.getByRole("button", { name: W.lockDate, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: fr.booking.errors.slotTaken })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: W.newQuote, exact: true })).toHaveCount(0);
  expect(await demandesDeLaSalle(salle), "l'échec simulé n'a rien écrit").toEqual([]);
  await contexte.close();
});

/** Le prochain vendredi (jour 5, week-end algérien, D56) au moins `delaiJours` jours après aujourd'hui à Alger, en date civile. */
function prochainVendredi(delaiJours: number): string {
  const d = new Date(Date.now() + 3_600_000 + delaiJours * 86_400_000);
  while (new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test("⛔ T5 — le calendrier du parcours : un jour BLOQUÉ de week-end garde sa couleur de statut ET un hachurage ; le week-end libre est plus clair", async ({ browser }) => {
  const { salle, contexte, page } = await ouvrir(browser);
  const vendredi = prochainVendredi(3);
  const bloc = await apiCall("POST", `/venues/${salle.id}/availability-blocks`, await accessTokenOf(salle.pro), {
    startsAt: `${vendredi}T00:00`,
    endsAt: `${new Date(Date.parse(`${vendredi}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)}T00:00`
  });
  expect(bloc.status, bloc.text).toBe(201);

  await jusquAuxNoms(page);
  await saisirNomsEtInvites(page);
  // Le mois affiché est le mois courant : si le vendredi tombe le mois suivant, on y va.
  const moisCourant = Number(new Date(Date.now() + 3_600_000).toISOString().slice(5, 7));
  if (Number(vendredi.slice(5, 7)) !== moisCourant) await page.getByRole("button", { name: fr.venue.ui.calendar.next, exact: true }).click();
  const numero = String(Number(vendredi.slice(8, 10)));
  const jourBloque = page.locator("td.cal-cell.is-weekend button.cal-day.is-blocked").filter({ has: page.locator(".cal-num", { hasText: new RegExp(`^${numero}$`) }) });
  await expect(jourBloque, "le vendredi bloqué n'est pas rendu bloqué").toHaveCount(1);

  const mesure = async (l: Locator) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el);
      const racine = getComputedStyle(document.documentElement);
      const resolu = (nom: string) => {
        const sonde = document.createElement("span");
        sonde.style.color = racine.getPropertyValue(nom).trim();
        document.body.appendChild(sonde);
        const c = getComputedStyle(sonde).color;
        sonde.remove();
        return c;
      };
      return { fond: s.backgroundColor, image: s.backgroundImage, bordure: s.borderStyle, weekend: resolu("--cal-weekend"), bloque: resolu("--cal-blocked"), accentDoux: resolu("--accent-soft") };
    });
  const bloque = await mesure(jourBloque);
  // Le STATUT l'emporte : le fond est celui du « bloqué », pas la teinte du week-end.
  expect(bloque.fond, "un vendredi bloqué s'affiche de la teinte du week-end").toBe(bloque.bloque);
  expect(bloque.fond).not.toBe(bloque.weekend);
  // Un hachurage, indépendant de la couleur ; et la bordure en tirets du week-end.
  expect(bloque.image).toContain("repeating-linear-gradient");
  expect(bloque.bordure).toBe("dashed");

  const libre = page.locator("td.cal-cell.is-weekend button.cal-day.is-available:not([disabled])").first();
  await expect(libre).toBeVisible();
  const l = await mesure(libre);
  expect(l.fond, "un week-end libre prend la teinte du week-end").toBe(l.weekend);
  expect(l.image, "un jour libre n'est pas hachuré").toBe("none");
  // Plus clair que l'ancienne teinte (`--accent-soft`) : luminance relative lue sur les couleurs RÉSOLUES par le navigateur.
  const luminance = (css: string) => {
    const [r, g, b] = (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number) as [number, number, number];
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  expect(luminance(l.weekend)).toBeGreaterThan(luminance(l.accentDoux));
  await contexte.close();
});

test("⛔ T6 — en ARABE, à 360 px : la disposition est REFLÉTÉE, le numéro reste de gauche à droite, chaque libellé pointe son champ, rien ne déborde", async ({ browser }) => {
  const { contexte, page } = await ouvrir(browser, "ar", { width: 360, height: 780 });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const debordement = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // ── Étape CONTACT. Chaque libellé arabe pointe SON champ (deux identifiants distincts, non vides).
  await expect(question(page)).toHaveText(WA.qContact);
  const tel = page.getByLabel(WA.phone, { exact: true });
  const courriel = page.getByLabel(WA.contactEmail, { exact: true });
  await expect(tel, "le libellé du téléphone pointe un champ").toHaveAttribute("id", /.+/);
  await expect(courriel, "le libellé de l'e-mail pointe un champ").toHaveAttribute("id", /.+/);
  expect(await tel.getAttribute("id"), "deux champs, deux identifiants").not.toBe(await courriel.getAttribute("id"));
  // Les exemples existent en arabe.
  await expect(tel).toHaveAttribute("placeholder", PHONE_AR.placeholder.DZ);
  await expect(courriel).toHaveAttribute("placeholder", WA.emailPlaceholder);
  // Le numéro se lit de gauche à droite : la boîte est `ltr`, le drapeau est à GAUCHE des chiffres, même dans une page arabe.
  const boite = page.locator(".phone-field").first();
  await expect(boite).toHaveAttribute("dir", "ltr");
  const drapeau = (await boite.locator("[role=img]").boundingBox()) as { x: number };
  const chiffres = (await tel.boundingBox()) as { x: number };
  expect(drapeau.x, "le drapeau est à gauche des chiffres").toBeLessThan(chiffres.x);
  // Aucun débordement horizontal à 360 px.
  expect(await debordement(), "l'étape Contact déborde à 360 px").toBeLessThanOrEqual(0);

  // ── Étape CLIENT : trois champs, trois identifiants distincts ; la page ne déborde toujours pas.
  await jusquAuxNoms(page, WA);
  for (const nom of [WA.nameAr, WA.nameLatin, WA.guests]) await expect(page.getByLabel(nom, { exact: true }), `« ${nom} » pointe un champ`).toHaveAttribute("id", /.+/);
  const ids = await Promise.all([WA.nameAr, WA.nameLatin, WA.guests].map((nom) => page.getByLabel(nom, { exact: true }).getAttribute("id")));
  expect(new Set(ids).size, "trois champs, trois identifiants").toBe(3);
  await expect(page.getByLabel(WA.nameAr, { exact: true })).toHaveAttribute("placeholder", WA.nameArPlaceholder);
  expect(await debordement(), "l'étape Client déborde à 360 px").toBeLessThanOrEqual(0);

  // ── « Précédent » est à DROITE de « Voir le devis » en arabe : la disposition se reflète.
  await saisirNomsEtInvites(page, WA);
  await choisirDateEtCreneau(page);
  const precedent = (await page.getByRole("button", { name: WA.previous, exact: true }).boundingBox()) as { x: number };
  const suivant = (await page.getByRole("button", { name: WA.seeQuote, exact: true }).boundingBox()) as { x: number };
  expect(precedent.x, "en arabe, « Précédent » doit être à DROITE de « Voir le devis »").toBeGreaterThan(suivant.x);
  expect(await debordement(), "l'étape Prestations déborde à 360 px").toBeLessThanOrEqual(0);
  await contexte.close();
});
