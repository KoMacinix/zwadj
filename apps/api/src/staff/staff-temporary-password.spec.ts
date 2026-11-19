// LE MOT DE PASSE TEMPORAIRE — rang 56, L36-3a-2 (D354, R-5, DR5 « généré par défaut », S-109). Un module PUR : l'aléa lui est PASSÉ en paramètre (aucun `Math.random`, aucun port `Random`), il le consomme par
// ÉCHANTILLONNAGE AVEC REJET — sans quoi un alphabet de 31 symboles tiré modulo 256 favorise les huit premiers (9 chances sur 256 au lieu de 8) : un biais que rien ne verrait à l'écran.
// ⛔ AUCUNE VALEUR ATTENDUE ÉCRITE DE MÉMOIRE : les attendus se DÉRIVENT de propriétés (longueur, alphabet, règle `passwordSchema` du contrat, liste des mots de passe courants du dépôt), jamais d'une chaîne tapée.
// Le PRNG de ce fichier est un xorshift à graine FIXE : le test est déterministe, il ne dépend d'aucune horloge ni d'aucun `Math.random`.
import { describe, expect, it } from "vitest";
import { passwordSchema } from "@zwadj/types";
import { isCommonPassword } from "./staff-password-policy";
import { TEMPORARY_PASSWORD_ALPHABET, TEMPORARY_PASSWORD_LENGTH, temporaryPasswordFrom } from "./staff-temporary-password";

/** xorshift32 : une suite d'octets reproductible. */
function octets(graine: number, n: number): Uint8Array {
  let x = graine >>> 0 || 1;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out[i] = x & 0xff;
  }
  return out;
}
const n = TEMPORARY_PASSWORD_ALPHABET.length;
const seuilRejet = Math.floor(256 / n) * n; // les octets ≥ ce seuil sont REJETÉS

describe("l'alphabet", () => {
  it("31 symboles DISTINCTS, sans les caractères qui se confondent à l'œil (0, O, 1, I, l) — un Manager dicte ce mot de passe à voix haute ou le lit sur un écran", () => {
    expect(n).toBe(31);
    expect(new Set(TEMPORARY_PASSWORD_ALPHABET).size).toBe(n);
    for (const ambigu of ["0", "O", "1", "I", "L", "l"]) expect(TEMPORARY_PASSWORD_ALPHABET.includes(ambigu), `contient « ${ambigu} »`).toBe(false);
  });

  it("il contient des lettres ET des chiffres (le contrat `passwordSchema` en exige un de chaque)", () => {
    expect(/[A-Z]/.test(TEMPORARY_PASSWORD_ALPHABET)).toBe(true);
    expect(/[2-9]/.test(TEMPORARY_PASSWORD_ALPHABET)).toBe(true);
  });
});

