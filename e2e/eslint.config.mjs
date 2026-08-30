import base from "@zwadj/config/eslint/base";

/**
 * ⚠ CE PROJET LINTE `.` ET NON `src` — il n'a pas de `src` : ses sources sont
 * `specs/`, `fixtures/` et deux fichiers de configuration à la racine. La
 * conséquence est qu'`eslint` avale aussi ce que Playwright ÉCRIT :
 * `playwright-report/` (rapport HTML et ses bundles) et `test-results/`
 * (captures, traces). Mesuré : 2 934 erreurs, toutes sur du JavaScript minifié
 * — « double négation redondante » en colonne 11236 n'est pas un défaut de
 * code, c'est un défaut de périmètre. Et un lint qui crie 2 934 fois pour rien
 * finit par ne plus être lu du tout.
 *
 * ⚠ Ces trois dossiers sont AUSSI dans `.gitignore` depuis la même correction :
 * ils n'étaient couverts nulle part et seraient partis au dépôt.
 *
 * Un objet ne portant QUE `ignores` vaut ignore GLOBAL en configuration plate —
 * c'est ce qui le distingue d'un simple bloc de configuration.
 */
export default [{ ignores: ["playwright-report/**", "test-results/**", "blob-report/**"] }, ...base];
