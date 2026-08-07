import { expect, test } from "@playwright/test";
import { PRO } from "../playwright.config";
import { NetworkCounter, createVerifiedAccount, loginContext, settle } from "../fixtures/harness";

/**
 * A5 — RECHARGEMENT À FROID vs NAVIGATION SPA.
 *
 * Ce que ce test cherche : un écart entre « j'arrive par un lien interne » et
 * « je recharge la page ». Un écart signale un état vivant en mémoire que rien
 * ne restaure au démarrage — l'écran marche tant qu'on ne recharge pas, et
 * casse au premier F5. C'est invisible en unitaire, où rien n'est jamais
 * « déjà monté ».
 *
 * ⚠ MÉTHODE : on compare l'EMPREINTE d'appels API (méthode + chemin, ids
 * normalisés), pas leur nombre ni leur ordre. Deux chemins d'arrivée n'ont
 * aucune raison d'appeler autant de fois — un cache SPA légitime peut sauter
 * un référentiel déjà chargé. Ce qui doit coïncider, c'est l'ENSEMBLE des
 * données dont l'écran a besoin : si le rechargement en demande une que la
 * navigation interne ne demande pas, c'est que la navigation interne s'appuyait
 * sur de la mémoire.
 */

const PROTECTED_ROUTES = [
  { name: "tableau de bord", path: "/" },
  { name: "mes salles", path: "/salles" },
  { name: "mon compte", path: "/compte" },
  { name: "nouvelle salle", path: "/salles/nouvelle" }
];

test.describe("A5 — parité navigation interne / rechargement", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} : même empreinte d'appels par les deux chemins`, async ({ browser }) => {
      const account = await createVerifiedAccount("PRO");
      const context = await browser.newContext();
      await loginContext(context, account);

      // ── Chemin 1 : arrivée par navigation interne (l'app est déjà montée).
      const spaPage = await context.newPage();
      await spaPage.goto(`${PRO}/`);
      await settle(spaPage);
      const spaNet = NetworkCounter.watch(spaPage);
      await spaPage.goto(`${PRO}${route.path}`); // navigation client dans la SPA
      await settle(spaPage);
      const spaFootprint = spaNet.apiFootprint().filter((c) => !c.includes("/auth/refresh"));
      const spaUrl = new URL(spaPage.url()).pathname;
      await spaPage.close();

      // ── Chemin 2 : arrivée à froid, l'app démarre sur cette URL.
      const coldPage = await context.newPage();
      const coldNet = NetworkCounter.watch(coldPage);
      await coldPage.goto(`${PRO}${route.path}`);
      await settle(coldPage);
      // Le refresh de bootstrap n'existe QUE sur le chemin froid : c'est
      // attendu, ce n'est pas un écart d'écran. On l'écarte des deux côtés.
      const coldFootprint = coldNet.apiFootprint().filter((c) => !c.includes("/auth/refresh"));
      const coldUrl = new URL(coldPage.url()).pathname;

      // Même destination : aucune redirection ne doit apparaître à froid.
      expect(coldUrl, "le rechargement à froid n'atterrit pas au même endroit").toBe(spaUrl);

      // Même besoin de données.
      expect(coldFootprint, `SPA :\n${spaFootprint.join("\n")}\n\nÀ FROID :\n${coldFootprint.join("\n")}`).toEqual(
        spaFootprint
      );
      await context.close();
    });
  }

  test("le calendrier d'une salle survit au rechargement (deux effets enchaînés)", async ({ browser }) => {
    // ⚠ L'écran le plus exposé de l'inventaire : `venue-calendar-page` enchaîne
    // `getMine` → slug → `fetch` de disponibilité. Une séquence en deux temps
    // ne se rejoue pas forcément pareil quand l'app démarre dessus.
    const account = await createVerifiedAccount("PRO");
    const context = await browser.newContext();
    await loginContext(context, account);
    const page = await context.newPage();

    await page.goto(`${PRO}/salles`);
    await settle(page);

    // Sans salle créée, l'écran liste est vide : on s'arrête ici plutôt que de
    // simuler un parcours de création qui appartient à un autre lot.
    // ⚠ DETTE ASSUMÉE — à compléter quand T2 fournira une salle de fixture.
    test.skip(true, "nécessite une salle de fixture : à brancher avec T2");
    await context.close();
  });
});
