// ⛔ S10b-1 — LES QUATRE TRANSACTIONS, MESURÉES LÀ OÙ ELLES SONT ÉCRITES.
//
// ⚠ CE QUE CE FICHIER PEUT ET NE PEUT PAS PROUVER. Il mesure la SÉQUENCE : que
// les deux écritures de `creerTeteDeChaine` sont dans la même transaction, que
// `creerRevision` prend le verrou AVANT de lire `MAX(version)`, que le
// check-and-set relit le statut DANS la transaction. Il ne prouve pas
// l'atomicité réelle — seul `quotes.int-spec.ts`, contre PostgreSQL, le peut.
// Une séquence juste est nécessaire, pas suffisante ; les deux se complètent.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { PrismaQuoteStore } from "./quote-store.prisma";
import { QUOTE_SELECT } from "./quote-store.types";

const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const QUOTE_ID = "018f0000-0000-7000-8000-00000000dddd";
const CHAINE = "018f0000-0000-7000-8000-00000000cccc";

const CHIFFRE = {
  clientId: null,
  slotTemplateId: null,
  eventDate: new Date("2027-05-12T00:00:00.000Z"),
  guests: 200,
  basePriceCents: 18_000_000,
  servicesTotalCents: 0,
  totalCents: 18_000_000,
  depositCents: 5_400_000,
  lines: []
};

/** ⚠ Le faux `$transaction` est un PASSE-PLAT, et c'est assumé : il sert à
 *  observer la SÉQUENCE des appels, pas à simuler une transaction. Confondre
 *  les deux est le piège MD7 du cadrage — c'est pourquoi rien ici ne prétend
 *  mesurer l'atomicité. */
function build() {
  const journal: string[] = [];
  // ⚠ CHAQUE BOUCHON DÉCLARE SON PARAMÈTRE ET SON RETOUR. Sans paramètre,
  // `mock.calls[0][0]` porte sur un tuple VIDE et ne compile pas ; sans type de
  // retour large, un `mockResolvedValue` partiel est refusé. Un double
  // approximatif est exactement ce que ce lot combat — y compris ici.
  type Charge = Record<string, unknown>;
  type Ligne = Record<string, unknown>;
  const tx = {
    quote: {
      create: vi.fn(async (_args: Charge): Promise<Ligne> => {
        journal.push("create");
        return { id: QUOTE_ID };
      }),
      update: vi.fn(async (_args: Charge): Promise<Ligne> => {
        journal.push("update");
        return { id: QUOTE_ID };
      }),
      updateMany: vi.fn(async (_args: Charge): Promise<{ count: number }> => {
        journal.push("updateMany");
        return { count: 1 };
      }),
      findUniqueOrThrow: vi.fn(async (_args: Charge): Promise<Ligne> => {
        journal.push("findUniqueOrThrow");
        return { id: QUOTE_ID, status: "DRAFT" };
      }),
      aggregate: vi.fn(async (_args: Charge): Promise<{ _max: { version: number | null } }> => {
        journal.push("aggregate");
        return { _max: { version: 3 } };
      })
    },
    $queryRaw: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => {
      journal.push("FOR UPDATE");
      return [];
    })
  };
  type Charge2 = Record<string, unknown>;
  const prisma = {
    $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    quote: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    venue: { findFirst: vi.fn().mockResolvedValue(null) },
    booking: {
      create: vi.fn(async (_args: Charge2): Promise<{ id: string }> => ({ id: "b-1" })),
      findFirst: vi.fn(async (_args: Charge2): Promise<{ id: string } | null> => null)
    }
  };
  return { store: new PrismaQuoteStore(prisma as unknown as PrismaService), prisma, tx, journal };
}

describe("PrismaQuoteStore.creerTeteDeChaine — deux écritures, UNE transaction", () => {
  it("⛔ `create` PUIS `update(chainId)` dans le MÊME bloc transactionnel", async () => {
    // En deux transactions, un échec du second laisserait un devis sans chaîne.
    const { store, prisma, journal } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(journal).toEqual(["create", "update", "findUniqueOrThrow"]);
  });

  it("⚠ la version 1 et le chainId provisoire sont écrits, les montants passent TELS QUELS", async () => {
    // Aucune arithmétique monétaire dans l'adaptateur : il persiste ce que
    // `price()` a calculé, sans y toucher.
    const { store, tx } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE);
    const data = (tx.quote.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.version).toBe(1);
    expect(data.totalCents).toBe(18_000_000);
    expect(data.depositCents).toBe(5_400_000);
  });
});

