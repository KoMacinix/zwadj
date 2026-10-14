import { expect, test, type Browser } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { API, PRO } from "../../../../e2e/playwright.config";
import { accessTokenOf, apiCall, createPublishedVenue, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D332 — RANG 38, CAPTURES ET PDF RÉELS (lot de CODE ; cette sonde ne touche pas au code du dépôt, elle le JOUE).
 *
 * Deux choses, dans la pile e2e (ports dédiés, base JETABLE `zwadj_e2e`, mêmes serveurs de développement) :
 *  (1) la BOÎTE DE LANGUE telle qu'un pro la voit, en français et en arabe, à 1 280 et à 360 px, et le titre de la page « Ma salle » (une seule salle : « Ma salle », le mot du menu) ;
 *  (2) TROIS DEVIS RÉELS — créés par l'API comme le fait l'écran du pro (la salle, ses prestations de chaque type de tarification, puis le devis), jamais fabriqués — puis leur PDF téléchargé
 *      DEPUIS LE SERVEUR dans les deux langues : sans prestation ; à prestations fixes seulement ; à quantités et à palier (par invité, à l'unité, à paliers, fixe). Ils sont ensuite rastérisés
 *      par un lecteur indépendant (`docs/preuves/D326/arabe/rasteriser.mjs`, pdf.js) et REGARDÉS par Ko : la condition de clôture du rang 38.
 * Elle ne JUGE rien : elle écrit des fichiers et des lignes `MESURE …`. Les verdicts sont ceux des tests. Les noms de salle, de client et de prestation sont FICTIFS.
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D332/navigateur/playwright.capture.config.ts
 */
const ici = __dirname;
const SORTIE = resolve(ici, "sortie");
type Langue = "fr" | "ar";
const CATALOGUE = { fr: fr.venue.ui, ar: ar.venue.ui } as const;
const LARGEURS = [1280, 360] as const;
const CLIENT = { prenom: "Amina", nom: "Bensalem", chiffres: "550000001", invites: "150" };

test.beforeAll(() => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();
});

async function ouvrir(browser: Browser, salle: Awaited<ReturnType<typeof createPublishedVenue>>, langue: Langue, largeur: number) {
  const contexte = await browser.newContext({ viewport: { width: largeur, height: largeur === 360 ? 780 : 900 }, acceptDownloads: true });
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
  await expect(page.getByRole("heading", { level: 1, name: CATALOGUE[langue].walkin.title })).toBeVisible();
  return { contexte, page };
}

test("(1) la boîte de langue et le titre « Ma salle », en français et en arabe, à 1 280 et à 360 px", async ({ browser }) => {
  const salle = await createPublishedVenue();
  for (const langue of ["fr", "ar"] as const) {
    const W = CATALOGUE[langue].walkin;
    for (const largeur of LARGEURS) {
      const { contexte, page } = await ouvrir(browser, salle, langue, largeur);
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
      await page.getByRole("button", { name: CATALOGUE[langue].quotes.sv_PRINT, exact: true }).click();
      const boite = page.getByRole("dialog", { name: W.langDialogTitle });
      await expect(boite).toBeVisible();
      await page.screenshot({ path: resolve(SORTIE, `dialogue-${langue}-${largeur}.png`) });
      const boutons = await boite.getByRole("button").evaluateAll((els) =>
        els.map((e) => ({ texte: e.textContent, lang: e.getAttribute("lang"), dir: e.getAttribute("dir"), largeur: Math.round(e.getBoundingClientRect().width), hauteur: Math.round(e.getBoundingClientRect().height) }))
      );
      const panneau = await boite.evaluate((e) => ({ largeur: Math.round(e.getBoundingClientRect().width), debordeHorizontalement: e.scrollWidth > e.clientWidth }));
      console.log(`MESURE dialogue ${langue} ${largeur}px : panneau ${JSON.stringify(panneau)} · boutons ${JSON.stringify(boutons)}`);
      await boite.getByRole("button", { name: W.langDialogCancel, exact: true }).click();
      await contexte.close();
    }
  }
  for (const langue of ["fr", "ar"] as const) {
    const { contexte, page } = await ouvrir(browser, salle, langue, 1280);
    await page.goto(`${PRO}/salles`);
    const titre = page.getByRole("heading", { level: 1 });
    await expect(titre).toBeVisible();
    await page.screenshot({ path: resolve(SORTIE, `salles-${langue}-1280.png`) });
    const lien = page.getByRole("link", { name: CATALOGUE[langue].nav.myVenue, exact: true });
    console.log(`MESURE salles ${langue} : titre « ${await titre.textContent()} » · lien du menu « ${await lien.textContent()} » (attendu : le même mot, une salle)`);
    await contexte.close();
  }
});

test("(2) trois devis réels, leur PDF dans les deux langues", async () => {
  const salle = await createPublishedVenue();
  const jeton = await accessTokenOf(salle.pro);
  const fiche = await apiCall("GET", `/pro/venues/${salle.id}`, jeton);
  expect(fiche.status, "la fiche pro de la salle").toBe(200);
  const creneau = (fiche.json as { slotTemplates: { id: string }[] }).slotTemplates[0]?.id;
  expect(creneau, "la salle a un créneau").toBeTruthy();

  const service = async (corps: Record<string, unknown>) => {
    const r = await apiCall("POST", `/venues/${salle.id}/services`, jeton, corps);
    expect(r.status, `service ${String(corps.nameFr)} : ${r.text}`).toBe(201);
    return r.json as { id: string; tiers?: { id: string; labelFr: string }[] };
  };
  const decoration = await service({ pricingType: "FIXED", nameFr: "Décoration florale", nameAr: "ديكور الزهور", fixedPriceCents: 8_000_000 });
  const lumieres = await service({ pricingType: "FIXED", nameFr: "Jeux de lumières", nameAr: "ألعاب الإضاءة", fixedPriceCents: 3_500_000 });
  const buffet = await service({ pricingType: "PER_GUEST", nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح", perGuestPriceCents: 250_000 });
  const chaises = await service({ pricingType: "PER_UNIT", nameFr: "Chaises supplémentaires", nameAr: "كراسي إضافية", perUnitPriceCents: 40_000, unitNameFr: "chaise", unitNameAr: "كرسي", minUnits: 1, maxUnits: 200 });
  const musique = await service({
    pricingType: "TIERED",
    nameFr: "Animation musicale",
    nameAr: "الفرقة الموسيقية",
    tiers: [
      { labelFr: "Orchestre andalou", labelAr: "أوركسترا أندلسية", priceCents: 12_000_000 },
      { labelFr: "DJ et sonorisation", labelAr: "دي جي ونظام الصوت", priceCents: 6_000_000 }
    ]
  });
  const palier = musique.tiers?.find((t) => t.labelFr === "Orchestre andalou");
  expect(palier, "le palier choisi").toBeTruthy();

  const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const devis = [
    { nom: "sans-prestation", dateEvenement: dans(60), services: [] as Record<string, unknown>[] },
    { nom: "prestations-fixes", dateEvenement: dans(75), services: [{ serviceId: decoration.id }, { serviceId: lumieres.id }] },
    {
      nom: "quantites-palier",
      dateEvenement: dans(90),
      services: [{ serviceId: buffet.id }, { serviceId: chaises.id, quantity: 40 }, { serviceId: musique.id, tierId: palier!.id }, { serviceId: decoration.id }]
    }
  ];
  const sources: Record<string, unknown> = {};
  for (const d of devis) {
    const r = await apiCall("POST", `/venues/${salle.id}/quotes`, jeton, { eventDate: d.dateEvenement, slotTemplateId: creneau, guests: 150, services: d.services });
    expect(r.status, `devis ${d.nom} : ${r.text}`).toBe(201);
    const id = (r.json as { id: string }).id;
    const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, jeton);
    const lu = (liste.json as { id: string; lines: unknown; basePriceCents: number; servicesTotalCents: number; totalCents: number; depositCents: number }[]).find((q) => q.id === id);
    sources[d.nom] = { id, basePriceCents: lu?.basePriceCents, servicesTotalCents: lu?.servicesTotalCents, totalCents: lu?.totalCents, depositCents: lu?.depositCents, lines: lu?.lines };
    for (const langue of ["fr", "ar"] as const) {
      const res = await fetch(`${API}/api/v1/quotes/${id}/document?locale=${langue}`, { headers: { authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(90_000) });
      expect(res.status, `PDF ${d.nom} ${langue}`).toBe(200);
      const octets = Buffer.from(await res.arrayBuffer());
      expect(octets.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      writeFileSync(resolve(SORTIE, `devis-${d.nom}-${langue}.pdf`), octets);
      console.log(`MESURE pdf ${d.nom} ${langue} : ${octets.length} octets · Content-Language « ${res.headers.get("content-language")} »`);
    }
  }
  writeFileSync(resolve(SORTIE, "devis-sources.json"), JSON.stringify(sources, null, 2) + "\n", "utf8");
});
