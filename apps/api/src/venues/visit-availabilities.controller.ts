// Plages de visite côté PRO — Flux C, Lot C1, D47.
//
// Topologie A2 : les ÉCRITURES restent nues sur /venues, la LECTURE porte le
// préfixe /pro.
//
// ⚠ Les plages de visite ne voyagent PAS dans `VenueProDTO`, contrairement aux
// créneaux de fête. D47 en fait un système à part, avec son propre écran :
// les embarquer dans le DTO de la salle coupleraient l'écran d'édition des
// fêtes à celui des visites, et feraient porter à chaque lecture de salle des
// données qu'elle n'utilise pas.
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
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
  visitAvailabilityCreateSchema,
  visitAvailabilityUpdateSchema,
  type VisitAvailabilityCreateInput,
  type VisitAvailabilityDTO,
  type VisitAvailabilityUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitAvailabilitiesService } from "./visit-availabilities.service";

@ApiTags("venues-pro")
@Roles(UserRole.PRO)
@Controller()
export class VisitAvailabilitiesController {
  constructor(private readonly visits: VisitAvailabilitiesService) {}

  @Get("pro/venues/:id/visit-availabilities")
  @ApiOperation({ summary: "Mes plages hebdomadaires de visite, triées par jour puis par heure" })
  @ApiOkResponse({ description: "VisitAvailabilityDTO[]. dayOfWeek : 0 = dimanche … 6 = samedi (D56)." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle inexistante, supprimée ou d'un autre pro." })
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<VisitAvailabilityDTO[]> {
    return this.visits.list(user.userId, id);
  }

  @Post("venues/:id/visit-availabilities")
  @ApiOperation({ summary: "Déclare une plage de visite hebdomadaire — « le dimanche de 09:00 à 17:00 »" })
  @ApiCreatedResponse({ description: "VisitAvailabilityDTO créée." })
  @ApiBadRequestResponse({
    description: "Jour hors 0–6, minutes hors journée, ou fin ≤ début. Une visite ne franchit PAS minuit."
  })
  @ApiConflictResponse({ description: "VISIT_AVAILABILITY_OVERLAP : une plage du même jour la recouvre déjà." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(visitAvailabilityCreateSchema)) body: VisitAvailabilityCreateInput
  ): Promise<VisitAvailabilityDTO> {
    return this.visits.create(user.userId, id, body);
  }

  @Patch("venues/:id/visit-availabilities/:availabilityId")
  @ApiOperation({ summary: "Modifie une plage. `isActive: false` la SUSPEND sans la perdre." })
  @ApiOkResponse({ description: "VisitAvailabilityDTO à jour." })
  @ApiConflictResponse({ description: "VISIT_AVAILABILITY_OVERLAP sur l'état RÉSULTANT, pas sur le patch seul." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("availabilityId") availabilityId: string,
    @Body(new ZodValidationPipe(visitAvailabilityUpdateSchema)) body: VisitAvailabilityUpdateInput
  ): Promise<VisitAvailabilityDTO> {
    return this.visits.update(user.userId, id, availabilityId, body);
  }

  @Delete("venues/:id/visit-availabilities/:availabilityId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Retire une plage. N'annule AUCUN rendez-vous déjà pris." })
  @ApiNoContentResponse({ description: "204, sans corps." })
  @ApiNotFoundResponse({ description: "404 indistinct : VISIT_AVAILABILITY_NOT_FOUND." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("availabilityId") availabilityId: string
  ): Promise<void> {
    return this.visits.remove(user.userId, id, availabilityId);
  }
}