describe("PrismaQuoteStore.creerRevision — le verrou AVANT la lecture du maximum", () => {
  it("⛔ `FOR UPDATE` puis `aggregate` puis `create` — dans cet ordre, ou la garde ne sert à rien", async () => {
    // Lire MAX(version) avant de verrouiller, c'est deux révisions simultanées
    // qui lisent le même maximum : perte de mise à jour, et
    // `quotes_chain_version_unique` refuse la seconde.
    const { store, journal } = build();
    await store.creerRevision({ venueId: VENUE_ID, chainId: CHAINE, parentQuoteId: QUOTE_ID, chiffre: CHIFFRE });
    expect(journal).toEqual(["FOR UPDATE", "aggregate", "create"]);
  });

  it("⚠ la version suivante est MAX + 1, et le parent est désigné", async () => {
    const { store, tx } = build();
    await store.creerRevision({ venueId: VENUE_ID, chainId: CHAINE, parentQuoteId: QUOTE_ID, chiffre: CHIFFRE });
    const data = (tx.quote.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.version).toBe(4);
    expect(data.chainId).toBe(CHAINE);
    expect(data.parentQuoteId).toBe(QUOTE_ID);
  });
});

describe("PrismaQuoteStore — le check-and-set, écrit une seule fois", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("⛔ le statut admis est dans le WHERE de l'UPDATE, pas lu avant", async () => {
    // C'est TOUTE la garde : un devis fermé une milliseconde plus tôt ne doit
    // pas être remis au client. Lu hors transaction, deux gestes concurrents
    // passeraient tous les deux.
    await ctx.store.changerStatut({ quoteId: QUOTE_ID, statutsAdmis: ["DRAFT"], nouveauStatut: "CANCELLED" });
    expect(ctx.tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: QUOTE_ID, status: { in: ["DRAFT"] } },
      data: { status: "CANCELLED" }
    });
  });

  it("⛔ refus : le statut est RELU DANS la transaction et remonte dans le résultat", async () => {
    ctx.tx.quote.updateMany.mockResolvedValue({ count: 0 });
    ctx.tx.quote.findUniqueOrThrow.mockResolvedValue({ status: "CONVERTED" });
    const r = await ctx.store.changerStatut({ quoteId: QUOTE_ID, statutsAdmis: ["DRAFT"], nouveauStatut: "CANCELLED" });
    expect(r).toEqual({ ok: false, raison: "statutConflit", statutActuel: "CONVERTED" });
  });

  it("⛔ le port NE LÈVE PAS sur un refus — il rend", async () => {
    ctx.tx.quote.updateMany.mockResolvedValue({ count: 0 });
    ctx.tx.quote.findUniqueOrThrow.mockResolvedValue({ status: "CANCELLED" });
    await expect(
      ctx.store.marquerRemis({ quoteId: QUOTE_ID, statutsAdmis: ["DRAFT"], sentVia: "SMS", sentAt: new Date() })
    ).resolves.toMatchObject({ ok: false });
  });

  it("⚠ `marquerRemis` écrit le canal et la date, JAMAIS un statut", async () => {
    // Une remise est un partage (D160). Le jour où quelqu'un y remet une
    // transition, ce test tombe.
    const sentAt = new Date("2027-02-01T10:00:00.000Z");
    await ctx.store.marquerRemis({ quoteId: QUOTE_ID, statutsAdmis: ["DRAFT"], sentVia: "SMS", sentAt });
    const data = (ctx.tx.quote.updateMany.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data).toEqual({ sentVia: "SMS", sentAt });
  });
});

describe("PrismaQuoteStore — les lectures", () => {
  it("⚠ l'entonnoir ne compte QUE les devis portant un canal (D162)", async () => {
    const { store, prisma } = build();
    await store.listerPourEntonnoir(VENUE_ID);
    expect(prisma.quote.findMany).toHaveBeenCalledWith({
      where: { venueId: VENUE_ID, sentVia: { not: null } },
      orderBy: [{ chainId: "asc" }, { version: "desc" }],
      select: { chainId: true, status: true, version: true }
    });
  });

  it("⛔ `trouverDuPro` : le devis, sa salle VIVANTE, et à MOI — en un seul WHERE", async () => {
    const { store, prisma } = build();
    await store.trouverDuPro("u-1", QUOTE_ID);
    expect(prisma.quote.findFirst).toHaveBeenCalledWith({
      where: { id: QUOTE_ID, venue: { deletedAt: null, owner: { userId: "u-1" } } },
      select: QUOTE_SELECT
    });
  });

  it("`salleAppartientAu` rend un booléen, jamais la ligne", async () => {
    const { store, prisma } = build();
    await expect(store.salleAppartientAu("u-1", VENUE_ID)).resolves.toBe(false);
    prisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID });
    await expect(store.salleAppartientAu("u-1", VENUE_ID)).resolves.toBe(true);
  });
});

