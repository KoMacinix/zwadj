// Rendez-vous de visite côté CLIENT — Flux C, Lot C3, D61/D62.
//
// ⚠ PREMIÈRES routes `@Roles(UserRole.CLIENT)` du dépôt. Le `JwtAuthGuard` est
// stateless : il ne vérifie ni `UserStatus.SUSPENDED` ni `emailVerifiedAt`. On
// n'ajoute RIEN ici — la cohérence avec le reste du dépôt est le choix, et
// changer la politique d'accès n'est pas le sujet de ce lot.
//
// Topologie : l'écriture porte le slug (c'est ce que le client a en main, il
// vient de `/venues/:slug/visit-slots`), la lecture de MES rendez-vous vit sous
// `/me` comme le reste du compte, et l'annulation porte l'id du rendez-vous —
// elle n'a pas besoin de la salle pour se désigner.
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
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
  availabilityWindowQuerySchema,
  UserRole,
  visitBookingCreateSchema,
  type AvailabilityWindowQueryInput,
  type ProVisitBookingDTO,
  type VisitBookingCreateInput,
  type VisitBookingDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitBookingsService } from "./visit-bookings.service";

@ApiTags("visits")
@Roles(UserRole.CLIENT)
@Controller()
export class VisitBookingsController {
  constructor(private readonly bookings: VisitBookingsService) {}

  // Aucun `@Throttle` par route : le défaut global (100/min/IP) s'applique,
  // comme sur toutes les écritures authentifiées du dépôt. La garde D62 ferme
  // déjà l'accaparement (un rendez-vous à venir par salle, refusé AVANT tout
  // envoi). ⚠ Les limites `AUTH_THROTTLE.changeEmail` / `.changePassword`, elles,
  // sont DÉFINIES mais branchées nulle part : c'est une dette antérieure à ce
  // lot, pas un précédent à imiter — la corriger est un lot en soi.
  @Post("venues/:slug/visit-bookings")
  @ApiOperation({
    summary: "Réserve un créneau de visite — auto-confirmé, sans approbation du pro (D47)",
    description:
      "Le corps porte le créneau tel que /visit-slots l'a rendu : date civile + minutes depuis minuit (D61, " +
      "jamais un instant ISO). Le téléphone est OPTIONNEL et snapshoté ; à défaut, celui du profil sert. " +
      "Le pro est notifié sur ses canaux (D60)."
  })
  @ApiCreatedResponse({ description: "VisitBookingDTO — déjà CONFIRMED." })
  @ApiBadRequestResponse({ description: "Date irréelle, minutes hors journée, téléphone non +213, ou clé inconnue." })
  @ApiConflictResponse({
    description:
      "VISIT_SLOT_UNAVAILABLE (aucun créneau à cette heure, plage suspendue, créneau passé, au-delà de 18 mois), " +
      "VISIT_SLOT_TAKEN (D59 : pris entre-temps), VISIT_ALREADY_BOOKED (D62 : un rendez-vous à venir par salle)."
  })
  @ApiNotFoundResponse({ description: "404 indistinct : brouillon, masquée, supprimée ou slug inconnu." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body(new ZodValidationPipe(visitBookingCreateSchema)) body: VisitBookingCreateInput
  ): Promise<VisitBookingDTO> {
    return this.bookings.create(user.userId, slug, body);
  }

  @Get("me/visit-bookings")
  @ApiOperation({ summary: "Mes rendez-vous de visite, du plus proche au plus lointain" })
  @ApiOkResponse({
    description:
      "VisitBookingDTO[]. Les rendez-vous ANNULÉS sont inclus et marqués : leur disparition silencieuse serait " +
      "moins claire que leur statut. Pas de pagination — un client en a quelques-uns, pas des centaines."
  })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<VisitBookingDTO[]> {
    return this.bookings.listMine(user.userId);
  }

  @Delete("visit-bookings/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Annule MON rendez-vous — le créneau redevient libre (D62)",
    description:
      "Annulation DOUCE : `status: CANCELLED` + `cancelledAt`, jamais un DELETE. Idempotente : annuler deux fois " +
      "rend 204 sans réécrire la date d'annulation."
  })
  @ApiNoContentResponse({ description: "204, sans corps." })
  @ApiConflictResponse({ description: "VISIT_BOOKING_PAST : un rendez-vous déjà passé ne s'annule plus." })
  @ApiNotFoundResponse({ description: "404 indistinct : VISIT_BOOKING_NOT_FOUND (inconnu, malformé, ou d'un autre client)." })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.bookings.cancel(user.userId, id);
  }

  /** C3b — les rendez-vous d'une salle, pour son pro.
   *
   *  ⚠ Fenêtre NON écrêtée (D70) : le passé est l'historique du pro. Le schéma
   *  `availabilityWindowQuerySchema` est réutilisé pour la forme et la largeur
   *  maximale ; c'est l'écrêtage de D49 qui ne s'applique pas ici, pas la
   *  validation. */
  @Get("pro/venues/:id/visit-bookings")
  @Roles(UserRole.PRO)
  @ApiOperation({
    summary: "Rendez-vous de visite d'une salle (pro)",
    description:
      "Fenêtre civile `from`/`to` (Alger), annulés inclus et marqués. 404 indistinct si la salle n'est pas la sienne."
  })
  listForVenue(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(availabilityWindowQuerySchema)) window: AvailabilityWindowQueryInput
  ): Promise<ProVisitBookingDTO[]> {
    return this.bookings.listForVenue(user.userId, id, window);
  }

  /** C3b — annulation par le pro. Le CLIENT est prévenu (D63). */
  @Delete("pro/venues/:id/visit-bookings/:bookingId")
  @Roles(UserRole.PRO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Annuler un rendez-vous (pro)",
    description:
      "Annulation DOUCE : le créneau est libéré, la ligne reste. Idempotent, 409 sur un rendez-vous passé."
  })
  cancelAsPro(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("bookingId") bookingId: string
  ): Promise<void> {
    return this.bookings.cancelAsPro(user.userId, id, bookingId);
  }
}
