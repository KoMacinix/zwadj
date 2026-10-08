// Le document d'un devis — l'ORCHESTRATION. Rang 33 (D326), décisions 1, 4 et 7 du relecteur.
//
// ⛔ CE SERVICE NE CALCULE RIEN ET N'ÉCRIT RIEN (décision 4 : « le serveur imprime ; il ne calcule pas de montant et n'écrit aucun statut »). Il lit le
// devis tel que stocké (port de LECTURE), applique deux décisions PURES (`quote-document-policy.ts` : la version active, la langue), met en forme
// (`quote-document.ts`, pur) et délègue le rendu au port. Aucune règle ne vit ici : c'est ce qui les laisse neutralisables en millisecondes.
// ⚠ Ce fichier n'importe ni `PrismaService`, ni `pricing-engine`, ni `deposit`, ni `QuoteStore` : aucun chemin d'écriture, aucun recalcul.
//
// L'horloge est lue ICI et nulle part en dessous : la date d'émission est passée au modèle pur (D48 : ce qui dépend de l'horloge ne vit pas dans un module pur).
import { ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { QuoteErrorCode, quoteDocumentFilename, type QuoteDocumentLocale } from "@zwadj/types";
import { PDF_RENDERER, PdfRenderUnavailableError, type PdfRenderer } from "./pdf-renderer.port";
import { buildQuoteDocumentHtml } from "./quote-document";
import { loadDocumentFontCss } from "./quote-document-fonts";
import { chooseDocumentLocale, decideQuoteDocument, type DocumentLocaleBranch } from "./quote-document-policy";
import { QUOTE_DOCUMENT_SOURCE, type QuoteDocumentSource } from "./quote-document-source";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RenderedQuoteDocument {
  readonly pdf: Buffer;
  /** La langue APPLIQUÉE — c'est elle que la réponse porte en `Content-Language`. */
  readonly locale: QuoteDocumentLocale;
  /** Quelle branche de la décision 7 a joué : la langue du CLIENT, ou le REPLI (celle de l'interface du pro). */
  readonly branch: DocumentLocaleBranch;
  readonly filename: string;
}

/** Date civile du jour à Alger (UTC+1, sans heure d'été — D48). Le fuseau est EXPLICITE : il ne se dérive jamais de la locale. `en-CA` ne sert qu'à obtenir la forme `AAAA-MM-JJ`. */
export function algiersToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(now);
}

@Injectable()
export class QuoteDocumentService {
  constructor(
    @Inject(QUOTE_DOCUMENT_SOURCE) private readonly source: QuoteDocumentSource,
    @Inject(PDF_RENDERER) private readonly renderer: PdfRenderer
  ) {}

  async render(userId: string, quoteId: string, fallbackLocale: QuoteDocumentLocale, now: Date = new Date()): Promise<RenderedQuoteDocument> {
    // 404 INDISTINCT (D47) : un identifiant mal formé, un devis inexistant, la salle d'un autre pro, une salle supprimée rendent la MÊME réponse.
    if (!UUID_PATTERN.test(quoteId)) this.throwNotFound();
    const record = await this.source.findForOwner(userId, quoteId);
    if (record === null) this.throwNotFound();

    const decision = decideQuoteDocument({ status: record.status, version: record.version, latestVersion: record.latestVersion });
    if (decision.outcome === "VERSION_NOT_ACTIVE") {
      // Le serveur ne sert NI l'ancienne valeur, NI une autre version à sa place : il refuse, et dit laquelle est active.
      throw new ConflictException({
        code: QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE,
        message: "quote.errors.versionNotActive",
        latestVersion: decision.latestVersion
      });
    }
    if (decision.outcome === "STATUS_CONFLICT") {
      throw new ConflictException({ code: QuoteErrorCode.QUOTE_STATUS_CONFLICT, message: "quote.errors.statusConflict", status: decision.status });
    }

    const { locale, branch } = chooseDocumentLocale({ clientLocale: record.client?.locale ?? null, fallback: fallbackLocale });
    const document = buildQuoteDocumentHtml({ record, locale, issuedOn: algiersToday(now), fontCss: loadDocumentFontCss() });

    try {
      return { pdf: await this.renderer.render(document), locale, branch, filename: quoteDocumentFilename(record) };
    } catch (erreur) {
      // Une PANNE du moteur n'est pas un refus métier : 503, code distinct (« un refus métier ne se replie pas sur une panne », et l'inverse).
      if (erreur instanceof PdfRenderUnavailableError) {
        throw new ServiceUnavailableException({ code: QuoteErrorCode.QUOTE_DOCUMENT_UNAVAILABLE, message: "quote.errors.documentUnavailable" });
      }
      throw erreur;
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: QuoteErrorCode.QUOTE_NOT_FOUND, message: "quote.errors.notFound" });
  }
}
