// Rang 29 (D321) — garde laissée par D317 : le serveur d'API de l'e2e ne tourne PAS en surveillance.
//
// ⚠ LE DÉFAUT QU'ELLE TIENT FERMÉ (D317, étape 1, mesuré sur le serveur de l'e2e lui-même). L'API y était lancée par
// `pnpm --filter @zwadj/api run dev`, soit `nest start --watch` : TOUTE écriture d'un fichier de son programme —
// `apps/api/src`, `packages/types/src`, les messages de `packages/i18n` — la recompilait et la redémarrait EN PLEINE SUITE,
// ~2 s de `ECONNREFUSED` par écriture. D316 en a payé une cible jugée muette à tort. D317 a corrigé la configuration
// (`nest start`, compilée une fois) et a écrit : « Aucune garde permanente ne tient l'API hors surveillance ». La voici.
//
// ⚠ COMMENT ELLE LIT (mode de défaillance G-a du point d'entrée du rang 29). Chercher « --watch » dans le fichier ne
// suffirait pas : le retour le plus probable est `run dev`, qui ne contient pas ce mot — le mode vient du SCRIPT
// `dev` de `apps/api/package.json`. Elle lit donc l'arbre TypeScript de la configuration (jamais ses commentaires, qui
// citent `--watch` pour l'expliquer), trouve l'entrée `webServer` de l'API, et RÉSOUT ce que `pnpm` lancera.
//
// ⚠ Elle vit dans `apps/api/src/common`, comme la garde de parité i18n (qui lit `packages/i18n`) : une garde transverse
// sur l'API, jouée à chaque `pnpm test`. cwd de Vitest = `apps/api` (idiome de `i18n-parity.spec.ts`).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RACINE = join(process.cwd(), "..", "..");
const CONFIG_E2E = join(RACINE, "e2e", "playwright.config.ts");
const SCRIPTS_API = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> })
  .scripts;

/** Les drapeaux de surveillance de la CLI Nest (et de `tsc`). */
const SURVEILLANCE = /(^|\s)(--watch|-w)(=|\s|$)/;

/** Ce que `pnpm --filter @zwadj/api …` lancera : `exec X` ⇒ X ; `run S` ou `S` ⇒ le script S de `apps/api/package.json`. */
export function commandeResolue(commande: string, scripts: Record<string, string> = SCRIPTS_API): string {
  const mots = commande.trim().split(/\s+/);
  const i = mots.findIndex((mot, k) => mot === "--filter" && mots[k + 1] === "@zwadj/api");
  if (i < 0) return commande;
  const reste = mots.slice(i + 2);
  if (reste[0] === "exec") return reste.slice(1).join(" ");
  const script = reste[0] === "run" ? reste[1] : reste[0];
  return script !== undefined && script in scripts ? scripts[script]! : reste.join(" ");
}

export function enSurveillance(commande: string, scripts?: Record<string, string>): boolean {
  return SURVEILLANCE.test(commandeResolue(commande, scripts));
}

/** Les `command` des entrées `webServer` d'une configuration, lus dans l'ARBRE (chaînes et gabarits, sans commentaires). */
export function commandesWebServer(source: string): string[] {
  const fichier = ts.createSourceFile("playwright.config.ts", source, ts.ScriptTarget.Latest, true);
  const commandes: string[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (
      ts.isPropertyAssignment(noeud) &&
      ts.isIdentifier(noeud.name) &&
      noeud.name.text === "webServer" &&
      ts.isArrayLiteralExpression(noeud.initializer)
    ) {
      for (const entree of noeud.initializer.elements) {
        if (!ts.isObjectLiteralExpression(entree)) continue;
        for (const prop of entree.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== "command") continue;
          const v = prop.initializer;
          if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) commandes.push(v.text);
          else if (ts.isTemplateExpression(v)) commandes.push(v.getText(fichier).slice(1, -1));
        }
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return commandes;
}

const enveloppe = (commande: string) => `export default { webServer: [ { command: ${JSON.stringify(commande)}, url: "x" } ] };`;

describe("e2e — l'API n'y tourne PAS en surveillance (garde laissée par D317, rang 29, D321)", () => {
  it("calibration, bras ROUGE : la configuration d'AVANT D317 (`run dev`) et ses variantes sont vues", () => {
    // `dev` = « nest start --watch » : relu dans le VRAI package.json de l'API, pas recopié.
    expect(SURVEILLANCE.test(SCRIPTS_API.dev ?? "")).toBe(true);
    for (const commande of [
      "pnpm --filter @zwadj/api run dev",
      "pnpm --filter @zwadj/api dev",
      "pnpm --filter @zwadj/api exec nest start --watch",
      "pnpm --filter @zwadj/api exec nest start -w"
    ]) {
      expect([commande, commandesWebServer(enveloppe(commande)).map((c) => enSurveillance(c))]).toEqual([commande, [true]]);
    }
  });

  it("calibration, bras VERT : une API compilée une fois, et un commentaire qui cite `--watch`, ne sont pas vus", () => {
    for (const commande of ["pnpm --filter @zwadj/api exec nest start", "pnpm --filter @zwadj/api run start"]) {
      expect([commande, commandesWebServer(enveloppe(commande)).map((c) => enSurveillance(c))]).toEqual([commande, [false]]);
    }
    expect(commandesWebServer(`// command: "nest start --watch"\n${enveloppe("pnpm --filter @zwadj/api exec nest start")}`)).toEqual([
      "pnpm --filter @zwadj/api exec nest start"
    ]);
  });

  it("G-a : dans `e2e/playwright.config.ts`, l'entrée de l'API existe, UNE fois, et ne surveille pas", () => {
    const commandes = commandesWebServer(readFileSync(CONFIG_E2E, "utf8"));
    // D290 — ce que la lecture a parcouru : les trois serveurs (API, client, pro).
    expect(commandes.length).toBe(3);
    const api = commandes.filter((c) => c.includes("@zwadj/api"));
    expect(api).toHaveLength(1);
    expect([api[0], commandeResolue(api[0]!), enSurveillance(api[0]!)]).toEqual([api[0], commandeResolue(api[0]!), false]);
  });
});
