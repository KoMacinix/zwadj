// ⛔ L'ADAPTATEUR PRISMA DE LA COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341). Voir `staff-store.types.ts` pour le contrat du port. CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise.
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
import { Injectable } from "@nestjs/common";
import { STAFF_LIMITS, StaffSessionEndReason, type StaffRole } from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import { SessionNotRefusedError, classifySessionRefusal, pickReusableDevice, type DeviceRow, type SessionProbe } from "./staff-session-policy";
import type {
  ActivateInput,
  ActivateResult,
  ChangePasswordInput,
  ChangePasswordResult,
  CloseSessionInput,
  KnownMember,
  ListKnownMembersInput,
  OpenSessionInput,
  OpenSessionResult,
  PasswordReservation,
  RecordFailureInput,
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
          INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at)
          VALUES (${profil.id}::uuid, ${input.accountName}, ${input.accountNameKey}, 'MANAGER'::"StaffRole", ${input.passwordHash}, now(),
                  now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int))
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

  async findMember(proProfileId: string, accountNameKey: string): Promise<StaffMemberRow | null> {
    return this.prisma.proStaffMember.findFirst({
      where: { proProfileId, accountNameKey },
      select: { id: true, accountName: true, role: true, status: true, mustChangePassword: true }
    });
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
  async openSession(input: OpenSessionInput): Promise<OpenSessionResult> {
    return this.prisma.$transaction(async (tx): Promise<OpenSessionResult> => {
      const membres = await tx.$queryRaw<LigneMembre[]>`
        UPDATE pro_staff_members
           SET last_login_at = now(), password_failed_count = 0, password_locked_until = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword"`;
      const membre = membres[0];
      if (membre === undefined) return { ok: false, reason: "memberInactive" };

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
          VALUES (${membre.id}::uuid, ${input.newDeviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))
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
      return { ok: true, member: membre, sessionId, deviceReused };
    });
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
      RETURNING s.id::text AS "sessionId", m.id::text AS "memberId", m.role::text AS role, m.account_name AS "accountName", m.must_change_password AS "mustChangePassword"`;
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
      SELECT s.id::text AS "sessionId", m.id::text AS "memberId", m.role::text AS role, m.account_name AS "accountName", m.must_change_password AS "mustChangePassword"
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
      const verrou = await tx.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_members WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE' FOR UPDATE`;
      if (verrou.length !== 1) return { ok: false, reason: "changedConcurrently" };

      const membres = await tx.$queryRaw<LigneMembre[]>`
        UPDATE pro_staff_members
           SET password_hash = ${input.newPasswordHash}, password_changed_at = now(), password_expires_at = now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int),
               must_change_password = false, password_failed_count = 0, password_locked_until = NULL, updated_at = now()
         WHERE id = ${input.memberId}::uuid AND password_hash = ${input.expectedPasswordHash} AND status = 'ACTIVE'
        RETURNING id::text AS id, account_name AS "accountName", role::text AS role, must_change_password AS "mustChangePassword"`;
      const membre = membres[0];
      if (membre === undefined) return { ok: false, reason: "changedConcurrently" };

      const autres = await tx.$executeRaw`
        UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'PASSWORD_CHANGED'
         WHERE member_id = ${input.memberId}::uuid AND id <> ${input.currentSessionId}::uuid AND ended_at IS NULL`;

      await ecrireAudit(tx, input.actor, input.memberId, { action: "staff.password_change", entityType: "staff_member", entityId: input.memberId, after: { otherSessionsEnded: autres } });
      return { ok: true, member: membre satisfies StaffMemberView, otherSessionsEnded: autres };
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
}
