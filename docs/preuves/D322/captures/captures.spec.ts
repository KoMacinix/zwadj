/**
 * D322 — rang 30 — CAPTURES DE LA FICHE SALLE, FR ET AR, y compris à 360 px (consigne de Ko au rang 30). Copie du script de
 * D321 (`docs/preuves/D321/captures/captures.spec.ts`), mêmes captures, mêmes mesures M5/M6, et DEUX MESURES AJOUTÉES —
 * M7 : les noms du mois et des jours du calendrier du panneau, confrontés à `Intl` dans la langue que la page DÉCLARE
 * (`<html lang>`), et l'écriture (aucune lettre latine en arabe, aucune arabe en français) ; M8 : les colonnes mises en
 * avant (`is-weekend`) et le nom de leurs jours. Prémisse mesurée : le point 1 du rang 30.
 * (Texte d'origine de D321 :) Consigne de Ko : « Refais les captures de D315 de la fiche salle,
 * en français et en arabe ». Même numéro et même nom que dans `docs/preuves/D315/captures/images/` pour une comparaison
 * une à une : 04 (FR, anonyme), 16 (AR, anonyme), 26 (FR, client connecté — ici APRÈS avoir choisi un jour puis un créneau,
 * pour montrer le calendrier en usage). Ajouts : 04m et 16m, la même fiche à 360 px de large (« mobile d'abord ») ; et le
 * panneau seul, FR et AR.
 * Patron : `docs/preuves/D316/captures/captures.spec.ts` (données créées par les mêmes appels, formes relevées).
 * Mesures en passant (sans rien corriger) : M5 — hauteur de la fiche et nombre de boutons du panneau (D317 : ~14 500 px,
 * 182 boutons) ; M6 — débordement horizontal à 360 px (`scrollWidth` > largeur de la fenêtre).
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, type Page } from "../../../../e2e/node_modules/@playwright/test";
import { Client } from "../../../../e2e/node_modules/pg";
import { API, CLIENT, DATABASE_URL } from "../../../../e2e/playwright.config";
import { createVerifiedAccount, loginContext, settle, type Account } from "../../../../e2e/fixtures/harness";
import { choisirUneDate } from "../../../../e2e/fixtures/panneau-reservation";
import ar from "../../../../packages/i18n/messages/ar.json";
import fr from "../../../../packages/i18n/messages/fr.json";

const ICI = __dirname;
const IMAGES = resolve(ICI, "images");
const RELEVE = resolve(ICI, "releve.txt");

function note(ligne: string): void {
  appendFileSync(RELEVE, ligne + "\n", "utf-8");
  console.log(ligne);
}

function pnpm(...args: string[]): string {
  return execFileSync("pnpm", args, {
    env: { ...process.env, DATABASE_URL },
    shell: process.platform === "win32",
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function sql<T = Record<string, unknown>>(texte: string, params: unknown[] = []): Promise<T[]> {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(texte, params)).rows as T[];
  } finally {
    await db.end();
  }
}

async function appel(methode: string, chemin: string, jeton?: string, corps?: unknown): Promise<{ statut: number; corps: any }> {
  const res = await fetch(`${API}/api/v1${chemin}`, {
    method: methode,
    headers: { "content-type": "application/json", ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal: AbortSignal.timeout(60_000)
  });
  const texte = await res.text();
  let json: unknown = texte;
  try {
    json = JSON.parse(texte);
  } catch {
    /* corps non JSON : gardé en texte */
  }
  return { statut: res.status, corps: json };
}

async function jeton(compte: Account): Promise<string> {
  const r = await appel("POST", "/auth/login", undefined, { email: compte.email, password: compte.password });
  if (r.statut !== 200) throw new Error(`login ${compte.role} : ${r.statut}`);
  return r.corps.accessToken as string;
}

/** M5 et M6 : hauteur, largeur et nombre de boutons du panneau — mesurés dans la page, pas estimés. */
async function mesurer(page: Page, quoi: string, titrePanneau: string): Promise<void> {
  const m = await page.evaluate((titre) => {
    const region = Array.from(document.querySelectorAll("section")).find((s) => s.querySelector("h2")?.textContent === titre);
    return {
      hauteur: document.documentElement.scrollHeight,
      largeur: document.documentElement.scrollWidth,
      fenetre: window.innerWidth,
      boutons: region ? region.querySelectorAll("button").length : -1
    };
  }, titrePanneau);
  note(`M5/M6 · ${quoi} : hauteur ${m.hauteur} px · largeur ${m.largeur} px pour une fenêtre de ${m.fenetre} px · `
    + `débordement ${m.largeur > m.fenetre ? "OUI" : "non"} · boutons du panneau ${m.boutons}`);
}

