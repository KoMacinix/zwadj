// Le SERVICE de la couche du personnel — rang 44, L36-3a-1 (D341). CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise. Il ORCHESTRE : il lit, il appelle le magasin, il hache, il traduit les refus en erreurs
// métier. Ce qu'il DÉCIDE vit dans des modules purs (`staff-session-policy.ts`, `staff-password-policy.ts`) et dans SQL (`staff-store.prisma.ts`) — jamais ici.
//
// ⛔ CE QUE CE FICHIER TIENT :
//   · UN REFUS, UN CORPS (R-3 (D341), MP-8) : compte inconnu, membre désactivé, pause et mauvais mot de passe rendent le MÊME 401 `STAFF_INVALID_CREDENTIALS`, et paient UN argon2 chacun. Le VRAI hachage n'est
//     vérifié que si la tentative a été RÉSERVÉE par le magasin (S-102) : vingt requêtes parallèles ne font pas vingt vérifications du vrai hachage (MP-17).
//   · UN MOT DE PASSE COURANT SE REFUSE AVANT TOUT COÛT (MP-24) : avant le hachage, avant la réservation — un refus qui ne dit rien de l'actuel ne consomme pas d'essai.
//   · LES JETONS NE VOYAGENT QU'HACHÉS : le magasin ne reçoit jamais la valeur d'un cookie (MP-11).
//   · AUCUNE HORLOGE (MP-41), AUCUN JOURNAL (MP-11) : le temps se décide dans la base, et un module qui n'écrit rien dans le journal ne peut y écrire aucun secret.
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  AuthErrorCode,
  STAFF_DEVICE_DEFAULT_LABEL,
  STAFF_ERROR_MESSAGE_KEYS,
  StaffErrorCode,
  normalizeStaffAccountName,
  type StaffActivateInput,
  type StaffActivationDTO,
  type StaffLoginDTO,
  type StaffLoginInput,
  type StaffLogoutDTO,
  type StaffPasswordChangeDTO,
  type StaffPasswordChangeInput,
  type StaffSessionStateDTO
} from "@zwadj/types";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import type { CookieAppareil } from "./staff-cookies";
import type { StaffContext } from "./staff-decorators";
import { isCommonPassword, passwordViolation, type PasswordViolation } from "./staff-password-policy";
import { loginVerification } from "./staff-session-policy";
import { STAFF_STORE, type ActivateResult, type StaffActor, type StaffStore } from "./staff-store.types";

/** Les cookies PRÉSENTÉS par la requête, déjà filtrés par `staff-cookies.ts` (forme du jeton, au plus huit appareils). */
export interface StaffCookiesIn {
  session: string | undefined;
  devices: readonly CookieAppareil[];
}

/** Les cookies à POSER dans la réponse : une valeur = poser ; `null` = effacer ; absent = ne pas toucher. Le contrôleur les pose avec les attributs de `staff-cookies.ts`. */
export interface StaffCookiesOut {
  session?: string | null;
  device?: { suffix: string; token: string };
}

export interface StaffReply<T> {
  body: T;
  cookies: StaffCookiesOut;
}

/** Le corps d'une erreur métier : le code ET la clé de message localisable (le catalogue FR = AR, MP-39). */
const erreurDe = (code: StaffErrorCode): { code: StaffErrorCode; message: string } => ({ code, message: STAFF_ERROR_MESSAGE_KEYS[code] });

const identifiantsRefuses = (): UnauthorizedException => new UnauthorizedException(erreurDe(StaffErrorCode.STAFF_INVALID_CREDENTIALS));
const motDePasseActuelRefuse = (): BadRequestException => new BadRequestException(erreurDe(StaffErrorCode.STAFF_CURRENT_PASSWORD_INVALID));
const violationDeMotDePasse = (v: PasswordViolation): BadRequestException =>
  new BadRequestException(erreurDe(v === "common" ? StaffErrorCode.STAFF_PASSWORD_COMMON : StaffErrorCode.STAFF_PASSWORD_REUSED));

