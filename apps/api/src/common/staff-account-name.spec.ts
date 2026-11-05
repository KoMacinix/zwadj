// Le NOM DE COMPTE du personnel — rang 44, L36-3a-1 (D341, MP-9). Deux noms qui s'affichent pareil ne doivent pas faire deux comptes (R-4 (D341)) :
// UNE fonction (`normalizeStaffAccountName`, `@zwadj/types`) fabrique la clé d'unicité `(salle, clé)` ; le serveur et la base la partagent.
//
// ⚠ AUCUNE VALEUR ATTENDUE NE S'ÉCRIT DE MÉMOIRE : les lettres arabes ajoutées par R-4 (D341), les familles de chiffres et les marques invisibles sont énumérées par leurs POINTS DE CODE,
// et la preuve que « NFKC ne les ramène pas » est rejouée ici avec le NFKC du moteur (jamais supposée). Les paires d'une table portent leur motif.
import { describe, expect, it } from "vitest";
import { normalizeStaffAccountName, staffAccountNameSchema } from "@zwadj/types";

const cle = normalizeStaffAccountName;

/** Chaque ligne : [a, b, ce que l'équivalence prouve]. Les deux écritures DOIVENT donner la même clé. */
const EQUIVALENTES: ReadonlyArray<readonly [string, string, string]> = [
  ["Amine", "amine", "la casse"],
  ["AMINE", "amine", "la casse, tout en capitales"],
  ["  Amine  ", "amine", "les espaces de bord"],
  ["Amine    Benali", "amine benali", "les blancs internes comprimés"],
  ["René", "rene", "un diacritique latin COMPOSÉ"],
  ["René", "rene", "le même diacritique DÉCOMPOSÉ (e + accent combinant)"],
  ["Éloïse", "eloise", "deux diacritiques"],
  ["ＡＭＩＮＥ", "amine", "la pleine chasse (NFKC)"],
  ["أمين", "امين", "alef avec hamza → alef"],
  ["إسماعيل", "اسماعيل", "alef avec hamza dessous → alef"],
  ["آمنة", "امنه", "alef madda → alef, et ta marbouta → ha"],
  ["مُحَمَّد", "محمد", "les voyelles brèves (harakat) et la chadda"],
  ["مـحـمـد", "محمد", "le tatweel"],
  ["فاطمة", "فاطمه", "ta marbouta → ha"],
  ["موسى", "موسي", "alef maksura → ya"],
  ["مؤمن", "مومن", "R-4 : waw avec hamza → waw"],
  ["عائشة", "عايشه", "R-4 : ya avec hamza → ya, et ta marbouta → ha"],
  ["کریم", "كريم", "R-4 : kaf et ya PERSANS → kaf et ya arabes"],
  ["caisse٣", "caisse3", "R-4 : chiffre arabe-indien → 0-9"],
  ["caisse۳", "caisse3", "R-4 : chiffre arabe-indien ÉTENDU (persan) → 0-9"],
  ["ca​isse", "caisse", "R-4 : espace de largeur nulle"],
  ["﻿amine", "amine", "R-4 : U+FEFF en tête"],
  ["am‏ine", "amine", "R-4 : marque de direction (RLM) au milieu"],
  ["‮amine‬", "amine", "R-4 : surcharge de direction"],
  ["⁦amine⁩", "amine", "R-4 : isolat de direction"]
];

/** Chaque ligne : deux noms qui DOIVENT rester deux comptes — sans quoi la règle écraserait des personnes. */
const DISTINCTES: ReadonlyArray<readonly [string, string, string]> = [
  ["amine", "amina", "une lettre de plus"],
  ["karim", "kareem", "deux écritures de prénoms voisins ne sont pas fusionnées"],
  ["caisse1", "caisse2", "le chiffre distingue deux postes"],
  ["أمين", "أمير", "deux prénoms arabes voisins"],
  ["علي", "عالي", "une voyelle longue distingue deux prénoms"],
  ["amine.b", "amineb", "le point est conservé"],
  ["ali", "al i", "l'espace interne est significatif"],
  ["فاطمة", "فاطم", "la ta marbouta finale devient ha mais ne disparaît pas"],
  ["o'brien", "obrien", "l'apostrophe est conservée"]
];

