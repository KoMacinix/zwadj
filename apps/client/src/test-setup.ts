import "@testing-library/jest-dom/vitest";

// GARDE DES SORTIES DE TEST — lot S7 (audit F8).
//
// ⚠ POURQUOI UNE SUITE VERTE MAIS BRUYANTE EST UN PROBLÈME.
// Un `console.error` de React — « An update … was not wrapped in act(...) » —
// signale un état mis à jour APRÈS la fin du test. C'est le symptôme exact
// d'une régression asynchrone : une requête qui se résout trop tard, un effet
// qui court après le démontage. Tant que la sortie en contient cent, personne
// ne verra la cent-unième, celle qui compte. La suite reste verte, et le signal
// se noie.
//
// ⚠ CETTE GARDE NE NETTOIE PAS LE PASSÉ, ELLE FERME L'AVENIR. Les fichiers
// déjà bruyants sont EXEMPTÉS nommément, avec leur compte et leur date. Un
// fichier neuf, ou un fichier corrigé, n'a droit à aucun bruit : le premier
// avertissement le fait tomber. C'est le contraire d'un objectif de propreté
// général — c'est une borne qui ne recule pas.
//
// ⚠ POURQUOI ON N'ÉCHOUE PAS DANS `console.error` LUI-MÊME. Lever depuis le
// `console.error` que React appelle interromprait React au milieu de son
// propre rendu, et produirait une erreur qui ne ressemble à rien. On COLLECTE
// pendant le test, et on juge dans le `afterEach` — là où l'échec est lisible
// et attribuable au bon test.
import { afterEach, beforeEach, expect } from "vitest";

/**
 * ⚠ LISTE D'EXEMPTIONS — À FAIRE DÉCROÎTRE, JAMAIS CROÎTRE.
 *
 * Comptes relevés le 22/08/2026, lot S7. Ajouter une entrée ici revient à
 * accepter du bruit neuf : que ce soit un geste explicite, daté, et discuté.
 * Retirer une entrée est en revanche toujours bienvenu — le fichier devient
 * alors gardé comme les autres.
 */
const EXEMPTES: Record<string, string> = {
  "src/components/venue/venue-detail-view.test.tsx": "38 avertissements act(…) — relevés le 22/08/2026 (lot S7)",
  "src/components/venue/booking-request-panel.test.tsx": "5 avertissements act(…) — relevés le 22/08/2026 (lot S7)",
  "src/components/filter-wizard.test.tsx": "2 avertissements act(…) — relevés le 22/08/2026 (lot S7)",
  "src/components/auth/google-signin.test.tsx": "1 avertissements act(…) — relevés le 22/08/2026 (lot S7)"
};

/** Motifs tolérés partout : ils ne signalent pas un état tardif. */
const TOLERES: RegExp[] = [
  // jsdom ne sait pas naviguer ; ce n'est pas un défaut du composant.
  /Not implemented: navigation/i
];

let captures: string[] = [];
let restaurer: (() => void) | null = null;

beforeEach(() => {
  captures = [];
  const originaux = { error: console.error, warn: console.warn };
  const collecte =
    (canal: "error" | "warn") =>
    (...args: unknown[]) => {
      const texte = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
      if (!TOLERES.some((motif) => motif.test(texte))) captures.push(texte);
      // On laisse passer la sortie d'origine : la garde ne masque rien, elle
      // ajoute un verdict.
      originaux[canal](...args);
    };
  console.error = collecte("error");
  console.warn = collecte("warn");
  restaurer = () => {
    console.error = originaux.error;
    console.warn = originaux.warn;
  };
});

afterEach(() => {
  restaurer?.();
  restaurer = null;
  if (captures.length === 0) return;

  // `testPath` est absolu : on compare sur la fin du chemin, pour que la liste
  // reste lisible et indépendante de l'endroit où le dépôt est cloné.
  const chemin = (expect.getState().testPath ?? "").replace(/\\/g, "/");
  const exempte = Object.keys(EXEMPTES).find((suffixe) => chemin.endsWith(suffixe));
  if (exempte) return;

  const apercu = captures.slice(0, 3).map((c) => `  · ${c.split("\n")[0]}`).join("\n");
  throw new Error(
    `${captures.length} avertissement(s) de console dans un fichier NON exempté.\n` +
      `${apercu}\n` +
      "Un « not wrapped in act(...) » signale un état mis à jour APRÈS la fin du test — " +
      "corrigez-le, ou justifiez une exemption datée dans le fichier de préparation."
  );
});
