import { expect, test, type Page } from "@playwright/test";
import ar from "../../packages/i18n/messages/ar.json";
import fr from "../../packages/i18n/messages/fr.json";
import { CLIENT } from "../playwright.config";
import { seedReferentials } from "../fixtures/harness";

/**
 * D346 (rang 48) — R-1 : LES CHOIX DÉJÀ FAITS REPARAISSENT-ILS, ENDROIT PAR ENDROIT, DANS UN VRAI NAVIGATEUR ?
 *
 * Chaque mesure compare ce que l'ÉCRAN montre à ce que l'ADRESSE porte (l'adresse est la seule autorité, D229) : jamais une valeur
 * écrite à la main. `expect.soft` : toutes les mesures sont prises en un seul passage, un rouge ne cache pas les suivants.
 */
test.beforeAll(() => {
  seedReferentials();
});

interface Etat {
  cityId: string;
  guests: string;
  maxPrice: string;
  styles: string[];
  amenities: string[];
}

/** Ce que l'adresse porte — la référence. */
function etatDeLUrl(page: Page): Etat {
  const q = new URL(page.url()).searchParams;
  const liste = (nom: string) => q.getAll(nom).flatMap((v) => v.split(",")).filter((v) => v !== "");
  return { cityId: q.get("cityId") ?? "", guests: q.get("guests") ?? "", maxPrice: q.get("maxPrice") ?? "", styles: liste("styles"), amenities: liste("amenities") };
}

/** Ce que le FORMULAIRE des filtres montre (valeurs lues dans le DOM). */
async function lireFormulaire(page: Page) {
  return {
    cityId: await page.locator("#f-city").inputValue(),
    guestsPoignee: await page.locator('.filters input[type="range"][name="guests"]').inputValue(),
    maxPricePoignee: await page.locator('.filters input[type="range"][name="maxPrice"]').inputValue(),
    styles: await page.locator('.filters input[name="styles"]:checked').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)),
    amenities: await page.locator('.filters input[name="amenities"]:checked').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
  };
}

/** ⚠ UNE MESURE ATTEND QUE L'ÉCRAN ATTEIGNE L'ADRESSE (sondage borné) : au retour du navigateur l'adresse change AVANT que la page se
 *  rende de nouveau. Une lecture immédiate donnerait un faux rouge (mesuré : 0 coche lue au lieu de 2, une fois sur deux langues) — et,
 *  après réparation, un faux rouge encore. Le verdict est une valeur lue, comparée à l'adresse, jamais un délai. */
const doux = expect.configure({ soft: true });
const ATTENTE = { timeout: 2_500, intervals: [100, 200, 400, 800] };

async function mesurerFormulaire(page: Page, etape: string) {
  const attendu = etatDeLUrl(page);
  const voulu = {
    cityId: attendu.cityId,
    guestsPoignee: attendu.guests === "" ? "20" : attendu.guests,
    maxPricePoignee: attendu.maxPrice === "" ? "1500000" : attendu.maxPrice,
    styles: [...attendu.styles].sort(),
    amenities: [...attendu.amenities].sort()
  };
  const lire = async () => {
    const v = await lireFormulaire(page);
    return { ...v, styles: [...v.styles].sort(), amenities: [...v.amenities].sort() };
  };
  await doux.poll(lire, { message: `${etape} — formulaire`, ...ATTENTE }).toEqual(voulu);
  console.log("MESURE-FORMULAIRE", etape, JSON.stringify({ url: page.url().replace(CLIENT, ""), voulu, vu: await lire() }));
}

/** Ce que l'ASSISTANT montre, à l'étape où il est (lue dans l'adresse). */
async function mesurerAssistant(page: Page, etape: string) {
  const attendu = etatDeLUrl(page);
  const guide = new URL(page.url()).searchParams.get("guide");
  const boite = page.getByRole("dialog");
  if (guide === null) {
    console.log("MESURE-ASSISTANT", etape, "fermé");
    await expect.soft(boite, `${etape} — assistant fermé`).toHaveCount(0);
    return;
  }
  await expect(boite).toBeVisible();
  let lire: () => Promise<string | number>;
  let voulu: string | number;
  if (guide === "city") {
    lire = () => boite.locator("#wz-city").inputValue();
    voulu = attendu.cityId;
  } else if (guide === "guests") {
    lire = () => boite.locator("#wz-guests").inputValue();
    voulu = attendu.guests;
  } else if (guide === "budget") {
    lire = () => boite.locator(".wz-tier").evaluateAll((els) => els.filter((e) => e.getAttribute("aria-pressed") === "true").length);
    voulu = attendu.maxPrice === "" ? 0 : 1;
  } else {
    lire = () => boite.locator(".wz-chip").evaluateAll((els) => els.filter((e) => e.getAttribute("aria-pressed") === "true").length);
    voulu = attendu.styles.length + attendu.amenities.length;
  }
  await doux.poll(lire, { message: `${etape} — assistant, étape ${guide}`, ...ATTENTE }).toBe(voulu);
  console.log("MESURE-ASSISTANT", etape, guide, JSON.stringify({ voulu, vu: await lire() }));
}

