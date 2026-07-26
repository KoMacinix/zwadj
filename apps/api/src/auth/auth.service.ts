import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PinoLogger } from "nestjs-pino";
import {
  AuthErrorCode,
  type AuthUserDTO,
  type ForgotPasswordResponse,
  type GoogleAuthInput,
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
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleAuthDisabledError,
  GoogleTokenInvalidError,
  type GoogleIdTokenPayload,
  type GoogleTokenVerifier
} from "./google.types";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Colonnes LUES par login/me/refresh/google.
 *
 * ⚠ Lot A10 — `passwordHash` et `googleSub` sont désormais SÉLECTIONNÉS, ce
 * qui change la lecture de l'ancien commentaire « le hash n'en fait jamais
 * partie ». La règle exacte est, et reste : le hash n'est jamais EXPOSÉ. D42
 * impose au DTO deux booléens (`hasPassword`, `hasGoogle`) qui ne peuvent se
 * dériver que de ces colonnes — Prisma ne sait pas calculer un booléen dans un
 * `select`. `toAuthUserDTO()` construit sa sortie champ par champ (jamais un
 * spread de la ligne) : le hash ne peut pas fuir par inadvertance, et
 * `me.int-spec.ts` l'assert explicitement.
 *
 * `status` (§2.0) est lu ici pour que les CINQ chemins d'authentification
 * puissent le consulter sans requête supplémentaire.
 */
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  locale: true,
  status: true,
  emailVerifiedAt: true,
  firstName: true,
  lastName: true,
  phone: true,
  passwordHash: true,
  googleSub: true,
  proProfile: { select: { businessName: true, phone: true, phone2: true } }
} as const;

type AuthUserRow = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

/** Lot 8 : la matrice /auth/google s'appuie sur le lien Google existant
 *  (googleSub) pour distinguer liaison / connexion / conflit. Depuis A10 il
 *  fait partie du select commun — l'alias est conservé pour que les
 *  signatures de la matrice restent lisibles. */
const GOOGLE_AUTH_SELECT = AUTH_USER_SELECT;

