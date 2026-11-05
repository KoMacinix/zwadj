import { expect, test, type Browser } from "@playwright/test";
import { CLIENT } from "../playwright.config";
import { createPublishedVenue, seedReferentials, settle } from "../fixtures/harness";

/**
 * FC-2 (session `front-client`) — À 360 PX, AUCUNE PAGE PUBLIQUE NE DÉBORDE, EN FRANÇAIS COMME EN ARABE.
 *
 * ⚠ LE DÉFAUT QU'ELLE FERME, mesuré par D321 (`docs/preuves/D321/captures/debordement.txt`) : sur la fiche salle FRANÇAISE, à
 * 360 px, `document.documentElement.scrollWidth` valait 364 — la barre de session de l'en-tête (`.header-auth` : thème, langue,
 * « Connexion », « Inscription ») ne passait pas à la ligne et sortait de 4 px. Un débordement horizontal, c'est une page qui
 * glisse sous le doigt sur le téléphone de la moitié des visiteurs. En arabe la barre tenait (« Français » est plus court).
 *
 * ⚠ CE QU'ELLE MESURE : la règle UNIVERSELLE « la page entière tient dans la fenêtre » (`scrollWidth` ≤ largeur), sur les trois
 * gabarits publics qui portent l'en-tête — accueil, recherche, fiche — dans les DEUX langues, visiteur ANONYME (c'est l'état où la
 * barre est la plus large : deux boutons au lieu du rond à initiales). La règle se compte sur tous les écrans, elle ne se cherche
 * pas sur un exemple (D226). En RTL, un débordement vers la GAUCHE compte aussi dans `scrollWidth`.
 *
 * ⚠ CE QU'ELLE NE MESURE PAS : les autres largeurs (la règle CSS ne dépend d'aucun seuil : elle laisse la barre passer à la ligne
 * à toute largeur où elle ne tient plus) ; l'état connecté ; l'app Pro (un autre en-tête).
 */
const LARGEUR = 360;

let slug = "";

test.beforeAll(async () => {
  seedReferentials();
  slug = (await createPublishedVenue()).slug;
});

async function largeurDeLaPage(browser: Browser, chemin: string): Promise<number> {
  const contexte = await browser.newContext({ viewport: { width: LARGEUR, height: 800 } });
  try {
    const page = await contexte.newPage();
    await page.goto(`${CLIENT}${chemin}`);
    await settle(page);
    // La session est RÉSOLUE (anonyme) : la barre porte ses deux boutons — l'état mesuré par D321. Sans eux, la page
    // serait mesurée pendant le chargement, quand la barre est vide, et passerait pour une mauvaise raison (D209 n° 1).
    await expect(page.locator(".header-auth .btn-accent")).toBeVisible();
    return await page.evaluate(() => document.documentElement.scrollWidth);
  } finally {
    await contexte.close();
  }
}

for (const locale of ["fr", "ar"] as const) {
  for (const [ecran, chemin] of [
    ["accueil", ""],
    ["recherche", "/salles"],
    ["fiche salle", "/salles/:slug"]
  ] as const) {
    test(`FC-2 — ${locale}, ${ecran} : à ${LARGEUR} px, la page tient dans la fenêtre`, async ({ browser }) => {
      const largeur = await largeurDeLaPage(browser, `/${locale}${chemin.replace(":slug", slug)}`);
      expect(largeur, `scrollWidth de « ${ecran} » (${locale}) pour une fenêtre de ${LARGEUR} px`).toBeLessThanOrEqual(LARGEUR);
    });
  }
}
