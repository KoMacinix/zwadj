// Route du DOCUMENT du devis (PDF) — rang 33 (D326). Contrat écrit AVANT le code, dans le point d'entrée du rang 33 de `ZWADJ_CONTINUITE.md`.
//
//   GET /api/v1/quotes/:id/document?locale=<fr|ar>      @Roles(PRO) — le propriétaire de la salle du devis seulement
//
// ⛔ LECTURE SEULE : aucun statut écrit, aucun montant calculé, aucun fichier stocké (Ko : « je ne veux stocker que les données structurées du devis
// en base » — le PDF se génère à la demande, il ne se garde pas). La réponse n'est donc PAS mise en cache : un PDF porte le nom d'un client.
import { Controller, Get, Param, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { quoteDocumentQuerySchema, UserRole, type QuoteDocumentQuery } from "@zwadj/types";
import type { Response } from "express";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { QuoteDocumentService } from "./quote-document.service";

@ApiTags("quotes")
@Roles(UserRole.PRO)
@Controller()
export class QuoteDocumentController {
  constructor(private readonly documents: QuoteDocumentService) {}

  @Get("quotes/:id/document")
  @ApiOperation({
    summary: "Le PDF du devis, généré à la demande",
    description:
      "Imprime les valeurs STOCKÉES du devis (`deposit_cents`, `total_cents`, `lines`…), jamais un recalcul à partir des règles de prix actuelles. " +
      "Langue : celle du CLIENT quand le devis est lié à un compte (`users.locale`), sinon `locale` — la langue de l'interface du pro au moment du clic. " +
      "`Content-Language` dit la langue APPLIQUÉE. Aucun binaire n'est stocké."
  })
  @ApiOkResponse({ description: "application/pdf — `Content-Disposition: attachment`, `Cache-Control: private, no-store`." })
  @ApiNotFoundResponse({ description: "404 indistinct : devis inexistant ou salle d'un autre pro." })
  @ApiConflictResponse({
    description:
      "QUOTE_VERSION_NOT_ACTIVE (une version plus récente existe ; porte `latestVersion`) ou QUOTE_STATUS_CONFLICT (affaire perdue / statut hérité remplacé)."
  })
  @ApiServiceUnavailableResponse({ description: "QUOTE_DOCUMENT_UNAVAILABLE — le moteur de rendu a échoué : une PANNE, pas un refus." })
  async document(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(quoteDocumentQuerySchema)) query: QuoteDocumentQuery,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const document = await this.documents.render(user.userId, id, query.locale);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document.filename}"`,
      "Content-Language": document.locale,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return new StreamableFile(document.pdf);
  }
}
