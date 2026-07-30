// Règles de prix côté PRO — Lot B2, D46. Écritures NUES sur /venues (topologie
// A2). Aucune lecture : les règles voyagent dans
// VenueProDTO.slotTemplates[].pricingRules — un créneau sans ses règles est un
// prix sans son contexte.
import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  UserRole,
  pricingRuleCreateSchema,
  pricingRuleUpdateSchema,
  type PricingRuleCreateInput,
  type PricingRuleDTO,
  type PricingRuleUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PricingRulesService } from "./pricing-rules.service";

@ApiTags("venues-pro")
@Roles(UserRole.PRO)
@Controller()
export class PricingRulesController {
  constructor(private readonly rules: PricingRulesService) {}

  @Post("venues/:id/slot-templates/:slotId/pricing-rules")
  @ApiOperation({ summary: "Ajoute une variante de prix au créneau (prix ABSOLU — D46, jamais un multiplicateur)" })
  @ApiCreatedResponse({ description: "PricingRuleDTO. Le « à partir de » de la salle est recalculé." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Body(new ZodValidationPipe(pricingRuleCreateSchema)) body: PricingRuleCreateInput
  ): Promise<PricingRuleDTO> {
    return this.rules.create(user.userId, id, slotId, body);
  }

  @Patch("venues/:id/slot-templates/:slotId/pricing-rules/:ruleId")
  @ApiOperation({ summary: "Mise à jour PARTIELLE. Le type n'est pas modifiable : supprimer et recréer." })
  @ApiOkResponse({ description: "PricingRuleDTO à jour." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Param("ruleId") ruleId: string,
    @Body(new ZodValidationPipe(pricingRuleUpdateSchema)) body: PricingRuleUpdateInput
  ): Promise<PricingRuleDTO> {
    return this.rules.update(user.userId, id, slotId, ruleId, body);
  }

  @Delete("venues/:id/slot-templates/:slotId/pricing-rules/:ruleId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Suppression dure — une règle n'est jamais référencée, le prix est FIGÉ dans la demande" })
  @ApiNoContentResponse({ description: "204, sans corps." })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Param("ruleId") ruleId: string
  ): Promise<void> {
    return this.rules.remove(user.userId, id, slotId, ruleId);
  }
}
