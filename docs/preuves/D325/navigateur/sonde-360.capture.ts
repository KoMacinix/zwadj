import { expect, test } from "@playwright/test";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { PRO } from "../../../../e2e/playwright.config";
import { createPublishedVenue, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D325 — SONDE : QUI DÉBORDE À 360 px ? (pièce jetable, versée)
 *
 * Le test e2e du rang 32 a lu 58 px de débordement horizontal sur le tableau de bord du Pro, à 360 px, en arabe. Avant de décider si c'est le lot ou si c'était déjà là,
 * on NOMME les éléments qui dépassent : un élément hors de ce que le lot touche (en-tête, panneau gauche, rail) est un défaut ANTÉRIEUR, à rapporter ; un élément que le lot a
 * posé (le champ de téléphone, la ligne de boutons) est à corriger ici.
 */
test.beforeAll(() => seedReferentials());

for (const langue of ["fr", "ar"] as const) {
  test(`sonde ${langue} 360`, async ({ browser }) => {
    const salle = await createPublishedVenue();
    const contexte = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await contexte.addInitScript((l) => window.localStorage.setItem("zwadj.pro.lang", l), langue);
    await loginContext(contexte, salle.pro);
    const page = await contexte.newPage();
    await page.goto(`${PRO}/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(600);
    const mesure = await page.evaluate(() => {
      const largeur = document.documentElement.clientWidth;
      const hors: Array<{ chemin: string; gauche: number; droite: number; largeur: number }> = [];
      const chemin = (el: Element): string => {
        const parts: string[] = [];
        let c: Element | null = el;
        while (c && parts.length < 4) {
          parts.unshift(`${c.tagName.toLowerCase()}${c.className && typeof c.className === "string" ? "." + c.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`);
          c = c.parentElement;
        }
        return parts.join(" > ");
      };
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > largeur + 1 || r.left < -1)) hors.push({ chemin: chemin(el), gauche: Math.round(r.left), droite: Math.round(r.right), largeur: Math.round(r.width) });
      }
      return { largeur, defilement: document.documentElement.scrollWidth, direction: document.documentElement.dir, hors: hors.slice(0, 25) };
    });
    console.log(`SONDE ${langue} : ${JSON.stringify(mesure, null, 1)}`);
    await contexte.close();
    void fr;
    void ar;
  });
}
