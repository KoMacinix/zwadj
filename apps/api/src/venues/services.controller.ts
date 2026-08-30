// Routes PRO du catalogue de prestations — Flux E, Lot E2a.
//
// Topologie du dépôt, volontairement asymétrique — NE PAS « harmoniser » :
// ÉCRITURES sur `/venues/:id/services` et `/services/:id`, LECTURE pro sur
// `/pro/venues/:id/services`.
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  serviceCreateSchema,
  serviceUpdateSchema,
  UserRole,
  type ServiceCreateInput,
  type ServiceDTO,
  type ServiceUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ServicesService } from "./services.service";

@ApiTags("services")
@Roles(UserRole.PRO)
@Controller()
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get("pro/venues/:id/services")
  @ApiOperation({
    summary: "Le catalogue d'une de mes salles, actives ET retirées",
    description:
      "Les prestations retirées (`isActive: false`) sont INCLUSES : le pro doit pouvoir les remettre en vente. " +
      "C'est la vue publique qui filtrera."
  })
  @ApiOkResponse({ description: "ServiceDTO[], tri sortOrder puis id." })
  @ApiNotFoundResponse({ description: "404 indistinct : id malformé, inexistant, ou salle d'un autre pro." })
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") venueId: string): Promise<ServiceDTO[]> {
    return this.services.listForVenue(user.userId, venueId);
  }

  @Post("venues/:id/services")
  @ApiOperation({
    summary: "Crée une prestation AVEC son tarif (D89)",
    description:
      "Un seul corps, une seule transaction. Le corps est une union DISCRIMINÉE sur `pricingType` : chaque type " +
      "ne porte que ses propres champs, et un TIERED exige au moins un palier. La base ne sait pas vérifier que " +
      "le mode de prix rempli corresponde au type déclaré — c'est pourquoi les deux ne se créent jamais séparément."
  })
  @ApiCreatedResponse({ description: "ServiceDTO complet, tarif ou paliers compris." })
  @ApiBadRequestResponse({ description: "Type inconnu, champ étranger au type, TIERED sans palier, bornes incohérentes." })
  @ApiConflictResponse({ description: "Catalogue plein (40 prestations)." })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") venueId: string,
    @Body(new ZodValidationPipe(serviceCreateSchema)) body: ServiceCreateInput
  ): Promise<ServiceDTO> {
    return this.services.create(user.userId, venueId, body);
  }

  @Patch("services/:id")
  @ApiOperation({
    summary: "Renomme, décrit, réordonne, retire de la vente",
    description:
      "⚠ Ni le `pricingType` ni les PRIX ne se modifient ici. Basculer un type laisserait des lignes de " +
      "réservation snapshotées sur un type disparu ; supprimer puis recréer est plus honnête. `isActive: false` " +
      "est le geste RÉVERSIBLE pour retirer de la vente."
  })
  @ApiOkResponse({ description: "ServiceDTO à jour." })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") serviceId: string,
    @Body(new ZodValidationPipe(serviceUpdateSchema)) body: ServiceUpdateInput
  ): Promise<ServiceDTO> {
    return this.services.update(user.userId, serviceId, body);
  }

  @Delete("services/:id")
  @HttpCode(204)
  @ApiOperation({
    summary: "Supprime une prestation JAMAIS UTILISÉE",
    description:
      "Réservée au cas rare « créée par erreur ». Refusée en 409 SERVICE_IN_USE dès que la prestation figure sur " +
      "une réservation : les snapshots sauvent l'affichage, pas la jointure, et un nettoyage effacerait " +
      "l'historique commercial. Pour arrêter un service qui a servi — le geste courant — utiliser " +
      "`isActive: false`, qui est réversible."
  })
  @ApiNoContentResponse({ description: "Supprimée." })
  @ApiConflictResponse({ description: "SERVICE_IN_USE — utiliser `isActive: false`." })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") serviceId: string): Promise<void> {
    return this.services.remove(user.userId, serviceId);
  }
}
