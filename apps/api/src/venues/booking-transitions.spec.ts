// Politique de transition des RÉSERVATIONS — lot S3.
//
// ⚠ CE QUE CETTE SPEC MESURE, ET POURQUOI ELLE ÉNUMÈRE.
// Le tableau des transitions est petit ; la tentation serait d'écrire quatre
// tests « le cas passant ». Ils seraient verts sur une politique qui autorise
// TOUT. Ce qui a de la valeur, c'est le REFUS : chaque commande est donc
// confrontée à CHAQUE statut de `BookingStatus`, et les statuts non listés
// doivent tomber. Une garde qui n'énumère pas ne peut pas voir le statut ajouté
// demain.
import { BookingStatus } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import {
  BOOKING_TRANSITIONS,
  BookingCommand,
  allowedFrom,
  decideBookingTransition,
  targetOf
} from "./booking-transitions";

const TOUS = Object.values(BookingStatus);
const COMMANDES = Object.values(BookingCommand);

describe("Tableau des transitions — la matrice COMPLÈTE, refus compris", () => {
  it.each(COMMANDES)("« %s » refuse tout statut hors de sa liste, et les accepte tous dedans", (commande) => {
    const permis = allowedFrom(commande);
    // ⚠ Garde-fou du garde-fou : une liste vide rendrait la boucle
    // triviallement verte sur les refus, sans mesurer un seul passage.
    expect(permis.length, "une commande sans statut source ne mesure rien").toBeGreaterThan(0);

    for (const statut of TOUS) {
      // Motif fourni : on isole ici la règle de STATUT, pas celle du motif.
      const decision = decideBookingTransition(commande, statut, "motif");
      if ((permis as readonly string[]).includes(statut)) {
        expect(decision.outcome, `${commande} depuis ${statut}`).toBe("ALLOWED");
      } else {
        expect(decision.outcome, `${commande} depuis ${statut}`).toBe("STATUS_CONFLICT");
      }
    }
  });

  it("un statut INCONNU de l'énumération est refusé, il ne traverse pas", () => {
    for (const commande of COMMANDES) {
      expect(decideBookingTransition(commande, "PAS_UN_STATUT", "motif").outcome).toBe("STATUS_CONFLICT");
    }
  });

  it("le refus rapporte le statut RÉEL — c'est lui que le 409 montre au pro", () => {
    const decision = decideBookingTransition(BookingCommand.ACCEPT, BookingStatus.CANCELLED);
    expect(decision).toEqual({ outcome: "STATUS_CONFLICT", status: BookingStatus.CANCELLED });
  });

  it("la cible rendue est celle du tableau, jamais le statut source", () => {
    expect(targetOf(BookingCommand.ACCEPT)).toBe(BookingStatus.ACCEPTED);
    expect(targetOf(BookingCommand.DECLINE)).toBe(BookingStatus.DECLINED);
    expect(targetOf(BookingCommand.CANCEL_AS_PRO)).toBe(BookingStatus.CANCELLED);
    expect(targetOf(BookingCommand.CANCEL_AS_CLIENT)).toBe(BookingStatus.CANCELLED);
  });

  it("⚠ AUCUNE commande n'écrit PENDING : on n'annule pas une annulation en rouvrant", () => {
    for (const commande of COMMANDES) {
      expect(targetOf(commande), `${commande} ramène vers PENDING`).not.toBe(BookingStatus.PENDING);
    }
  });

  it("⚠ `cancelAsPro` REFUSE une demande PENDING — le pro refuse par `decline`, pas par `cancel`", () => {
    // ⚠ CETTE GARDE EXISTE PARCE QUE LA MATRICE NE LA COUVRAIT PAS.
    // La matrice ci-dessus recalcule `permis` DEPUIS le tableau : elle prouve
    // que `decide` est fidèle au tableau, elle ne fige aucune valeur. Ouvrir
    // `cancelAsPro` à PENDING la laissait donc VERTE — mesuré par la cible S3-4.
    //
    // Ce que la règle protège n'est pas cosmétique : les deux chemins n'ont pas
    // le même effet. `decline` écrit DECLINED et `declineReason` ; `cancel`
    // écrit CANCELLED et `cancellationReason`. Deux façons de refuser la même
    // demande produiraient deux histoires différentes de la même salle, et
    // l'entonnoir compterait l'une pour l'autre.
    expect(decideBookingTransition(BookingCommand.CANCEL_AS_PRO, BookingStatus.PENDING).outcome).toBe(
      "STATUS_CONFLICT"
    );
    expect(decideBookingTransition(BookingCommand.DECLINE, BookingStatus.PENDING).outcome).toBe("ALLOWED");
    expect(targetOf(BookingCommand.DECLINE)).not.toBe(targetOf(BookingCommand.CANCEL_AS_PRO));
  });

  it("⚠ AUCUN statut TERMINAL n'autorise quoi que ce soit", () => {
    // DECLINED, CANCELLED, EXPIRED ferment la demande. Si l'un d'eux rouvrait
    // une commande, un créneau libéré redeviendrait modifiable.
    const terminaux = [BookingStatus.DECLINED, BookingStatus.CANCELLED, BookingStatus.EXPIRED];
    for (const commande of COMMANDES) {
      for (const statut of terminaux) {
        expect(decideBookingTransition(commande, statut, "motif").outcome, `${commande} depuis ${statut}`).toBe(
          "STATUS_CONFLICT"
        );
      }
    }
  });
});

