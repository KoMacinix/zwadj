// Lecture PUBLIQUE des salles (Lot A3) — @Public() : pas d'authentification,
// throttle GLOBAL conservé (pas de @SkipThrottle : contrairement à /media,
// ces réponses ne sont pas des assets cachables « immutable »).
// Cohabitation de routes : les écritures pro vivent sur les MÊMES chemins
// /venues avec d'autres verbes (POST/PATCH/DELETE, Lot A2) — aucun conflit.
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  venueListQuerySchema,
  type VenueListQueryInput,
  type VenueListResponse,
  type VenuePublicDTO
} from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenuesPublicService } from "./venues-public.service";

@ApiTags("venues-public")
@Public()
@Controller("venues")
export class VenuesPublicController {
  constructor(private readonly venues: VenuesPublicService) {}

  @Get()
  @ApiOperation({ summary: "Liste publique (PUBLISHED + ACTIVE) — filtres ville/invités/prix/amenities, tri, pagination" })
  @ApiOkResponse({ description: "{ items: VenueSummaryDTO[], total, page, pageSize } — jamais de taux." })
  list(@Query(new ZodValidationPipe(venueListQuerySchema)) query: VenueListQueryInput): Promise<VenueListResponse> {
    return this.venues.list(query);
  }

  @Get(":slug")
  @ApiOperation({ summary: "Détail public par slug (D33 : TEMPORARILY_UNAVAILABLE visible avec bandeau, HIDDEN = 404)" })
  @ApiOkResponse({ description: "VenuePublicDTO (ville imbriquée + amenities) — jamais de taux." })
  @ApiNotFoundResponse({ description: "404 indistinct : draft, masquée, supprimée, slug inconnu ou hors motif." })
  bySlug(@Param("slug") slug: string): Promise<VenuePublicDTO> {
    return this.venues.bySlug(slug);
  }
}
