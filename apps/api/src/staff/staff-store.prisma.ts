// ⛔ L'ADAPTATEUR PRISMA DE LA COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341) ; rang 56, L36-3a-2 (D354) : K-19 à K-22 et l'état du compte. Voir `staff-store.types.ts` pour le contrat du port. CHEMIN D'IDENTITÉ :
// méthode RENFORCÉE, revue humaine requise.
//
// ⛔ RÈGLES QUE CE FICHIER TIENT, chacune avec sa garde :
//   · LE TEMPS EST CELUI DE LA BASE (S-101, MP-41) : toute échéance et toute comparaison de date est `now()` dans le SQL ; aucune date n'est lue ni fabriquée côté API (garde de source : aucun `new Date` ici).
//   · LES DURÉES SONT DES PARAMÈTRES (MP-43) : `make_interval(mins => ${STAFF_LIMITS.…}::int)` — jamais un littéral (garde de source).
//   · L'ORDRE DES VERROUS (cadrage D340, § 3.1) : L1 le profil (`UPDATE pro_profiles …` de l'activation) < L2 les membres < L3 les appareils < L4 les sessions. Une transaction ne prend jamais un verrou d'un rang
//     inférieur à celui qu'elle tient : aucun cycle, donc aucun interblocage — c'est l'argument, pas un test qui n'en a pas trouvé.
//   · UNE TRANSITION S'ÉCRIT SOUS LA CONDITION DE SON STATUT SOURCE, compte exigé (D305, D117) : l'activation sous `staff_layer_enabled_at IS NULL`, la connexion sous `status = 'ACTIVE'`, la fin d'une session sous
//     `ended_at IS NULL`, le remplacement du mot de passe sous le hachage LU. Un statut qui décide une transition se lit DANS la transaction, jamais avant.
//   · L'AUDIT N'A QU'UN SITE D'ÉCRITURE (`ecrireAudit`), à charge utile FERMÉE (`StaffAuditEntry`) : ni nom de compte, ni hachage, ni jeton, ni mot de passe, ni PIN, jamais (MP-33, MP-11).
//   · LA RÉSERVATION D'UNE TENTATIVE EST UNE INSTRUCTION (S-102, MP-16) : lire puis écrire laisserait N requêtes parallèles faire N vérifications d'un mot de passe (64 Mio chacune).
//   · RANG 58 (D356, L36-3b) — LE PIN : la réservation d'un essai de PIN est UNE instruction aussi (MP-1 : vingt essais parallèles, exactement trois comptés) et porte la condition de l'APPAREIL (MP-2) ; l'ouverture d'une
//     session par PIN est CONDITIONNÉE, dans le CAS du membre, au haché lu, au verrou nul, à l'échéance et à l'appareil re-vérifié sous verrou (R-3) ; le verrou se pose à l'ÉCHEC du troisième essai, sur CE PIN ; un PIN
//     se HACHE avant d'arriver ici (le magasin ne voit jamais un PIN en clair) et s'ÉMET sous le verrou du membre par la règle `etatDuPin` (UNE copie, R-4).
import { Injectable } from "@nestjs/common";
import { STAFF_LIMITS, StaffPinState, StaffSessionEndReason, type StaffRole, type StaffStatus } from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import { etatDuPin } from "./staff-account-state";
import { disableVerdict } from "./staff-members-policy";
import { SessionNotRefusedError, classifySessionRefusal, pickReusableDevice, type DeviceRow, type SessionProbe } from "./staff-session-policy";
import type {
  ActivateInput,
  ActivateResult,
  ChangePasswordInput,
  ChangePasswordResult,
  CloseSessionInput,
  CreateMemberInput,
  CreateMemberResult,
  DisableMemberInput,
  DisableMemberResult,
  KnownMember,
  ListKnownMembersInput,
  MemberListRow,
  OpenPinSessionInput,
  OpenPinSessionResult,
  OpenSessionInput,
  OpenSessionResult,
  PasswordReservation,
  PinReservation,
  PinReservationInput,
  RecordFailureInput,
  RecordPinFailureInput,
  RecordPinFailureResult,
  ResetMemberInput,
  ResetMemberResult,
  SessionTouchResult,
  StaffActor,
  StaffAuditEntry,
  StaffLayer,
  StaffMemberRow,
  StaffMemberView,
  StaffSessionView,
  StaffStore,
  TouchInput
} from "./staff-store.types";

/** Ce qu'une instruction `RETURNING` rend d'un membre : exactement `StaffMemberView`. */
interface LigneMembre {
  id: string;
  accountName: string;
  role: StaffRole;
  mustChangePassword: boolean;
}

interface LigneSession {
  sessionId: string;
  memberId: string;
  role: StaffRole;
  accountName: string;
  mustChangePassword: boolean;
  status: StaffStatus;
  passwordExpiresAt: Date;
  now: Date;
}

interface LigneSonde {
  sessionId: string;
  sameVenue: boolean;
  ended: boolean;
  memberActive: boolean;
  capped: boolean;
  idle: boolean;
}

/** Ce que l'écriture de l'audit exige d'un client Prisma ou d'une transaction : le délégué `auditLog`. */
interface EcrivainAudit {
  auditLog: { create(args: { data: Record<string, unknown> }): Promise<unknown> };
}

/**
 * ⛔ L'UNIQUE SITE D'ÉCRITURE DE L'AUDIT du module. Les sept clés — l'acteur (le compte commun ET le membre), l'action, l'entité, la charge utile — sont les seules qui existent ; `before` n'est jamais écrit.
 * Le membre acteur est une clé étrangère : la ligne ne s'écrit qu'après l'insertion du membre quand c'est l'activation qui le crée.
 */
