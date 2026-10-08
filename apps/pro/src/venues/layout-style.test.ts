// Le tableau de bord du Pro à 360 px — garde de SOURCE sur la CASCADE de `.pro-layout`. Rang 33 (D326) ; arbitrage de Ko du 05/10/2026 (« Pro à 360 px : ok, ajouté au rang 33 »).
//
// ⛔ LE DÉFAUT (D325, mesuré dans un navigateur : `docs/preuves/D325/navigateur/sonde-360-sortie.txt`) : `.pro-layout` était déclarée DEUX FOIS, et la seconde
// (`grid-template-columns: 292px minmax(0, 1fr)`) venait APRÈS le repli à une colonne de `@media (max-width: 860px)` — à spécificité égale, la dernière gagne. À 360 px la
// grille gardait deux colonnes (« 292px 68px »), le contenu tenait dans ~50 px, la page débordait de 110 px en français et 58 px en arabe.
//
// ⚠ POURQUOI UNE LECTURE DE LA FEUILLE ET PAS UN TEST DE RENDU : jsdom ne calcule pas la cascade. Ce que ce test mesure est l'ORDRE : il lit `theme.css`, relève toutes les
// déclarations de `grid-template-columns` de `.pro-layout` avec leur condition `@media (max-width: …)` et leur rang dans le fichier, et dit laquelle GAGNE à une largeur donnée.
// La mesure dans un vrai navigateur reste celle de la spec `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` (« rien ne déborde ») et de la capture du lot.
// ⚠ Il ne juge QUE `.pro-layout` : la cascade des autres sélecteurs n'est pas son objet.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const THEME = readFileSync(resolve(__dirname, "../theme.css"), "utf8");

interface Declaration {
  /** Rang dans le fichier : plus grand = plus tard = gagne à spécificité égale. */
  readonly ordre: number;
  /** `null` hors `@media` ; sinon la largeur MAX du `@media (max-width: Npx)` qui l'enveloppe. */
  readonly maxLargeur: number | null;
  readonly valeur: string;
}

const sansCommentaires = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Les déclarations `grid-template-columns` des règles dont le sélecteur est EXACTEMENT `.pro-layout`, hors et dans `@media (max-width: …)`. */
export function declarationsDeLaGrille(css: string, selecteur = ".pro-layout"): Declaration[] {
  const texte = sansCommentaires(css);
  const sortie: Declaration[] = [];
  let ordre = 0;
  /** Pile des `@media` ouverts : la largeur max de chacun, ou `null` pour un autre bloc. */
  const pile: (number | null | "autre")[] = [];
  let tete = "";
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i] as string;
    if (c === "{") {
      const prelude = tete.trim().replace(/\s+/g, " ");
      const media = /^@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)$/.exec(prelude);
      // Un bloc de règle (pas un @-bloc) : lire jusqu'à l'accolade fermante, SANS imbrication.
      if (!prelude.startsWith("@")) {
        const fin = texte.indexOf("}", i);
        const corps = texte.slice(i + 1, fin);
        ordre += 1;
        if (prelude === selecteur) {
          const decl = /(?:^|;)\s*grid-template-columns\s*:\s*([^;]+)/.exec(corps);
          if (decl) {
            const enveloppe = pile.filter((p) => p !== null);
            const largeurs = enveloppe.filter((p): p is number => typeof p === "number");
            sortie.push({ ordre, maxLargeur: largeurs.length === 0 ? null : Math.min(...largeurs), valeur: (decl[1] as string).trim().replace(/\s+/g, " ") });
          }
        }
        i = fin;
        tete = "";
        continue;
      }
      pile.push(media ? Number(media[1]) : "autre");
      tete = "";
      continue;
    }
    if (c === "}") {
      pile.pop();
      tete = "";
      continue;
    }
    tete += c;
  }
  return sortie;
}

/** La valeur QUI GAGNE à `largeur` px : parmi les déclarations applicables (hors `@media`, ou `max-width` ≥ largeur), la DERNIÈRE du fichier. */
export function valeurEffective(declarations: Declaration[], largeur: number): string | null {
  const applicables = declarations.filter((d) => d.maxLargeur === null || largeur <= d.maxLargeur);
  return applicables.length === 0 ? null : (applicables.reduce((a, b) => (b.ordre > a.ordre ? b : a)).valeur as string);
}

