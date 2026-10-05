// Rang 32 (D325) — LA GARDE : l'indicatif d'un pays n'est écrit QUE dans le modèle de pays (`packages/types/src/phone.ts`).
//
// ⚠ LE DÉFAUT QU'ELLE FERME. Consigne de Ko : « Jamais « +213 » écrit en dur dans un composant. » Avant ce lot, l'indicatif s'écrivait à la main dans
// un `placeholder` (« +213551234567 », un numéro COMPLET et plausible), dans `placeholder="+213…"`, dans un message. Un indicatif recopié ne se vérifie nulle part :
// ajouter un second pays aurait demandé de retoucher chacune de ces copies — et d'oublier la dixième. Il vient du modèle (`PHONE_COUNTRIES`), ou il n'est pas là.
//
// ⚠ COMMENT ELLE LIT (patron de `login-path-guard.test.ts`, D321). Pas une expression sur le texte brut : elle prendrait un COMMENTAIRE qui cite l'indicatif pour une faute
// (S11-a : « une garde de source peut rougir sur un commentaire »). Elle lit l'ARBRE TypeScript et ne regarde que les chaînes, les gabarits et le texte JSX. L'indicatif
// cherché est DÉRIVÉ du modèle — jamais écrit ici — et elle rend ce qu'elle a PARCOURU (D290) : un « zéro » sur zéro fichier n'est pas une mesure.
//
// ⚠ PORTÉE, ÉCRITE : les sources des DEUX applications et de `@zwadj/ui`, HORS tests (`*.test.*`, `*.spec.*`, `test-setup`, `test-support`). Un test peut nommer un
// numéro pour le coller dans un champ ; `packages/types` EST le modèle. Le catalogue (`packages/i18n/messages/*.json`) n'est pas du code : il décrit le format au visiteur.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { PHONE_COUNTRIES } from "@zwadj/types";

const RACINE = resolve(__dirname, "../../../..");
const RACINES = ["apps/client/src", "apps/pro/src", "packages/ui/src"] as const;
const HORS_GARDE = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/])/;

/** Les indicatifs du MODÈLE, avec leur « + » : `+213`. Dérivés — jamais tapés ici. */
const INDICATIFS = Object.values(PHONE_COUNTRIES).map((pays) => pays.dialCode);
const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MOTIF = new RegExp(INDICATIFS.map((i) => echapper(i)).join("|"));

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

/** Les indicatifs écrits dans le CODE d'un fichier — chaînes, gabarits, texte JSX ; jamais un commentaire. */
export function indicatifsEnDur(nom: string, texte: string): Occurrence[] {
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const trouves: Occurrence[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      (ts.isStringLiteral(noeud) ||
        ts.isNoSubstitutionTemplateLiteral(noeud) ||
        ts.isTemplateHead(noeud) ||
        ts.isTemplateMiddle(noeud) ||
        ts.isTemplateTail(noeud) ||
        ts.isJsxText(noeud)) &&
      MOTIF.test(noeud.text)
    ) {
      trouves.push({ ligne: fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier)).line + 1, texte: noeud.text.trim() });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return trouves;
}

describe("L'indicatif d'un pays n'est écrit que dans le modèle de pays — jamais dans un composant", () => {
  it("CALIBRATION, bras positif : une chaîne, un gabarit et un texte JSX qui portent l'indicatif sont VUS", () => {
    const indicatif = INDICATIFS[0] as string;
    expect(indicatifsEnDur("a.ts", `export const x = "${indicatif}551234567";`)).toHaveLength(1);
    expect(indicatifsEnDur("a.ts", `export const x = \`${indicatif}\${n}\`;`)).toHaveLength(1);
    expect(indicatifsEnDur("a.tsx", `export const X = () => <p>${indicatif} suivi de neuf chiffres</p>;`)).toHaveLength(1);
  });

  it("CALIBRATION, bras négatif : un commentaire qui cite l'indicatif, et un fichier qui n'en porte pas, ne sont PAS vus", () => {
    const indicatif = INDICATIFS[0] as string;
    expect(indicatifsEnDur("a.ts", `// le champ affiche ${indicatif} devant\nexport const x = 1;`)).toEqual([]);
    expect(indicatifsEnDur("a.ts", `/* ${indicatif} */ export const x = "bonjour";`)).toEqual([]);
  });

  it("⚠ AUCUNE source de l'application Client, de l'application Pro ni de `@zwadj/ui` n'écrit un indicatif en dur (et la garde a PARCOURU de vrais fichiers)", () => {
    const parcourus: Record<string, number> = {};
    const fautes: string[] = [];
    for (const racine of RACINES) {
      const fichiers = sources(join(RACINE, racine));
      parcourus[racine] = fichiers.length;
      for (const chemin of fichiers) {
        for (const o of indicatifsEnDur(chemin, readFileSync(chemin, "utf8"))) {
          fautes.push(`${relative(RACINE, chemin).replace(/\\/g, "/")}:${o.ligne} « ${o.texte} »`);
        }
      }
    }
    // D290 : ce qu'elle a parcouru s'imprime — chaque racine apporte au moins un fichier, sinon « zéro faute » ne dirait rien.
    for (const racine of RACINES) expect(parcourus[racine], `fichiers parcourus sous ${racine}`).toBeGreaterThan(0);
    expect(fautes).toEqual([]);
  });

  it("le modèle EST écrit quelque part : la garde ne passe pas parce que l'indicatif aurait disparu du dépôt", () => {
    const modele = readFileSync(join(RACINE, "packages/types/src/phone.ts"), "utf8");
    for (const pays of Object.values(PHONE_COUNTRIES)) expect(modele).toContain(`dialCode: "${pays.dialCode}"`);
  });
});
