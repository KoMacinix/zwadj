import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  opaqueTokenSchema,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
  type LoginInput,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
  type RefreshResponse,
  type RegisterInput,
  type RegisterResponse,
  type ResendVerificationInput,
  type ResendVerificationResponse,
  type ResetPasswordInput,
  type ResetPasswordResponse,
  type VerifyEmailResponse
} from "@zwadj/types";
import type { CookieOptions, Request, Response } from "express";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AUTH } from "./auth.constants";
import { CurrentUser, Public } from "./auth.decorators";
import { AUTH_THROTTLE } from "./auth.throttle";
import { AuthService } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: AUTH_THROTTLE.register })
  @ApiOperation({ summary: "Inscription (CLIENT ou PRO — union discriminée par rôle)" })
  @ApiCreatedResponse({ description: "Compte créé ; email de vérification envoyé." })
  @ApiConflictResponse({ description: "EMAIL_ALREADY_USED" })
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<RegisterResponse> {
    return this.auth.register(body);
  }

  @Public()
  @Get("verify-email/:token")
  @Throttle({ default: AUTH_THROTTLE.verifyEmail })
  @ApiOperation({ summary: "Vérifie l'email (token à usage unique, 48 h)" })
  @ApiOkResponse({ description: "{ status: 'verified' }" })
  verifyEmail(
    @Param("token", new ZodValidationPipe(opaqueTokenSchema)) token: string
  ): Promise<VerifyEmailResponse> {
    return this.auth.verifyEmail(token);
  }

  @Public()
  @Post("resend-verification")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: AUTH_THROTTLE.resend })
  @ApiOperation({ summary: "Renvoie le lien de vérification (réponse constante, anti-énumération)" })
  resend(
    @Body(new ZodValidationPipe(resendVerificationSchema)) body: ResendVerificationInput
  ): Promise<ResendVerificationResponse> {
    return this.auth.resendVerification(body.email);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.login })
  @ApiOperation({ summary: "Connexion (D1 par rôle) — access token dans le corps, refresh en cookie httpOnly" })
  @ApiOkResponse({ description: "{ accessToken, user } + Set-Cookie zwadj_rt (httpOnly, path /api/v1/auth)" })
  @ApiUnauthorizedResponse({ description: "INVALID_CREDENTIALS (email inconnu OU mauvais mot de passe — indistincts)" })
  @ApiForbiddenResponse({ description: "EMAIL_NOT_VERIFIED (PRO/ADMIN non vérifié — D1)" })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponse> {
    const { response, refreshCookie } = await this.auth.login(body);
    res.cookie(AUTH.REFRESH_COOKIE_NAME, refreshCookie.value, this.refreshCookieOptions(refreshCookie));
    return response;
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Profil de l'utilisateur authentifié (lecture BDD fraîche — source du bandeau D1)" })
  @ApiOkResponse({ description: "AuthUserDTO — emailVerified à jour, proProfile si PRO" })
  @ApiUnauthorizedResponse({ description: "UNAUTHENTICATED (token absent/invalide/expiré, ou compte disparu)" })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.auth.me(user.userId);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: AUTH_THROTTLE.forgot })
  @ApiOperation({ summary: "Demande de réinitialisation (réponse constante, anti-énumération — D14)" })
  @ApiOkResponse({ description: "202 { status: 'ok' } que l'email existe ou non" })
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput
  ): Promise<ForgotPasswordResponse> {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.reset })
  @ApiOperation({ summary: "Réinitialisation par token (usage unique, révoque toutes les sessions — D15/D16)" })
  @ApiOkResponse({ description: "{ status: 'ok' } — ne connecte pas (D17), l'utilisateur se reconnecte" })
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput
  ): Promise<ResetPasswordResponse> {
    return this.auth.resetPassword(body.token, body.password);
  }

  // @Public assumé (D9) : au moment du refresh, l'access token est précisément
  // expiré — l'authentification EST le cookie zwadj_rt, validé par le service.
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.refresh })
  @ApiOperation({ summary: "Rotation du refresh token (D9/D10) — réponse au format login (D12)" })
  @ApiOkResponse({ description: "{ accessToken, user } + nouveau cookie zwadj_rt (l'ancien est consommé)" })
  @ApiUnauthorizedResponse({ description: "UNAUTHENTICATED — cookie absent/inconnu/expiré/réutilisé (indistincts)" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<RefreshResponse> {
    const { response, refreshCookie } = await this.auth.refresh(this.refreshCookieFrom(req));
    res.cookie(AUTH.REFRESH_COOKIE_NAME, refreshCookie.value, this.refreshCookieOptions(refreshCookie));
    return response;
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.logout })
  @ApiOperation({ summary: "Déconnexion (D11) — idempotente, ne révoque que la session de CE navigateur" })
  @ApiOkResponse({ description: "{ status: 'ok' } constant + effacement du cookie (même sans session valide)" })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<LogoutResponse> {
    await this.auth.logout(this.refreshCookieFrom(req));
    // Effacement : mêmes attributs que la pose (express matche par name+path),
    // sinon le navigateur garderait l'ancien cookie à côté du « vide ».
    res.clearCookie(AUTH.REFRESH_COOKIE_NAME, this.clearCookieOptions());
    return { status: "ok" };
  }

  private refreshCookieFrom(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[AUTH.REFRESH_COOKIE_NAME];
  }

  /**
   * Attributs du cookie refresh (D2/D7) : httpOnly (inaccessible au JS),
   * SameSite=Lax + path restreint à /api/v1/auth (le navigateur ne l'envoie
   * ni cross-site en POST, ni sur le reste de l'API — mitigation CSRF assumée
   * au MVP), Secure piloté par env (exigé explicitement en prod),
   * expiration ALIGNÉE sur la ligne refresh_tokens créée en base — SAUF si
   * « se souvenir de moi » est décoché (Lot 7/D27) : aucun expires/maxAge,
   * le cookie devient un cookie de SESSION qui meurt avec le navigateur
   * (la ligne en base garde son TTL serveur : elle expire ou sera nettoyée).
   */
  private refreshCookieOptions(cookie: { expiresAt: Date; persistent: boolean }): CookieOptions {
    const base = this.clearCookieOptions();
    return cookie.persistent ? { ...base, expires: cookie.expiresAt } : base;
  }

  private clearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.getOrThrow<boolean>("AUTH_COOKIE_SECURE"),
      path: AUTH.REFRESH_COOKIE_PATH
    };
  }
}
