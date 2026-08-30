// Politique de transition des DEVIS — lot S3.
//
// ⚠ Même principe que côté réservations : chaque commande est confrontée à
// CHAQUE statut, refus compris. Ce qui a de la valeur ici, c'est ce que le
// tableau interdit — écrire un statut hérité, ou rouvrir une chaîne close.
import { QUOTE_OPEN_STATUSES, QuoteStatus } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import {
  QUOTE_TRANSITIONS,
  QuoteCommand,
  decideQuoteTransition,
  quoteAllowedFrom,
  quoteTargetOf,
  quoteWrittenStatus
} from "./quote-transitions";

const TOUS = Object.values(QuoteStatus);
const COMMANDES = Object.values(QuoteCommand);

/** ⚠ Trio relevé sur `schema.prisma` et sur les commentaires de
 *  `packages/types/src/quote.ts` — LU, jamais écrit depuis Q2/Q3a. */
const HERITES = [QuoteStatus.SENT, QuoteStatus.SUPERSEDED, QuoteStatus.DECLINED];

describe("Tableau des transitions — la matrice COMPLÈTE", () => {
  it.each(COMMANDES)("« %s » n'accepte que ses statuts source, et les accepte tous", (commande) => {
    const permis = quoteAllowedFrom(commande);
    expect(permis.length, "une commande sans statut source ne mesure rien").toBeGreaterThan(0);

    for (const statut of TOUS) {
      const decision = decideQuoteTransition(commande, statut);
      if ((permis as readonly string[]).includes(statut)) {
        expect(decision.outcome, `${commande} depuis ${statut}`).toBe("ALLOWED");
      } else {
        expect(decision.outcome, `${commande} depuis ${statut}`).toBe("STATUS_CONFLICT");
      }
    }
  });

  it("un statut INCONNU est refusé partout", () => {
    for (const commande of COMMANDES) {
      expect(decideQuoteTransition(commande, "PAS_UN_STATUT").outcome).toBe("STATUS_CONFLICT");
    }
  });

  it("le refus rapporte le statut RÉEL", () => {
    expect(decideQuoteTransition(QuoteCommand.CANCEL, QuoteStatus.CANCELLED)).toEqual({
      outcome: "STATUS_CONFLICT",
      status: QuoteStatus.CANCELLED
    });
  });

  it("⚠ une chaîne CLOSE ne se rouvre pas : ni un refus, ni une acceptation", () => {
    for (const commande of COMMANDES) {
      for (const statut of [QuoteStatus.CANCELLED, QuoteStatus.ACCEPTED, QuoteStatus.SUPERSEDED]) {
        expect(decideQuoteTransition(commande, statut).outcome, `${commande} depuis ${statut}`).toBe(
          "STATUS_CONFLICT"
        );
      }
    }
  });
});

describe("Statuts hérités — LUS, jamais ÉCRITS", () => {
  it("⚠ AUCUNE commande ne prend un statut hérité pour CIBLE", () => {
    // Énumération sur le TABLEAU et non commande par commande : la garde couvre
    // d'avance la commande qu'on ajoutera demain.
    for (const commande of COMMANDES) {
      const cible = quoteTargetOf(commande);
      if (cible === null) continue;
      expect(HERITES, `${commande} écrit ${cible}`).not.toContain(cible);
    }
  });

  it("`SENT` reste une SOURCE légale — un devis hérité se manipule encore", () => {
    // Q2 a cessé d'écrire SENT ; les lignes de D166 existent toujours et
    // doivent rester remises, révisées, converties et closes.
    expect(QUOTE_OPEN_STATUSES).toContain(QuoteStatus.SENT);
    for (const commande of COMMANDES) {
      expect(decideQuoteTransition(commande, QuoteStatus.SENT).outcome, `${commande}`).toBe("ALLOWED");
    }
  });
});

describe("Ce qui écrit un statut, et ce qui n'en écrit pas", () => {
  it("⚠ SEUL `cancel` écrit un statut — les trois autres n'y touchent pas", () => {
    expect(quoteTargetOf(QuoteCommand.CANCEL)).toBe(QuoteStatus.CANCELLED);
    for (const commande of [QuoteCommand.DELIVER, QuoteCommand.REVISE, QuoteCommand.CONVERT]) {
      expect(quoteTargetOf(commande), `${commande} écrit un statut`).toBeNull();
    }
  });

  it("`quoteWrittenStatus` LÈVE pour une commande qui n'écrit rien", () => {
    // C'est ce qui empêche le champ `to` de devenir décoratif : impossible
    // d'écrire un statut que le tableau dit inexistant.
    for (const commande of [QuoteCommand.DELIVER, QuoteCommand.REVISE, QuoteCommand.CONVERT]) {
      expect(() => quoteWrittenStatus(commande)).toThrow(/n'écrit aucun statut/);
    }
    expect(quoteWrittenStatus(QuoteCommand.CANCEL)).toBe(QuoteStatus.CANCELLED);
  });
});

describe("Le tableau est l'unique autorité", () => {
  it("chaque commande déclarée a une entrée", () => {
    expect(Object.keys(QUOTE_TRANSITIONS).sort()).toEqual([...COMMANDES].sort());
  });

  it("⚠ les statuts ouverts VIENNENT de `@zwadj/types`, ils ne sont pas recopiés", () => {
    // Identité de référence, pas égalité de contenu : une copie de même contenu
    // passerait `toEqual` et divergerait au premier ajout.
    for (const commande of COMMANDES) {
      expect(quoteAllowedFrom(commande), `${commande}`).toBe(QUOTE_OPEN_STATUSES);
    }
  });

  it("tout statut source déclaré appartient à l'énumération", () => {
    for (const commande of COMMANDES) {
      for (const statut of quoteAllowedFrom(commande)) {
        expect(TOUS, `${commande} — ${statut}`).toContain(statut);
      }
    }
  });
});
