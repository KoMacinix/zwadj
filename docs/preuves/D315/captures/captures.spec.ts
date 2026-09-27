/**
 * D315 — rang 24 — CAPTURES D'ÉCRAN, une par écran, en français, et aussi en arabe pour les écrans PUBLICS du client.
 * Pièce versée. Lancée par `captures.config.ts`, qui réutilise la configuration e2e (serveurs, base dédiée, comptes de
 * fixture par `e2e/fixtures/harness.ts`). Elle ne répare rien : ce qui ne s'ouvre pas s'écrit dans `releve.txt`.
 *
 * ── LES DONNÉES, ET D'OÙ ELLES VIENNENT ──────────────────────────────────────────────────────────────────────────
 *  1. Référentiels : `pnpm --filter @zwadj/api run db:seed` (le seed de production, wilayas/communes/équipements/styles).
 *  2. Six salles publiées sans créneau ni photo : `db:seed:demo` (UI-D4), pour que la recherche ne soit pas vide.
 *  3. Trois comptes par le harnais e2e (`createVerifiedAccount`, e-mail vérifié en base — patron du harnais) : un PRO,
 *     un CLIENT, et un compte qui devient ADMIN par `UPDATE users SET role` — ⚠ c'est la SEULE écriture de métier faite
 *     en base par ce script, et elle dit un état du produit : aucun chemin du produit ne crée un ADMIN (décision n° 4,
 *     « endpoints protégés + DBeaver »).
 *  4. Par l'API réelle, comme le ferait chaque rôle : le PRO crée une salle, un créneau « Soirée » et sept plages de
 *     visite ; l'ADMIN la publie par `POST /admin/venues/:id/publish` (la garde « au moins un créneau actif » s'applique) ;
 *     le CLIENT envoie une demande de réservation et prend un rendez-vous de visite.
 *     Les formes de charge utile sont RELEVÉES chez un appelant existant (`apps/api/test/int/bookings.int-spec.ts`,
 *     `visit-bookings.int-spec.ts`), jamais écrites de mémoire. Les montants de la demande ne sont PAS calculés ici :
 *     un premier envoi à 0 reçoit le 409 `BOOKING_PRICE_CHANGED` de D75, qui porte les vrais montants, renvoyés tels quels.
 *
 * ── CE QUE LE SCRIPT MESURE EN PASSANT (sans rien corriger) ──────────────────────────────────────────────────────
 *  · le statut HTTP et l'URL finale de chaque écran ;
 *  · M1 — les liens de la fiche salle, pour un visiteur ANONYME, dont la cible contient « connexion » ;
 *  · M2 — le statut de `/fr/connexion`, cible du bouton « se connecter pour réserver » relevée dans le code ;
 *  · M3 — l'URL où mène le formulaire de recherche de l'accueil ARABE.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, type BrowserContext, type Page } from "../../../../e2e/node_modules/@playwright/test";
import { Client } from "../../../../e2e/node_modules/pg";
import { API, CLIENT, PRO, DATABASE_URL } from "../../../../e2e/playwright.config";
import { createVerifiedAccount, loginContext, settle, type Account } from "../../../../e2e/fixtures/harness";

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

/** Cherche une clé dans un corps d'erreur, quelle que soit l'enveloppe (`{ code, … }` ou `{ message: { code, … } }`). */
function cle(o: any, nom: string): any {
  if (o === null || typeof o !== "object") return undefined;
  if (nom in o) return o[nom];
  for (const v of Object.values(o)) {
    const t = cle(v, nom);
    if (t !== undefined) return t;
  }
  return undefined;
}

const jour = (decalage: number): string => new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);

let nombre = 0;
async function capturer(page: Page, nom: string, url: string, attente?: (p: Page) => Promise<void>): Promise<void> {
  nombre += 1;
  const fichier = `${String(nombre).padStart(2, "0")}-${nom}.jpg`;
  try {
    const rep = await page.goto(url, { waitUntil: "load" });
    await settle(page);
    if (attente) await attente(page);
    const h1 = ((await page.locator("h1").first().textContent({ timeout: 3_000 }).catch(() => null)) ?? "—").trim().replace(/\s+/g, " ");
    await page.screenshot({ path: resolve(IMAGES, fichier), fullPage: true, type: "jpeg", quality: 70 });
    const octets = statSync(resolve(IMAGES, fichier)).size;
    note(`CAPTURE ${fichier} · demandé ${url} · statut ${rep?.status() ?? "—"} · final ${page.url()} · h1 « ${h1.slice(0, 80)} » · ${octets} octets`);
  } catch (e) {
    note(`NE S'OUVRE PAS ${fichier} · demandé ${url} · ${String((e as Error).message).split("\n")[0]}`);
  }
}

