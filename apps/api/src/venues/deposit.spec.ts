// D81 — acompte. D55 impose d'écrire D'ABORD le cas réel que le calcul doit
// accepter : c'est le premier bloc, avant toute borne.
import { describe, expect, it } from "vitest";
import { resolveDepositCents } from "./deposit";

const rate = (bps: number) => ({ depositRateBps: bps, depositAmountCents: null });
const fixed = (cents: number) => ({ depositRateBps: null, depositAmountCents: cents });

describe("Acompte — le cas que le calcul DOIT accepter (D55)", () => {
  it("acompte fixe SUPÉRIEUR au total : on écrête, on ne refuse pas", () => {
    // Salle à 100 000 DA d'acompte fixe ; créneau de semaine à 80 000 DA.
    // Sans écrêtage, `bookings_amounts_valid` rejette l'insertion en 500.
    expect(resolveDepositCents(fixed(10_000_000), 8_000_000)).toBe(8_000_000);
  });

  it("acompte fixe ÉGAL au total : accepté tel quel, aucune marge inventée", () => {
    expect(resolveDepositCents(fixed(8_000_000), 8_000_000)).toBe(8_000_000);
  });

  it("créneau bon marché sur une salle chère : la réservation reste possible", () => {
    // Le refus fermerait purement et simplement la semaine à cette salle.
    expect(resolveDepositCents(fixed(5_000_000), 1_000_000)).toBe(1_000_000);
  });
});

describe("Acompte — pourcentage", () => {
  it("30 % d'un total en dinars entiers", () => {
    expect(resolveDepositCents(rate(3000), 30_000_000)).toBe(9_000_000);
  });

  it("passe par roundToDinar : jamais de centime résiduel", () => {
    // 3000 bps de 333 333 centimes = 99 999,9 → arrondi au dinar.
    const got = resolveDepositCents(rate(3000), 333_333);
    expect(got % 100).toBe(0);
    expect(got).toBe(100_000);
  });

  it("100 % ne dépasse jamais le total", () => {
    expect(resolveDepositCents(rate(10000), 12_345_678)).toBeLessThanOrEqual(12_345_678);
  });

  it("le plancher de 5 % rend un montant non nul sur un total réaliste", () => {
    expect(resolveDepositCents(rate(500), 20_000_000)).toBe(1_000_000);
  });
});

describe("Acompte — bornes arithmétiques", () => {
  it("total nul : acompte nul, sans division ni NaN", () => {
    expect(resolveDepositCents(rate(3000), 0)).toBe(0);
    expect(resolveDepositCents(fixed(5_000_000), 0)).toBe(0);
  });

  it("le montant fixe l'emporte sur le taux quand les deux sont présents", () => {
    // Impossible en base (CHECK d'exclusivité) : on fige quand même la branche,
    // pour qu'une régression du CHECK ne produise pas un résultat aléatoire.
    const got = resolveDepositCents({ depositRateBps: 3000, depositAmountCents: 500_000 }, 10_000_000);
    expect(got).toBe(500_000);
  });
});
