import { expect, test } from "@playwright/test";
import { PRO } from "../playwright.config";
import {
  NetworkCounter,
  createVerifiedAccount,
  loginContext,
  markPage,
  pageStillAlive,
  settle,
  spaNavigate
} from "../fixtures/harness";

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

/**
 * ⚠ APPELS POSSÉDÉS PAR LA COQUILLE, pas par l'écran (UIP-A).
 *
 * `ProVenuesProvider` est monté au-dessus de toutes les routes : il charge la
 * liste des salles au DÉMARRAGE de l'application, et une navigation interne ne
 * le remonte pas. L'écart apparaît donc sur les quatre routes à la fois, et
 * toujours dans le même sens : le chemin froid demande cette liste, le chemin
 * SPA l'a déjà.
 *
 * ⚠ CE SENS-LÀ EST BÉNIN, ET C'EST TOUT LE POINT DE CE TEST. Le défaut
 * qu'A5 chasse est l'inverse : un écran qui marche par navigation interne parce
 * qu'un autre écran avait chargé sa donnée, et qui casse au premier F5. Un
 * appel présent À FROID et absent en SPA veut dire « la coquille l'a déjà » ;
 * un appel présent en SPA et absent à froid voudrait dire « le rechargement ne
 * le redemande pas », et celui-là reste interdit.
 *
 * La liste est GELÉE, pas ignorée : elle est vérifiée présente à froid ci-dessous
 * — sinon le jour où le provider cesserait de charger, elle deviendrait un
 * laissez-passer silencieux.
 */
const EMPREINTE_COQUILLE = ["GET /api/v1/pro/venues"];

const horsCoquille = (empreinte: string[]) => empreinte.filter((appel) => !EMPREINTE_COQUILLE.includes(appel));

/**
 * `donneesPropres: false` — l'écran ne demande RIEN en son nom.
 *
 * ⚠ Le tableau de bord est dans ce cas, et il faut dire pourquoi plutôt que de
 * le retirer de la liste : le compte e2e n'a AUCUNE salle, `VenueScope` rend
 * donc « créez votre première salle » et `WalkinJourney` n'est jamais monté.
 * L'écran est réel, il est simplement vide de réseau. Le fait est gelé à `[]` :
 * le jour où le tableau de bord chargera ses devis, ce test échouera et
 * quelqu'un basculera ce drapeau en connaissance de cause. Le remplir vraiment
 * demande une salle de fixture — même dette que le calendrier plus bas.
 */
const PROTECTED_ROUTES = [
  { name: "tableau de bord", path: "/", donneesPropres: false },
  { name: "mes salles", path: "/salles", donneesPropres: true },
  { name: "mon compte", path: "/compte", donneesPropres: true },
  { name: "nouvelle salle", path: "/salles/nouvelle", donneesPropres: true }
];

test.describe("A5 — parité navigation interne / rechargement", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} : même empreinte d'appels par les deux chemins`, async ({ browser }) => {
      const account = await createVerifiedAccount("PRO");
      const context = await browser.newContext();
      await loginContext(context, account);

      // ── Chemin 1 : arrivée par navigation INTERNE (l'app est déjà montée).
      //
      // ⚠ CES QUATRE TESTS ÉTAIENT VIDES, ET ILS PASSAIENT.
      // La première version faisait `spaPage.goto(...)` pour « naviguer » — or
      // `goto` recharge toujours le document. Les deux branches comparées
      // étaient donc deux démarrages à froid, identiques par construction :
      // verts garantis, information nulle. Visible dans le journal du premier
      // vrai run — toute la séquence Vite repartait après le second `goto`.
      // ⚠ LE DÉPART DOIT DIFFÉRER DE LA CIBLE.
      //
      // Partir de `/` pour tester `/` n'est pas une navigation : react-router
      // voit le même chemin, ne remonte rien, et aucun effet ne se rejoue. Le
      // témoin survit — normal, aucun document n'a été rechargé — mais le test
      // compare « ne bouge pas » à un démarrage à froid. C'est le seul des
      // quatre qui échouait, et c'est exactement pourquoi.
      const depart = route.path === "/" ? "/compte" : "/";
      expect(depart, "le départ et la cible sont identiques : la navigation serait un no-op").not.toBe(route.path);

      const spaPage = await context.newPage();
      await spaPage.goto(`${PRO}${depart}`);
      await settle(spaPage);
      await markPage(spaPage);

      const spaNet = NetworkCounter.watch(spaPage);
      await spaNavigate(spaPage, route.path);
      await settle(spaPage);

      // Le témoin AVANT toute autre assertion : sans lui, rien ne garantit
      // qu'on n'a pas simplement rechargé, et le test peut redevenir vide sans
      // que personne ne s'en aperçoive.
      expect(
        await pageStillAlive(spaPage),
        "le document a été rechargé : la branche « SPA » n'en est plus une"
      ).toBe(true);

      const spaFootprint = spaNet.apiFootprint().filter((c) => !c.includes("/auth/refresh"));

      // ⚠ ANTI-VIDE. Deux empreintes vides sont « égales » : sans cette ligne,
      // une navigation redevenue no-op passerait au vert au lieu d'échouer.
      // C'est la même précaution que le témoin, pour l'autre façon de ne rien
      // mesurer.
      //
      // Sur un écran SANS données propres, l'attente s'inverse et se GÈLE : on
      // exige explicitement le vide, au lieu de le tolérer en silence.
      if (route.donneesPropres) {
        expect(
          spaFootprint.length,
          "la navigation interne n'a déclenché AUCUN appel : rien n'a été remonté"
        ).toBeGreaterThan(0);
      } else {
        expect(
          spaFootprint,
          `cet écran est déclaré sans données propres, il en demande pourtant :\n${spaFootprint.join("\n")}\n` +
            "→ basculer `donneesPropres` à true dans la table ci-dessus."
        ).toEqual([]);
      }

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

      // ⚠ LA CONSTANTE N'EST PAS UN LAISSEZ-PASSER. Ce qu'on s'apprête à retirer
      // des deux côtés doit être RÉELLEMENT chargé au démarrage : sans cette
      // vérification, le jour où la coquille cesserait de lire la liste des
      // salles, les deux empreintes coïncideraient à nouveau et le test
      // resterait vert en ayant perdu son objet.
      for (const appel of EMPREINTE_COQUILLE) {
        expect(
          coldFootprint,
          `« ${appel} » est déclaré possédé par la coquille mais n'est PAS demandé au démarrage :\n` +
            `${coldFootprint.join("\n")}\n→ relire EMPREINTE_COQUILLE, elle est périmée.`
        ).toContain(appel);
      }

      // Même besoin de données, une fois la coquille retirée des deux côtés.
      expect(
        horsCoquille(coldFootprint),
        `SPA :\n${spaFootprint.join("\n")}\n\nÀ FROID :\n${coldFootprint.join("\n")}`
      ).toEqual(horsCoquille(spaFootprint));
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
