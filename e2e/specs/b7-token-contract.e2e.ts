import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLIENT, PRO } from "../playwright.config";

/**
 * T4 / B7 — CONTRAT DES TOKENS RÉSOLUS (D124).
 *
 * Le défaut réel à couvrir (UI-D1 → UI-D2) : un token modifié pour UNE app
 * casse l'autre. `packages/ui/styles.css` est partagé ; les deux thèmes le
 * surchargent chacun de son côté.
 *
 * ⚠ POURQUOI PAS DES CAPTURES D'ÉCRAN.
 * `toHaveScreenshot()` compare des pixels. Trois problèmes pour ce défaut-là :
 *   1. le rendu des polices diffère entre Windows et Linux — les références
 *      seraient rouges dès qu'on change de machine, et on prendrait l'habitude
 *      de les régénérer sans les lire ;
 *   2. un diff de pixels dit « quelque chose a bougé », pas QUOI ;
 *   3. il ne distingue pas un token cassé d'un texte rallongé.
 * On compare donc les VALEURS RÉSOLUES des variables CSS, lues dans le vrai
 * navigateur après cascade. C'est indépendant de la plateforme, et un écart se
 * lit directement : `--accent: #d81b60 → #c2185b`.
 *
 * ⚠ CE N'EST PAS UN DOUBLON de `apps/pro/src/ui-tokens.test.ts`, qui fait des
 * assertions TEXTUELLES sur le fichier CSS. Lire le source ne dit pas ce que le
 * navigateur applique : c'est précisément la cascade — `:root` du paquet, puis
 * le thème de l'app, puis `[data-theme="dark"]` — qui produit le défaut.
 *
 * ⚠ LA RÉFÉRENCE N'EST PAS LIVRÉE, ET C'EST VOLONTAIRE.
 * Je ne peux pas exécuter Playwright dans mon environnement (CDN hors liste
 * blanche). Écrire des valeurs de tokens « de mémoire » aurait produit une
 * référence fausse — c'est arrivé quatre fois dans cette campagne, et chaque
 * fois le rouge ne prouvait rien. Le premier lancement l'écrit :
 *
 *     UPDATE_TOKEN_BASELINE=1 pnpm test:e2e
 *
 * Puis on LIT le fichier produit avant de le valider. Ensuite, tout écart
 * échoue.
 */

const BASELINE = join(__dirname, "../baselines/tokens.json");
const MAJ = process.env.UPDATE_TOKEN_BASELINE === "1";

/** Les quatre surfaces à couvrir : deux apps × deux thèmes. */
const SURFACES = [
  { nom: "client-light", url: `${CLIENT}/fr`, theme: "light" as const },
  { nom: "client-dark", url: `${CLIENT}/fr`, theme: "dark" as const },
  { nom: "pro-light", url: `${PRO}/auth/connexion`, theme: "light" as const },
  { nom: "pro-dark", url: `${PRO}/auth/connexion`, theme: "dark" as const }
];

type Releve = Record<string, Record<string, string>>;

function lireBaseline(): Releve {
  if (!existsSync(BASELINE)) return {};
  return JSON.parse(readFileSync(BASELINE, "utf8")) as Releve;
}

