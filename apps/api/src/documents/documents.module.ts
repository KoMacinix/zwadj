// Module des DOCUMENTS (PDF) — rang 33 (D326).
//
// ⚠ Leçon R1 : un contrôleur écrit mais non enregistré ne répond à rien, et les portes passent quand même — `AppModule` l'importe dans le même geste.
// `PrismaModule` est `@Global()` : rien à importer pour `PrismaService`.
//
// Le port `PDF_RENDERER` est câblé sur le Chromium de Playwright, UNE instance (le feu à N places qui borne les rendus simultanés vit dedans : deux
// instances auraient deux feux, donc deux fois la borne). Un second document (`UIP-D`) injecte le MÊME port.
import { Module } from "@nestjs/common";
import { PDF_RENDERER } from "./pdf-renderer.port";
import { PlaywrightPdfRenderer } from "./playwright-pdf.renderer";
import { QuoteDocumentController } from "./quote-document.controller";
import { QuoteDocumentService } from "./quote-document.service";
import { PrismaQuoteDocumentSource } from "./quote-document-source.prisma";
import { QUOTE_DOCUMENT_SOURCE } from "./quote-document-source";

@Module({
  controllers: [QuoteDocumentController],
  providers: [
    QuoteDocumentService,
    { provide: QUOTE_DOCUMENT_SOURCE, useClass: PrismaQuoteDocumentSource },
    { provide: PDF_RENDERER, useFactory: () => new PlaywrightPdfRenderer() }
  ]
})
export class DocumentsModule {}