async function ecrireAudit(client: EcrivainAudit, acteur: StaffActor, memberId: string, entree: StaffAuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: acteur.userId,
      actorRole: acteur.role,
      actorMemberId: memberId,
      action: entree.action,
      entityType: entree.entityType,
      entityId: entree.entityId,
      after: entree.after
    }
  });
}

/** Une transaction Prisma : ce que `$transaction` passe à son callback. */
type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

/** Ce que le CAS (ou le verrou) d'un membre rend de son PIN — la PRÉSENCE du haché, jamais sa valeur — et l'heure de la BASE : de quoi appliquer `etatDuPin`. */
interface LignePin {
  hasPin: boolean;
  pinExpiresAt: Date | null;
  pinLockedAt: Date | null;
  pinFailedCount: number;
  now: Date;
}

/**
 * ⛔ L'ÉMISSION D'UN PIN (rang 58, D356, R-4) — UNE règle, `etatDuPin`, appliquée SOUS LE VERROU du membre (sa ligne vient d'être verrouillée par le CAS ou par le `FOR UPDATE` de la même transaction) : si son PIN n'est
 * pas VALABLE (absent, expiré, verrouillé), le haché CANDIDAT est INSTALLÉ — génération, échéance (`PIN_VALIDITY_DAYS`), compteur à zéro, verrou levé — et, s'il était VERROUILLÉ, la ligne `staff.pin_unlock` s'écrit dans
 * la MÊME transaction (le déblocage par le mot de passe est une action de DR5). Rend `true` quand le candidat a été installé : c'est alors, et alors seulement, que le service montre le PIN en clair.
 * ⚠ Aucune ligne n'est écrite pour l'ÉMISSION elle-même (réponse de Ko, 1 d : aucune action au-delà de la liste de DR5).
 */
async function emettreLePin(tx: Tx, acteur: StaffActor, memberId: string, lignePin: LignePin, candidatHache: string): Promise<boolean> {
  const etat = etatDuPin(lignePin, lignePin.now);
  if (etat === StaffPinState.VALID) return false;
  const ecrit = await tx.$executeRaw`
    UPDATE pro_staff_members
       SET pin_hash = ${candidatHache}, pin_generated_at = now(), pin_expires_at = now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int),
           pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()
     WHERE id = ${memberId}::uuid`;
  if (ecrit !== 1) throw new Error("émission du PIN : le membre verrouillé n'a pas pu recevoir son PIN (compte = 1 exigé)");
  if (etat === StaffPinState.LOCKED) {
    await ecrireAudit(tx, acteur, memberId, { action: "staff.pin_unlock", entityType: "staff_member", entityId: memberId, after: { via: "password" } });
  }
  return true;
}

/** Lancée DANS la transaction d'ouverture par PIN pour l'ANNULER : l'appareil n'est plus vivant, et le CAS du membre (déjà écrit) ne doit pas survivre à ce refus — ni `last_login_at`, ni le compteur remis à zéro. */
class OuvertureParPinAbandonnee extends Error {
  constructor() {
    super("ouverture par PIN abandonnée : l'appareil n'est plus vivant");
  }
}

/** Lancée DANS la transaction d'activation pour l'ANNULER : le drapeau a déjà été posé une instruction plus tôt, et il ne doit pas survivre à un échec qui suit. */
class ActivationAbandonnee extends Error {
  constructor(readonly reason: "accountNameTaken") {
    super(`activation abandonnée : ${reason}`);
  }
}

@Injectable()
export class PrismaStaffStore implements StaffStore {
  constructor(private readonly prisma: PrismaService) {}

  // UNE lecture indexée (`user_id` est unique) : le profil du compte commun, sa salle et le drapeau. Pas de requête brute.
  async readLayer(userId: string): Promise<StaffLayer | null> {
    const profil = await this.prisma.proProfile.findUnique({ where: { userId }, select: { id: true, staffLayerEnabledAt: true } });
    return profil === null ? null : { proProfileId: profil.id, enabledAt: profil.staffLayerEnabledAt };
  }

