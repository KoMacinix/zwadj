// Carte des salles (lot CA-1, session « carte ») — @Public() : pas
// d'authentification, throttle GLOBAL conservé, comme la liste.
//
// ⚠ Contrôleur À PART, chemin `venue-map` et non `venues/map` : sous `/venues`,
// « map » serait lu comme un slug par `GET /venues/:slug` — ou l'inverse selon
// l'ordre de déclaration — et la fiche d'une salle nommée « Map » disparaîtrait
// sans erreur. Une route sœur ne peut pas entrer en collision (précédent :
// `/venue-styles`). Gardé par `venue-map.int-spec.ts`.
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { venueListQuerySchema, type VenueListQueryInput, type VenueMapResponse } from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenuesPublicService } from "./venues-public.service";

@ApiTags("venues-public")
@Public()
@Controller("venue-map")
export class VenueMapController {
  constructor(private readonly venues: VenuesPublicService) {}

  @Get()
  @ApiOperation({
    summary: "Points de la carte — les salles de la liste (mêmes filtres) qui ont des coordonnées, sans pagination, plafonnés"
  })
  @ApiOkResponse({
    description: "{ points: VenueMapPointDTO[], total, withoutCoordinates, truncated, limit, availableOn } — jamais de taux."
  })
  @ApiBadRequestResponse({ description: "Même schéma que la liste : filtre mal formé, date passée ou hors horizon." })
  // ⚠ LE SCHÉMA DE LA LISTE, tel quel — pas une copie, pas un dérivé : « les
  // mêmes filtres » est alors structurel. `page` et `pageSize` sont acceptés et
  // ignorés par le service.
  map(@Query(new ZodValidationPipe(venueListQuerySchema)) query: VenueListQueryInput): Promise<VenueMapResponse> {
    return this.venues.map(query);
  }
}
