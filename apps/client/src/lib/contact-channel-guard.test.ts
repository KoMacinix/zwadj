// L36-1 (D337) — LA GARDE DU CANAL DE CONTACT : « un numéro OU un e-mail » est UNE règle, et aucun geste ne suppose un numéro.
//
// ⚠ TROIS CHOSES SE MESURENT ICI, ET AUCUN TEST DE COMPOSANT NE LES VOIT (D205 : une décision qui vit dans un composant, ou une absence, est invisible) :
//   1. ML-6 — AUCUN lien `tel:`, `sms:` ni `wa.me` n'existe dans les deux applications. « Un geste d'appel ou de SMS n'est pas proposé sans numéro » se réduit alors à
//      `channelBlockers` (les canaux de REMISE d'un devis, testés à l'écran) ; si un lien d'appel apparaît un jour, cette garde rougit et IMPOSE de lui écrire sa condition.
//   2. ML-7 — les clés de message NEUVES existent, sont non vides, et diffèrent entre le français et l'arabe (la parité des CLÉS est déjà une porte : `i18n-parity.spec.ts` ;
//      ici on nomme celles de CE lot, pour qu'une clé retirée des deux côtés d'un coup ne passe pas pour une parité).
//   3. « UNE règle, UNE fonction » (D147) — les deux schémas de route et les deux écrans IMPORTENT `hasContactChannel` : une copie de la règle dans un écran divergerait.
//
// ⚠ COMMENT ELLE LIT (patron de `phone-literal-guard.test.ts`, D325). Elle lit l'ARBRE TypeScript — chaînes, gabarits, texte JSX, identifiants —, jamais un commentaire :
// une garde de source qui rougit sur la phrase qui explique pourquoi la valeur est absente est une garde qui accuse à tort (S11-a). Elle rend ce qu'elle a PARCOURU (D290).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { messages } from "@zwadj/i18n";

const RACINE = resolve(__dirname, "../../../..");
const RACINES = ["apps/client/src", "apps/pro/src", "packages/ui/src"] as const;
const HORS_GARDE = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/])/;
/** Les schémes de lien qui OUVRENT un appel, un SMS ou une conversation : ils supposent un numéro. */
const GESTE = /(?:^|[^\w])(?:tel:|sms:|smsto:|whatsapp:|(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com))/i;

function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...sources(chemin));
    else if (/\.tsx?$/.test(nom) && !HORS_GARDE.test(chemin)) out.push(chemin);
  }
  return out;
}

function arbre(nom: string, texte: string): ts.SourceFile {
  return ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

/** Les liens d'appel / de SMS / de conversation écrits dans le CODE d'un fichier — chaînes, gabarits, texte JSX ; jamais un commentaire. */
export function gestesDeContact(nom: string, texte: string): { ligne: number; texte: string }[] {
  const fichier = arbre(nom, texte);
  const trouves: { ligne: number; texte: string }[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      (ts.isStringLiteral(noeud) ||
        ts.isNoSubstitutionTemplateLiteral(noeud) ||
        ts.isTemplateHead(noeud) ||
        ts.isTemplateMiddle(noeud) ||
        ts.isTemplateTail(noeud) ||
        ts.isJsxText(noeud)) &&
      GESTE.test(noeud.text)
    ) {
      trouves.push({ ligne: fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier)).line + 1, texte: noeud.text.trim() });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return trouves;
}

/** L'identifiant est-il UTILISÉ dans le code (import compris), et non seulement cité dans un commentaire ? */
export function utiliseIdentifiant(nom: string, texte: string, identifiant: string): boolean {
  let vu = false;
  const visiter = (noeud: ts.Node): void => {
    if (ts.isIdentifier(noeud) && noeud.text === identifiant) vu = true;
    if (!vu) ts.forEachChild(noeud, visiter);
  };
  visiter(arbre(nom, texte));
  return vu;
}

