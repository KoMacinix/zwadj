// Endpoints ADMIN des salles (Lot A3). Le chemin « commission-rate » garde le
// nom du cadrage mais porte les DEUX taux D35 (Ko les règle ensemble, salle
// par salle). @Roles(ADMIN) au niveau classe : CLIENT et PRO → 403 — un pro
// ne publie jamais sa propre salle, et ne voit jamais ces taux.
import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  UserRole,
  venueRatesUpdateSchema,
  type VenueAdminDTO,
  type VenueRatesUpdateInput
} from "@zwadj/types";
import { Roles } from "../auth/auth.decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenuesAdminService } from "./venues-admin.service";

@ApiTags("venues-admin")
@Roles(UserRole.ADMIN)
@Controller("admin/venues")
export class VenuesAdminController {
  constructor(private readonly venues: VenuesAdminService) {}

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publie une salle (DRAFT → PUBLISHED, one-way) — idempotent si déjà publiée" })
  @ApiOkResponse({ description: "VenueAdminDTO (vue pro + les deux taux D35). 200 même si déjà publiée, sans effet." })
  @ApiNotFoundResponse({ description: "404 indistinct : inexistante, supprimée ou id malformé." })
  publish(@Param("id") id: string): Promise<VenueAdminDTO> {
    return this.venues.publish(id);
  }

  @Patch(":id/commission-rate")
  @ApiOperation({ summary: "Règle commissionRateBps et/ou cashbackRateBps (D35 : cashback ≤ commission)" })
  @ApiOkResponse({ description: "VenueAdminDTO à jour. Corps partiel ; contrainte croisée fusionnée avec l'existant." })
  @ApiNotFoundResponse({ description: "404 indistinct (cf. publish)." })
  setRates(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(venueRatesUpdateSchema)) body: VenueRatesUpdateInput
  ): Promise<VenueAdminDTO> {
    return this.venues.setRates(id, body);
  }
}
