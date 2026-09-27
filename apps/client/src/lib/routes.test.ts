// Rang 25 (D316) — la cible de connexion désigne une page RÉELLE.
//
// ⚠ Le client a un attrape-tout `[locale]/[...rest]` (D249) : TOUT chemin y
// apparie, et `/fr/connexion` rendait la 404 par lui. « Une route apparie » ne
// prouve donc rien ; la garde exige le FICHIER `page.tsx` du segment.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { locales } from "@zwadj/i18n";
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
