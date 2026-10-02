// Rang 30 (D322) — le calendrier du panneau de demande : les NOMS dans la langue de la page, le WEEK-END du produit.
//
// ⚠ CE QUE CE FICHIER MESURE, ET POURQUOI IL EXISTE ALORS QU'AUCUN DÉFAUT N'A ÉTÉ REPRODUIT. L'arbitrage du rang 30
// partait de « en arabe, les noms de jours et de mois sont en français ». Mesuré à l'ouverture : ils sont en arabe — le
// code les tire d'`Intl` avec la locale de la page, et la capture arabe de D321 le montre. Mais AUCUN test ne le gardait :
// ceux du panneau tirent leur attendu arabe de `monthLabel`/`longDate`, les fonctions mêmes que le composant appelle —
// si elles ignoraient leur locale, composant et attendu sortiraient le même français, et le test resterait vert (D223,
// D241 : une garde qui se relit elle-même ne mesure rien). D'où, ici :
//   - l'attendu sort d'`Intl` APPELÉ DIRECTEMENT par le test, jamais d'une fonction du module ;
//   - il discrimine : l'attendu français ≠ l'attendu arabe (D209 n° 4) ;
//   - et un contrôle qui ne doit RIEN à `Intl` : en arabe, aucun nom en lettres latines ; en français, aucun en arabe ;
//   - une garde de SOURCE : aucune liste de noms de jours ou de mois écrite en dur dans le code du calendrier (mode N-b) ;
//   - le week-end mis en avant est celui de l'AUTORITÉ, `WEEKEND_DAYS` (D56), jamais une liste recopiée (W-d).
// Modes de défaillance : point d'entrée du rang 30 (N-a à N-e, W-a à W-d).
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextIntlClientProvider } from "next-intl";
import ts from "typescript";
import { messages } from "@zwadj/i18n";
import type { VenueAvailabilityDayDTO } from "@zwadj/types";
import { WEEKEND_DAYS } from "../../lib/calendar";
import { BookingDatePicker } from "./booking-date-picker";

type Langue = "fr" | "ar";

/** Août 2027, un créneau libre chaque jour : un mois COMPLET, donc les sept colonnes et les deux week-ends du mois. */
const AOUT_2027: VenueAvailabilityDayDTO[] = Array.from({ length: 31 }, (_, i) => ({
  date: `2027-08-${String(i + 1).padStart(2, "0")}`,
  isHoliday: false,
  slots: [{ slotTemplateId: "s1", status: "AVAILABLE", priceCents: 20_000_000 }]
})) as VenueAvailabilityDayDTO[];

function rendre(locale: Langue) {
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <BookingDatePicker days={AOUT_2027} selected={null} onSelect={() => {}} />
    </NextIntlClientProvider>
  );
  return screen.getByRole("grid");
}

