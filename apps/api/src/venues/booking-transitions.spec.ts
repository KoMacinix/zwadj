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
  targetOf,
  writableFrom
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

  it("C1 — depuis un statut TERMINAL (DECLINED, EXPIRED, CANCELLED : décision produit « Modèle de réservation »), toute commande est refusée et rien n'est inscriptible, motif ou non", () => {
    // ⛔ RANG 23 · 23a-2 (D308) — MD-C1 (a). Ce test existait (lot S3) avec la
    // même liste, sans sa source et pour un seul motif ; il DEVIENT le test C1.
    //
    // ⚠ LA LISTE EST ÉCRITE À LA MAIN, ET C'EST LE POINT. Dérivée de la table,
    // elle suivrait la table dans son erreur : la matrice ci-dessus reste VERTE
    // quand la table ouvre l'annulation client depuis DECLINED (mesuré, D308).
    //
    // SOURCE — `AGENTS.md`, « Modèle de réservation » (décisions produit
    // validées) : `Booking` traverse « pending → accepted/declined/expired →
    // confirmed → cancelled », précisé par le backlog 6.3 : « pending →
    // accepted/declined/expired ; accepted → confirmed/cancelled ». Est
    // TERMINAL un statut d'où ne part AUCUNE flèche.
    // ⚠ Aucune décision n'écrit le mot « terminal » : la liste se LIT sur les
    // flèches. CONFIRMED n'en est pas (confirmed → cancelled), même si aucune
    // commande n'en part aujourd'hui.
    //
    // Si l'un d'eux rouvrait une commande, un créneau libéré redeviendrait
    // modifiable — et un client annulerait une demande REFUSÉE (D306, C1).
    const terminaux = [BookingStatus.DECLINED, BookingStatus.EXPIRED, BookingStatus.CANCELLED];
    // Les cinq formes de motif de la sonde P9 de D306 ; `null` que le contrat
    // Zod ne produit pas, mais que la décision reçoit telle quelle.
    const motifs = [undefined, "", " ", "motif", null as unknown as undefined];
    for (const commande of COMMANDES) {
      for (const motif of motifs) {
        for (const statut of terminaux) {
          expect(
            decideBookingTransition(commande, statut, motif).outcome,
            `${commande} depuis ${statut}, motif ${JSON.stringify(motif)}`
          ).toBe("STATUS_CONFLICT");
        }
        // L'écriture ne doit pas pouvoir partir de là non plus : c'est son
        // prédicat, depuis 23a, qui refuse — la décision seule ne suffit pas.
        const inscriptibles = writableFrom(commande, motif).filter((s) => (terminaux as readonly string[]).includes(s));
        expect(inscriptibles, `${commande}, motif ${JSON.stringify(motif)}`).toEqual([]);
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

// Rang 23 · F5 (D305) — le prédicat de l'ÉCRITURE porte la règle du motif.
// ⚠ L'attendu se dérive du TABLEAU (`from` moins `reasonRequiredFrom`) ; la
// fonction, elle, passe par `decideBookingTransition`. Deux chemins distincts
// vers la même règle : recalculer l'attendu PAR la fonction mesurée donnerait
// une garde verte par construction (D241, D223).
describe("Statuts inscriptibles selon le motif (rang 23 · F5)", () => {
  const CAC = BookingCommand.CANCEL_AS_CLIENT;
  const sansMotifExige = (): BookingStatus[] =>
    BOOKING_TRANSITIONS[CAC].from.filter((s) => !BOOKING_TRANSITIONS[CAC].reasonRequiredFrom.includes(s));

  it("writableFrom — SANS motif, l'annulation client n'écrit que depuis les statuts qui ne l'exigent pas (D83)", () => {
    // Garde-fou du garde-fou : sans statut à motif exigé, les deux listes
    // seraient égales par accident et le test ne mesurerait rien.
    expect(BOOKING_TRANSITIONS[CAC].reasonRequiredFrom.length).toBeGreaterThan(0);
    expect(sansMotifExige().length).toBeGreaterThan(0);
    expect(writableFrom(CAC, undefined)).toEqual(sansMotifExige());
    // Le cas qui a coûté (F5) : une demande ACCEPTED ne s'annule pas sans motif.
    expect(writableFrom(CAC, undefined)).not.toContain(BookingStatus.ACCEPTED);
  });

  it("writableFrom — une chaîne VIDE vaut une absence de motif, comme dans la décision", () => {
    expect(writableFrom(CAC, "")).toEqual(sansMotifExige());
    expect(writableFrom(CAC, "")).not.toContain(BookingStatus.ACCEPTED);
  });

  it("writableFrom — AVEC motif, l'annulation client écrit depuis tout son `from`", () => {
    expect(writableFrom(CAC, "salle inondée")).toEqual([...allowedFrom(CAC)]);
  });

  it("writableFrom et decideBookingTransition s'accordent sur TOUS les couples commande, motif, statut (D306, sonde P9)", () => {
    // ⛔ RANG 23 · 23a-2 (D308) — MD-C6. D306 l'a vérifié par une sonde hors
    // suite (120 couples, 0 écart) ; il devient une garde.
    // ⚠ PAS UNE TAUTOLOGIE : `writableFrom` est DÉRIVÉ de la décision
    // aujourd'hui, et ce test garde la DÉRIVATION. Une réécriture qui
    // comparerait le motif autrement ferait écrire depuis un statut que la
    // décision refuse — ou l'inverse : c'est le défaut F5 lui-même, une
    // décision prise sur une règle et une écriture faite sur une autre.
    // Commandes et statuts viennent des énumérations, jamais d'une liste.
    const motifs = [undefined, "", " ", "motif", null as unknown as undefined];
    let couples = 0;
    for (const commande of COMMANDES) {
      for (const motif of motifs) {
        const inscriptibles = writableFrom(commande, motif) as readonly string[];
        for (const statut of TOUS) {
          couples += 1;
          const permis = decideBookingTransition(commande, statut, motif).outcome === "ALLOWED";
          expect(inscriptibles.includes(statut), `${commande} / motif ${JSON.stringify(motif)} / ${statut}`).toBe(permis);
        }
        // Et rien d'inscriptible hors de l'énumération.
        expect(inscriptibles.filter((s) => !(TOUS as readonly string[]).includes(s))).toEqual([]);
      }
    }
    // Garde-fou du garde-fou : une boucle vide serait verte sans rien mesurer (D248).
    expect(couples).toBeGreaterThan(0);
  });

  it("writableFrom — une commande sans motif exigé écrit depuis son `from`, motif ou non", () => {
    for (const commande of COMMANDES) {
      if (commande === CAC) continue;
      for (const motif of [undefined, "", "motif"]) {
        expect(writableFrom(commande, motif), `${commande} / ${JSON.stringify(motif)}`).toEqual([...allowedFrom(commande)]);
      }
    }
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
