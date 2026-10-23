// Adaptateur Prisma du port `QuoteDocumentSource` — LECTURE SEULE (aucun `create`, `update`, `delete`, `upsert`, aucune transaction).
// Rang 33 (D326). Voir `quote-document-source.ts` pour les raisons : propriété par la relation (D149), montants lus tels que stockés.
import { Injectable } from "@nestjs/common";
import { ServicePricingType, formatQuoteReference, type QuoteStatus } from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import type { QuoteDocumentLine, QuoteDocumentRecord, QuoteDocumentSource } from "./quote-document-source";

/**
 * Les lignes d'un devis sont un instantané JSON (`quotes.lines`) : une forme inattendue LÈVE, elle ne s'imprime pas à moitié.
 * ⛔ Rang 38 (D332, DB-9 et décision 3 du relecteur) : le type de tarification doit être l'un des quatre connus, et une ligne « à paliers » doit porter le nom de son palier dans
 * les DEUX langues — sinon le PDF ne pourrait l'imprimer qu'en lisant le catalogue actuel de la salle, c'est-à-dire une valeur que le devis ne porte pas.
 */
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
    // La liste des types est celle du contrat (`ServicePricingType`), jamais recopiée ici ; `find` rend l'élément de l'union, pas une chaîne quelconque.
    const pricingType = Object.values(ServicePricingType).find((type) => type === l.pricingType);
    if (pricingType === undefined) throw new TypeError(`quotes.lines[${i}].pricingType n'est pas un type de tarification connu`);
    const tierLabelFr = typeof l.tierLabelFr === "string" ? l.tierLabelFr : null;
    const tierLabelAr = typeof l.tierLabelAr === "string" ? l.tierLabelAr : null;
    if (pricingType === ServicePricingType.TIERED && (tierLabelFr === null || tierLabelFr.trim() === "" || tierLabelAr === null || tierLabelAr.trim() === "")) {
      throw new TypeError(`quotes.lines[${i}] est « à paliers » mais ne porte pas le nom de son palier en français ET en arabe`);
    }
    return {
      nameFr: l.nameFr,
      nameAr: l.nameAr,
      pricingType,
      quantity: l.quantity as number,
      tierLabelFr,
      tierLabelAr,
      lineTotalCents: l.lineTotalCents as number
    };
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
        // Rang 39 (K-6) : de quoi bâtir la référence STOCKÉE — l'année et le numéro du devis, le numéro de la salle.
        referenceYear: true,
        referenceNumber: true,
        venue: { select: { nameFr: true, nameAr: true, number: true } },
        slotTemplate: { select: { nameFr: true, nameAr: true, startMinutes: true, endMinutes: true } },
        // Rang 41 (D336, S-52) : la COPIE du nom du devis, telle que stockée — jamais le compte du client (M-7).
        clientNameAr: true,
        clientNameLatin: true
      }
    });
    if (row === null) return null;
    const plusHaute = await this.prisma.quote.aggregate({ where: { chainId: row.chainId }, _max: { version: true } });
    return {
      id: row.id,
      reference: formatQuoteReference({ year: row.referenceYear, venueNumber: row.venue.number, quoteNumber: row.referenceNumber, version: row.version }),
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
      venue: { nameFr: row.venue.nameFr, nameAr: row.venue.nameAr },
      slot: row.slotTemplate,
      clientNameAr: row.clientNameAr,
      clientNameLatin: row.clientNameLatin
    };
  }
}