test("captures du rang 24", async ({ browser }) => {
  mkdirSync(IMAGES, { recursive: true });
  writeFileSync(RELEVE, `D315 — relevé des captures · ${new Date().toISOString()} · API ${API} · client ${CLIENT} · pro ${PRO}\n`, "utf-8");

  // ── 1-2. semis par les scripts existants ────────────────────────────────────────────────────────────────────
  pnpm("--filter", "@zwadj/api", "run", "db:seed");
  pnpm("--filter", "@zwadj/api", "run", "db:seed:demo");
  const n = await sql<{ n: string }>("SELECT count(*)::text AS n FROM venues WHERE publication_status = 'PUBLISHED'");
  note(`SEMIS · salles publiées après db:seed:demo : ${n[0]?.n}`);

  // ── 3. comptes ──────────────────────────────────────────────────────────────────────────────────────────────
  const pro = await createVerifiedAccount("PRO");
  const client = await createVerifiedAccount("CLIENT");
  const admin = await createVerifiedAccount("CLIENT");
  await sql("UPDATE users SET role = 'ADMIN' WHERE email = $1", [admin.email]);
  const [tPro, tClient, tAdmin] = [await jeton(pro), await jeton(client), await jeton(admin)];
  note("COMPTES · PRO, CLIENT, ADMIN (ce dernier par UPDATE users SET role — aucun chemin du produit ne crée un ADMIN)");

  // ── 4. données par l'API réelle ─────────────────────────────────────────────────────────────────────────────
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

  const dispo = await appel("GET", `/venues/${slug}/availability?from=${jour(20)}&to=${jour(80)}`);
  let choix: { date: string; slotTemplateId: string } | null = null;
  for (const d of (dispo.corps?.days ?? []) as { date: string; slots: { slotTemplateId: string; status: string }[] }[]) {
    const s = d.slots.find((x) => x.status === "AVAILABLE");
    if (s) {
      choix = { date: d.date, slotTemplateId: s.slotTemplateId };
      break;
    }
  }
  note(`API · GET /venues/:slug/availability : ${dispo.statut} · jour choisi ${choix?.date ?? "AUCUN"}`);
  if (choix) {
    const corps = {
      eventDate: choix.date, slotTemplateId: choix.slotTemplateId, guests: 250, paymentMethod: "ONLINE",
      contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001",
      expectedTotalCents: 0, expectedDepositCents: 0
    };
    const r1 = await appel("POST", `/venues/${slug}/bookings`, tClient, corps);
    const total = cle(r1.corps, "totalCents");
    const acompte = cle(r1.corps, "depositCents");
    const r2 = await appel("POST", `/venues/${slug}/bookings`, tClient, { ...corps, expectedTotalCents: total, expectedDepositCents: acompte });
    note(`API · POST /venues/:slug/bookings : ${r1.statut} (${cle(r1.corps, "code") ?? "—"}) puis ${r2.statut} avec les montants rendus par le 409`);
  }
  const vs = await appel("GET", `/venues/${slug}/visit-slots?from=${jour(3)}&to=${jour(20)}`);
  const libre = ((vs.corps?.slots ?? []) as { date: string; startMinutes: number; taken?: boolean }[]).find((s) => !s.taken);
  if (libre) {
    const rv = await appel("POST", `/venues/${slug}/visit-bookings`, tClient, { date: libre.date, startMinutes: libre.startMinutes });
    note(`API · POST /venues/:slug/visit-bookings : ${rv.statut}`);
  } else {
    note(`API · GET /venues/:slug/visit-slots : ${vs.statut} · aucun créneau libre — pas de rendez-vous`);
  }

  // ── 5. captures — client, écrans PUBLICS, français puis arabe ───────────────────────────────────────────────
  const anonyme = await browser.newContext();
  const pa = await anonyme.newPage();
  const publics: [string, string][] = [
    ["accueil", ""], ["recherche", "/salles"], ["assistant", "/assistant"], ["salle", `/salles/${slug}`],
    ["connexion", "/auth/connexion"], ["inscription", "/auth/inscription"], ["mot-de-passe-oublie", "/auth/mot-de-passe-oublie"],
    ["reinitialisation-sans-jeton", "/auth/reinitialisation"], ["verification-email-sans-jeton", "/auth/verification-email"],
    ["cgu", "/cgu"], ["confidentialite", "/confidentialite"], ["page-inconnue", "/page-qui-n-existe-pas"]
  ];
  for (const locale of ["fr", "ar"]) {
    for (const [nom, chemin] of publics) await capturer(pa, `client-${locale}-${nom}`, `${CLIENT}/${locale}${chemin}`);
  }

  // M1 — liens « connexion » de la fiche salle, visiteur anonyme.
  await pa.goto(`${CLIENT}/fr/salles/${slug}`, { waitUntil: "load" });
  await settle(pa);
  const liens = await pa.evaluate(() =>
    Array.from(document.querySelectorAll("main a")).map((a) => ({ href: a.getAttribute("href") ?? "", texte: (a.textContent ?? "").trim() })).filter((l) => l.href.includes("connexion"))
  );
  note(`M1 · fiche salle, anonyme : liens vers « connexion » : ${JSON.stringify(liens)}`);
  // M2 — la cible relevée dans le code.
  await capturer(pa, "client-fr-connexion-cible-du-bouton-reserver", `${CLIENT}/fr/connexion`);
  // M3 — le formulaire de recherche de l'accueil ARABE.
  try {
    await pa.goto(`${CLIENT}/ar`, { waitUntil: "load" });
    await settle(pa);
    await Promise.all([pa.waitForURL((u) => u.pathname.includes("salles"), { timeout: 60_000 }), pa.locator("form.hm-search").evaluate((f: HTMLFormElement) => f.requestSubmit())]);
    note(`M3 · accueil arabe, formulaire de recherche envoyé sans saisie : URL finale ${pa.url()}`);
  } catch (e) {
    note(`M3 · accueil arabe : ${String((e as Error).message).split("\n")[0]}`);
  }
  await anonyme.close();

  // ── 6. client connecté (français) ───────────────────────────────────────────────────────────────────────────
  const cc = await browser.newContext();
  await loginContext(cc, client);
  const pc = await cc.newPage();
  await capturer(pc, "client-fr-salle-connecte", `${CLIENT}/fr/salles/${slug}`);
  await capturer(pc, "client-fr-compte", `${CLIENT}/fr/compte`);
  await cc.close();

  // ── 7. pro (français) ───────────────────────────────────────────────────────────────────────────────────────
  const pn = await browser.newContext();
  const pp0 = await pn.newPage();
  for (const [nom, chemin] of [["connexion", "/auth/connexion"], ["inscription", "/auth/inscription"], ["mot-de-passe-oublie", "/auth/mot-de-passe-oublie"],
    ["reinitialisation-sans-jeton", "/auth/reinitialisation"], ["verification-email-sans-jeton", "/auth/verification-email"]] as const) {
    await capturer(pp0, `pro-${nom}`, `${PRO}${chemin}`);
  }
  await pn.close();
  const pc2: BrowserContext = await browser.newContext();
  await loginContext(pc2, pro);
  const pp = await pc2.newPage();
  for (const [nom, chemin] of [["tableau-de-bord", "/"], ["salles", "/salles"], ["nouvelle-salle", "/salles/nouvelle"]] as const) {
    await capturer(pp, `pro-${nom}`, `${PRO}${chemin}`);
  }
  for (let e = 1; e <= 7; e++) await capturer(pp, `pro-salle-etape-${e}`, `${PRO}/salles/${id}?etape=${e}`);
  for (const [nom, chemin] of [["demandes", "/demandes"], ["calendrier", "/calendrier"], ["reservations", "/reservations"], ["compte", "/compte"]] as const) {
    await capturer(pp, `pro-${nom}`, `${PRO}${chemin}`);
  }
  await pc2.close();

  note(`FIN · ${nombre} capture(s) tentée(s)`);
});
