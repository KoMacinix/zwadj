import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PinoLogger } from "nestjs-pino";
import {
  AuthErrorCode,
  type AuthUserDTO,
  type ForgotPasswordResponse,
  type LoginInput,
  type LoginResponse,
  type MeResponse,
  type RegisterInput,
  type RegisterResponse,
  type ResendVerificationResponse,
  type ResetPasswordResponse,
  type VerifyEmailResponse
} from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AUTH } from "./auth.constants";
import { AuthEmailsService } from "./auth-emails.service";
import type { AccessTokenPayload } from "./auth.types";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/** Colonnes exposées par login/me — le hash n'en fait JAMAIS partie. */
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  locale: true,
  emailVerifiedAt: true,
  firstName: true,
  lastName: true,
  proProfile: { select: { businessName: true, phone: true } }
} as const;

type AuthUserRow = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

/** Sortie de login() : le corps de réponse + ce qu'il faut au contrôleur pour
 *  poser le cookie refresh (la valeur BRUTE ne sort jamais autrement, D2). */
export interface LoginResult {
  response: LoginResponse;
  // persistent=false (« se souvenir » décoché) : le contrôleur pose un cookie
  // de SESSION (sans expires) — Lot 7/D27.
  refreshCookie: { value: string; expiresAt: Date; persistent: boolean };
}

