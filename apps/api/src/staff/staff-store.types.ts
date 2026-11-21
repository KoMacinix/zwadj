// Le PORT du magasin de la couche du personnel — rang 44, L36-3a-1 (D341) ; rang 56, L36-3a-2 (D354) : K-19 à K-22 et l'état du compte ; rang 58, L36-3b (D356) : le PIN (K-23, l'émission, l'effacement). Le service, le garde et les tests parlent à ce contrat ; seul
// `staff-store.prisma.ts` connaît Prisma et SQL (Repository, DIP).
//
// ⛔ CE QUE LE PORT PROMET, et que l'adaptateur tient en SQL : toute décision qui dépend du TEMPS se prend avec l'horloge de la BASE (`now()`, S-101, MP-41) ; la RÉSERVATION d'une tentative de mot de passe est UNE
// instruction (S-102) ; une transition ne s'écrit que SOUS la condition de son statut source, compte exigé (D305) ; l'ordre des verrous est L1 (le profil) < L2 (les membres) < L3 (les appareils) < L4 (les sessions)
// (cadrage D340, § 3.1) — sans cycle possible, donc sans interblocage. Aucun résultat ne porte un secret. ⛔ Rang 58 : le magasin ne voit JAMAIS un PIN en clair — il ne reçoit que des HACHÉS (`pinHash`, `newPinHash`,
// `expectedPinHash`), le HMAC se calcule dans `staff-pin-hasher.ts` (garde de SOURCE).
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

/**
 * Un membre trouvé par sa clé : ce qui suffit à décider s'il faut réserver une tentative. Jamais le hachage — il n'est rendu que par la RÉSERVATION. Rang 56 (D354, S-104, S-241) : l'échéance de son mot de passe et
 * l'HEURE DE LA BASE (`now()`, lue dans la MÊME instruction) — `etatDuCompte` juge « peut-il se connecter » avec ces deux valeurs, jamais avec une horloge de l'API.
 */
export interface StaffMemberRow extends StaffMemberView {
  status: StaffStatus;
  passwordExpiresAt: Date;
  now: Date;
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
  /** Le HACHÉ du PIN du Manager (rang 58, D356) : le PIN est tiré et haché par le service, rendu UNE fois dans la réponse, et stocké avec sa génération et son échéance (`PIN_VALIDITY_DAYS`). */
  pinHash: string;
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
  /**
   * ⛔ D355 (rang 57, R-1) — le hachage du mot de passe LU par la RÉSERVATION de la tentative : celui que `login` a vérifié. L'ouverture lui est CONDITIONNÉE, dans le CAS du membre (la ligne que cet `UPDATE`
   * verrouille) : un mot de passe remplacé ENTRE la réservation et l'ouverture — une réinitialisation (K-21), un changement (K-18) — ne trouve plus la ligne, et la connexion qui avait vérifié l'ANCIEN mot de
   * passe n'ouvre aucune session. Ce n'est PAS un contrôle fait AVANT la transaction : entre ce contrôle et l'écriture la ligne peut encore changer — la condition est dans le CAS, lue sur la ligne verrouillée.
   * Le PIN (lot 3b) ouvrira ses sessions par ce même appel et y ajoutera SA preuve.
   */
  expectedPasswordHash: string;
  /**
   * ⛔ Rang 58 (D356) — le HACHÉ d'un PIN CANDIDAT : le magasin l'INSTALLE si, SOUS LE VERROU du membre, son PIN n'est pas valable (absent, expiré, verrouillé — `etatDuPin`, UNE copie de la règle) et le dit (`pinIssued`) ;
   * sinon il l'ignore. Le service ne montre le PIN en clair que si le magasin l'a installé : un PIN montré qui n'est pas celui qui est stocké est pire qu'un PIN non montré.
   */
  newPinHash: string;
  sessionTokenHash: string;
  /** Les hachages des cookies d'appareil présentés (bornés à 8) : l'adaptateur en cherche un réutilisable. */
  candidateDeviceHashes: readonly string[];
  /** Le hachage du jeton d'un appareil NEUF, utilisé seulement si aucun n'est réutilisable. */
  newDeviceTokenHash: string;
  deviceLabel: string;
}
/**
 * Le refus d'ouvrir est UN seul résultat (`memberChanged`) : le membre n'est plus celui que la réservation a vu — désactivé, ou son mot de passe remplacé (D355, R-1). Le CAS ne dit pas lequel, et le service non plus
 * (aucun refus ne dit pourquoi, R-3 de D341) : il rend le même refus qu'un mauvais mot de passe.
 */
export type OpenSessionResult =
  | { ok: true; member: StaffMemberView; sessionId: string; deviceReused: boolean; pinIssued: boolean }
  | { ok: false; reason: "memberChanged" };

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
  /** La colonne BRUTE (`must_change_password`) : le marqueur « temporaire ». L'ÉTAT JUGÉ est `etatDuCompte(session, session.now)`, jamais ce champ seul. */
  mustChangePassword: boolean;
  status: StaffStatus;
  passwordExpiresAt: Date;
  /** `now()` de la BASE, lu dans l'instruction qui a rendu la session (S-101, MP-41, S-241). */
  now: Date;
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
  /** Rang 58 (D356) — le haché d'un PIN candidat : la MÊME règle d'émission que `OpenSessionInput.newPinHash`, sous le verrou du membre. */
  newPinHash: string;
}
export type ChangePasswordResult = { ok: true; member: StaffMemberView; otherSessionsEnded: number; pinIssued: boolean } | { ok: false; reason: "changedConcurrently" };

