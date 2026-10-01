// Rang 29 (D321) — LA GARDE : l'adresse de connexion n'est écrite QUE dans la constante de chaque application.
//
// ⚠ LE DÉFAUT QU'ELLE FERME. Le panneau de demande visait `/connexion`, la page est `/auth/connexion` : une 404 pour le
// visiteur qu'on veut faire entrer, huit semaines, aucun test ne le voyait (D315). Le rang 25 a créé `LOGIN_PATH` pour CE
// lien-là ; neuf autres écrivaient encore l'adresse en dur dans le client, et autant dans le pro. Un chemin recopié
// en dur ne se vérifie nulle part : le jour où la page bouge, chaque copie devient une 404 — en silence.
//
// ⚠ COMMENT ELLE LIT (modes de défaillance P-a, P-d du point d'entrée du rang 29). Pas une expression sur le texte brut :
// elle prendrait un COMMENTAIRE qui cite l'ancienne adresse pour une faute (S11-a : « une garde de source peut rougir sur
// un commentaire »), et un retrait naïf des `//` couperait aussi `"http://…"`. Elle lit l'ARBRE TypeScript et ne
// regarde que les chaînes, les gabarits (`${PRO_URL}/auth/connexion` : la queue du gabarit) et le texte JSX. Elle rend
// aussi ce qu'elle a PARCOURU (D290) : un « zéro » sur zéro fichier n'est pas une mesure.
//
// ⚠ PORTÉE, ÉCRITE : les sources des DEUX applications, HORS tests (`*.test.*`, `*.spec.*`, `test-setup`, `test-support`).
// Un test qui rend la page de connexion doit pouvoir la nommer ; le relevé des adresses écrites dans les tests est au
// rapport de D321, pas sous cette garde.
//
// ⚠ Elle vit dans le client et lit aussi le pro : UNE garde, UN motif, UNE liste de constantes — deux copies divergeraient
// (D78). Elle vérifie enfin que le lien du client vers la connexion PRO vise la route du pro (P-c).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { LOGIN_PATH } from "./routes";

/** Racine du dépôt, dérivée de l'emplacement de CE fichier (idiome de `routes.test.ts`). */
const RACINE = resolve(__dirname, "../../../..");
const APPLICATIONS = ["apps/client/src", "apps/pro/src"] as const;
/** Les DEUX seuls fichiers où l'adresse s'écrit. */
const CONSTANTES = ["apps/client/src/lib/routes.ts", "apps/pro/src/routes.ts"] as const;
/** `/auth/connexion`, et l'ancienne cible fautive `/connexion` ; pas `déconnexion`, pas `/connexion-…`. */
const ADRESSE = /\/(?:auth\/)?connexion(?![\w-])/;

const HORS_GARDE = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/])/;

function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...sources(chemin));
    else if (/\.tsx?$/.test(nom) && !HORS_GARDE.test(chemin)) out.push(chemin);
  }
  return out;
}

export interface Occurrence {
  ligne: number;
  texte: string;
}

/** Les adresses de connexion écrites dans le CODE d'un fichier — chaînes, gabarits, texte JSX ; jamais un commentaire. */
export function adressesDeConnexion(nom: string, texte: string): Occurrence[] {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const trouvees: Occurrence[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      (ts.isStringLiteral(noeud) ||
        ts.isNoSubstitutionTemplateLiteral(noeud) ||
        ts.isTemplateHead(noeud) ||
        ts.isTemplateMiddle(noeud) ||
        ts.isTemplateTail(noeud) ||
        ts.isJsxText(noeud)) &&
      ADRESSE.test(noeud.text)
    ) {
      trouvees.push({ ligne: fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier)).line + 1, texte: noeud.text.trim() });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return trouvees;
}

/** La valeur littérale de `export const LOGIN_PATH = "…"` d'un fichier, lue dans l'arbre — pas par une expression. */
function valeurDeLoginPath(chemin: string): string | null {
  const fichier = ts.createSourceFile(chemin, readFileSync(chemin, "utf8"), ts.ScriptTarget.Latest, true);
  let valeur: string | null = null;
  fichier.forEachChild((noeud) => {
    if (!ts.isVariableStatement(noeud)) return;
    for (const decl of noeud.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === "LOGIN_PATH" && decl.initializer && ts.isStringLiteral(decl.initializer)) {
        valeur = decl.initializer.text;
      }
    }
  });
  return valeur;
}

describe("LOGIN_PATH — calibration du relevé, deux bras (D286)", () => {
  it("bras ROUGE : un littéral posé ailleurs se voit — attribut JSX, gabarit, texte JSX, ancienne cible", () => {
    const faute = [
      'const a = <Link href="/auth/connexion">x</Link>;',
      "const b = `${PRO_URL}/auth/connexion`;",
      "const c = <p>/auth/connexion</p>;",
      'navigate("/connexion");'
    ].join("\n");
    expect(adressesDeConnexion("faute.tsx", faute).map((o) => o.ligne)).toEqual([1, 2, 3, 4]);
  });

  it("bras VERT : un commentaire qui la cite, une déconnexion, un chemin voisin — rien", () => {
    const sain = [
      "// visait `/connexion`, une 404 (D315)",
      "/* href=\"/auth/connexion\" */",
      'const d = "/auth/deconnexion";',
      'const e = "Déconnexion";',
      'const f = "/auth/connexion-oubliee";',
      'const g = "http://localhost:5173";'
    ].join("\n");
    expect(adressesDeConnexion("sain.tsx", sain)).toEqual([]);
  });
});

describe("LOGIN_PATH — l'adresse de connexion n'est écrite QUE dans la constante (rang 29, D321)", () => {
  const parcourus = APPLICATIONS.flatMap((app) => sources(join(RACINE, app))).map((p) => relative(RACINE, p).replace(/\\/g, "/"));
  const releve = new Map(parcourus.map((p) => [p, adressesDeConnexion(p, readFileSync(join(RACINE, p), "utf8"))]));

  it("le relevé a parcouru les deux applications et y a trouvé leurs constantes (D290 : un zéro sur zéro ne mesure rien)", () => {
    for (const app of APPLICATIONS) expect(parcourus.filter((p) => p.startsWith(`${app}/`)).length).toBeGreaterThan(20);
    for (const constante of CONSTANTES) {
      expect(parcourus).toContain(constante);
      // Bras positif SUR L'ARBRE RÉEL : le relevé voit l'adresse là où elle DOIT être, une fois.
      expect(releve.get(constante)?.length).toBe(1);
    }
  });

  it("P-a : aucune adresse de connexion ailleurs que dans les deux constantes", () => {
    const ailleurs = [...releve]
      .filter(([chemin]) => !(CONSTANTES as readonly string[]).includes(chemin))
      .flatMap(([chemin, occ]) => occ.map((o) => `${chemin}:${o.ligne} « ${o.texte} »`));
    expect(ailleurs).toEqual([]);
  });

  it("P-c : le lien du client vers la connexion PRO vise la route que le pro déclare", () => {
    const pro = join(RACINE, "apps/pro/src/routes.ts");
    expect(existsSync(pro)).toBe(true);
    // Le client construit `${PRO_URL}${LOGIN_PATH}` : il n'a de sens que si les deux applications nomment la même page.
    expect(valeurDeLoginPath(pro)).toBe(LOGIN_PATH);
  });
});
