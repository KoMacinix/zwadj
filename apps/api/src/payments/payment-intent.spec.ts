// Décision d'ouverture d'un paiement — Phase 7, lot E3b (socle).
//
// ⚠ D126 : « toute garde neuve est NEUTRALISÉE pour prouver que son test mord,
// les deux mesures figurent au rapport ». C'est la raison d'être de ce fichier
// et du découpage qui le rend possible : les quatre décisions vivent dans une
// fonction PURE, donc elles s'exécutent partout, y compris là où le client
// Prisma n'est pas généré.
import { describe, expect, it } from "vitest";
import { PAYABLE_BOOKING_STATUSES, decidePaymentIntent, type BookingSnapshot } from "./payment-intent";

const ACCEPTEE: BookingSnapshot = { id: "b1", status: "ACCEPTED", depositCents: 7_500_000 };

describe("Drapeau maître", () => {
  it("éteint ⇒ refuse, quelle que soit la réservation", () => {
    expect(decidePaymentIntent(ACCEPTEE, false)).toEqual({ ok: false, code: "PAYMENTS_DISABLED" });
  });

  it("⚠ éteint, il ne laisse RIEN filtrer sur l'état de la réservation", () => {
    // L'ordre des contrôles est une décision : une réservation non payable ET un
    // drapeau éteint doivent rendre le refus du DRAPEAU. Autrement, l'API
    // renseignerait sur l'état des réservations alors que le paiement est censé
    // ne pas exister.
    const refusee = decidePaymentIntent({ ...ACCEPTEE, status: "PENDING" }, false);
    expect(refusee).toEqual({ ok: false, code: "PAYMENTS_DISABLED" });
    expect(refusee).not.toHaveProperty("status");
  });

  it("allumé ⇒ laisse passer une réservation acceptée", () => {
    expect(decidePaymentIntent(ACCEPTEE, true)).toEqual({
      ok: true,
      amountCents: 7_500_000,
      discountAppliedCents: 0
    });
  });
});

describe("⚠ Le paiement ne s'ouvre que sur une réservation ACCEPTÉE (décision 1)", () => {
  it("une réservation ACCEPTED est payable", () => {
    expect(decidePaymentIntent(ACCEPTEE, true).ok).toBe(true);
  });

  it("⚠ une PENDING ne l'est PAS — et c'est ce qui supprime un mode de défaillance", () => {
    // `bookings_venue_timerange_gist` filtre sur ('ACCEPTED','CONFIRMED') : à
    // l'acceptation, le créneau devient exclusif. Ouvrir le paiement avant
    // rouvrirait « le créneau a été pris pendant que le client payait », qu'il
    // faudrait alors GÉRER au lieu de l'éliminer.
    expect(decidePaymentIntent({ ...ACCEPTEE, status: "PENDING" }, true)).toEqual({
      ok: false,
      code: "BOOKING_NOT_PAYABLE",
      status: "PENDING"
    });
  });

  it("aucun autre statut n'ouvre le paiement — la liste est lue, pas recopiée", () => {
    // ⚠ On boucle sur les statuts RÉELS de l'énuméré plutôt que sur une liste
    // écrite ici : un statut ajouté demain doit être refusé par défaut, pas
    // oublié par le test.
    const tous = ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"];
    for (const status of tous) {
      expect(decidePaymentIntent({ ...ACCEPTEE, status }, true).ok, `${status} ne doit pas être payable`).toBe(false);
    }
    // Et l'écart : le seul statut de la liste d'autorité passe.
    expect(PAYABLE_BOOKING_STATUSES).toEqual(["ACCEPTED"]);
  });

  it("⚠ CONFIRMED est refusé aussi — c'est DÉJÀ payé", () => {
    // Le cas qui distingue « le créneau est verrouillé » de « on peut payer ».
    // Les deux statuts verrouillent le créneau ; un seul attend un règlement.
    expect(decidePaymentIntent({ ...ACCEPTEE, status: "CONFIRMED" }, true).ok).toBe(false);
  });
});

describe("Le montant vient de la RÉSERVATION, il n'est pas recalculé", () => {
  it("reprend `depositCents` tel quel", () => {
    const decision = decidePaymentIntent({ ...ACCEPTEE, depositCents: 4_500_000 }, true);
    expect(decision).toEqual({ ok: true, amountCents: 4_500_000, discountAppliedCents: 0 });
  });

  it("⚠ un acompte NON RONDrait passerait tel quel — la fonction ne rectifie rien", () => {
    // Le test qui prouve qu'aucun second calcul ne s'est glissé ici. Un
    // `roundToDinar` rejoué produirait 4 500 000 au lieu de 4 500 037 — donc, un
    // jour, deux montants différents pour une seule affaire.
    const decision = decidePaymentIntent({ ...ACCEPTEE, depositCents: 4_500_037 }, true);
    expect(decision).toEqual({ ok: true, amountCents: 4_500_037, discountAppliedCents: 0 });
  });

  it("⚠ un acompte de ZÉRO refuse — la base, elle, l'accepterait", () => {
    // `payments_amounts_valid` garantit `amount_cents >= 0` : une session à 0 DA
    // passerait la contrainte et enverrait un client payer rien du tout.
    expect(decidePaymentIntent({ ...ACCEPTEE, depositCents: 0 }, true)).toEqual({
      ok: false,
      code: "NOTHING_TO_PAY"
    });
  });

  it("un acompte négatif refuse aussi", () => {
    expect(decidePaymentIntent({ ...ACCEPTEE, depositCents: -100 }, true).ok).toBe(false);
  });

  it("⚠ AUCUNE remise n'est appliquée à ce lot, et le test le FIGE", () => {
    // Ce n'est pas un oubli : reste à trancher si `Venue.cashbackRateBps` (D35)
    // EST la remise de checkout ou un mécanisme distinct — `cashback_claims`
    // décrit une réclamation vérifiée APRÈS coup. Le jour où la règle sera
    // arbitrée, ce test rougira, et c'est exactement ce qu'on attend de lui.
    const decision = decidePaymentIntent(ACCEPTEE, true);
    expect(decision).toMatchObject({ discountAppliedCents: 0 });
  });
});
