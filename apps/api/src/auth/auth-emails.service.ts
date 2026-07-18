import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// Import DIRECT des JSON (pas de `import { messages } from "@zwadj/i18n"`) :
// le build tsc de l'API ne compile pas le TypeScript de node_modules, alors
// que les JSON se résolvent tels quels à l'exécution. Décision documentée.
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { EMAIL_SENDER, type EmailSender } from "../common/email/email.types";
import { renderTemplate } from "../common/email/render";
import { AUTH } from "./auth.constants";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

interface Recipient {
  email: string;
  locale: "fr" | "ar";
  role: "CLIENT" | "PRO" | "ADMIN";
}

/**
 * Compose les emails de la tranche auth (sujet + corps localisés FR/AR,
 * liens vers le bon front selon le rôle) et les remet au port EMAIL_SENDER.
 */
@Injectable()
export class AuthEmailsService {
  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    private readonly config: ConfigService
  ) {}

  /** Lien de vérification : client Next = /{locale}/…, pro Vite = /… (SPA). */
  verificationLink(recipient: Pick<Recipient, "role" | "locale">, rawToken: string): string {
    if (recipient.role === "PRO") {
      const base = this.config.getOrThrow<string>("PRO_URL");
      return `${base}${AUTH.VERIFY_EMAIL_PATH}?token=${rawToken}`;
    }
    const base = this.config.getOrThrow<string>("CLIENT_URL");
    return `${base}/${recipient.locale}${AUTH.VERIFY_EMAIL_PATH}?token=${rawToken}`;
  }

  async sendVerificationEmail(recipient: Recipient, rawToken: string): Promise<void> {
    const m = MESSAGES[recipient.locale].auth.emails;
    await this.sender.send({
      to: recipient.email,
      subject: m.verifySubject,
      text: renderTemplate(m.verifyBody, {
        link: this.verificationLink(recipient, rawToken),
        ttlHours: AUTH.EMAIL_VERIFICATION_TTL_HOURS
      })
    });
  }

  /** Lien de réinitialisation — même logique de routage que la vérification :
   *  Pro (SPA Vite) sans préfixe de locale, Client (Next) avec /{locale}. */
  resetLink(recipient: Pick<Recipient, "role" | "locale">, rawToken: string): string {
    if (recipient.role === "PRO") {
      const base = this.config.getOrThrow<string>("PRO_URL");
      return `${base}${AUTH.RESET_PASSWORD_PATH}?token=${rawToken}`;
    }
    const base = this.config.getOrThrow<string>("CLIENT_URL");
    return `${base}/${recipient.locale}${AUTH.RESET_PASSWORD_PATH}?token=${rawToken}`;
  }

  async sendPasswordResetEmail(recipient: Recipient, rawToken: string): Promise<void> {
    const m = MESSAGES[recipient.locale].auth.emails;
    await this.sender.send({
      to: recipient.email,
      subject: m.resetSubject,
      text: renderTemplate(m.resetBody, {
        link: this.resetLink(recipient, rawToken),
        ttlMinutes: AUTH.PASSWORD_RESET_TTL_MINUTES
      })
    });
  }
}
