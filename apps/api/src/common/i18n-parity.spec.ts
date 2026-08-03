// Parité i18n FR/AR — PERMANENTE (Lot A4). Le contrôle était jusqu'ici un
// geste manuel de revue (A3 s'est fait mordre par une clé ajoutée d'un seul
// côté) : le voici en test, exécuté à chaque `pnpm test`. Invariant produit
// (AGENTS.md) : parité stricte des deux langues — une clé présente d'un côté
// et pas de l'autre est un bug, pas un « à traduire plus tard ».
// Lecture par le système de fichiers (pas d'import du package) : le test juge
// les FICHIERS SOURCES committés, indépendamment de tout build/dist.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// cwd Vitest = apps/api (racine de la config) — chemin stable vers le package.
const MESSAGES_DIR = join(process.cwd(), "..", "..", "packages", "i18n", "messages");

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

function load(locale: "fr" | "ar"): Map<string, string> {
  return flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Tree);
}

describe("Parité i18n FR/AR (invariant produit)", () => {
  const fr = load("fr");
  const ar = load("ar");

  it("les DEUX ensembles de clés sont identiques — toute clé orpheline est nommée dans l'échec", () => {
    const frOnly = [...fr.keys()].filter((k) => !ar.has(k)).sort();
    const arOnly = [...ar.keys()].filter((k) => !fr.has(k)).sort();
    expect({ frOnly, arOnly }).toEqual({ frOnly: [], arOnly: [] });
    expect(fr.size).toBe(ar.size);
  });

  it("aucune valeur vide ou d'espaces (une clé « réservée » n'est pas une traduction)", () => {
    const empty = [
      ...[...fr.entries()].filter(([, v]) => v.trim() === "").map(([k]) => `fr:${k}`),
      ...[...ar.entries()].filter(([, v]) => v.trim() === "").map(([k]) => `ar:${k}`)
    ];
    expect(empty).toEqual([]);
  });

  it("les namespaces attendus existent des deux côtés (dont account.*, Lot A10)", () => {
    for (const ns of ["auth.", "venue.", "media.", "common.", "account."]) {
      expect([...fr.keys()].some((k) => k.startsWith(ns))).toBe(true);
      expect([...ar.keys()].some((k) => k.startsWith(ns))).toBe(true);
    }
  });

  // ── Ajouts du lot de RÉCONCILIATION ────────────────────────────────────────
  // Cette porte a laissé passer la disparition de 20 clés. Elle ne compare que
  // FR à AR : une suppression SYMÉTRIQUE la laisse verte, et c'est exactement
  // ce qu'un zip construit sur une base ancienne produit. Les deux tests qui
  // suivent regardent enfin les clés elles-mêmes.

  it("le TOTAL ne RECULE pas — une suppression symétrique laisse la parité verte", () => {
    // Repère MESURÉ au lot de réconciliation. À relever DÉLIBÉRÉMENT quand un
    // lot ajoute des clés ; le voir baisser signifie qu'un lot en a effacé.
    expect(fr.size).toBeGreaterThanOrEqual(843);
  });

  it("les surfaces C5/C5b sont COMPLÈTES — elles ont déjà été effacées une fois", () => {
    // Un plancher sur le total ne voit pas 5 clés retirées et 5 ajoutées.
    // Ces deux namespaces-là portent des écrans entiers : on les fige au nom.
    const under = (ns: string) =>
      [...fr.keys()].filter((k) => k.startsWith(ns)).map((k) => k.slice(ns.length)).sort();

    expect(under("account.ui.visits.")).toEqual([
      "cancel",
      "cancelError",
      "cancelled",
      "empty",
      "loadError",
      "loading",
      "past",
      "title"
    ]);

    expect(under("venueDetail.visit.")).toEqual([
      "confirmed",
      "errorGeneric",
      "intro",
      "loading",
      "loginToBook",
      "none",
      "phoneHint",
      "phoneLabel",
      "seeMine",
      "submit",
      "taken",
      "title"
    ]);
  });
});