describe("ML-6 — aucun geste d'appel ni de SMS n'existe : rien ne suppose un numéro", () => {
  it("CALIBRATION, bras positif : une chaîne, un gabarit et un texte JSX qui portent un lien d'appel, de SMS ou de conversation sont VUS", () => {
    expect(gestesDeContact("a.ts", `export const x = "tel:+213550000001";`)).toHaveLength(1);
    expect(gestesDeContact("a.ts", "export const x = `sms:${n}`;")).toHaveLength(1);
    expect(gestesDeContact("a.tsx", `export const X = () => <a href="https://wa.me/213550000001">écrire</a>;`)).toHaveLength(1);
    expect(gestesDeContact("a.tsx", `export const X = () => <p>whatsapp:+213550000001</p>;`)).toHaveLength(1);
  });

  it("CALIBRATION, bras négatif : un commentaire qui cite le lien, et un fichier qui n'en porte pas, ne sont PAS vus", () => {
    expect(gestesDeContact("a.ts", `// ce lien tel:+213550000001 n'existe pas\nexport const x = 1;`)).toEqual([]);
    expect(gestesDeContact("a.ts", `/* sms: */ export const x = "bonjour";`)).toEqual([]);
    expect(gestesDeContact("a.ts", `export const x = "hotel: Alger";`)).toEqual([]);
  });

  it("⚠ AUCUNE source de l'application Client, de l'application Pro ni de `@zwadj/ui` n'écrit un lien d'appel, de SMS ou de conversation (et la garde a PARCOURU de vrais fichiers)", () => {
    const parcourus: Record<string, number> = {};
    const fautes: string[] = [];
    for (const racine of RACINES) {
      const fichiers = sources(join(RACINE, racine));
      parcourus[racine] = fichiers.length;
      for (const chemin of fichiers) {
        for (const o of gestesDeContact(chemin, readFileSync(chemin, "utf8"))) {
          fautes.push(`${relative(RACINE, chemin).replace(/\\/g, "/")}:${o.ligne} « ${o.texte} »`);
        }
      }
    }
    for (const racine of RACINES) expect(parcourus[racine], `fichiers parcourus sous ${racine}`).toBeGreaterThan(0);
    expect(fautes).toEqual([]);
  });
});

describe("ML-7 — les messages NEUFS de L36-1 existent, en français ET en arabe, non vides et différents", () => {
  /** Les chemins des clés neuves, lus dans le catalogue. */
  const CLES: [string, (m: (typeof messages)["fr"]) => unknown][] = [
    ["booking.validation.contactChannelRequired", (m) => m.booking.validation.contactChannelRequired],
    ["quote.validation.contactChannelRequired", (m) => m.quote.validation.contactChannelRequired],
    ["venueDetail.booking.contactHint", (m) => m.venueDetail.booking.contactHint],
    ["venueDetail.booking.emailInvalid", (m) => m.venueDetail.booking.emailInvalid]
  ];

  it("quatre clés, chacune présente dans les deux langues, non vide, et l'arabe n'est pas une copie du français", () => {
    let examinees = 0;
    for (const [chemin, lire] of CLES) {
      examinees += 1;
      const fr = lire(messages.fr);
      const ar = lire(messages.ar);
      expect(typeof fr, `fr.${chemin}`).toBe("string");
      expect(typeof ar, `ar.${chemin}`).toBe("string");
      expect((fr as string).trim(), `fr.${chemin} vide`).not.toBe("");
      expect((ar as string).trim(), `ar.${chemin} vide`).not.toBe("");
      expect(ar, `ar.${chemin} copie le français`).not.toBe(fr);
    }
    expect(examinees).toBe(4);
  });

  it("la clé que les DEUX schémas rendent existe dans le catalogue sous le NOM exact que le schéma emploie (pas une clé orpheline)", () => {
    const source = (fichier: string) => readFileSync(join(RACINE, fichier), "utf8");
    expect(source("packages/types/src/booking.ts")).toContain('"booking.validation.contactChannelRequired"');
    expect(source("packages/types/src/quote.ts")).toContain('"quote.validation.contactChannelRequired"');
  });
});

describe("« UNE règle, UNE fonction » — les deux schémas et les deux écrans importent `hasContactChannel`", () => {
  it("CALIBRATION : l'identifiant utilisé dans le code est VU, celui qui n'est cité que dans un commentaire ne l'est PAS", () => {
    expect(utiliseIdentifiant("a.ts", `import { hasContactChannel } from "@zwadj/types";`, "hasContactChannel")).toBe(true);
    expect(utiliseIdentifiant("a.ts", `// hasContactChannel(a, b)\nexport const x = 1;`, "hasContactChannel")).toBe(false);
  });

  it("quatre consommateurs, chacun l'utilise (une copie de la règle dans un écran divergerait)", () => {
    const CONSOMMATEURS = [
      "packages/types/src/booking.ts",
      "packages/types/src/quote.ts",
      "apps/client/src/components/venue/booking-request-panel.tsx",
      "apps/pro/src/dashboard/walkin-contact.ts"
    ];
    const sans = CONSOMMATEURS.filter((f) => !utiliseIdentifiant(f, readFileSync(join(RACINE, f), "utf8"), "hasContactChannel"));
    expect(CONSOMMATEURS).toHaveLength(4);
    expect(sans).toEqual([]);
  });
});
