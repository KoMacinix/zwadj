import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` — même raison que `quote-reference.spec.ts` : `packages/types` n'a pas de lanceur de tests.
import { QuoteErrorCode, quoteCreateSchema, quotePromoteSchema, quoteReviseSchema, type QuoteDTO } from "@zwadj/types";

// ══ L36-2 (D339) — LES CONTRATS DU DEVIS BROUILLON NON OFFICIEL ═════════════════════════════════════════════════════════════════════════════════════════════════
// Modes de défaillance : `docs/preuves/D339/cadrage-complement.md` (D-13, D-15, D-16, D-4) et `docs/preuves/D338/cadrage.md`. Réponses de Ko Q1 (a), Q2 (a), Q3 (a) ; décisions
// du relecteur R-1 (la révision ne choisit pas le drapeau) et R-2 (un brouillon ne porte ni fiche ni nom). Une règle vit UNE fois, dans le contrat partagé (D147).

const BASE = { eventDate: "2027-09-18", slotTemplateId: "018f0000-0000-7000-8000-000000000001", guests: 250 };
const FICHE = "018f0000-0000-7000-8000-0000000000f1";

/** Le chemin et le message de chaque refus — un refus sans message de catalogue serait un 400 que l'écran ne saurait pas dire. */
const refus = (r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => `${i.path.join(".")}:${i.message}`);

describe("⛔ D-16 (R-2) — `quoteCreateSchema` : le champ `isOfficial` n'accepte que `false`", () => {
  it("⛔ D-13 — OMIS, le devis est officiel et se crée comme avant : sans fiche, ou avec fiche et nom", () => {
    expect(quoteCreateSchema.safeParse(BASE).success).toBe(true);
    expect(quoteCreateSchema.safeParse({ ...BASE, clientRecordId: FICHE, clientNameLatin: "Amina Bensalem" }).success).toBe(true);
  });

  it("⛔ `isOfficial: false` SEUL : un brouillon, accepté", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, isOfficial: false });
    expect(r.success).toBe(true);
    expect(r.success ? r.data.isOfficial : "refusé").toBe(false);
  });

  it("⛔ D-13 — `isOfficial: true` est REFUSÉ : il n'y a qu'une façon de dire « officiel » (omettre le champ)", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, isOfficial: true });
    expect(r.success).toBe(false);
    expect(refus(r)).toEqual(["isOfficial:quote.validation.isOfficialInvalid"]);
  });

  it.each([["la chaîne « false »", "false"], ["null", null], ["zéro", 0], ["la chaîne vide", ""]])("⚠ %s n'est PAS le booléen `false` : refusé", (_nom, valeur) => {
    expect(quoteCreateSchema.safeParse({ ...BASE, isOfficial: valeur }).success).toBe(false);
  });

  it("⛔ D-16 — un brouillon AVEC une fiche : UN seul refus, `draftHasNoClient`, sur `isOfficial` (pas aussi « nom exigé »)", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, isOfficial: false, clientRecordId: FICHE });
    expect(r.success).toBe(false);
    expect(refus(r)).toEqual(["isOfficial:quote.validation.draftHasNoClient"]);
  });

  it("⛔ D-16 — un brouillon AVEC un nom latin, ou arabe, ou les deux, mais SANS fiche : UN seul refus, `draftHasNoClient` (pas aussi « fiche exigée »)", () => {
    for (const noms of [{ clientNameLatin: "Amina Bensalem" }, { clientNameAr: "آمنة بن سالم" }, { clientNameLatin: "Amina", clientNameAr: "آمنة" }]) {
      const r = quoteCreateSchema.safeParse({ ...BASE, isOfficial: false, ...noms });
      expect(r.success, JSON.stringify(noms)).toBe(false);
      expect(refus(r), JSON.stringify(noms)).toEqual(["isOfficial:quote.validation.draftHasNoClient"]);
    }
  });

  it("⛔ D-16 — un brouillon avec une fiche ET un nom : le même refus (la règle de Q2 ne dépend pas de la validité du reste)", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, isOfficial: false, clientRecordId: FICHE, clientNameLatin: "Amina Bensalem" });
    expect(refus(r)).toEqual(["isOfficial:quote.validation.draftHasNoClient"]);
  });

  it("⚠ `.strict()` inchangé : une clé inconnue reste refusée, brouillon ou non", () => {
    expect(quoteCreateSchema.safeParse({ ...BASE, isOfficial: false, extra: 1 }).success).toBe(false);
    expect(quoteCreateSchema.safeParse({ ...BASE, validUntil: "2027-09-01" }).success).toBe(false);
  });
});

describe("⛔ D-15 (R-1) — `quoteReviseSchema` n'est PLUS `quoteCreateSchema` : la révision ne choisit pas le drapeau", () => {
  it("⛔ les deux schémas sont DEUX objets (sans quoi `isOfficial` passerait par la révision)", () => {
    expect(quoteReviseSchema).not.toBe(quoteCreateSchema);
  });

  it.each([["false", false], ["true", true]])("⛔ `isOfficial: %s` est une clé INCONNUE de la révision : 400 `unknownKey`", (_nom, valeur) => {
    const r = quoteReviseSchema.safeParse({ ...BASE, isOfficial: valeur });
    expect(r.success).toBe(false);
    expect(refus(r).join(" ")).toContain("quote.validation.unknownKey");
  });

  it("le corps d'une révision reste celui d'une création (une version est un devis ENTIER) : sans fiche, ou avec fiche et nom", () => {
    expect(quoteReviseSchema.safeParse(BASE).success).toBe(true);
    expect(quoteReviseSchema.safeParse({ ...BASE, clientRecordId: FICHE, clientNameAr: "آمنة بن سالم" }).success).toBe(true);
  });

  it("⛔ les DEUX règles fiche ↔ nom de rang 41 tiennent aussi pour la révision (une seule fonction pour les deux schémas)", () => {
    expect(refus(quoteReviseSchema.safeParse({ ...BASE, clientNameLatin: "Amina Bensalem" }))).toContain("clientRecordId:quote.validation.clientRecordRequired");
    expect(refus(quoteReviseSchema.safeParse({ ...BASE, clientRecordId: FICHE }))).toContain("clientNameLatin:quote.validation.clientNameRequired");
  });
});

describe("⛔ D-4 — `quotePromoteSchema` : la fiche et AU MOINS un nom, rien d'autre", () => {
  it("la forme de K-4 : une fiche et un nom — accepté, le nom rogné", () => {
    const r = quotePromoteSchema.safeParse({ clientRecordId: FICHE, clientNameLatin: " Amina Bensalem " });
    expect(r.success ? r.data : null).toEqual({ clientRecordId: FICHE, clientNameLatin: "Amina Bensalem" });
  });

  it("les deux écritures du nom ensemble : acceptées", () => {
    expect(quotePromoteSchema.safeParse({ clientRecordId: FICHE, clientNameLatin: "Amina", clientNameAr: "آمنة" }).success).toBe(true);
  });

  it("⛔ SANS fiche : refusé, et le refus nomme la fiche (la fiche est obligatoire, à la différence d'une création)", () => {
    const r = quotePromoteSchema.safeParse({ clientNameLatin: "Amina Bensalem" });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("clientRecordId:quote.validation.clientRecordRequired");
  });

  it("⛔ SANS aucun nom : refusé, et le refus nomme le nom", () => {
    const r = quotePromoteSchema.safeParse({ clientRecordId: FICHE });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("clientNameLatin:quote.validation.clientNameRequired");
  });

  it("un identifiant de fiche qui n'est pas un UUID, un nom hors de la règle partagée : refusés", () => {
    expect(refus(quotePromoteSchema.safeParse({ clientRecordId: "pas-un-uuid", clientNameLatin: "Amina" }))).toContain("clientRecordId:quote.validation.idInvalid");
    expect(quotePromoteSchema.safeParse({ clientRecordId: FICHE, clientNameLatin: "Amina123" }).success).toBe(false);
  });

  it("⛔ `.strict()` : la promotion ne reçoit NI `isOfficial`, NI date, NI invités, NI aucune autre clé — elle ne change aucun montant", () => {
    for (const extra of [{ isOfficial: true }, { guests: 100 }, { eventDate: "2027-09-18" }, { totalCents: 1 }]) {
      const r = quotePromoteSchema.safeParse({ clientRecordId: FICHE, clientNameLatin: "Amina", ...extra });
      expect(r.success, JSON.stringify(extra)).toBe(false);
    }
  });
});

describe("Les codes d'erreur et le DTO", () => {
  it("⛔ trois codes NEUFS, chacun sous son propre nom (un code partagé empêcherait l'écran de distinguer les refus)", () => {
    expect(QuoteErrorCode.QUOTE_NOT_OFFICIAL).toBe("QUOTE_NOT_OFFICIAL");
    expect(QuoteErrorCode.QUOTE_ALREADY_OFFICIAL).toBe("QUOTE_ALREADY_OFFICIAL");
    expect(QuoteErrorCode.QUOTE_DRAFT_HAS_NO_CLIENT).toBe("QUOTE_DRAFT_HAS_NO_CLIENT");
    expect(new Set(Object.values(QuoteErrorCode)).size).toBe(Object.values(QuoteErrorCode).length);
  });

  it("`QuoteDTO.isOfficial` est un booléen OBLIGATOIRE (le compilateur le garde : ce `satisfies` ne compile pas sans lui)", () => {
    const champs = { isOfficial: true } satisfies Pick<QuoteDTO, "isOfficial">;
    expect(champs.isOfficial).toBe(true);
  });
});

describe("⛔ Les messages du lot existent dans les DEUX catalogues, non vides, et ne sont pas le même texte", () => {
  const catalogue = (locale: "fr" | "ar"): Record<string, unknown> =>
    JSON.parse(readFileSync(join(process.cwd(), "..", "..", "packages", "i18n", "messages", `${locale}.json`), "utf8")) as Record<string, unknown>;
  const lire = (arbre: Record<string, unknown>, chemin: string): unknown => chemin.split(".").reduce<unknown>((n, cle) => (n as Record<string, unknown> | undefined)?.[cle], arbre);

  // Les clés que le contrat et les services nomment — relevées des schémas ci-dessus (messages d'issue) et des codes d'erreur (`quote.errors.*`).
  const CLES = [
    "quote.errors.notOfficial",
    "quote.errors.alreadyOfficial",
    "quote.errors.draftHasNoClient",
    "quote.validation.isOfficialInvalid",
    "quote.validation.draftHasNoClient",
    "quote.document.draft"
  ];

  it.each(CLES)("%s", (cle) => {
    const fr = lire(catalogue("fr"), cle);
    const ar = lire(catalogue("ar"), cle);
    expect(typeof fr, `FR : ${cle}`).toBe("string");
    expect(typeof ar, `AR : ${cle}`).toBe("string");
    expect((fr as string).trim(), `FR vide : ${cle}`).not.toBe("");
    expect((ar as string).trim(), `AR vide : ${cle}`).not.toBe("");
    expect(fr, `FR = AR : ${cle}`).not.toBe(ar);
  });

  it("⛔ chaque message d'issue des trois schémas se résout dans les deux catalogues (un 400 sans phrase serait un 400 muet)", () => {
    const issues = new Set<string>();
    const cas: [unknown, Record<string, unknown>][] = [
      [quoteCreateSchema, { ...BASE, isOfficial: true }],
      [quoteCreateSchema, { ...BASE, isOfficial: false, clientRecordId: FICHE }],
      [quoteReviseSchema, { ...BASE, isOfficial: false }],
      [quotePromoteSchema, {}],
      [quotePromoteSchema, { clientRecordId: "x", clientNameLatin: "Amina123" }]
    ];
    for (const [schema, corps] of cas) {
      const r = (schema as typeof quoteCreateSchema).safeParse(corps);
      for (const m of refus(r)) issues.add(m.slice(m.indexOf(":") + 1));
    }
    expect(issues.size, "aucun message relevé : le test ne mesurerait rien").toBeGreaterThanOrEqual(5);
    for (const cle of issues) {
      expect(typeof lire(catalogue("fr"), cle), `FR : ${cle}`).toBe("string");
      expect(typeof lire(catalogue("ar"), cle), `AR : ${cle}`).toBe("string");
    }
  });

  it("⚠ le mot du filigrane est celui de la consigne : « BROUILLON » en français, « مسودة » en arabe", () => {
    expect(lire(catalogue("fr"), "quote.document.draft")).toBe("BROUILLON");
    expect(lire(catalogue("ar"), "quote.document.draft")).toBe("مسودة");
  });
});
