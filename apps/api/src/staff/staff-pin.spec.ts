// LE PIN : LE GÉNÉRATEUR ET LA LISTE FERMÉE DES PIN TRIVIAUX — rang 58, L36-3b (D356, DR5, MP-10). Un module PUR : l'aléa lui est passé en PARAMÈTRE (S-109), il tire jusqu'à obtenir un PIN qui n'est PAS trivial.
// ⛔ L'ORACLE DE CE SPEC N'EST PAS LE CODE : la liste des PIN triviaux est ici écrite AUTREMENT (des expressions régulières pour les répétitions, des listes LITTÉRALES pour les suites) et confrontée au module sur
// les DIX MILLE PIN de quatre chiffres, un par un. Un oracle qui recopierait la règle du module serait vert par construction (D241).
// ⚠ UNE ASSERTION NATIVE par cas (D304, D352).
import { describe, expect, it } from "vitest";
import { STAFF_LIMITS } from "@zwadj/types";
import { PIN_MAX_DRAWS, generatePin, isTrivialPin } from "./staff-pin";

const TOUS = Array.from({ length: 10 ** STAFF_LIMITS.PIN_LENGTH }, (_, n) => String(n).padStart(STAFF_LIMITS.PIN_LENGTH, "0"));

// ── L'oracle indépendant, pour quatre chiffres ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTANTES = ["0123", "1234", "2345", "3456", "4567", "5678", "6789", "7890", "8901", "9012"];
const DESCENDANTES = ["3210", "4321", "5432", "6543", "7654", "8765", "9876", "0987", "1098", "2109"];
const oracleTrivial = (pin: string): boolean =>
  /^(\d)\1{3}$/.test(pin) || // aaaa
  /^(\d)(\d)\1\2$/.test(pin) || // abab
  /^(\d)\1(\d)\2$/.test(pin) || // aabb
  MONTANTES.includes(pin) ||
  DESCENDANTES.includes(pin);

describe("isTrivialPin — la liste FERMÉE (MP-10) : des répétitions et des suites, rien d'autre", () => {
  it("⛔ sur les DIX MILLE PIN de quatre chiffres, le module et l'oracle écrit autrement sont d'accord, un par un", () => {
    const desaccords = TOUS.filter((pin) => isTrivialPin(pin) !== oracleTrivial(pin));
    expect(TOUS.length, "le corpus parcouru : tous les PIN de la longueur du levier").toBe(10 ** STAFF_LIMITS.PIN_LENGTH);
    expect(desaccords, "PIN sur lesquels le module et l'oracle divergent").toEqual([]);
  });

  it("les cas qu'un humain reconnaît sont refusés : 0000, 1111, 9999, 1234, 4321, 7890, 1212, 2121, 1122, 6677", () => {
    for (const pin of ["0000", "1111", "9999", "1234", "4321", "7890", "1212", "2121", "1122", "6677"]) {
      expect(isTrivialPin(pin), pin).toBe(true);
    }
  });

  it("⛔ un témoin POSITIF (une garde qui refuserait tout passerait les cas ci-dessus) : des PIN ordinaires ne sont PAS triviaux", () => {
    for (const pin of ["4821", "0482", "9136", "2580", "1357", "1990", "3072", "8453"]) {
      expect(isTrivialPin(pin), pin).toBe(false);
    }
  });

  it("le nombre de PIN refusés est celui de l'oracle (210) : la liste est FERMÉE, elle ne grossit pas en silence", () => {
    expect(TOUS.filter((pin) => isTrivialPin(pin)).length).toBe(TOUS.filter((pin) => oracleTrivial(pin)).length);
    expect(TOUS.filter((pin) => oracleTrivial(pin)).length, "10 identiques + 90 abab + 90 aabb + 10 montantes + 10 descendantes").toBe(210);
  });

  it("la règle suit la LONGUEUR (paramètre) : six chiffres — 121212, 112233, 123456, 654321, 777777 refusés ; 135790 et 482916 admis", () => {
    for (const pin of ["121212", "112233", "123456", "654321", "777777"]) expect(isTrivialPin(pin), pin).toBe(true);
    for (const pin of ["135790", "482916"]) expect(isTrivialPin(pin), pin).toBe(false);
  });
});

