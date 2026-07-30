// Créneaux de visite — lecture PUBLIQUE, Flux C, Lot C2.
//
// Endpoint distinct de `/availability` : D47 sépare totalement les deux
// systèmes. Les fusionner obligerait un client venu réserver une fête à
// recevoir les créneaux de visite, et réciproquement — deux intentions
// différentes, deux réponses.
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  availabilityWindowQuerySchema,
  type AvailabilityWindowQueryInput,
  type VenueVisitSlotsResponse
} from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitSlotsService } from "./visit-slots.service";

@ApiTags("venues-public")
@Public()
@Controller("venues")
export class VisitSlotsController {
  constructor(private readonly visitSlots: VisitSlotsService) {}

  @Get(":slug/visit-slots")
  @ApiOperation({
    summary: "Créneaux de visite disponibles d'une salle publiée",
    description:
      "Même fenêtre que /availability (92 jours, bornes écrêtées D49). Les créneaux durent 30 minutes (D58). " +
      "`taken` est INFORMATIF : les visites tolèrent le chevauchement (D47)."
  })
  @ApiOkResponse({ description: "VenueVisitSlotsResponse. Créneaux passés exclus à la minute près." })
  @ApiBadRequestResponse({ description: "Date irréelle, to < from, ou fenêtre de plus de 92 jours." })
  @ApiNotFoundResponse({ description: "404 indistinct : brouillon, masquée, supprimée ou slug inconnu." })
  bySlug(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(availabilityWindowQuerySchema)) query: AvailabilityWindowQueryInput
  ): Promise<VenueVisitSlotsResponse> {
    return this.visitSlots.bySlug(slug, query);
  }
}
