import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` où la fonction est
// définie. Même raison que les contrats de styles hébergés dans l'app Pro :
// `packages/types` n'a pas de lanceur de tests, et lui en ajouter un pour un
// seul module coûterait une configuration de plus à maintenir. Écrit là-bas, ce
// fichier n'aurait jamais été exécuté — un test qui ne tourne pas est pire que
// pas de test, il donne l'illusion d'une preuve.
import { DZ_MOBILE_E164, isDzPhoneE164, normalizeDzPhone } from "@zwadj/types";

const CANONIQUE = "+213555123456";

describe("normalizeDzPhone — ce qu'elle doit ACCEPTER", () => {
  /** ⚠ D55 : ces cas ont été écrits AVANT la règle. Ce ne sont pas des cas de
   *  laboratoire — c'est la liste des formes sous lesquelles un pro algérien
   *  écrit réellement un numéro. Si la borne en rejetait un, ce serait la borne
   *  qui aurait tort. */
  const ACCEPTÉS: [string, string][] = [
    ["0555123456", "comme on le tape sur un clavier de téléphone"],
    ["05 55 12 34 56", "comme on l'écrit sur une carte de visite"],
    ["0555-12-34-56", "avec des tirets"],
    ["0555.12.34.56", "avec des points"],
    ["(0555) 12 34 56", "avec des parenthèses"],
    ["555123456", "sans le zéro, quand on sait que l'indicatif le remplace"],
    ["+213555123456", "déjà canonique — l'existant en base"],
    ["+213 555 12 34 56", "canonique, mais aéré"],
    ["00213555123456", "préfixe international composé à l'ancienne"],
    ["213555123456", "le même, sans le +"],
    ["  0555123456  ", "avec des espaces autour"]
  ];

  for (const [saisie, pourquoi] of ACCEPTÉS) {
    it(`${saisie} — ${pourquoi}`, () => {
      expect(normalizeDzPhone(saisie)).toBe(CANONIQUE);
    });
  }

  it("les trois opérateurs passent : 05 Ooredoo, 06 Mobilis, 07 Djezzy", () => {
    expect(normalizeDzPhone("0555123456")).toBe("+213555123456");
    expect(normalizeDzPhone("0661223344")).toBe("+213661223344");
    expect(normalizeDzPhone("0770456789")).toBe("+213770456789");
  });
});

describe("normalizeDzPhone — ce qu'elle doit REFUSER", () => {
  /** ⚠ LE FIXE EST LE REFUS QUI COMPTE, parce qu'il était accepté hier. `+213`
   *  suivi de 8 chiffres était valide au schéma précédent. La décision produit
   *  est « mobile uniquement » : `ProProfile.phone` est la destination WhatsApp
   *  des notifications (D60), et un fixe n'y reçoit rien — silencieusement. */
  const REFUSÉS: [string, string][] = [
    ["021234567", "fixe d'Alger — huit chiffres, décision produit"],
    ["+21321234567", "le même fixe, déjà préfixé"],
    ["041123456", "fixe d'Oran"],
    ["0455123456", "préfixe 4 : aucun opérateur mobile"],
    ["0855123456", "préfixe 8 : idem"],
    ["055512345", "huit chiffres après le zéro : il en manque un"],
    ["05551234567", "un chiffre de trop"],
    ["+33612345678", "indicatif étranger"],
    ["0033612345678", "le même, composé à l'ancienne"],
    ["", "chaîne vide"],
    ["   ", "des espaces seulement"],
    ["pas un numéro", "du texte"],
    ["+213", "l'indicatif seul"]
  ];

  for (const [saisie, pourquoi] of REFUSÉS) {
    it(`${JSON.stringify(saisie)} — ${pourquoi}`, () => {
      expect(normalizeDzPhone(saisie)).toBeNull();
    });
  }

  it("null et undefined ne lèvent pas : une valeur absente n'est pas une erreur", () => {
    expect(normalizeDzPhone(null)).toBeNull();
    expect(normalizeDzPhone(undefined)).toBeNull();
  });
});

describe("normalizeDzPhone — propriétés", () => {
  /** ⚠ LA PROPRIÉTÉ DONT DÉPENDRA LE DÉDOUBLONNAGE. Si normaliser deux fois ne
   *  donnait pas le même résultat que normaliser une fois, une valeur relue en
   *  base puis renormalisée dériverait — et `(venueId, phone)` laisserait
   *  passer deux fiches pour une seule personne. */
  it("est idempotente : normaliser une sortie ne la change pas", () => {
    for (const saisie of ["0555123456", "00213661223344", "770456789"]) {
      const une = normalizeDzPhone(saisie);
      expect(une).not.toBeNull();
      expect(normalizeDzPhone(une)).toBe(une);
    }
  });

  /** ⚠ L'ORDRE DES PRÉFIXES, mesuré plutôt qu'affirmé. Retirer le zéro initial
   *  AVANT le préfixe international transformerait `00213…` en `0213…`, que
   *  plus rien ne saurait lire. Ce cas rougit si l'ordre est inversé. */
  it("00213 est traité comme un préfixe international, pas comme un zéro suivi de 0213", () => {
    expect(normalizeDzPhone("00213555123456")).toBe(CANONIQUE);
  });

  it("toute sortie non nulle satisfait la forme canonique", () => {
    for (const saisie of ["0555123456", "0661223344", "0770456789", "213555123456"]) {
      const sortie = normalizeDzPhone(saisie);
      expect(sortie).not.toBeNull();
      expect(DZ_MOBILE_E164.test(sortie as string), `${saisie} → ${String(sortie)}`).toBe(true);
      expect(isDzPhoneE164(sortie as string)).toBe(true);
    }
  });
});

describe("isDzPhoneE164 — lecture, pas réparation", () => {
  it("dit vrai sur la forme canonique et faux sur une saisie locale", () => {
    expect(isDzPhoneE164(CANONIQUE)).toBe(true);
    // Parfaitement normalisable, mais PAS encore canonique : la distinction est
    // le sujet même de cette fonction.
    expect(isDzPhoneE164("0555123456")).toBe(false);
  });

  it("dit faux sur un fixe, même parfaitement formé", () => {
    expect(isDzPhoneE164("+21321234567")).toBe(false);
  });
});
