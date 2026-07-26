import { z } from "zod";
import { dzPhoneSchema, emailSchema, passwordSchema } from "./auth";
import type { AccountDeletionStatus, UserRole } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Lot A10 — gestion du COMPTE (`/me/*` + `/admin/deletion-requests`).
// Schémas Zod partagés front/back, messages = CLÉS i18n (`account.validation.*`),
// même contrat que les tranches Auth et Venue.
// ─────────────────────────────────────────────────────────────────────────────

const personNameSchema = (requiredKey: string) =>
  z.string({ required_error: requiredKey }).trim().min(1, requiredKey).max(100, "account.validation.nameTooLong");

/**
 * PATCH /me/profile — patch PARTIEL RÉEL (doctrine A2 : une clé absente ne
 * remet rien à zéro). `.strict()` : toute clé inconnue est un 400, jamais un
 * champ silencieusement ignoré.
 *
 * Le schéma décrit l'UNION des champs des deux rôles ; le tri par rôle se fait
 * CÔTÉ SERVEUR (le corps ne porte pas de discriminant, et un discriminant
 * envoyé par le client serait un vecteur d'écriture croisée) :
 *   - CLIENT/ADMIN → `firstName`, `lastName`, `phone` (portés par `User`) ;
 *   - PRO          → `businessName`, `phone`, `phone2` (portés par `ProProfile`).
 *
 * `null` = effacement explicite, et il n'est PAS permis partout : `phone` d'un
 * pro est NOT NULL en base (contact obligatoire depuis l'inscription, D3).
 */
export const profileUpdateSchema = z
  .object({
    firstName: personNameSchema("account.validation.firstNameRequired").optional(),
    lastName: personNameSchema("account.validation.lastNameRequired").optional(),
    businessName: z
      .string({ required_error: "account.validation.businessNameRequired" })
      .trim()
      .min(2, "account.validation.businessNameTooShort")
      .max(150, "account.validation.businessNameTooLong")
      .optional(),
    phone: dzPhoneSchema.nullable().optional(),
    phone2: dzPhoneSchema.nullable().optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "account.validation.emptyPatch" });
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * POST /me/change-email — dépose une DEMANDE de changement, ne bascule rien.
 * Le nouvel e-mail ne devient l'identifiant qu'après preuve de possession
 * (lien envoyé À LA NOUVELLE adresse) : une faute de frappe ne peut pas
 * verrouiller quelqu'un dehors.
 */
export const changeEmailSchema = z.object({ newEmail: emailSchema }).strict();
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

/**
 * POST /me/change-password — D42. `currentPassword` est OPTIONNEL DANS LE
 * SCHÉMA et obligatoire À L'EXÉCUTION quand le compte porte déjà un mot de
 * passe : le mode est décidé PAR LE SERVEUR d'après l'état en base, jamais par
 * un drapeau du client — sinon le contrôle de l'ancien mot de passe se
 * contournerait en omettant le champ.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "account.validation.currentPasswordRequired").optional(),
    newPassword: passwordSchema
  })
  .strict();
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** POST /me/deletion-request — motif libre facultatif (D37). */
export const deletionRequestSchema = z
  .object({
    reason: z.string().trim().max(1000, "account.validation.reasonTooLong").optional()
  })
  .strict();
export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>;

/** POST /admin/deletion-requests/:id/reject — motif transmis à l'utilisateur. */
export const deletionDecisionSchema = z
  .object({
    decisionNote: z.string().trim().max(1000, "account.validation.decisionNoteTooLong").optional()
  })
  .strict();
export type DeletionDecisionInput = z.infer<typeof deletionDecisionSchema>;

/** GET /admin/deletion-requests — filtre de statut, défaut PENDING (la file). */
export const deletionRequestQuerySchema = z
  .object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).default("PENDING")
  })
  .strict();
export type DeletionRequestQueryInput = z.input<typeof deletionRequestQuerySchema>;

/** Codes d'erreur métier COMPTE (stables, consommés par les fronts en A11). */
export const AccountErrorCode = {
  /** Compte non `ACTIVE` (suspendu / anonymisé) : toute action /me est refusée.
   *  Aucun risque d'oracle — l'appelant est déjà authentifié sur CE compte. */
  ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE",
  /** Champ absent du profil de CE rôle (`businessName` envoyé par un CLIENT…). */
  PROFILE_FIELD_NOT_ALLOWED: "PROFILE_FIELD_NOT_ALLOWED",
  /** `phone: null` sur un compte PRO : le contact pro est obligatoire (D3). */
  PRO_PHONE_REQUIRED: "PRO_PHONE_REQUIRED",
  /** D42, compte AVEC mot de passe : `currentPassword` absent du corps. */
  CURRENT_PASSWORD_REQUIRED: "CURRENT_PASSWORD_REQUIRED",
  /** D42 : `currentPassword` faux — coût argon2 payé (discipline D5). */
  CURRENT_PASSWORD_INVALID: "CURRENT_PASSWORD_INVALID",
  /** change-email : la nouvelle adresse est l'adresse actuelle. */
  EMAIL_UNCHANGED: "EMAIL_UNCHANGED",
  /** D37 : une demande PENDING existe déjà (garanti par index unique PARTIEL). */
  DELETION_REQUEST_ALREADY_PENDING: "DELETION_REQUEST_ALREADY_PENDING",
  /** Aucune demande à annuler / id admin inconnu (404 indistinct). */
  DELETION_REQUEST_NOT_FOUND: "DELETION_REQUEST_NOT_FOUND",
  /** approve/reject/cancel sur une demande déjà décidée : transition refusée. */
  DELETION_REQUEST_NOT_PENDING: "DELETION_REQUEST_NOT_PENDING"
} as const;
export type AccountErrorCode = (typeof AccountErrorCode)[keyof typeof AccountErrorCode];

// ── DTOs de réponse ─────────────────────────────────────────────────────────

/**
 * GET /me/deletion-request — `null` quand il n'y en a aucune.
 * A11 en a besoin pour rendre les TROIS états (aucune / en cours / refusée) :
 * sans lui, l'écran re-proposerait « demander la suppression » à quelqu'un qui
 * a déjà une demande en attente, et la soumission taperait dans l'index unique.
 */
export interface DeletionRequestDTO {
  id: string;
  status: AccountDeletionStatus;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  /** Motif du refus, saisi par l'admin — affiché tel quel côté A11. */
  decisionNote: string | null;
}

/** Vue ADMIN de la file : de quoi décider sans ouvrir DBeaver. */
export interface AdminDeletionRequestDTO extends DeletionRequestDTO {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  /** Salles VIVANTES qui seraient archivées par l'approbation (D41). */
  venueCount: number;
}

/** POST /me/change-email — réponse constante : rien n'a encore basculé. */
export interface ChangeEmailResponse {
  status: "pending_verification";
  /** Rappelé au front pour l'écran « un lien a été envoyé à … » (A11). */
  pendingEmail: string;
}

/** POST /auth/confirm-email-change/:token — la bascule a eu lieu. */
export interface ConfirmEmailChangeResponse {
  status: "changed";
  email: string;
}

/** POST /me/change-password — ne déconnecte PAS l'appareil courant (D42). */
export interface ChangePasswordResponse {
  status: "ok";
}
