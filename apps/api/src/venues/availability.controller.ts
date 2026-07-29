// Disponibilité publique — Lot B3.
//
// Throttle global CONSERVÉ (pas de @SkipThrottle) : ce n'est pas un asset
// immuable comme /media/:key, c'est une lecture calculée sur 92 jours.
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  availabilityWindowQuerySchema,
  type AvailabilityWindowQueryInput,
  type VenueAvailabilityResponse
} from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AvailabilityService } from "./availability.service";

@ApiTags("venues-public")
@Public()
@Controller("venues")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(":slug/availability")
  @ApiOperation({
    summary: "Calendrier de disponibilité et de prix d'une salle publiée",
    description:
      "Fenêtre de 92 jours maximum, bornes incluses. Les bornes du passé et de l'horizon 18 mois sont ÉCRÊTÉES, " +
      "jamais rejetées (D49) : la réponse renvoie le from/to EFFECTIFS."
  })
  @ApiOkResponse({ description: "VenueAvailabilityResponse. Dates civiles locales d'Alger (D48)." })
  @ApiBadRequestResponse({ description: "Date irréelle, to < from, ou fenêtre de plus de 92 jours." })
  @ApiNotFoundResponse({ description: "404 indistinct : brouillon, masquée, supprimée ou slug inconnu." })
  bySlug(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(availabilityWindowQuerySchema)) query: AvailabilityWindowQueryInput
  ): Promise<VenueAvailabilityResponse> {
    return this.availability.bySlug(slug, query);
  }
}