// ── K-23 (rang 58, D356) — la connexion par PIN ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * La RÉSERVATION d'un essai de PIN : UNE instruction qui porte TOUTES ses conditions — le membre de CETTE salle, actif, un PIN non expiré, non verrouillé, SOUS le plafond d'essais, ET un appareil de ce membre
 * présenté (par le hachage de son cookie), ni révoqué ni expiré (MP-2 : un PIN sans appareil ne consomme AUCUN essai).
 */
export interface PinReservationInput {
  proProfileId: string;
  memberId: string;
  deviceTokenHashes: readonly string[];
}
export type PinReservation =
  | { reserved: false }
  | {
      reserved: true;
      /** Le haché de PIN LU par la réservation : l'ouverture lui est CONDITIONNÉE (R-3). */
      pinHash: string;
      /** Le compte d'essais APRÈS cette réservation (1 à `PIN_MAX_FAILURES`). */
      failedCount: number;
    };

export interface RecordPinFailureInput {
  actor: StaffActor;
  memberId: string;
  /** Le compte d'essais à la RÉSERVATION de cet essai : c'est lui qui dit si CET échec est celui qui pose le verrou (le troisième). */
  failedCount: number;
  /** Le haché de PIN lu à la réservation : le verrou ne se pose que sur CE PIN (jamais sur un PIN neuf posé entre-temps par un déblocage). */
  expectedPinHash: string;
}
export interface RecordPinFailureResult {
  /** CET échec a posé le verrou. */
  locked: boolean;
  /** Le nombre de sessions du membre terminées par le verrou (`PIN_LOCKED`). */
  sessionsEnded: number;
}

export interface OpenPinSessionInput {
  actor: StaffActor;
  proProfileId: string;
  memberId: string;
  /** Le haché de PIN LU à la réservation : celui que le service a vérifié. L'ouverture lui est CONDITIONNÉE, dans le CAS du membre (R-3). */
  expectedPinHash: string;
  sessionTokenHash: string;
  /** Les hachages des cookies d'appareil présentés (bornés à 8) : l'adaptateur re-vérifie, SOUS VERROU, qu'un appareil de ce membre est toujours vivant. */
  candidateDeviceHashes: readonly string[];
}
/** Le refus d'ouvrir est UN seul résultat : le membre n'est plus celui que la réservation a vu (désactivé, PIN remplacé, verrouillé ou expiré) ou son appareil n'est plus vivant — le service ne distingue pas. */
export type OpenPinSessionResult = { ok: true; member: StaffMemberView; sessionId: string } | { ok: false; reason: "memberChanged" };

export interface ListKnownMembersInput {
  proProfileId: string;
  deviceTokenHashes: readonly string[];
}

