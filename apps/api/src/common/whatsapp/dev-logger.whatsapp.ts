import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import type { SendWhatsAppInput, WhatsAppSender } from "./whatsapp.types";

/**
 * Adaptateur DEV du port WhatsApp (D63) : logge le message complet au lieu de
 * l'envoyer, exactement comme `DevLoggerEmailSender` le fait pour l'email. Un
 * poste de développement voit donc passer les notifications des pros sans
 * compte Meta, sans numéro dédié et sans modèle approuvé.
 *
 * ⚠ Ne LÈVE jamais. Le service appelant traite pourtant l'échec (D63) : c'est
 * l'adaptateur de PRODUCTION qui lèvera, et ce chemin est testé avec un double
 * qui lève — pas avec celui-ci.
 */
@Injectable()
export class DevLoggerWhatsAppSender implements WhatsAppSender {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext("WhatsAppDev");
  }

  async send(input: SendWhatsAppInput): Promise<void> {
    this.logger.info(
      { to: input.to },
      `\n──────── WHATSAPP (dev, non envoyé) ────────\n${input.text}\n───────────────────────────────────────────`
    );
  }
}
