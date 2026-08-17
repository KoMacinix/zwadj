// Choix de l'adaptateur — Phase 7, lot E3b (Chargily).
import { describe, expect, it } from "vitest";
import { ChargilyGateway } from "./chargily.gateway";
import { createPaymentGateway, type PaymentGatewaySettings } from "./payment-gateway.factory";
import { UnavailablePaymentGateway } from "./unavailable.gateway";

const COMPLET: PaymentGatewaySettings = {
  PAYMENTS_ENABLED: true,
  CHARGILY_BASE_URL: "https://pay.chargily.net/test/api/v2",
  CHARGILY_SECRET_KEY: "test_sk_JETON_DE_TEST_SANS_VALEUR",
  CHARGILY_TIMEOUT_MS: 10_000
};

describe("Drapeau maître", () => {
  it("éteint ⇒ l'adaptateur qui REFUSE, même config Chargily complète", () => {
    // ⚠ La configuration est ici entièrement valide. C'est tout l'intérêt :
    // un fournisseur prêt ne doit pas pouvoir s'allumer derrière le drapeau.
    expect(createPaymentGateway({ ...COMPLET, PAYMENTS_ENABLED: false })).toBeInstanceOf(
      UnavailablePaymentGateway
    );
  });

  it("allumé et configuré ⇒ l'adaptateur Chargily", () => {
    expect(createPaymentGateway(COMPLET)).toBeInstanceOf(ChargilyGateway);
  });
});

describe("Configuration incomplète — on lève, on ne se replie pas", () => {
  it.each(["CHARGILY_BASE_URL", "CHARGILY_SECRET_KEY"] as const)("%s absente ⇒ erreur nommant la variable", (cle) => {
    expect(() => createPaymentGateway({ ...COMPLET, [cle]: undefined })).toThrow(cle);
  });

  it.each(["CHARGILY_BASE_URL", "CHARGILY_SECRET_KEY"] as const)("%s vide ⇒ même traitement qu'absente", (cle) => {
    expect(() => createPaymentGateway({ ...COMPLET, [cle]: "" })).toThrow(cle);
  });

  it("⚠ ne retombe JAMAIS sur l'adaptateur qui refuse", () => {
    // Un repli rendrait « config cassée » indiscernable de « paiements
    // éteints » : le 503 serait identique, et personne ne chercherait la clé
    // manquante. Le silence est le défaut qu'on refuse, pas la panne.
    let obtenu: unknown = null;
    try {
      obtenu = createPaymentGateway({ ...COMPLET, CHARGILY_SECRET_KEY: undefined });
    } catch {
      obtenu = "levée";
    }
    expect(obtenu).toBe("levée");
  });
});
