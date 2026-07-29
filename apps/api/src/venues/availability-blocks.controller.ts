// Blocages de disponibilité côté PRO — Lot B3, D51.
//
// Topologie A2 respectée (arbitrage écrit dans `venues.controller.ts`) : les
// ÉCRITURES pro restent nues sur /venues, les LECTURES pro portent le préfixe
// /pro. Le backlog écrivait `POST /venues/:id/availability/block` — périmé : la
// ressource est plurielle, elle se liste et se supprime.
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  UserRole,
  availabilityBlockCreateSchema,
  availabilityWindowQuerySchema,
  type AvailabilityBlockCreateInput,
  type AvailabilityBlockDTO,
  type AvailabilityWindowQueryInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AvailabilityBlocksService } from "./availability-blocks.service";

@ApiTags("venues-pro")
@Roles(UserRole.PRO)
@Controller()
export class AvailabilityBlocksController {
  constructor(private readonly blocks: AvailabilityBlocksService) {}

  @Get("pro/venues/:id/availability-blocks")
  @ApiOperation({ summary: "Mes blocages recouvrant la fenêtre — MÊME schéma de fenêtre que l'endpoint public" })
  @ApiOkResponse({ description: "AvailabilityBlockDTO[] trié par début. Heures en repère civil LOCAL (D51)." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle inexistante, supprimée ou d'un autre pro." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(availabilityWindowQuerySchema)) query: AvailabilityWindowQueryInput
  ): Promise<AvailabilityBlockDTO[]> {
    return this.blocks.list(user.userId, id, query);
  }

  @Post("venues/:id/availability-blocks")
  @ApiOperation({ summary: "Bloque une plage (congés, travaux) — date-heures civiles LOCALES, sans décalage" })
  @ApiCreatedResponse({ description: "AvailabilityBlockDTO relu dans le MÊME repère civil que l'écriture." })
  @ApiBadRequestResponse({ description: "Date-heure irréelle, ou endsAt ≤ startsAt." })
  @ApiConflictResponse({
    description:
      "AVAILABILITY_BLOCK_CONFLICT : la plage recouvre une réservation ACCEPTED/CONFIRMED. Une demande PENDING, " +
      "elle, ne s'y oppose pas — elle ne verrouille rien."
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(availabilityBlockCreateSchema)) body: AvailabilityBlockCreateInput
  ): Promise<AvailabilityBlockDTO> {
    return this.blocks.create(user.userId, id, body);
  }

  @Delete("venues/:id/availability-blocks/:blockId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Lève un blocage — suppression DURE, autorisée même sur une plage passée" })
  @ApiNoContentResponse({ description: "204, sans corps." })
  @ApiNotFoundResponse({ description: "404 indistinct : AVAILABILITY_BLOCK_NOT_FOUND (autre salle, id malformé)." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("blockId") blockId: string
  ): Promise<void> {
    return this.blocks.remove(user.userId, id, blockId);
  }
}