type GoogleAuthUserRow = AuthUserRow;

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
    private readonly logger: PinoLogger,
    // Lot 8 : port de vérification d'ID token Google (Symbol — l'interface TS
    // n'existe pas à l'exécution, patron EMAIL_SENDER).
    @Inject(GOOGLE_TOKEN_VERIFIER) private readonly googleVerifier: GoogleTokenVerifier
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
              ? // 7.2 : noms garantis non vides par registerClientSchema ; phone
                // optionnel → null explicite (User.phone nullable, pas de migration)
                { firstName: input.firstName, lastName: input.lastName, phone: input.phone ?? null }
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
      select: { id: true, email: true, role: true, locale: true, status: true, emailVerifiedAt: true }
    });

    // §2.0 (A10) — même règle que forgot-password : réponse constante, mais un
    // compte non ACTIVE ne déclenche ni token ni envoi.
    if (user && user.status === "ACTIVE" && !user.emailVerifiedAt) {
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
      select: AUTH_USER_SELECT
    });

    // D5 — ORDRE CONTRACTUEL des contrôles :
    // 1) email inconnu OU compte Google-only sans mot de passe (Lot 8 :
    //    passwordHash null, IMPOSSIBLE via register) → coût argon2 factice
    //    payé quand même (anti-timing), puis le MÊME 401 que pour un mauvais
    //    mot de passe — l'existence du compte ET son mode d'authentification
    //    restent indistinguables (anti-énumération, D5 étendu) ;
    if (!user || user.passwordHash === null) {
      await this.passwords.verifyAgainstDummy(input.password);
      throw this.invalidCredentials();
    }
    // 2) mauvais mot de passe → 401 au corps strictement identique ;
    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      throw this.invalidCredentials();
    }
    // 2bis) §2.0 (A10) — compte non ACTIVE (suspendu / anonymisé) : MÊME 401
    //    que des identifiants faux. Placé APRÈS la vérification du mot de
    //    passe, jamais avant : un refus anticipé économiserait le coût argon2
    //    et la latence trahirait le statut malgré un corps identique (D5).
    //    Placé AVANT D1 : un compte anonymisé ne doit pas s'entendre répondre
    //    « vérifiez votre e-mail », ce serait une impasse.
    if (user.status !== "ACTIVE") {
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

    // LoginInput est z.input : rememberMe est optionnel au niveau du TYPE. Le
    // ValidationPipe applique le default(true) à l'exécution, mais on le
    // re-matérialise ici pour rester correct même si un appelant interne passe
    // un input non parsé (D27).
    return this.issueSession(user, input.rememberMe ?? true);
  }

  /** Émission de session (login + Google, Lot 8) : access JWT (D4 — claims
   *  minimales { sub, role }, TTL court env) + refresh opaque persisté (D7 —
   *  hash SHA-256 seul en base, la valeur BRUTE ne sort que vers le cookie).
   *  refresh() garde sa PROPRE émission : elle est transactionnelle avec la
   *  rotation D9, ce helper ne l'est pas. */
  private async issueSession(user: AuthUserRow, persistent: boolean): Promise<LoginResult> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshRaw = this.tokens.generate();
    const ttlDays = this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS");
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.tokens.hash(refreshRaw), expiresAt, persistent }
    });

    return {
      response: { accessToken, user: this.toAuthUserDTO(user) },
      refreshCookie: { value: refreshRaw, expiresAt, persistent }
    };
  }

  // ── Google (Lot 8 — cadrage OAuth : GIS ID token direct, D30 persistant) ──
  async googleAuth(input: GoogleAuthInput): Promise<LoginResult> {
    let payload: GoogleIdTokenPayload;
    try {
      payload = await this.googleVerifier.verify(input.idToken);
    } catch (e) {
      // GOOGLE_CLIENT_ID absente (dev sans projet Google Cloud) : la
      // fonctionnalité est ÉTEINTE, pas cassée — 503 explicite.
      if (e instanceof GoogleAuthDisabledError) {
        throw new ServiceUnavailableException({
          code: AuthErrorCode.GOOGLE_AUTH_DISABLED,
          message: "auth.errors.googleAuthDisabled"
        });
      }
      // Signature/audience/expiration/forme : UN seul 401, pas d'oracle.
      if (e instanceof GoogleTokenInvalidError) {
        throw new UnauthorizedException({
          code: AuthErrorCode.GOOGLE_TOKEN_INVALID,
          message: "auth.errors.googleTokenInvalid"
        });
      }
      throw e;
    }

    // Cadrage OAuth — email_verified OBLIGATOIRE : jamais de création NI de
    // liaison sur un email que Google lui-même ne considère pas prouvé.
    if (!payload.emailVerified) {
      throw new ForbiddenException({
        code: AuthErrorCode.GOOGLE_EMAIL_NOT_VERIFIED,
        message: "auth.errors.googleEmailNotVerified"
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: GOOGLE_AUTH_SELECT
    });
    if (existing) return this.loginExistingGoogleUser(existing, payload);

    // Email introuvable → création CLIENT. Patron register : JAMAIS de
    // pré-check + create séparés — P2002 est la source de vérité de la course.
    try {
      const created = await this.prisma.user.create({
        data: {
          email: payload.email,
          passwordHash: null, // compte Google-only : login classique → 401 (D5 étendu)
          role: "CLIENT", // cadrage OAuth : la création Google ne produit JAMAIS un PRO/ADMIN
          locale: input.locale ?? "fr", // z.input : default re-matérialisé (patron rememberMe/D27)
          firstName: payload.givenName,
          lastName: payload.familyName,
          googleSub: payload.sub,
          emailVerifiedAt: new Date() // Google a déjà vérifié CET email (email_verified=true)
        },
        select: AUTH_USER_SELECT
      });
      // D30 — cookie TOUJOURS persistant sur le flux Google.
      return await this.issueSession(created, true);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Course : un register/googleAuth concurrent a créé cet email entre le
        // findUnique et le create → relire, puis appliquer la MÊME matrice.
        const raced = await this.prisma.user.findUnique({
          where: { email: payload.email },
          select: GOOGLE_AUTH_SELECT
        });
        if (raced) return this.loginExistingGoogleUser(raced, payload);
        // P2002 sans ligne sur CET email = collision users_google_sub_key :
        // cette identité Google est déjà liée à un AUTRE email Zwadj (email
        // changé côté Google). Pas d'auto-réparation — cas limite assumé,
        // alternative « lookup par sub d'abord » proposée au rapport (D33 ?).
        throw this.googleAccountConflict();
      }
      throw e;
    }
  }

  /** Matrice « email trouvé » du cadrage OAuth (Lot 8). */
  private async loginExistingGoogleUser(
    user: GoogleAuthUserRow,
    payload: GoogleIdTokenPayload
  ): Promise<LoginResult> {
    // §2.0 (A10) — compte non ACTIVE : refusé AVANT toute autre branche, et
    // avec un code DÉJÀ EXISTANT du chemin Google. `GOOGLE_ACCOUNT_CONFLICT`
    // est le seau assumé des cas limites de ce chemin (« 409 unique des cas
    // limites — indistincts volontairement ») et son message finit sur
    // « contactez-nous », qui est l'action juste ici. Le seul autre refus
    // réutilisable, GOOGLE_ACCOUNT_NOT_CLIENT, enverrait un CLIENT suspendu
    // vers l'espace Pro : une impasse.
    //
    // Placé avant le test de rôle pour que la règle soit uniforme : un compte
    // non ACTIVE reçoit la MÊME réponse quel que soit son rôle.
    if (user.status !== "ACTIVE") {
      throw this.googleAccountConflict();
    }

    // Branche 2 — PRO/ADMIN : JAMAIS connectables via Google (mot de passe
    // seul). Le front (Lot 9) affiche « connectez-vous via l'espace Pro ».
    // Pas d'oracle créé ici : le détenteur du token Google prouve déjà qu'il
    // contrôle CET email — il n'apprend rien qu'il ne pouvait savoir.
    if (user.role !== "CLIENT") {
      throw new ForbiddenException({
        code: AuthErrorCode.GOOGLE_ACCOUNT_NOT_CLIENT,
        message: "auth.errors.googleAccountNotClient"
      });
    }
    // Garde-fou : l'email correspond mais le compte est lié à une AUTRE
    // identité Google (sub ≠) — email recyclé côté Google. Pas d'écrasement
    // silencieux du lien existant.
    if (user.googleSub !== null && user.googleSub !== payload.sub) {
      throw this.googleAccountConflict();
    }

    // Branche 1 — CLIENT : connexion, avec liaison au premier login Google
    // (googleSub posé) et backfill emailVerifiedAt si null — MÊME base de
    // confiance que la création : Google a vérifié CET email exact.
    const data: { googleSub?: string; emailVerifiedAt?: Date } = {};
    if (user.googleSub === null) data.googleSub = payload.sub;
    if (user.emailVerifiedAt === null) data.emailVerifiedAt = new Date();

    let row: AuthUserRow = user;
    if (data.googleSub !== undefined || data.emailVerifiedAt !== undefined) {
      try {
        row = await this.prisma.user.update({ where: { id: user.id }, data, select: AUTH_USER_SELECT });
      } catch (e) {
        // users_google_sub_key : ce sub vient d'être lié à un autre compte
        // (course) — même refus que le garde-fou ci-dessus.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw this.googleAccountConflict();
        }
        throw e;
      }
    }

    // D30 — cookie TOUJOURS persistant sur le flux Google.
    return this.issueSession(row, true);
  }

  /** 409 unique des cas limites de liaison Google — indistincts volontairement. */
  private googleAccountConflict(): ConflictException {
    return new ConflictException({
      code: AuthErrorCode.GOOGLE_ACCOUNT_CONFLICT,
      message: "auth.errors.googleAccountConflict"
    });
  }

  // ── /auth/me : données FRAÎCHES depuis la base, jamais un décodage du JWT ──
  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: AUTH_USER_SELECT });
    // JWT encore valide mais compte disparu (suppression/anonymisation) :
    // l'identité n'existe plus → 401, même code que le guard.
    //
    // §2.0 (A10) — le test `status` REND VRAI ce que ce commentaire promettait
    // déjà : une anonymisation ne SUPPRIME pas la ligne (commissions et
    // historique doivent survivre), donc `!user` ne se déclenchait jamais dans
    // ce cas et /auth/me aurait continué à servir un profil anonymisé jusqu'à
    // l'expiration de l'access token.
    if (!user || user.status !== "ACTIVE") throw this.unauthenticated();
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
    //
    // §2.0 (A10) — `status` : ceinture ET bretelles. L'exécution d'une
    // suppression révoque déjà TOUS les refresh tokens, mais une SUSPENSION
    // manuelle en base (DBeaver, D4) n'en révoque aucun : sans ce test, un
    // compte suspendu se re-délivrerait des access tokens indéfiniment.
    if (!user || user.status !== "ACTIVE") throw this.unauthenticated();

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

  /**
   * Ligne BDD → DTO. Construit champ par champ, JAMAIS par spread : c'est ce
   * qui garantit que `passwordHash` (désormais sélectionné, A10) ne peut pas
   * sortir. Les deux colonnes sensibles ne produisent que des BOOLÉENS.
   */
  private toAuthUserDTO(user: AuthUserRow): AuthUserDTO {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      emailVerified: user.emailVerifiedAt !== null,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      // D42 — pilote l'écran mot de passe côté A11 : un compte Google-only
      // doit se voir proposer de DÉFINIR un mot de passe, pas d'en changer un
      // qui n'existe pas.
      hasPassword: user.passwordHash !== null,
      hasGoogle: user.googleSub !== null,
      proProfile: user.proProfile
        ? {
            businessName: user.proProfile.businessName,
            phone: user.proProfile.phone,
            phone2: user.proProfile.phone2
          }
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
      select: { id: true, email: true, role: true, locale: true, status: true }
    });

    // Volontairement AUCUNE condition sur emailVerifiedAt : reset et
    // vérification sont deux flux distincts — un PRO non vérifié qui a perdu
    // son mot de passe doit pouvoir le récupérer (il restera bloqué au login
    // par D1 tant qu'il n'a pas vérifié, mais c'est l'affaire de l'AUTRE flux).
    //
    // §2.0 (A10) — compte non ACTIVE : la réponse reste STRICTEMENT la même
    // (202 constant), mais aucun token n'est émis et aucun e-mail ne part.
    // Sans ce test, une suppression validée n'empêcherait pas un lien de reset
    // d'arriver dans une boîte encore vivante entre-temps.
    if (user && user.status === "ACTIVE") {
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
      select: { id: true, userId: true, user: { select: { status: true } } }
    });

    // D16 — un seul code pour inconnu/expiré/déjà utilisé : pas d'oracle
    // (même patron que verify-email).
    //
    // §2.0 (A10) — un compte non ACTIVE tombe dans CE MÊME code, et pas dans
    // celui du login : ce chemin raisonne en TOKEN, pas en identifiants. Un
    // lien émis avant la suspension cesse ainsi d'être exploitable, sans
    // introduire un vocabulaire d'erreur étranger au flux.
    if (!token || token.user.status !== "ACTIVE") {
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
