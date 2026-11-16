import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { Client } from "pg";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT, DATABASE_URL, PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createVerifiedAccount, loginContext, seedReferentials, type Account } from "../fixtures/harness";

/**
 * RANG 50 (D348), LOT PUB-1 — « UNE SALLE PUBLIÉE SE VOIT SUR LE SITE CLIENT » : LE CHEMIN RÉEL APRÈS PUBLICATION, DANS UN VRAI NAVIGATEUR.
 *
 * M-1 : un pro crée une salle PAR L'ÉCRAN (essentiel, équipement, style, créneau, prix, photo) ; un ADMIN la publie par la route existante ; puis le site client — accueil, recherche sans
 * filtre, recherche avec CHAQUE filtre qui lui correspond (ville, invités, budget, équipement, style, date), fiche — en français ET en arabe. Chaque filtre a son JUMEAU NÉGATIF : le même
 * filtre, réglé pour l'exclure, ne la montre pas — sans lui, « la salle est là » serait vrai de toute recherche qui ne filtre rien.
 * M-2 : la table « pourquoi une salle publiée ne s'affiche pas » — chaque condition JOUÉE, avec ce que le PRO lit de son côté.
 *
 * ⚠ LE CATALOGUE N'EST PAS VIDE dans la suite complète (deux travailleurs créent des salles publiées en parallèle) : « les salles fictives ont disparu » s'affirme donc APRÈS la publication
 * (le bandeau est absent ET la carte réelle est là) ; l'état d'AVANT (fictives + bandeau, catalogue vide) se mesure spec jouée SEULE, et n'est pas affirmé ici (D348, lecture adverse C1).
 * ⚠ Les salles de ce fichier sont rendues UNIQUES par une commune, une capacité et un prix qu'aucune autre spec n'emploie : un filtre isole alors LA salle, jamais une salle parmi d'autres.
 * ⚠ La fiche d'une salle n'est PAS visitée avant sa publication : son cache est de 300 s (`revalidate`) et ce délai est la mesure M-3, jouée sur un build de production, pas ici.
 * ⚠ Les libellés viennent des MESSAGES (l'autorité), jamais recopiés. Les noms sont FICTIFS.
 */
const V = fr.venue.ui;
const MSG = { fr, ar } as const;

test.beforeAll(() => {
  seedReferentials();
});

// ── Une image VALIDE pour le pipeline (≥ 800 × 600), fabriquée sans dépendance ────────────────────
function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profondeur
  header[9] = 2; // RVB
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * stride + 1 + x * 3;
      raw[o] = (x * 255) / width;
      raw[o + 1] = (y * 255) / height;
      raw[o + 2] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// ── Comptes ──────────────────────────────────────────────────────────────────────────────────────
/** Un compte ADMIN : aucun chemin du produit n'en crée un — l'élévation passe par la base, comme `createPublishedVenue` et r37. */
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
async function publier(admin: Account, venueId: string): Promise<void> {
  const res = await apiCall("POST", `/admin/venues/${venueId}/publish`, await accessTokenOf(admin));
  expect(res.status, res.text).toBe(200);
}
async function ouvrirPro(browser: Browser, compte: Account, lang: "fr" | "ar" = "fr"): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript((l) => {
    try {
      window.localStorage.setItem("zwadj.pro.lang", l);
    } catch {
      /* stockage indisponible : la page reste en français */
    }
  }, lang);
  await loginContext(contexte, compte);
  return { contexte, page: await contexte.newPage() };
}

