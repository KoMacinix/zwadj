// Carte — lot CA-2 (session « carte »). GARDE DE SOURCE : la bibliothèque de carte ne s'importe qu'à UN endroit, et cet
// endroit ne se charge qu'À LA DEMANDE.
//
// ── Pourquoi une garde de source, et pas un test de rendu ───────────────────
// Ce qui est à tenir (décisions R-1 et R-9) : Leaflet hors du paquet initial des pages, jamais évalué au rendu serveur, et
// aucune requête vers le fournisseur de tuiles tant qu'une carte n'est pas montée. Un `import L from "leaflet"` ajouté
// « pour un type » dans un composant de page défait les trois d'un coup — tout compile, tous les tests de rendu restent
// verts (ils doublent la carte), et chaque visiteur télécharge la bibliothèque. Seule la forme des imports le voit.
//
// Elle lit l'ARBRE TypeScript (jamais un commentaire), dans les deux applications et `@zwadj/ui`, tests compris exclus.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RACINE = resolve(__dirname, "../../../..");
const RACINES = ["apps/client/src", "apps/pro/src", "packages/ui/src"] as const;
const HORS_GARDE = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/]|-test-support\.)/;

/** LE fichier qui a le droit d'importer la bibliothèque. */
const CANEVAS = "packages/ui/src/map/leaflet-canvas.tsx";
/** LE fichier qui a le droit de charger le canevas — par `import()`, jamais autrement. */
const CADRE = "packages/ui/src/map/venue-map.tsx";

function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...sources(chemin));
    else if (/\.tsx?$/.test(nom) && !HORS_GARDE.test(chemin)) out.push(chemin);
  }
  return out;
}

export interface Import {
  /** Ce qui est importé, tel qu'écrit (`leaflet`, `leaflet/dist/leaflet.css`, `./leaflet-canvas`). */
  cible: string;
  /** `statique` : `import … from`, `export … from`, `import "x"` ; `type` : `import type` (effacé à la compilation) ;
   *  `dynamique` : `import("x")` ; `require` : `require("x")`. */
  genre: "statique" | "type" | "dynamique" | "require";
}

/** Tous les imports d'un fichier, lus dans l'arbre — jamais dans un commentaire ni dans une chaîne quelconque. */
export function importsDe(nom: string, texte: string): Import[] {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Import[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (ts.isImportDeclaration(noeud) && ts.isStringLiteral(noeud.moduleSpecifier)) {
      out.push({ cible: noeud.moduleSpecifier.text, genre: noeud.importClause?.isTypeOnly === true ? "type" : "statique" });
    } else if (ts.isExportDeclaration(noeud) && noeud.moduleSpecifier && ts.isStringLiteral(noeud.moduleSpecifier)) {
      out.push({ cible: noeud.moduleSpecifier.text, genre: noeud.isTypeOnly ? "type" : "statique" });
    } else if (ts.isCallExpression(noeud) && noeud.arguments.length === 1) {
      const argument = noeud.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        if (noeud.expression.kind === ts.SyntaxKind.ImportKeyword) out.push({ cible: argument.text, genre: "dynamique" });
        else if (ts.isIdentifier(noeud.expression) && noeud.expression.text === "require") out.push({ cible: argument.text, genre: "require" });
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return out;
}

const estLeaflet = (cible: string): boolean => cible === "leaflet" || cible.startsWith("leaflet/");
const estCanevas = (cible: string): boolean => /(^|\/)leaflet-canvas(\.tsx?)?$/.test(cible);

describe("La bibliothèque de carte ne s'importe qu'à un endroit, chargé à la demande", () => {
  it("CALIBRATION, bras positif : import statique, import de la feuille de style, `import()`, `require`, `export … from` sont VUS, chacun sous SON genre", () => {
    expect(importsDe("a.ts", `import L from "leaflet";`)).toEqual([{ cible: "leaflet", genre: "statique" }]);
    expect(importsDe("a.ts", `import "leaflet/dist/leaflet.css";`)).toEqual([{ cible: "leaflet/dist/leaflet.css", genre: "statique" }]);
    expect(importsDe("a.ts", `const m = () => import("./leaflet-canvas");`)).toEqual([{ cible: "./leaflet-canvas", genre: "dynamique" }]);
    expect(importsDe("a.ts", `const L = require("leaflet");`)).toEqual([{ cible: "leaflet", genre: "require" }]);
    expect(importsDe("a.ts", `export { default } from "./leaflet-canvas";`)).toEqual([{ cible: "./leaflet-canvas", genre: "statique" }]);
    expect(importsDe("a.ts", `import type { Map } from "leaflet";`)).toEqual([{ cible: "leaflet", genre: "type" }]);
  });

  it("CALIBRATION, bras négatif : un commentaire et une chaîne quelconque qui nomment la bibliothèque ne sont PAS des imports", () => {
    expect(importsDe("a.ts", `// import L from "leaflet";\nexport const x = 1;`)).toEqual([]);
    expect(importsDe("a.ts", `/* import("./leaflet-canvas") */ export const nom = "leaflet";`)).toEqual([]);
  });

  it("⛔ UN SEUL fichier importe Leaflet, et il existe (la garde a PARCOURU de vrais fichiers)", () => {
    const parcourus: Record<string, number> = {};
    const importeurs: string[] = [];
    for (const racine of RACINES) {
      const fichiers = sources(join(RACINE, racine));
      parcourus[racine] = fichiers.length;
      for (const chemin of fichiers) {
        // ⚠ Un `import type` de Leaflet est compté AUSSI : il est effacé à la compilation, mais il est le premier pas vers
        // un import de valeur, et rien hors du canevas n'a besoin des types de la bibliothèque.
        if (importsDe(chemin, readFileSync(chemin, "utf8")).some((i) => estLeaflet(i.cible))) {
          importeurs.push(relative(RACINE, chemin).replace(/\\/g, "/"));
        }
      }
    }
    for (const racine of RACINES) expect(parcourus[racine], `fichiers parcourus sous ${racine}`).toBeGreaterThan(0);
    expect(importeurs).toEqual([CANEVAS]);
  });

  it("⛔ le canevas n'est chargé que par `import()`, et seulement depuis le cadre ; ailleurs, au plus ses TYPES", () => {
    const chargements: string[] = [];
    for (const racine of RACINES) {
      for (const chemin of sources(join(RACINE, racine))) {
        const nom = relative(RACINE, chemin).replace(/\\/g, "/");
        for (const i of importsDe(chemin, readFileSync(chemin, "utf8"))) {
          if (estCanevas(i.cible) && i.genre !== "type") chargements.push(`${nom} — ${i.genre}`);
        }
      }
    }
    expect(chargements).toEqual([`${CADRE} — dynamique`]);
  });
});
