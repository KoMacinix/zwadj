// Routes PRO du DEVIS — Flux E, Lot E2b.
//
// Le devis est piloté par le PRO : c'est lui qui le construit, l'envoie, le
// révise et enregistre la réponse du client. L'acceptation par le CLIENT
// lui-même viendra avec les écrans (E2c) ; en Algérie, la négociation se fait
// largement au téléphone, et un pro qui saisit la réponse de son client est le
// cas le plus fréquent, pas une béquille.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  quoteConvertSchema,
  quoteCreateSchema,
  quoteReviseSchema,
  UserRole,
  type QuoteConvertInput,
  type QuoteConversionDTO,
  type QuoteCreateInput,
  type QuoteDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { QuotesService } from "./quotes.service";

@ApiTags("quotes")
@Roles(UserRole.PRO)
@Controller()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get("pro/venues/:id/quotes")
  @ApiOperation({
    summary: "Tous les devis d'une salle, toutes versions",
    description:
      "Tri par chaîne puis version croissante : l'historique d'une négociation se lit dans l'ordre. " +
      "`isExpired` est DÉRIVÉ de `validUntil` — aucun statut EXPIRED n'est stocké, un statut que rien ne fait " +
      "basculer devient un mensonge en base."
  })
  @ApiOkResponse({ description: "QuoteDTO[]" })
  @ApiNotFoundResponse({ description: "404 indistinct." })
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") venueId: string): Promise<QuoteDTO[]> {
    return this.quotes.listForVenue(user.userId, venueId);
  }

  @Get("pro/venues/:id/quotes/conversion")
  @ApiOperation({
    summary: "Taux de transformation des devis",
    description:
      "Compte des CHAÎNES, pas des versions : trois révisions d'un même devis sont UNE affaire. C'est ce que la " +
      "table `Quote` rend possible — tant que le devis vivait accroché à une réservation, un devis sans suite " +
      "n'existait nulle part et ces nombres étaient incalculables."
  })
  @ApiOkResponse({ description: "QuoteConversionDTO" })
  conversion(@CurrentUser() user: AuthenticatedUser, @Param("id") venueId: string): Promise<QuoteConversionDTO> {
    return this.quotes.conversion(user.userId, venueId);
  }

  @Post("venues/:id/quotes")
  @ApiOperation({
    summary: "Crée un devis (v1, en DRAFT)",
    description:
      "`clientId` est FACULTATIF : le pro tape un devis pour quelqu'un qui hésite encore et n'a peut-être pas de " +
      "compte. Les prix sont résolus par le serveur — salle via le moteur B3, prestations via le catalogue."
  })
  @ApiCreatedResponse({ description: "QuoteDTO en DRAFT." })
  @ApiNotFoundResponse({ description: "404 indistinct, ou créneau inconnu." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") venueId: string,
    @Body(new ZodValidationPipe(quoteCreateSchema)) body: QuoteCreateInput
  ): Promise<QuoteDTO> {
    return this.quotes.create(user.userId, venueId, body);
  }

  @Post("quotes/:id/send")
  @ApiOperation({
    summary: "Envoie le devis — il devient ACTIF",
    description:
      "Remplace la version précédemment active de la chaîne, qui passe SUPERSEDED (jamais DECLINED : personne " +
      "n'a refusé). Rétrogradation PUIS activation, dans la même transaction : l'index partiel n'est pas " +
      "différable, l'ordre inverse échouerait."
  })
  @ApiCreatedResponse({ description: "QuoteDTO en SENT." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT — statut réel dans la réponse." })
  send(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<QuoteDTO> {
    return this.quotes.send(user.userId, id);
  }

  @Post("quotes/:id/revise")
  @ApiOperation({
    summary: "Crée la version suivante (DRAFT)",
    description:
      "Une version est un devis ENTIER, jamais un diff : un diff obligerait à reconstruire l'état pour " +
      "l'afficher, et une reconstruction se trompe un jour. Elle ne remplace rien tant qu'elle n'est pas " +
      "envoyée — le client garde l'ancienne sous les yeux pendant que le pro prépare la nouvelle."
  })
  @ApiCreatedResponse({ description: "QuoteDTO, version N+1, en DRAFT." })
  @ApiConflictResponse({ description: "Chaîne close (acceptée, refusée ou remplacée)." })
  revise(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(quoteReviseSchema)) body: QuoteCreateInput
  ): Promise<QuoteDTO> {
    return this.quotes.revise(user.userId, id, body);
  }

  @Post("quotes/:id/convert")
  @ApiOperation({
    summary: "Convertit le devis en DEMANDE de réservation",
    description:
      "⚠ La réservation naît en PENDING, et le devis RESTE `SENT` (D101). L'acceptation du devis n'est pas une " +
      "action : elle est la conséquence de la chaîne complète — le pro accepte la date, PUIS l'acompte est " +
      "encaissé. Les deux conditions sont nécessaires, dans cet ordre. La bascule appartient au lot Paiement, " +
      "dans la même transaction que le passage en CONFIRMED. " +
      "Un DRAFT ne se convertit pas. Le contact est exigé parce que `bookings.contact_*` est NOT NULL. " +
      "`bookings.quote_id` étant UNIQUE, un devis ne se convertit qu'une fois : une nouvelle négociation passe " +
      "par une nouvelle VERSION."
  })
  @ApiCreatedResponse({ description: "QuoteDTO inchangé en SENT, `bookingId` désormais renseigné." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT, QUOTE_EXPIRED, ou QUOTE_ALREADY_CONVERTED." })
  convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(quoteConvertSchema)) body: QuoteConvertInput
  ): Promise<QuoteDTO> {
    return this.quotes.convert(user.userId, id, body);
  }

  @Post("quotes/:id/decline")
  @ApiOperation({
    summary: "Enregistre un REFUS explicite",
    description: "À ne pas confondre avec SUPERSEDED : ici quelqu'un a dit non à CE devis, il n'a pas été remplacé."
  })
  @ApiCreatedResponse({ description: "QuoteDTO en DECLINED." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT." })
  decline(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<QuoteDTO> {
    return this.quotes.decline(user.userId, id);
  }
}
