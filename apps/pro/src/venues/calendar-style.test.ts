// Le calendrier du parcours — week-end plus clair, jour bloqué distinct SANS la couleur — rang 32, D325, point 7. Garde de SOURCE sur le CSS : jsdom ne
// calcule ni cascade ni couleurs, la mesure d'un rendu est faite dans un vrai navigateur (`e2e/specs/r32-nouvelle-reservation.e2e.ts`) ; ceci mesure ce que le CSS
// DÉCLARE, et il le mesure à partir de ses propres jetons — aucune couleur n'est recopiée ici.
//
// ⚠ LES TROIS DÉFAUTS QU'ELLE FERME. W-a · la règle partagée `.cal-cell.is-weekend .cal-day` (spécificité 0,3,0) BAT les remplissages de statut (0,2,0) : un vendredi
// ou un samedi réservé, demandé ou bloqué s'affichait de la teinte du week-end. W-b · cette teinte (`--accent-soft`) était PLUS FONCÉE que le fond d'un jour libre et proche
// du « bloqué ». W-c · un jour bloqué ne se distinguait que par sa couleur. Le contraste du chiffre du jour reste d'au moins 4,5:1 sur chaque fond, hachurage compris.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = resolve(__dirname, "../../../..");
const THEME = readFileSync(resolve(RACINE, "apps/pro/src/theme.css"), "utf8");
const PARTAGE = readFileSync(resolve(RACINE, "packages/ui/styles.css"), "utf8");

const sansCommentaires = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

export interface Regle {
  selecteur: string;
  corps: string;
}
/** Les règles PLATES d'une feuille (aucune n'est dans une @media pour ce que cette garde lit), commentaires retirés. */
export function regles(css: string): Regle[] {
  const sortie: Regle[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of sansCommentaires(css).matchAll(re)) sortie.push({ selecteur: (m[1] as string).trim().replace(/\s+/g, " "), corps: (m[2] as string).trim() });
  return sortie;
}
/** La valeur d'un jeton déclaré (`--nom: valeur;`), la PREMIÈRE déclaration de la feuille. */
export function jeton(css: string, nom: string): string | null {
  const m = new RegExp(`${nom.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`).exec(sansCommentaires(css));
  return m ? (m[1] as string).trim() : null;
}

type Rgba = [number, number, number, number];
export function couleur(valeur: string): Rgba {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valeur);
  if (hex) {
    const h = (hex[1] as string).length === 3 ? [...(hex[1] as string)].map((c) => c + c).join("") : (hex[1] as string);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(valeur);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  throw new Error(`couleur illisible : ${valeur}`);
}
/** Dépose `dessus` (alpha possible) sur `dessous` (opaque). */
export function composer(dessus: Rgba, dessous: Rgba): Rgba {
  const a = dessus[3];
  return [0, 1, 2].map((i) => Math.round((dessus[i] as number) * a + (dessous[i] as number) * (1 - a))) .concat(1) as Rgba;
}
function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contraste(a: Rgba, b: Rgba): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (clair + 0.05) / (fonce + 0.05);
}
const specificite = (selecteur: string) => (selecteur.match(/\.[\w-]+/g) ?? []).length;

const STATUTS = ["available", "requested", "booked", "blocked"] as const;
const THEMES = [
  { nom: "clair", encre: () => jeton(PARTAGE, "--ink") as string, fond: (s: string) => jeton(THEME, `--cal-${s}`) as string, hachure: () => jeton(THEME, "--cal-hatch") as string },
  {
    nom: "sombre",
    encre: () => jeton(PARTAGE, "--dark-ink") as string,
    fond: (s: string) => jeton(THEME, `--dark-cal-${s}`) as string,
    hachure: () => jeton(THEME, "--dark-cal-hatch") as string
  }
];

describe("CALIBRATION — l'instrument de mesure répond juste sur des cas connus", () => {
  it("contraste : noir sur blanc = 21, un gris sur lui-même = 1", () => {
    expect(contraste(couleur("#000000"), couleur("#ffffff"))).toBeCloseTo(21, 5);
    expect(contraste(couleur("#777777"), couleur("#777777"))).toBeCloseTo(1, 5);
  });
  it("le contraste RELEVÉ par ailleurs est retrouvé : `--ink-2` sur `--bg-2` = 7,03 au plus bas en clair (mesuré par D129 et écrit dans `styles.css`)", () => {
    // La référence n'est pas recalculée ici : c'est le chiffre que `packages/ui/styles.css` porte en commentaire, mesuré par un autre outil.
    expect(contraste(couleur(jeton(PARTAGE, "--ink-2") as string), couleur(jeton(PARTAGE, "--bg-2") as string))).toBeCloseTo(7.03, 1);
  });
  it("la composition d'un voile : 50 % de noir sur blanc donne un gris moyen", () => {
    expect(composer([0, 0, 0, 0.5], [255, 255, 255, 1]).slice(0, 3)).toEqual([128, 128, 128]);
  });
  it("le lecteur de règles voit un sélecteur et son corps, et ignore un commentaire qui cite le même sélecteur", () => {
    const r = regles("/* .a { color: red; } */ .b .c { color: blue; }");
    expect(r).toEqual([{ selecteur: ".b .c", corps: "color: blue;" }]);
  });
});

