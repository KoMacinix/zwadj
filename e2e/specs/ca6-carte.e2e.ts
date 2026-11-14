import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { API, CLIENT, PRO } from "../playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials, settle, type Account } from "../fixtures/harness";

/**
 * CA-6 (session « carte ») — LA VRAIE CARTE, DANS UN NAVIGATEUR : recherche, accueil, fiche, et le point posé par le pro.
 *
 * ⚠ POURQUOI ELLE EXISTE. Les tests de composant DOUBLENT le canevas (jsdom n'a pas de mise en page) : ils mesurent ce que nos
 * composants passent à la carte, jamais ce que Leaflet en fait. Ici la bibliothèque est la vraie, montée par le vrai `import()`.
 *
 * ⛔ AUCUN SERVEUR DE TUILES RÉEL N'EST APPELÉ (R-12). Chaque contexte intercepte TOUT ce qui ne va pas vers la pile locale :
 * une tuile reçoit une image d'un pixel fabriquée ici (ou un échec, pour la panne) ; toute autre requête externe est coupée et
 * COMPTÉE — le test « aucune requête externe inattendue » exige zéro. Les tuiles interceptées sont comptées aussi : c'est ce
 * compte qui prouve qu'AVANT le geste rien ne part (R-9).
 *
 * ⚠ CE QU'ELLE COMPARE. Les points affichés sont confrontés à ce que REND L'API au même instant (`GET /venue-map`), jamais à un
 * nombre écrit ici : la base e2e est partagée par toute la suite, d'autres specs y publient des salles. Les trois salles de
 * cette spec sont isolées par un prix que rien d'autre n'emploie.
 *
 * ⚠ CE QU'ELLE NE MESURE PAS : l'aspect des tuiles réelles (interceptées) ; un build de production (les serveurs sont ceux de
 * développement : le fond de carte est donc le défaut de développement) ; le glissement du point du pro (seul le clic est joué).
 */
const PRIX_DINARS = 777_000; // un prix qu'aucune autre spec n'emploie : il isole les salles de celle-ci
const FILTRE = `minPrice=${PRIX_DINARS}&maxPrice=${PRIX_DINARS}`;
const FILTRE_API = `minPriceCents=${PRIX_DINARS * 100}&maxPriceCents=${PRIX_DINARS * 100}`;
const POSITIONS = [
  { lat: 36.752345, lng: 3.042123 },
  { lat: 36.768901, lng: 3.058765 }
] as const;

/** PNG transparent d'un pixel : la « tuile » servie à la place du fournisseur. */
const TUILE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

interface Salle {
  id: string;
  slug: string;
  nameFr: string;
  pro: Account;
}
interface Points {
  points: { id: string; slug: string; nameFr: string; nameAr: string; basePriceCents: number; capacityMax: number }[];
  total: number;
  withoutCoordinates: number;
  truncated: boolean;
  limit: number;
}

let situees: Salle[] = [];
let sansPosition: Salle;

async function creerSalle(position: { lat: number; lng: number } | null): Promise<Salle> {
  const salle = await createPublishedVenue();
  const jeton = await accessTokenOf(salle.pro);
  const corps = { basePriceCents: PRIX_DINARS * 100, ...(position ?? {}) };
  const res = await apiCall("PATCH", `/venues/${salle.id}`, jeton, corps);
  if (res.status !== 200) throw new Error(`PATCH /venues/${salle.id} : ${res.status} ${res.text}`);
  return salle;
}

async function pointsDeLApi(query: string): Promise<Points> {
  const res = await apiCall("GET", `/venue-map${query ? `?${query}` : ""}`);
  expect(res.status).toBe(200);
  return res.json as Points;
}

test.beforeAll(async () => {
  seedReferentials();
  situees = [await creerSalle(POSITIONS[0]), await creerSalle(POSITIONS[1])];
  sansPosition = await creerSalle(null);
});

interface Reseau {
  /** Tuiles demandées (interceptées). */
  tuiles: string[];
  /** Toute AUTRE requête vers l'extérieur — coupée. Attendu : aucune. */
  externes: string[];
}

