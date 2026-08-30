// Disponibilité publique — Lot B3.
//
// Throttle global CONSERVÉ (pas de @SkipThrottle) : ce n'est pas un asset
// immuable comme /media/:key, c'est une lecture calculée sur 92 jours.
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  availabilityWindowQuerySchema,
  UserRole,
  type AvailabilityWindowQueryInput,
  type VenueAvailabilityResponse
} from "@zwadj/types";
import { CurrentUser, Public, Roles } from "../auth/auth.decorators";
// ⚠ `AuthenticatedUser` vit dans `auth.types`, pas dans `auth.decorators` : ce
// dernier l'importe sans le réexporter. C'est l'import que tous les autres
// contrôleurs pro utilisent — je l'avais écrit de mémoire au lieu de le relever
// sur `visit-bookings.controller.ts`, et le typecheck API m'est inaccessible dans
// le bac à sable (client Prisma bloqué par la politique réseau).
import type { AuthenticatedUser } from "../auth/auth.types";
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

/** Porte PRO du MÊME calendrier — correction du 404 sur salle non publiée.
 *
 *  ⚠ Contrôleur SÉPARÉ, et non une méthode de plus dans celui du haut : le
 *  premier porte `@Public()` au niveau de la classe. Ajouter une route
 *  authentifiée dessous l'aurait rendue publique en silence — un décorateur de
 *  classe ne se voit pas depuis la méthode qu'on écrit. */
@ApiTags("venues-pro")
@Controller("pro/venues")
export class AvailabilityProController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(":id/availability")
  @Roles(UserRole.PRO)
  @ApiOperation({
    summary: "Calendrier de disponibilité et de prix de SA salle (pro)",
    description:
      "Même moteur que la route publique : mêmes règles de prix, mêmes statuts, même écrêtage. " +
      "La seule différence est la recherche : par id du propriétaire, SANS condition de publication — " +
      "un pro doit voir le calendrier de sa salle avant de la publier."
  })
  @ApiOkResponse({ description: "VenueAvailabilityResponse. Dates civiles locales d'Alger (D48)." })
  @ApiBadRequestResponse({ description: "Date irréelle, to < from, ou fenêtre de plus de 92 jours." })
  @ApiNotFoundResponse({ description: "404 indistinct si la salle n'est pas la sienne, ou est supprimée." })
  byId(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(availabilityWindowQuerySchema)) query: AvailabilityWindowQueryInput
  ): Promise<VenueAvailabilityResponse> {
    return this.availability.byIdForOwner(id, user.userId, query);
  }
}
