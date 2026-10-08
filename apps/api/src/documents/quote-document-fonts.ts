// Les polices du document — lues sur DISQUE, dans le dépôt, et injectées dans le HTML. Rang 33 (D326), décisions 3 et 5 du relecteur.
//
// ⛔ POURQUOI INJECTÉES ET PAS RÉFÉRENCÉES. Le navigateur de rendu a son RÉSEAU BLOQUÉ (`playwright-pdf.renderer.ts`, garde 2) : une police ne peut
// pas venir d'une adresse. Elle voyage DANS le document, en `data:` (qui n'est pas une requête réseau) — mesuré par la preuve de l'arabe
// (`docs/preuves/D326/arabe/`) : 0 requête interceptée, police embarquée dans le PDF.
//
// ⚠ LES PLAGES `unicode-range` — CE QUI EST MESURÉ, ET CE QUI NE L'EST PAS. Les fichiers sont les sous-ensembles « arabic » et « latin » de Readex Pro, et les plages
// sont celles de ces sous-ensembles chez Google Fonts : la preuve de l'arabe a montré qu'AVEC elles aucune autre police n'entre dans le PDF — le test d'intégration le rejoue.
// ⛔ Ce commentaire disait aussi « sans plage, l'arabe retomberait sur une police système » : SANS PIÈCE. Mesuré ensuite (`neutralisation/neutralize-r33.py`, cible F-1), le même
// test d'intégration reste VERT dans Chromium SANS les plages — leur NÉCESSITÉ n'est donc PAS établie, et l'affirmation est retirée. Elles restent parce que c'est la forme
// standard de ces sous-ensembles et que le comportement d'un autre moteur n'est pas mesuré ; seule leur PRÉSENCE est gardée (`quote-document.spec.ts`).
//
// Lecture paresseuse puis mémoire : quatre fichiers (~50 Ko), lus une fois.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PLAGES = {
  arabic:
    "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EFD-10EFF, U+1EE00-1EEFF",
  latin:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
} as const;

export const DOCUMENT_FONT_FAMILY = "Readex Pro";
export const DOCUMENT_FONT_WEIGHTS = [400, 600] as const;
export const DOCUMENT_FONT_SUBSETS = ["arabic", "latin"] as const;

let memoire: string | undefined;

/** Le bloc `@font-face` des quatre faces (deux sous-ensembles × deux graisses). `dossier` ne se règle que pour un test. */
export function loadDocumentFontCss(dossier: string = join(__dirname, "fonts")): string {
  if (dossier === join(__dirname, "fonts") && memoire !== undefined) return memoire;
  const faces: string[] = [];
  for (const sousEnsemble of DOCUMENT_FONT_SUBSETS) {
    for (const poids of DOCUMENT_FONT_WEIGHTS) {
      const base64 = readFileSync(join(dossier, `readex-pro-${sousEnsemble}-${poids}-normal.woff2`)).toString("base64");
      faces.push(
        `@font-face { font-family: "${DOCUMENT_FONT_FAMILY}"; font-style: normal; font-weight: ${poids}; unicode-range: ${PLAGES[sousEnsemble]}; ` +
          `src: url(data:font/woff2;base64,${base64}) format("woff2"); }`
      );
    }
  }
  const css = faces.join("\n");
  if (dossier === join(__dirname, "fonts")) memoire = css;
  return css;
}
