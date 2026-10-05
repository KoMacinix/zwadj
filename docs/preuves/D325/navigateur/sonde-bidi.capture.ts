import { expect, test } from "@playwright/test";
import ar from "../../../../packages/i18n/messages/ar.json";
import { PRO } from "../../../../e2e/playwright.config";
import { createPublishedVenue, loginContext, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D325 — SONDE BIDI : le « + » de « +213 » est-il rendu À GAUCHE du « 2 » dans une phrase arabe ? (pièce jetable, versée)
 *
 * La capture de l'écran arabe laissait un doute de lecture (« +213 » ou « 213+ » ?). Un doute de lecture se MESURE : on prend la position horizontale réelle de chaque
 * caractère par un `Range`, dans le moteur de rendu. Un nombre de téléphone se lit de gauche à droite : le « + » doit avoir une abscisse INFÉRIEURE à celle du « 2 ».
 *
 * CALIBRATION, deux bras, dans la même page : (1) un témoin « +213 » posé dans un `<bdi dir="ltr">` — attendu « + à gauche » ; (2) un témoin « +213 » posé nu dans un paragraphe
 * arabe, SANS marque — attendu « + à droite » (c'est le défaut connu). Si le bras (2) ne rend pas « à droite », l'instrument ne distingue rien et la mesure ne vaut rien.
 */
test.beforeAll(() => seedReferentials());

test("sonde bidi — l'indice « Format international » en arabe", async ({ browser }) => {
  const salle = await createPublishedVenue();
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await contexte.addInitScript(() => window.localStorage.setItem("zwadj.pro.lang", "ar"));
  await loginContext(contexte, salle.pro);
  const page = await contexte.newPage();
  await page.goto(`${PRO}/`);
  await expect(page.getByRole("heading", { level: 1, name: ar.venue.ui.walkin.title })).toBeVisible();
  await page.waitForTimeout(500);

  const mesure = await page.evaluate(() => {
    const ordre = (noeud: Text) => {
      const t = noeud.data;
      const i = t.indexOf("+213");
      const x = (k: number) => {
        const r = document.createRange();
        r.setStart(noeud, k);
        r.setEnd(noeud, k + 1);
        return r.getBoundingClientRect().left;
      };
      return { plusGauche: x(i), deuxGauche: x(i + 1), plusAGaucheDuDeux: x(i) < x(i + 1), texte: t.trim() };
    };
    const trouver = (racine: Element): Text | null => {
      const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) if ((n as Text).data.includes("+213")) return n as Text;
      return null;
    };
    // Témoins de calibration.
    const bras = document.createElement("div");
    bras.setAttribute("dir", "rtl");
    bras.setAttribute("lang", "ar");
    bras.innerHTML = `<p id="t-nu">الصيغة الدولية: +213 متبوعاً</p><p id="t-bdi">الصيغة الدولية: <bdi dir="ltr">+213</bdi> متبوعاً</p>`;
    document.body.appendChild(bras);
    const nu = ordre(trouver(bras.querySelector("#t-nu") as Element) as Text);
    const bdi = ordre(trouver(bras.querySelector("#t-bdi") as Element) as Text);
    // L'indice réel de l'écran : l'élément dont l'identifiant finit par « -hint » et qui cite +213.
    const indices = Array.from(document.querySelectorAll('[id$="-hint"]')).map((e) => trouver(e)).filter((n): n is Text => n !== null);
    return { nu, bdi, reels: indices.map(ordre) };
  });
  console.log(`SONDE-BIDI ${JSON.stringify(mesure, null, 1)}`);
  expect(mesure.bdi.plusAGaucheDuDeux, "calibration, bras 1 : un témoin isolé (bdi ltr) doit avoir le + à gauche").toBe(true);
  expect(mesure.nu.plusAGaucheDuDeux, "calibration, bras 2 : un témoin nu doit montrer le défaut connu (+ à droite), sinon l'instrument ne distingue rien").toBe(false);
  expect(mesure.reels.length, "aucun indice « -hint » citant +213 trouvé sur l'écran").toBeGreaterThan(0);
  await contexte.close();
});
