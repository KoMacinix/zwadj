import { QuoteStatus } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import { decideQuoteDocument } from "./quote-document-policy";

// Rang 33 (D326) — décision 1 du relecteur, module PUR : aucune base, aucun navigateur.
// Rang 38 (D332) — la décision 7 (la langue du client, sinon celle du pro) est REMPLACÉE par la décision A de Ko (le pro choisit la langue à chaque
// téléchargement) : `chooseDocumentLocale` et ses tests sont retirés avec elle, et `quote-document.spec.ts` garde qu'il n'en reste rien.
describe("decideQuoteDocument — le PDF d'une version qui n'est plus active est REFUSÉ (décision 1)", () => {
  it("la dernière version d'une chaîne ouverte est servie", () => {
    expect(decideQuoteDocument({ status: QuoteStatus.DRAFT, version: 3, latestVersion: 3 })).toEqual({ outcome: "ALLOWED" });
    // Une chaîne à UNE version : la première est la dernière.
    expect(decideQuoteDocument({ status: QuoteStatus.DRAFT, version: 1, latestVersion: 1 })).toEqual({ outcome: "ALLOWED" });
  });

  it("une version plus ancienne est REFUSÉE et la réponse dit quelle est la version active", () => {
    expect(decideQuoteDocument({ status: QuoteStatus.DRAFT, version: 1, latestVersion: 2 })).toEqual({
      outcome: "VERSION_NOT_ACTIVE",
      latestVersion: 2
    });
    expect(decideQuoteDocument({ status: QuoteStatus.DRAFT, version: 2, latestVersion: 5 })).toEqual({
      outcome: "VERSION_NOT_ACTIVE",
      latestVersion: 5
    });
  });

  it("un statut hérité encore OUVERT (SENT) se sert comme un brouillon : la liste vient de QUOTE_OPEN_STATUSES, pas d'une seconde liste", () => {
    expect(decideQuoteDocument({ status: QuoteStatus.SENT, version: 2, latestVersion: 2 })).toEqual({ outcome: "ALLOWED" });
  });

  it("un devis ACCEPTÉ — la version dont l'acompte est réglé — s'imprime : le refuser serait refuser le document qui compte le plus", () => {
    expect(decideQuoteDocument({ status: QuoteStatus.ACCEPTED, version: 2, latestVersion: 2 })).toEqual({ outcome: "ALLOWED" });
  });

  it("la dernière version d'une affaire PERDUE, ou d'un statut hérité remplacé, rend le statut RÉEL", () => {
    for (const status of [QuoteStatus.CANCELLED, QuoteStatus.DECLINED, QuoteStatus.SUPERSEDED]) {
      expect(decideQuoteDocument({ status, version: 2, latestVersion: 2 })).toEqual({ outcome: "STATUS_CONFLICT", status });
    }
  });

  it("l'ensemble des statuts est PARTAGÉ sans reste : chaque statut du contrat est soit servi, soit refusé — aucun n'est oublié", () => {
    const decisions = Object.values(QuoteStatus).map((status) => [status, decideQuoteDocument({ status, version: 1, latestVersion: 1 }).outcome]);
    expect(Object.fromEntries(decisions)).toEqual({
      DRAFT: "ALLOWED",
      SENT: "ALLOWED",
      ACCEPTED: "ALLOWED",
      DECLINED: "STATUS_CONFLICT",
      CANCELLED: "STATUS_CONFLICT",
      SUPERSEDED: "STATUS_CONFLICT"
    });
  });

  it("⛔ UN CAS DOUBLEMENT FAUTIF : une ancienne version ANNULÉE est refusée comme « pas la version active », pas comme « clos »", () => {
    // Un test qui n'enfreint qu'une règle à la fois est vert quel que soit l'ordre des refus.
    expect(decideQuoteDocument({ status: QuoteStatus.CANCELLED, version: 1, latestVersion: 3 })).toEqual({
      outcome: "VERSION_NOT_ACTIVE",
      latestVersion: 3
    });
  });
});