describe("Motif d'annulation (D83) — l'asymétrie suit le préjudice", () => {
  it("depuis PENDING, le client n'a RIEN à justifier", () => {
    for (const motif of [undefined, "", "changement de programme"]) {
      const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, BookingStatus.PENDING, motif);
      expect(decision.outcome, `motif ${JSON.stringify(motif)}`).toBe("ALLOWED");
    }
  });

  it("depuis ACCEPTED, le motif est EXIGÉ — le pro a pu refuser d'autres dates", () => {
    for (const motif of [undefined, ""]) {
      const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, BookingStatus.ACCEPTED, motif);
      expect(decision, `motif ${JSON.stringify(motif)}`).toEqual({
        outcome: "REASON_REQUIRED",
        status: BookingStatus.ACCEPTED
      });
    }
    expect(decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, BookingStatus.ACCEPTED, "salle inondée").outcome).toBe(
      "ALLOWED"
    );
  });

  it("⚠ L'ORDRE des refus : le STATUT est jugé AVANT le motif", () => {
    // Sans motif ET depuis un statut fermé, c'est le conflit de statut qui
    // gagne. L'inverse apprendrait au client à renvoyer un motif pour une
    // action qui ne peut plus aboutir — un 400 là où un 409 est dû.
    const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, BookingStatus.CANCELLED, undefined);
    expect(decision.outcome).toBe("STATUS_CONFLICT");
  });

  it("le motif n'est exigé d'AUCUNE autre commande", () => {
    for (const commande of COMMANDES) {
      if (commande === BookingCommand.CANCEL_AS_CLIENT) continue;
      for (const statut of allowedFrom(commande)) {
        expect(decideBookingTransition(commande, statut, undefined).outcome, `${commande}/${statut}`).toBe("ALLOWED");
      }
    }
  });

  it("⚠ `null` n'est PAS traité comme un motif manquant — comportement conservé tel quel", () => {
    // Le service comparait exactement `undefined` ou chaîne vide. Le contrat
    // Zod ne produit pas `null` ; refermer ce cas serait un changement de
    // comportement, et il viendra avec son test rouge, pas dans un lot de
    // refactoring. Cette garde FIGE l'état réel plutôt que de le maquiller.
    const decision = decideBookingTransition(
      BookingCommand.CANCEL_AS_CLIENT,
      BookingStatus.ACCEPTED,
      null as unknown as undefined
    );
    expect(decision.outcome).toBe("ALLOWED");
  });
});

describe("Le tableau est l'unique autorité", () => {
  it("chaque commande déclarée a une entrée — aucune ne peut être oubliée", () => {
    expect(Object.keys(BOOKING_TRANSITIONS).sort()).toEqual([...COMMANDES].sort());
  });

  it("`allowedFrom` rend EXACTEMENT le `from` du tableau, sans copie ni tri", () => {
    for (const commande of COMMANDES) {
      expect(allowedFrom(commande)).toBe(BOOKING_TRANSITIONS[commande].from);
    }
  });

  it("tout statut source déclaré appartient à l'énumération", () => {
    for (const commande of COMMANDES) {
      for (const statut of allowedFrom(commande)) {
        expect(TOUS, `${commande} — ${statut}`).toContain(statut);
      }
    }
  });

  it("le motif ne peut être exigé que depuis un statut RÉELLEMENT autorisé", () => {
    // Sinon la règle serait inatteignable : un motif exigé depuis un statut que
    // la commande refuse déjà ne s'appliquerait jamais.
    for (const commande of COMMANDES) {
      for (const statut of BOOKING_TRANSITIONS[commande].reasonRequiredFrom) {
        expect(allowedFrom(commande), `${commande} — ${statut}`).toContain(statut);
      }
    }
  });
});
