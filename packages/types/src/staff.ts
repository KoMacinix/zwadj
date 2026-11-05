// La COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341) : les durées (UN levier), les codes d'erreur, les schémas des corps de K-14, K-15 et K-18, et la forme de leurs réponses.
// DR5 de D336 pour les règles ; `docs/preuves/D340/cadrage.md` pour la conception ; la tranche [L36-3] de `ZWADJ_CONTINUITE.md` pour le schéma.
//
// ⛔ UN LEVIER POUR TOUTES LES DURÉES (MP-43) : `STAFF_LIMITS` est la SEULE écriture des 10 minutes, des 12 heures, des 15 minutes et des 90 jours. Le serveur les passe en PARAMÈTRES à SQL
// (`make_interval(mins => $1)`), le navigateur n'en lit aucune. Changer « 10 minutes » en « 11 » se fait ICI, à un endroit — et une garde de source (`staff-source-guards.spec.ts`) refuse tout littéral de durée ailleurs.
// ⚠ R-6 (D341) : l'échéance d'un APPAREIL est la durée du PIN (« même paramètre ») : il n'existe donc PAS de second paramètre de durée d'appareil.
// ⚠ `lib: ["ES2022"]` SEULE : aucun global DOM ni Node ici.
import { z } from "zod";
import { passwordSchema } from "./auth";
import { normalizeStaffAccountName } from "./staff-account-name";

// ── Les énumérations (alignées MANUELLEMENT sur `schema.prisma` et la migration `staff_layer`, comme `enums.ts`) ───────────────────────────────────────────────────────────────────────────────
export const StaffRole = { MANAGER: "MANAGER", EMPLOYEE: "EMPLOYEE" } as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const StaffStatus = { ACTIVE: "ACTIVE", DISABLED: "DISABLED" } as const;
export type StaffStatus = (typeof StaffStatus)[keyof typeof StaffStatus];

/** Pourquoi une session du personnel s'est terminée. ⚠ Pas de valeur « plafond » : le schéma est ratifié (DR8), un plafond atteint se refuse par `expires_at` sans rien écrire. */
export const StaffSessionEndReason = {
  IDLE: "IDLE",
  LOGOUT: "LOGOUT",
  DISABLED: "DISABLED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PIN_LOCKED: "PIN_LOCKED"
} as const;
export type StaffSessionEndReason = (typeof StaffSessionEndReason)[keyof typeof StaffSessionEndReason];

// ── Le levier des durées ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const STAFF_LIMITS = Object.freeze({
  /** Inactivité d'une session, CÔTÉ SERVEUR (`last_activity_at`) — DR5. */
  IDLE_TIMEOUT_MINUTES: 10,
  /** Plafond ABSOLU d'une session — DR5. */
  SESSION_MAX_HOURS: 12,
  /** Pause après `PASSWORD_MAX_FAILURES` échecs consécutifs — jamais définitive — DR5. */
  PASSWORD_PAUSE_MINUTES: 15,
  PASSWORD_MAX_FAILURES: 5,
  /** Validité d'un mot de passe — DR5 (un paramètre, pas une colonne figée). */
  PASSWORD_VALIDITY_DAYS: 90,
  /** Validité d'un PIN — DR5 ; aussi l'échéance d'un APPAREIL tant qu'aucun PIN n'existe (R-6 (D341), « même paramètre »). */
  PIN_VALIDITY_DAYS: 90,
  /** Borne dure du nombre de cookies d'appareil lus par requête (cadrage D340, § 2.2). */
  DEVICE_COOKIES_MAX: 8
} as const);

/** Le libellé d'un appareil : une CONSTANTE (aucun texte du navigateur n'est jamais reflété). Une décision de la session de D341, à ratifier. */
export const STAFF_DEVICE_DEFAULT_LABEL = "Poste";

// ── Les codes d'erreur et leurs messages (FR = AR, MP-39) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const StaffErrorCode = {
  /** 401 — aucune session de personnel valable : absente, finie, inactive, plafonnée, d'une autre salle. Une seule réponse, aucune raison (un 401 par cause serait un oracle). Le client ne la rejoue pas. */
  STAFF_SESSION_REQUIRED: "STAFF_SESSION_REQUIRED",
  /** 401 — compte inconnu, membre désactivé, mauvais mot de passe OU pause : UNE réponse (R-3 (D341) refuse le code distinct de la pause). */
  STAFF_INVALID_CREDENTIALS: "STAFF_INVALID_CREDENTIALS",
  /** 409 — la couche est déjà activée pour cette salle (le drapeau ne se repose pas). */
  STAFF_ALREADY_ACTIVATED: "STAFF_ALREADY_ACTIVATED",
  /** 403 — l'e-mail du compte commun n'est pas vérifié. */
  STAFF_EMAIL_NOT_VERIFIED: "STAFF_EMAIL_NOT_VERIFIED",
  /** 409 — un membre de cette salle porte déjà ce nom (à la normalisation près). */
  STAFF_ACCOUNT_NAME_TAKEN: "STAFF_ACCOUNT_NAME_TAKEN",
  /** 400 — le mot de passe figure dans la liste des plus courants (R-5 (D341)). */
  STAFF_PASSWORD_COMMON: "STAFF_PASSWORD_COMMON",
  /** 400 — le nouveau mot de passe est identique à l'actuel. */
  STAFF_PASSWORD_REUSED: "STAFF_PASSWORD_REUSED",
  /** 400 — le mot de passe actuel est faux (ou en pause : même réponse). */
  STAFF_CURRENT_PASSWORD_INVALID: "STAFF_CURRENT_PASSWORD_INVALID"
} as const;
export type StaffErrorCode = (typeof StaffErrorCode)[keyof typeof StaffErrorCode];

