// Routes CLIENT des demandes de réservation — Flux E, Lot E1a.
//
// Request-to-book, jamais d'instant-book : ce POST crée une DEMANDE qui ne
// verrouille rien. C'est l'acceptation du pro, ailleurs, qui prend le créneau.
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  bookingCancelSchema,
  bookingCreateSchema,
  UserRole,
  type BookingCancelInput,
  type BookingCreateInput,
  type BookingDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { BookingsService } from "./bookings.service";

@ApiTags("bookings")
@Roles(UserRole.CLIENT)
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // Aucun `@Throttle` par route : le défaut global (100/min/IP) s'applique,
  // comme sur toutes les écritures authentifiées du dépôt.
  @Post("venues/:slug/bookings")
  @ApiOperation({
    summary: "Envoie une demande de réservation — PENDING, ne verrouille rien",
    description:
      "Le corps porte la date civile, le créneau (source du PRIX dans les DEUX modes), le nombre d'invités, " +
      "les quatre champs de contact — obligatoires : le profil ne peut pas les fournir de façon fiable — et " +
      "les montants VUS par le client (D75). Le serveur recalcule et refuse en 409 s'ils ont bougé."
  })
  @ApiCreatedResponse({ description: "BookingDTO en statut PENDING." })
  @ApiBadRequestResponse({
    description: "Date irréelle, téléphone non +213, e-mail invalide, message > 1000 caractères, clé inconnue, " +
      "ou BOOKING_GUESTS_EXCEED_CAPACITY."
  })
  @ApiConflictResponse({
    description:
      "BOOKING_SLOT_UNAVAILABLE (créneau inconnu ou retiré, date passée ou au-delà de 18 mois), " +
      "BOOKING_PRICE_CHANGED (D75 : la réponse porte totalCents et depositCents réels)."
  })
  @ApiNotFoundResponse({ description: "404 indistinct : brouillon, masquée, supprimée ou slug inconnu." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body(new ZodValidationPipe(bookingCreateSchema)) body: BookingCreateInput
  ): Promise<BookingDTO> {
    return this.bookings.create(user.userId, slug, body);
  }

  @Get("me/bookings")
  @ApiOperation({
    summary: "Mes demandes de réservation",
    description:
      "Refusées et annulées INCLUSES et marquées : « cette demande n'a pas abouti » est une information, " +
      "sa disparition silencieuse en est le contraire. Sans pagination — décision, pas oubli."
  })
  @ApiOkResponse({ description: "BookingDTO[], la date la plus proche d'abord." })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<BookingDTO[]> {
    return this.bookings.listMine(user.userId);
  }

  @Delete("bookings/:id")
  @ApiOperation({
    summary: "Annule ma demande",
    description:
      "D83 — motif LIBRE tant que la demande est PENDING (rien n'est verrouillé), OBLIGATOIRE sur une demande " +
      "ACCEPTED : le pro a peut-être refusé d'autres dates entre-temps."
  })
  @ApiOkResponse({ description: "BookingDTO en statut CANCELLED." })
  @ApiBadRequestResponse({ description: "Motif manquant sur une demande ACCEPTED." })
  @ApiConflictResponse({ description: "BOOKING_STATUS_CONFLICT — la réponse porte le statut réel." })
  @ApiNotFoundResponse({ description: "404 indistinct : id malformé, inexistant, ou demande d'un autre client." })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bookingCancelSchema)) body: BookingCancelInput
  ): Promise<BookingDTO> {
    return this.bookings.cancelAsClient(user.userId, id, body);
  }
}