/** Pose l'interception sur un contexte. `tuilesEnPanne` : les tuiles échouent au lieu d'être servies. */
async function intercepter(context: BrowserContext, tuilesEnPanne = false): Promise<Reseau> {
  const reseau: Reseau = { tuiles: [], externes: [] };
  await context.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    async (route) => {
      const url = new URL(route.request().url());
      if (/\/\d+\/\d+\/\d+\.png$/.test(url.pathname)) {
        reseau.tuiles.push(url.href);
        if (tuilesEnPanne) await route.abort("failed");
        else await route.fulfill({ status: 200, contentType: "image/png", body: TUILE });
      } else {
        reseau.externes.push(url.href);
        await route.abort("blockedbyclient");
      }
    }
  );
  return reseau;
}

const epingles = (page: Page) => page.locator(".zw-map-canvas .zw-map-pin");
const chiffres = (texte: string | null): string => (texte ?? "").replace(/\D/g, "");
const dire = (gabarit: string, valeurs: Record<string, string | number>): string =>
  Object.entries(valeurs).reduce((t, [nom, v]) => t.replace(`{${nom}}`, String(v)), gabarit);

for (const [locale, messages] of [
  ["fr", fr],
  ["ar", ar]
] as const) {
  test(`CA-6 — ${locale}, recherche : rien ne part avant le geste ; la carte montre les salles situées de l'API, compte les autres, ouvre la carte d'une salle`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: locale === "ar" ? { width: 360, height: 800 } : { width: 1280, height: 900 } });
    const reseau = await intercepter(context);
    const page = await context.newPage();
    const chargements: string[] = [];
    page.on("request", (requete) => {
      if (/leaflet/i.test(requete.url())) chargements.push(requete.url());
    });
    await page.goto(`${CLIENT}/${locale}/salles?${FILTRE}`);
    await settle(page);
    // La grille a reçu ses salles (au moins les trois de cette spec : un ouvrier relancé après un échec en recrée).
    await expect(page.locator(".venue-grid .venue-card").first()).toBeVisible();
    expect(await page.locator(".venue-grid .venue-card").count()).toBeGreaterThanOrEqual(3);

    // ⛔ R-9 / R-1 — AVANT le geste : aucune tuile, aucun morceau de la bibliothèque, aucune carte.
    expect(reseau.tuiles).toEqual([]);
    expect(chargements).toEqual([]);
    await expect(page.locator(".leaflet-container")).toHaveCount(0);

    await page.getByRole("button", { name: messages.search.view.map }).click();
    await expect(page.locator(".zw-map-canvas.leaflet-container")).toHaveCount(1);

    const api = await pointsDeLApi(FILTRE_API);
    // Le cas de la spec a bien EU LIEU : ses deux salles situées sont des points, et au moins une salle n'a pas de position.
    // ⚠ « au moins » : si un ouvrier Playwright est relancé après un échec, `beforeAll` recrée trois salles au même prix.
    const idsDesPoints = api.points.map((p) => p.id);
    expect(situees.map((s) => idsDesPoints.includes(s.id))).toEqual([true, true]);
    expect(idsDesPoints.includes(sansPosition.id)).toBe(false);
    expect(api.withoutCoordinates).toBeGreaterThanOrEqual(1);

    await expect(epingles(page)).toHaveCount(api.points.length);
    await expect(page.locator(".map-view-count")).toHaveText(dire(messages.map.count, { count: api.points.length }));
    await expect(page.locator(".map-view-note")).toHaveText([dire(messages.map.withoutCoordinates, { count: api.withoutCoordinates })]);
    // La grille a cédé la place ; elle reste l'autre chemin, par la bascule.
    await expect(page.locator(".venue-grid")).toHaveCount(0);
    expect(reseau.tuiles.length).toBeGreaterThan(0);
    expect(chargements.length).toBeGreaterThan(0);

    // Un point ouvre la carte de SA salle : nom, prix du serveur, lien vers sa fiche.
    const choisie = api.points.find((p) => p.id === (situees[0] as Salle).id) as Points["points"][number];
    const nom = locale === "ar" ? choisie.nameAr : choisie.nameFr;
    // Les deux salles portent le même nom arabe (« قاعة ») : on vise le point par son identifiant, puis on lit son nom.
    const point = page.locator(`.zw-map-pin[data-marker-id="${choisie.id}"]`);
    await expect(point).toHaveAttribute("aria-label", nom);
    await expect(point).toHaveAttribute("role", "button");
    await point.focus();
    await page.keyboard.press("Enter"); // le chemin CLAVIER : un point est un bouton
    const fiche = page.locator(".map-venue-card");
    await expect(fiche.locator(".map-venue-card-name")).toHaveText(nom);
    // ⚠ Le prix affiché porte les chiffres des CENTIMES DU SERVEUR, en dinars (deux zéros de moins) — rien n'est recalculé.
    expect(chiffres(await fiche.locator(".map-venue-card-price").textContent())).toBe(String(choisie.basePriceCents).slice(0, -2));
    await expect(fiche.getByRole("link", { name: messages.map.card.open })).toHaveAttribute("href", `/${locale}/salles/${choisie.slug}`);
    await expect(point).toHaveAttribute("aria-pressed", "true");

    // La mention du fournisseur du fond de carte est affichée.
    await expect(page.locator(".zw-map-attribution")).toContainText("OpenStreetMap");

    // À 360 px (arabe), la page tient dans la fenêtre, carte et carte de salle ouvertes.
    if (locale === "ar") {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    }

    // Accessibilité : la vue « carte » ne porte AUCUNE violation (composant neuf : la seule valeur acceptable est zéro).
    const axe = await new AxeBuilder({ page }).include(".map-view").analyze();
    expect(axe.violations.map((v) => `${v.id} — ${v.nodes.length} nœud(s)`)).toEqual([]);

    // ⛔ R-12 — rien d'autre que des tuiles n'est parti vers l'extérieur.
    expect(reseau.externes).toEqual([]);
    await context.close();
  });
}

