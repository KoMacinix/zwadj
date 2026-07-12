import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import type { EmailSender, SendEmailInput } from "./email.types";

/**
 * Adaptateur DEV de la primitive email : logge l'email complet (pino) au lieu
 * de l'envoyer. Le lien de vérification/reset est donc lisible dans la console
 * de l'API pendant tout le développement. Remplacé par un vrai provider en
 * Phase 8.1 — les appelants ne changent pas (port EMAIL_SENDER).
 */
@Injectable()
export class DevLoggerEmailSender implements EmailSender {
  constructor(
    private readonly logger: PinoLogger,
    private readonly config: ConfigService
  ) {
    this.logger.setContext("EmailDev");
  }

  async send(input: SendEmailInput): Promise<void> {
    this.logger.info(
      { to: input.to, from: this.config.get<string>("EMAIL_FROM"), subject: input.subject },
      `\n───────── EMAIL (dev, non envoyé) ─────────\n${input.text}\n───────────────────────────────────────────`
    );
  }
}
