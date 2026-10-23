// Routes PRO de la FICHE CLIENT — rang 41 (D336, L35-4 amendé) : K-1 (rechercher), K-2 (créer ou rendre), K-3 (compléter un nom), K-3b (modifier).
//
// ⛔ Toutes sous `@Roles(PRO)` : un client connecté n'atteint aucune d'elles (D119). La propriété de chaque fiche se vérifie par la relation au profil du pro
// connecté (D149) — une fiche d'un autre pro rend le MÊME 404 qu'une fiche absente (D47).
// ⚠ `POST lookup` et `POST` (créer ou rendre) répondent 200 : la recherche est une LECTURE (son corps porte l'identifiant, qu'une adresse de requête n'a pas à
// recopier dans les journaux), et la création est IDEMPOTENTE — `created` dit si la fiche vient de naître.
import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  clientRecordCreateSchema,
  clientRecordLookupSchema,
  clientRecordNamesSchema,
  clientRecordUpdateSchema,
  UserRole,
  type ClientRecordCreateDTO,
  type ClientRecordCreateInput,
  type ClientRecordDTO,
  type ClientRecordLookupDTO,
  type ClientRecordLookupInput,
  type ClientRecordNamesInput,
  type ClientRecordUpdateInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ProClientsService } from "./pro-clients.service";

@ApiTags("clients")
@Roles(UserRole.PRO)
@Controller("pro/clients")
export class ProClientsController {
  constructor(private readonly clients: ProClientsService) {}

  @Post("lookup")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "K-1 — cherche la fiche du pro qui porte ce numéro OU cet e-mail",
    description:
      "Exactement un identifiant. Ne cherche QUE dans les fiches du pro connecté et ne lit JAMAIS les comptes : la réponse est `{ found: false }`, " +
      "identique à l'octet, pour tout identifiant sans fiche — qu'un compte Zwadj le porte ou non (M-4). Une fiche trouvée expose `linked` (un booléen), " +
      "jamais rien du compte."
  })
  @ApiOkResponse({ description: "ClientRecordLookupDTO" })
  @ApiBadRequestResponse({ description: "Corps invalide : aucun identifiant, les deux, un numéro qui n'est pas un mobile algérien." })
  lookup(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(clientRecordLookupSchema)) body: ClientRecordLookupInput
  ): Promise<ClientRecordLookupDTO> {
    return this.clients.lookup(user.userId, body);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "K-2 — crée la fiche, ou rend celle qui existe",
    description:
      "Un numéro et/ou un e-mail, un nom au moins. Idempotent sur (pro, numéro) et sur (pro, e-mail) : une fiche existante est RENDUE telle quelle, jamais " +
      "modifiée. Le numéro et l'e-mail sur deux fiches différentes : refusé, rien n'est fusionné. Le numéro, le second numéro ou l'e-mail du pro : refusés."
  })
  @ApiOkResponse({ description: "ClientRecordCreateDTO — `created` dit si la fiche vient de naître." })
  @ApiBadRequestResponse({ description: "CLIENT_IS_PRO_CONTACT, ou corps invalide." })
  @ApiConflictResponse({ description: "CLIENT_RECORD_IDENTIFIERS_CONFLICT." })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(clientRecordCreateSchema)) body: ClientRecordCreateInput
  ): Promise<ClientRecordCreateDTO> {
    return this.clients.create(user.userId, body);
  }

  @Patch(":id/names")
  @ApiOperation({ summary: "K-3 — complète un nom MANQUANT de la fiche", description: "Ne remplace jamais un nom présent ; une fiche liée ne se complète pas." })
  @ApiOkResponse({ description: "ClientRecordDTO" })
  @ApiNotFoundResponse({ description: "CLIENT_RECORD_NOT_FOUND — indistinct (absente, ou d'un autre pro)." })
  @ApiConflictResponse({ description: "CLIENT_RECORD_NAME_ALREADY_SET ou CLIENT_RECORD_LINKED." })
  completeNames(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(clientRecordNamesSchema)) body: ClientRecordNamesInput
  ): Promise<ClientRecordDTO> {
    return this.clients.completeNames(user.userId, id, body);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "K-3b — modifie une fiche (DB-11)",
    description:
      "Les champs à changer parmi le numéro, l'e-mail et les deux noms ; aucune valeur retirée. Refusé pour une fiche liée (champs grisés). Ne touche AUCUNE " +
      "copie du nom déjà faite sur un devis (R8)."
  })
  @ApiOkResponse({ description: "ClientRecordDTO" })
  @ApiBadRequestResponse({ description: "CLIENT_IS_PRO_CONTACT, ou corps invalide." })
  @ApiNotFoundResponse({ description: "CLIENT_RECORD_NOT_FOUND — indistinct (absente, ou d'un autre pro)." })
  @ApiConflictResponse({ description: "CLIENT_RECORD_LINKED ou CLIENT_RECORD_IDENTIFIERS_CONFLICT." })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(clientRecordUpdateSchema)) body: ClientRecordUpdateInput
  ): Promise<ClientRecordDTO> {
    return this.clients.update(user.userId, id, body);
  }
}
