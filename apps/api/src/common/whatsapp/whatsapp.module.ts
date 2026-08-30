import { Global, Module } from "@nestjs/common";
import { DevLoggerWhatsAppSender } from "./dev-logger.whatsapp";
import { WHATSAPP_SENDER } from "./whatsapp.types";

/** @Global comme `EmailModule` : le port est une primitive d'infrastructure,
 *  pas une dépendance de domaine — l'importer dans chaque module qui notifie
 *  n'apprendrait rien à personne. */
@Global()
@Module({
  providers: [{ provide: WHATSAPP_SENDER, useClass: DevLoggerWhatsAppSender }],
  exports: [WHATSAPP_SENDER]
})
export class WhatsAppModule {}
