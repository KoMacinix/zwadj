// LE HACHEUR DU PIN — rang 58, L36-3b (D356, DR5, MP-11, R-2). Le SEUL fichier qui connaît le secret : le PIN se stocke en HMAC-SHA-256 avec un secret serveur HORS base (« 10 000 valeurs se cassent hors ligne en une
// seconde sans secret », DR5). Joué sans Nest ni base : le secret est un paramètre du constructeur.
// ⛔ L'ORACLE N'EST PAS LE CODE : le test recalcule le HMAC avec `node:crypto` lui-même (la norme est l'autorité), il ne confronte pas le hacheur à une copie de lui.
// ⛔ MÊME COÛT, MESURÉ PAR ESPION (D290, jamais un chronomètre) : vérifier, hacher et vérifier contre le factice paient UN calcul de HMAC chacun — c'est ce qui permet à la connexion par PIN de rendre un refus
// au même coût quelle qu'en soit la cause (R-3).
// ⚠ UNE ASSERTION NATIVE par cas (D304, D352).
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isTrivialPin } from "./staff-pin";
import { StaffPinHasher } from "./staff-pin-hasher";

const SECRET = "secret-de-test-jetable-sans-valeur-0123456789";
const AUTRE_SECRET = "autre-secret-de-test-jetable-sans-valeur-9876";
const hmac = (secret: string, pin: string): string => createHmac("sha256", secret).update(pin).digest("hex");

describe("hash — HMAC-SHA-256 du PIN avec le secret", () => {
  it("⛔ la valeur est celle de la NORME : le HMAC-SHA-256 hexadécimal du PIN, recalculé par `node:crypto`", () => {
    const h = new StaffPinHasher(SECRET);
    expect(h.hash("4821")).toBe(hmac(SECRET, "4821"));
  });

  it("64 caractères hexadécimaux en minuscules, qui ne contiennent pas le PIN en clair", () => {
    const h = new StaffPinHasher(SECRET).hash("4821");
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
  });

  it("déterministe : le même PIN et le même secret donnent le même hachage (sans quoi on ne pourrait pas vérifier)", () => {
    const h = new StaffPinHasher(SECRET);
    expect(h.hash("4821")).toBe(h.hash("4821"));
  });

  it("⛔ le SECRET compte : le même PIN avec un autre secret donne un autre hachage (les dix mille valeurs ne se cassent pas sans lui)", () => {
    expect(new StaffPinHasher(SECRET).hash("4821")).not.toBe(new StaffPinHasher(AUTRE_SECRET).hash("4821"));
  });

  it("le PIN compte : deux PIN différents, deux hachages différents", () => {
    const h = new StaffPinHasher(SECRET);
    expect(h.hash("4821")).not.toBe(h.hash("4822"));
  });
});

describe("verify — compare le PIN présenté au hachage stocké", () => {
  const h = new StaffPinHasher(SECRET);

  it("le bon PIN contre son hachage : vrai", () => {
    expect(h.verify("4821", h.hash("4821"))).toBe(true);
  });

  it("⛔ un MAUVAIS PIN contre le hachage : faux", () => {
    expect(h.verify("4822", h.hash("4821"))).toBe(false);
  });

  it("⛔ le hachage fait avec un AUTRE secret ne vérifie pas (un hachage volé à une autre installation ne sert à rien)", () => {
    expect(h.verify("4821", new StaffPinHasher(AUTRE_SECRET).hash("4821"))).toBe(false);
  });

  it("⛔ un hachage MAL FORMÉ (vide, trop court, non hexadécimal, trop long) rend faux et ne lève PAS : la base peut contenir n'importe quoi, la connexion n'en fait pas une panne", () => {
    const bon = h.hash("4821");
    for (const mal of ["", "zz", "ab", bon.slice(0, 62), `${bon}00`, "x".repeat(64)]) {
      expect(h.verify("4821", mal), JSON.stringify(mal)).toBe(false);
    }
  });
});

describe("même COÛT : un calcul de HMAC par chemin, mesuré par espion", () => {
  /** Le nombre de HMAC calculés pendant `action` (l'espion est sur la méthode interne que les trois chemins partagent). */
  function calculs(action: (h: StaffPinHasher) => unknown): number {
    const h = new StaffPinHasher(SECRET);
    const espion = vi.spyOn(h as unknown as { digest: (s: string) => Buffer }, "digest");
    action(h);
    return espion.mock.calls.length;
  }

  it("⛔ hacher : un calcul", () => {
    expect(calculs((h) => h.hash("4821"))).toBe(1);
  });

  it("⛔ vérifier (vrai comme faux) : un calcul", () => {
    const stocke = new StaffPinHasher(SECRET).hash("4821");
    expect(calculs((h) => h.verify("4821", stocke))).toBe(1);
    expect(calculs((h) => h.verify("0000", stocke))).toBe(1);
  });

  it("⛔ vérifier contre le FACTICE : un calcul, et RIEN n'est rendu (jamais un vrai) — c'est ce qui rend le refus d'un compte inconnu aussi coûteux que celui d'un mauvais PIN", () => {
    expect(calculs((h) => h.verifyAgainstDummy("4821"))).toBe(1);
    expect(new StaffPinHasher(SECRET).verifyAgainstDummy("4821")).toBeUndefined();
  });
});

describe("generate — un PIN tiré par l'aléa du système, jamais trivial", () => {
  it("⛔ 300 PIN : tous de la bonne forme (quatre chiffres), aucun trivial, et pas toujours le même", () => {
    const h = new StaffPinHasher(SECRET);
    const pins = Array.from({ length: 300 }, () => h.generate());
    expect(pins.filter((p) => !/^\d{4}$/.test(p))).toEqual([]);
    expect(pins.filter((p) => isTrivialPin(p))).toEqual([]);
    expect(new Set(pins).size, "des PIN distincts : un générateur constant ne passerait pas").toBeGreaterThan(100);
  });
});
