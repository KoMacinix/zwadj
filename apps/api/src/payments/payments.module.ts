import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env";
import { createPaymentGateway } from "./payment-gateway.factory";
import { PaymentsService } from "./payments.service";
import { PAYMENT_GATEWAY, type PaymentGateway } from "./payment.types";

/**
 * ⚠ AUCUN CONTRÔLEUR À CE LOT NON PLUS, ET C'EST TOUJOURS DÉLIBÉRÉ.
 * `AGENTS.md` impose un arrêt franc avant tout contrat d'API neuf. L'adaptateur
 * rend le port fonctionnel et mesurable ; la route qui ouvre un règlement est un
 * contrat public, elle se cadre avant de s'écrire.
 *
 * Le module n'est pas `@Global()` — contrairement à `EmailModule` : le paiement
 * ne doit être injectable que là où on l'importe explicitement.
 *
 * ⚠ LE CHOIX DE L'ADAPTATEUR SE FAIT AU DÉMARRAGE, PAS À L'APPEL. Un aiguillage
 * évalué à chaque requête peut changer d'avis en cours de vie du processus ;
 * ici, ce qui est câblé au boot est ce qui servira. La décision elle-même vit
 * dans `payment-gateway.factory.ts`, pure et testée — cette fabrique-ci ne fait
 * que lui passer l'environnement.
 */
@Module({
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PaymentGateway =>
        createPaymentGateway({
          PAYMENTS_ENABLED: config.get("PAYMENTS_ENABLED", { infer: true }),
          CHARGILY_BASE_URL: config.get("CHARGILY_BASE_URL", { infer: true }),
          CHARGILY_SECRET_KEY: config.get("CHARGILY_SECRET_KEY", { infer: true }),
          CHARGILY_TIMEOUT_MS: config.get("CHARGILY_TIMEOUT_MS", { infer: true })
        })
    }
  ],
  exports: [PaymentsService, PAYMENT_GATEWAY]
})
export class PaymentsModule {}