describe("W-b — le week-end a un fond PLUS CLAIR que celui qu'il avait", () => {
  it("clair : `--cal-weekend` est plus clair que `--accent-soft` (#f1efee), que la règle partagée lui posait", () => {
    const avant = couleur(jeton(THEME, "--accent-soft") as string);
    const apres = couleur(jeton(THEME, "--cal-weekend") as string);
    expect(luminance(apres)).toBeGreaterThan(luminance(avant));
  });
  it("sombre : `--dark-cal-weekend` est plus clair que `--dark-pro-accent-soft`", () => {
    expect(luminance(couleur(jeton(THEME, "--dark-cal-weekend") as string))).toBeGreaterThan(luminance(couleur(jeton(THEME, "--dark-pro-accent-soft") as string)));
  });
  it("le week-end reste DISTINGUABLE sans la couleur : sa bordure en tirets est conservée", () => {
    const tirets = regles(THEME).filter((r) => r.selecteur === ".cal-cell.is-weekend .cal-day" && /border-style:\s*dashed/.test(r.corps));
    expect(tirets).toHaveLength(1);
  });
});

describe("Le contraste du chiffre du jour reste d'au moins 4,5:1 — sur chaque fond, hachurage compris, en clair et en sombre", () => {
  for (const theme of THEMES) {
    for (const fond of [...STATUTS, "weekend"]) {
      it(`${theme.nom} · fond « ${fond} »`, () => {
        const encre = couleur(theme.encre());
        const plat = couleur(fond === "weekend" ? (jeton(THEME, theme.nom === "clair" ? "--cal-weekend" : "--dark-cal-weekend") as string) : theme.fond(fond));
        expect(contraste(encre, plat)).toBeGreaterThanOrEqual(4.5);
        // Le trait du hachurage se pose sur le fond : le chiffre doit rester lisible là où le trait passe aussi.
        const sous = composer(couleur(theme.hachure()), plat);
        expect(contraste(encre, sous)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("W-a — le STATUT l'emporte sur le week-end", () => {
  const partagee = regles(PARTAGE).find((r) => r.selecteur === ".cal-cell.is-weekend .cal-day");
  it("la règle partagée existe, et c'est ELLE que le Pro doit battre (sinon ce test ne mesure rien)", () => {
    expect(partagee).toBeDefined();
    expect(partagee?.corps).toMatch(/background:\s*var\(--accent-soft\)/);
  });
  for (const statut of ["requested", "booked", "blocked"] as const) {
    it(`un jour « ${statut} » un vendredi ou un samedi prend la couleur de son statut, par une règle PLUS spécifique que la règle partagée`, () => {
      const regle = regles(THEME).find((r) => r.selecteur === `.cal-cell.is-weekend .cal-day.is-${statut}`);
      expect(regle, `règle week-end ${statut}`).toBeDefined();
      expect(regle?.corps).toMatch(new RegExp(`background:\\s*var\\(--cal-${statut}\\)`));
      expect(specificite(regle?.selecteur as string)).toBeGreaterThan(specificite(partagee?.selecteur as string));
    });
  }
  it("seuls un jour LIBRE ou sans donnée prennent la teinte du week-end", () => {
    const regle = regles(THEME).find((r) => r.selecteur === ".cal-cell.is-weekend .cal-day.is-available, .cal-cell.is-weekend .cal-day.is-empty");
    expect(regle?.corps).toMatch(/background:\s*var\(--cal-weekend\)/);
  });
});

describe("W-c — un jour bloqué se distingue par AUTRE CHOSE que la couleur", () => {
  it("un hachurage en diagonale sur le jour bloqué, sur sa pastille de légende, et sur le jour bloqué d'un week-end", () => {
    const hachure = regles(THEME).find((r) => /background-image:\s*repeating-linear-gradient\(.*var\(--cal-hatch\)/.test(r.corps));
    expect(hachure).toBeDefined();
    const selecteurs = (hachure?.selecteur as string).split(",").map((s) => s.trim());
    expect(selecteurs).toEqual(expect.arrayContaining([".cal-chip.is-blocked", ".cal-day.is-blocked", ".cal-cell.is-weekend .cal-day.is-blocked"]));
  });
  it("le hachurage est un TRAIT, pas un remplissage : le jeton est translucide", () => {
    for (const nom of ["--cal-hatch", "--dark-cal-hatch"]) expect(couleur(jeton(THEME, nom) as string)[3]).toBeLessThan(0.5);
  });
  it("aucun autre état n'est hachuré : un hachurage partout ne distinguerait plus rien", () => {
    const avecHachure = regles(THEME).filter((r) => /repeating-linear-gradient/.test(r.corps));
    expect(avecHachure).toHaveLength(1);
  });
  it("le jeton `--cal-hatch` existe dans les DEUX thèmes (un jeton absent d'un thème retombe sur `inherit` et rend l'écran pire, D129)", () => {
    expect(jeton(THEME, "--cal-hatch")).not.toBeNull();
    expect(jeton(THEME, "--dark-cal-hatch")).not.toBeNull();
    const sombre = regles(THEME).find((r) => r.selecteur === ':root[data-theme="dark"]');
    expect(sombre?.corps).toMatch(/--cal-hatch:\s*var\(--dark-cal-hatch\)/);
    expect(sombre?.corps).toMatch(/--cal-weekend:\s*var\(--dark-cal-weekend\)/);
  });
});
