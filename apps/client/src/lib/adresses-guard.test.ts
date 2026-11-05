// FC-5 (session `front-client`) — LA GARDE : une adresse de PAGE ne s'écrit QUE dans la table de routes de son application.
//
// ⚠ LE DÉFAUT QU'ELLE FERME. D321 a relevé 38 adresses de pages écrites en dur dans le client et 40 dans le pro
// (`docs/preuves/D321/adresses/releve.txt`) ; le rang 29 n'avait mis en constante que la connexion (`LOGIN_PATH`). Une adresse
// recopiée en dur ne se vérifie nulle part : que la page bouge, et chaque copie devient une 404 — en silence (D315 : huit
// semaines). Arbitrage de Ko du 04/10/2026 : un lot « source unique » ; la consigne de FC-5 : « une constante par route ».
//
// ⚠ L'AUTORITÉ N'EST PAS LA TABLE QU'ON VÉRIFIE (sinon la garde se relirait elle-même, D241) : ce sont les pages DÉCLARÉES —
// pour le client, les fichiers `page.tsx` de `src/app/[locale]` (D249 : une garde de routage mesure des fichiers) ; pour le pro,
// les `path` des `<Route>` de `App.tsx` (littéraux, ou constantes résolues dans `routes.ts`). Avant FC-5 la garde rougit sur les
// adresses écrites en dur ; après, sur la moindre qui reviendrait.
//
// ⚠ COMMENT ELLE LIT (patron de `login-path-guard.test.ts`) : l'ARBRE TypeScript — chaînes, gabarits, texte JSX ; jamais un
// commentaire. Une adresse d'une application compte dans les sources des DEUX : le pro lie aux pages du client (CGU,
// confidentialité) par sa propre constante, et réciproquement. Elle rend ce qu'elle a parcouru (D290).
// ⚠ PORTÉE, ÉCRITE : hors tests (`*.test.*`, `*.spec.*`, `test-setup`, `test-support`) ; la page d'accueil `/` n'est pas une
// adresse relevée (D321 ne la relevait pas : la chaîne « / » est partout ailleurs qu'un lien) ; l'attrape-tout `[...rest]` n'est
// pas une page.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { locales } from "@zwadj/i18n";

const RACINE = resolve(__dirname, "../../../..");
const APPLICATIONS = ["apps/client/src", "apps/pro/src"] as const;
/** Les DEUX seuls fichiers où une adresse de page s'écrit. */
const TABLES = ["apps/client/src/lib/routes.ts", "apps/pro/src/routes.ts"] as const;
const HORS_GARDE = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/])/;

export interface Adresses {
  /** Adresses exactes (`/salles`, `/auth/inscription`, `/fr`). */
  fixes: Set<string>;
  /** Préfixes des pages à segment dynamique (`/salles/` pour `/salles/[slug]` ou `/salles/:id`). */
  prefixes: Set<string>;
}

function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...sources(chemin));
    else if (/\.tsx?$/.test(nom) && !HORS_GARDE.test(chemin)) out.push(chemin);
  }
  return out;
}

