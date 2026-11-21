// La COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341) : les durées (UN levier), les codes d'erreur, les schémas des corps de K-14, K-15 et K-18, et la forme de leurs réponses ; rang 56, L36-3a-2 (D354) : le mot de passe
// temporaire (7 jours, le même levier), l'ÉTAT d'un compte, K-19 à K-22 (lister, créer, réinitialiser, désactiver), les quatre codes d'erreur neufs. La TABLE DES CAPACITÉS vit dans `staff-capabilities.ts`.
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

/**
 * L'ÉTAT d'un compte de membre (rang 56, D354, R-3, S-104) — ce que `etatDuCompte` (`apps/api/src/staff/staff-account-state.ts`) rend, et ce que la liste des membres (K-19) montre :
 * `ACTIVE`, `MUST_CHANGE_PASSWORD` (un temporaire valable, ou un mot de passe de 90 jours expiré : la connexion n'ouvre que le changement), `TEMPORARY_EXPIRED` (la connexion est refusée : un Manager doit
 * en refaire un), `DISABLED`. Ce n'est PAS une énumération de la base : c'est le JUGEMENT de la règle, à l'heure de la base.
 */
export const StaffAccountState = {
  ACTIVE: "ACTIVE",
  MUST_CHANGE_PASSWORD: "MUST_CHANGE_PASSWORD",
  TEMPORARY_EXPIRED: "TEMPORARY_EXPIRED",
  DISABLED: "DISABLED"
} as const;
export type StaffAccountState = (typeof StaffAccountState)[keyof typeof StaffAccountState];

/**
 * L'ÉTAT d'un PIN (rang 58, D356, R-4) — ce que `etatDuPin` (`apps/api/src/staff/staff-account-state.ts`, la fonction jumelle de `etatDuCompte`) rend : `ABSENT` (aucun PIN), `VALID` (il peut servir), `EXPIRED` (son échéance
 * est passée), `LOCKED` (le verrou est posé, ou le compte d'échecs est au plafond). Ce n'est PAS une énumération de la base : c'est le JUGEMENT de la règle, à l'heure de la base.
 */
export const StaffPinState = {
  ABSENT: "ABSENT",
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  LOCKED: "LOCKED"
} as const;
export type StaffPinState = (typeof StaffPinState)[keyof typeof StaffPinState];

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
  /** Validité d'un mot de passe TEMPORAIRE (création ou réinitialisation par un Manager, DR5) : SEPT jours, changement obligatoire. Rang 56 (D354) — UN paramètre, jamais un littéral ailleurs (MP-43). */
  TEMPORARY_PASSWORD_DAYS: 7,
  /** Borne dure du nombre de cookies d'appareil lus par requête (cadrage D340, § 2.2). */
  DEVICE_COOKIES_MAX: 8,
  /**
   * Rang 58 (D356, DR5 « longueur = paramètre ») — le nombre de CHIFFRES d'un PIN. UN paramètre : le générateur, le schéma de la connexion par PIN et les écrans le lisent ici, jamais un 4 écrit ailleurs.
   */
  PIN_LENGTH: 4,
  /**
   * Rang 58 (D356, DR5 « 3 essais ») — le plafond d'essais d'un PIN avant le verrou. ⚠ La base porte la MÊME valeur dans sa `CHECK` (`pin_failed_count BETWEEN 0 AND 3`, migration `staff_layer`) : la constante ne peut pas
   * dépasser ce que la base accepte sans une migration — `staff-contract.spec.ts` la confronte à la migration, qui est l'autorité (D186).
   */
  PIN_MAX_FAILURES: 3
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
  STAFF_CURRENT_PASSWORD_INVALID: "STAFF_CURRENT_PASSWORD_INVALID",
  /** 403 — rang 56 (D354, S-100, S-242) : le rôle du membre n'a pas la capacité, OU son mot de passe est à changer et la route n'est pas celle du changement. UN code, UN message : aucun refus ne dit pourquoi. */
  STAFF_CAPABILITY_DENIED: "STAFF_CAPABILITY_DENIED",
  /** 404 — le membre n'existe pas DANS CETTE SALLE : un identifiant inventé et celui d'un membre d'une autre salle donnent la MÊME réponse. */
  STAFF_MEMBER_NOT_FOUND: "STAFF_MEMBER_NOT_FOUND",
  /** 409 — le membre est désactivé : on ne réinitialise pas son mot de passe. */
  STAFF_MEMBER_DISABLED: "STAFF_MEMBER_DISABLED",
  /** 409 — « jamais zéro Manager » : cette désactivation laisserait la salle sans Manager actif. */
  STAFF_LAST_MANAGER: "STAFF_LAST_MANAGER"
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
  STAFF_CURRENT_PASSWORD_INVALID: "staff.errors.currentPasswordInvalid",
  STAFF_CAPABILITY_DENIED: "staff.errors.capabilityDenied",
  STAFF_MEMBER_NOT_FOUND: "staff.errors.memberNotFound",
  STAFF_MEMBER_DISABLED: "staff.errors.memberDisabled",
  STAFF_LAST_MANAGER: "staff.errors.lastManager"
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