describe("generatePin — tire jusqu'à obtenir un PIN non trivial, borné", () => {
  /** Un générateur qui rend, dans l'ordre, les valeurs données (puis lève : un tirage de trop se voit). */
  const rendant = (...valeurs: number[]) => {
    const appels: number[] = [];
    const nextInt = (max: number): number => {
      appels.push(max);
      const v = valeurs[appels.length - 1];
      if (v === undefined) throw new Error("tirage de trop");
      return v;
    };
    return { nextInt, appels };
  };

  it("⛔ l'aléa est tiré dans [0, 10^longueur) : le générateur reçoit 10000 pour quatre chiffres", () => {
    const g = rendant(4821);
    generatePin(g.nextInt);
    expect(g.appels).toEqual([10 ** STAFF_LIMITS.PIN_LENGTH]);
  });

  it("⛔ les ZÉROS DE TÊTE sont rendus : le tirage 482 donne « 0482 », pas « 482 »", () => {
    expect(generatePin(rendant(482).nextInt)).toBe("0482");
  });

  it("⛔ un PIN trivial est RE-TIRÉ, pas rendu : 1111, puis 1234, puis 4821 → « 4821 » après exactement TROIS tirages", () => {
    const g = rendant(1111, 1234, 4821);
    expect(generatePin(g.nextInt)).toBe("4821");
    expect(g.appels.length).toBe(3);
  });

  it("le premier tirage non trivial est rendu sans en tirer un second", () => {
    const g = rendant(9136);
    expect(generatePin(g.nextInt)).toBe("9136");
    expect(g.appels.length).toBe(1);
  });

  it("⛔ la boucle est BORNÉE : un générateur qui ne rend que des PIN triviaux fait LEVER après exactement PIN_MAX_DRAWS tirages (jamais une boucle sans fin)", () => {
    let n = 0;
    const toujoursTrivial = (): number => {
      n += 1;
      return 1111;
    };
    expect(() => generatePin(toujoursTrivial)).toThrow(/PIN/);
    expect(n).toBe(PIN_MAX_DRAWS);
  });

  it("⛔ une valeur HORS de l'intervalle (10000, −1, 4.5) est refusée : un PIN de cinq chiffres ou un entier négatif n'est jamais rendu", () => {
    for (const mauvaise of [10 ** STAFF_LIMITS.PIN_LENGTH, -1, 4.5]) {
      expect(() => generatePin(() => mauvaise), `tirage ${mauvaise}`).toThrow(/PIN/);
    }
  });

  it("la LONGUEUR est un paramètre : six chiffres → le générateur reçoit 1 000 000 et le PIN rendu a six chiffres", () => {
    const g = rendant(135790);
    const pin = generatePin(g.nextInt, 6);
    expect(g.appels).toEqual([1_000_000]);
    expect(pin).toBe("135790");
  });

  it("⛔ « aucun PIN trivial sur 100 000 tirages » (MP-10) : 100 000 tirages d'un générateur congruentiel, tous de la bonne forme, tous non triviaux, des zéros de tête présents (le remplissage est exercé)", () => {
    let etat = 123456789;
    const congruentiel = (max: number): number => {
      etat = (Math.imul(etat, 1103515245) + 12345) >>> 0;
      return etat % max;
    };
    let avecZeroDeTete = 0;
    const mauvais: string[] = [];
    for (let i = 0; i < 100_000; i += 1) {
      const pin = generatePin(congruentiel);
      if (!/^\d{4}$/.test(pin) || oracleTrivial(pin)) mauvais.push(pin);
      if (pin.startsWith("0")) avecZeroDeTete += 1;
    }
    expect(mauvais.slice(0, 5)).toEqual([]);
    expect(avecZeroDeTete, "des PIN qui commencent par 0 : le remplissage à gauche est exercé").toBeGreaterThan(0);
  });
});