function ajouter(adresses: Adresses, chemin: string): void {
  const dynamique = chemin.search(/\/(\[|:)/);
  if (dynamique >= 0) adresses.prefixes.add(chemin.slice(0, dynamique + 1));
  else if (chemin !== "/" && chemin !== "*") adresses.fixes.add(chemin);
}

/** Les pages du CLIENT : chaque `page.tsx` sous `src/app/[locale]`, groupes `(…)` retirés, attrape-tout exclu ; plus la racine
 *  de chaque langue (`/fr`, `/ar`), liée par la page 404 racine. */
export function pagesDuClient(): Adresses {
  const adresses: Adresses = { fixes: new Set(), prefixes: new Set() };
  const base = join(RACINE, "apps/client/src/app/[locale]");
  const parcourir = (dossier: string, segments: string[]): void => {
    for (const nom of readdirSync(dossier)) {
      const chemin = join(dossier, nom);
      if (statSync(chemin).isDirectory()) {
        if (nom.startsWith("[...")) continue;
        parcourir(chemin, /^\(.*\)$/.test(nom) ? segments : [...segments, nom]);
      } else if (nom === "page.tsx") {
        ajouter(adresses, `/${segments.join("/")}`);
      }
    }
  };
  parcourir(base, []);
  for (const langue of locales) adresses.fixes.add(`/${langue}`);
  return adresses;
}

function arbre(chemin: string): ts.SourceFile {
  const texte = readFileSync(join(RACINE, chemin), "utf8");
  return ts.createSourceFile(chemin, texte, ts.ScriptTarget.Latest, true, chemin.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

/** Les `export const NOM = "littéral"` d'un fichier, lus dans l'arbre. */
export function constantesLitterales(chemin: string): Map<string, string> {
  const valeurs = new Map<string, string>();
  arbre(chemin).forEachChild((noeud) => {
    if (!ts.isVariableStatement(noeud)) return;
    for (const decl of noeud.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.initializer && ts.isStringLiteral(decl.initializer)) valeurs.set(decl.name.text, decl.initializer.text);
    }
  });
  return valeurs;
}

/** Les pages du PRO : le `path` de chaque `<Route>` de `App.tsx` — littéral, ou identifiant résolu dans `routes.ts`. */
export function pagesDuPro(): Adresses {
  const adresses: Adresses = { fixes: new Set(), prefixes: new Set() };
  const constantes = constantesLitterales("apps/pro/src/routes.ts");
  const visiter = (noeud: ts.Node): void => {
    if (ts.isJsxAttribute(noeud) && noeud.name.getText() === "path" && noeud.initializer) {
      const init = noeud.initializer;
      if (ts.isStringLiteral(init)) ajouter(adresses, init.text);
      else if (ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) {
        const valeur = constantes.get(init.expression.text);
        if (valeur !== undefined) ajouter(adresses, valeur);
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(arbre("apps/pro/src/App.tsx"));
  return adresses;
}

export interface Occurrence {
  ligne: number;
  texte: string;
}

/** Les adresses de page écrites dans le CODE d'un fichier — chaînes, gabarits, texte JSX ; jamais un commentaire. */
export function occurrences(nom: string, texte: string, adresses: Adresses): Occurrence[] {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const trouvees: Occurrence[] = [];
  const visiter = (noeud: ts.Node): void => {
    const estTexte =
      ts.isStringLiteral(noeud) ||
      ts.isNoSubstitutionTemplateLiteral(noeud) ||
      ts.isTemplateHead(noeud) ||
      ts.isTemplateMiddle(noeud) ||
      ts.isTemplateTail(noeud) ||
      ts.isJsxText(noeud);
    if (estTexte) {
      const t = noeud.text.trim();
      // Une adresse se lit seule, ou en TÊTE d'un gabarit (`/salles/${slug}`), ou en QUEUE d'un gabarit qui commence par une
      // origine (`${CLIENT_URL}/fr/cgu`, `${PRO_URL}/auth/connexion`) : on retire un éventuel préfixe de langue.
      // Et une requête ou une ancre (`/salles?${q}`) n'en fait pas partie.
      const sansRequete = t.replace(/[?#].*$/, "");
      const candidats = [t, sansRequete, sansRequete.replace(/^\/(fr|ar)(?=\/)/, "")];
      const touche = candidats.some((c) => adresses.fixes.has(c) || [...adresses.prefixes].some((p) => c.startsWith(p) && c.length >= p.length));
      if (touche) trouvees.push({ ligne: fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier)).line + 1, texte: t });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return trouvees;
}

function union(a: Adresses, b: Adresses): Adresses {
  return { fixes: new Set([...a.fixes, ...b.fixes]), prefixes: new Set([...a.prefixes, ...b.prefixes]) };
}

describe("FC-5 — l'instrument : calibration à deux bras (D286)", () => {
  const adresses: Adresses = { fixes: new Set(["/salles", "/demandes", "/cgu"]), prefixes: new Set(["/salles/"]) };

  it("bras ROUGE : attribut JSX, gabarit, appel, texte JSX, queue de gabarit avec langue — chacun vu", () => {
    const faute = [
      'const a = <Link href="/salles">x</Link>;',
      "const b = `/salles/${slug}`;",
      'navigate("/demandes");',
      "const c = <p>/cgu</p>;",
      "const d = `${CLIENT_URL}/fr/cgu`;",
      "router.push(`/salles?${q}`);"
    ].join("\n");
    expect(occurrences("faute.tsx", faute, adresses).map((o) => o.ligne)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("bras VERT : un commentaire, un chemin d'API, une origine, un voisin — rien", () => {
    const sain = [
      "// visait `/salles` en dur avant FC-5",
      'const e = "/venues/salle-x";',
      'const f = "http://localhost:3000";',
      'const g = "/sallesx";',
      'const h = "Salles";'
    ].join("\n");
    expect(occurrences("sain.tsx", sain, adresses)).toEqual([]);
  });
});

describe("FC-5 — une adresse de page n'est écrite QUE dans la table de routes de son application", () => {
  const adresses = union(pagesDuClient(), pagesDuPro());
  const parcourus = APPLICATIONS.flatMap((app) => sources(join(RACINE, app))).map((p) => relative(RACINE, p).replace(/\\/g, "/"));
  const releve = new Map(parcourus.map((p) => [p, occurrences(p, readFileSync(join(RACINE, p), "utf8"), adresses)]));

  it("le relevé a parcouru les deux applications, et les pages déclarées sont là (D290 : un zéro sur zéro ne mesure rien)", () => {
    for (const app of APPLICATIONS) expect(parcourus.filter((p) => p.startsWith(`${app}/`)).length).toBeGreaterThan(20);
    expect(adresses.fixes.size).toBeGreaterThan(10);
    expect(adresses.prefixes.size).toBeGreaterThan(0);
    // Bras positif SUR L'ARBRE RÉEL : chaque table porte des adresses — le relevé les y voit.
    for (const table of TABLES) expect(releve.get(table)?.length ?? 0).toBeGreaterThan(0);
  });

  it("le pro lie aux pages du CLIENT par des constantes qui NOMMENT ces pages (CGU, confidentialité)", () => {
    const client = constantesLitterales("apps/client/src/lib/routes.ts");
    const pro = constantesLitterales("apps/pro/src/routes.ts");
    expect(client.get("TERMS_PATH")).toBeDefined();
    expect(client.get("PRIVACY_PATH")).toBeDefined();
    expect(pro.get("CLIENT_TERMS_PATH")).toBe(client.get("TERMS_PATH"));
    expect(pro.get("CLIENT_PRIVACY_PATH")).toBe(client.get("PRIVACY_PATH"));
  });

  it("aucune adresse de page hors des deux tables de routes", () => {
    const ailleurs = [...releve]
      .filter(([chemin]) => !(TABLES as readonly string[]).includes(chemin))
      .flatMap(([chemin, occ]) => occ.map((o) => `${chemin}:${o.ligne} « ${o.texte} »`));
    expect(ailleurs).toEqual([]);
  });
});
