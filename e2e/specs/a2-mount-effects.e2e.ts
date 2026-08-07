import { expect, test } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";
import { NetworkCounter, createVerifiedAccount, loginContext, settle } from "../fixtures/harness";

/**
 * A2 — MONTAGES DOUBLES.
 *
 * ⚠ Ces tests tournent contre les serveurs de DÉVELOPPEMENT, et c'est la seule
 * configuration où ils prouvent quelque chose : `React.StrictMode` ne double le
 * montage que là. Contre un build de production ils seraient tous verts sans
 * rien garantir. Voir la note du `webServer` dans `playwright.config.ts`.
 *
 * DEUX FAMILLES, DEUX ENJEUX DIFFÉRENTS — l'inventaire en a recensé 19 :
 *
 *  • EFFET DE BORD (4) : un second appel CORROMPT. Rotation du refresh token,
 *    consommation d'un jeton à usage unique. C'est là que le mutex doit vivre.
 *  • LECTURE SEULE (15) : un second appel coûte du réseau, rien de plus. On
 *    l'exige quand même à 1 — parce qu'un composant qui appelle deux fois au
 *    montage aujourd'hui appellera deux fois le jour où l'appel aura un effet.
 */

/** Écrans Pro à effet de montage, avec l'appel qui doit partir UNE fois. */
const PRO_SCREENS: { name: string; path: string; endpoint: string }[] = [
  { name: "liste des salles", path: "/salles", endpoint: "/api/v1/venues/mine" },
  { name: "référentiels (contexte salle)", path: "/salles/nouvelle", endpoint: "/api/v1/reference/wilayas" }
];

/** Écrans Client à effet de montage. */
const CLIENT_SCREENS: { name: string; path: string; endpoint: string }[] = [
  { name: "compte — mes demandes", path: "/fr/compte", endpoint: "/api/v1/me/bookings" },
  { name: "compte — mes visites", path: "/fr/compte", endpoint: "/api/v1/me/visit-bookings" }
];

test.describe("A2 — un seul appel par montage", () => {
  test("bootstrap d'auth (EFFET DE BORD : rotation du refresh token)", async ({ browser }) => {
    // Le cas princeps. `bootstrap()` consomme et fait tourner le refresh token :
    // deux appels au montage, et l'API révoque tout (D10). C'est le défaut que
    // D115 a corrigé, et ce test est ce qui l'aurait vu venir.
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);
    const page = await context.newPage();
    const net = NetworkCounter.watch(page);

    await page.goto(`${PRO}/`);
    await settle(page);

    expect(net.count("/auth/refresh", "POST"), `appels observés :\n${net.dump()}`).toBe(1);
    await context.close();
  });

  for (const screen of PRO_SCREENS) {
    test(`Pro — ${screen.name} : un seul ${screen.endpoint}`, async ({ browser }) => {
      const account = await createVerifiedAccount("PRO");
      const context = await browser.newContext();
      await loginContext(context, account);
      const page = await context.newPage();

      await page.goto(`${PRO}/`);
      await settle(page);

      // On ne compte QU'À PARTIR de la navigation vers l'écran visé : le
      // bootstrap et ses appels ne sont pas le sujet ici.
      const net = NetworkCounter.watch(page);
      await page.goto(`${PRO}${screen.path}`);
      await settle(page);

      expect(net.count(screen.endpoint), `appels observés :\n${net.dump()}`).toBe(1);
      await context.close();
    });
  }

  for (const screen of CLIENT_SCREENS) {
    test(`Client — ${screen.name} : un seul ${screen.endpoint}`, async ({ browser }) => {
      const account = await createVerifiedAccount("CLIENT");
      const context = await browser.newContext();
      await loginContext(context, account);
      const page = await context.newPage();
      const net = NetworkCounter.watch(page);

      await page.goto(`${CLIENT}${screen.path}`);
      await settle(page);

      expect(net.count(screen.endpoint), `appels observés :\n${net.dump()}`).toBe(1);
      await context.close();
    });
  }

  test("un aller-retour SPA remonte l'écran : un appel par MONTAGE, pas un par session", async ({ browser }) => {
    // Nuance qui compte : « un seul appel » ne veut pas dire « un seul appel à
    // vie ». Quitter puis revenir DOIT rappeler — sinon l'écran affiche des
    // données périmées. Ce qu'on interdit, c'est deux appels pour UN montage.
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);
    const page = await context.newPage();

    await page.goto(`${PRO}/salles`);
    await settle(page);

    const net = NetworkCounter.watch(page);
    await page.goto(`${PRO}/compte`);
    await settle(page);
    await page.goto(`${PRO}/salles`);
    await settle(page);

    expect(net.count("/api/v1/venues/mine"), `appels observés :\n${net.dump()}`).toBe(1);
    await context.close();
  });
});