async function mesurerTout(page: Page, etape: string) {
  await mesurerAssistant(page, etape);
  await mesurerFormulaire(page, etape);
}

for (const [locale, cat] of [["fr", fr], ["ar", ar]] as const) {
  test(`${locale} — R-1 : les choix de l'assistant reparaissent dans le formulaire, à chaque étape, au retour, et après « Recommencer »`, async ({ page }) => {
    // Entrée comme un visiteur : depuis l'accueil, par le lien de l'assistant (navigation du routeur, sans rechargement).
    await page.goto(`${CLIENT}/${locale}`);
    await page.getByRole("link", { name: cat.home.search.assistant }).click();
    await expect(page).toHaveURL(/\/salles\?guide=city$/);
    const boite = page.getByRole("dialog");
    await expect(boite.locator("#wz-question")).toHaveText(cat.wizard.qCity);
    await mesurerTout(page, "0-ouverture");

    // 1. la commune : la première commune réelle de la liste.
    const valeurCommune = await boite.locator("#wz-city option").evaluateAll((os) => (os as HTMLOptionElement[]).map((o) => o.value).filter((v) => v !== "")[0] ?? "");
    expect(valeurCommune).not.toBe("");
    await boite.locator("#wz-city").selectOption(valeurCommune);
    await boite.getByRole("button", { name: cat.wizard.continue }).click();
    await expect(page).toHaveURL(/guide=guests/);
    await mesurerTout(page, "1-apres-commune");

    // 2. les invités.
    await page.getByRole("dialog").locator("#wz-guests").fill("250");
    await page.getByRole("dialog").getByRole("button", { name: cat.wizard.continue }).click();
    await expect(page).toHaveURL(/guide=budget/);
    await mesurerTout(page, "2-apres-invites");

    // 3. le budget : le deuxième palier.
    await page.getByRole("dialog").locator(".wz-tier").nth(1).click();
    await expect(page).toHaveURL(/guide=taste/);
    await mesurerTout(page, "3-apres-budget");

    // 4. les goûts : un style et un équipement.
    const groupes = page.getByRole("dialog").locator(".wz-group");
    // ⚠ la base e2e ne publie AUCUN style (`/venue-styles` rend `[]`) : la rangée des styles est vide, celle des équipements non.
    if ((await groupes.nth(0).locator(".wz-chip").count()) > 0) {
      await groupes.nth(0).locator(".wz-chip").first().click();
      await expect(page).toHaveURL(/styles=/);
    }
    // ⚠ DANS LA SUITE COMPLÈTE le préchauffage lit `/fr/salles` AVANT tout semis : le client met ces listes en cache une heure, VIDES
    // (`next: { revalidate: 3600 }`, sur disque). Sans puce, il n'y a rien à cocher et rien à comparer — le test le dit au lieu de mentir.
    if ((await groupes.nth(1).locator(".wz-chip").count()) > 0) {
      await groupes.nth(1).locator(".wz-chip").first().click();
      await expect(page).toHaveURL(/amenities=/);
    }
    await mesurerTout(page, "4-apres-gouts");

    // 5. on revisite l'étape des invités PUIS celle de la commune par la liste d'étapes (« Modifier »), sans rien changer.
    const modifier = (etape: string) => cat.wizard.editAria.replace("{step}", etape);
    await page.getByRole("dialog").getByRole("button", { name: modifier(cat.wizard.stepGuests) }).first().click();
    await expect(page).toHaveURL(/guide=guests/);
    await mesurerTout(page, "5a-revisite-invites-par-la-liste");
    await page.getByRole("dialog").getByRole("button", { name: modifier(cat.wizard.stepCity) }).first().click();
    await expect(page).toHaveURL(/guide=city/);
    await mesurerTout(page, "5b-revisite-commune-par-la-liste");

    // 6. le bouton retour du navigateur : deux pas en arrière, on retrouve l'étape des goûts, réponses comprises.
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/guide=taste/);
    await mesurerTout(page, "6-retour-navigateur-vers-gouts");

    // 7. on termine par « Voir les salles » : l'assistant se ferme, la page de résultats porte l'adresse pleine.
    await page.getByRole("dialog").getByRole("button", { name: cat.wizard.see }).click();
    await expect(page).not.toHaveURL(/guide=/);
    await mesurerTout(page, "7-assistant-termine");

    // 8. on rouvre l'assistant par le retour du navigateur (état plein) et on « Recommence » : tout doit se vider, formulaire compris.
    await page.goBack();
    await expect(page).toHaveURL(/guide=taste/);
    await mesurerTout(page, "8a-rouvert-par-retour");
    await page.getByRole("dialog").getByRole("button", { name: cat.wizard.reset }).click();
    await expect(page).toHaveURL(/guide=city/);
    await expect(page).not.toHaveURL(/cityId=/);
    await mesurerTout(page, "8b-recommencer-depuis-un-etat-plein");

    // 9. le bouton retour remonte les étapes ; on mesure chacune.
    for (const garde of ["taste", "budget", "guests", "city"]) {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`guide=${garde}`));
      await mesurerTout(page, `9-retour-navigateur-${garde}`);
    }
  });
}
