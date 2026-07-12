// Port d'envoi d'email (Phase 4 : « minimal transactional-email send primitive »).
// Phase 8.1 branchera un vrai provider derrière CE port (+ file pg-boss) sans
// toucher aux appelants — architecture AGENTS.md : adapters pour tout SDK externe.
export interface SendEmailInput {
  to: string;
  subject: string;
  /** Corps texte brut (les templates HTML arrivent avec la Phase 8.1). */
  text: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}

/** Jeton d'injection du port (interface TS = pas de runtime, d'où le Symbol). */
export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
