// FC-6 (session `front-client`) — LES DATES ET LES NOMBRES SE METTENT EN FORME DANS LA LANGUE DE LA PAGE, PAR UNE SEULE RÈGLE —
// une garde de SOURCE, universelle.
//
// ⚠ L'ARBITRAGE (Ko, 04/10/2026, mot pour mot) : « Les dates et les nombres en arabe se formatent en ar-DZ. Le catalogue et les
// routes restent ar. » Relevé navigateur d'abord (`docs/preuves/front-client/FC-6/releve-ar-dz.txt`) : `ar` nomme août « أغسطس »,
// `ar-DZ` « أوت », le nom qu'on lit en Algérie. La règle est `intlLocale` (`@zwadj/types`) ; elle ne vaut que si on lui donne la
// langue : au SHA de départ, des montants s'affichaient en français au milieu d'une page arabe, et deux écrans de compte datent
// une demande dans la langue — et le fuseau — du NAVIGATEUR.
//
// ⚠ CE QU'ELLE EXIGE, dans les sources des DEUX applications et des paquets qu'elles affichent (hors tests) — lu dans l'ARBRE
// TypeScript, jamais dans un commentaire :
//   1. tout `formatDZD(…)` et tout `formatRating(…)` reçoit DEUX arguments (le nombre, la langue) — leur langue par défaut est le
//      français, et c'est ce défaut qui rendait la faute silencieuse ;
//   2. tout `new Intl.DateTimeFormat(…)` et tout `new Intl.NumberFormat(…)` reçoit en premier argument un appel à `intlLocale(…)` ;
//   3. tout `new Intl.DateTimeFormat(…)` porte un `timeZone` explicite (D48 : jamais celui de la machine) ;
//   4. aucun `toLocaleDateString(` / `toLocaleTimeString(` / `toLocaleString(` : sans argument ils prennent la langue et le fuseau
//      du NAVIGATEUR ; l'heure ne se met jamais en forme par `Intl` (D57 : `formatWallClock`).
// ⚠ HORS DE SA PORTÉE, écrit pour ne pas se lire comme tenu : `apps/api` (le PDF du devis écrit la même règle en ligne pour ses
// dates ; hors de cette session). Le CHOIX de la langue passée n'est pas lu ici (un `"fr"` écrit en dur passerait la règle 1) :
// les tests de rendu en arabe le mesurent, et les montants d'un DEVIS passent `QUOTE_AMOUNT_LOCALE` à dessein (D326, décision 1).
// Elle rend ce qu'elle a parcouru (D290).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const RACINE = resolve(__dirname, "../../../..");
const SOURCES = ["apps/client/src", "apps/pro/src", "packages/ui/src", "packages/i18n/src", "packages/types/src"] as const;
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

type Regle =
  | "montant ou note sans langue"
  | "formateur Intl sans intlLocale"
  | "date sans fuseau explicite"
  | "toLocale…String";

export interface Faute {
  ligne: number;
  regle: Regle;
}

function estIntl(n: ts.NewExpression, nom: "DateTimeFormat" | "NumberFormat"): boolean {
  return (
    ts.isPropertyAccessExpression(n.expression) &&
    ts.isIdentifier(n.expression.expression) &&
    n.expression.expression.text === "Intl" &&
    n.expression.name.text === nom
  );
}

function porteUnFuseau(options: ts.Expression | undefined): boolean {
  if (options === undefined || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some(
    (p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name !== undefined && ts.isIdentifier(p.name) && p.name.text === "timeZone"
  );
}

export function fautes(nom: string, texte: string): Faute[] {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Faute[] = [];
  const ligne = (n: ts.Node) => fichier.getLineAndCharacterOfPosition(n.getStart(fichier)).line + 1;
  const visiter = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^format(DZD|Rating)$/.test(n.expression.text) && n.arguments.length < 2) {
      out.push({ ligne: ligne(n), regle: "montant ou note sans langue" });
    }
    if (ts.isNewExpression(n) && (estIntl(n, "DateTimeFormat") || estIntl(n, "NumberFormat"))) {
      const premier = n.arguments?.[0];
      const parLaRegle =
        premier !== undefined && ts.isCallExpression(premier) && ts.isIdentifier(premier.expression) && premier.expression.text === "intlLocale";
      if (!parLaRegle) out.push({ ligne: ligne(n), regle: "formateur Intl sans intlLocale" });
      if (estIntl(n, "DateTimeFormat") && !porteUnFuseau(n.arguments?.[1])) out.push({ ligne: ligne(n), regle: "date sans fuseau explicite" });
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^toLocale(Date|Time)?String$/.test(n.expression.name.text)) {
      out.push({ ligne: ligne(n), regle: "toLocale…String" });
    }
    ts.forEachChild(n, visiter);
  };
  visiter(fichier);
  return out;
}

describe("FC-6 — l'instrument (calibration à deux bras, D286)", () => {
  it("bras ROUGE : les quatre fautes se voient, chacune à sa ligne", () => {
    const faute = [
      "const a = formatDZD(cents);",
      'const b = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });',
      'const c = new Intl.DateTimeFormat(intlLocale(locale), { month: "long" });',
      "const d = new Date().toLocaleDateString();",
      "const e = formatRating(4.9);",
      'const f = new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : "fr-DZ");'
    ].join("\n");
    expect(fautes("f.ts", faute).map((f) => `${f.ligne}:${f.regle}`)).toEqual([
      "1:montant ou note sans langue",
      "2:formateur Intl sans intlLocale",
      "3:date sans fuseau explicite",
      "4:toLocale…String",
      "5:montant ou note sans langue",
      "6:formateur Intl sans intlLocale"
    ]);
  });

  it("bras VERT : la langue donnée, la règle employée, le fuseau écrit, un commentaire — rien", () => {
    const sain = [
      'const a = formatDZD(cents, locale === "ar" ? "ar" : "fr");',
      'const b = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", timeZone: "UTC" });',
      "const c = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 });",
      "const d = formatDZD(cents, QUOTE_AMOUNT_LOCALE);",
      "// new Intl.DateTimeFormat(locale), formatDZD(x) et x.toLocaleDateString() cités en commentaire"
    ].join("\n");
    expect(fautes("s.ts", sain)).toEqual([]);
  });
});

describe("FC-6 — la langue de la page passe à chaque formateur de date et de nombre", () => {
  const parcourus = SOURCES.flatMap((d) => sources(join(RACINE, d))).map((p) => relative(RACINE, p).replace(/\\/g, "/"));

  it("le relevé a parcouru les deux applications et les paquets (D290 : un zéro sur zéro ne mesure rien)", () => {
    for (const app of ["apps/client/src", "apps/pro/src"]) expect(parcourus.filter((p) => p.startsWith(`${app}/`)).length).toBeGreaterThan(20);
    for (const paquet of ["packages/ui/src", "packages/i18n/src", "packages/types/src"]) {
      expect(parcourus.filter((p) => p.startsWith(`${paquet}/`)).length).toBeGreaterThan(0);
    }
  });

  it("aucun formateur de date ou de nombre ne choisit sa langue — ni son fuseau — tout seul", () => {
    const toutes = parcourus.flatMap((p) => fautes(p, readFileSync(join(RACINE, p), "utf8")).map((f) => `${p}:${f.ligne} — ${f.regle}`));
    expect(toutes).toEqual([]);
  });
});