test("CA-6 — panne des TUILES : un message, et les salles restent sur la carte", async ({ browser }) => {
  const context = await browser.newContext();
  const reseau = await intercepter(context, true);
  const page = await context.newPage();
  await page.goto(`${CLIENT}/fr/salles?${FILTRE}`);
  await settle(page);
  await page.getByRole("button", { name: fr.search.view.map }).click();
  await expect(page.locator(".zw-map-note")).toHaveText(fr.map.tilesError);
  await expect(epingles(page)).toHaveCount((await pointsDeLApi(FILTRE_API)).points.length);
  expect(reseau.tuiles.length).toBeGreaterThan(0);
  await context.close();
});

test("CA-6 — panne de la ROUTE DE POINTS (500) : un message et « Réessayer », pas une page blanche ; puis la carte", async ({ browser }) => {
  const context = await browser.newContext();
  await intercepter(context);
  const page = await context.newPage();
  let enPanne = true;
  await page.route(`${API}/api/v1/venue-map**`, async (route) => {
    if (enPanne) await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ statusCode: 500, message: "panne (test)" }) });
    else await route.continue();
  });
  await page.goto(`${CLIENT}/fr/salles?${FILTRE}`);
  await settle(page);
  await page.getByRole("button", { name: fr.search.view.map }).click();
  await expect(page.locator('.search-results [role="alert"] h2')).toHaveText(fr.map.pointsErrorTitle);
  // La page est toujours là : son titre, ses filtres, sa bascule.
  await expect(page.locator("h1.results-title")).toHaveText(fr.search.title);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await expect(page.locator(".map-view-empty")).toHaveCount(0);

  enPanne = false;
  await page.getByRole("button", { name: fr.map.retry }).click();
  await expect(epingles(page)).toHaveCount((await pointsDeLApi(FILTRE_API)).points.length);
  await context.close();
});