export const STAFF_ERROR_MESSAGE_KEYS: Readonly<Record<StaffErrorCode, string>> = Object.freeze({
  STAFF_SESSION_REQUIRED: "staff.errors.sessionRequired",
  STAFF_INVALID_CREDENTIALS: "staff.errors.invalidCredentials",
  STAFF_ALREADY_ACTIVATED: "staff.errors.alreadyActivated",
  STAFF_EMAIL_NOT_VERIFIED: "staff.errors.emailNotVerified",
  STAFF_ACCOUNT_NAME_TAKEN: "staff.errors.accountNameTaken",
  STAFF_PASSWORD_COMMON: "staff.errors.passwordCommon",
  STAFF_PASSWORD_REUSED: "staff.errors.passwordReused",
  STAFF_CURRENT_PASSWORD_INVALID: "staff.errors.currentPasswordInvalid"
});

// ── Les schémas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Bornes du nom de compte (D55 : écrites avant les cas réels — « Amine », « أمين », « caisse 2 », « Karim B. », « réception-1 »). 2 à 40 caractères ; une décision de la session de D341, à ratifier. */
export const STAFF_ACCOUNT_NAME_MIN = 2;
export const STAFF_ACCOUNT_NAME_MAX = 40;

/**
 * Le nom de compte À L'ACTIVATION : lettres (toutes écritures), marques (voyelles brèves), chiffres, espace, point, tiret bas, apostrophe, tiret. ⚠ Le motif admet la chaîne VIDE (`*`) : les contrôles d'une chaîne
 * Zod s'exécutent TOUS, et un `+` ferait rendre deux messages (« trop court » ET « invalide ») pour un nom vide. ⚠ Le `refine` ne juge que les noms d'une longueur admise, pour la même raison.
 */
export const staffAccountNameSchema = z
  .string({ required_error: "staff.validation.accountNameRequired", invalid_type_error: "staff.validation.accountNameRequired" })
  .trim()
  .min(STAFF_ACCOUNT_NAME_MIN, "staff.validation.accountNameTooShort")
  .max(STAFF_ACCOUNT_NAME_MAX, "staff.validation.accountNameTooLong")
  .regex(/^[\p{L}\p{M}\p{N} ._'-]*$/u, "staff.validation.accountNameInvalid")
  .refine((v) => v.length < STAFF_ACCOUNT_NAME_MIN || normalizeStaffAccountName(v) !== "", "staff.validation.accountNameInvalid");

/** K-14 — `POST /pro/staff/activate` : le nom de compte et le mot de passe du Manager (« de son choix », DR5). Aucune clé de plus : le rôle est MANAGER, jamais saisi. */
export const staffActivateSchema = z
  .object({ accountName: staffAccountNameSchema, password: passwordSchema })
  .strict("staff.validation.unknownKey");
export type StaffActivateInput = z.infer<typeof staffActivateSchema>;

/** K-15 — `POST /pro/staff/login` : ⛔ NE RÉVÈLE PAS la politique (un mot de passe trop court se refuse à la vérification, d'un refus identique à tout autre). */
export const staffLoginSchema = z
  .object({
    accountName: z
      .string({ required_error: "staff.validation.accountNameRequired", invalid_type_error: "staff.validation.accountNameRequired" })
      .trim()
      .min(1, "staff.validation.accountNameRequired")
      .max(100, "staff.validation.accountNameTooLong"),
    password: z
      .string({ required_error: "staff.validation.passwordRequired", invalid_type_error: "staff.validation.passwordRequired" })
      .min(1, "staff.validation.passwordRequired")
      .max(128, "staff.validation.passwordRequired")
  })
  .strict("staff.validation.unknownKey");
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

/** K-18 — `POST /pro/staff/password` : l'actuel (pas jugé par la politique : il peut dater d'avant elle) puis le nouveau (qui la suit). */
export const staffPasswordChangeSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "staff.validation.currentPasswordRequired", invalid_type_error: "staff.validation.currentPasswordRequired" })
      .min(1, "staff.validation.currentPasswordRequired")
      .max(128, "staff.validation.currentPasswordRequired"),
    newPassword: passwordSchema
  })
  .strict("staff.validation.unknownKey");
export type StaffPasswordChangeInput = z.infer<typeof staffPasswordChangeSchema>;

// ── Les réponses ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un membre, tel que les routes le rendent. ⛔ Jamais un hachage, un compteur, une date de connexion : l'écran n'en a pas besoin. */
export interface StaffMemberDTO {
  id: string;
  accountName: string;
  role: StaffRole;
  mustChangePassword: boolean;
}

/** Un membre RECONNU sur ce poste (K-17) : le nom de compte et le rôle — et l'identifiant dont le PIN (lot 3b) aura besoin pour désigner le membre. Rien d'autre. */
export interface StaffKnownMemberDTO {
  id: string;
  accountName: string;
  role: StaffRole;
}

/** K-17 — l'état de la couche pour ce compte commun et ce poste. Jamais un refus : c'est la source de vérité de l'écran de verrouillage. */
export interface StaffSessionStateDTO {
  enabled: boolean;
  member: StaffMemberDTO | null;
  knownMembers: StaffKnownMemberDTO[];
}

export interface StaffActivationDTO {
  member: StaffMemberDTO;
}
export interface StaffLoginDTO {
  member: StaffMemberDTO;
}
export interface StaffLogoutDTO {
  status: "ok";
}
export interface StaffPasswordChangeDTO {
  member: StaffMemberDTO;
}