// ── K-19 à K-22 (rang 56, D354) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Un membre tel que la gestion du personnel le lit : de quoi juger son ÉTAT (`etatDuCompte`) et de quoi remplir la liste — jamais un hachage, un compteur, un verrou, un PIN ni un jeton. `now` est l'heure de la BASE
 * lue dans la même instruction : chaque ligne porte la sienne (la même pour toutes celles d'une instruction).
 */
export interface MemberListRow {
  id: string;
  accountName: string;
  role: StaffRole;
  status: StaffStatus;
  mustChangePassword: boolean;
  passwordExpiresAt: Date;
  lastLoginAt: Date | null;
  createdAt: Date;
  now: Date;
}

/** Qui agit : le MANAGER dont la session a passé le garde (`actorMemberId`, pour l'audit et `created_by`), son compte commun (`actor`), la salle du PROFIL du Bearer (`proProfileId`) — jamais un identifiant venu du corps. */
export interface ManagementActor {
  actor: StaffActor;
  actorMemberId: string;
  proProfileId: string;
}

export interface CreateMemberInput extends ManagementActor {
  accountName: string;
  accountNameKey: string;
  role: StaffRole;
  /** Le HACHAGE du mot de passe temporaire : le magasin ne voit JAMAIS le clair (R-5). */
  passwordHash: string;
}
export type CreateMemberResult = { ok: true; member: MemberListRow } | { ok: false; reason: "accountNameTaken" };

export interface ResetMemberInput extends ManagementActor {
  memberId: string;
  passwordHash: string;
}
export type ResetMemberResult =
  | { ok: true; member: MemberListRow; sessionsEnded: number; devicesRevoked: number }
  | { ok: false; reason: "notFound" | "disabled" };

export interface DisableMemberInput extends ManagementActor {
  memberId: string;
}
export type DisableMemberResult =
  | { ok: true; member: MemberListRow; sessionsEnded: number; alreadyDisabled: boolean }
  | { ok: false; reason: "notFound" | "lastManager" };

export interface StaffStore {
  /** UNE lecture du profil du compte commun : sa salle et le drapeau. Relue à CHAQUE requête Pro (limite 6 du cadrage). `null` = pas de profil. */
  readLayer(userId: string): Promise<StaffLayer | null>;
  activate(input: ActivateInput): Promise<ActivateResult>;
  findMember(proProfileId: string, accountNameKey: string): Promise<StaffMemberRow | null>;
  /** K-23 — le membre de CETTE salle par son identifiant : de quoi juger son état de compte (`etatDuCompte`) avec l'heure de la base. Aucun secret. */
  findMemberById(proProfileId: string, memberId: string): Promise<StaffMemberRow | null>;
  reservePasswordAttempt(memberId: string): Promise<PasswordReservation>;
  recordPasswordFailure(input: RecordFailureInput): Promise<void>;
  resetPasswordAttempts(memberId: string): Promise<void>;
  openSession(input: OpenSessionInput): Promise<OpenSessionResult>;
  /** K-23 — la RÉSERVATION atomique d'un essai de PIN (le compteur monte AVANT la vérification). */
  reservePinAttempt(input: PinReservationInput): Promise<PinReservation>;
  /** K-23 — un PIN faux : la ligne d'échec ; au TROISIÈME échec, sur CE PIN, le verrou, la fin des sessions du membre et la ligne de verrouillage — une transaction. */
  recordPinFailure(input: RecordPinFailureInput): Promise<RecordPinFailureResult>;
  /** K-23 — l'ouverture CONDITIONNÉE (R-3) : le membre (L2), l'appareil re-vérifié sous verrou (L3), la session (L4), la ligne `staff.pin_login`. */
  openSessionByPin(input: OpenPinSessionInput): Promise<OpenPinSessionResult>;
  /** Le garde : prolonge la session si elle est vivante (UN `UPDATE … RETURNING`), sinon écrit la fin qui s'écrit. */
  touchSession(input: TouchInput): Promise<SessionTouchResult>;
  /** L'état (K-17) : MÊMES prédicats que `touchSession`, en LECTURE SEULE — il ne prolonge rien et n'écrit rien. */
  peekSession(input: TouchInput): Promise<SessionTouchResult>;
  closeSession(input: CloseSessionInput): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult>;
  listKnownMembers(input: ListKnownMembersInput): Promise<KnownMember[]>;
  /** K-19 — les membres de la salle, actifs et désactivés, dans l'ordre de leur création : UNE lecture, aucun secret. */
  listMembers(proProfileId: string): Promise<MemberListRow[]>;
  /** K-20 — le membre ET son audit dans UNE transaction ; un nom déjà pris (à la normalisation près) est refusé par la base. */
  createMember(input: CreateMemberInput): Promise<CreateMemberResult>;
  /** K-21 — le membre (L2), ses appareils (L3), TOUTES ses sessions (L4), l'audit : une transaction. Le PIN est EFFACÉ (les cinq colonnes `pin_*`, rang 58) : le membre n'en a plus tant qu'il ne s'est pas reconnecté par mot de passe. */
  resetMemberPassword(input: ResetMemberInput): Promise<ResetMemberResult>;
  /** K-22 — « jamais zéro Manager » : le profil (L1), puis le comptage SOUS ce verrou, puis le membre (L2, son PIN EFFACÉ) et ses sessions (L4) : une transaction. */
  disableMember(input: DisableMemberInput): Promise<DisableMemberResult>;
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
  | { action: "staff.password_change"; entityType: "staff_member"; entityId: string; after: { otherSessionsEnded: number } }
  // Rang 58 (D356, R-5) : les QUATRE actions du PIN — la connexion par PIN (l'entité est la session), l'échec (le compte d'essais, jamais le PIN), le verrouillage (le compte et le nombre de sessions terminées), le
  // déblocage (la connexion par mot de passe d'un membre dont le PIN est verrouillé). ⛔ Aucune action n'est ajoutée au-delà de cette liste (réponse de Ko, 1 d) : l'ÉMISSION d'un PIN n'a pas de ligne.
  | { action: "staff.pin_login"; entityType: "staff_session"; entityId: string; after: { memberId: string } }
  | { action: "staff.pin_login_failed"; entityType: "staff_member"; entityId: string; after: { failedCount: number } }
  | { action: "staff.pin_lock"; entityType: "staff_member"; entityId: string; after: { failedCount: number; sessionsEnded: number } }
  | { action: "staff.pin_unlock"; entityType: "staff_member"; entityId: string; after: { via: "password" } }
  // Rang 56 (D354, R-6) : les trois actions de GESTION — le MANAGER est l'acteur, l'entité est le membre visé, la charge utile ne porte ni nom, ni hachage, ni temporaire.
  | { action: "staff.member_create"; entityType: "staff_member"; entityId: string; after: { role: StaffRole } }
  | { action: "staff.member_reset_password"; entityType: "staff_member"; entityId: string; after: { sessionsEnded: number; devicesRevoked: number } }
  | { action: "staff.member_disable"; entityType: "staff_member"; entityId: string; after: { role: StaffRole; sessionsEnded: number } };
