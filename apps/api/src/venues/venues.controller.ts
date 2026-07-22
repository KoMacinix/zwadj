// CRUD Venue côté PRO (Flux A, Lot A2). Topologie des routes (arbitrage A2-①) :
// - écritures POST/PATCH/DELETE sur /venues (lettre du cadrage) ;
// - lectures pro sur /pro/venues[/:id] — le détail ne PEUT pas vivre à
//   GET /venues/:id : même motif que le futur GET /venues/:slug public (A3).
// @Roles(PRO) au niveau classe : CLIENT et ADMIN → 403 (l'admin a ses propres
// endpoints en A3). Ownership + 404 indistincts : dans le service.
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  UserRole,
  venueCreateSchema,
  venueUpdateSchema,
  type VenueCreateInput,
  type VenueProDTO,
  type VenueUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenuesService } from "./venues.service";

@ApiTags("venues-pro")
@Roles(UserRole.PRO)
@Controller()
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Post("venues")
  @ApiOperation({ summary: "Crée une salle (DRAFT, status ACTIVE, slug figé généré depuis nameFr)" })
  @ApiCreatedResponse({ description: "VenueProDTO — jamais de commissionRateBps ni rejectionReason." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(venueCreateSchema)) body: VenueCreateInput
  ): Promise<VenueProDTO> {
    return this.venues.create(user.userId, body);
  }

  @Get("pro/venues")
  @ApiOperation({ summary: "Mes salles (tous statuts, hors supprimées) — tri updatedAt desc" })
  @ApiOkResponse({ description: "VenueProDTO[] — tableau simple, pagination différée (1–3 salles/pro au MVP)." })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<VenueProDTO[]> {
    return this.venues.listMine(user.userId);
  }

  @Get("pro/venues/:id")
  @ApiOperation({ summary: "Détail d'UNE de mes salles, par id (l'id reste la clé pro/admin)" })
  @ApiNotFoundResponse({ description: "404 indistinct : inexistante, supprimée, id malformé ou salle d'un autre pro." })
  getMine(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<VenueProDTO> {
    return this.venues.getMine(user.userId, id);
  }

  @Patch("venues/:id")
  @ApiOperation({ summary: "Mise à jour PARTIELLE (D33 : { status } seul suffit à basculer la visibilité)" })
  @ApiOkResponse({ description: "VenueProDTO à jour. Slug/publicationStatus/commission : inatteignables (400 strict)." })
  @ApiNotFoundResponse({ description: "404 indistinct (cf. GET /pro/venues/:id)." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(venueUpdateSchema)) body: VenueUpdateInput
  ): Promise<VenueProDTO> {
    return this.venues.update(user.userId, id, body);
  }

  @Delete("venues/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete (deletedAt) — la salle disparaît de toutes les vues pro" })
  @ApiNoContentResponse({ description: "204. Toute opération ultérieure sur cet id → 404 indistinct." })
  @ApiNotFoundResponse({ description: "404 indistinct (déjà supprimée incluse)." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.venues.softDelete(user.userId, id);
  }
}