/** Les quatre refus de l'activation que le magasin rend, traduits en erreurs MÉTIER (une violation de contrainte ne sort jamais en 500). */
function refusDActivation(raison: Extract<ActivateResult, { ok: false }>["reason"]): Error {
  switch (raison) {
    case "alreadyActivated":
      return new ConflictException(erreurDe(StaffErrorCode.STAFF_ALREADY_ACTIVATED));
    case "emailNotVerified":
      return new ForbiddenException(erreurDe(StaffErrorCode.STAFF_EMAIL_NOT_VERIFIED));
    case "accountNameTaken":
      return new ConflictException(erreurDe(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN));
    case "profileMissing":
      // Un PRO sans profil est une donnée incohérente : la même réponse que le reste de l'API rend à un rôle refusé.
      return new ForbiddenException({ code: AuthErrorCode.FORBIDDEN, message: "auth.errors.forbidden" });
  }
}

@Injectable()
export class StaffSessionService {
  constructor(
    @Inject(STAFF_STORE) private readonly store: StaffStore,
    @Inject(PasswordService) private readonly passwords: Pick<PasswordService, "hash" | "verify" | "verifyAgainstDummy">,
    @Inject(TokenService) private readonly tokens: Pick<TokenService, "generate" | "hash">
  ) {}

  // ⛔ K-14 — le propriétaire crée le Manager. Le mot de passe courant se refuse AVANT le hachage (qui coûte 64 Mio) et avant toute lecture ; le magasin fait le reste dans UNE transaction (MP-40).
  async activate(user: StaffActor, input: StaffActivateInput): Promise<StaffReply<StaffActivationDTO>> {
    const violation = passwordViolation({ common: isCommonPassword(input.password), sameAsCurrent: false });
    if (violation !== null) throw violationDeMotDePasse(violation);

    const passwordHash = await this.passwords.hash(input.password);
    const sessionToken = this.tokens.generate();
    const deviceToken = this.tokens.generate();
    const suffix = this.tokens.generate().slice(0, 8);

    const result = await this.store.activate({
      actor: user,
      accountName: input.accountName,
      accountNameKey: normalizeStaffAccountName(input.accountName),
      passwordHash,
      sessionTokenHash: this.tokens.hash(sessionToken),
      deviceTokenHash: this.tokens.hash(deviceToken),
      deviceLabel: STAFF_DEVICE_DEFAULT_LABEL
    });
    if (!result.ok) throw refusDActivation(result.reason);
    return { body: { member: result.member }, cookies: { session: sessionToken, device: { suffix, token: deviceToken } } };
  }

  // ⛔ K-15 — la connexion. L'ORDRE EST LA RÈGLE : chercher le membre, RÉSERVER la tentative, ENSUITE seulement vérifier (le vrai hachage si réservée, le factice sinon), puis ouvrir la session.
  async login(user: StaffActor, input: StaffLoginInput, cookies: StaffCookiesIn): Promise<StaffReply<StaffLoginDTO>> {
    const layer = await this.store.readLayer(user.userId);
    const member = layer === null ? null : await this.store.findMember(layer.proProfileId, normalizeStaffAccountName(input.accountName));
    const memberActive = member !== null && member.status === "ACTIVE";

    // Un compte inconnu ou éteint n'a pas de compteur à faire monter : aucune réservation. Un compte actif en réserve une, qui peut être REFUSÉE (pause) — le service ne distingue pas.
    const reservation = member !== null && memberActive ? await this.store.reservePasswordAttempt(member.id) : ({ reserved: false } as const);
    const verdict = loginVerification({ memberFound: member !== null, memberActive, reserved: reservation.reserved });

    if (verdict === "dummy" || !reservation.reserved || member === null || layer === null) {
      await this.passwords.verifyAgainstDummy(input.password);
      throw identifiantsRefuses();
    }

    const correct = await this.passwords.verify(reservation.passwordHash, input.password);
    if (!correct) {
      await this.store.recordPasswordFailure({ actor: user, memberId: member.id, failedCount: reservation.failedCount, pausedNow: reservation.pausedNow, action: "staff.login_failed" });
      throw identifiantsRefuses();
    }

    const sessionToken = this.tokens.generate();
    const deviceToken = this.tokens.generate();
    const suffix = this.tokens.generate().slice(0, 8);
    const opened = await this.store.openSession({
      actor: user,
      proProfileId: layer.proProfileId,
      memberId: member.id,
      sessionTokenHash: this.tokens.hash(sessionToken),
      candidateDeviceHashes: cookies.devices.map((d) => this.tokens.hash(d.value)),
      newDeviceTokenHash: this.tokens.hash(deviceToken),
      deviceLabel: STAFF_DEVICE_DEFAULT_LABEL
    });
    // Désactivé entre la réservation et l'ouverture : le même refus, aucune session (la base a refusé le CAS).
    if (!opened.ok) throw identifiantsRefuses();
    return { body: { member: opened.member }, cookies: { session: sessionToken, device: opened.deviceReused ? undefined : { suffix, token: deviceToken } } };
  }

