// Rang 25 (D316) — la cible de connexion désigne une page RÉELLE.
//
// ⚠ Le client a un attrape-tout `[locale]/[...rest]` (D249) : TOUT chemin y
// apparie, et `/fr/connexion` rendait la 404 par lui. « Une route apparie » ne
// prouve donc rien ; la garde exige le FICHIER `page.tsx` du segment.
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { locales } from "@zwadj/i18n";
import * as ROUTES from "./routes";
import { LOGIN_PATH } from "./routes";

/** Racine des pages localisées, dérivée de l'emplacement de CE fichier —
 *  `__dirname`, pas le répertoire de travail (idiome de `not-found.test.tsx`). */
const PAGES = resolve(__dirname, "../app/[locale]");

function pageExiste(chemin: string): boolean {
  return existsSync(resolve(PAGES, ...chemin.split("/").filter(Boolean), "page.tsx"));
}

describe("LOGIN_PATH — une page qui existe, dans les deux langues", () => {
  it("calibration, bras négatif : l'ancienne cible `/connexion` n'a PAS de page (le défaut de D315 se voit)", () => {
    expect(pageExiste("/connexion")).toBe(false);
  });

  it("LOGIN_PATH désigne un `page.tsx` de l'App Router", () => {
    expect(pageExiste(LOGIN_PATH)).toBe(true);
  });

  it("LOGIN_PATH est un chemin SANS locale : le `Link` localisé l'ajoute", () => {
    expect(LOGIN_PATH.startsWith("/")).toBe(true);
    for (const locale of locales) expect(LOGIN_PATH.startsWith(`/${locale}/`)).toBe(false);
  });
});

// ── FC-5 (session `front-client`) — UNE constante par page, et chaque constante désigne une page ──────────────────────────
// La table est lue dans le MODULE (une constante ajoutée demain est vérifiée sans toucher ce test) ; les pages, dans les
// FICHIERS (D249). Les groupes `(…)` ne font pas partie de l'adresse (`(recherche)`, D250) ; un segment `[x]` accepte tout
// segment ; l'attrape-tout `[...rest]` n'est PAS une page (il apparie tout, D249) ; la racine d'une langue (`/`) est servie
// par `localeHomePath`, vérifiée à part.

/** Une adresse (sans locale) désigne-t-elle un `page.tsx` du segment `[locale]` ? */
function pageResolue(chemin: string): boolean {
  const chercher = (dossier: string, reste: string[]): boolean => {
    if (reste.length === 0 && existsSync(resolve(dossier, "page.tsx"))) return true;
    for (const nom of readdirSync(dossier)) {
      const sous = resolve(dossier, nom);
      if (!statSync(sous).isDirectory() || nom.startsWith("[...")) continue;
      if (/^\(.*\)$/.test(nom) && chercher(sous, reste)) return true;
      if (reste.length > 0 && (nom === reste[0] || /^\[[^.\]]+\]$/.test(nom)) && chercher(sous, reste.slice(1))) return true;
    }
    return false;
  };
  return chercher(PAGES, chemin.split("/").filter(Boolean));
}

/** Toutes les pages DÉCLARÉES : leur adresse (groupes retirés, segment dynamique gardé sous sa forme `[x]`). */
function pagesDeclarees(): string[] {
  const out: string[] = [];
  const parcourir = (dossier: string, segments: string[]): void => {
    for (const nom of readdirSync(dossier)) {
      const sous = resolve(dossier, nom);
      if (statSync(sous).isDirectory()) {
        if (!nom.startsWith("[...")) parcourir(sous, /^\(.*\)$/.test(nom) ? segments : [...segments, nom]);
      } else if (nom === "page.tsx" && segments.length > 0) {
        out.push(`/${segments.join("/")}`);
      }
    }
  };
  parcourir(PAGES, []);
  return out.sort();
}

/** La table, lue comme un dictionnaire NON typé : ses valeurs sont des unions de littéraux, qu'un prédicat `v is string` ne peut pas
 *  rétrécir (TS2677) — et le fichier doit compiler avant FC-5 comme après. */
const ADRESSES = Object.values(ROUTES as Record<string, unknown>).filter((v): v is string => typeof v === "string");
const EXEMPLE = "salle-exemple";
/** Une FONCTION de la table, lue par son nom — absente, `null` : le rouge d'avant FC-5 se lit en ASSERTION (D304), jamais en
 *  `TypeError`, et le fichier compile avant comme après. */
const TABLE = ROUTES as Record<string, unknown>;
const fonction = (nom: string): ((x: string) => string) | null =>
  typeof TABLE[nom] === "function" ? (TABLE[nom] as (x: string) => string) : null;

describe("FC-5 — la table des routes du client : une constante par page, chaque constante une page", () => {
  it("calibration, deux bras : la recherche (groupe) et la fiche (segment dynamique) se résolvent ; `/salles/x/y` non", () => {
    expect(pageResolue("/salles")).toBe(true);
    expect(pageResolue("/salles/une-salle")).toBe(true);
    expect(pageResolue("/salles/une-salle/calendrier")).toBe(false);
  });

  it("chaque chaîne de la table désigne un `page.tsx`", () => {
    expect(ADRESSES.length).toBeGreaterThan(8);
    expect(ADRESSES.filter((adresse) => !pageResolue(adresse))).toEqual([]);
  });

  it("la fiche d'une salle (`venuePath`) désigne la page `[slug]`", () => {
    const venuePath = fonction("venuePath");
    expect(venuePath).not.toBeNull();
    expect(pageResolue(venuePath!(EXEMPLE))).toBe(true);
  });

  it("chaque page DÉCLARÉE a sa constante — fixe par une chaîne, dynamique par `venuePath`", () => {
    const fiche = fonction("venuePath")?.(EXEMPLE) ?? "";
    const orphelines = pagesDeclarees().filter((page) =>
      page.includes("[") ? !fiche.startsWith(page.slice(0, page.indexOf("["))) || fiche === "" : !ADRESSES.includes(page)
    );
    expect(orphelines).toEqual([]);
  });

  it("l'accueil d'une langue (`localeHomePath`) : `/<langue>`, pour chaque langue, et la page racine du segment existe", () => {
    expect(existsSync(resolve(PAGES, "page.tsx"))).toBe(true);
    const localeHomePath = fonction("localeHomePath");
    expect(localeHomePath).not.toBeNull();
    for (const locale of locales) expect(localeHomePath!(locale)).toBe(`/${locale}`);
  });
});
