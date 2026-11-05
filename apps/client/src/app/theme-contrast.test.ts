// FC-1 (session `front-client`) — LE CONTRASTE DES TEXTES EN ACCENT, MESURÉ CONTRE LES TOKENS ET NON CONTRE UN COMMENTAIRE.
//
// ⚠ LE DÉFAUT QU'ELLE FERME. `theme.css` écrit en tête : « #DA3642 NE PASSE EN TEXTE QUE SUR BLANC PUR », et D264 a créé
// `--accent-text` pour les textes accentués posés ailleurs. Quatre textes étaient restés en `var(--accent)` : `.filters-reset`
// et `.range-value` (TOLÉRÉS par la référence a11y de B8 « depuis toujours »), `.results-count-n` (la page de résultats n'en
// rend un qu'avec au moins une salle — B8 ne le voyait pas sur une base vide) et `.wz-eyebrow` (l'assistant, qu'aucun écran de
// B8 ne visite). Une règle écrite dans un commentaire ne rougit pas : celle-ci rougit.
//
// ⚠ COMMENT ELLE MESURE. Elle lit les DEUX feuilles dans l'ordre où l'application les charge (`@zwadj/ui/styles.css`, puis
// `theme.css`), commentaires retirés (une garde de source ne lit jamais un commentaire, S11-a), résout chaque `var(--…)` par
// les blocs `:root` — puis, en sombre, `:root[data-theme="dark"]`, qui l'emporte — et calcule le contraste WCAG 2.x du texte
// sur CHAQUE fond neutre du thème (`--bg`, `--surface`, `--bg-2`) : une règle UNIVERSELLE, le pire fond décide (D209 n° 4 —
// on ne devine pas sur quel fond l'élément tombe, on exige qu'il passe partout). Aucune valeur de couleur n'est écrite ici :
// elles viennent des feuilles, l'autorité.
//
// ⚠ CE QU'ELLE NE MESURE PAS (écrit, pas tu) : le fond RÉEL sous chaque élément dans un navigateur — c'est B8 (axe-core, e2e)
// pour les écrans qu'il visite ; les textes de 18 px et plus (seuil 3:1) — les quatre font 12 et 13 px, seuil 4,5:1.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RACINE = resolve(__dirname, "../../../..");
const sansCommentaires = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");
const lire = (chemin: string): string => sansCommentaires(readFileSync(resolve(RACINE, chemin), "utf8"));

/** L'ordre de chargement de l'application : le socle partagé, PUIS le thème du client (en-tête de `theme.css`). */
const FEUILLES = [lire("packages/ui/styles.css"), lire("apps/client/src/app/theme.css")] as const;
const THEME_CLIENT = FEUILLES[1];

/** Les quatre textes accentués de FC-1 (backlog [A11Y][P0] de D264). */
const TEXTES = [".filters-reset", ".range-value", ".results-count-n", ".wz-eyebrow"] as const;
/** Les fonds NEUTRES de chaque thème — la base zinc partagée (`packages/ui/styles.css`). */
const FONDS = ["--bg", "--surface", "--bg-2"] as const;
/** WCAG 2.x, texte de taille normale (les quatre font 12 ou 13 px). */
const SEUIL_AA = 4.5;

interface Regle {
  selecteurs: string[];
  corps: string;
}

/** Les règles d'une feuille : un sélecteur (liste) et son corps. Les règles imbriquées dans un `@media` sont rendues avec leur
 *  propre sélecteur (le préfixe `@media (…) {` ne fait pas partie d'un sélecteur sans accolade). */
function regles(css: string): Regle[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selecteurs: m[1]!.split(",").map((s) => s.trim()),
    corps: m[2]!
  }));
}

function declarations(corps: string): Array<[string, string]> {
  return corps
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.includes(":"))
    .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()] as [string, string]);
}

/** Les tokens d'un thème, dans l'ordre de la cascade : tous les `:root`, puis (en sombre) `:root[data-theme="dark"]`, plus
 *  spécifique — la dernière déclaration gagne, comme dans le navigateur. */
function tokens(theme: "clair" | "sombre"): Map<string, string> {
  const jeu = new Map<string, string>();
  const portees = theme === "clair" ? [":root"] : [":root", ':root[data-theme="dark"]'];
  for (const portee of portees) {
    for (const feuille of FEUILLES) {
      for (const regle of regles(feuille)) {
        if (!regle.selecteurs.includes(portee)) continue;
        for (const [propriete, valeur] of declarations(regle.corps)) if (propriete.startsWith("--")) jeu.set(propriete, valeur);
      }
    }
  }
  return jeu;
}

/** `var(--x)` → la valeur finale, en suivant la chaîne ; une couleur littérale se rend telle quelle. */
function resoudre(valeur: string, jeu: Map<string, string>, profondeur = 0): string {
  const m = /^var\((--[a-z0-9-]+)\)$/.exec(valeur.trim());
  if (m === null) return valeur.trim();
  if (profondeur > 10) throw new Error(`chaîne de tokens trop longue à partir de ${valeur}`);
  const suite = jeu.get(m[1]!);
  if (suite === undefined) throw new Error(`token ${m[1]} introuvable dans le thème`);
  return resoudre(suite, jeu, profondeur + 1);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`couleur attendue en hexadécimal à six chiffres, reçu « ${hex} »`);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Rapport de contraste WCAG 2.x entre deux couleurs. */
function contraste(a: string, b: string): number {
  const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (haut! + 0.05) / (bas! + 0.05);
}

/** Les couleurs de TEXTE d'un sélecteur dans le thème du client (toutes ses règles, `@media` compris). */
function couleursDe(selecteur: string): string[] {
  return regles(THEME_CLIENT)
    .filter((r) => r.selecteurs.includes(selecteur))
    .flatMap((r) => declarations(r.corps).filter(([p]) => p === "color").map(([, v]) => v));
}

describe("FC-1 — l'instrument de contraste (calibration à deux bras)", () => {
  it("bras positif : noir sur blanc rend 21:1, une couleur sur elle-même 1:1 (valeurs de la définition WCAG)", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 6);
    expect(contraste("#777777", "#777777")).toBeCloseTo(1, 6);
  });

  it("bras négatif : `var(--accent)` en clair ÉCHOUE sur `--bg` — la garde sait voir un texte qui ne passe pas", () => {
    const clair = tokens("clair");
    expect(contraste(resoudre("var(--accent)", clair), resoudre("var(--bg)", clair))).toBeLessThan(SEUIL_AA);
  });
});

describe("FC-1 — chaque texte accentué passe AA sur chaque fond neutre, dans les deux thèmes", () => {
  for (const selecteur of TEXTES) {
    it(`${selecteur} : il DÉCLARE une couleur de texte dans theme.css (sinon la garde ne mesurerait rien)`, () => {
      expect(couleursDe(selecteur).length).toBeGreaterThan(0);
    });

    for (const theme of ["clair", "sombre"] as const) {
      it(`${selecteur} — ${theme} : son texte passe AA (≥ 4,5:1) sur --bg, --surface et --bg-2`, () => {
        const jeu = tokens(theme);
        const pires = couleursDe(selecteur).map((couleur) =>
          Math.min(...FONDS.map((fond) => contraste(resoudre(couleur, jeu), resoudre(`var(${fond})`, jeu))))
        );
        expect(Math.min(...pires)).toBeGreaterThanOrEqual(SEUIL_AA);
      });
    }
  }
});
