// Lecteur de PDF POUR LES TESTS — rang 33 (D326). Aucun outil d'inspection n'est installé sur le poste, et aucune dépendance n'est ajoutée pour une
// aide de test : ce lecteur est celui de la PREUVE DE L'ARABE (`docs/preuves/D326/arabe/pdf-fonts.py`), porté en TypeScript, et il est calibré
// à deux bras dans `pdf-renderer.int-spec.ts` (un PDF construit à la main où le fait est vrai, un où il est faux) — un lecteur qui répondrait
// « embarquée » à tout passerait le cas positif seul.
//
// Il ne lit que la forme CLASSIQUE d'un PDF (objets en clair), celle que Skia écrit — mesuré : « %PDF-1.4 », zéro flux d'objets. S'il rencontre
// un `/ObjStm`, il LÈVE : un lecteur qui ne verrait que la moitié des objets dirait « aucune police » et ferait passer un PDF sans police.

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
