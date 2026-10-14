import { ConflictException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { formatDZD, QuoteErrorCode, ServicePricingType } from "@zwadj/types";
import { describe, expect, it, vi } from "vitest";
import { PdfRenderUnavailableError, type PdfRenderer } from "./pdf-renderer.port";
import { algiersToday, QuoteDocumentService } from "./quote-document.service";
import type { QuoteDocumentRecord, QuoteDocumentSource } from "./quote-document-source";

// Rang 33 (D326) — l'orchestration, avec des DOUBLES de port (`satisfies`, jamais `as unknown as`, D258 : un double incomplet ne passerait pas).
// Le service ne calcule rien et n'écrit rien : ce que ce fichier mesure, ce sont les REFUS, leur ordre, la langue et le passage de la valeur stockée.
const OWNER = "pro-proprietaire";
const AUTRE = "pro-autre";
const ID = "01a10f0a-5931-7a99-b800-a2cac272855a";
const PDF = Buffer.from("%PDF-test");

function record(over: Partial<QuoteDocumentRecord> = {}): QuoteDocumentRecord {
  return {
    id: ID,
    version: 2,
    latestVersion: 2,
    status: "DRAFT",
    eventDate: "2026-12-05",
    guests: 150,
    basePriceCents: 18_000_000,
    servicesTotalCents: 45_000_000,
    totalCents: 63_000_000,
    depositCents: 12_345_000,
    lines: [{ nameFr: "Buffet", nameAr: "بوفيه", pricingType: ServicePricingType.PER_GUEST, quantity: 150, tierLabelFr: null, tierLabelAr: null, lineTotalCents: 37_500_000 }],
    venue: { nameFr: "Salle des Jasmins", nameAr: "قاعة الياسمين" },
    slot: { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    client: null,
    ...over
  };
}

/** Un port de lecture qui applique la PROPRIÉTÉ comme le ferait l'adaptateur : le devis n'est rendu qu'à son propriétaire. */
function monde(rec: QuoteDocumentRecord | null, rendu: () => Promise<Buffer> = async () => PDF) {
  const findForOwner = vi.fn(async (userId: string, quoteId: string) => (userId === OWNER && quoteId === ID ? rec : null));
  const render = vi.fn((_html: string) => rendu());
  const source = { findForOwner } satisfies QuoteDocumentSource;
  const renderer = { render } satisfies PdfRenderer;
  return { service: new QuoteDocumentService(source, renderer), findForOwner, render };
}

const refus = async (promesse: Promise<unknown>) => promesse.then(() => null, (e: unknown) => e);

describe("QuoteDocumentService — la propriété et le 404 indistinct (décision 4)", () => {
  it("un AUTRE pro est refusé en 404, sans rien rendre : un identifiant de devis deviné ne livre pas les données d'un client", async () => {
    const m = monde(record());
    const erreur = await refus(m.service.render(AUTRE, ID, "fr"));
    expect(erreur).toBeInstanceOf(NotFoundException);
    expect((erreur as NotFoundException).getResponse()).toMatchObject({ code: QuoteErrorCode.QUOTE_NOT_FOUND });
    expect(m.render).not.toHaveBeenCalled();
  });

  it("un devis inexistant et un identifiant mal formé rendent la MÊME réponse — ce dernier sans même lire la base", async () => {
    const m = monde(null);
    const absent = await refus(m.service.render(OWNER, ID, "fr"));
    const malForme = await refus(m.service.render(OWNER, "pas-un-uuid", "fr"));
    expect(absent).toBeInstanceOf(NotFoundException);
    expect(malForme).toBeInstanceOf(NotFoundException);
    expect((absent as NotFoundException).getResponse()).toEqual((malForme as NotFoundException).getResponse());
    expect(m.findForOwner).toHaveBeenCalledTimes(1); // le mal formé n'a PAS atteint le port
  });
});

describe("QuoteDocumentService — les refus métier (décision 1)", () => {
  it("une version qui n'est plus la dernière : 409 QUOTE_VERSION_NOT_ACTIVE, `latestVersion` dans la réponse, RIEN n'est rendu", async () => {
    const m = monde(record({ version: 1, latestVersion: 3 }));
    const erreur = await refus(m.service.render(OWNER, ID, "fr"));
    expect(erreur).toBeInstanceOf(ConflictException);
    expect((erreur as ConflictException).getResponse()).toMatchObject({
      code: QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE,
      message: "quote.errors.versionNotActive",
      latestVersion: 3
    });
    expect(m.render).not.toHaveBeenCalled();
  });

  it("une affaire perdue : 409 QUOTE_STATUS_CONFLICT avec le statut RÉEL, rien n'est rendu", async () => {
    const m = monde(record({ status: "CANCELLED" }));
    const erreur = await refus(m.service.render(OWNER, ID, "fr"));
    expect((erreur as ConflictException).getResponse()).toMatchObject({ code: QuoteErrorCode.QUOTE_STATUS_CONFLICT, status: "CANCELLED" });
    expect(m.render).not.toHaveBeenCalled();
  });

  it("⛔ un cas doublement fautif — ancienne version ET annulée — se refuse comme « pas la version active »", async () => {
    const m = monde(record({ version: 1, latestVersion: 2, status: "CANCELLED" }));
    const erreur = await refus(m.service.render(OWNER, ID, "fr"));
    expect((erreur as ConflictException).getResponse()).toMatchObject({ code: QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE, latestVersion: 2 });
  });
});

describe("QuoteDocumentService — la valeur stockée, la langue (décisions 1 et 7)", () => {
  it("rend le PDF de la version active ; le HTML confié au moteur porte la valeur STOCKÉE (et pas 30 % du total) ; le nom du fichier est sans donnée personnelle", async () => {
    const m = monde(record());
    const sortie = await m.service.render(OWNER, ID, "fr", new Date("2026-10-06T10:00:00Z"));
    expect(sortie.pdf).toBe(PDF);
    expect(sortie.filename).toBe("devis-2026-12-05-v2-01a10f0a.pdf");
    const html = m.render.mock.calls[0]![0];
    expect(html).toContain(formatDZD(12_345_000));
    expect(html).not.toContain(formatDZD(Math.round(63_000_000 * 0.3)));
  });

  it("rang 38 (décision A de Ko) : la langue du PDF est la langue DEMANDÉE — le pro la choisit à chaque téléchargement, dans les deux sens", async () => {
    for (const demandee of ["fr", "ar"] as const) {
      const sortie = await monde(record()).service.render(OWNER, ID, demandee);
      expect(sortie.locale).toBe(demandee);
    }
    const m = monde(record());
    await m.service.render(OWNER, ID, "ar");
    expect(m.render.mock.calls[0]![0]).toContain('<html lang="ar" dir="rtl">');
  });

  it("⛔ rang 38 (P-15) : un devis LIÉ À UN COMPTE ne change pas la langue — le compte du client n'a plus de langue dans le port de lecture, et le résultat n'a plus de `branch`", async () => {
    // La fixture du port n'a PLUS de champ `locale` pour le client (le type l'interdit) : la langue d'un compte ne peut donc plus servir.
    const m = monde(record({ client: { firstName: "آمنة", lastName: "بن سالم" } }));
    const sortie = await m.service.render(OWNER, ID, "fr");
    expect(sortie.locale).toBe("fr");
    expect(sortie).not.toHaveProperty("branch");
    expect(m.render.mock.calls[0]![0]).toContain('<html lang="fr" dir="ltr">');
  });
});

describe("QuoteDocumentService — une PANNE n'est pas un refus (décision 3)", () => {
  it("le moteur qui n'a pas rendu : 503 QUOTE_DOCUMENT_UNAVAILABLE — et JAMAIS un 409", async () => {
    const m = monde(record(), async () => Promise.reject(new PdfRenderUnavailableError(new Error("navigateur absent"))));
    const erreur = await refus(m.service.render(OWNER, ID, "fr"));
    expect(erreur).toBeInstanceOf(ServiceUnavailableException);
    expect(erreur).not.toBeInstanceOf(ConflictException);
    expect((erreur as ServiceUnavailableException).getResponse()).toMatchObject({
      code: QuoteErrorCode.QUOTE_DOCUMENT_UNAVAILABLE,
      message: "quote.errors.documentUnavailable"
    });
  });

  it("toute AUTRE erreur du moteur remonte telle quelle : le service ne la déguise pas en panne attendue", async () => {
    const m = monde(record(), async () => Promise.reject(new RangeError("défaut de programmation")));
    expect(await refus(m.service.render(OWNER, ID, "fr"))).toBeInstanceOf(RangeError);
  });
});

describe("algiersToday — la date d'émission est celle d'Alger (UTC+1, D48)", () => {
  it("à 23 h 30 UTC il est déjà le lendemain à Alger : le fuseau n'est pas celui du serveur", () => {
    expect(algiersToday(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
    expect(algiersToday(new Date("2026-10-05T22:59:00Z"))).toBe("2026-10-05");
  });
});