function ecrireBaseline(data: Releve): void {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const releve: Releve = {};

test.describe("B7 — contrat des tokens résolus (D124)", () => {
  // ⚠ Sérialisé : les quatre surfaces écrivent dans UN fichier de référence.
  test.describe.configure({ mode: "serial" });

  for (const surface of SURFACES) {
    test(`${surface.nom} : les tokens résolus n'ont pas bougé`, async ({ page }) => {
      // Le thème se pose AVANT le chargement : le script d'amorçage lit
      // `localStorage` avant peinture (UI-D3). Le poser après provoquerait une
      // bascule en cours de route et un relevé à moitié appliqué.
      await page.addInitScript(
        ([cle, valeur]) => {
          window.localStorage.setItem(cle!, valeur!);
        },
        ["zwadj-theme", surface.theme]
      );
      await page.goto(surface.url);
      await page.waitForLoadState("networkidle");

      // Garde-fou : le thème demandé est bien celui qui s'applique. Sans ceci,
      // les deux relevés « light » et « dark » pourraient être identiques et le
      // test passerait en ne comparant qu'une seule surface deux fois.
      const applique = await page.evaluate(() => document.documentElement.dataset.theme ?? "light");
      expect(applique, `le thème ${surface.theme} ne s'est pas appliqué`).toBe(surface.theme);

      /**
       * ⚠ LA LISTE DES TOKENS EST DÉRIVÉE DE LA FEUILLE, pas écrite à la main.
       * Un token ajouté demain entre dans le relevé le jour même ; une liste
       * recopiée aurait cessé d'être complète au premier lot suivant.
       */
      const tokens = await page.evaluate(() => {
        const noms = new Set<string>();
        for (const feuille of Array.from(document.styleSheets)) {
          let regles: CSSRuleList;
          try {
            regles = feuille.cssRules;
          } catch {
            continue; // feuille d'une autre origine : illisible, on passe
          }
          for (const regle of Array.from(regles)) {
            if (!(regle instanceof CSSStyleRule)) continue;
            for (const prop of Array.from(regle.style)) {
              if (prop.startsWith("--")) noms.add(prop);
            }
          }
        }
        const calcule = getComputedStyle(document.documentElement);
        const out: Record<string, string> = {};
        for (const nom of Array.from(noms).sort()) {
          out[nom] = calcule.getPropertyValue(nom).trim();
        }
        return out;
      });

      // Un relevé vide voudrait dire que la feuille partagée n'est pas chargée —
      // et le test passerait en comparant deux vides.
      expect(Object.keys(tokens).length, "aucun token résolu : la feuille est-elle chargée ?").toBeGreaterThan(20);

      releve[surface.nom] = tokens;

      if (MAJ) {
        test.info().annotations.push({ type: "baseline", description: `${surface.nom} relevé` });
        return;
      }

      const attendu = lireBaseline()[surface.nom];
      expect(
        attendu,
        `Aucune référence pour ${surface.nom}. Premier lancement :\n` +
          `  UPDATE_TOKEN_BASELINE=1 pnpm test:e2e\n` +
          `puis RELIRE e2e/baselines/tokens.json avant de le valider.`
      ).toBeDefined();

      const ecarts = Object.keys({ ...attendu, ...tokens })
        .filter((k) => attendu![k] !== tokens[k])
        .map((k) => `  ${k}: ${attendu![k] ?? "(absent)"} → ${tokens[k] ?? "(supprimé)"}`)
        .sort();

      expect(ecarts, `Tokens modifiés sur ${surface.nom} :\n${ecarts.join("\n")}`).toEqual([]);
    });
  }

  test("un token partagé a la MÊME valeur dans les deux apps, au même thème", async () => {
    // ⚠ LE CŒUR D'UI-D1 → UI-D2. Un token défini dans `packages/ui/styles.css`
    // et non surchargé doit valoir pareil côté client et côté pro. S'il diverge,
    // c'est qu'une app l'a redéfini pour elle seule — et l'autre l'a subi ou va
    // le subir au prochain changement.
    const paires: [string, string][] = [
      ["client-light", "pro-light"],
      ["client-dark", "pro-dark"]
    ];
    const reference = MAJ ? releve : { ...lireBaseline(), ...releve };

    const divergences: string[] = [];
    for (const [a, b] of paires) {
      const ta = reference[a];
      const tb = reference[b];
      if (!ta || !tb) continue; // surfaces non relevées : les tests ci-dessus l'ont déjà dit
      for (const nom of Object.keys(ta)) {
        if (tb[nom] !== undefined && ta[nom] !== tb[nom]) {
          divergences.push(`  ${nom} — ${a}: ${ta[nom]} | ${b}: ${tb[nom]}`);
        }
      }
    }

    /**
     * ⚠ DIVERGENCES LÉGITIMES. Les deux thèmes sont différents PAR DESSEIN
     * (client clair/rose, pro sombre) : beaucoup de tokens doivent diverger.
     * Ce test ne peut donc pas exiger zéro — il GÈLE la liste. Un token qui
     * commence à diverger sans y figurer fait échouer le test jusqu'à ce que
     * quelqu'un tranche : surcharge voulue, ou fuite ?
     *
     * La liste est produite au premier lancement, comme la référence.
     */
    const gelees = join(__dirname, "../baselines/tokens-divergents.json");
    if (MAJ) {
      mkdirSync(dirname(gelees), { recursive: true });
      writeFileSync(gelees, `${JSON.stringify(divergences.sort(), null, 2)}\n`, "utf8");
      ecrireBaseline({ ...lireBaseline(), ...releve });
      return;
    }

    expect(
      existsSync(gelees),
      `Aucune liste de divergences. Premier lancement : UPDATE_TOKEN_BASELINE=1 pnpm test:e2e`
    ).toBe(true);
    const attendues = JSON.parse(readFileSync(gelees, "utf8")) as string[];
    const nouvelles = divergences.filter((d) => !attendues.includes(d)).sort();

    expect(
      nouvelles,
      `Ces tokens divergent entre les deux apps SANS avoir été déclarés :\n${nouvelles.join("\n")}\n\n` +
        `Surcharge voulue ⇒ ajouter à e2e/baselines/tokens-divergents.json.\n` +
        `Sinon ⇒ un token partagé a été modifié pour une app et l'autre l'a subi.`
    ).toEqual([]);
  });
});