test("CA-6 — accueil : rien ne part au chargement ; la carte se monte quand la section approche, avec les salles de l'API", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 700 } });
  const reseau = await intercepter(context);
  const page = await context.newPage();
  await page.goto(`${CLIENT}/fr`);
  await settle(page);
  await expect(page.locator("#hm-map-h")).toHaveCount(1);
  // ⛔ R-9 — au chargement : aucune tuile, aucune carte — MÊME si la section est déjà proche de l'écran (dans cette base
  // de test la page est courte : c'est ainsi que le défaut a été vu). Le bouton est offert à qui ne veut pas défiler.
  await expect(page.locator(".hm-map .map-panel-body")).toHaveText(fr.map.home.waiting);
  await expect(page.locator(".hm-map").getByRole("button", { name: fr.map.home.show })).toHaveCount(1);
  expect(reseau.tuiles).toEqual([]);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);

  // Le visiteur DESCEND vers la section : c'est son défilement qui monte la carte.
  await page.mouse.wheel(0, 300);
  await page.locator("#hm-map-h").scrollIntoViewIfNeeded();
  await expect(page.locator(".hm-map .zw-map-canvas.leaflet-container")).toHaveCount(1);
  const api = await pointsDeLApi("");
  expect(api.points.length).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".hm-map .zw-map-pin")).toHaveCount(api.points.length);
  await expect(page.locator(".hm-map .map-view-count")).toHaveText(dire(fr.map.count, { count: api.points.length }));
  await expect(page.locator(".hm-map").getByRole("link", { name: fr.map.home.search })).toHaveAttribute("href", "/fr/salles");
  expect(reseau.tuiles.length).toBeGreaterThan(0);
  expect(reseau.externes).toEqual([]);
  await context.close();
});

test("CA-6 — fiche : la carte au geste, un point au nom de la salle ; une salle sans position n'offre pas de carte", async ({ browser }) => {
  const context = await browser.newContext();
  const reseau = await intercepter(context);
  const page = await context.newPage();
  const salle = situees[0] as Salle;
  await page.goto(`${CLIENT}/fr/salles/${salle.slug}`);
  await settle(page);
  const bouton = page.getByRole("button", { name: fr.map.venue.show });
  await expect(bouton).toHaveCount(1);
  expect(reseau.tuiles).toEqual([]);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);

  await bouton.click();
  await expect(page.locator(".venue-location-map .zw-map-canvas.leaflet-container")).toHaveCount(1);
  await expect(epingles(page)).toHaveCount(1);
  await expect(epingles(page)).toHaveAttribute("aria-label", salle.nameFr);
  await expect(epingles(page)).toHaveAttribute("role", "img");
  expect(reseau.tuiles.length).toBeGreaterThan(0);

  // Salle SANS coordonnées : l'adresse et rien d'autre — ni bouton, ni carte.
  await page.goto(`${CLIENT}/fr/salles/${sansPosition.slug}`);
  await settle(page);
  await expect(page.locator("h1")).toHaveText(sansPosition.nameFr);
  await expect(page.getByRole("button", { name: fr.map.venue.show })).toHaveCount(0);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  expect(reseau.externes).toEqual([]);
  await context.close();
});

test("CA-6 — pro : un clic sur la carte écrit la latitude ET la longitude dans les deux champs, à six décimales au plus", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const reseau = await intercepter(context);
  await loginContext(context, sansPosition.pro);
  const page = await context.newPage();
  await page.goto(`${PRO}/salles/${sansPosition.id}?etape=2`);
  await settle(page);
  const latitude = page.getByLabel(fr.venue.ui.form.lat);
  const longitude = page.getByLabel(fr.venue.ui.form.lng);
  await expect(latitude).toHaveValue("");
  await expect(longitude).toHaveValue("");
  expect(reseau.tuiles).toEqual([]);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);

  await page.getByRole("button", { name: fr.map.pin.show }).click();
  const carte = page.locator(".zw-map-canvas.leaflet-container");
  await expect(carte).toHaveCount(1);
  await expect(epingles(page)).toHaveCount(0);
  await carte.click({ position: { x: 120, y: 90 } });

  // ⛔ Les DEUX champs, ensemble (la règle « latitude et longitude ensemble » ne peut pas être enfreinte par la carte).
  await expect(latitude).toHaveValue(/^-?\d{1,2}\.\d{1,6}$/);
  await expect(longitude).toHaveValue(/^-?\d{1,3}\.\d{1,6}$/);
  await expect(epingles(page)).toHaveCount(1);
  const premiere = { lat: await latitude.inputValue(), lng: await longitude.inputValue() };

  // Un second clic DÉPLACE le point (un seul point, deux valeurs nouvelles).
  await carte.click({ position: { x: 320, y: 240 } });
  await expect(epingles(page)).toHaveCount(1);
  await expect(latitude).not.toHaveValue(premiere.lat);
  await expect(longitude).not.toHaveValue(premiere.lng);
  expect(reseau.externes).toEqual([]);
  await context.close();
});
