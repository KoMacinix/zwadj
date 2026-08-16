// Routes PRO du DEVIS — Flux E, Lot E2b ; refonte Q2 (ex-C1c).
//
// Le devis est piloté par le PRO : c'est lui qui le construit, le REMET, le
// révise et enregistre la réponse du client. En Algérie, la négociation se fait
// au comptoir ou au téléphone, et un pro qui saisit la réponse de son client est
// le cas le plus fréquent, pas une béquille.
//
// ⚠ `POST /quotes/:id/send` A DISPARU au profit de `POST /quotes/:id/deliver`,
// qui exige un CANAL. Le renommage n'est pas cosmétique : « envoyer » décrivait
// un acte que le système ne faisait pas et que le pro ne faisait pas non plus —
// il cliquait pour débloquer l'étape suivante. Le nouveau verbe ne débloque
// rien, il ENREGISTRE ce qui a eu lieu.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  quoteConvertSchema,
  quoteCreateSchema,
  quoteDeliverSchema,
  quoteReviseSchema,
  UserRole,
  type QuoteConvertInput,
  type QuoteConversionDTO,
  type QuoteCreateInput,
  type QuoteDTO,
  type QuoteDeliverInput
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
      "⚠ `isExpired` et `validUntil` ont disparu du contrat (D160), et la colonne `valid_until` de la base (Q4) : " +
      "rien n'engage tant que l'acompte n'est pas payé, donc " +
      "une date de validité n'y protégeait aucun montant — elle empêchait seulement de conclure une affaire " +
      "encore vivante. Le prix reste garanti par le versionnement, puis par l'immuabilité en base (Q3)."
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

  @Post("quotes/:id/deliver")
  @ApiOperation({
    summary: "Enregistre la REMISE du devis au client, par un canal",
    description:
      "Ne change AUCUN statut : le devis reste DRAFT (D160). Remettre un devis est un partage, pas une " +
      "transition — il n'existe plus d'état « remis » qui conditionnerait la conversion. `sentVia` dit PAR QUOI " +
      "le devis est parti, `sentAt` QUAND, et c'est `sentVia` qui décide de l'entrée dans l'entonnoir (D162). " +
      "L'appel est RÉPÉTABLE : imprimer puis envoyer par SMS sont deux remises, la seconde écrase la première. " +
      "Les quatre canaux (PRINT, SMS, IN_PERSON, PHONE) sont DÉCLARATIFS : Zwadj n'imprime rien et n'envoie rien."
  })
  @ApiCreatedResponse({ description: "QuoteDTO inchangé, `sentVia` et `sentAt` désormais renseignés." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT — un devis refusé ou remplacé ne se remet pas." })
  deliver(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(quoteDeliverSchema)) body: QuoteDeliverInput
  ): Promise<QuoteDTO> {
    return this.quotes.deliver(user.userId, id, body);
  }

  @Post("quotes/:id/revise")
  @ApiOperation({
    summary: "Crée la version suivante (DRAFT)",
    description:
      "Une version est un devis ENTIER, jamais un diff : un diff obligerait à reconstruire l'état pour " +
      "l'afficher, et une reconstruction se trompe un jour. Elle ne remplace rien tant qu'elle n'est pas " +
      "remise — le client garde l'ancienne sous les yeux pendant que le pro prépare la nouvelle."
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
      "⚠ UN BROUILLON SE CONVERTIT (Q2). La règle d'avant exigeait un envoi préalable — « sans envoi, personne " +
      "d'autre que le pro ne l'a vu » — ce qui décrivait un parcours à distance inexistant : au comptoir, le " +
      "client a le montant sous les yeux pendant que le pro le tape. " +
      "⚠ La réservation naît en PENDING, et le devis ne bouge pas. L'acceptation du devis n'est pas une " +
      "action : elle est la conséquence de la chaîne complète — le pro accepte la date, PUIS l'acompte est " +
      "encaissé. La bascule appartient au lot Paiement, dans la même transaction que le passage en CONFIRMED. " +
      "Le contact est exigé parce que `bookings.contact_*` est NOT NULL. " +
      "`bookings.quote_id` étant UNIQUE, un devis ne se convertit qu'une fois : une nouvelle négociation passe " +
      "par une nouvelle VERSION."
  })
  @ApiCreatedResponse({ description: "QuoteDTO inchangé, `bookingId` désormais renseigné." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT ou QUOTE_ALREADY_CONVERTED." })
  convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(quoteConvertSchema)) body: QuoteConvertInput
  ): Promise<QuoteDTO> {
    return this.quotes.convert(user.userId, id, body);
  }

  @Post("quotes/:id/cancel")
  @ApiOperation({
    summary: "CLÔT un devis qui n'aboutira pas",
    description:
      "⚠ Remplace `POST /quotes/:id/decline` (D161) : un seul état, un seul bouton. Le client a dit non ou le " +
      "pro a renoncé — rien dans la suite du parcours ne les traite différemment, l'affaire est perdue et le " +
      "créneau reste libre. La nuance avait un sens quand le devis partait à distance et qu'un refus était un " +
      "événement reçu ; au comptoir, c'est la même conversation. " +
      "⚠ À ne pas confondre avec SUPERSEDED, qui RESTE distinct : « remplacé par une version plus récente » " +
      "n'est pas « l'affaire est perdue ». Le versionnement est conservé (décision A). " +
      "⚠ Les lignes déjà DECLINED ne sont pas reprises, et l'entonnoir les compte AVEC les CANCELLED."
  })
  @ApiCreatedResponse({ description: "QuoteDTO en CANCELLED." })
  @ApiConflictResponse({ description: "QUOTE_STATUS_CONFLICT." })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<QuoteDTO> {
    return this.quotes.cancel(user.userId, id);
  }
}