// ── Référentiels, relevés de l'API réelle ────────────────────────────────────────────────────────
interface Referentiels {
  /** La DERNIÈRE commune (par nom) : aucune autre spec ne la choisit — elles prennent la première. */
  cityId: string;
  /** Une AUTRE commune, celle que prennent les autres specs : le jumeau négatif du filtre « ville ». */
  otherCityId: string;
  amenities: { key: string; nameFr: string; nameAr: string }[];
  styles: { key: string; nameFr: string; nameAr: string }[];
}
async function referentiels(): Promise<Referentiels> {
  const wilayas = (await apiCall("GET", "/wilayas")).json as { cities: { id: string; nameFr: string }[] }[];
  const communes = wilayas.flatMap((w) => w.cities).sort((a, b) => a.nameFr.localeCompare(b.nameFr));
  expect(communes.length, "seedReferentials() n'a pas rempli les communes").toBeGreaterThan(1);
  const amenities = (await apiCall("GET", "/amenities")).json as Referentiels["amenities"];
  const styles = (await apiCall("GET", "/venue-styles")).json as Referentiels["styles"];
  return { cityId: communes[communes.length - 1]!.id, otherCityId: communes[0]!.id, amenities, styles };
}

// ── Lecture du site client ───────────────────────────────────────────────────────────────────────
const carte = (page: Page, nom: string): Locator => page.locator("li.venue-card").filter({ has: page.getByRole("heading", { name: nom, exact: true }) });

/** Charge une page du site client ; rend le statut HTTP. */
async function charger(page: Page, chemin: string): Promise<number> {
  const reponse = await page.goto(`${CLIENT}${chemin}`);
  return reponse?.status() ?? 0;
}

const dansDeuxMois = (): string => new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

interface Salle {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  prixDinars: number;
  capacite: number;
  cityId: string;
  amenity: Referentiels["amenities"][number];
  style: Referentiels["styles"][number];
  other: Referentiels;
}

