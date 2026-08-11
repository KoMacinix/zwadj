import { expect, test } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";
import {
  MONTAGES_PAR_RENDU,
  NetworkCounter,
  createVerifiedAccount,
  loginContext,
  markPage,
  pageStillAlive,
  settle,
  spaNavigate
} from "../fixtures/harness";

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
/**
 * ⚠ CHEMINS RELEVÉS SUR LE ROUTEUR, PLUS ÉCRITS DE MÉMOIRE.
 *
 * Le premier vrai run a rendu « attendu 1, reçu 0 » sur trois tests : j'avais
 * écrit `/api/v1/venues/mine` et `/api/v1/reference/wilayas`, qui n'existent
 * pas. Un compteur qui observe un endpoint inexistant vaut TOUJOURS zéro — il
 * ne mesure rien, ni dans un sens ni dans l'autre. Le journal réseau, lui,
 * montrait `/api/v1/pro/venues` et `/api/v1/wilayas`, bien présents.
 */
/**
 * ⚠ `/api/v1/pro/venues` A QUITTÉ CETTE TABLE (UIP-A).
 *
 * Il n'est plus tiré par un écran : `ProVenuesProvider` est monté AU-DESSUS de
 * toutes les routes et le charge une fois pour la coquille — libellé adaptatif
 * de la navigation, sélecteur de portée, panneau gauche et page liste posaient
 * la même question. Le mesurer ici revenait à demander à un écran de refaire un
 * appel qu'on a délibérément sorti des écrans. Il a son propre test, plus bas.
 */
const PRO_SCREENS: { name: string; path: string; endpoint: string }[] = [
  { name: "référentiel wilayas", path: "/salles/nouvelle", endpoint: "/api/v1/wilayas" },
  { name: "référentiel équipements", path: "/salles/nouvelle", endpoint: "/api/v1/amenities" },
  { name: "référentiel styles", path: "/salles/nouvelle", endpoint: "/api/v1/venue-styles" }
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

      // ⚠ LECTURE SEULE → un appel PAR MONTAGE, pas « un » tout court.
      // Ni zéro (l'écran n'afficherait rien), ni trois (cascade).
      expect(net.count(screen.endpoint), `appels observés :\n${net.dump()}`).toBe(MONTAGES_PAR_RENDU);
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

      expect(net.count(screen.endpoint), `appels observés :\n${net.dump()}`).toBe(MONTAGES_PAR_RENDU);
      await context.close();
    });
  }

  test("un aller-retour SPA remonte l'écran : un appel par MONTAGE, pas un par session", async ({ browser }) => {
    // Nuance qui compte : « un seul appel » ne veut pas dire « un seul appel à
    // vie ». Quitter puis revenir DOIT rappeler — sinon l'écran affiche des
    // données périmées. Ce qu'on interdit, c'est deux appels pour UN montage.
    //
    // ⚠ MESURÉ SUR UN APPEL QUE L'ÉCRAN POSSÈDE. Ce test visait
    // `/api/v1/pro/venues` ; depuis UIP-A cet appel appartient à la coquille,
    // qui ne démonte jamais — il vaut donc 0 sur un aller-retour, par
    // construction, et la leçon ci-dessus ne s'y prouvait plus. Les
    // référentiels de `/salles`, eux, sont toujours chargés au montage de
    // l'écran : c'est là que la question « et si on revient ? » a un sens.
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);
    const page = await context.newPage();

    await page.goto(`${PRO}/salles`);
    await settle(page);
    await markPage(page);

    const net = NetworkCounter.watch(page);
    await spaNavigate(page, "/compte");
    await settle(page);
    await spaNavigate(page, "/salles");
    await settle(page);

    // ⚠ D'ABORD : est-ce RESTÉ une navigation SPA ? `page.goto` recharge le
    // document et transformerait ce test en deux démarrages à froid — vert, et
    // vide. Le témoin posé sur `window` tranche avant toute autre assertion.
    expect(await pageStillAlive(page), "le document a été rechargé : ce n'est plus un aller-retour SPA").toBe(true);

    // Revenir DOIT recharger : un écran qui affiche du périmé est pire qu'un
    // écran qui rappelle. Ce qu'on interdit, c'est la cascade.
    expect(net.count("/api/v1/wilayas"), `appels observés :\n${net.dump()}`).toBe(MONTAGES_PAR_RENDU);

    // Et l'autre moitié de la décision UIP-A, dans le même aller-retour : la
    // liste des salles NE repart PAS. C'est ce qui rend le provider utile ; si
    // ce 0 devenait 2, on aurait quatre allers-retours pour une seule réponse.
    expect(net.count("/api/v1/pro/venues"), `appels observés :\n${net.dump()}`).toBe(0);
    await context.close();
  });

  test("la coquille charge la liste des salles UNE fois par démarrage, quel que soit l'écran d'entrée", async ({
    browser
  }) => {
    // Ce que ce test remplace, et pourquoi le nombre change.
    //
    // ⚠ UN, PAS `MONTAGES_PAR_RENDU`. Le chargement n'est pas déclenché par le
    // MONTAGE du provider mais par l'ARRIVÉE de l'utilisateur : l'effet est
    // gardé par `isPro`, faux tant que le bootstrap d'auth n'a pas répondu. Le
    // double montage de StrictMode a donc déjà eu lieu quand la condition
    // devient vraie, et le rejeu qui suit un changement de dépendance est
    // simple. Ce n'est pas une tolérance — c'est un nombre déterministe, et
    // trois ici signifierait une cascade exactement comme ailleurs.
    //
    // ⚠ Cette garde `isPro` n'est pas une optimisation : le provider est monté
    // au-dessus de `/auth/connexion`, et sans elle un visiteur anonyme tirerait
    // un `GET /pro/venues` qui ne peut que répondre 401.
    for (const entree of ["/", "/salles", "/compte"]) {
      const account = await createVerifiedAccount("PRO");
      const context = await browser.newContext();
      await loginContext(context, account);
      const page = await context.newPage();
      const net = NetworkCounter.watch(page);

      await page.goto(`${PRO}${entree}`);
      await settle(page);

      expect(net.count("/api/v1/pro/venues"), `entrée ${entree} — appels observés :\n${net.dump()}`).toBe(1);
      await context.close();
    }
  });
});
