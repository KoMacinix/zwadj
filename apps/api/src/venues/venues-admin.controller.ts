// Endpoints ADMIN des salles (Lot A3). Le chemin « commission-rate » garde le
// nom du cadrage mais porte les DEUX taux D35 (Ko les règle ensemble, salle
// par salle). @Roles(ADMIN) au niveau classe : CLIENT et PRO → 403 — un pro
// ne publie jamais sa propre salle, et ne voit jamais ces taux.
//
// ADM-1 (D349, rang 51, R-4) : la file « en attente de publication », le détail et le
// rejet vivent ICI (la classe est déjà `@Roles(ADMIN)`, D119 : toute route ajoutée en hérite
// et `rbac-all-routes` la surveille d'elle-même). ⚠ `GET pending-publication` est déclarée
// AVANT `GET :id` : une route statique avant un paramètre, sinon « pending-publication »
// se lirait comme un identifiant. ⛔ R-1 : `PATCH :id/commission-rate` est inchangée.
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  UserRole,
  venuePendingQuerySchema,
  venueRatesUpdateSchema,
  venueRejectSchema,
  type VenueAdminDTO,
  type VenueAdminDetailDTO,
  type VenuePendingPageDTO,
  type VenuePendingQuery,
  type VenueRatesUpdateInput,
  type VenueRejectInput,
  type VenueRejectResultDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenuesAdminService } from "./venues-admin.service";

@ApiTags("venues-admin")
@Roles(UserRole.ADMIN)
@Controller("admin/venues")
export class VenuesAdminController {
  constructor(private readonly venues: VenuesAdminService) {}

  @Get("pending-publication")
  @ApiOperation({ summary: "La file « en attente de publication » : brouillons vivants avec au moins un créneau actif ; les déjà rejetés en dernier (D-6, R-2)" })
  @ApiOkResponse({ description: "VenuePendingPageDTO — filtrée AVANT la pagination ; page et pageSize en écho ; aucun taux." })
  listPending(@Query(new ZodValidationPipe(venuePendingQuerySchema)) query: VenuePendingQuery): Promise<VenuePendingPageDTO> {
    return this.venues.listPending(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Le détail d'une salle vivante pour l'admin (les deux taux en LECTURE, le refus éventuel)" })
  @ApiOkResponse({ description: "VenueAdminDetailDTO." })
  @ApiNotFoundResponse({ description: "404 indistinct : inexistante, supprimée ou id malformé." })
  detail(@Param("id") id: string): Promise<VenueAdminDetailDTO> {
    return this.venues.detail(id);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publie une salle (DRAFT → PUBLISHED, one-way) — idempotent si déjà publiée ; efface le motif d'un refus ; une ligne de journal" })
  @ApiOkResponse({ description: "VenueAdminDTO (vue pro + les deux taux D35). 200 même si déjà publiée, sans effet ni ligne de journal." })
  @ApiNotFoundResponse({ description: "404 indistinct : inexistante, supprimée ou id malformé." })
  publish(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser): Promise<VenueAdminDTO> {
    return this.venues.publish(id, admin);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rejette une salle : elle RESTE en brouillon, le motif (obligatoire) est stocké et journalisé" })
  @ApiOkResponse({ description: "VenueRejectResultDTO — aucun taux. Même motif rejoué : même réponse, sans nouvelle ligne de journal." })
  @ApiNotFoundResponse({ description: "404 indistinct : inexistante, supprimée ou id malformé." })
  @ApiConflictResponse({ description: "409 VENUE_NOT_DRAFT (salle publiée) ou VENUE_ALREADY_REJECTED (déjà rejetée avec un autre motif)." })
  reject(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(venueRejectSchema)) body: VenueRejectInput
  ): Promise<VenueRejectResultDTO> {
    return this.venues.reject(id, admin, body);
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
