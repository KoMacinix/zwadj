// Le PORT du magasin de la couche du personnel — rang 44, L36-3a-1 (D341). Le service, le garde et les tests parlent à ce contrat ; seul `staff-store.prisma.ts` connaît Prisma et SQL (Repository, DIP).
//
// ⛔ CE QUE LE PORT PROMET, et que l'adaptateur tient en SQL : toute décision qui dépend du TEMPS se prend avec l'horloge de la BASE (`now()`, S-101, MP-41) ; la RÉSERVATION d'une tentative de mot de passe est UNE
// instruction (S-102) ; une transition ne s'écrit que SOUS la condition de son statut source, compte exigé (D305) ; l'ordre des verrous est L1 (le profil) < L2 (les membres) < L3 (les appareils) < L4 (les sessions)
// (cadrage D340, § 3.1) — sans cycle possible, donc sans interblocage. Aucun résultat ne porte un secret.
import type { StaffRole, StaffStatus } from "@zwadj/types";

export const STAFF_STORE = Symbol("STAFF_STORE");

/** Qui agit : le COMPTE COMMUN (le Bearer). Le membre qui agit est, lui, un paramètre de chaque appel — il vient du contexte posé par le garde. */
export interface StaffActor {
  userId: string;
  role: "PRO";
}

// ── L'état de la couche ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface StaffLayer {
  proProfileId: string;
  /** `null` = couche éteinte. */
  enabledAt: Date | null;
}

// ── Les membres ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un membre tel que les réponses le rendent. */
export interface StaffMemberView {
  id: string;
  accountName: string;
  role: StaffRole;
  mustChangePassword: boolean;
}

/** Un membre trouvé par sa clé : ce qui suffit à décider s'il faut réserver une tentative. Jamais le hachage — il n'est rendu que par la RÉSERVATION. */
export interface StaffMemberRow extends StaffMemberView {
  status: StaffStatus;
}

export interface KnownMember {
  id: string;
  accountName: string;
  role: StaffRole;
}

// ── K-14 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ActivateInput {
  actor: StaffActor;
  accountName: string;
  accountNameKey: string;
  passwordHash: string;
  sessionTokenHash: string;
  deviceTokenHash: string;
  deviceLabel: string;
}
export type ActivateResult =
  | { ok: true; member: StaffMemberView; sessionId: string }
  | { ok: false; reason: "profileMissing" | "emailNotVerified" | "alreadyActivated" | "accountNameTaken" };

// ── K-15 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** La RÉSERVATION d'une tentative de mot de passe : refusée (membre éteint, inconnu ou EN PAUSE — le service ne distingue pas) ou accordée, avec le hachage à vérifier. */
export type PasswordReservation =
  | { reserved: false }
  | {
      reserved: true;
      passwordHash: string;
      /** Le compte d'échecs APRÈS cette réservation. */
      failedCount: number;
      /** Cette réservation a déclenché la pause (le compte a atteint le seuil). */
      pausedNow: boolean;
    };

export interface RecordFailureInput {
  actor: StaffActor;
  memberId: string;
  failedCount: number;
  pausedNow: boolean;
  action: "staff.login_failed" | "staff.password_change_failed";
}

export interface OpenSessionInput {
  actor: StaffActor;
  proProfileId: string;
  memberId: string;
  sessionTokenHash: string;
  /** Les hachages des cookies d'appareil présentés (bornés à 8) : l'adaptateur en cherche un réutilisable. */
  candidateDeviceHashes: readonly string[];
  /** Le hachage du jeton d'un appareil NEUF, utilisé seulement si aucun n'est réutilisable. */
  newDeviceTokenHash: string;
  deviceLabel: string;
}
export type OpenSessionResult =
  | { ok: true; member: StaffMemberView; sessionId: string; deviceReused: boolean }
  | { ok: false; reason: "memberInactive" };

