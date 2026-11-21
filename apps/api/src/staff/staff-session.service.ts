// Le SERVICE de la couche du personnel — rang 44, L36-3a-1 (D341) ; rang 56 (D354) : S-104, l'état du compte ; rang 58, L36-3b (D356) : le PIN. CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise. Il ORCHESTRE : il lit, il appelle le magasin, il hache, il traduit les refus en erreurs
// métier. Ce qu'il DÉCIDE vit dans des modules purs (`staff-session-policy.ts`, `staff-password-policy.ts`) et dans SQL (`staff-store.prisma.ts`) — jamais ici.
//
// ⛔ CE QUE CE FICHIER TIENT :
//   · UN REFUS, UN CORPS (R-3 (D341), MP-8) : compte inconnu, membre désactivé, pause et mauvais mot de passe rendent le MÊME 401 `STAFF_INVALID_CREDENTIALS`, et paient UN argon2 chacun. Le VRAI hachage n'est
//     vérifié que si la tentative a été RÉSERVÉE par le magasin (S-102) : vingt requêtes parallèles ne font pas vingt vérifications du vrai hachage (MP-17).
//   · UN MOT DE PASSE COURANT SE REFUSE AVANT TOUT COÛT (MP-24) : avant le hachage, avant la réservation — un refus qui ne dit rien de l'actuel ne consomme pas d'essai.
//   · LES JETONS NE VOYAGENT QU'HACHÉS : le magasin ne reçoit jamais la valeur d'un cookie (MP-11).
//   · AUCUNE HORLOGE (MP-41), AUCUN JOURNAL (MP-11) : le temps se décide dans la base, et un module qui n'écrit rien dans le journal ne peut y écrire aucun secret.
//   · RANG 58 (D356) — LE PIN : il se tire et se HACHE ICI, le magasin ne reçoit que des hachés ; le PIN en clair ne sort que dans la réponse d'une route qui l'a vu INSTALLER (K-14, K-15, K-18), jamais ailleurs ;
//     la connexion par PIN (K-23) rend UN refus, UN corps, UN calcul de HMAC quelle qu'en soit la cause (R-3) — la vérification du VRAI haché n'a lieu que si l'essai a été RÉSERVÉ par le magasin (MP-1).
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  AuthErrorCode,
  STAFF_DEVICE_DEFAULT_LABEL,
  STAFF_ERROR_MESSAGE_KEYS,
  StaffAccountState,
  StaffErrorCode,
  normalizeStaffAccountName,
  type StaffActivateInput,
  type StaffActivationDTO,
  type StaffLoginDTO,
  type StaffLoginInput,
  type StaffLogoutDTO,
  type StaffPasswordChangeDTO,
  type StaffPasswordChangeInput,
  type StaffPinLoginDTO,
  type StaffPinLoginInput,
  type StaffSessionStateDTO
} from "@zwadj/types";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import type { CookieAppareil } from "./staff-cookies";
import type { StaffContext } from "./staff-decorators";
import { etatDuCompte } from "./staff-account-state";
import { StaffPinHasher } from "./staff-pin-hasher";
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
    @Inject(TokenService) private readonly tokens: Pick<TokenService, "generate" | "hash">,
    @Inject(StaffPinHasher) private readonly pins: Pick<StaffPinHasher, "generate" | "hash" | "verify" | "verifyAgainstDummy">
  ) {}

  // ⛔ K-14 — le propriétaire crée le Manager. Le mot de passe courant se refuse AVANT le hachage (qui coûte 64 Mio) et avant toute lecture ; le magasin fait le reste dans UNE transaction (MP-40).
  async activate(user: StaffActor, input: StaffActivateInput): Promise<StaffReply<StaffActivationDTO>> {
    const violation = passwordViolation({ common: isCommonPassword(input.password), sameAsCurrent: false });
    if (violation !== null) throw violationDeMotDePasse(violation);

    const passwordHash = await this.passwords.hash(input.password);
    // Rang 58 : le PIN du Manager se tire et se HACHE ici ; le magasin ne reçoit que le haché, la réponse porte le PIN UNE fois.
    const pin = this.pins.generate();
    const sessionToken = this.tokens.generate();
    const deviceToken = this.tokens.generate();
    const suffix = this.tokens.generate().slice(0, 8);

    const result = await this.store.activate({
      actor: user,
      accountName: input.accountName,
      accountNameKey: normalizeStaffAccountName(input.accountName),
      passwordHash,
      pinHash: this.pins.hash(pin),
      sessionTokenHash: this.tokens.hash(sessionToken),
      deviceTokenHash: this.tokens.hash(deviceToken),
      deviceLabel: STAFF_DEVICE_DEFAULT_LABEL
    });
    if (!result.ok) throw refusDActivation(result.reason);
    return { body: { member: result.member, pin }, cookies: { session: sessionToken, device: { suffix, token: deviceToken } } };
  }

  // ⛔ K-15 — la connexion. L'ORDRE EST LA RÈGLE : chercher le membre, RÉSERVER la tentative, ENSUITE seulement vérifier (le vrai hachage si réservée, le factice sinon), puis ouvrir la session — SOUS CONDITION du
  // hachage que la réservation a rendu et que la vérification a jugé (D355, R-1) : un mot de passe remplacé entre les deux n'ouvre rien.
  async login(user: StaffActor, input: StaffLoginInput, cookies: StaffCookiesIn): Promise<StaffReply<StaffLoginDTO>> {
    const layer = await this.store.readLayer(user.userId);
    const member = layer === null ? null : await this.store.findMember(layer.proProfileId, normalizeStaffAccountName(input.accountName));
    // ⛔ S-104 (R-3, D354) : « ce membre peut-il se connecter ? » est UNE règle (`etatDuCompte`), jugée à l'HEURE DE LA BASE rendue avec le membre (S-241) — la MÊME que celle du garde. Désactivé et TEMPORAIRE EXPIRÉ
    // ne se connectent pas : ils se traitent comme un compte inconnu (aucune réservation, le hachage factice, le même refus). Un mot de passe à changer — un temporaire valable, ou un mot de passe de 90 jours
    // expiré — SE CONNECTE : la session n'ouvrira que le changement de mot de passe.
    const etat = member === null ? null : etatDuCompte(member, member.now);
    const memberActive = etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD;

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
    // Rang 58 : un PIN CANDIDAT, tiré et haché ici ; le magasin l'installe SI le PIN du membre n'est pas valable (sous son verrou) et le dit.
    const pin = this.pins.generate();
    const opened = await this.store.openSession({
      actor: user,
      proProfileId: layer.proProfileId,
      memberId: member.id,
      expectedPasswordHash: reservation.passwordHash,
      newPinHash: this.pins.hash(pin),
      sessionTokenHash: this.tokens.hash(sessionToken),
      candidateDeviceHashes: cookies.devices.map((d) => this.tokens.hash(d.value)),
      newDeviceTokenHash: this.tokens.hash(deviceToken),
      deviceLabel: STAFF_DEVICE_DEFAULT_LABEL
    });
    // Désactivé — OU son mot de passe remplacé (réinitialisation, changement) — entre la réservation et l'ouverture : le même refus qu'un mauvais mot de passe, aucune session (la base a refusé le CAS, D355).
    // Le vrai hachage a déjà été vérifié : le coût est UN argon2, celui d'un mauvais mot de passe ; rien n'est consigné comme échec (le compteur de la réservation reste, comme pour un mauvais mot de passe).
    if (!opened.ok) throw identifiantsRefuses();
    return {
      // Le PIN n'est montré QUE si le magasin l'a installé : un PIN montré qui n'est pas celui qui est stocké est pire qu'un PIN non montré.
      body: { member: { ...opened.member, mustChangePassword: etat === StaffAccountState.MUST_CHANGE_PASSWORD }, pin: opened.pinIssued ? pin : null },
      cookies: { session: sessionToken, device: opened.deviceReused ? undefined : { suffix, token: deviceToken } }
    };
  }

  // ⛔ K-23 (rang 58, D356, R-3) — la connexion par PIN. UN refus, UN corps, UN COÛT : la couche éteinte, le membre inconnu ou d'une autre salle, désactivé, au temporaire expiré, sans appareil reconnu, l'essai non réservé
  // (épuisé, verrouillé, expiré, absent), le PIN faux et l'ouverture refusée rendent le MÊME 401 `STAFF_INVALID_CREDENTIALS` et paient UN calcul de HMAC (le vrai ou le factice) — aucune fuite d'état (R-3 de D341).
  // L'ORDRE EST LA RÈGLE : la salle du BEARER, le membre (son état de compte, `etatDuCompte`), les cookies d'appareil (sans eux la réservation n'est PAS demandée : aucun essai n'est consommé, MP-2), la RÉSERVATION
  // atomique de l'essai (qui rend le haché lu et vérifie l'appareil), ENSUITE la vérification du PIN (le VRAI haché n'est vérifié que si l'essai est réservé : trois vérifications au plus, MP-1), puis l'ouverture,
  // CONDITIONNÉE au haché lu (R-3). Un PIN faux est CONSIGNÉ avec le compte de la réservation (au troisième, le verrou se pose, sur CE PIN) ; un refus d'ouverture n'est PAS un échec de PIN : rien n'est consigné.
  async pinLogin(user: StaffActor, input: StaffPinLoginInput, cookies: StaffCookiesIn): Promise<StaffReply<StaffPinLoginDTO>> {
    const layer = await this.store.readLayer(user.userId);
    if (layer === null || layer.enabledAt === null) return this.refuserLePin(input.pin);

    const member = await this.store.findMemberById(layer.proProfileId, input.memberId);
    // Le MÊME jugement que la connexion par mot de passe (UNE règle, `etatDuCompte`, à l'heure de la base) : un désactivé et un temporaire expiré sont des comptes inconnus ; un mot de passe à changer SE CONNECTE (la
    // session n'ouvrira que le changement).
    const etat = member === null ? null : etatDuCompte(member, member.now);
    const admis = etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD;
    if (member === null || !admis || cookies.devices.length === 0) return this.refuserLePin(input.pin);

    const empreintesDAppareil = cookies.devices.map((d) => this.tokens.hash(d.value));
    const reservation = await this.store.reservePinAttempt({ proProfileId: layer.proProfileId, memberId: input.memberId, deviceTokenHashes: empreintesDAppareil });
    if (!reservation.reserved) return this.refuserLePin(input.pin);

    if (!this.pins.verify(input.pin, reservation.pinHash)) {
      await this.store.recordPinFailure({ actor: user, memberId: input.memberId, failedCount: reservation.failedCount, expectedPinHash: reservation.pinHash });
      throw identifiantsRefuses();
    }

    const sessionToken = this.tokens.generate();
    const opened = await this.store.openSessionByPin({
      actor: user,
      proProfileId: layer.proProfileId,
      memberId: input.memberId,
      expectedPinHash: reservation.pinHash,
      sessionTokenHash: this.tokens.hash(sessionToken),
      candidateDeviceHashes: empreintesDAppareil
    });
    // Le PIN remplacé, le verrou posé, le membre désactivé ou l'appareil révoqué ENTRE la vérification et l'ouverture : le même refus, aucun cookie, aucune ligne d'échec (le calcul de HMAC a déjà été payé).
    if (!opened.ok) throw identifiantsRefuses();
    return { body: { member: { ...opened.member, mustChangePassword: etat === StaffAccountState.MUST_CHANGE_PASSWORD } }, cookies: { session: sessionToken } };
  }

  /** Le refus d'un PIN dont l'essai n'a PAS été réservé : le calcul de HMAC FACTICE (le même coût qu'une vérification), puis le même 401. Ne rend jamais. */
  private refuserLePin(pin: string): never {
    this.pins.verifyAgainstDummy(pin);
    throw identifiantsRefuses();
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
        // S-104 : l'état est JUGÉ (`etatDuCompte`), pas copié de la colonne ; un temporaire expiré n'a plus de session (le garde la refuse) : l'état ne rend alors aucun membre.
        const etat = etatDuCompte(peek.session, peek.session.now);
        if (etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD) {
          member = { id: peek.session.memberId, accountName: peek.session.accountName, role: peek.session.role, mustChangePassword: etat === StaffAccountState.MUST_CHANGE_PASSWORD };
        }
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
    // Rang 58 : la MÊME règle d'émission que la connexion — un PIN candidat, installé par le magasin sous le verrou du membre s'il n'en a pas de valable.
    const pin = this.pins.generate();
    const changed = await this.store.changePassword({
      actor: user,
      memberId: staff.memberId,
      currentSessionId: staff.sessionId,
      expectedPasswordHash: reservation.passwordHash,
      newPasswordHash,
      newPinHash: this.pins.hash(pin)
    });
    // Un remplacement concurrent a gagné (le hachage lu n'est plus le courant) : le même refus que le mot de passe actuel faux.
    if (!changed.ok) throw motDePasseActuelRefuse();
    return { body: { member: changed.member, pin: changed.pinIssued ? pin : null }, cookies: {} };
  }
}
