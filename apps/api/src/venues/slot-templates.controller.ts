// Créneaux de fête côté PRO — Lot B1, D46.
//
// Topologie A2 respectée : les ÉCRITURES pro restent nues sur /venues, seules
// les lectures pro portent le préfixe /pro. Il n'y a d'ailleurs AUCUNE lecture
// ici : les créneaux voyagent dans VenueProDTO.slotTemplates, comme les photos
// (Lot A4) — un seul aller-retour pour peupler l'écran d'édition.
import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  UserRole,
  slotTemplateCreateSchema,
  slotTemplateUpdateSchema,
  type SlotTemplateCreateInput,
  type SlotTemplateDTO,
  type SlotTemplateUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SlotTemplatesService } from "./slot-templates.service";

@ApiTags("venues-pro")
@Roles(UserRole.PRO)
@Controller()
export class SlotTemplatesController {
  constructor(private readonly slots: SlotTemplatesService) {}

  @Post("venues/:id/slot-templates")
  @ApiOperation({ summary: "Crée un créneau de fête (nom FR/AR, bornes en minutes, PRIX — D46)" })
  @ApiCreatedResponse({ description: "SlotTemplateDTO. venues.base_price_cents est recalculé dans la même transaction." })
  @ApiConflictResponse({ description: "SLOT_TEMPLATE_OVERLAP · SLOT_TEMPLATE_SINGLE_MODE" })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(slotTemplateCreateSchema)) body: SlotTemplateCreateInput
  ): Promise<SlotTemplateDTO> {
    return this.slots.create(user.userId, id, body);
  }

  @Patch("venues/:id/slot-templates/:slotId")
  @ApiOperation({ summary: "Mise à jour PARTIELLE ; { isActive: false } = retrait sans casser l'historique" })
  @ApiOkResponse({ description: "SlotTemplateDTO à jour." })
  @ApiConflictResponse({ description: "SLOT_TEMPLATE_OVERLAP · SLOT_TEMPLATE_SINGLE_MODE · SLOT_TEMPLATE_REQUIRED" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Body(new ZodValidationPipe(slotTemplateUpdateSchema)) body: SlotTemplateUpdateInput
  ): Promise<SlotTemplateDTO> {
    return this.slots.update(user.userId, id, slotId, body);
  }

  @Delete("venues/:id/slot-templates/:slotId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Suppression DURE — refusée dès qu'un devis ou une réservation référence le créneau" })
  @ApiNoContentResponse({ description: "204, sans corps." })
  @ApiConflictResponse({ description: "SLOT_TEMPLATE_IN_USE · SLOT_TEMPLATE_REQUIRED" })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string
  ): Promise<void> {
    return this.slots.remove(user.userId, id, slotId);
  }
}