/**
 * K-20 (rang 56, D354) — `POST /pro/staff/members` : le nom de compte et le RÔLE, rien d'autre. ⛔ Le mot de passe est GÉNÉRÉ par le serveur (DR5 : « généré par défaut ») : une clé `password` est refusée, pas
 * ignorée. Le rôle se CHOISIT à la création — aucune route ne le change (R-8) — et DR5 attend « un second Manager » : les deux valeurs sont admises. Le nom suit LA MÊME règle qu'à l'activation (D147).
 */
export const staffMemberCreateSchema = z
  .object({
    accountName: staffAccountNameSchema,
    role: z.enum([StaffRole.MANAGER, StaffRole.EMPLOYEE], {
      errorMap: (issue, ctx) => ({ message: issue.code === "invalid_type" && ctx.data === undefined ? "staff.validation.roleRequired" : "staff.validation.roleInvalid" })
    })
  })
  .strict("staff.validation.unknownKey");
export type StaffMemberCreateInput = z.infer<typeof staffMemberCreateSchema>;

/** Le PIN d'un corps : `PIN_LENGTH` chiffres, EN TEXTE (un PIN qui commence par zéro n'est pas un nombre). ⚠ Le schéma ne dit RIEN de la liste des PIN triviaux : « 1234 » est accepté ici et refusé à la vérification comme tout PIN faux. */
const PIN_PATTERN = new RegExp(`^[0-9]{${STAFF_LIMITS.PIN_LENGTH}}$`);

/**
 * K-23 (rang 58, D356) — `POST /pro/staff/pin-login` : le membre (son identifiant, tel que l'état K-17 le rend à l'écran de verrouillage) et son PIN. ⛔ Le jeton d'appareil voyage par COOKIE, jamais par le corps : une clé
 * inconnue est REFUSÉE, pas ignorée. Les messages sont TROIS clés : membre (absent ou qui n'est pas un identifiant), PIN absent, PIN mal formé.
 */
export const staffPinLoginSchema = z
  .object({
    memberId: z
      .string({ required_error: "staff.validation.memberRequired", invalid_type_error: "staff.validation.memberRequired" })
      .uuid("staff.validation.memberRequired"),
    pin: z
      .string({ required_error: "staff.validation.pinRequired", invalid_type_error: "staff.validation.pinInvalid" })
      .regex(PIN_PATTERN, "staff.validation.pinInvalid")
  })
  .strict("staff.validation.unknownKey");
export type StaffPinLoginInput = z.infer<typeof staffPinLoginSchema>;

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

/** K-14 — le Manager créé ET son PIN, rendu UNE fois (`Cache-Control: no-store`) : il n'est stocké qu'en HMAC, jamais relisible (rang 58, D356). */
export interface StaffActivationDTO {
  member: StaffMemberDTO;
  pin: string;
}
/** K-15 — le membre ET le PIN NEUF quand il n'en avait pas de valable (absent, expiré, verrouillé), sinon `null` (rang 58, D356). Rendu UNE fois, `Cache-Control: no-store`. */
export interface StaffLoginDTO {
  member: StaffMemberDTO;
  pin: string | null;
}
/** K-23 — le membre dont la session s'ouvre. ⛔ AUCUN PIN : la connexion par PIN ne rend jamais un PIN (rang 58, D356). */
export interface StaffPinLoginDTO {
  member: StaffMemberDTO;
}
export interface StaffLogoutDTO {
  status: "ok";
}
/** K-18 — le membre ET le PIN NEUF quand il n'en avait pas de valable, sinon `null` : la MÊME règle d'émission que K-15 (rang 58, D356). */
export interface StaffPasswordChangeDTO {
  member: StaffMemberDTO;
  pin: string | null;
}

// ── K-19 à K-22 (rang 56, D354) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Un membre, tel que la liste (K-19) et les réponses de K-20 à K-22 le rendent. ⛔ SIX champs, jamais un hachage, un compteur d'échecs, un verrou, un jeton, une échéance de mot de passe ni un mot de passe : l'écran
 * du Manager n'en a pas besoin, et « jamais relisible » est une propriété de la FORME. Les dates sont des chaînes ISO (UTC). `state` est le JUGEMENT de `etatDuCompte` à l'heure de la base.
 */
export interface StaffMemberListItemDTO {
  id: string;
  accountName: string;
  role: StaffRole;
  state: StaffAccountState;
  lastLoginAt: string | null;
  createdAt: string;
}

/** K-19 — les membres de la salle (actifs et désactivés), dans l'ordre de leur création. */
export interface StaffMembersListDTO {
  members: StaffMemberListItemDTO[];
}

/**
 * K-20 et K-21 — le membre et son mot de passe TEMPORAIRE, rendu UNE fois (`Cache-Control: no-store`) : il n'est stocké qu'haché, jamais journalisé, jamais relisible. `temporaryPasswordExpiresAt` est l'échéance posée
 * par la base (sept jours, le levier), en ISO.
 */
export interface StaffTemporaryPasswordDTO {
  member: StaffMemberListItemDTO;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
}

/** K-22 — le membre désactivé (une désactivation répétée rend le même membre, sans écriture). */
export interface StaffMemberDisabledDTO {
  member: StaffMemberListItemDTO;
}
