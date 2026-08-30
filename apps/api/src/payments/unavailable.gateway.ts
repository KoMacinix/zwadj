import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { CheckoutRequest, CheckoutSession, PaymentGateway } from "./payment.types";

/**
 * Adaptateur par DÉFAUT tant qu'aucun fournisseur n'est branché.
 *
 * ⚠ IL REFUSE, IL NE SIMULE PAS. Un adaptateur de développement qui rendrait une
 * fausse session et une fausse URL laisserait le reste du chemin se construire
 * contre une forme INVENTÉE — et D126 interdit exactement cela : les charges
 * utiles se capturent du bac à sable réel, jamais ne s'écrivent de mémoire. Un
 * faux qui marche donnerait l'illusion que le branchement est fait, et le vrai
 * adaptateur devrait ensuite se conformer à ma fiction plutôt qu'à l'API réelle.
 *
 * ⚠ 503 et non 500 : le service est temporairement indisponible, il n'est pas
 * cassé. La distinction compte pour la supervision comme pour le client.
 *
 * ⚠ IL NE DISPARAÎT PAS avec l'adaptateur Chargily, contrairement à ce que ce
 * commentaire annonçait au socle. Il devient la branche « paiements éteints » de
 * `payments.module.ts` : `PAYMENTS_ENABLED=false` doit refuser, pas ouvrir une
 * session. Un drapeau maître sans refus au bout n'est pas un drapeau.
 */
@Injectable()
export class UnavailablePaymentGateway implements PaymentGateway {
  createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    // ⚠ La clé i18n existe désormais des DEUX côtés (E3b/Chargily). Elle était
    // écrite ici depuis le socle et n'existait dans AUCUN catalogue : la porte
    // de parité ne compare que FR à AR, et une absence symétrique lui échappe.
    throw new ServiceUnavailableException({
      code: "PAYMENT_PROVIDER_UNAVAILABLE",
      message: "payment.errors.providerUnavailable"
    });
  }
}
