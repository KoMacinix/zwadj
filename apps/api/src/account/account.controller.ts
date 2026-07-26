import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  changeEmailSchema,
  changePasswordSchema,
  deletionRequestSchema,
  profileUpdateSchema,
  type ChangeEmailInput,
  type ChangeEmailResponse,
  type ChangePasswordInput,
  type ChangePasswordResponse,
  type DeletionRequestDTO,
  type DeletionRequestInput,
  type MeResponse,
  type ProfileUpdateInput
} from "@zwadj/types";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";
import { AUTH } from "../auth/auth.constants";
import { CurrentUser } from "../auth/auth.decorators";
import { AuthService } from "../auth/auth.service";
import { AUTH_THROTTLE } from "../auth/auth.throttle";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountService } from "./account.service";

/**
 * Lot A10 — gestion du compte authentifié. Pas de `@Public()` ici : le
 * `JwtAuthGuard` est global et fermé par défaut (D6), donc toutes ces routes
 * exigent une session sans qu'on ait à le déclarer.
 *
 * Les mutations de profil et d'e-mail répondent avec un `AuthUserDTO` complet
 * (relecture de `/auth/me`) plutôt qu'avec un format de profil dédié : le
 * front n'a alors qu'UN chemin d'hydratation de session (D12), et les quatre
 * champs ajoutés par A10 (`phone`, `hasPassword`, `hasGoogle`,
 * `proProfile.phone2`) arrivent par la même porte que partout ailleurs.
 */
@ApiTags("account")
@ApiBearerAuth()
@Controller("me")
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly deletion: AccountDeletionService,
    private readonly auth: AuthService,
    private readonly config: ConfigService
  ) {}

  @Patch("profile")
  @ApiOperation({ summary: "Met à jour le profil (patch PARTIEL) — champs triés par rôle côté serveur" })
  @ApiOkResponse({ description: "AuthUserDTO à jour (même forme que GET /auth/me)" })
  @ApiBadRequestResponse({ description: "PROFILE_FIELD_NOT_ALLOWED | PRO_PHONE_REQUIRED | corps vide" })
  @ApiUnauthorizedResponse({ description: "ACCOUNT_NOT_ACTIVE (compte suspendu/anonymisé)" })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(profileUpdateSchema)) body: ProfileUpdateInput
  ): Promise<MeResponse> {
    await this.account.updateProfile(user.userId, body);
    return this.auth.me(user.userId);
  }

  @Post("change-email")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: AUTH_THROTTLE.changeEmail })
  @ApiOperation({ summary: "Demande un changement d'e-mail — lien envoyé à la NOUVELLE adresse, aucune bascule" })
  @ApiOkResponse({ description: "202 { status: 'pending_verification', pendingEmail } — l'ancienne adresse reste active" })
  @ApiBadRequestResponse({ description: "EMAIL_UNCHANGED" })
  @ApiConflictResponse({ description: "EMAIL_ALREADY_USED" })
  changeEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changeEmailSchema)) body: ChangeEmailInput
  ): Promise<ChangeEmailResponse> {
    return this.account.requestEmailChange(user.userId, body.newEmail);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.changePassword })
  @ApiOperation({
    summary: "Modifie OU définit le mot de passe (D42) — le mode vient de l'état en base, jamais du client"
  })
  @ApiOkResponse({ description: "{ status: 'ok' } + rotation du cookie de CETTE session ; les autres sont révoquées" })
  @ApiBadRequestResponse({ description: "CURRENT_PASSWORD_REQUIRED | CURRENT_PASSWORD_INVALID" })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ChangePasswordResponse> {
    const { refreshCookie } = await this.account.changePassword(user.userId, body, this.refreshCookieFrom(req));
    // Rotation : le cookie précédent vient d'être révoqué en base. Ne pas le
    // remplacer laisserait le navigateur avec un jeton mort — et le prochain
    // refresh serait vu comme une RÉUTILISATION (D10), donc révoquerait tout.
    if (refreshCookie) {
      res.cookie(AUTH.REFRESH_COOKIE_NAME, refreshCookie.value, this.refreshCookieOptions(refreshCookie));
    }
    return { status: "ok" };
  }

  @Get("deletion-request")
  @ApiOperation({ summary: "Demande de suppression en cours (ou la plus récente), sinon null" })
  @ApiOkResponse({ description: "DeletionRequestDTO | null — A11 en dérive ses trois états d'écran" })
  getDeletionRequest(@CurrentUser() user: AuthenticatedUser): Promise<DeletionRequestDTO | null> {
    return this.deletion.current(user.userId);
  }

  @Post("deletion-request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Dépose une DEMANDE de suppression (D37) — ne supprime rien, validée par l'admin" })
  @ApiConflictResponse({ description: "DELETION_REQUEST_ALREADY_PENDING (index unique partiel en base)" })
  requestDeletion(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(deletionRequestSchema)) body: DeletionRequestInput
  ): Promise<DeletionRequestDTO> {
    return this.deletion.request(user.userId, body.reason);
  }

  @Post("deletion-request/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retire sa demande tant qu'elle est PENDING — c'est cette réversibilité qui rend D37 tenable" })
  @ApiNotFoundResponse({ description: "DELETION_REQUEST_NOT_FOUND (aucune demande en attente)" })
  cancelDeletion(@CurrentUser() user: AuthenticatedUser): Promise<DeletionRequestDTO> {
    return this.deletion.cancel(user.userId);
  }

  private refreshCookieFrom(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[AUTH.REFRESH_COOKIE_NAME];
  }

  /** Attributs IDENTIQUES à ceux d'AuthController (D2/D7/D27) : un cookie posé
   *  ici avec d'autres attributs coexisterait avec l'ancien au lieu de le
   *  remplacer — le navigateur matche par nom + path. */
  private refreshCookieOptions(cookie: { expiresAt: Date; persistent: boolean }): CookieOptions {
    const base: CookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.getOrThrow<boolean>("AUTH_COOKIE_SECURE"),
      path: AUTH.REFRESH_COOKIE_PATH
    };
    return cookie.persistent ? { ...base, expires: cookie.expiresAt } : base;
  }
}
