// Routes PRO des demandes de réservation — Flux E, Lot E1a.
//
// C'est ici que le créneau se verrouille : l'acceptation est la seule écriture
// du lot que la BASE peut refuser (EXCLUDE `bookings_no_overlap_accepted_confirmed`,
// traduite en 409 BOOKING_SLOT_TAKEN — et jamais devinée par un SELECT préalable).
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  bookingCancelSchema,
  bookingDeclineSchema,
  UserRole,
  type BookingCancelInput,
  type BookingDTO,
  type BookingDeclineInput,
  type ProBookingDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { BookingsService } from "./bookings.service";

@ApiTags("bookings-pro")
@Roles(UserRole.PRO)
@Controller("pro")
export class BookingsProController {
  constructor(private readonly bookings: BookingsService) {}

  @Get("venues/:id/bookings")
  @ApiOperation({
    summary: "Les demandes d'une de mes salles, conflits compris",
    description:
      "`conflictIds` est CALCULÉ à la lecture via l'index GiST, jamais persisté : une réservation acceptée " +
      "peut s'annuler ensuite, et un drapeau stocké deviendrait faux en silence. Les demandes PENDING ont le " +
      "droit de se chevaucher — c'est la salle qui tranche."
  })
  @ApiOkResponse({ description: "ProBookingDTO[] — ajoute le contact et les conflits." })
  @ApiNotFoundResponse({ description: "404 indistinct : id malformé, inexistant, ou salle d'un autre pro." })
  listForVenue(@CurrentUser() user: AuthenticatedUser, @Param("id") venueId: string): Promise<ProBookingDTO[]> {
    return this.bookings.listForVenue(user.userId, venueId);
  }

  @Post("bookings/:id/accept")
  @ApiOperation({
    summary: "Accepte la demande — VERROUILLE le créneau",
    description:
      "Deux refus possibles, deux autorités : BOOKING_BLOCKED_PERIOD vient d'un contrôle applicatif sous " +
      "`SELECT … FOR UPDATE` (une EXCLUDE ne traverse pas deux tables), BOOKING_SLOT_TAKEN vient de la base " +
      "elle-même. ⚠ D80 : rien ne mène à CONFIRMED dans ce lot, et rien n'expire — seule l'annulation du pro " +
      "libère ensuite le créneau."
  })
  @ApiOkResponse({ description: "BookingDTO en statut ACCEPTED, avec paymentDueAt posé." })
  @ApiConflictResponse({
    description: "BOOKING_SLOT_TAKEN, BOOKING_BLOCKED_PERIOD, ou BOOKING_STATUS_CONFLICT (statut réel dans la réponse)."
  })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<BookingDTO> {
    return this.bookings.accept(user.userId, id);
  }

  @Post("bookings/:id/decline")
  @ApiOperation({
    summary: "Refuse la demande",
    description:
      "D83 — motif FACULTATIF : contraindre un pro à justifier au téléphone, dans une seconde langue, produit " +
      "« ... » comme motif. Le client est prévenu par e-mail, pour pouvoir chercher ailleurs tout de suite."
  })
  @ApiOkResponse({ description: "BookingDTO en statut DECLINED." })
  @ApiConflictResponse({ description: "BOOKING_STATUS_CONFLICT — la réponse porte le statut réel." })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bookingDeclineSchema)) body: BookingDeclineInput
  ): Promise<BookingDTO> {
    return this.bookings.decline(user.userId, id, body);
  }

  @Post("bookings/:id/cancel")
  @ApiOperation({
    summary: "Annule une demande DÉJÀ ACCEPTÉE — libère le créneau",
    description:
      "Seul moyen aujourd'hui de rendre un créneau verrouillé, tant que le lot Paiement n'apporte ni " +
      "confirmation ni expiration automatique (D80)."
  })
  @ApiOkResponse({ description: "BookingDTO en statut CANCELLED." })
  @ApiConflictResponse({ description: "BOOKING_STATUS_CONFLICT — la réponse porte le statut réel." })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bookingCancelSchema)) body: BookingCancelInput
  ): Promise<BookingDTO> {
    return this.bookings.cancelAsPro(user.userId, id, body);
  }
}