test.describe.serial("R50 · M-1 — le chemin réel d'une salle, de l'écran du pro au site client", () => {
  let salle: Salle;

  test("le pro crée sa salle PAR L'ÉCRAN (essentiel, équipement, style, créneau, prix, photo) ; la salle est un brouillon absente du site ; l'ADMIN la publie", async ({ browser }) => {
    const ref = await referentiels();
    const pro = await createVerifiedAccount("PRO");
    const admin = await compteAdmin();
    const { contexte, page } = await ouvrirPro(browser, pro);

    const suffixe = randomUUID().slice(0, 6);
    const nameFr = `R50 Salle ${suffixe}`;
    const nameAr = `قاعة الاختبار ${suffixe}`;
    const prixDinars = 90_500;
    const capacite = 777;

    await page.goto(`${PRO}/salles/nouvelle`);
    await page.getByLabel(V.form.nameFr, { exact: true }).fill(nameFr);
    await page.getByLabel(V.form.nameAr, { exact: true }).fill(nameAr);
    const commune = page.getByLabel(V.form.city, { exact: true });
    await expect(commune.locator("option:not([value=''])").first()).toBeAttached();
    await commune.selectOption(ref.cityId);
    await page.getByLabel(V.form.capacityMax, { exact: true }).fill(String(capacite));
    await page.getByLabel(V.form.basePrice, { exact: true }).fill(String(prixDinars));
    const creation = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/v1/venues" && r.request().method() === "POST");
    await page.getByRole("button", { name: V.wizard.createAndContinue }).click();
    const reponse = await creation;
    expect(reponse.status()).toBe(201);
    const { id, slug } = (await reponse.json()) as { id: string; slug: string };
    await expect(page.getByText("Étape 2 sur 7")).toBeVisible();

    // Étape 2 (emplacement) : rien à saisir. Étape 3 : un équipement et un style, cochés À L'ÉCRAN.
    await page.getByRole("button", { name: V.wizard.next }).click();
    await expect(page.getByText("Étape 3 sur 7")).toBeVisible();
    const equipement = page.getByRole("group", { name: V.form.sectionAmenities }).getByRole("checkbox").first();
    const style = page.getByRole("group", { name: fr.venue.ui.form.sectionStyles }).getByRole("checkbox").first();
    const nomEquipement = (await equipement.locator("xpath=ancestor::label").innerText()).trim();
    const nomStyle = (await style.locator("xpath=ancestor::label").innerText()).trim();
    await equipement.check();
    await style.check();
    const amenity = ref.amenities.find((a) => a.nameFr === nomEquipement);
    const styleRef = ref.styles.find((s) => s.nameFr === nomStyle);
    expect(amenity, `l'équipement « ${nomEquipement} » n'est pas dans le référentiel de l'API`).toBeDefined();
    expect(styleRef, `le style « ${nomStyle} » n'est pas dans le référentiel de l'API`).toBeDefined();
    await page.getByRole("button", { name: V.wizard.next }).click();

    // Étape 4 : le CRÉNEAU et son prix.
    await expect(page.getByText("Étape 4 sur 7")).toBeVisible();
    await page.getByRole("button", { name: V.slots.add }).click();
    await page.getByLabel(V.slots.nameFr, { exact: true }).fill("Soirée");
    await page.getByLabel(V.slots.nameAr, { exact: true }).fill("سهرة");
    await page.getByLabel(V.slots.price, { exact: true }).fill(String(prixDinars));
    const creneau = page.waitForResponse((r) => /\/venues\/[^/]+\/slot-templates$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
    await page.getByRole("button", { name: V.slots.create }).click();
    expect((await creneau).status()).toBe(201);
    await page.getByRole("button", { name: V.wizard.next }).click();

    // Étape 5 (prestations) : rien. Étape 6 : la PHOTO.
    await expect(page.getByText("Étape 5 sur 7")).toBeVisible();
    await page.getByRole("button", { name: V.wizard.next }).click();
    await expect(page.getByText("Étape 6 sur 7")).toBeVisible();
    const photo = page.waitForResponse((r) => /\/venues\/[^/]+\/photos$/.test(new URL(r.url()).pathname) && r.request().method() === "POST");
    await page.getByLabel(V.photos.inputLabel).setInputFiles({ name: "salle.png", mimeType: "image/png", buffer: png(800, 600) });
    expect((await photo).status()).toBe(201);
    await page.getByRole("button", { name: V.wizard.next }).click();
    await expect(page.getByText("Étape 7 sur 7")).toBeVisible();
    // Ce que le pro lit à l'étape de publication : consigné pour M-2 (la phrase, pas une valeur).
    expect(await page.getByText(V.wizard.publishHint).count()).toBe(1);
    await contexte.close();

    salle = { id, slug, nameFr, nameAr, prixDinars, capacite, cityId: ref.cityId, amenity: amenity!, style: styleRef!, other: ref };

    // AVANT la publication : brouillon — la recherche (sans cache) ne la montre pas.
    const anonyme = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const visiteur = await anonyme.newPage();
    expect(await charger(visiteur, `/fr/salles?minPrice=${prixDinars}&maxPrice=${prixDinars}`)).toBe(200);
    await expect(carte(visiteur, nameFr)).toHaveCount(0);
    await anonyme.close();

    await publier(admin, id);
  });

  for (const langue of ["fr", "ar"] as const) {
    const M = MSG[langue];
    const nom = (s: Salle): string => (langue === "fr" ? s.nameFr : s.nameAr);

    test(`${langue.toUpperCase()} · l'accueil montre la salle, et AUCUNE salle fictive ni son bandeau`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      expect(await charger(page, `/${langue}`)).toBe(200);
      await expect(carte(page, nom(salle)).first(), "ni « récentes » ni « moins chères » ne porte la salle publiée").toBeVisible();
      await expect(page.getByText(M.home.venues.previewNotice)).toHaveCount(0);
      await ctx.close();
    });

    test(`${langue.toUpperCase()} · /salles : sans filtre, puis avec CHAQUE filtre qui lui correspond (et son jumeau négatif)`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const base = `/${langue}/salles`;

      // Sans filtre : la salle et pas de bandeau fictif.
      expect(await charger(page, base)).toBe(200);
      await expect(carte(page, nom(salle))).toBeVisible();
      await expect(page.getByText(M.search.preview.notice)).toHaveCount(0);

      const autreEquipement = salle.other.amenities.find((a) => a.key !== salle.amenity.key)!;
      const autreStyle = salle.other.styles.find((s) => s.key !== salle.style.key)!;
      const cas: { filtre: string; oui: string; non: string }[] = [
        { filtre: "ville", oui: `cityId=${salle.cityId}`, non: `cityId=${salle.other.otherCityId}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}` },
        { filtre: "invités", oui: `guests=450&minPrice=${salle.prixDinars}`, non: `maxCapacity=100&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}` },
        { filtre: "budget", oui: `minPrice=${salle.prixDinars - 500}&maxPrice=${salle.prixDinars + 500}`, non: `minPrice=${salle.prixDinars + 1_000}&maxPrice=${salle.prixDinars + 2_000}` },
        { filtre: "équipement", oui: `amenities=${salle.amenity.key}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}`, non: `amenities=${autreEquipement.key}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}` },
        { filtre: "style", oui: `styles=${salle.style.key}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}`, non: `styles=${autreStyle.key}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}` },
        { filtre: "date", oui: `availableOn=${dansDeuxMois()}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}`, non: `availableOn=${dansDeuxMois()}&minPrice=${salle.prixDinars + 1_000}&maxPrice=${salle.prixDinars + 2_000}` }
      ];
      for (const c of cas) {
        expect(await charger(page, `${base}?${c.oui}`), `filtre « ${c.filtre} »`).toBe(200);
        await expect(carte(page, nom(salle)), `filtre « ${c.filtre} » : la salle qui lui correspond doit être là`).toBeVisible();
        await expect(page.getByText(M.search.preview.notice), `filtre « ${c.filtre} » : un résultat réel exclut le bandeau fictif`).toHaveCount(0);
        expect(await charger(page, `${base}?${c.non}`), `jumeau négatif « ${c.filtre} »`).toBe(200);
        await expect(carte(page, nom(salle)), `jumeau négatif « ${c.filtre} » : la salle ne doit PAS y être`).toHaveCount(0);
      }
      // La date n'écarte pas la salle : elle est libre ce jour-là, donc non grisée.
      await charger(page, `${base}?availableOn=${dansDeuxMois()}&minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}`);
      await expect(carte(page, nom(salle))).not.toHaveClass(/is-unavailable/);
      // Tous les filtres ensemble.
      await charger(page, `${base}?cityId=${salle.cityId}&guests=450&minPrice=${salle.prixDinars - 500}&maxPrice=${salle.prixDinars + 500}&amenities=${salle.amenity.key}&styles=${salle.style.key}&availableOn=${dansDeuxMois()}`);
      await expect(carte(page, nom(salle))).toBeVisible();
      await ctx.close();
    });

    test(`${langue.toUpperCase()} · la fiche s'ouvre depuis la carte : titre, photo chargée, page ${langue === "ar" ? "de droite à gauche" : "de gauche à droite"}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await charger(page, `/${langue}/salles?minPrice=${salle.prixDinars}&maxPrice=${salle.prixDinars}`);
      const c = carte(page, nom(salle));
      await expect(c).toBeVisible();
      await expect(c.locator(".venue-card-nophoto"), "la carte annonce « aucune photo » alors que le pro en a envoyé une").toHaveCount(0);
      await c.getByRole("link").first().click();
      await expect(page).toHaveURL(new RegExp(`/${langue}/salles/${salle.slug}$`));
      await expect(page.getByRole("heading", { level: 1, name: nom(salle) })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", langue === "ar" ? "rtl" : "ltr");
      const chargee = page.locator("main img").first();
      await expect(chargee).toBeVisible();
      await expect.poll(() => chargee.evaluate((el) => (el as HTMLImageElement).naturalWidth), { message: "la photo de la fiche ne se charge pas" }).toBeGreaterThan(0);
      await ctx.close();
    });
  }
});

// ── M-2 — « POURQUOI UNE SALLE PUBLIÉE NE S'AFFICHE PAS » : chaque condition du code, JOUÉE ────────────
interface SalleApi {
  id: string;
  slug: string;
  nameFr: string;
  prix: number;
}
interface Lecture {
  condition: string;
  liste: boolean;
  listeAvecDate: boolean;
  fiche: number;
}

test.describe("R50 · M-2 — pourquoi une salle publiée ne s'affiche pas : chaque condition jouée", () => {
  test("témoin, brouillon, masquée, temporairement indisponible, supprimée, sans créneau actif, compte du pro supprimé : la liste, la fiche, et ce que le PRO lit", async ({ browser }) => {
    const ref = await referentiels();
    const admin = await compteAdmin();
    const tAdmin = await accessTokenOf(admin);
    const pro = await createVerifiedAccount("PRO");
    const tPro = await accessTokenOf(pro);
    let rang = 0;

    /** Une salle créée par l'API réelle, avec un créneau ; un prix UNIQUE l'isole dans la recherche. */
    async function creer(jeton: string): Promise<SalleApi> {
      rang += 1;
      const prix = 91_000 + rang * 1_000;
      const nameFr = `R50 M2 ${rang} ${randomUUID().slice(0, 6)}`;
      const res = await apiCall("POST", "/venues", jeton, { cityId: ref.cityId, nameFr, nameAr: "قاعة", capacityMax: 300, basePriceCents: prix * 100, bookingMode: "SINGLE_SLOT" });
      expect(res.status, res.text).toBe(201);
      const { id, slug } = res.json as { id: string; slug: string };
      const creneau = await apiCall("POST", `/venues/${id}/slot-templates`, jeton, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: prix * 100 });
      expect(creneau.status, creneau.text).toBe(201);
      return { id, slug, nameFr, prix };
    }
    const modifier = async (v: SalleApi, corps: object) => expect((await apiCall("PATCH", `/venues/${v.id}`, tPro, corps)).status).toBe(200);

    const temoin = await creer(tPro);
    const brouillon = await creer(tPro);
    const masquee = await creer(tPro);
    const indispo = await creer(tPro);
    const supprimee = await creer(tPro);
    const sansCreneau = await creer(tPro);
    for (const v of [temoin, masquee, indispo, supprimee, sansCreneau]) await publier(admin, v.id);
    await modifier(masquee, { status: "HIDDEN" });
    await modifier(indispo, { status: "TEMPORARILY_UNAVAILABLE" });
    const suppression = await apiCall("DELETE", `/venues/${supprimee.id}`, tPro);
    expect([200, 204], suppression.text).toContain(suppression.status);
    // « Publiée sans créneau actif » : l'API le REFUSE (retirer le dernier créneau d'une salle publiée) — seule la base peut le produire.
    const db = new Client({ connectionString: DATABASE_URL });
    await db.connect();
    try {
      await db.query(`UPDATE slot_templates SET is_active = false WHERE venue_id = $1`, [sansCreneau.id]);
    } finally {
      await db.end();
    }
    // Le compte du pro supprimé : demande, puis approbation par l'admin (archive les salles, D41).
    const proSupprime = await createVerifiedAccount("PRO");
    const tProSupprime = await accessTokenOf(proSupprime);
    const compteSupprime = await creer(tProSupprime);
    await publier(admin, compteSupprime.id);
    const demande = await apiCall("POST", "/me/deletion-request", tProSupprime, {});
    expect(demande.status, demande.text).toBe(201);
    const approbation = await apiCall("POST", `/admin/deletion-requests/${(demande.json as { id: string }).id}/approve`, tAdmin, {});
    expect(approbation.status, approbation.text).toBe(200);

    // ── Ce que lit le SITE CLIENT (après les changements d'état : la fiche n'est visitée qu'ICI, une seule fois chacune)
    const anonyme = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const visiteur = await anonyme.newPage();
    const date = dansDeuxMois();
    async function lire(condition: string, v: SalleApi): Promise<Lecture> {
      const filtre = `minPrice=${v.prix}&maxPrice=${v.prix}`;
      await charger(visiteur, `/fr/salles?${filtre}`);
      const liste = (await carte(visiteur, v.nameFr).count()) === 1;
      await charger(visiteur, `/fr/salles?${filtre}&availableOn=${date}`);
      const listeAvecDate = (await carte(visiteur, v.nameFr).count()) === 1;
      const fiche = await charger(visiteur, `/fr/salles/${v.slug}`);
      return { condition, liste, listeAvecDate, fiche };
    }
    const lectures = [
      await lire("témoin : publiée, visible, un créneau actif", temoin),
      await lire("brouillon : jamais publiée", brouillon),
      await lire("masquée par le pro (HIDDEN)", masquee),
      await lire("temporairement indisponible (TEMPORARILY_UNAVAILABLE)", indispo),
      await lire("supprimée par le pro", supprimee),
      await lire("publiée, aucun créneau actif", sansCreneau),
      await lire("compte du pro supprimé (salles archivées)", compteSupprime)
    ];
    // Le filtre « invités » et son jumeau négatif : la salle témoin accueille 300 personnes (la salle de M-1, 777, passe tous les seuils que l'URL permet : plafond 500).
    await charger(visiteur, `/fr/salles?guests=250&minPrice=${temoin.prix}&maxPrice=${temoin.prix}`);
    const invites250 = await carte(visiteur, temoin.nameFr).count();
    await charger(visiteur, `/fr/salles?guests=450&minPrice=${temoin.prix}&maxPrice=${temoin.prix}`);
    const invites450 = await carte(visiteur, temoin.nameFr).count();
    await anonyme.close();
    expect(invites250, "300 places pour 250 invités : la salle doit être là").toBe(1);
    expect(invites450, "300 places pour 450 invités : la salle ne doit PAS être là").toBe(0);

    // ── Ce que lit le PRO, sur sa liste « Mes salles »
    const { contexte, page } = await ouvrirPro(browser, pro);
    await page.goto(`${PRO}/salles`);
    const cartePro = (v: SalleApi): Locator => page.locator("main ul li").filter({ has: page.getByRole("heading", { name: v.nameFr, exact: true }) });
    await expect(cartePro(temoin)).toBeVisible();
    const lecturePro: Record<string, string> = {};
    for (const [nom, v] of [["témoin", temoin], ["brouillon", brouillon], ["masquée", masquee], ["indisponible", indispo], ["sans créneau", sansCreneau]] as const) {
      const c = cartePro(v);
      await expect(c, `la liste du pro ne montre pas sa salle « ${nom} »`).toBeVisible();
      const visibilite = await c.locator("select").inputValue();
      lecturePro[nom] = `${(await c.innerText()).replace(/\s+/g, " ").trim()} || visibilité=${visibilite}`;
    }
    await expect(cartePro(supprimee), "la salle supprimée ne doit plus être dans la liste du pro").toHaveCount(0);
    await contexte.close();

    const attendu: Record<string, { liste: boolean; listeAvecDate: boolean; fiche: number }> = {
      "témoin : publiée, visible, un créneau actif": { liste: true, listeAvecDate: true, fiche: 200 },
      "brouillon : jamais publiée": { liste: false, listeAvecDate: false, fiche: 404 },
      "masquée par le pro (HIDDEN)": { liste: false, listeAvecDate: false, fiche: 404 },
      "temporairement indisponible (TEMPORARILY_UNAVAILABLE)": { liste: false, listeAvecDate: false, fiche: 200 },
      "supprimée par le pro": { liste: false, listeAvecDate: false, fiche: 404 },
      "publiée, aucun créneau actif": { liste: true, listeAvecDate: false, fiche: 200 },
      "compte du pro supprimé (salles archivées)": { liste: false, listeAvecDate: false, fiche: 404 }
    };
    // La TABLE est la pièce : elle est imprimée avant les verdicts.
    console.log(`R50-M2-TABLE ${JSON.stringify({ lectures, lecturePro })}`);
    for (const l of lectures) expect({ liste: l.liste, listeAvecDate: l.listeAvecDate, fiche: l.fiche }, l.condition).toEqual(attendu[l.condition]);

    // Ce que le pro lit : l'état de publication et la visibilité qu'il a choisie — les MOTS de l'application.
    expect(lecturePro["brouillon"]).toContain(V.publication.draft);
    expect(lecturePro["témoin"]).toContain(V.publication.published);
    expect(lecturePro["masquée"]).toContain("visibilité=HIDDEN");
    expect(lecturePro["indisponible"]).toContain("visibilité=TEMPORARILY_UNAVAILABLE");
    expect(lecturePro["sans créneau"]).toContain(V.publication.published);
  });
});

// ── M-3 (garde) — LA FICHE NE MENT PAS SUR UNE SALLE QUI CHANGE D'ÉTAT APRÈS AVOIR ÉTÉ VUE ───────────────
// Mesuré sur un build de production (docs/preuves/D348/mesures/) : la fiche, une fois vue, était gardée 300 s ; la revalidation d'une salle MASQUÉE ou SUPPRIMÉE rendait 404, que le cache
// de données de Next ne retient pas — l'entrée périmée (200) restait donc servie, plus de dix minutes après et même après un redémarrage, alors que la liste (sans cache) l'avait retirée
// aussitôt. Ici, dans un navigateur : une fiche vue, PUIS l'état change, PUIS la fiche est relue — elle doit dire la vérité tout de suite.
test.describe("R50 · M-3 — la fiche dit la vérité sur une salle qui change d'état après avoir été vue", () => {
  test("publiée après une visite en 404 ; renommée ; masquée ; supprimée : chaque relecture de la fiche suit l'état réel", async ({ browser }) => {
    const ref = await referentiels();
    const admin = await compteAdmin();
    const pro = await createVerifiedAccount("PRO");
    const tPro = await accessTokenOf(pro);
    let rang = 0;
    async function creer(): Promise<SalleApi> {
      rang += 1;
      const prix = 81_000 + rang * 1_000;
      const nameFr = `R50 M3 ${rang} ${randomUUID().slice(0, 6)}`;
      const res = await apiCall("POST", "/venues", tPro, { cityId: ref.cityId, nameFr, nameAr: "قاعة", capacityMax: 300, basePriceCents: prix * 100, bookingMode: "SINGLE_SLOT" });
      expect(res.status, res.text).toBe(201);
      const { id, slug } = res.json as { id: string; slug: string };
      const creneau = await apiCall("POST", `/venues/${id}/slot-templates`, tPro, { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: prix * 100 });
      expect(creneau.status, creneau.text).toBe(201);
      return { id, slug, nameFr, prix };
    }
    const avantPublication = await creer();
    const renommee = await creer();
    const masquee = await creer();
    const supprimee = await creer();
    for (const v of [renommee, masquee, supprimee]) await publier(admin, v.id);

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // Chaque fiche est VUE une première fois (c'est ce qui la met en cache), dans son état d'alors.
    expect(await charger(page, `/fr/salles/${avantPublication.slug}`), "brouillon : 404").toBe(404);
    for (const v of [renommee, masquee, supprimee]) expect(await charger(page, `/fr/salles/${v.slug}`), `${v.nameFr} publiée : 200`).toBe(200);

    // L'état change.
    await publier(admin, avantPublication.id);
    const nouveauNom = `R50 M3 RENOMMEE ${randomUUID().slice(0, 6)}`;
    expect((await apiCall("PATCH", `/venues/${renommee.id}`, tPro, { nameFr: nouveauNom })).status).toBe(200);
    expect((await apiCall("PATCH", `/venues/${masquee.id}`, tPro, { status: "HIDDEN" })).status).toBe(200);
    const suppression = await apiCall("DELETE", `/venues/${supprimee.id}`, tPro);
    expect([200, 204], suppression.text).toContain(suppression.status);

    // La fiche est relue : elle suit l'état réel, TOUT DE SUITE.
    expect(await charger(page, `/fr/salles/${avantPublication.slug}`), "publiée après une visite en 404 : la fiche s'ouvre").toBe(200);
    expect(await charger(page, `/fr/salles/${renommee.slug}`)).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: nouveauNom }), "la fiche annonce encore l'ancien nom").toBeVisible();
    expect(await charger(page, `/fr/salles/${masquee.slug}`), "salle masquée : la fiche doit être un 404").toBe(404);
    expect(await charger(page, `/fr/salles/${supprimee.slug}`), "salle supprimée : la fiche doit être un 404").toBe(404);
    await ctx.close();
  });
});
