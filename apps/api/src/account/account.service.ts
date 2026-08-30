import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import {
  AccountErrorCode,
  AuthErrorCode,
  type ChangeEmailResponse,
  type ChangePasswordInput,
  type ConfirmEmailChangeResponse,
  type ProfileUpdateInput
} from "@zwadj/types";
import { AUTH } from "../auth/auth.constants";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AccountEmailsService } from "./account-emails.service";

/** Ligne minimale nécessaire pour AUTORISER une action de compte. */
const ACTOR_SELECT = {
  id: true,
  email: true,
  role: true,
  locale: true,
  status: true,
  passwordHash: true,
  proProfile: { select: { id: true } }
} as const;

type Actor = Prisma.UserGetPayload<{ select: typeof ACTOR_SELECT }>;

/**
 * Lot A10 — profil, e-mail et mot de passe du compte authentifié.
 *
 * CHEMIN SENSIBLE. Trois invariants portés ici, à ne pas relâcher :
 *  1. l'e-mail ne bascule JAMAIS avant preuve de possession de la nouvelle
 *     adresse (une faute de frappe ne peut pas verrouiller quelqu'un dehors) ;
 *  2. le MODE de `change-password` est décidé par le SERVEUR d'après l'état en
 *     base (D42) — un drapeau envoyé par le client serait un contournement du
 *     contrôle de l'ancien mot de passe ;
 *  3. toute action exige un compte `ACTIVE` (§2.0).
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly emails: AccountEmailsService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext("Account");
  }

  /**
   * Charge l'acteur et refuse un compte non `ACTIVE`.
   *
   * 401 et non 403 : le JWT reste cryptographiquement valide, mais l'identité
   * qu'il porte n'a plus le droit d'exister côté applicatif — c'est
   * exactement ce que `/auth/me` répond au même compte, donc le front n'a
   * qu'UN comportement à implémenter (purge de session).
   */
  async requireActiveActor(userId: string): Promise<Actor> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: ACTOR_SELECT });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({
        code: AccountErrorCode.ACCOUNT_NOT_ACTIVE,
        message: "account.errors.notActive"
      });
    }
    return user;
  }

  // ── PATCH /me/profile ─────────────────────────────────────────────────────
  /**
   * Patch PARTIEL RÉEL (doctrine A2) : une clé absente ne remet rien à zéro.
   *
   * Le tri des champs par rôle se fait ICI et non dans le schéma : le corps ne
   * porte pas de discriminant, et en accepter un du client ouvrirait une
   * écriture croisée (un CLIENT qui se fabrique un `businessName`).
   *
   * Retourne `void` : le contrôleur relit ensuite `/auth/me`, donc le front
   * reçoit le MÊME `AuthUserDTO` que partout ailleurs (D12) et n'a pas un
   * second format de profil à réconcilier.
   */
  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
    const actor = await this.requireActiveActor(userId);
    const isPro = actor.role === "PRO";

    const allowed = isPro
      ? (["businessName", "phone", "phone2", "notifyByEmail", "notifyBySms"] as const)
      : (["firstName", "lastName", "phone"] as const);
    const rejected = Object.keys(input).filter((k) => !(allowed as readonly string[]).includes(k));
    if (rejected.length > 0) {
      throw new BadRequestException({
        code: AccountErrorCode.PROFILE_FIELD_NOT_ALLOWED,
        message: "account.errors.profileFieldNotAllowed"
      });
    }

    if (!isPro) {
      // CLIENT/ADMIN : le profil vit sur `User`. `phone: null` est un
      // effacement légitime (la colonne est nullable et le téléphone est
      // facultatif à l'inscription client).
      const data: Prisma.UserUpdateInput = {};
      if (input.firstName !== undefined) data.firstName = input.firstName;
      if (input.lastName !== undefined) data.lastName = input.lastName;
      if (input.phone !== undefined) data.phone = input.phone;
      await this.prisma.user.update({ where: { id: userId }, data });
      return;
    }

    // PRO : le profil vit sur `ProProfile`. `phone` y est NOT NULL — le
    // contact pro est obligatoire depuis l'inscription (D3), donc `null` est
    // refusé EXPLICITEMENT plutôt que laissé remonter en erreur Postgres brute.
    if (input.phone === null) {
      throw new BadRequestException({
        code: AccountErrorCode.PRO_PHONE_REQUIRED,
        message: "account.errors.proPhoneRequired"
      });
    }
    const data: Prisma.ProProfileUpdateInput = {};
    if (input.businessName !== undefined) data.businessName = input.businessName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.phone2 !== undefined) data.phone2 = input.phone2; // null = effacement (D38 : nullable)

    // D60 — canaux. Le PATCH est PARTIEL : couper l'e-mail sans parler du SMS
    // peut couper les deux si le SMS était déjà à false. Zod ne voit pas l'état
    // en base, donc on RELIT la ligne — même raisonnement que les taux D35 — et
    // on refuse un 400 lisible plutôt que de laisser le
    // `CHECK pro_profiles_one_channel_required` remonter en 500.
    //
    // ⚠ Le CHECK reste le dernier mot : entre cette lecture et l'écriture, un
    // autre onglet peut avoir coupé l'autre canal. On ne prétend pas fermer la
    // fenêtre, seulement rendre le cas courant compréhensible.
    if (input.notifyByEmail !== undefined || input.notifyBySms !== undefined) {
      const current = await this.prisma.proProfile.findUniqueOrThrow({
        where: { userId },
        select: { notifyByEmail: true, notifyBySms: true }
      });
      const nextEmail = input.notifyByEmail ?? current.notifyByEmail;
      const nextSms = input.notifyBySms ?? current.notifyBySms;
      // Un pro sans aucun canal ne verrait plus jamais une demande arriver —
      // et sous request-to-book, une demande que personne ne voit expire seule.
      if (!nextEmail && !nextSms) {
        throw new BadRequestException({
          code: AccountErrorCode.PROFILE_FIELD_NOT_ALLOWED,
          message: "account.errors.channelRequired"
        });
      }
      data.notifyByEmail = nextEmail;
      data.notifyBySms = nextSms;
    }

    await this.prisma.proProfile.update({ where: { userId }, data });
  }

  // ── POST /me/change-email ─────────────────────────────────────────────────
  /**
   * Dépose une DEMANDE de changement. Ne bascule rien : l'ancienne adresse
   * reste l'identifiant de connexion jusqu'à ce que le lien envoyé à la
   * NOUVELLE adresse soit ouvert.
   */
  async requestEmailChange(userId: string, newEmail: string): Promise<ChangeEmailResponse> {
    const actor = await this.requireActiveActor(userId);

    if (actor.email === newEmail) {
      throw new BadRequestException({
        code: AccountErrorCode.EMAIL_UNCHANGED,
        message: "account.errors.emailUnchanged"
      });
    }

    // Pré-contrôle de courtoisie : il évite d'envoyer un lien voué à échouer.
    // Il n'est PAS la garantie — deux demandes concurrentes sur la même
    // adresse le franchiraient toutes les deux. La vraie source de vérité est
    // la contrainte `users_email_key`, tranchée à la consommation du token
    // (même doctrine que `register` : jamais de pré-check seul).
    const taken = await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken) {
      throw new ConflictException({
        code: AuthErrorCode.EMAIL_ALREADY_USED,
        message: "auth.errors.emailAlreadyUsed"
      });
    }

    const rawToken = this.tokens.generate();
    const expiresAt = new Date(Date.now() + AUTH.EMAIL_CHANGE_TTL_HOURS * 3_600_000);
    await this.prisma.$transaction(async (tx) => {
      // Un seul lien valide à la fois (patron resend-verification / forgot) :
      // demander un changement vers une AUTRE adresse doit invalider le
      // précédent, sinon deux liens vivants mèneraient à deux e-mails
      // différents selon celui qu'on ouvre.
      await tx.emailChangeToken.deleteMany({ where: { userId, usedAt: null } });
      await tx.emailChangeToken.create({
        data: { userId, newEmail, tokenHash: this.tokens.hash(rawToken), expiresAt }
      });
    });

    // Envoi APRÈS commit, échec loggé mais jamais bloquant (doctrine
    // inscription) : la demande existe, l'utilisateur peut la rejouer.
    try {
      await this.emails.sendEmailChangeVerification(
        { email: newEmail, role: actor.role, locale: actor.locale },
        rawToken
      );
    } catch (e) {
      this.logger.error({ err: e, userId }, "Échec d'envoi du lien de changement d'e-mail");
    }

    return { status: "pending_verification", pendingEmail: newEmail };
  }

  /**
   * Consomme le token — c'est ICI, et seulement ici, que l'e-mail bascule.
   *
   * Route PUBLIQUE : le lien arrive dans la NOUVELLE boîte, potentiellement
   * ouverte dans un autre navigateur sans session. Le token EST
   * l'authentification, exactement comme `verify-email` et `reset-password`.
   */
  async confirmEmailChange(rawToken: string): Promise<ConfirmEmailChangeResponse> {
    const now = new Date();
    const token = await this.prisma.emailChangeToken.findFirst({
      where: { tokenHash: this.tokens.hash(rawToken), usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true, newEmail: true, user: { select: { status: true } } }
    });

    // Un seul code pour inconnu / expiré / déjà utilisé / compte non ACTIVE
    // (D16) : pas d'oracle, et le vocabulaire reste celui du token.
    if (!token || token.user.status !== "ACTIVE") {
      throw new BadRequestException({
        code: AuthErrorCode.TOKEN_INVALID_OR_EXPIRED,
        message: "auth.errors.tokenInvalidOrExpired"
      });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.emailChangeToken.update({ where: { id: token.id }, data: { usedAt: now } });
        await tx.user.update({
          where: { id: token.userId },
          // `emailVerifiedAt` est REPOSÉ, pas conservé : la nouvelle adresse
          // vient précisément d'être prouvée. Un compte dont l'ancienne
          // adresse n'avait jamais été vérifiée devient donc vérifié — et
          // c'est correct, la preuve porte sur l'adresse, pas sur le compte.
          data: { email: token.newEmail, emailVerifiedAt: now }
        });
      });
    } catch (e) {
      // Course réelle : l'adresse a été prise entre la demande et le clic.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException({
          code: AuthErrorCode.EMAIL_ALREADY_USED,
          message: "auth.errors.emailAlreadyUsed"
        });
      }
      throw e;
    }

    return { status: "changed", email: token.newEmail };
  }

  // ── POST /me/change-password (D42) ────────────────────────────────────────
  /**
   * Le MODE est décidé par le serveur d'après `passwordHash` :
   *  - non nul  → « modifier » : `currentPassword` exigé et vérifié ;
   *  - nul      → « définir » (compte Google-only) : `currentPassword` n'est ni
   *    exigé ni consommé. La session authentifiée fait office de preuve de
   *    possession, exactement comme le reset par lien e-mail.
   *
   * @param currentRefreshToken cookie de CETTE session, à préserver.
   * @returns le nouveau refresh token brut à reposer en cookie, ou `null`
   *          quand l'appel n'apportait pas de cookie (rien à faire tourner).
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    currentRefreshToken: string | undefined
  ): Promise<{ refreshCookie: { value: string; expiresAt: Date; persistent: boolean } | null }> {
    const actor = await this.requireActiveActor(userId);

    if (actor.passwordHash !== null) {
      if (input.currentPassword === undefined) {
        throw new BadRequestException({
          code: AccountErrorCode.CURRENT_PASSWORD_REQUIRED,
          message: "account.errors.currentPasswordRequired"
        });
      }
      if (!(await this.passwords.verify(actor.passwordHash, input.currentPassword))) {
        throw new BadRequestException({
          code: AccountErrorCode.CURRENT_PASSWORD_INVALID,
          message: "account.errors.currentPasswordInvalid"
        });
      }
    } else if (input.currentPassword !== undefined) {
      // Un `currentPassword` envoyé sur un compte SANS mot de passe est
      // ignoré, jamais « vérifié contre rien ». Le paiement d'un coût argon2
      // factice ici créerait une différence de latence entre les deux modes,
      // alors que `hasPassword` est de toute façon public dans le DTO (D42).
      this.logger.debug({ userId }, "currentPassword fourni sur un compte sans mot de passe : ignoré");
    }

    // Hash argon2 (~100 ms) calculé AVANT la transaction : on ne tient jamais
    // une transaction ouverte pendant un travail CPU (patron resetPassword).
    const passwordHash = await this.passwords.hash(input.newPassword);

    // Session COURANTE identifiée par son hash, avant la transaction.
    const currentHash = currentRefreshToken === undefined ? null : this.tokens.hash(currentRefreshToken);
    const current =
      currentHash === null
        ? null
        : await this.prisma.refreshToken.findUnique({
            where: { tokenHash: currentHash },
            select: { id: true, userId: true, revokedAt: true, persistent: true }
          });
    // Un cookie qui ne correspond pas à CE compte (ou déjà révoqué) n'est pas
    // une session à préserver : on retombe sur « tout révoquer ».
    const keep = current !== null && current.userId === userId && current.revokedAt === null ? current : null;

    const refreshRaw = this.tokens.generate();
    // Même TTL que login/refresh : la rotation ne raccourcit ni n'allonge la
    // fenêtre glissante (`REFRESH_TOKEN_TTL_DAYS`, env validé).
    const ttlDays = this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS");
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    const revoked = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      // Différence ASSUMÉE avec D15 (reset = révocation globale) : ici
      // l'utilisateur est authentifié et tient l'appareil en main. Le
      // déconnecter serait une régression UX sans gain de sécurité — mais
      // toutes les AUTRES sessions tombent, ce qui est le point.
      const { count } = await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null, ...(keep ? { id: { not: keep.id } } : {}) },
        data: { revokedAt: new Date() }
      });
      if (keep) {
        // La session courante est ROTÉE (D9) : le mot de passe a changé, le
        // jeton qui a servi à l'ancienne authentification ne survit pas.
        await tx.refreshToken.update({ where: { id: keep.id }, data: { revokedAt: new Date() } });
        await tx.refreshToken.create({
          data: {
            userId,
            tokenHash: this.tokens.hash(refreshRaw),
            expiresAt,
            persistent: keep.persistent // D27 : la rotation préserve le mode
          }
        });
      }
      return count;
    });

    this.logger.info(
      { userId, revokedSessions: revoked, mode: actor.passwordHash === null ? "set" : "change" },
      "Mot de passe modifié : autres sessions révoquées, session courante rotée"
    );

    return {
      refreshCookie: keep ? { value: refreshRaw, expiresAt, persistent: keep.persistent } : null
    };
  }
}
