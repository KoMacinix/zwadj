import { QuoteStatus, QUOTE_DOCUMENT_LOCALES } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import { chooseDocumentLocale, decideQuoteDocument } from "./quote-document-policy";

// Rang 33 (D326) — décisions 1 et 7 du relecteur, module PUR : aucune base, aucun navigateur.
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

describe("chooseDocumentLocale — la langue du client quand elle est lisible, sinon celle du pro (décision 7)", () => {
  it("un client `ar` reçoit un PDF ARABE, même si le pro clique depuis une interface française", () => {
    expect(chooseDocumentLocale({ clientLocale: "ar", fallback: "fr" })).toEqual({ locale: "ar", branch: "CLIENT" });
  });

  it("un client `fr` reçoit un PDF français, même si le pro clique depuis une interface arabe", () => {
    expect(chooseDocumentLocale({ clientLocale: "fr", fallback: "ar" })).toEqual({ locale: "fr", branch: "CLIENT" });
  });

  it("sans client (le parcours sur place), c'est le REPLI : la langue de l'interface du pro, dans les deux sens", () => {
    expect(chooseDocumentLocale({ clientLocale: null, fallback: "ar" })).toEqual({ locale: "ar", branch: "FALLBACK" });
    expect(chooseDocumentLocale({ clientLocale: null, fallback: "fr" })).toEqual({ locale: "fr", branch: "FALLBACK" });
  });

  it("⛔ la comparaison est au MINUSCULE de l'énuméré : « AR » (la faute de F7) n'est PAS lu comme l'arabe — c'est le repli, jamais une langue devinée", () => {
    expect(chooseDocumentLocale({ clientLocale: "AR", fallback: "fr" })).toEqual({ locale: "fr", branch: "FALLBACK" });
    expect(chooseDocumentLocale({ clientLocale: "en", fallback: "ar" })).toEqual({ locale: "ar", branch: "FALLBACK" });
    expect(chooseDocumentLocale({ clientLocale: "", fallback: "fr" })).toEqual({ locale: "fr", branch: "FALLBACK" });
  });

  it("chaque langue de la liste d'autorité est reconnue (la liste est celle du contrat, pas une copie)", () => {
    for (const l of QUOTE_DOCUMENT_LOCALES) {
      expect(chooseDocumentLocale({ clientLocale: l, fallback: l === "fr" ? "ar" : "fr" })).toEqual({ locale: l, branch: "CLIENT" });
    }
  });
});
