import { Controller, Get, Param } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { opaqueTokenSchema, type ConfirmEmailChangeResponse } from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { AUTH_THROTTLE } from "../auth/auth.throttle";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AccountService } from "./account.service";

/**
 * Route PUBLIQUE de confirmation du changement d'e-mail (A10).
 *
 * Pourquoi publique, et pourquoi sous `/auth` alors que la demande est sous
 * `/me` : le lien arrive dans la NOUVELLE boîte, qui peut être ouverte dans un
 * autre navigateur, sans session. Le TOKEN est l'authentification — exactement
 * comme `verify-email` et `reset-password`, dont cette route reprend le
 * préfixe, la méthode et le budget de throttling.
 *
 * Contrôleur séparé plutôt qu'une route `@Public()` glissée dans
 * `AccountController` : une route non authentifiée au milieu d'un contrôleur
 * dont tout le reste exige une session est exactement le genre de détail qu'on
 * ne voit plus au bout de six mois.
 */
@ApiTags("account")
@Controller("auth")
export class AccountPublicController {
  constructor(private readonly account: AccountService) {}

  @Public()
  @Get("confirm-email-change/:token")
  @Throttle({ default: AUTH_THROTTLE.verifyEmail })
  @ApiOperation({ summary: "Confirme le changement d'e-mail (token à usage unique, 48 h) — c'est ICI que ça bascule" })
  @ApiOkResponse({ description: "{ status: 'changed', email }" })
  @ApiBadRequestResponse({ description: "TOKEN_INVALID_OR_EXPIRED (inconnu / expiré / déjà utilisé — indistincts)" })
  @ApiConflictResponse({ description: "EMAIL_ALREADY_USED (adresse prise entre la demande et le clic)" })
  confirm(
    @Param("token", new ZodValidationPipe(opaqueTokenSchema)) token: string
  ): Promise<ConfirmEmailChangeResponse> {
    return this.account.confirmEmailChange(token);
  }
}