/** M7 et M8 (D322) : les noms du calendrier du panneau dans la langue que la page DÉCLARE, confrontés à `Intl` APPELÉ ICI
 *  (jamais aux fonctions de l'application), et les colonnes mises en avant. Mesuré dans le navigateur, sans rien changer. */
async function noms(page: Page, quoi: string, titrePanneau: string): Promise<void> {
  const m = await page.evaluate((titre) => {
    const region = Array.from(document.querySelectorAll("section")).find((s) => s.querySelector("h2")?.textContent === titre);
    const grille = region?.querySelector("[role=grid]");
    const lang = document.documentElement.lang;
    if (!grille) return { lang, trouve: false } as const;
    const mois = document.getElementById(grille.getAttribute("aria-labelledby") ?? "")?.textContent ?? "";
    const ths = Array.from(grille.querySelectorAll("th"));
    const courts = ths.map((th) => th.querySelector("[aria-hidden='true']")?.textContent ?? "");
    const longs = ths.map((th) => th.querySelector(".sr-only")?.textContent ?? "");
    // 2026-11-01 est un dimanche : la colonne c de la grille algérienne (D56) est le jour 1 + c.
    const attenduCourts = Array.from({ length: 7 }, (_, c) => new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" }).format(Date.UTC(2026, 10, 1 + c)));
    const attenduLongs = Array.from({ length: 7 }, (_, c) => new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2026, 10, 1 + c)));
    const fenetre = Array.from({ length: 8 }, (_, k) => new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + k, 1)));
    const colonnes = new Set<number>();
    for (const tr of Array.from(grille.querySelectorAll("tbody tr"))) {
      Array.from(tr.children).forEach((td, c) => {
        if (td.classList.contains("is-weekend")) colonnes.add(c);
      });
    }
    const textes = [mois, ...courts, ...longs];
    return {
      lang,
      trouve: true,
      mois,
      moisOk: fenetre.includes(mois),
      courtsOk: JSON.stringify(courts) === JSON.stringify(attenduCourts),
      longsOk: JSON.stringify(longs) === JSON.stringify(attenduLongs),
      latins: textes.filter((x) => /[A-Za-zÀ-ÿ]/.test(x)).length,
      arabes: textes.filter((x) => /[؀-ۿ]/.test(x)).length,
      total: textes.length,
      colonnes: [...colonnes].sort(),
      nomsColonnes: [...colonnes].sort().map((c) => longs[c])
    } as const;
  }, titrePanneau);
  if (!m.trouve) {
    note(`M7/M8 · ${quoi} : lang=${m.lang} · AUCUNE grille dans le panneau`);
    return;
  }
  note(`M7 · ${quoi} : lang=${m.lang} · mois « ${m.mois} » = Intl(${m.lang}) : ${m.moisOk ? "oui" : "NON"} · en-têtes courts = Intl : `
    + `${m.courtsOk ? "oui" : "NON"} · en-têtes longs = Intl : ${m.longsOk ? "oui" : "NON"} · textes ${m.total} : latins ${m.latins}, arabes ${m.arabes}`);
  note(`M8 · ${quoi} : colonnes mises en avant ${JSON.stringify(m.colonnes)} (0 = dimanche, D56) · leurs jours ${JSON.stringify(m.nomsColonnes)}`);
}

/** Compte des captures TENTÉES — compté, jamais écrit de tête (défaut de la première passe : « 9 » écrit pour 8 appels). */
let tentees = 0;

async function capturer(page: Page, fichier: string, url: string | null, panneau: string | null = null): Promise<void> {
  tentees += 1;
  try {
    const rep = url === null ? null : await page.goto(url, { waitUntil: "load" });
    await settle(page);
    const h1 = ((await page.locator("h1").first().textContent({ timeout: 3_000 }).catch(() => null)) ?? "—").trim().replace(/\s+/g, " ");
    if (panneau === null) await page.screenshot({ path: resolve(IMAGES, fichier), fullPage: true, type: "jpeg", quality: 70 });
    else await page.getByRole("region", { name: panneau }).screenshot({ path: resolve(IMAGES, fichier), type: "jpeg", quality: 80 });
    const octets = statSync(resolve(IMAGES, fichier)).size;
    note(`CAPTURE ${fichier} · demandé ${url ?? "(sur place)"} · statut ${rep?.status() ?? "—"} · final ${page.url()} · h1 « ${h1.slice(0, 80)} » · ${octets} octets`);
  } catch (e) {
    note(`NE S'OUVRE PAS ${fichier} · demandé ${url ?? "(sur place)"} · ${String((e as Error).message).split("\n")[0]}`);
  }
}

