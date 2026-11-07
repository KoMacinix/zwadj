// FC-5 (session `front-client`) — LA SEMAINE ALGÉRIENNE A UNE SEULE DÉFINITION, et les deux calendriers l'importent.
//
// ⚠ ARBITRAGE DE KO DU 04/10/2026 : « Le week-end : une seule définition, partagée par le client et le pro. » `WEEK_START_DAY` et
// `WEEKEND_DAYS` étaient DÉCLARÉES deux fois (`apps/client/src/lib/calendar.ts`, `apps/pro/src/venues/pro-calendar.ts`). Elles
// vivent désormais dans `packages/types/src/week.ts` ; cette garde rougit si l'un des deux calendriers en redéclare une, ou cesse
// de les importer de `@zwadj/types`. La VALEUR (dimanche ; vendredi-samedi ; jamais la locale, D56) est mesurée par les deux specs
// de calendrier, qui s'y confrontent.
// ⚠ Elle lit l'ARBRE TypeScript (une déclaration, un import) — jamais un commentaire qui citerait le nom.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const RACINE = resolve(__dirname, "../../../..");
const AUTORITE = "packages/types/src/week.ts";
const CALENDRIERS = ["apps/client/src/lib/calendar.ts", "apps/pro/src/venues/pro-calendar.ts"] as const;
const NOMS = ["WEEK_START_DAY", "WEEKEND_DAYS"] as const;

function arbre(chemin: string): ts.SourceFile {
  return ts.createSourceFile(chemin, readFileSync(resolve(RACINE, chemin), "utf8"), ts.ScriptTarget.Latest, true);
}

/** Les noms DÉCLARÉS (`const NOM = …`) au premier niveau d'un fichier. */
export function declares(fichier: ts.SourceFile): string[] {
  const noms: string[] = [];
  fichier.forEachChild((noeud) => {
    if (!ts.isVariableStatement(noeud)) return;
    for (const decl of noeud.declarationList.declarations) if (ts.isIdentifier(decl.name)) noms.push(decl.name.text);
  });
  return noms;
}

/** Les noms importés d'un module donné. */
export function importes(fichier: ts.SourceFile, module: string): string[] {
  const noms: string[] = [];
  fichier.forEachChild((noeud) => {
    if (!ts.isImportDeclaration(noeud) || !ts.isStringLiteral(noeud.moduleSpecifier) || noeud.moduleSpecifier.text !== module) return;
    const liaisons = noeud.importClause?.namedBindings;
    if (liaisons && ts.isNamedImports(liaisons)) for (const el of liaisons.elements) noms.push((el.propertyName ?? el.name).text);
  });
  return noms;
}

describe("FC-5 — l'instrument (calibration à deux bras, D286)", () => {
  it("bras ROUGE : une déclaration se voit ; bras VERT : un commentaire ne se voit pas, un import se voit comme un import", () => {
    const faute = ts.createSourceFile("f.ts", "export const WEEK_START_DAY = 0;\n", ts.ScriptTarget.Latest, true);
    expect(declares(faute)).toEqual(["WEEK_START_DAY"]);
    const sain = ts.createSourceFile("s.ts", '// WEEK_START_DAY = 0\nimport { WEEKEND_DAYS } from "@zwadj/types";\n', ts.ScriptTarget.Latest, true);
    expect(declares(sain)).toEqual([]);
    expect(importes(sain, "@zwadj/types")).toEqual(["WEEKEND_DAYS"]);
  });
});

describe("FC-5 — la semaine algérienne : une définition, deux consommateurs", () => {
  it("l'autorité déclare les deux constantes", () => {
    // Le fichier d'abord, en assertion : avant FC-5 il n'existe pas, et le rouge doit se lire comme une ASSERTION (D304).
    expect(existsSync(resolve(RACINE, AUTORITE))).toBe(true);
    expect(declares(arbre(AUTORITE)).filter((n) => (NOMS as readonly string[]).includes(n)).sort()).toEqual([...NOMS].sort());
  });

  for (const calendrier of CALENDRIERS) {
    it(`${calendrier} ne redéclare ni WEEK_START_DAY ni WEEKEND_DAYS`, () => {
      expect(declares(arbre(calendrier)).filter((n) => (NOMS as readonly string[]).includes(n))).toEqual([]);
    });

    it(`${calendrier} les importe de @zwadj/types`, () => {
      expect(importes(arbre(calendrier), "@zwadj/types").filter((n) => (NOMS as readonly string[]).includes(n)).sort()).toEqual([...NOMS].sort());
    });
  }
});
