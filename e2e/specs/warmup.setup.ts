import { expect, test } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";

/**
 * PRÉCHAUFFAGE (D127) — s'exécute AVANT tous les autres tests.
 *
 * ⚠ POURQUOI. Next.js et Vite en développement **compilent une route à la
 * première demande**. Le premier test qui atteint `/fr/salles` paie donc la
 * compilation en plus de son propre travail — et il la paie sous la charge des
 * autres workers. Ce n'est pas un défaut du produit, mais ça produit un
 * `Test timeout exceeded` sur `page.goto` qui ressemble à s'y méprendre à un
 * blocage réel.
 *
 * ⚠ ET LA VARIANCE EST PIRE QUE LA LENTEUR. Le test qui paie la compilation
 * n'est pas toujours le même : il dépend de l'ordre d'attribution aux workers.
 * Un échec qui se déplace d'un lancement à l'autre finit par être relancé sans
 * être lu — exactement ce que `retries: 0` cherche à empêcher.
 *
 * On paie donc la compilation ICI, une fois, en dehors de toute mesure.
 *
 * ⚠ Ce fichier ne doit RIEN mesurer d'autre. S'il commence à contenir des
 * assertions produit, il devient un test que personne ne regarde parce qu'il
 * s'appelle « préchauffage ».
 */

/** Toutes les routes que la suite visite. Une route absente d'ici sera compilée
 *  par le premier test qui la demande — c'est-à-dire au pire moment. */
const ROUTES = [
  `${CLIENT}/fr`,
  `${CLIENT}/ar`,
  `${CLIENT}/fr/salles`,
  `${CLIENT}/fr/compte`,
  `${PRO}/`,
  `${PRO}/auth/connexion`,
  `${PRO}/compte`,
  `${PRO}/salles`,
  `${PRO}/salles/nouvelle`
];

test.describe.configure({ mode: "serial" });

test("préchauffe les routes des deux applications", async ({ page }) => {
  // Généreux : c'est ICI qu'on accepte d'attendre une compilation à froid, et
  // nulle part ailleurs.
  test.setTimeout(240_000);

  const echecs: string[] = [];
  for (const url of ROUTES) {
    try {
      const reponse = await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      // ⚠ Un préchauffage silencieusement raté ne préchauffe rien ET ne le dit
      // pas : la suite repartirait dans la variance qu'on essaie d'éliminer,
      // en croyant l'avoir supprimée.
      if (!reponse || reponse.status() >= 400) {
        echecs.push(`${url} → ${reponse?.status() ?? "aucune réponse"}`);
      }
    } catch (error) {
      echecs.push(`${url} → ${(error as Error).message.split("\n")[0]}`);
    }
  }

  expect(
    echecs,
    `Ces routes n'ont pas répondu au préchauffage. Ce n'est pas un problème de\n` +
      `lenteur : une route qui échoue ici échouera dans les tests.\n${echecs.join("\n")}`
  ).toEqual([]);
});