/** Combien de pistes (colonnes) déclare une valeur ? `minmax(0, 1fr)` n'en déclare qu'UNE — la virgule d'un `minmax(...)` n'ajoute pas de colonne. */
export function nombreDePistes(valeur: string): number {
  return valeur.replace(/minmax\([^)]*\)/g, "X").split(" ").filter(Boolean).length;
}

describe("la cascade de `.pro-layout` — le calibrage de l'instrument, DEUX BRAS", () => {
  const DEFAUT = `
    .pro-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); }
    @media (max-width: 860px) { .pro-layout { grid-template-columns: minmax(0, 1fr); } }
    .pro-layout { grid-template-columns: 292px minmax(0, 1fr); }`;
  const REPARE = `
    .pro-layout { display: grid; grid-template-columns: 292px minmax(0, 1fr); }
    @media (max-width: 860px) { .pro-layout { grid-template-columns: minmax(0, 1fr); } }`;

  it("bras positif — la forme DÉFECTUEUSE (la base déclarée APRÈS le repli) est lue comme DEUX colonnes à 360 px — le défaut — et à 1280 px", () => {
    const d = declarationsDeLaGrille(DEFAUT);
    expect(d).toHaveLength(3);
    expect(nombreDePistes(valeurEffective(d, 360) as string)).toBe(2);
    expect(nombreDePistes(valeurEffective(d, 1280) as string)).toBe(2);
  });

  it("bras négatif — la forme RÉPARÉE est lue comme UNE colonne à 360 px et DEUX à 1280 px", () => {
    const d = declarationsDeLaGrille(REPARE);
    expect(d).toHaveLength(2);
    expect(nombreDePistes(valeurEffective(d, 360) as string)).toBe(1);
    expect(nombreDePistes(valeurEffective(d, 1280) as string)).toBe(2);
    // Et la frontière est celle de l'`@media` : 860 px replie encore, 861 px non.
    expect(nombreDePistes(valeurEffective(d, 860) as string)).toBe(1);
    expect(nombreDePistes(valeurEffective(d, 861) as string)).toBe(2);
  });

  it("`minmax(0, 1fr)` compte pour UNE piste (la virgule n'en ajoute pas), `292px minmax(0, 1fr)` pour DEUX", () => {
    expect(nombreDePistes("minmax(0, 1fr)")).toBe(1);
    expect(nombreDePistes("292px minmax(0, 1fr)")).toBe(2);
    expect(nombreDePistes("1fr")).toBe(1);
  });

  it("une feuille sans la règle ne dit RIEN : `null`, pas une valeur inventée", () => {
    expect(valeurEffective(declarationsDeLaGrille(".autre { color: red }"), 360)).toBeNull();
  });
});

describe("⛔ `.pro-layout` à 360 px — le repli à UNE colonne GAGNE, et le bureau garde ses DEUX colonnes (feuille réelle)", () => {
  const d = declarationsDeLaGrille(THEME);

  it("la feuille déclare le repli : au moins une déclaration de `.pro-layout` est dans un `@media (max-width: …)`", () => {
    expect(d.length).toBeGreaterThan(0);
    expect(d.some((x) => x.maxLargeur !== null)).toBe(true);
  });

  it("à 360 px la valeur qui GAGNE n'a qu'UNE piste — le défaut mesuré rendait « 292px minmax(0, 1fr) »", () => {
    const gagnante = valeurEffective(d, 360);
    expect(gagnante).not.toBeNull();
    expect(nombreDePistes(gagnante as string), `valeur gagnante à 360 px : ${gagnante}`).toBe(1);
  });

  it("à 320 px, à la frontière 860 px et sur toute largeur ≤ 860 px, une seule colonne", () => {
    for (const largeur of [320, 360, 414, 600, 768, 860]) {
      expect(nombreDePistes(valeurEffective(d, largeur) as string), `${largeur} px`).toBe(1);
    }
  });

  it("au-dessus de 860 px, le panneau et le contenu restent CÔTE À CÔTE (la règle de bureau n'a pas été perdue en route)", () => {
    for (const largeur of [861, 1024, 1280, 1920]) {
      expect(nombreDePistes(valeurEffective(d, largeur) as string), `${largeur} px`).toBe(2);
    }
  });
});
