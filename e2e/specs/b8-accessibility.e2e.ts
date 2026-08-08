import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";
import { createVerifiedAccount, loginContext, settle } from "../fixtures/harness";

/**
 * T4 / B8 — ACCESSIBILITÉ AUTOMATISÉE (D125).
 *
 * Remplace le contrôle « à l'œil » resté en dette sur D43 (contraste du champ
 * prix) et D44 (chargeur). Un contrôle visuel ne se rejoue pas : il vaut pour
 * l'écran qu'on regardait, le jour où on le regardait.
 *
 * ⚠ LA LISTE DES MANQUEMENTS CONNUS N'EST PAS LIVRÉE, ET C'EST VOLONTAIRE.
 * Deux raisons, et la seconde est la vraie :
 *   1. je ne peux pas exécuter Playwright ici (CDN hors liste blanche) ;
 *   2. exiger « zéro violation » d'entrée rendrait ce test ROUGE À LA
 *      LIVRAISON. La règle du dépôt est « rouge = régression », sans exception :
 *      un rouge qui décrit une dette ancienne détruit cette règle.
 *
 * On gèle donc l'existant au premier lancement, et le test échoue sur toute
 * violation NOUVELLE :
 *
 *     UPDATE_A11Y_BASELINE=1 pnpm test:e2e
 *
 * Puis on LIT `e2e/baselines/a11y.json` : c'est l'inventaire chiffré de la dette
 * d'accessibilité, ce que D43/D44 n'ont jamais eu. Le résorber consiste à
 * retirer des lignes de ce fichier — et le test empêche d'en rajouter.
 */

const BASELINE = join(__dirname, "../baselines/a11y.json");
const MAJ = process.env.UPDATE_A11Y_BASELINE === "1";

/**
 * ⚠ RÈGLES CIBLÉES, pas « tout WCAG ».
 * Les trois familles que D43/D44 laissaient à l'œil : contraste, ordre de
 * tabulation, ARIA. Élargir d'un coup à l'ensemble produirait une référence de
 * plusieurs centaines de lignes que personne ne lirait — donc un gel sans
 * lecture, c'est-à-dire rien.
 */
const REGLES = ["color-contrast", "aria-allowed-attr", "aria-required-attr", "aria-roles", "aria-valid-attr-value", "label", "button-name", "link-name", "image-alt", "form-field-multiple-labels", "tabindex"];

interface Ecran {
  nom: string;
  url: string;
  theme: "light" | "dark";
  authentifie?: "PRO" | "CLIENT";
  dir?: "rtl";
}

const ECRANS: Ecran[] = [
  { nom: "client accueil (clair)", url: `${CLIENT}/fr`, theme: "light" },
  { nom: "client accueil (sombre)", url: `${CLIENT}/fr`, theme: "dark" },
  { nom: "client accueil (arabe, RTL)", url: `${CLIENT}/ar`, theme: "light", dir: "rtl" },
  { nom: "client recherche de salles", url: `${CLIENT}/fr/salles`, theme: "light" },
  { nom: "client compte", url: `${CLIENT}/fr/compte`, theme: "light", authentifie: "CLIENT" },
  { nom: "pro connexion (clair)", url: `${PRO}/auth/connexion`, theme: "light" },
  { nom: "pro connexion (sombre)", url: `${PRO}/auth/connexion`, theme: "dark" },
  { nom: "pro liste des salles", url: `${PRO}/`, theme: "dark", authentifie: "PRO" },
  { nom: "pro nouvelle salle", url: `${PRO}/salles/nouvelle`, theme: "dark", authentifie: "PRO" },
  { nom: "pro compte", url: `${PRO}/compte`, theme: "dark", authentifie: "PRO" }
];

/**
 * Signature d'une violation : **la règle et la CATÉGORIE d'élément**, jamais le
 * message, jamais le nœud DOM précis.
 *
 * ⚠ Les libellés d'axe changent d'une version à l'autre : s'en servir comme clé
 * rendrait la référence obsolète à la première mise à jour.
 *
 * ⚠ ET LE SÉLECTEUR COMPLET EST TOUT AUSSI INSTABLE. La première référence
 * générée le montrait : **96 % de ses signatures (67 sur 70) contenaient un
 * `:nth-child()` ou un `[href$=…]`**. Vingt d'entre elles étaient indexées sur
 * les données de démonstration (`palais-des-rais`, `venue-card:nth-child(1..6)`)
 * et trois sur la position d'un `h2` dans un formulaire. Insérer un champ, ou
 * changer une graine, aurait fait apparaître une violation « nouvelle » et une
 * « corrigée » pour un simple déplacement — et on aurait pris l'habitude de
 * régénérer la référence sans la lire. Un gel qu'on ne lit plus ne gèle rien.
 *
 * On réduit donc au dernier segment du sélecteur, débarrassé de sa position et
 * de ses attributs : il reste la balise et ses classes. La question posée
 * devient « une NOUVELLE ESPÈCE de violation est-elle apparue ? » — la bonne
 * question pour une référence de régression. On perd « quelle carte » ; on
 * garde « quel élément », qui est ce qu'on corrige.
 */
