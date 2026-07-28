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

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "ui", "styles.css"),
  "utf8"
);

/** Corps d'une règle CSS, par sélecteur exact. */
function rule(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`);
  expect(start, `règle « ${selector} » introuvable`).toBeGreaterThan(-1);
  const open = CSS.indexOf("{", start);
  return CSS.slice(open + 1, CSS.indexOf("}", open));
}

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