/**
 * Tranche Auth — Lot 1 : inscription + vérification email.
 *
 * Choix assumé (AGENTS.md « ne pas sur-abstraire ») : PrismaService est
 * utilisé directement, sans couche Repository — la transaction inscription
 * (User + ProProfile + token) resterait orchestrée ici de toute façon, et
 * Prisma est l'ORM engagé du projet. L'API publique du service est stable ;
 * une couche Repository pourra s'insérer plus tard sans toucher les appelants.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly emails: AuthEmailsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext("Auth");
  }

  // ── Inscription (D3 : PRO = User + ProProfile en UNE transaction) ─────────
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const passwordHash = await this.passwords.hash(input.password);
    const rawToken = this.tokens.generate();
    const tokenHash = this.tokens.hash(rawToken);
    const expiresAt = new Date(Date.now() + AUTH.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000);

    let user: { id: string; email: string; role: "CLIENT" | "PRO"; locale: "fr" | "ar" };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            role: input.role,
            locale: input.locale,
            ...(input.role === "CLIENT"
              ? { firstName: input.firstName ?? null, lastName: input.lastName ?? null }
              : {})
          },
          select: { id: true, email: true, role: true, locale: true }
        });

        if (input.role === "PRO") {
          await tx.proProfile.create({
            data: { userId: created.id, businessName: input.businessName, phone: input.phone }
          });
        }

        await tx.emailVerificationToken.create({
          data: { userId: created.id, tokenHash, expiresAt }
        });

        return created as typeof user;
      });
    } catch (e) {
      // P2002 sur users.email = source de vérité du doublon (pas de pré-check :
      // un findUnique préalable laisserait la fenêtre de course TOCTOU ouverte).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException({
          code: AuthErrorCode.EMAIL_ALREADY_USED,
          message: "auth.errors.emailAlreadyUsed"
        });
      }
      throw e;
    }

    // Envoi APRÈS commit : on n'envoie jamais de lien pour un compte annulé.
    // Un échec d'envoi ne casse pas l'inscription (resend-verification existe).
    await this.sendVerificationSafely(user, rawToken);

    return { user };
  }

  // ── Vérification email (token à usage unique, non rejouable) ──────────────
  async verifyEmail(rawToken: string): Promise<VerifyEmailResponse> {
    const tokenHash = this.tokens.hash(rawToken);
    const now = new Date();

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true, user: { select: { emailVerifiedAt: true } } }
    });

    // Un seul code pour inconnu/expiré/déjà utilisé : pas d'oracle.
    if (!token) {
      throw new BadRequestException({
        code: AuthErrorCode.TOKEN_INVALID_OR_EXPIRED,
        message: "auth.errors.tokenInvalidOrExpired"
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: now } });
      if (!token.user.emailVerifiedAt) {
        await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: now } });
      }
    });

    return { status: "verified" };
  }

  // ── Renvoi du lien (réponse CONSTANTE — anti-énumération) ─────────────────
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, locale: true, emailVerifiedAt: true }
    });

    if (user && !user.emailVerifiedAt) {
      const rawToken = this.tokens.generate();
      const expiresAt = new Date(Date.now() + AUTH.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000);

      await this.prisma.$transaction(async (tx) => {
        // Un seul lien valide à la fois : les précédents non consommés tombent.
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        await tx.emailVerificationToken.create({
          data: { userId: user.id, tokenHash: this.tokens.hash(rawToken), expiresAt }
        });
      });

      await this.sendVerificationSafely(user, rawToken);
    }

    // Email inconnu ou déjà vérifié : même réponse, même latence d'écriture en moins —
    // acceptable au MVP (le timing parfait viendrait avec un envoi asynchrone, Phase 8).
    return { status: "ok" };
  }

  // ── Login (D1 par rôle, D5 anti-énumération, D7 refresh émis + persisté) ──
  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...AUTH_USER_SELECT, passwordHash: true }
    });

    // D5 — ORDRE CONTRACTUEL des contrôles :
    // 1) email inconnu → coût argon2 factice payé quand même (anti-timing),
    //    puis le MÊME 401 que pour un mauvais mot de passe (anti-énumération) ;
    if (!user) {
      await this.passwords.verifyAgainstDummy(input.password);
      throw this.invalidCredentials();
    }
    // 2) mauvais mot de passe → 401 au corps strictement identique ;
    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      throw this.invalidCredentials();
    }
    // 3) D1 évalué SEULEMENT après mot de passe validé — sinon le 403 devient
    //    un oracle d'existence des comptes Pro. Seul CLIENT passe non vérifié
    //    (bandeau côté front via emailVerified) ; PRO et ADMIN sont bloqués
    //    (les admins étant créés vérifiés à la main, aucune friction réelle).
    if (user.role !== "CLIENT" && !user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: AuthErrorCode.EMAIL_NOT_VERIFIED,
        message: "auth.errors.emailNotVerified"
      });
    }

    // D4 — access token : claims minimales { sub, role }, TTL court (env).
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    // D7 — refresh token opaque : émis au login, hash SHA-256 seul en base.
    // Sa consommation (rotation, /auth/refresh, /auth/logout, détection de
    // réutilisation) est le périmètre du Lot 3.
    const refreshRaw = this.tokens.generate();
    const ttlDays = this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS");
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
    // LoginInput est z.input : rememberMe est optionnel au niveau du TYPE. Le
    // ValidationPipe applique le default(true) à l'exécution, mais on le
    // re-matérialise ici pour rester correct même si un appelant interne passe
    // un input non parsé (D27).
    const persistent = input.rememberMe ?? true;
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.tokens.hash(refreshRaw), expiresAt, persistent }
    });

    return {
      response: { accessToken, user: this.toAuthUserDTO(user) },
      refreshCookie: { value: refreshRaw, expiresAt, persistent }
    };
  }

  // ── /auth/me : données FRAÎCHES depuis la base, jamais un décodage du JWT ──
  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: AUTH_USER_SELECT });
    // JWT encore valide mais compte disparu (suppression/anonymisation) :
    // l'identité n'existe plus → 401, même code que le guard.
    if (!user) throw this.unauthenticated();
    return this.toAuthUserDTO(user);
  }

  // ── Refresh (Lot 3 — D9 rotation, D10 réutilisation, D12 format login) ─────
  async refresh(rawToken: string | undefined): Promise<LoginResult> {
    // Les QUATRE échecs ci-dessous renvoient le même 401 UNAUTHENTICATED :
    // la distinction (absent / inconnu / réutilisé / expiré) n'existe que
    // côté serveur — rien d'exploitable pour calibrer une attaque.
    if (!rawToken) throw this.unauthenticated();

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokens.hash(rawToken) }
    });
    // Inconnu : aucun effet de bord — un hash forgé est inattribuable, le
    // « punir » ne punirait personne.
    if (!row) throw this.unauthenticated();

    // D10 — le token matche une ligne DÉJÀ révoquée : un token consommé (rotation
    // ou logout) qui ressert. Le détenteur légitime a déjà son successeur ; qui
    // rejoue l'ancien détient une copie → indécidable attaquant/légitime →
    // révocation de TOUTES les sessions du user. (Vérifié AVANT l'expiration :
    // même périmé, un token révoqué qui ressert reste un signal de vol.)
    if (row.revokedAt) {
      await this.revokeAllSessions(row.userId, "refresh_token_reuse");
      throw this.unauthenticated();
    }
    if (row.expiresAt <= new Date()) throw this.unauthenticated();

    const user = await this.prisma.user.findUnique({ where: { id: row.userId }, select: AUTH_USER_SELECT });
    // Défensif : la FK onDelete: Cascade rend ce cas théorique (user supprimé
    // ⇒ ses lignes refresh_tokens n'existent plus) — course résiduelle près.
    if (!user) throw this.unauthenticated();

    // D9 — rotation : consommer l'ancien ET créer le neuf atomiquement.
    // Le updateMany conditionné à revokedAt IS NULL est un check-and-set : si
    // count = 0, un refresh CONCURRENT vient de consommer ce token (double
    // soumission). Traité en réutilisation (strict) : le front doit sérialiser
    // ses refresh (mutex, note Lot 5).
    const refreshRaw = this.tokens.generate();
    const ttlDays = this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS");
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000); // fenêtre GLISSANTE : 30 j pleins à chaque rotation
    const rotated = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      if (consumed.count === 0) return false;
      // D27 — la rotation PRÉSERVE le mode de persistance choisi au login.
      await tx.refreshToken.create({
        data: { userId: row.userId, tokenHash: this.tokens.hash(refreshRaw), expiresAt, persistent: row.persistent }
      });
      return true;
    });
    if (!rotated) {
      await this.revokeAllSessions(row.userId, "concurrent_refresh");
      throw this.unauthenticated();
    }

    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    return {
      response: { accessToken: await this.jwt.signAsync(payload), user: this.toAuthUserDTO(user) },
      refreshCookie: { value: refreshRaw, expiresAt, persistent: row.persistent }
    };
  }

  // ── Logout (Lot 3 — D11 : idempotent, ne révoque QUE le token présenté) ────
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return; // pas de cookie = déjà déconnecté ici : succès constant
    // updateMany : 0 ligne touchée (inconnu, déjà révoqué) = même succès.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.tokens.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  /** D10 — révocation globale sur signal de vol : toutes les sessions actives
   *  du user tombent, l'événement est tracé (futur audit-log, Phase 13). */
  private async revokeAllSessions(userId: string, reason: string): Promise<void> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    this.logger.warn(
      { userId, revokedSessions: count, reason },
      "Refresh token réutilisé : révocation de toutes les sessions du compte"
    );
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      code: AuthErrorCode.UNAUTHENTICATED,
      message: "auth.errors.unauthenticated"
    });
  }

  private toAuthUserDTO(user: AuthUserRow): AuthUserDTO {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      emailVerified: user.emailVerifiedAt !== null,
      firstName: user.firstName,
      lastName: user.lastName,
      proProfile: user.proProfile
        ? { businessName: user.proProfile.businessName, phone: user.proProfile.phone }
        : null
    };
  }

  /** 401 unique du login — corps identique pour email inconnu et mauvais mdp (D5). */
  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: AuthErrorCode.INVALID_CREDENTIALS,
      message: "auth.errors.invalidCredentials"
    });
  }

  // ── Forgot password (Lot 4 — D14, miroir exact de resendVerification) ──────
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, locale: true }
    });

    // Volontairement AUCUNE condition sur emailVerifiedAt : reset et
    // vérification sont deux flux distincts — un PRO non vérifié qui a perdu
    // son mot de passe doit pouvoir le récupérer (il restera bloqué au login
    // par D1 tant qu'il n'a pas vérifié, mais c'est l'affaire de l'AUTRE flux).
    if (user) {
      const rawToken = this.tokens.generate();
      const expiresAt = new Date(Date.now() + AUTH.PASSWORD_RESET_TTL_MINUTES * 60_000);

      await this.prisma.$transaction(async (tx) => {
        // Un seul lien de reset valide à la fois : les précédents non consommés tombent.
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        await tx.passwordResetToken.create({
          data: { userId: user.id, tokenHash: this.tokens.hash(rawToken), expiresAt }
        });
      });

      await this.sendPasswordResetSafely(user, rawToken);
    }

    // Email inconnu : même réponse constante (anti-énumération, patron Lot 1).
    return { status: "ok" };
  }

  // ── Reset password (Lot 4 — D15 sessions révoquées, D16 code unique, D17) ──
  async resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResponse> {
    const now = new Date();
    const token = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: this.tokens.hash(rawToken), usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true }
    });

    // D16 — un seul code pour inconnu/expiré/déjà utilisé : pas d'oracle
    // (même patron que verify-email).
    if (!token) {
      throw new BadRequestException({
        code: AuthErrorCode.TOKEN_INVALID_OR_EXPIRED,
        message: "auth.errors.tokenInvalidOrExpired"
      });
    }

    // Le hash argon2 (~100 ms) se calcule AVANT la transaction — on ne tient
    // pas une transaction ouverte pendant un travail CPU.
    const passwordHash = await this.passwords.hash(newPassword);

    const revoked = await this.prisma.$transaction(async (tx) => {
      // Usage unique, nouveau hash et révocation D15 : ATOMIQUES — impossible
      // d'avoir un mot de passe changé avec des sessions survivantes, ou un
      // token consommé sans effet.
      await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } });
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      // D15 — qui demande un reset soupçonne (ou a subi) une compromission :
      // toutes les sessions actives tombent, celles d'un éventuel attaquant comprises.
      const { count } = await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now }
      });
      return count;
    });
    this.logger.info(
      { userId: token.userId, revokedSessions: revoked },
      "Mot de passe réinitialisé : sessions actives révoquées"
    );

    // D17 — ne connecte PAS : pas d'access token ni de cookie émis ici. Surface
    // minimale ; l'utilisateur se reconnecte avec son nouveau mot de passe.
    return { status: "ok" };
  }

  private async sendPasswordResetSafely(
    user: { email: string; role: "CLIENT" | "PRO" | "ADMIN"; locale: "fr" | "ar" },
    rawToken: string
  ): Promise<void> {
    try {
      await this.emails.sendPasswordResetEmail(
        { email: user.email, role: user.role, locale: user.locale },
        rawToken
      );
    } catch (e) {
      this.logger.error({ err: e, to: user.email }, "Échec d'envoi de l'email de réinitialisation");
    }
  }

  private async sendVerificationSafely(
    user: { email: string; role: "CLIENT" | "PRO" | "ADMIN"; locale: "fr" | "ar" },
    rawToken: string
  ): Promise<void> {
    try {
      await this.emails.sendVerificationEmail(
        { email: user.email, role: user.role, locale: user.locale },
        rawToken
      );
    } catch (e) {
      this.logger.error({ err: e, to: user.email }, "Échec d'envoi de l'email de vérification");
    }
  }
}
