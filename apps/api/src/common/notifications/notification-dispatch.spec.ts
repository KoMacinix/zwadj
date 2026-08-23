// Cœur commun des notifications (lot S2) — doubles de ports, aucune base.
//
// ⚠ POURQUOI CE FICHIER EXISTE, ET CE QU'IL NE FAIT SURTOUT PAS.
// S2 a sorti de DEUX services un corps identique. Le piège serait d'écrire ici
// un test « le côté réservation se comporte comme le côté visite » : après
// extraction, il ne peut plus faire autrement, il serait donc VERT par
// construction et ne mesurerait rien (D223). Les cinq gardes ci-dessous
// mesurent la RÈGLE elle-même — l'ordre des écritures, la troncature, le
// silence obstiné — chacune neutralisable dans `notification-dispatch.ts`.
//
// Le service des visites garde sa propre spec, INCHANGÉE par ce lot : c'est
// elle qui atteste que l'appelant lit bien ce cœur-ci.
import { describe, expect, it, vi } from "vitest";
import { dispatchNotification } from "./notification-dispatch";

interface Created {
  userId: string;
  channel: string;
  type: string;
  status: string;
  payload: unknown;
}

/** ⚠ Créé à CHAQUE appel, jamais partagé entre tests — patron repris de
 *  `visit-notifications.service.spec.ts` : un `vi.fn()` de portée module rend
 *  les compteurs dépendants de l'ordre d'exécution. */
function prismaDouble() {
  const created: Created[] = [];
  const updated: { id: string; data: Record<string, unknown> }[] = [];
  return {
    created,
    updated,
    notification: {
      create: vi.fn(async ({ data }: { data: Created }) => {
        created.push(data);
        return { id: `n${created.length}` };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updated.push({ id: where.id, data });
        return {};
      })
    }
  };
}

const loggerDouble = () => ({ setContext: vi.fn(), info: vi.fn(), error: vi.fn() });

function build(send: () => Promise<void>) {
  const prisma = prismaDouble();
  const logger = loggerDouble();
  const lancer = () =>
    dispatchNotification({
      prisma: prisma as never,
      logger: logger as never,
      type: "booking.requested",
      channel: "EMAIL",
      userId: "u-1",
      payload: { bookingId: "b-1", venueId: "v-1", eventDate: "2027-08-15" },
      send
    });
  return { prisma, logger, lancer };
}

describe("dispatchNotification — 1. la trace s'écrit AVANT l'envoi", () => {
  it("la ligne est créée en QUEUED, et elle l'est avant que l'envoyeur soit appelé", async () => {
    const ordre: string[] = [];
    const prisma = prismaDouble();
    const logger = loggerDouble();
    prisma.notification.create.mockImplementation(async ({ data }: { data: Created }) => {
      ordre.push("create");
      prisma.created.push(data);
      return { id: "n1" };
    });

    await dispatchNotification({
      prisma: prisma as never,
      logger: logger as never,
      type: "visit.booked",
      channel: "SMS",
      userId: "u-9",
      payload: { visitBookingId: "vb-1" },
      send: async () => {
        ordre.push("send");
      }
    });

    // ⚠ L'ORDRE est la garde, pas la seule présence : écrire la trace APRÈS
    // l'envoi perdrait exactement les notifications qu'un rejeu voudrait
    // retrouver — un process tué entre les deux ne laisserait rien.
    expect(ordre).toEqual(["create", "send"]);
    expect(prisma.created[0]?.status).toBe("QUEUED");
  });

  it("la charge utile traverse OPAQUE : le cœur ne la lit ni ne la réécrit", async () => {
    const { prisma, lancer } = build(async () => {});
    await lancer();
    expect(prisma.created[0]?.payload).toEqual({ bookingId: "b-1", venueId: "v-1", eventDate: "2027-08-15" });
  });
});

describe("dispatchNotification — 2. succès", () => {
  it("l'envoi passe → la ligne est résolue SENT et horodatée", async () => {
    const { prisma, lancer } = build(async () => {});
    await lancer();

    expect(prisma.updated).toHaveLength(1);
    expect(prisma.updated[0]?.id).toBe("n1");
    expect(prisma.updated[0]?.data).toMatchObject({ status: "SENT" });
    expect(prisma.updated[0]?.data.sentAt).toBeInstanceOf(Date);
  });

  it("la résolution n'arrive QU'APRÈS l'envoi — l'appel est attendu, pas lancé en l'air (D63)", async () => {
    const ordre: string[] = [];
    const prisma = prismaDouble();
    const logger = loggerDouble();
    prisma.notification.update.mockImplementation(async () => {
      ordre.push("update");
      return {};
    });

    await dispatchNotification({
      prisma: prisma as never,
      logger: logger as never,
      type: "booking.accepted",
      channel: "EMAIL",
      userId: "u-1",
      payload: {},
      send: async () => {
        await new Promise((r) => setTimeout(r, 5));
        ordre.push("send");
      }
    });

    expect(ordre).toEqual(["send", "update"]);
  });
});

describe("dispatchNotification — 3. l'envoi tombe", () => {
  it("la ligne passe FAILED avec le motif, et RIEN ne remonte à l'appelant", async () => {
    const { prisma, lancer } = build(async () => {
      throw new Error("SMTP indisponible");
    });

    await expect(lancer()).resolves.toBeUndefined();
    expect(prisma.updated[0]?.data).toMatchObject({ status: "FAILED", error: "SMTP indisponible" });
  });

  it("⚠ LE MOTIF EST TRONQUÉ À 500 : la colonne ne doit pas être ce qui fait tomber l'écriture", async () => {
    const { prisma, lancer } = build(async () => {
      throw new Error("x".repeat(1200));
    });
    await lancer();

    const motif = prisma.updated[0]?.data.error as string;
    // Borne relevée sur le code, pas supposée : 500 exactement, et le début du
    // message — une troncature par la fin dirait autre chose.
    expect(motif).toHaveLength(500);
    expect(motif).toBe("x".repeat(500));
  });

  it("un envoyeur qui rejette une valeur NON-Error laisse quand même un motif lisible", async () => {
    const { prisma, lancer } = build(async () => {
      throw "passerelle coupée";
    });
    await lancer();
    expect(prisma.updated[0]?.data.error).toBe("passerelle coupée");
  });

  it("l'échec est LOGGÉ : sans journal, une notification perdue est invisible", async () => {
    const { logger, lancer } = build(async () => {
      throw new Error("SMTP indisponible");
    });
    await lancer();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe("dispatchNotification — 4. la trace elle-même ne s'écrit pas", () => {
  it("base indisponible → on logge, on ne lève pas : l'acte écrit reste écrit (D63)", async () => {
    const prisma = prismaDouble();
    const logger = loggerDouble();
    prisma.notification.create.mockRejectedValueOnce(new Error("base indisponible"));

    await expect(
      dispatchNotification({
        prisma: prisma as never,
        logger: logger as never,
        type: "booking.declined",
        channel: "EMAIL",
        userId: "u-1",
        payload: {},
        send: async () => {}
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(prisma.updated).toHaveLength(0);
  });

  it("⚠ LA MISE À JOUR aussi peut tomber, et le silence tient encore", async () => {
    const prisma = prismaDouble();
    const logger = loggerDouble();
    prisma.notification.update.mockRejectedValueOnce(new Error("base coupée en vol"));

    await expect(
      dispatchNotification({
        prisma: prisma as never,
        logger: logger as never,
        type: "visit.cancelled",
        channel: "EMAIL",
        userId: "u-1",
        payload: {},
        send: async () => {}
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
