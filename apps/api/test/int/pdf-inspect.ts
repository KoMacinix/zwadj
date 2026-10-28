// Lecteur de PDF POUR LES TESTS — rang 33 (D326). Aucun outil d'inspection n'est installé sur le poste, et aucune dépendance n'est ajoutée pour une
// aide de test : ce lecteur est celui de la PREUVE DE L'ARABE (`docs/preuves/D326/arabe/pdf-fonts.py`), porté en TypeScript, et il est calibré
// à deux bras dans `pdf-renderer.int-spec.ts` (un PDF construit à la main où le fait est vrai, un où il est faux) — un lecteur qui répondrait
// « embarquée » à tout passerait le cas positif seul.
//
// Il ne lit que la forme CLASSIQUE d'un PDF (objets en clair), celle que Skia écrit — mesuré : « %PDF-1.4 », zéro flux d'objets. S'il rencontre
// un `/ObjStm`, il LÈVE : un lecteur qui ne verrait que la moitié des objets dirait « aucune police » et ferait passer un PDF sans police.

import { inflateSync } from "node:zlib";

export interface PdfFont {
  readonly name: string;
  readonly subtype: string;
  readonly embedded: boolean;
}

const OBJ = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj/g;

function objets(pdf: Buffer): Map<number, string> {
  const texte = pdf.toString("latin1");
  if (/\/Type\s*\/ObjStm/.test(texte)) throw new Error("pdf-inspect : flux d'objets compressé — ce lecteur ne lit que la forme classique");
  const res = new Map<number, string>();
  for (const m of texte.matchAll(OBJ)) res.set(Number(m[1]), (m[3] as string).split("stream")[0] as string);
  return res;
}

function refs(texte: string, cle: string): number[] {
  const liste = new RegExp(`${cle}\\s*\\[([^\\]]*)\\]`).exec(texte);
  if (liste) return [...(liste[1] as string).matchAll(/(\d+)\s+\d+\s+R/g)].map((x) => Number(x[1]));
  const seule = new RegExp(`${cle}\\s+(\\d+)\\s+\\d+\\s+R`).exec(texte);
  return seule ? [Number(seule[1])] : [];
}

/** Les polices d'un PDF : nom (préfixe de sous-ensemble conservé), sous-type, et « embarquée » = le descripteur (ou celui du descendant) référence un fichier de police. */
export function pdfFonts(pdf: Buffer): PdfFont[] {
  const objs = objets(pdf);
  const sortie: PdfFont[] = [];
  for (const t of objs.values()) {
    if (!/\/Type\s*\/Font\b(?!Descriptor)/.test(t)) continue;
    const nom = /\/BaseFont\s*\/([^\s/[\]<>()]+)/.exec(t);
    if (!nom) continue;
    const sous = /\/Subtype\s*\/([A-Za-z0-9]+)/.exec(t);
    let embedded = false;
    for (const c of [t, ...refs(t, "/DescendantFonts").map((r) => objs.get(r) ?? "")]) {
      for (const d of refs(c, "/FontDescriptor")) if (/\/FontFile[23]?\b/.test(objs.get(d) ?? "")) embedded = true;
    }
    sortie.push({ name: nom[1] as string, subtype: sous ? (sous[1] as string) : "?", embedded });
  }
  return sortie;
}

/** Le `/Title` du dictionnaire d'information, tel que Skia l'écrit pour du texte ASCII : `/Title (…)`. `null` s'il n'y en a pas. */
export function pdfTitle(pdf: Buffer): string | null {
  const m = /\/Title\s*\(([^)]*)\)/.exec(pdf.toString("latin1"));
  return m ? (m[1] as string) : null;
}

export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
}

/** Un PDF minimal construit à la main — les bras de calibration du lecteur. */
export function fabriquePdf(...objs: string[]): Buffer {
  return Buffer.from("%PDF-1.4\n" + objs.map((o, i) => `${i + 1} 0 obj\n${o}\nendobj\n`).join("") + "%%EOF", "latin1");
}

/**
 * L36-2 (D339) — combien de fois la COULEUR de remplissage `rgb` est POSÉE dans le PDF : l'opérateur `r g b rg` de chaque flux de contenu, décompressé. Le filigrane d'un brouillon a une couleur
 * qu'aucune autre règle du document n'emploie : son nombre de poses est donc son nombre d'apparitions — une par page quand il est `position: fixed` (mesuré par le spike de D338 : 1, 4 et 7
 * pages ⇒ 1, 4 et 7 poses ; `absolute` : 1 pose sur 3 pages).
 *
 * ⚠ Le format est celui de Chromium (Skia), RELEVÉ et non supposé : « .1216 .498 .7882 rg » pour (31, 127, 201) — quatre décimales au plus, zéros de fin et zéro de tête retirés. Le lecteur est
 * calibré à deux bras sur le vrai moteur (`quote-document.int-spec.ts`) : un témoin coloré ⇒ compté, le même document sans lui ⇒ zéro, un bleu voisin ⇒ zéro. Un flux qui ne s'inflate pas est
 * ignoré (images, polices) ; un PDF sans aucun flux inflatable rendrait zéro — d'où la calibration, qui exige au moins UNE pose dans le bras positif.
 */
export function pdfColorOperatorCount(pdf: Buffer, rgb: readonly [number, number, number]): number {
  const operande = (v: number): string => (v === 0 ? "0" : v === 255 ? "1" : (v / 255).toFixed(4).replace(/^0/u, "").replace(/0+$/u, ""));
  // Le texte cherché est « r g b rg » : les points des opérandes sont échappés, et un chiffre ou un point juste AVANT le premier opérande l'écarte (« 31.1216 » n'est pas « .1216 »).
  const cherche = rgb.map(operande).join(" ").replace(/\./gu, "\\.");
  const motif = new RegExp(`(?<![0-9.])${cherche} rg(?![A-Za-z])`, "gu");
  const texte = pdf.toString("latin1");
  let total = 0;
  for (let i = 0; ; ) {
    const a = texte.indexOf("stream", i);
    if (a < 0) break;
    const debut = texte[a + 6] === "\r" ? a + 8 : a + 7;
    const fin = texte.indexOf("endstream", debut);
    if (fin < 0) break;
    try {
      total += (inflateSync(Buffer.from(texte.slice(debut, fin), "latin1")).toString("latin1").match(motif) ?? []).length;
    } catch {
      /* un flux qui n'est pas du Flate : ignoré */
    }
    i = fin + 9;
  }
  return total;
}
