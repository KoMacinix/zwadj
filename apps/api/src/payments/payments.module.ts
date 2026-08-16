import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PAYMENT_GATEWAY } from "./payment.types";
import { UnavailablePaymentGateway } from "./unavailable.gateway";

/**
 * ⚠ AUCUN CONTRÔLEUR À CE LOT, ET C'EST DÉLIBÉRÉ. `AGENTS.md` impose un arrêt
 * franc avant tout contrat d'API neuf. Exposer une route de paiement demanderait
 * ce contrat — et il n'aurait rien à rendre au client tant que la session de
 * règlement n'existe pas. Le socle se pose sans surface publique ; la route
 * arrivera avec l'adaptateur, dans le même lot que ce qu'elle permet de faire.
 *
 * Le module n'est pas `@Global()` — contrairement à `EmailModule` : le paiement
 * ne doit être injectable que là où on l'importe explicitement.
 */
@Module({
  providers: [PaymentsService, { provide: PAYMENT_GATEWAY, useClass: UnavailablePaymentGateway }],
  exports: [PaymentsService, PAYMENT_GATEWAY]
})
export class PaymentsModule {}
