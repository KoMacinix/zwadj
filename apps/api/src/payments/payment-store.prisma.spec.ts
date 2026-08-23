// Adaptateur Prisma du port de paiement — lot S5a.
//
// ⚠ CES GARDES NE SONT PAS NÉES ICI : elles viennent de
// `payments.service.spec.ts`, où elles mesuraient les mêmes `where` avant que
// S5a ne les déplace. Elles suivent le code qu'elles surveillent. Sans ce
// déménagement, extraire le port aurait fait DISPARAÎTRE la mesure de la règle
// d'accès (D47) et celle de l'idempotence — c'est-à-dire les deux choses les
// plus importantes du fichier.
//
// ⚠ « Mocker Prisma pour vérifier qu'on appelle Prisma ne mesure rien » — vrai
// en général, faux ici, et la nuance vaut d'être posée. Ce qui est asserté
// n'est pas QU'un appel a lieu : c'est le CONTENU de la clause de propriété et
// du filtre de statut. Une garde qui vérifierait « `findFirst` a été appelé »
// serait tautologique ; une garde qui vérifie « le pro propriétaire est dans le
// `OR` » mesure une règle de sécurité.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaPaymentStore } from "./payment-store.prisma";

const LIGNE = {
  id: "p-1",
  bookingId: "b-1",
  provider: "CHARGILY",
  providerCheckoutId: null,
  amountCents: 12_000_000,
  discountAppliedCents: 0,
  currency: "DZD",
  status: "PENDING",
  createdAt: new Date("2027-01-01T00:00:00.000Z")
};

function prismaDouble(options: { pendant?: unknown } = {}) {
  const créations: { data: Record<string, unknown> }[] = [];
  return {
    créations,
    booking: {
      findFirst: vi.fn(async (_args: { where: Record<string, unknown>; select: Record<string, boolean> }) => ({
        id: "b-1",
        status: "ACCEPTED",
        depositCents: 12_000_000
      }))
    },
    payment: {
      findFirst: vi.fn(async (_args: { where: Record<string, unknown> }) => options.pendant ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        créations.push({ data });
        return { ...LIGNE, ...data };
      })
    }
  };
}

const store = (prisma: ReturnType<typeof prismaDouble>) => new PrismaPaymentStore(prisma as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findBookingForPayer — la règle d'ACCÈS", () => {
  it("⚠ LE PRO PROPRIÉTAIRE EST DANS LE `OR` : il ouvre le règlement de SA salle", async () => {
    // Filtrer sur `clientId` seul rendrait un 404 à un pro sur sa propre
    // réservation — et fermerait l'encaissement d'un acompte en salle.
    const prisma = prismaDouble();
    await store(prisma).findBookingForPayer("u-1", "b-1");

    const args = prisma.booking.findFirst.mock.calls[0]?.[0];
    expect(args?.where.id).toBe("b-1");
    expect(JSON.stringify(args?.where.OR)).toContain("clientId");
    expect(JSON.stringify(args?.where.OR), "le pro propriétaire perd l'accès").toContain("owner");
  });

  it("⚠ LA PROPRIÉTÉ EST DANS LE `WHERE`, jamais lue après coup", async () => {
    // Lue après coup, elle laisserait distinguer « pas la vôtre » de « n'existe
    // pas » — précisément ce que D47 refuse d'apprendre à un curieux.
    const prisma = prismaDouble();
    await store(prisma).findBookingForPayer("u-1", "b-1");
    expect(Object.keys(prisma.booking.findFirst.mock.calls[0]?.[0].where ?? {}).sort()).toEqual(["OR", "id"]);
  });

  it("ne lit que les trois champs dont la décision a besoin", async () => {
    const prisma = prismaDouble();
    await store(prisma).findBookingForPayer("u-1", "b-1");
    expect(prisma.booking.findFirst.mock.calls[0]?.[0].select).toEqual({
      id: true,
      status: true,
      depositCents: true
    });
  });
});

describe("findOrCreatePendingIntent — l'IDEMPOTENCE", () => {
  it("⚠ UN `PENDING` EXISTANT EST RENDU TEL QUEL — aucune seconde intention", async () => {
    // Un client qui recharge trois fois la page de règlement ne doit pas créer
    // trois intentions : la réconciliation devrait ensuite deviner laquelle
    // comptait. La base ne l'interdit pas — `payments_one_paid_per_booking` ne
    // refuse qu'un second `PAID`.
    const prisma = prismaDouble({ pendant: LIGNE });
    const rendu = await store(prisma).findOrCreatePendingIntent({
      bookingId: "b-1",
      amountCents: 12_000_000,
      discountAppliedCents: 0
    });

    expect(rendu).toBe(LIGNE);
    expect(prisma.payment.create, "une seconde intention a été créée").not.toHaveBeenCalled();
  });

  it("le réutilisable est cherché SUR CETTE réservation et SEULEMENT en PENDING", async () => {
    // Reprendre un `FAILED` serait rejouer une tentative morte ; regarder une
    // autre réservation serait pire.
    const prisma = prismaDouble();
    await store(prisma).findOrCreatePendingIntent({ bookingId: "b-1", amountCents: 1, discountAppliedCents: 0 });
    expect(prisma.payment.findFirst.mock.calls[0]?.[0].where).toEqual({ bookingId: "b-1", status: "PENDING" });
  });

  it("⚠ LES MONTANTS REÇUS SONT ÉCRITS TELS QUELS — l'adaptateur ne calcule rien", async () => {
    const prisma = prismaDouble();
    await store(prisma).findOrCreatePendingIntent({
      bookingId: "b-1",
      amountCents: 7_333_333,
      discountAppliedCents: 250_000
    });

    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(prisma.créations[0]?.data).toEqual({
      bookingId: "b-1",
      amountCents: 7_333_333,
      discountAppliedCents: 250_000,
      status: "PENDING"
    });
  });

  it("l'intention naît PENDING — ce lot ne bascule aucun statut", async () => {
    const prisma = prismaDouble();
    await store(prisma).findOrCreatePendingIntent({ bookingId: "b-1", amountCents: 1, discountAppliedCents: 0 });
    expect(prisma.créations[0]?.data.status).toBe("PENDING");
  });

  it("⚠ LA RECHERCHE PRÉCÈDE LA CRÉATION — l'ordre EST l'idempotence", async () => {
    const ordre: string[] = [];
    const prisma = prismaDouble();
    prisma.payment.findFirst.mockImplementation(async () => {
      ordre.push("cherche");
      return null;
    });
    prisma.payment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      ordre.push("crée");
      prisma.créations.push({ data });
      return { ...LIGNE, ...data };
    });

    await store(prisma).findOrCreatePendingIntent({ bookingId: "b-1", amountCents: 1, discountAppliedCents: 0 });
    expect(ordre).toEqual(["cherche", "crée"]);
  });
});
