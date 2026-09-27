/**
 * D316 — rang 25 — CAPTURES D'APRÈS CORRECTIF des écrans que les trois défauts de D315 touchaient, versées À CÔTÉ
 * des anciennes : même numéro et même nom de fichier que dans `docs/preuves/D315/captures/images/`, pour une
 * comparaison une à une. Patron : `docs/preuves/D315/captures/captures.spec.ts` (données créées de la même façon,
 * par les mêmes appels, formes RELEVÉES chez `apps/api/test/int/bookings.int-spec.ts`).
 *
 * Écrans : 04 et 16 (fiche salle, anonyme, FR et AR — le panneau de demande) ; 25 (la cible du lien « se connecter
 * pour demander », atteinte cette fois par un CLIC, FR) et 25-ar (la même, AR — neuve) ; 26 (fiche salle, client
 * connecté — les dates) ; 27 (compte client — la suppression) ; 46 (compte pro — la suppression).
 * ⚠ D315 capturait 25 en visitant `/fr/connexion`, la cible LUE dans le code. Ici la cible est celle où mène le lien
 * réel : c'est ce que le défaut 2 mettait en cause.
 * Mesures en passant (sans rien corriger) : M1 — les liens « connexion » de la fiche, visiteur anonyme ; M2 — l'URL
 * et le statut atteints par le clic ; M4 — les requêtes `/availability` du panneau et leur statut.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, type Page } from "../../../../e2e/node_modules/@playwright/test";
import { Client } from "../../../../e2e/node_modules/pg";
import { API, CLIENT, PRO, DATABASE_URL } from "../../../../e2e/playwright.config";
import { createVerifiedAccount, loginContext, settle, type Account } from "../../../../e2e/fixtures/harness";
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

async function capturer(page: Page, fichier: string, url: string | null): Promise<void> {
  try {
    const rep = url === null ? null : await page.goto(url, { waitUntil: "load" });
    await settle(page);
    const h1 = ((await page.locator("h1").first().textContent({ timeout: 3_000 }).catch(() => null)) ?? "—").trim().replace(/\s+/g, " ");
    await page.screenshot({ path: resolve(IMAGES, fichier), fullPage: true, type: "jpeg", quality: 70 });
    const octets = statSync(resolve(IMAGES, fichier)).size;
    note(`CAPTURE ${fichier} · demandé ${url ?? "(clic)"} · statut ${rep?.status() ?? "—"} · final ${page.url()} · h1 « ${h1.slice(0, 80)} » · ${octets} octets`);
  } catch (e) {
    note(`NE S'OUVRE PAS ${fichier} · demandé ${url ?? "(clic)"} · ${String((e as Error).message).split("\n")[0]}`);
  }
}

test("captures d'après correctif du rang 25", async ({ browser }) => {
  mkdirSync(IMAGES, { recursive: true });
  writeFileSync(RELEVE, `D316 — relevé des captures d'après correctif · ${new Date().toISOString()} · API ${API} · client ${CLIENT} · pro ${PRO}\n`, "utf-8");

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

  // ── Client ANONYME : la fiche (FR, AR), puis le lien du panneau, SUIVI par un clic (FR, AR).
  const anonyme = await browser.newContext();
  const pa = await anonyme.newPage();
  const dispo: string[] = [];
  pa.on("response", (r) => {
    if (r.url().includes("/availability?")) dispo.push(`${r.status()} ${new URL(r.url()).search}`);
  });
  await capturer(pa, "04-client-fr-salle.jpg", `${CLIENT}/fr/salles/${slug}`);
  note(`M4 · fiche FR, anonyme : réponses /availability : ${JSON.stringify(dispo)}`);
  const liens = await pa.evaluate(() =>
    Array.from(document.querySelectorAll("main a")).map((a) => ({ href: a.getAttribute("href") ?? "", texte: (a.textContent ?? "").trim() })).filter((l) => l.href.includes("connexion"))
  );
  note(`M1 · fiche salle, anonyme : liens vers « connexion » : ${JSON.stringify(liens)}`);
  await capturer(pa, "16-client-ar-salle.jpg", `${CLIENT}/ar/salles/${slug}`);
  // Libellés LUS dans les messages, jamais recopiés.
  for (const [locale, fichier, libelle] of [
    ["fr", "25-client-fr-connexion-cible-du-bouton-reserver.jpg", fr.venueDetail.booking.loginToBook],
    ["ar", "25-client-ar-connexion-cible-du-bouton-reserver.jpg", ar.venueDetail.booking.loginToBook]
  ] as const) {
    await pa.goto(`${CLIENT}/${locale}/salles/${slug}`, { waitUntil: "load" });
    await settle(pa);
    await pa.getByRole("link", { name: libelle }).click();
    await pa.waitForURL((u) => !u.pathname.includes("/salles/"), { timeout: 30_000 });
    const froid = await pa.reload({ waitUntil: "load" });
    note(`M2 · ${locale} · clic sur « ${libelle} » : URL ${pa.url()} · statut à froid ${froid?.status() ?? "—"}`);
    await capturer(pa, fichier, null);
  }
  await anonyme.close();

  // ── Client CONNECTÉ : la fiche (le panneau propose des dates), puis le compte (la suppression).
  const cc = await browser.newContext();
  await loginContext(cc, client);
  const pc = await cc.newPage();
  await capturer(pc, "26-client-fr-salle-connecte.jpg", `${CLIENT}/fr/salles/${slug}`);
  await capturer(pc, "27-client-fr-compte.jpg", `${CLIENT}/fr/compte`);
  await cc.close();

  // ── Pro connecté : le compte (la suppression).
  const pcx = await browser.newContext();
  await loginContext(pcx, pro);
  const pp = await pcx.newPage();
  await capturer(pp, "46-pro-compte.jpg", `${PRO}/compte`);
  await pcx.close();

  note("FIN · 7 capture(s) tentée(s)");
});
