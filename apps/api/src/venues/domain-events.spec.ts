// Éditeur d'événements de domaine — lot S6.
//
// ⚠ CE QUE CES GARDES MESURENT. L'éditeur est la COUTURE entre un cas d'usage
// et ses destinataires. Ce qui compte n'est pas qu'il « fonctionne » — c'est
// qu'il tienne trois promesses sous lesquelles D63 a été prise : publication
// séquentielle, ORDRE d'abonnement respecté, et JAMAIS de levée vers
// l'appelant. Les deux premières sont observables ; la troisième est la seule
// qui protège une réservation déjà écrite.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainEvents } from "./domain-events";

const loggerDouble = () => ({ setContext: vi.fn(), info: vi.fn(), error: vi.fn() });

function editeur() {
  const logger = loggerDouble();
  return { events: new DomainEvents(logger as never), logger };
}

/** Charge utile opaque : l'éditeur ne la lit jamais. */
const CHARGE = { bookingId: "b-1" } as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Publication", () => {
  it("le handler abonné reçoit la charge utile INCHANGÉE", async () => {
    const { events } = editeur();
    const vu: unknown[] = [];
    events.subscribe("booking.requested", async (p) => {
      vu.push(p);
    });

    await events.publish("booking.requested", CHARGE);
    expect(vu).toEqual([CHARGE]);
  });

  it("⚠ PUBLIER SANS ABONNÉ NE LÈVE PAS — et c'est aussi le risque", async () => {
    // Une table de routage oubliée envoie les événements dans le vide, en
    // silence. C'est le prix de « ne jamais lever » ; l'intégration est ce qui
    // rattrape ce cas-là, en vérifiant que la ligne `Notification` existe.
    const { events } = editeur();
    await expect(events.publish("booking.accepted", CHARGE)).resolves.toBeUndefined();
  });

  it("un événement ne réveille QUE ses propres abonnés", async () => {
    const { events } = editeur();
    const accepte = vi.fn(async () => {});
    const refuse = vi.fn(async () => {});
    events.subscribe("booking.accepted", accepte);
    events.subscribe("booking.declined", refuse);

    await events.publish("booking.accepted", CHARGE);
    expect(accepte).toHaveBeenCalledTimes(1);
    expect(refuse).not.toHaveBeenCalled();
  });
});

describe("Ordre — le pro d'abord, le client ensuite", () => {
  it("⚠ LES HANDLERS S'EXÉCUTENT DANS L'ORDRE D'ABONNEMENT", async () => {
    // `visit.booked` en a deux. Les inverser changerait l'ordre d'écriture des
    // lignes `Notification`, que l'intégration mesure.
    const { events } = editeur();
    const ordre: string[] = [];
    events.subscribe("visit.booked", async () => {
      ordre.push("pro");
    });
    events.subscribe("visit.booked", async () => {
      ordre.push("client");
    });

    await events.publish("visit.booked", CHARGE);
    expect(ordre).toEqual(["pro", "client"]);
  });

  it("⚠ SÉQUENTIEL, PAS EN PARALLÈLE : chaque handler est ATTENDU", async () => {
    // Sans l'`await`, l'assertion d'un test courrait contre l'envoi — et le
    // déterminisme des gardes de S2 tomberait avec lui.
    const { events } = editeur();
    const ordre: string[] = [];
    events.subscribe("visit.booked", async () => {
      await new Promise((r) => setTimeout(r, 5));
      ordre.push("lent");
    });
    events.subscribe("visit.booked", async () => {
      ordre.push("rapide");
    });

    await events.publish("visit.booked", CHARGE);
    expect(ordre).toEqual(["lent", "rapide"]);
  });
});

describe("⚠ NE LÈVE JAMAIS (D63) — l'acte écrit reste écrit", () => {
  it("un handler qui lève ne remonte pas à l'appelant, il est JOURNALISÉ", async () => {
    const { events, logger } = editeur();
    events.subscribe("booking.accepted", async () => {
      throw new Error("gabarit cassé");
    });

    await expect(events.publish("booking.accepted", CHARGE)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("⚠ UN HANDLER TOMBÉ NE PRIVE PAS LES SUIVANTS DE LEUR COURRIER", async () => {
    // Sur `visit.booked`, le pro et le client passent par deux handlers. Que le
    // premier échoue ne doit pas laisser le client sans confirmation.
    const { events } = editeur();
    const second = vi.fn(async () => {});
    events.subscribe("visit.booked", async () => {
      throw new Error("SMTP indisponible");
    });
    events.subscribe("visit.booked", second);

    await events.publish("visit.booked", CHARGE);
    expect(second, "le second handler a été sauté").toHaveBeenCalledTimes(1);
  });

  it("un rejet NON-Error est absorbé de la même façon", async () => {
    const { events, logger } = editeur();
    events.subscribe("booking.declined", async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "passerelle coupée";
    });

    await expect(events.publish("booking.declined", CHARGE)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
