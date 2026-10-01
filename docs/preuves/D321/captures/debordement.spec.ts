/**
 * D321 — rang 29 — SONDE DU DÉBORDEMENT À 360 PX (mode de défaillance C-g). Pièce versée.
 * La mesure M6 des captures a rendu « largeur 364 px pour une fenêtre de 360 px » sur la fiche FR (l'arabe : 360). Avant de
 * conclure, on NOMME ce qui déborde : chaque élément dont le bord droit (ou gauche, en arabe) sort de la fenêtre, avec sa
 * balise, ses classes, son texte et s'il est DANS le panneau de demande. Une salle du semis de démonstration suffit.
 * Lancement, depuis `e2e/` :  pnpm exec playwright test -c ../docs/preuves/D321/captures/debordement.config.ts
 * Écrit `debordement.txt` à côté ; la sortie console ne se verse pas (journaux du serveur de développement).
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "../../../../e2e/node_modules/@playwright/test";
import { Client } from "../../../../e2e/node_modules/pg";
import { CLIENT, DATABASE_URL } from "../../../../e2e/playwright.config";
import { settle } from "../../../../e2e/fixtures/harness";
import ar from "../../../../packages/i18n/messages/ar.json";
import fr from "../../../../packages/i18n/messages/fr.json";

const SORTIE = resolve(__dirname, "debordement.txt");

test("qui déborde à 360 px ?", async ({ browser }) => {
  execFileSync("pnpm", ["--filter", "@zwadj/api", "run", "db:seed"], { env: { ...process.env, DATABASE_URL }, shell: process.platform === "win32", stdio: "ignore" });
  execFileSync("pnpm", ["--filter", "@zwadj/api", "run", "db:seed:demo"], { env: { ...process.env, DATABASE_URL }, shell: process.platform === "win32", stdio: "ignore" });
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  const { rows } = await db.query<{ slug: string }>("SELECT slug FROM venues WHERE publication_status = 'PUBLISHED' ORDER BY slug LIMIT 1");
  await db.end();
  const slug = rows[0]!.slug;
  const lignes: string[] = [`D321 — sonde du débordement à 360 px · ${new Date().toISOString()} · salle ${slug}`];
  const contexte = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await contexte.newPage();
  for (const [locale, titre] of [["fr", fr.venueDetail.booking.title], ["ar", ar.venueDetail.booking.title]] as const) {
    await page.goto(`${CLIENT}/${locale}/salles/${slug}`, { waitUntil: "load" });
    await settle(page);
    const r = await page.evaluate((titrePanneau) => {
      const w = window.innerWidth;
      const panneau = Array.from(document.querySelectorAll("section")).find((s) => s.querySelector("h2")?.textContent === titrePanneau) ?? null;
      const tous = Array.from(document.querySelectorAll("body *"));
      const sortent = tous
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.right > w + 0.5 || r.left < -0.5))
        .map(({ el, r }) => ({
          balise: el.tagName.toLowerCase(),
          classes: (el.getAttribute("class") ?? "").slice(0, 60),
          texte: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50),
          gauche: Math.round(r.left),
          droite: Math.round(r.right),
          dansPanneau: panneau !== null && panneau.contains(el)
        }));
      return { w, scroll: document.documentElement.scrollWidth, parcourus: tous.length, sortent };
    }, titre);
    lignes.push(`== ${locale} : fenêtre ${r.w} px · scrollWidth ${r.scroll} px · ${r.parcourus} éléments parcourus · ${r.sortent.length} qui sortent`);
    for (const s of r.sortent) lignes.push(`   ${s.dansPanneau ? "[PANNEAU]" : "[hors panneau]"} <${s.balise} class="${s.classes}"> ${s.gauche}→${s.droite} « ${s.texte} »`);
    // Ajout (même passe) : l'ORIENTATION des chevrons du calendrier du panneau — position, nom, transformation calculée.
    const chevrons = await page.evaluate((titrePanneau) => {
      const panneau = Array.from(document.querySelectorAll("section")).find((s) => s.querySelector("h2")?.textContent === titrePanneau);
      return Array.from(panneau?.querySelectorAll(".cal-head button") ?? []).map((b) => ({
        nom: b.getAttribute("aria-label") ?? "",
        gauche: Math.round(b.getBoundingClientRect().left),
        transformation: getComputedStyle(b.querySelector("svg")!).transform
      }));
    }, titre);
    for (const c of chevrons) lignes.push(`   chevron « ${c.nom} » à x=${c.gauche} · transform ${c.transformation}`);
  }
  await contexte.close();
  writeFileSync(SORTIE, lignes.join("\n") + "\n", "utf-8");
  console.log(lignes.join("\n"));
});
