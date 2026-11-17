// ADM-2 (D350, rang 52) — gardes de SOURCE des écrans `/admin`. Une garde qui vit dans un composant qu'aucun rendu n'exerce est invisible (D205) : celles-ci lisent le texte des sources.
//
//  · MD-ADM-7 (décision du relecteur de D320, `commission-rate`) — AUCUN écran, aucune méthode ne peut MODIFIER un taux : ni appel à `…/commission-rate`, ni `setRates`, ni champ de saisie numérique ;
//  · D-2 (arbitrage de Ko) — les textes de l'admin vivent HORS de `packages/i18n`, en français seul : aucune source d'écran admin n'importe i18next, et AUCUN catalogue ne porte de bloc `admin` ;
//  · LOGIN_PATH / adresses (`routes.ts` est la seule table) — aucune adresse `/admin` écrite en dur dans une source d'écran, hors `routes.ts` ;
//  · les textes d'écran ne sont pas dans le catalogue du PRO (le bloc `publicationReview` est pour le pro, pas pour l'admin).
// ⚠ Les commentaires sont RETIRÉS avant d'asserter (D209 : une garde a rougi trois fois sur le commentaire qui expliquait pourquoi la valeur interdite n'est pas employée), et ce que la lecture a
// parcouru est IMPRIMÉ dans une assertion (D290 : un zéro sur zéro fichier lu n'est pas une mesure).
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { messages } from "@zwadj/i18n";

const SRC = resolve(process.cwd(), "src");

function sourcesDe(dossier: string): { chemin: string; code: string }[] {
  const sortie: { chemin: string; code: string }[] = [];
  for (const entree of readdirSync(join(SRC, dossier), { withFileTypes: true })) {
    if (!entree.isFile() || !/\.(ts|tsx|css)$/.test(entree.name) || /\.(test|spec)\.(ts|tsx)$/.test(entree.name)) continue;
    sortie.push({ chemin: `${dossier}/${entree.name}`, code: sansCommentaires(readFileSync(join(SRC, dossier, entree.name), "utf8")) });
  }
  return sortie;
}

/** Retire les commentaires de ligne et de bloc (JSX compris), en laissant les chaînes : un `//` dans une URL écrite en chaîne n'est pas un commentaire. */
function sansCommentaires(source: string): string {
  let sortie = "";
  let i = 0;
  let chaine: string | null = null;
  while (i < source.length) {
    const c = source[i] as string;
    const suivant = source[i + 1];
    if (chaine !== null) {
      sortie += c;
      if (c === "\\") {
        sortie += suivant ?? "";
        i += 2;
        continue;
      }
      if (c === chaine) chaine = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      chaine = c;
      sortie += c;
      i += 1;
      continue;
    }
    if (c === "/" && suivant === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && suivant === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    sortie += c;
    i += 1;
  }
  return sortie;
}

const ADMIN = sourcesDe("admin");
const GARDES = [{ chemin: "auth/require-admin.tsx", code: sansCommentaires(readFileSync(join(SRC, "auth/require-admin.tsx"), "utf8")) }];

describe("ce que la lecture a parcouru (D290)", () => {
  it("les sources de l'administration sont bien lues : au moins les trois écrans, la coquille, les textes, le contexte et la balise", () => {
    const noms = ADMIN.map((s) => s.chemin);
    for (const attendu of ["admin/venue-queue-page.tsx", "admin/venue-review-page.tsx", "admin/deletion-requests-page.tsx", "admin/admin-shell.tsx", "admin/admin-texts.ts", "admin/admin-client-context.tsx", "admin/use-no-index.ts"]) {
      expect(noms, attendu).toContain(attendu);
    }
    expect(ADMIN.length, `${noms.length} sources lues : ${noms.join(", ")}`).toBeGreaterThanOrEqual(7);
  });

  it("le retrait des commentaires fonctionne : un commentaire disparaît, une chaîne qui contient `//` reste (calibration à deux bras)", () => {
    expect(sansCommentaires("a // commission-rate\nb")).not.toContain("commission-rate");
    expect(sansCommentaires("a /* setRates */ b")).not.toContain("setRates");
    expect(sansCommentaires('const u = "http://exemple.dz/commission-rate";')).toContain("commission-rate");
  });
});

describe("MD-ADM-7 — le taux n'est JAMAIS modifiable depuis l'application", () => {
  it("aucune source de l'administration ne nomme `commission-rate`, `setRates`, ni ne construit un champ de taux", () => {
    for (const s of [...ADMIN, ...GARDES]) {
      expect(s.code, s.chemin).not.toMatch(/commission-rate/i);
      expect(s.code, s.chemin).not.toMatch(/\bsetRates\b/);
      expect(s.code, s.chemin).not.toMatch(/\b(?:commissionRateBps|cashbackRateBps)\s*:/);
      expect(s.code, s.chemin).not.toMatch(/\bupdateRates\b|\bsaveRates\b|\bpatchRates\b/);
    }
  });

  it("aucun champ numérique, curseur ou liste de choix de nombre dans les écrans de l'administration", () => {
    for (const s of ADMIN.filter((x) => x.chemin.endsWith(".tsx"))) {
      expect(s.code, s.chemin).not.toMatch(/type=["'{]\s*["']?(?:number|range)/);
      expect(s.code, s.chemin).not.toMatch(/inputMode=["']numeric["']/);
    }
  });
});

describe("D-2 — les textes de l'admin vivent hors de `packages/i18n`, en français seul", () => {
  it("aucune source de l'administration n'importe i18next ni ne lit le catalogue du Pro", () => {
    for (const s of [...ADMIN, ...GARDES]) {
      expect(s.code, s.chemin).not.toMatch(/react-i18next|from ["']i18next["']|useTranslation|@zwadj\/i18n/);
    }
  });

  it("AUCUN catalogue (français, arabe) ne porte de bloc `admin` : l'exemption est BORNÉE aux écrans `/admin`", () => {
    for (const [langue, catalogue] of Object.entries(messages)) {
      expect(Object.keys(catalogue as Record<string, unknown>), langue).not.toContain("admin");
    }
  });

  it("les textes d'écran sont DANS le module des textes, pas dans les composants : aucun libellé français en dur dans un `.tsx` de l'administration (hors constantes de ce module)", () => {
    for (const s of ADMIN.filter((x) => x.chemin.endsWith(".tsx"))) {
      // Un texte de rendu = du JSX avec une lettre accentuée ou un mot courant entre `>` et `<`, ou un attribut de libellé littéral.
      expect(s.code, s.chemin).not.toMatch(/>\s*[A-ZÉÈÀ][a-zéèêàùç' ]{6,}\s*</);
      expect(s.code, s.chemin).not.toMatch(/\b(?:aria-label|title|placeholder)=["'][A-Za-zÉÈÀéèêà]/);
    }
  });
});

describe("les adresses — `routes.ts` est la SEULE table", () => {
  it("aucune adresse `/admin` écrite en dur dans une source d'écran ou de garde", () => {
    for (const s of [...ADMIN, ...GARDES]) {
      expect(s.code, s.chemin).not.toMatch(/["'`]\/admin(?:["'`/?#])/);
    }
  });
});