// ── Attendus tirés d'`Intl` DIRECTEMENT (jamais de `monthLabel`, `weekdayHeaders`, `longDate`) ────────────────────────
const MOIS = (l: Langue) =>
  new Intl.DateTimeFormat(l, { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(2027, 7, 1));
/** Le 1er août 2027 est un DIMANCHE (vérifié ci-dessous) : la colonne c de la grille algérienne (D56) est le jour 1 + c. */
const JOUR = (l: Langue, c: number, format: "short" | "long") =>
  new Intl.DateTimeFormat(l, { weekday: format, timeZone: "UTC" }).format(Date.UTC(2027, 7, 1 + c));
const DATE_LONGUE = (l: Langue, jour: number) =>
  new Intl.DateTimeFormat(l, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(2027, 7, jour)
  );

const ARABE = /[؀-ۿ]/;
const LATIN = /[A-Za-zÀ-ÿ]/;

describe("Calendrier du panneau — les noms dans la LANGUE DE LA PAGE (rang 30, D322, N-a à N-d)", () => {
  it("les attendus discriminent : le 1er août 2027 est un dimanche, et chaque nom diffère entre français et arabe", () => {
    expect(new Date(Date.UTC(2027, 7, 1)).getUTCDay()).toBe(0);
    expect(MOIS("fr")).not.toBe(MOIS("ar"));
    for (let c = 0; c < 7; c += 1) expect(JOUR("fr", c, "short")).not.toBe(JOUR("ar", c, "short"));
  });

  it.each(["fr", "ar"] as const)("%s : le mois, les sept en-têtes et le nom d'un jour sortent dans la langue de la page", (l) => {
    const grille = rendre(l);
    // Assertions NATIVES (`toBe`, `toEqual`) : sous neutralisation, l'échec se lit en `AssertionError` (D316).
    expect(grille.getAttribute("aria-labelledby") !== null).toBe(true);
    const titre = document.getElementById(grille.getAttribute("aria-labelledby")!);
    expect(titre?.textContent).toBe(MOIS(l));
    const entetes = Array.from(grille.querySelectorAll("th"));
    expect(entetes.map((th) => th.querySelector("[aria-hidden='true']")?.textContent)).toEqual(
      Array.from({ length: 7 }, (_, c) => JOUR(l, c, "short"))
    );
    expect(entetes.map((th) => th.querySelector(".sr-only")?.textContent)).toEqual(
      Array.from({ length: 7 }, (_, c) => JOUR(l, c, "long"))
    );
    const nom = messages[l].venueDetail.booking.dayFree.replace("{date}", DATE_LONGUE(l, 15));
    expect(screen.queryAllByRole("button", { name: nom }).length).toBe(1);
  });

  it("arabe : aucun nom de mois ni de jour en lettres latines — un contrôle qui ne doit rien à `Intl`", () => {
    const grille = rendre("ar");
    const titre = document.getElementById(grille.getAttribute("aria-labelledby")!)!.textContent ?? "";
    const noms = [titre, ...Array.from(grille.querySelectorAll("th"), (th) => th.textContent ?? "")];
    expect(noms.filter((n) => LATIN.test(n))).toEqual([]);
    expect(noms.every((n) => ARABE.test(n))).toBe(true);
  });

  it("français : aucun nom en écriture arabe — le bras symétrique", () => {
    const grille = rendre("fr");
    const titre = document.getElementById(grille.getAttribute("aria-labelledby")!)!.textContent ?? "";
    const noms = [titre, ...Array.from(grille.querySelectorAll("th"), (th) => th.textContent ?? "")];
    expect(noms.filter((n) => ARABE.test(n))).toEqual([]);
    expect(noms.every((n) => LATIN.test(n))).toBe(true);
  });
});

// ── N-b : aucune liste de noms écrite en dur dans le code du calendrier ───────────────────────────────────────────────
/** Racine du dépôt, dérivée de l'emplacement de CE fichier (idiome de `login-path-guard.test.ts`). */
const RACINE = resolve(__dirname, "../../../../..");
/** Le code qui NOMME des jours ou des mois à l'écran : la grille partagée, le calendrier du panneau, le panneau, et le
 *  calendrier de disponibilité (B5), qui partage la même grille. */
const SOURCES = [
  "apps/client/src/lib/calendar.ts",
  "apps/client/src/lib/booking-calendar.ts",
  "apps/client/src/components/venue/booking-date-picker.tsx",
  "apps/client/src/components/venue/booking-request-panel.tsx",
  "apps/client/src/components/venue/availability-calendar.tsx"
] as const;

/** Tous les noms de jours et de mois que la plateforme peut afficher, en français et en arabe, longs et courts — tirés
 *  d'`Intl` : la liste qu'une faute recopierait. */
function nomsCalendaires(): { exacts: Set<string>; longs: string[] } {
  const exacts = new Set<string>();
  const longs: string[] = [];
  for (const l of ["fr", "ar"]) {
    for (let j = 0; j < 7; j += 1) {
      for (const f of ["long", "short"] as const) {
        const n = new Intl.DateTimeFormat(l, { weekday: f, timeZone: "UTC" }).format(Date.UTC(2027, 7, 1 + j));
        exacts.add(n);
        if (f === "long") longs.push(n);
      }
    }
    for (let m = 0; m < 12; m += 1) {
      for (const f of ["long", "short"] as const) {
        const n = new Intl.DateTimeFormat(l, { month: f, timeZone: "UTC" }).format(Date.UTC(2027, m, 1));
        exacts.add(n);
        if (f === "long") longs.push(n);
      }
    }
  }
  return { exacts, longs };
}

export interface NomEnDur {
  ligne: number;
  texte: string;
}

/** Les noms de jours ou de mois écrits dans le CODE d'un fichier — chaînes, gabarits, texte JSX ; jamais un commentaire
 *  (patron de `login-path-guard.test.ts`). Un littéral EST un nom (« lun. », « السبت »), ou CONTIENT un nom long comme mot.
 *  Rend aussi le nombre de littéraux examinés (D290 : un zéro sur zéro littéral ne mesure rien). */
export function nomsEnDur(nom: string, texte: string): { trouves: NomEnDur[]; examines: number } {
  const { exacts, longs } = nomsCalendaires();
  const motLong = (s: string) =>
    longs.some((n) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(s));
  const fichier = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const trouves: NomEnDur[] = [];
  let examines = 0;
  const visiter = (noeud: ts.Node): void => {
    if (
      ts.isStringLiteral(noeud) ||
      ts.isNoSubstitutionTemplateLiteral(noeud) ||
      ts.isTemplateHead(noeud) ||
      ts.isTemplateMiddle(noeud) ||
      ts.isTemplateTail(noeud) ||
      ts.isJsxText(noeud)
    ) {
      const s = noeud.text.trim();
      if (s !== "") {
        examines += 1;
        if (exacts.has(s) || motLong(s)) {
          trouves.push({ ligne: fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier)).line + 1, texte: s });
        }
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return { trouves, examines };
}

describe("N-b — calibration du relevé des noms écrits en dur, deux bras (D286)", () => {
  it("bras ROUGE : une liste de jours en français, un mois en arabe, un nom dans un gabarit et dans du texte JSX se voient", () => {
    const faute = [
      'const jours = ["dimanche", "lundi", "mardi"];',
      'const mois = "أغسطس";',
      "const t = `${n} vendredi`;",
      "const p = <th>sam.</th>;"
    ].join("\n");
    expect(nomsEnDur("faute.tsx", faute).trouves.map((o) => o.ligne)).toEqual([1, 1, 1, 2, 3, 4]);
  });

  it("bras VERT : un commentaire qui cite les jours, des mots voisins, des clés — rien", () => {
    const sain = [
      "// dimanche → jeudi ouvrés, puis vendredi-samedi (D56)",
      "/* « samedi » en tête : CLDR */",
      'const a = "long";',
      'const b = "venueDetail.calendar";',
      'const c = "Mardi gras est une fête";'
    ].join("\n");
    // « Mardi » (majuscule) n'est pas le nom de jour qu'`Intl` rend (« mardi ») : le relevé compare au texte EXACT.
    expect(nomsEnDur("sain.tsx", sain).trouves).toEqual([]);
  });
});

describe("N-b — aucun nom de jour ni de mois écrit en dur dans le code du calendrier (rang 30, D322)", () => {
  const releve = SOURCES.map((p) => ({ p, ...nomsEnDur(p, readFileSync(join(RACINE, p), "utf8")) }));

  it("le relevé a lu les cinq fichiers, et des littéraux dans chacun (D290)", () => {
    expect(releve.length).toBe(SOURCES.length);
    for (const r of releve) expect(r.examines).toBeGreaterThan(0);
  });

  it("N-b : aucun littéral ne porte un nom de jour ou de mois — ils viennent d'`Intl`, dans la langue de la page", () => {
    expect(releve.flatMap((r) => r.trouves.map((o) => `${r.p}:${o.ligne} « ${o.texte} »`))).toEqual([]);
  });
});

// ── W : le week-end mis en avant est celui du produit ─────────────────────────────────────────────────────────────────
describe("Calendrier du panneau — le WEEK-END mis en avant est celui du produit, `WEEKEND_DAYS` (D56 ; W-a, W-b, W-d)", () => {
  it.each(["fr", "ar"] as const)("%s : chaque jour d'août 2027 porte « is-weekend » si et seulement si l'autorité le dit", (l) => {
    const grille = rendre(l);
    const cases = Array.from(grille.querySelectorAll("td")).filter((td) => !td.classList.contains("cal-pad"));
    // Le jour se lit par son NUMÉRO (texte visible), sa semaine par `getUTCDay` — rien n'est dérivé de la grille elle-même.
    const lus = cases.map((td) => {
      const jour = Number(td.querySelector(".cal-num")?.textContent ?? "NaN");
      return { jour, dow: new Date(Date.UTC(2027, 7, jour)).getUTCDay(), weekend: td.classList.contains("is-weekend") };
    });
    expect(lus.map((c) => c.jour)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(lus.filter((c) => c.weekend !== WEEKEND_DAYS.includes(c.dow)).map((c) => c.jour)).toEqual([]);
    // Deux bras dans le même mois : des jours mis en avant, et des jours qui ne le sont pas.
    const attendus = lus.filter((c) => WEEKEND_DAYS.includes(c.dow)).length;
    expect(lus.filter((c) => c.weekend).length).toBe(attendus);
    expect(attendus > 0 && attendus < 31).toBe(true);
  });
});