describe("temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo)", () => {
  it("⛔ un octet ≥ le seuil de rejet n'est JAMAIS consommé : douze octets rejetés suivis des mêmes octets acceptés rendent EXACTEMENT ce que rendent les acceptés seuls", () => {
    const acceptes = octets(7, 64).map((b) => b % seuilRejet); // tous < seuil
    const seuls = temporaryPasswordFrom(acceptes);
    expect(seuls, "les octets acceptés doivent donner un mot de passe (sinon ce cas ne mesure rien)").not.toBeNull();
    const rejetes = new Uint8Array(12).fill(255);
    const avecRejets = new Uint8Array(rejetes.length + acceptes.length);
    avecRejets.set(rejetes, 0);
    avecRejets.set(acceptes, rejetes.length);
    expect(temporaryPasswordFrom(avecRejets)).toBe(seuls);
  });

  it("⛔ le seuil lui-même : l'octet (seuil − 1) est ACCEPTÉ, l'octet seuil est REJETÉ", () => {
    expect(seuilRejet).toBe(248);
    const premierChiffre = TEMPORARY_PASSWORD_ALPHABET.search(/[2-9]/); // un chiffre, pour que le mot de passe soit valable dans les DEUX cas
    const bourre = (octet: number) => {
      const b = new Uint8Array(40).fill(0);
      b[0] = octet;
      b[1] = premierChiffre;
      return b;
    };
    // le premier octet décide du premier caractère : ACCEPTÉ, il est lu ; REJETÉ, il est sauté et c'est le suivant (le chiffre) qui ouvre le mot de passe
    const accepte = temporaryPasswordFrom(bourre(seuilRejet - 1));
    const rejete = temporaryPasswordFrom(bourre(seuilRejet));
    expect(accepte, "l'octet (seuil − 1) donne un mot de passe").not.toBeNull();
    expect(rejete, "l'octet seuil, sauté, laisse assez d'octets : un mot de passe aussi").not.toBeNull();
    expect(accepte![0]).toBe(TEMPORARY_PASSWORD_ALPHABET[(seuilRejet - 1) % n]);
    expect(rejete![0]).toBe(TEMPORARY_PASSWORD_ALPHABET[premierChiffre]);
    expect(accepte![0]).not.toBe(rejete![0]);
  });

  it("pas assez d'octets ACCEPTÉS pour faire douze caractères → null (l'appelant tire d'autres octets : jamais un mot de passe plus court)", () => {
    expect(temporaryPasswordFrom(new Uint8Array(40).fill(255))).toBeNull();
    expect(temporaryPasswordFrom(new Uint8Array(TEMPORARY_PASSWORD_LENGTH - 1).fill(3))).toBeNull();
    expect(temporaryPasswordFrom(new Uint8Array(0))).toBeNull();
    // ⛔ ONZE octets acceptés qui MÊLENT lettre et chiffre : la règle « douze » est la SEULE à les refuser (le contrôle lettre/chiffre, lui, les laisserait passer) — sans ce cas, retirer la règle ne fait rougir rien
    const chiffre = TEMPORARY_PASSWORD_ALPHABET.search(/[2-9]/);
    const onzeMelanges = Uint8Array.from({ length: TEMPORARY_PASSWORD_LENGTH - 1 }, (_, i) => (i % 2 === 0 ? 0 : chiffre));
    expect(temporaryPasswordFrom(onzeMelanges), "onze caractères valables mais PLUS COURTS que douze : null").toBeNull();
  });

  it("⛔ une chaîne SANS chiffre ou SANS lettre est refusée (null) : le contrat `passwordSchema` en exige un de chaque, et un mot de passe que le contrat refuserait ne serait pas utilisable comme actuel", () => {
    const toutesLettres = new Uint8Array(40).fill(0); // « A » × 12
    expect(temporaryPasswordFrom(toutesLettres)).toBeNull();
    const premierChiffre = TEMPORARY_PASSWORD_ALPHABET.search(/[2-9]/);
    const toutChiffres = new Uint8Array(40).fill(premierChiffre);
    expect(temporaryPasswordFrom(toutChiffres)).toBeNull();
  });

  it("il consomme les octets DANS L'ORDRE : deux suites d'octets différentes donnent des mots de passe différents (le tirage dépend bien de l'entrée)", () => {
    const a = temporaryPasswordFrom(octets(11, 64).map((b) => b % seuilRejet));
    const b = temporaryPasswordFrom(octets(12, 64).map((b2) => b2 % seuilRejet));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });
});

describe("sur beaucoup de tirages (déterministes)", () => {
  const tirages = Array.from({ length: 4000 }, (_, i) => temporaryPasswordFrom(octets(1000 + i, 32)));
  const valides = tirages.filter((t): t is string => t !== null);

  it("la quasi-totalité des tirages de 32 octets aboutit (un échec se relance : le service tire à nouveau) — mesuré, pas supposé", () => {
    expect(valides.length, `${valides.length} aboutis sur ${tirages.length}`).toBeGreaterThan(tirages.length * 0.9);
  });

  it("⛔ CHAQUE mot de passe rendu : 12 caractères, alphabet seul, accepté par `passwordSchema` (le contrat), absent de la liste des mots de passe courants (le dépôt)", () => {
    expect(valides.length).toBeGreaterThan(3000);
    for (const p of valides) {
      expect(p.length).toBe(TEMPORARY_PASSWORD_LENGTH);
      expect([...p].every((c) => TEMPORARY_PASSWORD_ALPHABET.includes(c))).toBe(true);
      expect(passwordSchema.safeParse(p).success, p.length > 0 ? "un mot de passe généré est refusé par le contrat" : "").toBe(true);
      expect(isCommonPassword(p)).toBe(false);
    }
  });

  it("⛔ la distribution est UNIFORME à 4 % près sur les 31 symboles : un tirage sans rejet gonfle les huit premiers de +12 % — c'est ce que ce seuil voit", () => {
    const comptes = new Map<string, number>([...TEMPORARY_PASSWORD_ALPHABET].map((c) => [c, 0]));
    let total = 0;
    for (const p of valides) {
      for (const c of p) {
        comptes.set(c, comptes.get(c)! + 1);
        total += 1;
      }
    }
    expect(total).toBe(valides.length * TEMPORARY_PASSWORD_LENGTH);
    const attendu = total / n;
    for (const [c, k] of comptes) expect(Math.abs(k - attendu) / attendu, `symbole ${c} : ${k} contre ${attendu.toFixed(0)}`).toBeLessThan(0.04);
  });

  it("deux tirages différents ne donnent presque jamais le même mot de passe : aucun doublon sur 4000 (59 bits d'entropie)", () => {
    expect(new Set(valides).size).toBe(valides.length);
  });
});