  // ⛔ K-14 — UNE transaction : le profil et l'état de son e-mail se lisent DANS la transaction (D117) ; le drapeau se pose en check-and-set (L1, compte 1 exigé, D305) ; puis le Manager, l'appareil, la session et
  // l'audit. Si l'insertion du Manager ne rend rien (la clé de nom existe déjà), la transaction est ANNULÉE : le drapeau posé une instruction plus tôt ne reste pas posé sans Manager.
  async activate(input: ActivateInput): Promise<ActivateResult> {
    try {
      return await this.prisma.$transaction(async (tx): Promise<ActivateResult> => {
        const profil = await tx.proProfile.findUnique({ where: { userId: input.actor.userId }, select: { id: true, user: { select: { emailVerifiedAt: true } } } });
        if (profil === null) return { ok: false, reason: "profileMissing" };
        if (profil.user.emailVerifiedAt === null) return { ok: false, reason: "emailNotVerified" };

        const pose = await tx.$executeRaw`
          UPDATE pro_profiles SET staff_layer_enabled_at = now(), updated_at = now()
           WHERE id = ${profil.id}::uuid AND staff_layer_enabled_at IS NULL`;
        if (pose !== 1) return { ok: false, reason: "alreadyActivated" };

        const membres = await tx.$queryRaw<LigneMembre[]>`
          INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at, pin_hash, pin_generated_at, pin_expires_at)
          VALUES (${profil.id}::uuid, ${input.accountName}, ${input.accountNameKey}, 'MANAGER'::"StaffRole", ${input.passwordHash}, now(),
                  now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int),
                  ${input.pinHash}, now(), now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))
          ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING
          RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword"`;
        const membre = membres[0];
        if (membre === undefined) throw new ActivationAbandonnee("accountNameTaken");

        const appareils = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at)
          VALUES (${membre.id}::uuid, ${input.deviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))
          RETURNING id::text AS id`;
        const sessions = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at)
          VALUES (${membre.id}::uuid, ${appareils[0]!.id}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.SESSION_MAX_HOURS}::int))
          RETURNING id::text AS id`;

        await ecrireAudit(tx, input.actor, membre.id, { action: "staff.activate", entityType: "staff_member", entityId: membre.id, after: { role: "MANAGER" } });
        return { ok: true, member: membre, sessionId: sessions[0]!.id };
      });
    } catch (e) {
      if (e instanceof ActivationAbandonnee) return { ok: false, reason: e.reason };
      throw e;
    }
  }

  // S-241 : le membre ET l'échéance de son mot de passe ET `now()` de la BASE dans UNE instruction — `etatDuCompte` juge « peut-il se connecter » avec ces deux dates, jamais avec une horloge de l'API. Le hachage
  // n'est PAS lu ici : il n'est rendu que par la réservation.
  async findMember(proProfileId: string, accountNameKey: string): Promise<StaffMemberRow | null> {
    const lignes = await this.prisma.$queryRaw<StaffMemberRow[]>`
      SELECT id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
             password_expires_at AS "passwordExpiresAt", now() AS "now"
        FROM pro_staff_members
       WHERE pro_profile_id = ${proProfileId}::uuid AND account_name_key = ${accountNameKey}`;
    return lignes[0] ?? null;
  }

  // ⛔ S-102, MP-1, MP-16, MP-17 — LA RÉSERVATION, UNE INSTRUCTION. Le `FOR UPDATE` du CTE verrouille la ligne du membre (L2) : une requête concurrente ATTEND, puis réévalue les conditions sur la ligne à jour. Les
  // cinq premières réservent (le compteur monte jusqu'au seuil, qui pose la pause) ; les suivantes ne trouvent plus de ligne (la pause court) et rendent `reserved: false`. Le compteur REPART de zéro quand la pause
  // est échue (`THEN 0`). Une pause n'est jamais prolongée par les tentatives qu'elle refuse : la condition `password_locked_until <= now()` les écarte avant l'incrément.
  async reservePasswordAttempt(memberId: string): Promise<PasswordReservation> {
    const lignes = await this.prisma.$queryRaw<Array<{ passwordHash: string; failedCount: number; pausedNow: boolean }>>`
      WITH cur AS (
        SELECT id,
               CASE WHEN password_locked_until IS NOT NULL AND password_locked_until <= now() THEN 0 ELSE password_failed_count END AS base
          FROM pro_staff_members
         WHERE id = ${memberId}::uuid
           AND status = 'ACTIVE'
           AND (password_locked_until IS NULL OR password_locked_until <= now())
           FOR UPDATE
      )
      UPDATE pro_staff_members m
         SET password_failed_count = cur.base + 1,
             password_locked_until = CASE WHEN cur.base + 1 >= ${STAFF_LIMITS.PASSWORD_MAX_FAILURES}::int THEN now() + make_interval(mins => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int) ELSE NULL END,
             updated_at = now()
        FROM cur
       WHERE m.id = cur.id
      RETURNING m.password_hash AS "passwordHash", m.password_failed_count AS "failedCount", (m.password_locked_until IS NOT NULL) AS "pausedNow"`;
    const ligne = lignes[0];
    return ligne === undefined ? { reserved: false } : { reserved: true, passwordHash: ligne.passwordHash, failedCount: ligne.failedCount, pausedNow: ligne.pausedNow };
  }

  // L'échec est CONSIGNÉ après la réservation (qui a commité seule, pour que le comptage soit atomique) : la ligne du journal et, quand CET échec a déclenché la pause, la ligne de pause, ensemble. Limite écrite :
  // un arrêt entre la réservation et cette écriture perd une ligne de journal — le compteur, lui, est juste.
  async recordPasswordFailure(input: RecordFailureInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await ecrireAudit(tx, input.actor, input.memberId, { action: input.action, entityType: "staff_member", entityId: input.memberId, after: { failedCount: input.failedCount } });
      if (input.pausedNow) {
        await ecrireAudit(tx, input.actor, input.memberId, {
          action: "staff.password_pause",
          entityType: "staff_member",
          entityId: input.memberId,
          after: { pausedMinutes: STAFF_LIMITS.PASSWORD_PAUSE_MINUTES }
        });
      }
    });
  }

  async resetPasswordAttempts(memberId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE pro_staff_members SET password_failed_count = 0, password_locked_until = NULL, updated_at = now()
       WHERE id = ${memberId}::uuid`;
  }

  // ⛔ K-15 — connexion ‖ désactivation (§ 3.2 du cadrage) : le CAS du membre (`status = 'ACTIVE'`, sa salle, compte exigé) est la PREMIÈRE instruction (L2) ; il remet les compteurs à zéro (le mot de passe vient d'être
  // vérifié) et écrit `last_login_at`. Puis l'appareil (L3), la session (L4), l'audit. Un appareil n'est réutilisé que s'il est de CE membre, de CETTE salle, ni révoqué ni expiré (`pickReusableDevice`, MP-3).
  // ⛔ D355 (rang 57, R-1) — connexion ‖ RÉINITIALISATION : le MÊME CAS porte le hachage lu à la réservation (`password_hash = $expected`). Une réinitialisation (K-21) ou un changement (K-18) qui tombe entre la
  // réservation et cette instruction a remplacé le hachage : l'`UPDATE`, qui attend le verrou de la ligne puis ÉVALUE SON WHERE sur la version à jour, ne trouve plus rien — compte 0, aucune écriture, le même
  // refus qu'une désactivation. La condition est DANS la transaction, sur la ligne verrouillée (ordre des verrous L2, S-101) : un contrôle d'avant la transaction aurait lu l'ancien hachage. Elle vit ICI, à UN
  // endroit : le PIN (lot 3b) ouvrira ses sessions par cet appel et y ajoutera SA preuve.
  async openSession(input: OpenSessionInput): Promise<OpenSessionResult> {
    return this.prisma.$transaction(async (tx): Promise<OpenSessionResult> => {
      const membres = await tx.$queryRaw<Array<LigneMembre & LignePin>>`
        UPDATE pro_staff_members
           SET last_login_at = now(), password_failed_count = 0, password_locked_until = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'
           AND password_hash = ${input.expectedPasswordHash}
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword",
                  (pin_hash IS NOT NULL) AS "hasPin", pin_expires_at AS "pinExpiresAt", pin_locked_at AS "pinLockedAt", pin_failed_count AS "pinFailedCount", now() AS "now"`;
      const ligne = membres[0];
      if (ligne === undefined) return { ok: false, reason: "memberChanged" };
      const membre: StaffMemberView = { id: ligne.id, accountName: ligne.accountName, role: ligne.role, mustChangePassword: ligne.mustChangePassword };
      // ⛔ Le PIN s'ÉMET ICI, sous le verrou que le CAS vient de prendre, AVANT l'appareil : l'échéance de l'appareil se lit sur le PIN d'après l'émission.
      const pinIssued = await emettreLePin(tx, input.actor, membre.id, ligne, input.newPinHash);

      const candidats =
        input.candidateDeviceHashes.length === 0
          ? []
          : await tx.$queryRaw<DeviceRow[]>`
              SELECT d.id::text AS id, d.member_id::text AS "memberId", m.pro_profile_id::text AS "proProfileId",
                     (d.revoked_at IS NOT NULL) AS revoked, (d.expires_at <= now()) AS expired
                FROM pro_staff_devices d JOIN pro_staff_members m ON m.id = d.member_id
               WHERE d.token_hash = ANY(${[...input.candidateDeviceHashes]}::text[])`;
      const reutilisable = pickReusableDevice(candidats, membre.id, input.proProfileId);

      let appareilId: string;
      if (reutilisable !== null) {
        await tx.$executeRaw`UPDATE pro_staff_devices SET last_used_at = now() WHERE id = ${reutilisable.id}::uuid`;
        appareilId = reutilisable.id;
      } else {
        const crees = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at)
          VALUES (${membre.id}::uuid, ${input.newDeviceTokenHash}, ${input.deviceLabel},
                  LEAST(now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int), (SELECT pin_expires_at FROM pro_staff_members WHERE id = ${membre.id}::uuid)))
          RETURNING id::text AS id`;
        appareilId = crees[0]!.id;
      }

      const sessions = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at)
        VALUES (${membre.id}::uuid, ${appareilId}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.SESSION_MAX_HOURS}::int))
        RETURNING id::text AS id`;
      const sessionId = sessions[0]!.id;
      const deviceReused = reutilisable !== null;

      await ecrireAudit(tx, input.actor, membre.id, { action: "staff.login", entityType: "staff_session", entityId: sessionId, after: { memberId: membre.id, deviceReused } });
      return { ok: true, member: membre, sessionId, deviceReused, pinIssued };
    });
  }

  // ══ RANG 58, L36-3b (D356) — K-23 : la connexion par PIN ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // K-23 — le membre de CETTE salle par son identifiant : aucun secret (ni haché de mot de passe, ni haché de PIN), l'heure de la BASE dans la même instruction (S-241).
  async findMemberById(proProfileId: string, memberId: string): Promise<StaffMemberRow | null> {
    const lignes = await this.prisma.$queryRaw<StaffMemberRow[]>`
      SELECT id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
             password_expires_at AS "passwordExpiresAt", now() AS "now"
        FROM pro_staff_members
       WHERE id = ${memberId}::uuid AND pro_profile_id = ${proProfileId}::uuid`;
    return lignes[0] ?? null;
  }

  // ⛔ MP-1, MP-2 — LA RÉSERVATION D'UN ESSAI DE PIN, UNE INSTRUCTION. Le `FOR UPDATE OF m` du CTE verrouille la ligne du membre (L2) : une requête concurrente ATTEND, puis réévalue les conditions sur la ligne à jour.
  // Les trois premières réservent (le compteur monte jusqu'au plafond, un paramètre du levier) ; les suivantes ne trouvent plus de ligne et rendent `reserved: false` — vingt requêtes parallèles ne font pas vingt
  // vérifications. TOUTES les conditions sont ICI : le membre de CETTE salle, actif, un PIN non expiré (heure de la base), non verrouillé, sous le plafond, ET un appareil de ce membre présenté, ni révoqué ni
  // expiré — un PIN sans appareil ne consomme AUCUN essai (MP-2 : sinon un porteur du seul Bearer verrouillerait un membre). Le verrou `pin_locked_at` n'est PAS posé ici : il se pose à l'ÉCHEC du troisième essai
  // (`recordPinFailure`), pour qu'un PIN juste au troisième essai soit accepté.
  async reservePinAttempt(input: PinReservationInput): Promise<PinReservation> {
    const lignes = await this.prisma.$queryRaw<Array<{ pinHash: string; failedCount: number }>>`
      WITH cur AS (
        SELECT m.id FROM pro_staff_members m
         WHERE m.id = ${input.memberId}::uuid AND m.pro_profile_id = ${input.proProfileId}::uuid
           AND m.status = 'ACTIVE'
           AND m.pin_hash IS NOT NULL AND m.pin_expires_at > now()
           AND m.pin_locked_at IS NULL AND m.pin_failed_count < ${STAFF_LIMITS.PIN_MAX_FAILURES}::int
           AND EXISTS (SELECT 1 FROM pro_staff_devices d WHERE d.member_id = m.id AND d.token_hash = ANY(${[...input.deviceTokenHashes]}::text[]) AND d.revoked_at IS NULL AND d.expires_at > now())
           FOR UPDATE OF m
      )
      UPDATE pro_staff_members m SET pin_failed_count = m.pin_failed_count + 1, updated_at = now()
        FROM cur WHERE m.id = cur.id
      RETURNING m.pin_hash AS "pinHash", m.pin_failed_count AS "failedCount"`;
    const ligne = lignes[0];
    return ligne === undefined ? { reserved: false } : { reserved: true, pinHash: ligne.pinHash, failedCount: ligne.failedCount };
  }

  // ⛔ MP-15, MP-33 — UN PIN FAUX : UNE transaction. La ligne d'échec s'écrit toujours (le compte de la réservation, jamais le PIN). Au TROISIÈME échec (le compte de CET essai au plafond) le VERROU se pose SOUS
  // CONDITION — sur CE PIN (le haché lu : un PIN neuf posé entre-temps par un déblocage n'est pas verrouillé), pas déjà verrouillé, le compte encore au plafond —, puis les sessions du membre prennent fin `PIN_LOCKED`
  // (L4, après le membre L2), puis la ligne de verrouillage. Un verrou posé par un autre (compte 0) n'écrit ni fin de session ni ligne de plus. Une ligne en échec annule TOUT : pas de verrou sans sa trace.
  async recordPinFailure(input: RecordPinFailureInput): Promise<RecordPinFailureResult> {
    return this.prisma.$transaction(async (tx): Promise<RecordPinFailureResult> => {
      await ecrireAudit(tx, input.actor, input.memberId, { action: "staff.pin_login_failed", entityType: "staff_member", entityId: input.memberId, after: { failedCount: input.failedCount } });
      if (input.failedCount < STAFF_LIMITS.PIN_MAX_FAILURES) return { locked: false, sessionsEnded: 0 };
      const verrouille = await tx.$executeRaw`
        UPDATE pro_staff_members SET pin_locked_at = now(), updated_at = now()
         WHERE id = ${input.memberId}::uuid AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_failed_count >= ${STAFF_LIMITS.PIN_MAX_FAILURES}::int`;
      if (verrouille !== 1) return { locked: false, sessionsEnded: 0 };
      const fins = await tx.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'PIN_LOCKED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`;
      await ecrireAudit(tx, input.actor, input.memberId, {
        action: "staff.pin_lock",
        entityType: "staff_member",
        entityId: input.memberId,
        after: { failedCount: input.failedCount, sessionsEnded: fins }
      });
      return { locked: true, sessionsEnded: fins };
    });
  }

  // ⛔ R-3 — L'OUVERTURE PAR PIN, CONDITIONNÉE (patron de D355). Le CAS du membre (L2) est la PREMIÈRE instruction et porte : sa salle, `status = 'ACTIVE'`, le haché de PIN LU à la réservation, `pin_locked_at` nul, le PIN non
  // expiré (heure de la base) — il remet le compteur à zéro et écrit `last_login_at`, sans toucher une colonne du mot de passe. Puis l'APPAREIL (L3) se RE-VÉRIFIE sous verrou (`FOR UPDATE` : ce membre, un cookie présenté,
  // ni révoqué ni expiré) : s'il n'est plus vivant la transaction est ANNULÉE ENTIÈRE (le CAS déjà écrit aussi). Puis la session (L4) et la ligne `staff.pin_login`. Ce qui tombe entre la vérification et ici — une
  // réinitialisation, une désactivation, un déblocage, un verrou, une révocation — fait REFUSER l'ouverture.
  async openSessionByPin(input: OpenPinSessionInput): Promise<OpenPinSessionResult> {
    try {
      return await this.prisma.$transaction(async (tx): Promise<OpenPinSessionResult> => {
        const membres = await tx.$queryRaw<LigneMembre[]>`
          UPDATE pro_staff_members
             SET last_login_at = now(), pin_failed_count = 0, updated_at = now()
           WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'
             AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_expires_at > now()
          RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword"`;
        const membre = membres[0];
        if (membre === undefined) return { ok: false, reason: "memberChanged" };

        const appareils = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT d.id::text AS id FROM pro_staff_devices d
           WHERE d.member_id = ${membre.id}::uuid AND d.token_hash = ANY(${[...input.candidateDeviceHashes]}::text[]) AND d.revoked_at IS NULL AND d.expires_at > now()
           ORDER BY d.created_at LIMIT 1 FOR UPDATE`;
        const appareil = appareils[0];
        if (appareil === undefined) throw new OuvertureParPinAbandonnee();
        await tx.$executeRaw`UPDATE pro_staff_devices SET last_used_at = now() WHERE id = ${appareil.id}::uuid`;

        const sessions = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at)
          VALUES (${membre.id}::uuid, ${appareil.id}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.SESSION_MAX_HOURS}::int))
          RETURNING id::text AS id`;
        const sessionId = sessions[0]!.id;

        await ecrireAudit(tx, input.actor, membre.id, { action: "staff.pin_login", entityType: "staff_session", entityId: sessionId, after: { memberId: membre.id } });
        return { ok: true, member: membre, sessionId };
      });
    } catch (e) {
      if (e instanceof OuvertureParPinAbandonnee) return { ok: false, reason: "memberChanged" };
      throw e;
    }
  }

  // ⛔ LE GARDE (MP-13, MP-18, MP-4) — UN `UPDATE … RETURNING` qui joint le membre SANS le verrouiller (jamais L2 : le garde ne prend que L4). Les prédicats : le jeton, la MÊME salle que le Bearer, le membre ACTIF,
  // la session non terminée, le plafond non atteint, l'inactivité non dépassée — la durée est un PARAMÈTRE, l'heure est celle de la base. Zéro ligne : une SONDE lit pourquoi, la politique pure classe, et seule une
  // cause qui s'écrit écrit (IDLE, DISABLED) ; la session d'une autre salle ne s'écrit JAMAIS.
  async touchSession(input: TouchInput): Promise<SessionTouchResult> {
    const lignes = await this.prisma.$queryRaw<LigneSession[]>`
      UPDATE pro_staff_sessions s SET last_activity_at = now()
        FROM pro_staff_members m
       WHERE s.token_hash = ${input.tokenHash}
         AND m.id = s.member_id
         AND m.pro_profile_id = ${input.proProfileId}::uuid
         AND m.status = 'ACTIVE'
         AND s.ended_at IS NULL
         AND s.expires_at > now()
         AND s.last_activity_at > now() - make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)
      RETURNING s.id::text AS "sessionId", m.id::text AS "memberId", m.role::text AS role, m.account_name AS "accountName", m.must_change_password AS "mustChangePassword",
                m.status::text AS status, m.password_expires_at AS "passwordExpiresAt", now() AS "now"`;
    const vivante = lignes[0];
    if (vivante !== undefined) return { ok: true, session: vivante satisfies StaffSessionView };

    const sonde = await this.prisma.$queryRaw<LigneSonde[]>`
      SELECT s.id::text AS "sessionId",
             (m.pro_profile_id = ${input.proProfileId}::uuid) AS "sameVenue",
             (s.ended_at IS NOT NULL) AS "ended",
             (m.status = 'ACTIVE') AS "memberActive",
             (s.expires_at <= now()) AS "capped",
             (s.last_activity_at <= now() - make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)) AS "idle"
        FROM pro_staff_sessions s JOIN pro_staff_members m ON m.id = s.member_id
       WHERE s.token_hash = ${input.tokenHash}`;
    const ligne = sonde[0];
    if (ligne === undefined) return { ok: false };
    const probe: SessionProbe = { found: true, sameVenue: ligne.sameVenue, ended: ligne.ended, memberActive: ligne.memberActive, capped: ligne.capped, idle: ligne.idle };
    let fin: StaffSessionEndReason | null;
    try {
      fin = classifySessionRefusal(probe).endWith;
    } catch (e) {
      if (e instanceof SessionNotRefusedError) return { ok: false }; // la session est redevenue vivante entre les deux lectures : rien à écrire, la requête suivante la verra
      throw e;
    }
    if (fin !== null) {
      await this.prisma.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = ${fin}::"StaffSessionEndReason" WHERE id = ${ligne.sessionId}::uuid AND ended_at IS NULL`;
    }
    return { ok: false };
  }

  // K-17 — la LECTURE SEULE de l'état : les MÊMES prédicats que le garde, en `SELECT`. Elle ne prolonge rien et n'écrit rien (une lecture d'état toutes les secondes garderait sinon une session éternellement ouverte).
  async peekSession(input: TouchInput): Promise<SessionTouchResult> {
    const lignes = await this.prisma.$queryRaw<LigneSession[]>`
      SELECT s.id::text AS "sessionId", m.id::text AS "memberId", m.role::text AS role, m.account_name AS "accountName", m.must_change_password AS "mustChangePassword",
             m.status::text AS status, m.password_expires_at AS "passwordExpiresAt", now() AS "now"
        FROM pro_staff_sessions s JOIN pro_staff_members m ON m.id = s.member_id
       WHERE s.token_hash = ${input.tokenHash}
         AND m.pro_profile_id = ${input.proProfileId}::uuid
         AND m.status = 'ACTIVE'
         AND s.ended_at IS NULL
         AND s.expires_at > now()
         AND s.last_activity_at > now() - make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)`;
    const vivante = lignes[0];
    return vivante === undefined ? { ok: false } : { ok: true, session: vivante };
  }

  // K-16 — la fin LOGOUT, sous `ended_at IS NULL` ; l'audit n'est écrit que si la session s'est VRAIMENT terminée (compte 1) : deux déconnexions ne font pas deux lignes.
  async closeSession(input: CloseSessionInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const fermees = await tx.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'LOGOUT' WHERE id = ${input.sessionId}::uuid AND ended_at IS NULL`;
      if (fermees === 1) {
        await ecrireAudit(tx, input.actor, input.memberId, { action: "staff.logout", entityType: "staff_session", entityId: input.sessionId, after: { memberId: input.memberId } });
      }
    });
  }

  // ⛔ K-18 — le membre d'abord (L2, verrou), le remplacement CONDITIONNÉ au hachage LU (deux remplacements simultanés ne réussissent pas tous deux : le second ne trouve plus le hachage), puis la fin des AUTRES
  // sessions du membre (L4) — la courante RESTE —, puis l'audit. Le hachage est remplacé en une instruction qui remet aussi les compteurs à zéro et les dates à neuf.
  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    return this.prisma.$transaction(async (tx): Promise<ChangePasswordResult> => {
      const verrou = await tx.$queryRaw<LignePin[]>`
        SELECT (pin_hash IS NOT NULL) AS "hasPin", pin_expires_at AS "pinExpiresAt", pin_locked_at AS "pinLockedAt", pin_failed_count AS "pinFailedCount", now() AS "now"
          FROM pro_staff_members WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE' FOR UPDATE`;
      if (verrou.length !== 1) return { ok: false, reason: "changedConcurrently" };

      const membres = await tx.$queryRaw<LigneMembre[]>`
        UPDATE pro_staff_members
           SET password_hash = ${input.newPasswordHash}, password_changed_at = now(), password_expires_at = now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int),
               must_change_password = false, password_failed_count = 0, password_locked_until = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND password_hash = ${input.expectedPasswordHash} AND status = 'ACTIVE'
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword"`;
      const membre = membres[0];
      if (membre === undefined) return { ok: false, reason: "changedConcurrently" };

      // Rang 58 : la MÊME règle d'émission que la connexion, sous le verrou pris plus haut.
      const pinIssued = await emettreLePin(tx, input.actor, input.memberId, verrou[0]!, input.newPinHash);

      const autres = await tx.$executeRaw`
        UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'PASSWORD_CHANGED'
         WHERE member_id = ${input.memberId}::uuid AND id <> ${input.currentSessionId}::uuid AND ended_at IS NULL`;

      await ecrireAudit(tx, input.actor, input.memberId, { action: "staff.password_change", entityType: "staff_member", entityId: input.memberId, after: { otherSessionsEnded: autres } });
      return { ok: true, member: membre satisfies StaffMemberView, otherSessionsEnded: autres, pinIssued };
    });
  }

  // Les membres RECONNUS sur ce poste : ceux dont un cookie d'appareil (haché) désigne un appareil ni révoqué ni expiré, dans CETTE salle, membre actif. Sans cookie, aucune requête.
  async listKnownMembers(input: ListKnownMembersInput): Promise<KnownMember[]> {
    if (input.deviceTokenHashes.length === 0) return [];
    return this.prisma.$queryRaw<KnownMember[]>`
      SELECT DISTINCT m.id::text AS id, m.account_name AS "accountName", m.role::text AS role
        FROM pro_staff_devices d JOIN pro_staff_members m ON m.id = d.member_id
       WHERE d.token_hash = ANY(${[...input.deviceTokenHashes]}::text[])
         AND d.revoked_at IS NULL
         AND d.expires_at > now()
         AND m.pro_profile_id = ${input.proProfileId}::uuid
         AND m.status = 'ACTIVE'
       ORDER BY m.account_name`;
  }

  // ══ RANG 56, L36-3a-2 (D354) — K-19 à K-22 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ⛔ UNE transaction par action de gestion : l'action ET sa ligne d'audit s'écrivent ensemble ou pas du tout (R-6, patron de D349) — l'audit passe par `ecrireAudit`, le seul site d'écriture, et un échec de
  // l'audit ANNULE l'action. L'ordre des verrous est celui du cadrage § 3.1 : L1 (le profil) < L2 (les membres) < L3 (les appareils) < L4 (les sessions) ; aucune de ces méthodes ne prend un verrou d'un rang
  // inférieur à celui qu'elle tient — c'est l'argument de l'absence d'interblocage. Aucun hachage, compteur, verrou ni PIN n'est lu par la liste ; aucun `new Date` : l'heure est celle de la base.

  // K-19 — les membres de la salle : UNE lecture, filtrée par la salle du Bearer, dans l'ordre de leur création. Aucun secret n'est sélectionné : un `SELECT` qui ne les lit pas ne peut pas les rendre.
  async listMembers(proProfileId: string): Promise<MemberListRow[]> {
    return this.prisma.$queryRaw<MemberListRow[]>`
      SELECT id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
             password_expires_at AS "passwordExpiresAt", last_login_at AS "lastLoginAt", created_at AS "createdAt", now() AS "now"
        FROM pro_staff_members
       WHERE pro_profile_id = ${proProfileId}::uuid
       ORDER BY created_at, id`;
  }

  // K-20 — l'insertion est ATOMIQUE (`ON CONFLICT … DO NOTHING`, jamais « lire puis insérer » : deux créations simultanées du même nom ne passent pas toutes deux) ; le temporaire de SEPT jours est un PARAMÈTRE du
  // levier, `must_change_password` vaut « temporaire » (S-241), le créateur est le Manager. Aucune ligne rendue ⇒ le nom est pris : ni membre ni audit.
  async createMember(input: CreateMemberInput): Promise<CreateMemberResult> {
    return this.prisma.$transaction(async (tx): Promise<CreateMemberResult> => {
      const lignes = await tx.$queryRaw<MemberListRow[]>`
        INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at, must_change_password, created_by_member_id)
        VALUES (${input.proProfileId}::uuid, ${input.accountName}, ${input.accountNameKey}, ${input.role}::"StaffRole", ${input.passwordHash}, now(),
                now() + make_interval(days => ${STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS}::int), true, ${input.actorMemberId}::uuid)
        ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
                  password_expires_at AS "passwordExpiresAt", last_login_at AS "lastLoginAt", created_at AS "createdAt", now() AS "now"`;
      const membre = lignes[0];
      if (membre === undefined) return { ok: false, reason: "accountNameTaken" };
      await ecrireAudit(tx, input.actor, input.actorMemberId, { action: "staff.member_create", entityType: "staff_member", entityId: membre.id, after: { role: input.role } });
      return { ok: true, member: membre };
    });
  }

  // K-21 — le membre d'abord (L2, `FOR UPDATE`, dans SA salle : celui d'une autre salle est introuvable), puis son mot de passe remplacé (un temporaire de sept jours, les compteurs et la pause remis à zéro), puis TOUS
  // ses appareils révoqués (L3) et TOUTES ses sessions terminées `PASSWORD_CHANGED` (L4 — l'énumération ratifiée n'a pas de valeur « RESET », DR8), puis l'audit. ⛔ Rang 58 (D356, S-105, DR5) : le PIN est EFFACÉ avec le
  // reste, dans la MÊME instruction (les cinq colonnes `pin_*` — `pin_triple_coherent` : toutes nulles). Compte = 1 exigé : le membre est verrouillé et actif, l'UPDATE ne peut pas ne rien trouver — s'il ne trouve rien, on ANNULE bruyamment.
  async resetMemberPassword(input: ResetMemberInput): Promise<ResetMemberResult> {
    return this.prisma.$transaction(async (tx): Promise<ResetMemberResult> => {
      const verrou = await tx.$queryRaw<Array<{ id: string; status: StaffStatus }>>`
        SELECT id::text AS id, status::text AS status FROM pro_staff_members
         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid
         FOR UPDATE`;
      const cible = verrou[0];
      if (cible === undefined) return { ok: false, reason: "notFound" };
      if (cible.status !== "ACTIVE") return { ok: false, reason: "disabled" };

      const membres = await tx.$queryRaw<MemberListRow[]>`
        UPDATE pro_staff_members
           SET password_hash = ${input.passwordHash}, password_changed_at = now(), password_expires_at = now() + make_interval(days => ${STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS}::int),
               must_change_password = true, password_failed_count = 0, password_locked_until = NULL,
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
                  password_expires_at AS "passwordExpiresAt", last_login_at AS "lastLoginAt", created_at AS "createdAt", now() AS "now"`;
      const membre = membres[0];
      if (membre === undefined) throw new Error("réinitialisation : le membre verrouillé et actif n'a pas pu être mis à jour (compte = 1 exigé)");

      const appareils = await tx.$executeRaw`UPDATE pro_staff_devices SET revoked_at = now() WHERE member_id = ${input.memberId}::uuid AND revoked_at IS NULL`;
      const sessions = await tx.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'PASSWORD_CHANGED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`;

      await ecrireAudit(tx, input.actor, input.actorMemberId, {
        action: "staff.member_reset_password",
        entityType: "staff_member",
        entityId: membre.id,
        after: { sessionsEnded: sessions, devicesRevoked: appareils }
      });
      return { ok: true, member: membre, sessionsEnded: sessions, devicesRevoked: appareils };
    });
  }

  // K-22 — « JAMAIS ZÉRO MANAGER » (R-4, MP-6, MP-31). Le profil d'abord (L1, `FOR UPDATE`) : c'est là que deux désactivations simultanées se SÉRIALISENT — la seconde attend, puis voit un seul Manager actif et refuse.
  // Le membre ensuite (L2, `FOR UPDATE`, dans SA salle), puis le COMPTAGE des Managers actifs — SOUS le verrou de L1, APRÈS lui, jamais avant (un comptage fait avant laisserait deux requêtes voir deux Managers et
  // les désactiver tous deux) —, puis la DÉCISION (module pur), puis le CAS du statut (`status = 'ACTIVE'`, compte = 1 exigé : D305) et la fin des sessions (L4, `DISABLED`), puis l'audit. Une répétition (déjà
  // désactivé) n'écrit rien : ni UPDATE, ni audit.
  async disableMember(input: DisableMemberInput): Promise<DisableMemberResult> {
    return this.prisma.$transaction(async (tx): Promise<DisableMemberResult> => {
      await tx.$queryRaw`SELECT id::text AS id FROM pro_profiles WHERE id = ${input.proProfileId}::uuid FOR UPDATE`;
      const cibles = await tx.$queryRaw<MemberListRow[]>`
        SELECT id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
               password_expires_at AS "passwordExpiresAt", last_login_at AS "lastLoginAt", created_at AS "createdAt", now() AS "now"
          FROM pro_staff_members
         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid
         FOR UPDATE`;
      const cible = cibles[0];
      if (cible === undefined) return { ok: false, reason: "notFound" };

      const compte = await tx.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM pro_staff_members WHERE pro_profile_id = ${input.proProfileId}::uuid AND role = 'MANAGER' AND status = 'ACTIVE'`;
      const verdict = disableVerdict({ targetRole: cible.role, targetStatus: cible.status, activeManagers: compte[0]?.n ?? 0 });
      if (verdict === "lastManager") return { ok: false, reason: "lastManager" };
      if (verdict === "alreadyDisabled") return { ok: true, member: cible, sessionsEnded: 0, alreadyDisabled: true };

      const membres = await tx.$queryRaw<MemberListRow[]>`
        UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now(),
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, status::text AS status, must_change_password AS "mustChangePassword",
                  password_expires_at AS "passwordExpiresAt", last_login_at AS "lastLoginAt", created_at AS "createdAt", now() AS "now"`;
      const membre = membres[0];
      if (membre === undefined) throw new Error("désactivation : le membre verrouillé et actif n'a pas pu être désactivé (compte = 1 exigé)");

      const sessions = await tx.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'DISABLED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`;

      await ecrireAudit(tx, input.actor, input.actorMemberId, { action: "staff.member_disable", entityType: "staff_member", entityId: membre.id, after: { role: membre.role, sessionsEnded: sessions } });
      return { ok: true, member: membre, sessionsEnded: sessions, alreadyDisabled: false };
    });
  }
}
