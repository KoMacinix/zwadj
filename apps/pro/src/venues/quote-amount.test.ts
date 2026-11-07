// FC-6 (session `front-client`) — LES MONTANTS D'UN DEVIS S'AFFICHENT COMME LE PDF LES IMPRIME, ET C'EST LE PDF QUI DÉCIDE.
//
// ⛔ DEUX DÉCISIONS SE RENCONTRENT ICI, et ce lot ne tranche pas entre elles :
//   · Ko, 04/10/2026, mot pour mot : « Les dates et les nombres en arabe se formatent en ar-DZ. » ;
//   · D326 (rang 33), décision 1 du relecteur : un devis imprimé ne doit pas être « différent de celui affiché à l'écran » — et le
//     PDF (`apps/api/src/documents/quote-document.ts`) imprime ses montants par `formatDZD(cents)` SANS langue, le format français,
//     même dans une page arabe (« DA 189 000 », regardé par Ko).
// Passer l'écran du devis en `ar-DZ` sans le PDF ferait mentir la seconde ; passer le PDF exige `apps/api`, hors de cette session.
// ⇒ L'écran du devis passe `QUOTE_AMOUNT_LOCALE` (`@zwadj/types`), et cette garde la CONFRONTE au PDF : le jour où le PDF passe une
// langue, elle rougit, et l'écran suit. La décision (l'écran ET le PDF en `ar-DZ`, ensemble) est due à Ko.
// ⚠ Lue dans l'ARBRE TypeScript (des appels, jamais un commentaire). La constante est lue PAR SON NOM : absente (avant FC-6), le
// rouge se lit en ASSERTION (D304).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import * as types from "@zwadj/types";

const RACINE = resolve(__dirname, "../../../..");
const PDF = "apps/api/src/documents/quote-document.ts";
/** Les écrans qui affichent les montants d'un DEVIS : le récapitulatif du devis au comptoir, et la liste des devis d'une salle. */
const ECRANS_DU_DEVIS = ["apps/pro/src/dashboard/walkin-journey.tsx", "apps/pro/src/venues/quotes-section.tsx"] as const;

const LANGUE_DU_DEVIS = (types as Record<string, unknown>).QUOTE_AMOUNT_LOCALE as "fr" | "ar" | undefined;

/** Les appels `formatDZD(…)` d'un fichier : le nombre d'arguments, et le texte du second s'il existe. */
export function appels(nom: string, texte: string): Array<{ arguments: number; langue: string | null }> {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Array<{ arguments: number; langue: string | null }> = [];
  const visiter = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "formatDZD") {
      out.push({ arguments: n.arguments.length, langue: n.arguments[1]?.getText(fichier) ?? null });
    }
    ts.forEachChild(n, visiter);
  };
  visiter(fichier);
  return out;
}

const lire = (chemin: string) => readFileSync(resolve(RACINE, chemin), "utf8");

describe("FC-6 — l'instrument (calibration à deux bras, D286)", () => {
  it("bras rouge : un appel sans langue se voit ; bras vert : un commentaire ne se voit pas, la langue se lit", () => {
    expect(appels("f.ts", "const a = formatDZD(cents);")).toEqual([{ arguments: 1, langue: null }]);
    expect(appels("s.ts", "// formatDZD(x)\nconst b = formatDZD(cents, QUOTE_AMOUNT_LOCALE);")).toEqual([{ arguments: 2, langue: "QUOTE_AMOUNT_LOCALE" }]);
  });
});

describe("FC-6 — l'écran du devis met ses montants en forme comme le PDF les imprime (D326, décision 1)", () => {
  it("le PDF imprime ses montants par `formatDZD` SANS langue — relu dans sa source", () => {
    const pdf = appels(PDF, lire(PDF));
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.filter((a) => a.arguments !== 1)).toEqual([]);
  });

  it("`QUOTE_AMOUNT_LOCALE` existe et rend ce que rend le PDF (le défaut de `formatDZD`)", () => {
    expect(LANGUE_DU_DEVIS).toBeDefined();
    // Calibration : un montant que les deux langues mettent en forme DIFFÉREMMENT, sinon l'égalité ne distingue rien.
    expect(types.formatDZD(18_900_000, "ar")).not.toBe(types.formatDZD(18_900_000, "fr"));
    expect(types.formatDZD(18_900_000, LANGUE_DU_DEVIS)).toBe(types.formatDZD(18_900_000));
  });

  for (const ecran of ECRANS_DU_DEVIS) {
    it(`${ecran} : chaque montant du devis passe \`QUOTE_AMOUNT_LOCALE\``, () => {
      const vus = appels(ecran, lire(ecran));
      expect(vus.length).toBeGreaterThan(0);
      expect(vus.filter((a) => a.langue !== "QUOTE_AMOUNT_LOCALE")).toEqual([]);
    });
  }
});
