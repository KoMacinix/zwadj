import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  UserRole,
  deletionDecisionSchema,
  deletionRequestQuerySchema,
  type AdminDeletionRequestDTO,
  type DeletionDecisionInput,
  type DeletionRequestDTO,
  type DeletionRequestQueryInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AccountDeletionService } from "./account-deletion.service";

/**
 * File de validation des demandes de suppression (D37) — endpoints protégés,
 * pas d'`apps/admin` (D4 : validation par endpoints + DBeaver).
 * `@Roles(ADMIN)` au niveau CLASSE, patron `VenuesAdminController` : un CLIENT
 * ou un PRO reçoit 403 sur toutes les routes, y compris celles ajoutées plus
 * tard dans ce fichier.
 */
@ApiTags("account-admin")
@Roles(UserRole.ADMIN)
@Controller("admin/deletion-requests")
export class AccountAdminController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Get()
  @ApiOperation({ summary: "File des demandes (défaut PENDING), la plus ancienne d'abord" })
  @ApiOkResponse({ description: "AdminDeletionRequestDTO[] — dont venueCount : les salles qui SERAIENT archivées" })
  list(
    @Query(new ZodValidationPipe(deletionRequestQuerySchema)) query: DeletionRequestQueryInput
  ): Promise<AdminDeletionRequestDTO[]> {
    return this.deletion.list(query);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approuve : anonymise le compte et ARCHIVE ses salles (D41). Aucun DELETE SQL, action irréversible en libre-service."
  })
  @ApiOkResponse({ description: "DeletionRequestDTO (APPROVED). L'e-mail de décision part après commit." })
  @ApiNotFoundResponse({ description: "DELETION_REQUEST_NOT_FOUND" })
  @ApiBadRequestResponse({ description: "DELETION_REQUEST_NOT_PENDING (déjà décidée ou annulée entre-temps)" })
  approve(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(deletionDecisionSchema)) body: DeletionDecisionInput
  ): Promise<DeletionRequestDTO> {
    return this.deletion.approve(id, admin.userId, body.decisionNote);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refuse : AUCUN effet sur le compte, qui reste ACTIVE. Le motif est transmis à l'utilisateur." })
  @ApiOkResponse({ description: "DeletionRequestDTO (REJECTED)" })
  @ApiNotFoundResponse({ description: "DELETION_REQUEST_NOT_FOUND" })
  @ApiBadRequestResponse({ description: "DELETION_REQUEST_NOT_PENDING" })
  reject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(deletionDecisionSchema)) body: DeletionDecisionInput
  ): Promise<DeletionRequestDTO> {
    return this.deletion.reject(id, admin.userId, body.decisionNote);
  }
}