  // K-16 — termine la session COURANTE (celle que le garde a posée sur la requête). L'appareil reste : c'est le poste qui est reconnu, pas la session.
  async logout(user: StaffActor, staff: StaffContext): Promise<StaffReply<StaffLogoutDTO>> {
    await this.store.closeSession({ actor: user, sessionId: staff.sessionId, memberId: staff.memberId });
    return { body: { status: "ok" }, cookies: { session: null } };
  }

  // K-17 — l'état : exemptée du garde, jamais un refus, JAMAIS une prolongation (`peekSession` lit, ne touche pas). La couche éteinte n'ouvre aucune autre lecture.
  async state(user: StaffActor, cookies: StaffCookiesIn): Promise<StaffSessionStateDTO> {
    const layer = await this.store.readLayer(user.userId);
    if (layer === null || layer.enabledAt === null) return { enabled: false, member: null, knownMembers: [] };

    let member: StaffSessionStateDTO["member"] = null;
    if (cookies.session !== undefined) {
      const peek = await this.store.peekSession({ tokenHash: this.tokens.hash(cookies.session), proProfileId: layer.proProfileId });
      if (peek.ok) {
        member = { id: peek.session.memberId, accountName: peek.session.accountName, role: peek.session.role, mustChangePassword: peek.session.mustChangePassword };
      }
    }
    const knownMembers = await this.store.listKnownMembers({ proProfileId: layer.proProfileId, deviceTokenHashes: cookies.devices.map((d) => this.tokens.hash(d.value)) });
    return { enabled: true, member, knownMembers };
  }

  // ⛔ K-18 — le changement de mot de passe du MEMBRE. Le compteur est PARTAGÉ avec la connexion (S-102) : l'actuel faux compte, et la pause qu'il déclenche vaut pour les deux routes. L'ordre : le nouveau mot de
  // passe courant d'abord (aucun coût, aucun essai consommé), la réservation, l'actuel, la RÉUTILISATION (contre le même hachage lu), puis le hachage du nouveau — et le remplacement CONDITIONNÉ au hachage lu.
  async changePassword(user: StaffActor, staff: StaffContext, input: StaffPasswordChangeInput): Promise<StaffReply<StaffPasswordChangeDTO>> {
    const common = passwordViolation({ common: isCommonPassword(input.newPassword), sameAsCurrent: false });
    if (common !== null) throw violationDeMotDePasse(common);

    const reservation = await this.store.reservePasswordAttempt(staff.memberId);
    if (!reservation.reserved) {
      await this.passwords.verifyAgainstDummy(input.currentPassword);
      throw motDePasseActuelRefuse();
    }
    const correct = await this.passwords.verify(reservation.passwordHash, input.currentPassword);
    if (!correct) {
      await this.store.recordPasswordFailure({ actor: user, memberId: staff.memberId, failedCount: reservation.failedCount, pausedNow: reservation.pausedNow, action: "staff.password_change_failed" });
      throw motDePasseActuelRefuse();
    }

    // Le bon mot de passe actuel n'est PAS un échec : la réutilisation se juge APRÈS, et remet le compteur à zéro avant de refuser.
    const sameAsCurrent = await this.passwords.verify(reservation.passwordHash, input.newPassword);
    const reused = passwordViolation({ common: false, sameAsCurrent });
    if (reused !== null) {
      await this.store.resetPasswordAttempts(staff.memberId);
      throw violationDeMotDePasse(reused);
    }

    const newPasswordHash = await this.passwords.hash(input.newPassword);
    const changed = await this.store.changePassword({
      actor: user,
      memberId: staff.memberId,
      currentSessionId: staff.sessionId,
      expectedPasswordHash: reservation.passwordHash,
      newPasswordHash
    });
    // Un remplacement concurrent a gagné (le hachage lu n'est plus le courant) : le même refus que le mot de passe actuel faux.
    if (!changed.ok) throw motDePasseActuelRefuse();
    return { body: { member: changed.member }, cookies: {} };
  }
}
