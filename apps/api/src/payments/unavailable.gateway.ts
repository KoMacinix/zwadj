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
 * Il disparaîtra quand l'adaptateur Chargily existera — c'est-à-dire quand le
 * compte bac à sable sera créé.
 */
@Injectable()
export class UnavailablePaymentGateway implements PaymentGateway {
  createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    throw new ServiceUnavailableException({
      code: "PAYMENT_PROVIDER_UNAVAILABLE",
      message: "payment.errors.providerUnavailable"
    });
  }
}
