import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// Import DIRECT des JSON (patron AuthEmailsService) : le build tsc de l'API ne
// compile pas le TypeScript de node_modules, alors que les JSON se résolvent
// tels quels à l'exécution.
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { AUTH } from "../auth/auth.constants";
import { EMAIL_SENDER, type EmailSender } from "../common/email/email.types";
import { renderTemplate } from "../common/email/render";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

interface Recipient {
  email: string;
  locale: "fr" | "ar";
  role: "CLIENT" | "PRO" | "ADMIN";
}

/**
 * E-mails de la tranche COMPTE (A10). Même patron qu'`AuthEmailsService` :
 * sujet + corps localisés FR/AR, routage du lien selon le rôle, remise au port
 * `EMAIL_SENDER`.
 */
@Injectable()
export class AccountEmailsService {
  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    private readonly config: ConfigService
  ) {}

  /** Lien de confirmation : client Next = /{locale}/…, pro Vite = /… (SPA). */
  confirmEmailChangeLink(recipient: Pick<Recipient, "role" | "locale">, rawToken: string): string {
    if (recipient.role === "PRO") {
      const base = this.config.getOrThrow<string>("PRO_URL");
      return `${base}${AUTH.CONFIRM_EMAIL_CHANGE_PATH}?token=${rawToken}`;
    }
    const base = this.config.getOrThrow<string>("CLIENT_URL");
    return `${base}/${recipient.locale}${AUTH.CONFIRM_EMAIL_CHANGE_PATH}?token=${rawToken}`;
  }

  /** Part À LA NOUVELLE adresse : c'est tout l'intérêt du flux. */
  async sendEmailChangeVerification(recipient: Recipient, rawToken: string): Promise<void> {
    const m = MESSAGES[recipient.locale].account.emails;
    await this.sender.send({
      to: recipient.email,
      subject: m.changeEmailSubject,
      text: renderTemplate(m.changeEmailBody, {
        link: this.confirmEmailChangeLink(recipient, rawToken),
        ttlHours: AUTH.EMAIL_CHANGE_TTL_HOURS
      })
    });
  }

  /**
   * Approbation — envoyé à l'adresse CAPTURÉE avant l'anonymisation. Porte la
   * promesse D41 : les salles sont conservées et récupérables sur demande.
   * Deux corps distincts selon qu'il y avait des salles ou non : promettre la
   * récupération de salles à un client qui n'en a jamais eu serait absurde.
   */
  async sendDeletionApproved(recipient: Recipient, archivedVenues: number): Promise<void> {
    const m = MESSAGES[recipient.locale].account.emails;
    await this.sender.send({
      to: recipient.email,
      subject: m.deletionApprovedSubject,
      text:
        archivedVenues > 0
          ? renderTemplate(m.deletionApprovedWithVenuesBody, { count: archivedVenues })
          : m.deletionApprovedBody
    });
  }

  /** Refus — avec le motif quand l'admin en a saisi un. Le compte fonctionne
   *  toujours : sans cet e-mail, l'utilisateur resterait dans l'incertitude. */
  async sendDeletionRejected(recipient: Recipient, decisionNote: string | null): Promise<void> {
    const m = MESSAGES[recipient.locale].account.emails;
    await this.sender.send({
      to: recipient.email,
      subject: m.deletionRejectedSubject,
      text:
        decisionNote === null || decisionNote === ""
          ? m.deletionRejectedBody
          : renderTemplate(m.deletionRejectedWithNoteBody, { note: decisionNote })
    });
  }
}