function categorie(cible: string): string {
  const dernier = cible.split(">").at(-1)!.trim();
  return (
    dernier
      .replace(/\[[^\]]*\]/g, "") // attributs : [href$="…"], [title="…"]
      .replace(/:nth-[a-z-]+\([^)]*\)/g, "") // position dans la fratrie
      .replace(/:[a-z-]+/g, "") // autres pseudo-classes
      .trim() || dernier
  );
}

function signatures(resultats: { violations: { id: string; nodes: { target: unknown[] }[] }[] }): string[] {
  const out: string[] = [];
  for (const v of resultats.violations) {
    for (const noeud of v.nodes) {
      out.push(`${v.id} @ ${categorie(noeud.target.join(" "))}`);
    }
  }
  return [...new Set(out)].sort();
}

function lireBaseline(): Record<string, string[]> {
  if (!existsSync(BASELINE)) return {};
  return JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, string[]>;
}

const collecte: Record<string, string[]> = {};

async function poserTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript(
    ([cle, valeur]) => {
      window.localStorage.setItem(cle!, valeur!);
    },
    ["zwadj-theme", theme]
  );
}

test.describe("B8 — accessibilité automatisée (D125)", () => {
  // Sérialisé : toutes les écrans alimentent UNE référence commune.
  test.describe.configure({ mode: "serial" });

  for (const ecran of ECRANS) {
    test(`${ecran.nom} : aucune NOUVELLE violation`, async ({ browser }) => {
      const context = await browser.newContext();
      if (ecran.authentifie) {
        const compte = await createVerifiedAccount(ecran.authentifie);
        await loginContext(context, compte);
      }
      const page = await context.newPage();
      await poserTheme(page, ecran.theme);
      await page.goto(ecran.url);
      await settle(page);

      // Garde-fou : le thème demandé s'applique bien. Deux écrans « clair » et
      // « sombre » identiques compteraient deux fois la même chose.
      const applique = await page.evaluate(() => document.documentElement.dataset.theme ?? "light");
      expect(applique, `le thème ${ecran.theme} ne s'est pas appliqué`).toBe(ecran.theme);

      if (ecran.dir === "rtl") {
        // ⚠ Le RTL n'est pas un détail cosmétique : la moitié du public de Zwadj
        // lit en arabe, et un `dir` absent casse l'ordre de tabulation.
        const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
        expect(dir, "la page arabe ne déclare pas dir=rtl").toBe("rtl");
      }

      const resultats = await new AxeBuilder({ page }).withRules(REGLES).analyze();
      const observees = signatures(resultats);
      collecte[ecran.nom] = observees;

      if (MAJ) {
        await context.close();
        return;
      }

      const connues = lireBaseline()[ecran.nom];
      expect(
        connues,
        `Aucune référence pour « ${ecran.nom} ». Premier lancement :\n` +
          `  UPDATE_A11Y_BASELINE=1 pnpm test:e2e\n` +
          `puis RELIRE e2e/baselines/a11y.json — c'est l'inventaire de la dette.`
      ).toBeDefined();

      const nouvelles = observees.filter((s) => !connues!.includes(s));
      expect(
        nouvelles,
        `NOUVELLES violations sur « ${ecran.nom} » :\n${nouvelles.join("\n")}`
      ).toEqual([]);

      // ⚠ L'AUTRE SENS COMPTE AUSSI. Une violation corrigée doit sortir de la
      // référence, sinon la dette semble éternelle et plus personne n'y croit.
      const resorbees = connues!.filter((s) => !observees.includes(s));
      expect(
        resorbees,
        `Ces violations sont CORRIGÉES — retire-les de e2e/baselines/a11y.json :\n${resorbees.join("\n")}`
      ).toEqual([]);

      await context.close();
    });
  }

  test("écrit la référence si demandé, et refuse de la deviner sinon", async () => {
    if (!MAJ) {
      expect(
        existsSync(BASELINE),
        `Référence absente. Elle ne peut PAS être écrite à la main : une liste de\n` +
          `violations inventée serait fausse, et un rouge qui ne prouve rien fait\n` +
          `perdre confiance dans la porte entière. Lance :\n` +
          `  UPDATE_A11Y_BASELINE=1 pnpm test:e2e`
      ).toBe(true);
      return;
    }
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, `${JSON.stringify(collecte, null, 2)}\n`, "utf8");

    const total = Object.values(collecte).reduce((n, v) => n + v.length, 0);
    console.log(`[B8] référence écrite : ${total} violation(s) sur ${Object.keys(collecte).length} écran(s).`);
  });
});