// ── Le garde et l'état ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface TouchInput {
  tokenHash: string;
  /** La salle du compte commun (le Bearer) — jamais celle du cookie. */
  proProfileId: string;
}
export interface StaffSessionView {
  sessionId: string;
  memberId: string;
  role: StaffRole;
  accountName: string;
  mustChangePassword: boolean;
}
export type SessionTouchResult = { ok: true; session: StaffSessionView } | { ok: false };

// ── K-16, K-18 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface CloseSessionInput {
  actor: StaffActor;
  sessionId: string;
  memberId: string;
}

export interface ChangePasswordInput {
  actor: StaffActor;
  memberId: string;
  /** La session qui change son mot de passe : elle RESTE ; les autres prennent `PASSWORD_CHANGED`. */
  currentSessionId: string;
  /** Le hachage LU par la réservation : le remplacement est CONDITIONNÉ à lui (deux remplacements simultanés ne réussissent pas tous deux). */
  expectedPasswordHash: string;
  newPasswordHash: string;
}
export type ChangePasswordResult = { ok: true; member: StaffMemberView; otherSessionsEnded: number } | { ok: false; reason: "changedConcurrently" };

export interface ListKnownMembersInput {
  proProfileId: string;
  deviceTokenHashes: readonly string[];
}

export interface StaffStore {
  /** UNE lecture du profil du compte commun : sa salle et le drapeau. Relue à CHAQUE requête Pro (limite 6 du cadrage). `null` = pas de profil. */
  readLayer(userId: string): Promise<StaffLayer | null>;
  activate(input: ActivateInput): Promise<ActivateResult>;
  findMember(proProfileId: string, accountNameKey: string): Promise<StaffMemberRow | null>;
  reservePasswordAttempt(memberId: string): Promise<PasswordReservation>;
  recordPasswordFailure(input: RecordFailureInput): Promise<void>;
  resetPasswordAttempts(memberId: string): Promise<void>;
  openSession(input: OpenSessionInput): Promise<OpenSessionResult>;
  /** Le garde : prolonge la session si elle est vivante (UN `UPDATE … RETURNING`), sinon écrit la fin qui s'écrit. */
  touchSession(input: TouchInput): Promise<SessionTouchResult>;
  /** L'état (K-17) : MÊMES prédicats que `touchSession`, en LECTURE SEULE — il ne prolonge rien et n'écrit rien. */
  peekSession(input: TouchInput): Promise<SessionTouchResult>;
  closeSession(input: CloseSessionInput): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult>;
  listKnownMembers(input: ListKnownMembersInput): Promise<KnownMember[]>;
}

/**
 * Ce que le GARDE demande du magasin, et rien de plus (Interface Segregation) : il lit le drapeau et prolonge une session. Les doubles de son spec se limitent à ces deux méthodes.
 */
export type StaffGuardStore = Pick<StaffStore, "readLayer" | "touchSession">;

// ── L'audit : une charge utile FERMÉE (MP-33, MP-11) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Les seules lignes d'audit que la couche écrit. `after` ne porte QUE les champs listés — ni nom de compte, ni hachage, ni jeton, ni mot de passe, ni PIN (jamais). L'adaptateur n'a qu'UN site d'écriture
 * (`ecrireAudit`) : une action neuve se déclare ICI, avec sa charge utile, avant de pouvoir être écrite.
 */
export type StaffAuditEntry =
  | { action: "staff.activate"; entityType: "staff_member"; entityId: string; after: { role: "MANAGER" } }
  | { action: "staff.login"; entityType: "staff_session"; entityId: string; after: { memberId: string; deviceReused: boolean } }
  | { action: "staff.login_failed" | "staff.password_change_failed"; entityType: "staff_member"; entityId: string; after: { failedCount: number } }
  | { action: "staff.password_pause"; entityType: "staff_member"; entityId: string; after: { pausedMinutes: number } }
  | { action: "staff.logout"; entityType: "staff_session"; entityId: string; after: { memberId: string } }
  | { action: "staff.password_change"; entityType: "staff_member"; entityId: string; after: { otherSessionsEnded: number } };
