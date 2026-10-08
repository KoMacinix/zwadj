// Adaptateur Prisma du port `QuoteDocumentSource` — LECTURE SEULE (aucun `create`, `update`, `delete`, `upsert`, aucune transaction).
// Rang 33 (D326). Voir `quote-document-source.ts` pour les raisons : propriété par la relation (D149), montants lus tels que stockés.
import { Injectable } from "@nestjs/common";
import type { QuoteStatus } from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import type { QuoteDocumentLine, QuoteDocumentRecord, QuoteDocumentSource } from "./quote-document-source";

/** Les lignes d'un devis sont un instantané JSON (`quotes.lines`) : une forme inattendue LÈVE, elle ne s'imprime pas à moitié. */
export function parseStoredLines(raw: unknown): QuoteDocumentLine[] {
  if (!Array.isArray(raw)) throw new TypeError("quotes.lines n'est pas un tableau");
  return raw.map((ligne: unknown, i: number) => {
    const l = ligne as Record<string, unknown> | null;
    if (
      l === null ||
      typeof l !== "object" ||
      typeof l.nameFr !== "string" ||
      typeof l.nameAr !== "string" ||
      !Number.isInteger(l.quantity) ||
      !Number.isInteger(l.lineTotalCents)
    ) {
      throw new TypeError(`quotes.lines[${i}] n'a pas la forme d'une ligne de devis`);
    }
    return { nameFr: l.nameFr, nameAr: l.nameAr, quantity: l.quantity as number, lineTotalCents: l.lineTotalCents as number };
  });
}

@Injectable()
export class PrismaQuoteDocumentSource implements QuoteDocumentSource {
  constructor(private readonly prisma: PrismaService) {}

  async findForOwner(userId: string, quoteId: string): Promise<QuoteDocumentRecord | null> {
    const row = await this.prisma.quote.findFirst({
      where: { id: quoteId, venue: { deletedAt: null, owner: { userId } } },
      select: {
        id: true,
        version: true,
        chainId: true,
        status: true,
        eventDate: true,
        guests: true,
        basePriceCents: true,
        servicesTotalCents: true,
        totalCents: true,
        depositCents: true,
        lines: true,
        venue: { select: { nameFr: true, nameAr: true } },
        slotTemplate: { select: { nameFr: true, nameAr: true, startMinutes: true, endMinutes: true } },
        client: { select: { firstName: true, lastName: true, locale: true } }
      }
    });
    if (row === null) return null;
    const plusHaute = await this.prisma.quote.aggregate({ where: { chainId: row.chainId }, _max: { version: true } });
    return {
      id: row.id,
      version: row.version,
      // `_max` d'une chaîne dont la ligne vient d'être lue n'est jamais nul ; le repli n'existe que pour le typage et vaut « cette version ».
      latestVersion: plusHaute._max.version ?? row.version,
      status: row.status as QuoteStatus,
      eventDate: row.eventDate.toISOString().slice(0, 10),
      guests: row.guests,
      basePriceCents: row.basePriceCents,
      servicesTotalCents: row.servicesTotalCents,
      totalCents: row.totalCents,
      depositCents: row.depositCents,
      lines: parseStoredLines(row.lines),
      venue: row.venue,
      slot: row.slotTemplate,
      client: row.client
    };
  }
}
