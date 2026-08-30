// Lot UI-P1 — garde-fou sur la feuille de styles PARTAGÉE. Il vit dans l'app
// Pro pour la même raison que les tests du ConfirmDialog (décision §5) :
// réutiliser un harnais existant plutôt que d'ajouter une configuration vitest
// à `packages/ui`.
//
// Ce qu'il verrouille, et pourquoi : le reset global de `styles.css` retire
// `background`, `border` et `padding` de TOUT <button>. Une `.btn` qui ne les
// repose pas s'affiche donc comme du texte gras — c'est très exactement le
// défaut corrigé par ce lot (« Enregistrer la visite » invisible). Aucune
// assertion de couleur ici : on ne fige pas une esthétique, on empêche une
// régression fonctionnelle.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));

const CSS = readFileSync(join(ICI, "..", "..", "..", "packages", "ui", "styles.css"), "utf8");

/** La feuille PROPRE à l'app pro (palette D26). */
const THEME = readFileSync(join(ICI, "theme.css"), "utf8");

/** Corps d'une règle CSS, par sélecteur exact, dans la feuille donnée. */
function ruleIn(sheet: string, selector: string): string {
  const start = sheet.indexOf(`\n${selector} {`);
  expect(start, `règle « ${selector} » introuvable`).toBeGreaterThan(-1);
  const open = sheet.indexOf("{", start);
  return sheet.slice(open + 1, sheet.indexOf("}", open));
}

const rule = (selector: string) => ruleIn(CSS, selector);

describe("styles partagés — niveaux de bouton", () => {
  it(".btn NUE est visible : elle repose fond ET filet, que le reset global retire", () => {
    const btn = rule(".btn");
    expect(btn).toMatch(/\bbackground:/);
    expect(btn).toMatch(/\bborder:/);
    expect(btn).toMatch(/\bcolor:/);
  });

  it("les variantes PLEINES reposent leur propre filet : pas de bordure grise sur un bouton accent", () => {
    for (const selector of [".btn-accent", ".btn-danger"]) {
      expect(rule(selector), selector).toMatch(/border-color:/);
    }
  });

  it("le renforcement du filet au survol EXCLUT les variantes pleines", () => {
    // Sans les `:not()`, cette règle reprendrait la bordure de l'accent au
    // survol — un liseré gris autour d'un bouton plein.
    expect(CSS).toContain(".btn:hover:not([disabled]):not(.btn-accent):not(.btn-danger)");
  });

  it("la flèche de retour est MIROITÉE en RTL : en arabe, revenir pointe à droite", () => {
    expect(CSS).toContain('[dir="rtl"] .backlink svg');
    expect(CSS).toContain('[dir="rtl"] .btn svg[data-mirror-rtl]');
  });
});

describe("thème pro — cases à cocher des prestations (R2e)", () => {
  /** ⚠ LE DÉFAUT QUE CE BLOC EMPÊCHE, ET IL EST SÉVÈRE. `appearance: none`
   *  efface le dessin natif du navigateur. Si l'état COCHÉ ne repose pas
   *  lui-même un fond, la case reste un carré vide quoi qu'on clique : le pro
   *  sélectionne ses prestations et ne voit strictement rien changer. C'est la
   *  même famille que le bouton devenu invisible qui a motivé ce fichier —
   *  aucune erreur, aucun test rouge, un écran qui ment.
   *
   *  Aucune assertion d'esthétique ici non plus : on ne fige ni la teinte ni la
   *  taille, seulement le fait qu'un état visible EXISTE. */
  it("la case redessinée rend son état COCHÉ visible : fond ET filet reposés", () => {
    const cochee = ruleIn(THEME, '.wk-service input[type="checkbox"]:checked');
    expect(cochee, "un fond coché est indispensable dès qu'on retire l'apparence native").toMatch(
      /\bbackground:/
    );
    expect(cochee).toMatch(/border-color:/);
  });

  it("la coche elle-même est dessinée, pas seulement le fond", () => {
    // Sans elle, la case cochée serait un aplat plein — lisible, mais moins
    // reconnaissable qu'une coche par quelqu'un qui parcourt vite l'écran.
    const marque = ruleIn(THEME, '.wk-service input[type="checkbox"]:checked::after');
    expect(marque).toMatch(/border-inline-start:/);
    expect(marque).toMatch(/var\(--on-accent\)/);
  });

  /** L'état sélectionné de la LIGNE doit rester distinguable indépendamment de
   *  la case : c'est ce qui se lit du coin de l'œil sur une grille de huit. */
  it("la ligne sélectionnée se distingue par le fond ET la bordure", () => {
    const on = ruleIn(THEME, ".wk-service.is-on");
    expect(on).toMatch(/\bbackground:/);
    expect(on).toMatch(/border-color:/);
  });

  /** ⚠ Le repère de focus ne doit pas partir avec l'apparence native : sans lui,
   *  la navigation au clavier devient invisible sur toute la grille. */
  it("le repère de focus survit à `appearance: none`", () => {
    expect(ruleIn(THEME, ".wk-service:focus-within")).toMatch(/outline:/);
  });
});