describe("⛔ PrismaQuoteStore.convertirEnDemande — CHEMIN DE L'ARGENT", () => {
  const LIGNE = {
    serviceId: "s-1",
    tierId: null,
    nameFr: "Traiteur",
    nameAr: "تموين",
    pricingType: "FIXED",
    tierLabelFr: null,
    tierLabelAr: null,
    unitPriceCents: 500_000,
    quantity: 1,
    lineTotalCents: 500_000
  };
  const DONNEES = {
    venueId: VENUE_ID,
    quoteId: QUOTE_ID,
    clientId: null,
    slotTemplateId: null,
    source: "WALK_IN",
    paymentMethod: "CASH",
    eventDate: new Date("2027-05-12T00:00:00.000Z"),
    startsAt: new Date("2027-05-12T17:00:00.000Z"),
    endsAt: new Date("2027-05-12T23:00:00.000Z"),
    slotNameFr: null,
    slotNameAr: null,
    guests: 200,
    basePriceCents: 18_000_000,
    servicesTotalCents: 500_000,
    totalCents: 18_500_000,
    depositCents: 5_550_000,
    contactFirstName: "Amina",
    contactLastName: "Bensalem",
    contactPhone: "+213550000001",
    contactEmail: null,
    lignes: [LIGNE]
  } as unknown as Parameters<PrismaQuoteStore["convertirEnDemande"]>[0];

  it("⛔ UNE SEULE REQUÊTE : la demande ET ses lignes, imbriquées", async () => {
    // Séparées, un échec de la seconde laisserait une demande dont le total ne
    // correspond à aucun détail — un montant sans justification, sur un document
    // que le client va payer.
    const { store, prisma } = build();
    await store.convertirEnDemande(DONNEES);
    expect(prisma.booking.create).toHaveBeenCalledTimes(1);
    const data = (prisma.booking.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    const services = data.services as { create: unknown[] };
    expect(services.create).toHaveLength(1);
  });

  it("⛔ les montants sont ÉCRITS TELS QUELS — l'adaptateur ne calcule rien", async () => {
    const { store, prisma } = build();
    await store.convertirEnDemande(DONNEES);
    const data = (prisma.booking.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.basePriceCents).toBe(18_000_000);
    expect(data.servicesTotalCents).toBe(500_000);
    expect(data.totalCents).toBe(18_500_000);
    expect(data.depositCents).toBe(5_550_000);
    // ⚠ PENDING : une demande qui ne verrouille rien. L'EXCLUDE de chevauchement
    // ne peut donc pas refuser ici ; le 409 de créneau pris arrive à
    // l'acceptation, et d'un seul endroit du dépôt.
    expect(data.status).toBe("PENDING");
  });

  it("⚠ AUCUNE ÉCRITURE SUR LE DEVIS — il attend l'acompte", async () => {
    const { store, tx, prisma } = build();
    await store.convertirEnDemande(DONNEES);
    expect(tx.quote.update).not.toHaveBeenCalled();
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("⛔ P2002 + une demande EXISTE pour ce devis → `dejaConverti`", async () => {
    const { store, prisma } = build();
    prisma.booking.create.mockRejectedValue({ code: "P2002" });
    prisma.booking.findFirst.mockResolvedValue({ id: "b-1" });
    await expect(store.convertirEnDemande(DONNEES)).resolves.toEqual({ ok: false, raison: "dejaConverti" });
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: { quoteId: QUOTE_ID },
      select: { id: true }
    });
  });

  it("⛔ P2002 SANS demande pour ce devis → L'ERREUR REPART", async () => {
    // C'est la garde qui distingue une double conversion d'une collision
    // d'idempotence. `bookings` porte DEUX contraintes uniques ; conclure sur le
    // seul code du driver reviendrait à annoncer « déjà converti » sur un
    // empêchement qui n'a rien à voir — un mensonge au pro.
    const { store, prisma } = build();
    prisma.booking.create.mockRejectedValue({ code: "P2002" });
    prisma.booking.findFirst.mockResolvedValue(null);
    await expect(store.convertirEnDemande(DONNEES)).rejects.toMatchObject({ code: "P2002" });
  });

  it("⚠ toute AUTRE erreur remonte sans relecture", async () => {
    const { store, prisma } = build();
    prisma.booking.create.mockRejectedValue(new Error("panne réseau"));
    await expect(store.convertirEnDemande(DONNEES)).rejects.toThrow("panne réseau");
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
  });
});