test("captures de la fiche salle du rang 30", async ({ browser }) => {
  mkdirSync(IMAGES, { recursive: true });
  writeFileSync(RELEVE, `D322 — relevé des captures de la fiche salle · ${new Date().toISOString()} · API ${API} · client ${CLIENT}\n`, "utf-8");

  pnpm("--filter", "@zwadj/api", "run", "db:seed");
  pnpm("--filter", "@zwadj/api", "run", "db:seed:demo");
  const n = await sql<{ n: string }>("SELECT count(*)::text AS n FROM venues WHERE publication_status = 'PUBLISHED'");
  note(`SEMIS · salles publiées après db:seed:demo : ${n[0]?.n}`);

  const pro = await createVerifiedAccount("PRO");
  const client = await createVerifiedAccount("CLIENT");
  const admin = await createVerifiedAccount("CLIENT");
  await sql("UPDATE users SET role = 'ADMIN' WHERE email = $1", [admin.email]);
  const [tPro, tAdmin] = [await jeton(pro), await jeton(admin)];
  note("COMPTES · PRO, CLIENT, ADMIN (ce dernier par UPDATE users SET role — aucun chemin du produit ne crée un ADMIN)");

  const ville = await sql<{ id: string }>("SELECT id FROM cities ORDER BY name_fr LIMIT 1");
  const salle = await appel("POST", "/venues", tPro, {
    cityId: ville[0]!.id, nameFr: "Salle des captures", nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT"
  });
  note(`API · POST /venues : ${salle.statut}`);
  const id = salle.corps.id as string;
  const slug = salle.corps.slug as string;
  const creneau = await appel("POST", `/venues/${id}/slot-templates`, tPro, {
    nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 18_000_000
  });
  note(`API · POST /venues/:id/slot-templates : ${creneau.statut}`);
  const plages: number[] = [];
  for (let d = 0; d < 7; d++) plages.push((await appel("POST", `/venues/${id}/visit-availabilities`, tPro, { dayOfWeek: d, startMinutes: 600, endMinutes: 720 })).statut);
  note(`API · POST /venues/:id/visit-availabilities ×7 : ${plages.join(", ")}`);
  const pub = await appel("POST", `/admin/venues/${id}/publish`, tAdmin);
  note(`API · POST /admin/venues/:id/publish (ADMIN) : ${pub.statut}`);

  // ── Client ANONYME, bureau : la fiche FR et AR, et le panneau seul.
  const anonyme = await browser.newContext();
  const pa = await anonyme.newPage();
  await capturer(pa, "04-client-fr-salle.jpg", `${CLIENT}/fr/salles/${slug}`);
  await mesurer(pa, "fiche FR, anonyme, 1280 px", fr.venueDetail.booking.title);
  await noms(pa, "fiche FR, anonyme, 1280 px", fr.venueDetail.booking.title);
  await capturer(pa, "panneau-fr.jpg", null, fr.venueDetail.booking.title);
  await capturer(pa, "16-client-ar-salle.jpg", `${CLIENT}/ar/salles/${slug}`);
  await mesurer(pa, "fiche AR, anonyme, 1280 px", ar.venueDetail.booking.title);
  await noms(pa, "fiche AR, anonyme, 1280 px", ar.venueDetail.booking.title);
  await capturer(pa, "panneau-ar.jpg", null, ar.venueDetail.booking.title);
  await anonyme.close();

  // ── Client ANONYME, MOBILE (360 px) : la fiche FR et AR.
  const mobile = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const pm = await mobile.newPage();
  await capturer(pm, "04m-client-fr-salle-360.jpg", `${CLIENT}/fr/salles/${slug}`);
  await mesurer(pm, "fiche FR, anonyme, 360 px", fr.venueDetail.booking.title);
  await capturer(pm, "16m-client-ar-salle-360.jpg", `${CLIENT}/ar/salles/${slug}`);
  await mesurer(pm, "fiche AR, anonyme, 360 px", ar.venueDetail.booking.title);
  await noms(pm, "fiche AR, anonyme, 360 px", ar.venueDetail.booking.title);
  await mobile.close();

  // ── Client CONNECTÉ : la fiche, APRÈS avoir choisi un jour puis un créneau (le calendrier en usage).
  const cc = await browser.newContext();
  await loginContext(cc, client);
  const pc = await cc.newPage();
  await pc.goto(`${CLIENT}/fr/salles/${slug}`, { waitUntil: "load" });
  await settle(pc);
  await choisirUneDate(pc.getByRole("region", { name: fr.venueDetail.booking.title }));
  await capturer(pc, "26-client-fr-salle-connecte.jpg", null);
  await mesurer(pc, "fiche FR, connecté, un jour et un créneau choisis", fr.venueDetail.booking.title);
  await capturer(pc, "panneau-fr-connecte.jpg", null, fr.venueDetail.booking.title);
  await cc.close();

  note(`FIN · ${tentees} capture(s) tentée(s)`);
});
