import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` où la fonction est
// définie. Même raison que les contrats de styles hébergés dans l'app Pro :
// `packages/types` n'a pas de lanceur de tests, et lui en ajouter un pour un
// seul module coûterait une configuration de plus à maintenir. Écrit là-bas, ce
// fichier n'aurait jamais été exécuté — un test qui ne tourne pas est pire que
// pas de test, il donne l'illusion d'une preuve.
import {
  DEFAULT_PHONE_COUNTRY,
  DZ_MOBILE_E164,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_IDS,
  applyPhoneInput,
  isDzPhoneE164,
  isPhoneComplete,
  nationalDigitsOf,
  normalizeDzPhone,
  normalizePhone,
  phoneCountry,
  toE164,
  type PhoneCountryId
} from "@zwadj/types";

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

// ══ Rang 32 (D325) — LE MODÈLE DE PAYS ET LA RÈGLE DE SAISIE ═══════════════════════════════════════════════════════
// Arbitrage de Ko (04/10/2026) : « Pas de numéro fixe. Tous les champs de téléphone du produit n'acceptent qu'un mobile : +213,
// 9 chiffres, premier chiffre 5, 6 ou 7. La règle vit UNE fois dans le contrat partagé ; tous les champs l'importent. » Les trois
// valeurs ci-dessous sont la lettre de CETTE décision — la seule autorité qui n'est pas dans le code — ; tout le reste se DÉRIVE
// du modèle, jamais d'une liste recopiée ici.

describe("PHONE_COUNTRIES — le modèle de pays, UNE source", () => {
  it("l'Algérie, mot pour mot l'arbitrage de Ko : +213, 9 chiffres, premier chiffre 5, 6 ou 7", () => {
    expect(PHONE_COUNTRIES.DZ.dialCode).toBe("+213");
    expect(PHONE_COUNTRIES.DZ.nationalLength).toBe(9);
    expect([...PHONE_COUNTRIES.DZ.leadingDigits].sort()).toEqual(["5", "6", "7"]);
  });

  it("le pays par défaut est dans le modèle, et le modèle n'a qu'UNE entrée aujourd'hui", () => {
    expect(PHONE_COUNTRY_IDS).toContain(DEFAULT_PHONE_COUNTRY);
    expect(PHONE_COUNTRY_IDS).toEqual(Object.keys(PHONE_COUNTRIES));
    expect(PHONE_COUNTRY_IDS).toHaveLength(1);
    expect(phoneCountry()).toBe(PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY]);
  });

  it("chaque entrée est bien formée : un « + », des chiffres, une longueur entière, des premiers chiffres qui en sont", () => {
    for (const id of PHONE_COUNTRY_IDS) {
      const pays = PHONE_COUNTRIES[id];
      expect(pays.id).toBe(id);
      expect(pays.dialCode).toMatch(/^\+\d{1,3}$/);
      expect(Number.isInteger(pays.nationalLength)).toBe(true);
      expect(pays.nationalLength).toBeGreaterThan(1);
      expect(pays.leadingDigits).toMatch(/^\d+$/);
      expect(pays.trunkPrefix).toMatch(/^\d$/);
      // Un premier chiffre admis ne peut pas être le zéro de ligne nationale : « 0… » ne serait plus un préfixe retirable.
      expect(pays.leadingDigits).not.toContain(pays.trunkPrefix);
    }
  });

  /** ⚠ LA DÉRIVATION se mesure : `DZ_MOBILE_E164`, `normalizePhone` et `isPhoneComplete` portent chacun leur propre test de la forme, tous
   *  construits à partir du modèle. S'ils divergeaient, un champ accepterait ce que le schéma refuse. On énumère TOUS les premiers chiffres
   *  et les longueurs de 7 à 11 : aucun cas écrit à la main. */
  it("DZ_MOBILE_E164, normalizePhone et isPhoneComplete s'accordent, pour chaque premier chiffre et chaque longueur", () => {
    const pays = PHONE_COUNTRIES.DZ;
    let examines = 0;
    for (let premier = 0; premier <= 9; premier += 1) {
      for (let longueur = 7; longueur <= 11; longueur += 1) {
        const national = String(premier) + "1".repeat(longueur - 1);
        const attendu = pays.leadingDigits.includes(String(premier)) && longueur === pays.nationalLength;
        examines += 1;
        expect(DZ_MOBILE_E164.test(`${pays.dialCode}${national}`), `regex ${national}`).toBe(attendu);
        expect(isPhoneComplete("DZ", national), `complet ${national}`).toBe(attendu);
        expect(normalizePhone("DZ", `${pays.dialCode}${national}`) !== null, `normalise ${national}`).toBe(attendu);
      }
    }
    expect(examines).toBe(50);
  });
});

describe("applyPhoneInput — la règle de SAISIE d'un champ", () => {
  /** Une frappe, un caractère à la fois : `previous` est la valeur d'avant, `raw` celle d'après. */
  const taper = (id: PhoneCountryId, texte: string, depart = ""): { digits: string; leadingDigitRejected: boolean } => {
    let etat = { digits: depart, leadingDigitRejected: false };
    for (const caractere of texte) etat = applyPhoneInput(id, etat.digits, etat.digits + caractere);
    return etat;
  };
  const numeroValide = (id: PhoneCountryId): string =>
    PHONE_COUNTRIES[id].leadingDigits.charAt(0) + "2".repeat(PHONE_COUNTRIES[id].nationalLength - 1);

  /** ⚠ D55 : le cas RÉEL d'abord — un pro qui TAPE un numéro, et un autre qui le COLLE. Si la règle en refusait un, elle aurait tort. */
  for (const id of PHONE_COUNTRY_IDS) {
    it(`${id} — un numéro tapé chiffre par chiffre est conservé et complet`, () => {
      const etat = taper(id, numeroValide(id));
      expect(etat.digits).toBe(numeroValide(id));
      expect(etat.leadingDigitRejected).toBe(false);
      expect(isPhoneComplete(id, etat.digits)).toBe(true);
    });
  }

  const COLLES: [string, string][] = [
    ["0555 12 34 56", "avec le zéro de ligne nationale et des espaces"],
    ["0555123456", "avec le zéro"],
    ["+213 555 12 34 56", "avec l'indicatif et des espaces"],
    ["+213555123456", "canonique"],
    ["00213555123456", "préfixe composé à l'ancienne"],
    ["213555123456", "l'indicatif sans le +"],
    ["555123456", "déjà national"]
  ];
  for (const [saisie, pourquoi] of COLLES) {
    it(`un collage « ${saisie} » (${pourquoi}) devient les neuf chiffres nationaux`, () => {
      const etat = applyPhoneInput("DZ", "", saisie);
      expect(etat.digits).toBe("555123456");
      expect(etat.leadingDigitRejected).toBe(false);
    });
  }

  it("SEULS LES CHIFFRES passent : lettres, symboles et espaces tapés sont écartés", () => {
    expect(taper("DZ", "5a5-5 5!5").digits).toBe("55555");
    expect(applyPhoneInput("DZ", "", "abc").digits).toBe("");
  });

  it("AU PLUS neuf chiffres : le dixième est écarté, à la frappe comme au collage", () => {
    const longueur = PHONE_COUNTRIES.DZ.nationalLength;
    expect(taper("DZ", "5".repeat(longueur + 3)).digits).toBe("5".repeat(longueur));
    expect(applyPhoneInput("DZ", "", "5551234567890123").digits).toHaveLength(longueur);
  });

  it("⚠ UN PREMIER CHIFFRE REFUSÉ reste affiché, SEUL, avec son drapeau d'erreur — chacun des chiffres que le modèle ne liste pas", () => {
    const refuses = [..."0123456789"].filter((c) => !PHONE_COUNTRIES.DZ.leadingDigits.includes(c));
    expect(refuses.length).toBe(7);
    for (const chiffre of refuses) {
      const etat = applyPhoneInput("DZ", "", chiffre);
      expect(etat, `premier chiffre ${chiffre}`).toEqual({ digits: chiffre, leadingDigitRejected: true });
    }
  });

  it("⚠ LA SAISIE SUIVANTE EST BLOQUÉE tant que le premier chiffre est refusé : taper n'ajoute rien", () => {
    const etat = taper("DZ", "0555123456");
    expect(etat).toEqual({ digits: "0", leadingDigitRejected: true });
  });

  it("effacer le chiffre refusé, ou le REMPLACER, rend la main — la saisie n'est pas coincée", () => {
    expect(applyPhoneInput("DZ", "0", "")).toEqual({ digits: "", leadingDigitRejected: false });
    // Sélectionner « 0 » et taper « 5 » : la valeur d'après est « 5 », pas « 05 ».
    expect(applyPhoneInput("DZ", "0", "5")).toEqual({ digits: "5", leadingDigitRejected: false });
    // Sélectionner « 0 » et COLLER un numéro complet : il remplace.
    expect(applyPhoneInput("DZ", "0", "0555 12 34 56").digits).toBe("555123456");
  });

  it("un collage dont le numéro national commence mal reste refusé : « 0123456789 » → « 1 », refusé", () => {
    expect(applyPhoneInput("DZ", "", "0123456789")).toEqual({ digits: "1", leadingDigitRejected: true });
  });

  it("une FRAPPE n'est jamais réinterprétée : un « 0 » tapé en premier est un premier chiffre refusé, pas un zéro retiré", () => {
    expect(applyPhoneInput("DZ", "", "0")).toEqual({ digits: "0", leadingDigitRejected: true });
  });

  it("l'état rendu est toujours une suite de chiffres d'au plus la longueur du modèle (propriété, 200 entrées)", () => {
    const alphabet = "0123456789+ -()abc.";
    let graine = 42;
    const suivant = () => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine;
    };
    for (let i = 0; i < 200; i += 1) {
      const longueur = suivant() % 20;
      let brut = "";
      for (let j = 0; j < longueur; j += 1) brut += alphabet.charAt(suivant() % alphabet.length);
      const etat = applyPhoneInput("DZ", "", brut);
      expect(etat.digits, JSON.stringify(brut)).toMatch(/^\d*$/);
      expect(etat.digits.length).toBeLessThanOrEqual(PHONE_COUNTRIES.DZ.nationalLength);
    }
  });
});

describe("toE164 et nationalDigitsOf — la valeur ENVOYÉE, et celle qu'on relit", () => {
  it("le format envoyé à l'API est celui que le contrat attend : l'indicatif du modèle puis les chiffres", () => {
    expect(toE164("DZ", "555123456")).toBe(`${PHONE_COUNTRIES.DZ.dialCode}555123456`);
    expect(DZ_MOBILE_E164.test(toE164("DZ", "555123456"))).toBe(true);
    expect(normalizeDzPhone(toE164("DZ", "555123456"))).toBe(toE164("DZ", "555123456"));
  });

  it("un champ vide reste vide : l'appelant décide s'il l'omet", () => {
    expect(toE164("DZ", "")).toBe("");
  });

  it("une valeur enregistrée se relit en chiffres nationaux, et l'aller-retour est exact", () => {
    expect(nationalDigitsOf("DZ", "+213555123456")).toBe("555123456");
    expect(toE164("DZ", nationalDigitsOf("DZ", "+213661223344"))).toBe("+213661223344");
  });

  it("une valeur qui n'est pas un mobile du pays se relit VIDE — jamais réparée au jugé", () => {
    expect(nationalDigitsOf("DZ", "+21321234567")).toBe("");
    expect(nationalDigitsOf("DZ", null)).toBe("");
    expect(nationalDigitsOf("DZ", "+33612345678")).toBe("");
  });
});