describe("normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4)", () => {
  it("⛔ MP-9 — au moins 12 paires ÉQUIVALENTES et au moins 6 paires DISTINCTES (la table est assez large pour rougir sous une règle retirée)", () => {
    expect(EQUIVALENTES.length).toBeGreaterThanOrEqual(12);
    expect(DISTINCTES.length).toBeGreaterThanOrEqual(6);
  });

  it.each(EQUIVALENTES)("deux écritures d'un même nom donnent UNE clé : %j ≡ %j (%s)", (a, b) => {
    expect(cle(a)).toBe(cle(b));
    expect(cle(a), "une clé vide serait équivalente à toutes les autres vides").not.toBe("");
  });

  it.each(DISTINCTES)("deux noms DIFFÉRENTS restent deux clés : %j ≢ %j (%s)", (a, b) => {
    expect(cle(a)).not.toBe(cle(b));
  });

  it("la clé est IDEMPOTENTE : normaliser une clé ne la change pas (sans quoi l'unicité dépendrait du nombre de passages)", () => {
    for (const [a, b] of [...EQUIVALENTES, ...DISTINCTES]) {
      expect(cle(cle(a)), a).toBe(cle(a));
      expect(cle(cle(b)), b).toBe(cle(b));
    }
  });

  it("R-4 — NFKC ne ramène NI les chiffres arabes-indiens et persans, NI les marques invisibles, NI les quatre lettres : la preuve est rejouée avec le NFKC du moteur", () => {
    const points = [
      ...Array.from({ length: 10 }, (_, i) => 0x0660 + i),
      ...Array.from({ length: 10 }, (_, i) => 0x06f0 + i),
      ...Array.from({ length: 5 }, (_, i) => 0x200b + i),
      ...Array.from({ length: 5 }, (_, i) => 0x202a + i),
      ...Array.from({ length: 4 }, (_, i) => 0x2066 + i),
      0xfeff,
      0x0624,
      0x0626,
      0x06a9,
      0x06cc
    ];
    expect(points).toHaveLength(10 + 10 + 5 + 5 + 4 + 1 + 4);
    const changes = points.filter((p) => String.fromCodePoint(p).normalize("NFKC") !== String.fromCodePoint(p));
    expect(changes, "si NFKC en ramenait un, le remplacement explicite de R-4 serait superflu pour lui").toEqual([]);
    // ... et pourtant la clé les ramène : chaque chiffre à son chiffre ASCII, chaque marque à rien.
    for (let i = 0; i < 10; i += 1) {
      expect(cle(`a${String.fromCodePoint(0x0660 + i)}`), `chiffre arabe-indien ${i}`).toBe(`a${i}`);
      expect(cle(`a${String.fromCodePoint(0x06f0 + i)}`), `chiffre persan ${i}`).toBe(`a${i}`);
    }
    const invisibles = [...Array.from({ length: 5 }, (_, i) => 0x200b + i), ...Array.from({ length: 5 }, (_, i) => 0x202a + i), ...Array.from({ length: 4 }, (_, i) => 0x2066 + i), 0xfeff];
    for (const p of invisibles) {
      expect(cle(`ab${String.fromCodePoint(p)}cd`), `U+${p.toString(16).toUpperCase()} doit disparaître`).toBe("abcd");
    }
  });

  it("une chaîne qui ne contient que des marques invisibles ou des diacritiques donne une clé VIDE (que la CHECK `account_name_key <> ''` et le schéma refusent)", () => {
    expect(cle("​‌﻿")).toBe("");
    expect(cle("́̀")).toBe("");
    expect(cle("")).toBe("");
    expect(cle("   ")).toBe("");
  });

  it("les blancs spéciaux (insécable, pleine chasse) valent un espace puis sont comprimés", () => {
    expect(cle("amine  benali")).toBe("amine benali");
    expect(cle("amine　benali")).toBe("amine benali");
  });
});

describe("staffAccountNameSchema — ce que l'écran et le serveur acceptent d'un nom de compte (bornes : 2 à 40 caractères)", () => {
  const ok = (v: string) => staffAccountNameSchema.safeParse(v);
  const issues = (v: string) => (ok(v).success ? [] : (ok(v) as { error: { issues: { message: string }[] } }).error.issues.map((i) => i.message));

  it.each(["Amine", "أمين", "caisse 2", "o'brien", "Karim B.", "réception-1", "Aya_B", "مُحَمَّد"])("accepte le nom réel %j", (v) => {
    expect(ok(v).success).toBe(true);
  });

  it("rogne les espaces de bord et rend le nom ROGNÉ (c'est lui qui s'affiche)", () => {
    const r = ok("  Amine  ");
    expect(r.success && r.data).toBe("Amine");
  });

  it("refuse un nom trop court (1 caractère), vide ou blanc : `staff.validation.accountNameTooShort`", () => {
    expect(issues("a")).toEqual(["staff.validation.accountNameTooShort"]);
    expect(issues("   ")).toEqual(["staff.validation.accountNameTooShort"]);
    expect(issues("")).toEqual(["staff.validation.accountNameTooShort"]);
  });

  it("la borne haute est 40 : 40 caractères passent, 41 sont refusés (`staff.validation.accountNameTooLong`)", () => {
    expect(ok("a".repeat(40)).success).toBe(true);
    expect(issues("a".repeat(41))).toEqual(["staff.validation.accountNameTooLong"]);
  });

  it("refuse les caractères qui ne sont ni lettres, ni marques, ni chiffres, ni espace . _ ' - : `staff.validation.accountNameInvalid`", () => {
    for (const v of ["<script>", "a@b", "a/b", "caisse;1", "nom\ttab", "a​b"]) {
      expect(issues(v), v).toEqual(["staff.validation.accountNameInvalid"]);
    }
  });

  it("refuse un nom dont la CLÉ serait vide (que des diacritiques combinants) : la base le refuserait aussi", () => {
    expect(ok("́́").success).toBe(false);
  });

  it("une valeur qui n'est pas une chaîne est refusée avec le message du champ obligatoire", () => {
    const r = staffAccountNameSchema.safeParse(undefined);
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.message).toBe("staff.validation.accountNameRequired");
  });
});
