// ⛔ S10b-1 — LES QUATRE TRANSACTIONS, MESURÉES LÀ OÙ ELLES SONT ÉCRITES.
//
// ⚠ CE QUE CE FICHIER PEUT ET NE PEUT PAS PROUVER. Il mesure la SÉQUENCE : que
// les deux écritures de `creerTeteDeChaine` sont dans la même transaction, que
// `creerRevision` prend le verrou AVANT de lire `MAX(version)`, que le
// check-and-set relit le statut DANS la transaction. Il ne prouve pas
// l'atomicité réelle — seul `quotes.int-spec.ts`, contre PostgreSQL, le peut.
// Une séquence juste est nécessaire, pas suffisante ; les deux se complètent.
import { BookingStatus } from "@zwadj/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { PrismaQuoteStore } from "./quote-store.prisma";
import { QUOTE_SELECT } from "./quote-store.types";

const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const QUOTE_ID = "018f0000-0000-7000-8000-00000000dddd";
const CHAINE = "018f0000-0000-7000-8000-00000000cccc";
// Rang 39 (D333, L35-3) — des valeurs DISTINCTES pour ce que le compteur rend (89), ce que la tête porte (2026 / 42) et l'identifiant pré-généré : une interversion ne passe pas inaperçue.
const NOUVEL_ID = "018f0000-0000-7000-8000-00000000bbbb";
const COMPTEUR = 89;
const TETE_ANNEE = 2026;
const TETE_NUMERO = 42;
const REFERENCE = { annee: 2027, creeLe: new Date("2027-01-01T00:30:00.000Z") };

const CHIFFRE = {
  // Rang 41 (D336) — `clientId` n'est plus écrit à la création (DB-15) : la fiche et les deux copies du nom le remplacent.
  clientRecordId: null,
  clientNameAr: null,
  clientNameLatin: null,
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
    // ⚠ Le double reconnaît la REQUÊTE qu'il reçoit (le gabarit SQL), il ne répond pas « vide » à tout : le compteur rend son numéro, `uuidv7()` un identifiant, le verrou de
    // chaîne la TÊTE (id, année, numéro) qu'il verrouille. Un double qui répondrait pareil aux trois ne distinguerait pas une interversion.
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ..._valeurs: unknown[]): Promise<unknown[]> => {
      const sql = strings.join("?");
      if (sql.includes("quote_number_counters")) {
        journal.push("compteur");
        return [{ last_number: COMPTEUR }];
      }
      if (sql.includes("uuidv7()")) {
        journal.push("uuid");
        return [{ id: NOUVEL_ID }];
      }
      // Rang 41 (D336) — le verrou de la FICHE (K-5, C-C3) : une fiche non liée qui n'a que son nom latin.
      if (sql.includes("pro_client_records")) {
        journal.push("fiche FOR UPDATE");
        return [{ id: "018f0000-0000-7000-8000-0000000000f1", name_ar: null, name_latin: "Amina Bensalem", linked_user_id: null }];
      }
      journal.push("FOR UPDATE");
      return [{ id: CHAINE, reference_year: TETE_ANNEE, reference_number: TETE_NUMERO }];
    }),
    proClientRecord: {
      updateMany: vi.fn(async (_args: Charge): Promise<{ count: number }> => {
        journal.push("fiche updateMany");
        return { count: 1 };
      })
    }
  };
  type Charge2 = Record<string, unknown>;
  const prisma = {
    $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    // ⛔ Tout SQL brut lancé HORS transaction s'inscrit ici : le compteur y serait avancé sans que le devis le soit (F-7).
    // Il rend une ligne VALIDE : sinon la faute « compteur hors transaction » échouerait sur la validation du numéro (une `Error`), pas sur l'assertion de séquence ci-dessous (D304).
    $queryRaw: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => {
      journal.push("HORS-TX");
      return [{ last_number: COMPTEUR, id: NOUVEL_ID }];
    }),
    quote: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    venue: { findFirst: vi.fn().mockResolvedValue(null) },
    proClientRecord: { findFirst: vi.fn().mockResolvedValue(null) },
    booking: {
      create: vi.fn(async (_args: Charge2): Promise<{ id: string }> => ({ id: "b-1" })),
      findFirst: vi.fn(async (_args: Charge2): Promise<{ id: string } | null> => null)
    }
  };
  return { store: new PrismaQuoteStore(prisma as unknown as PrismaService), prisma, tx, journal };
}

describe("PrismaQuoteStore.creerTeteDeChaine — le compteur, l'identifiant et la tête, UNE transaction", () => {
  it("⛔ le compteur, l'identifiant, la tête, la relecture — dans cet ordre, dans le MÊME bloc transactionnel, RIEN hors de lui", async () => {
    // Rang 39 (D333, F-7) : le compteur est écrit DANS la transaction du devis. Hors d'elle, un échec de l'insertion laisserait le compteur avancé seul — un numéro de devis perdu.
    // Et la tête naît en UNE écriture (`id = chain_id`) : plus de `UPDATE chain_id` (S-22).
    const { store, prisma, journal } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(journal).toEqual(["compteur", "uuid", "create", "findUniqueOrThrow"]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("⛔ le compteur s'incrémente par `INSERT … ON CONFLICT … DO UPDATE … + 1 … RETURNING` — JAMAIS « lire le plus grand puis ajouter 1 » (R3)", async () => {
    const { store, tx } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE);
    const [strings, ...valeurs] = tx.$queryRaw.mock.calls[0]! as unknown as [TemplateStringsArray, ...unknown[]];
    const sql = strings.join("?").replace(/\s+/gu, " ");
    expect(sql).toContain("INSERT INTO quote_number_counters");
    expect(sql).toContain("ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1");
    expect(sql).toContain("RETURNING last_number");
    expect(sql).not.toMatch(/\bMAX\s*\(/iu);
    // les paramètres sont LIÉS (jamais concaténés) : la salle puis l'année passée par le service
    expect(valeurs).toEqual([VENUE_ID, REFERENCE.annee]);
  });

  it("⛔ la tête porte l'identifiant pré-généré COMME chain_id, la version 1, l'année PASSÉE, le numéro RENDU par le compteur, et la date de création PASSÉE", async () => {
    const { store, tx } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE);
    const data = (tx.quote.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.id).toBe(NOUVEL_ID);
    expect(data.chainId).toBe(NOUVEL_ID);
    expect(data.version).toBe(1);
    expect(data.referenceYear).toBe(2027);
    expect(data.referenceNumber).toBe(COMPTEUR);
    expect(data.createdAt).toEqual(REFERENCE.creeLe);
    expect(tx.quote.update).not.toHaveBeenCalled();
  });

  it("⚠ les montants passent TELS QUELS", async () => {
    // Aucune arithmétique monétaire dans l'adaptateur : il persiste ce que
    // `price()` a calculé, sans y toucher.
    const { store, tx } = build();
    await store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE);
    const data = (tx.quote.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.totalCents).toBe(18_000_000);
    expect(data.depositCents).toBe(5_400_000);
  });

  it("⛔ un échec de l'insertion APRÈS le compteur : la création échoue, et le compteur n'a été touché que DANS la transaction (qui l'annule)", async () => {
    const { store, tx, prisma, journal } = build();
    tx.quote.create.mockRejectedValueOnce(new Error("clé étrangère"));
    await expect(store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE)).rejects.toThrow("clé étrangère");
    expect(journal).toEqual(["compteur", "uuid"]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("⛔ un compteur qui ne rend PAS exactement une ligne entière positive : la création LÈVE, aucun numéro n'est inventé", async () => {
    for (const rendu of [[], [{ last_number: 0 }], [{ last_number: "3" }], [{ last_number: 1 }, { last_number: 2 }]]) {
      const { store, tx } = build();
      tx.$queryRaw.mockResolvedValueOnce(rendu);
      await expect(store.creerTeteDeChaine(VENUE_ID, CHIFFRE, REFERENCE)).rejects.toThrow();
      expect(tx.quote.create).not.toHaveBeenCalled();
    }
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

  it("⛔ une révision NE TOUCHE AUCUN COMPTEUR (F-2, F-4) : elle recopie année et numéro de la tête qu'elle verrouille déjà", async () => {
    const { store, tx, journal } = build();
    await store.creerRevision({ venueId: VENUE_ID, chainId: CHAINE, parentQuoteId: QUOTE_ID, chiffre: CHIFFRE });
    expect(journal).not.toContain("compteur");
    const data = (tx.quote.create.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(data.referenceYear).toBe(TETE_ANNEE);
    expect(data.referenceNumber).toBe(TETE_NUMERO);
    // la date de création est celle de la base : seule la tête reçoit celle du service
    expect(data).not.toHaveProperty("createdAt");
  });

  it("⛔ la tête introuvable (le verrou ne rend aucune ligne) : la révision LÈVE, rien n'est créé", async () => {
    const { store, tx } = build();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(store.creerRevision({ venueId: VENUE_ID, chainId: CHAINE, parentQuoteId: QUOTE_ID, chiffre: CHIFFRE })).rejects.toThrow();
    expect(tx.quote.create).not.toHaveBeenCalled();
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
    //
    // ⚠ CONFRONTÉ À L'AUTORITÉ, PAS À UNE CHAÎNE (D268). Ce que cette assertion
    // mesure, c'est QUEL MEMBRE l'adaptateur choisit — écrire `ACCEPTED` ici
    // verrouillerait un créneau que le pro n'a pas accordé. La VALEUR du membre,
    // elle, est tenue ailleurs : par `tsc` (le champ Prisma est typé sur
    // l'énuméré généré) et par `quotes.int-spec.ts` contre PostgreSQL réel.
    expect(data.status).toBe(BookingStatus.PENDING);
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

/** ⛔ GARDE DE SOURCE **BILATÉRALE** (D268) — le statut de la demande.
 *
 *  Elle a deux versants, et c'est le second qui est inhabituel :
 *
 *  1. l'ADAPTATEUR ne doit plus écrire le littéral — il dérive de l'énuméré ;
 *  2. `quotes.int-spec.ts` doit TOUJOURS l'écrire, et c'est délibéré.
 *
 *  ⚠ POURQUOI LE SECOND VERSANT. Faire dériver les TROIS sites du même énuméré
 *  ne supprime pas le défaut que D263 décrit, il le déplace : ils
 *  s'accorderaient encore, et se tromperaient encore ensemble — c'est D241.
 *  Ce qui protège, c'est que chaque site confronte SON autorité. Pour
 *  l'adaptateur et cette spec, l'autorité est l'énuméré TypeScript. Pour le
 *  test d'intégration, l'autorité est **PostgreSQL** : il relit la colonne et
 *  la compare à une chaîne écrite indépendamment. Le faire dériver lui ferait
 *  poser la mauvaise question — « mon code est-il d'accord avec lui-même ? » au
 *  lieu de « qu'est-ce que la base a stocké ? ». Et le couplage n'est pas
 *  théorique : les prédicats qui verrouillent le créneau vivent en SQL BRUT
 *  dans les migrations (`status IN ('ACCEPTED','CONFIRMED')` de l'EXCLUDE
 *  GiST), que TypeScript ne voit pas.
 *
 *  ⚠ LES COMMENTAIRES SONT RETIRÉS AVANT D'ASSERTIR. Les deux fichiers
 *  EXPLIQUENT ce littéral en prose ; sans ce nettoyage, la garde rougirait sur
 *  l'explication qui la justifie — le dépôt a déjà payé cette faute trois fois.
 *  L'explication est donc vérifiée SÉPARÉMENT, sur la source brute.
 */
describe("Garde de SOURCE — le statut de la demande dérive de l'autorité (D268)", () => {
  // Vitest s'exécute depuis `apps/api` ; `import.meta` tombe en TS1343 côté API
  // (tsconfig CommonJS). On passe par `process.cwd()` ET ON VÉRIFIE que le
  // chemin a rendu du contenu — un fichier introuvable rendrait la garde verte
  // et muette, ce qui est exactement ce qu'elle existe pour empêcher.
  const lire = (...segments: string[]): string => {
    const chemin = join(process.cwd(), ...segments);
    const source = readFileSync(chemin, "utf8");
    expect(source.length, `source illisible ou vide : ${chemin}`).toBeGreaterThan(1000);
    return source;
  };

  const sansCommentaires = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("⛔ l'ADAPTATEUR n'écrit plus le littéral : il dérive de `BookingStatus`", () => {
    const declarations = sansCommentaires(lire("src", "venues", "quote-store.prisma.ts"));
    expect(declarations).not.toContain('"PENDING"');
    expect(declarations).toContain("BookingStatus.PENDING");
  });

  it("⛔ le TÉMOIN INDÉPENDANT survit dans `quotes.int-spec.ts` — littéral EXIGÉ", () => {
    // Le versant qui surprend : cette garde REFUSE qu'on « corrige » le test
    // d'intégration en le faisant dériver de l'énuméré. C'est le seul point du
    // dépôt où la valeur relue depuis PostgreSQL est confrontée à une chaîne
    // qui ne vient pas de notre propre code.
    const declarations = sansCommentaires(lire("test", "int", "quotes.int-spec.ts"));
    expect(declarations).toContain('expect(booking.status).toBe("PENDING")');
    expect(declarations).not.toContain("expect(booking.status).toBe(BookingStatus");
  });

  it("⚠ et l'EXPLICATION est restée dans les deux fichiers", () => {
    // Une garde dont on a effacé le motif se fait « nettoyer » au lot suivant
    // par quelqu'un qui la prend pour une incohérence. Les commentaires sont
    // retirés pour ASSERTIR ; ils sont vérifiés présents ICI, sur la brute.
    expect(lire("src", "venues", "quote-store.prisma.ts")).toContain("DÉRIVE DE L'AUTORITÉ");
    expect(lire("test", "int", "quotes.int-spec.ts")).toContain("TÉMOIN INDÉPENDANT");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⛔ RANG 41 (D336, L35-4 amendé) — LA FICHE DU PRO (K-4) ET LE COMPLÉMENT DE LA COPIE DU NOM (K-5), mesurés là où ils s'écrivent.
// ⚠ La SÉQUENCE, pas l'atomicité : `quotes.int-spec.ts` (deux compléments simultanés, les deux branches de C-C3) la prouve contre PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────
describe("⛔ D336 — `ficheDuPro` : la fiche se lit par la RELATION au pro (D149), jamais par un identifiant qui « ressemble »", () => {
  it("le WHERE traverse `proProfile: { userId }` et ne sélectionne que ce que la copie du nom exige — rien du compte lié", async () => {
    const { store, prisma } = build();
    await store.ficheDuPro("u-1", "f-1");
    expect(prisma.proClientRecord.findFirst).toHaveBeenCalledWith({
      where: { id: "f-1", proProfile: { userId: "u-1" } },
      select: { id: true, nameAr: true, nameLatin: true, linkedUserId: true }
    });
  });
});

describe("⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique de l'appelant — UNE transaction", () => {
  const FICHE = "018f0000-0000-7000-8000-0000000000f1";
  const toujours = () => true;
  const jamais = () => false;

  it("⛔ MD-7 — le compare-and-set est dans le WHERE de l'UPDATE : la copie NULLE, le devis du pro (salle vivante) — jamais une lecture puis une écriture", async () => {
    const { store, prisma, tx } = build();
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: QUOTE_ID, clientRecordId: null, clientNameAr: "آمنة", clientNameLatin: "Amina" });
    await store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameAr", nom: "آمنة", completerLaFiche: toujours });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: QUOTE_ID, clientNameAr: null, venue: { deletedAt: null, owner: { userId: "u-1" } } },
      data: { clientNameAr: "آمنة" }
    });
  });

  it("⛔ refus (rien n'a été écrit) : le port REND `{ ok: false }`, sans lire ni écrire la fiche", async () => {
    const { store, tx, journal } = build();
    tx.quote.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameLatin", nom: "Amina", completerLaFiche: toujours })
    ).resolves.toEqual({ ok: false });
    expect(journal).toEqual(["updateMany"]);
    expect(tx.proClientRecord.updateMany).not.toHaveBeenCalled();
  });

  it("⛔ MD-8 — un devis AVEC fiche : la fiche est VERROUILLÉE (`FOR UPDATE`) dans la même transaction, PUIS l'appelant décide, PUIS l'écriture conditionnée", async () => {
    const { store, tx, journal } = build();
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: QUOTE_ID, clientRecordId: FICHE, clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem" });
    const decide = vi.fn(() => true);
    await store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameAr", nom: "آمنة بن سالم", completerLaFiche: decide });
    expect(journal).toEqual(["updateMany", "findUniqueOrThrow", "fiche FOR UPDATE", "fiche updateMany"]);
    expect(decide).toHaveBeenCalledWith(
      { id: FICHE, nameAr: null, nameLatin: "Amina Bensalem", linkedUserId: null },
      { ar: "آمنة بن سالم", latin: "Amina Bensalem" }
    );
    // L'écriture de la fiche RE-POSE ses conditions dans le WHERE : jamais remplacer un nom, jamais une fiche liée — même si la décision se trompait.
    expect(tx.proClientRecord.updateMany).toHaveBeenCalledWith({
      where: { id: FICHE, nameAr: null, linkedUserId: null },
      data: { nameAr: "آمنة بن سالم" }
    });
  });

  it("⛔ MD-8 — la politique dit NON (l'autre écriture diffère) : la fiche n'est PAS écrite, la copie l'est", async () => {
    const { store, tx } = build();
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: QUOTE_ID, clientRecordId: FICHE, clientNameAr: "ياسين", clientNameLatin: "Yacine" });
    const r = await store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameAr", nom: "ياسين", completerLaFiche: jamais });
    expect(r.ok).toBe(true);
    expect(tx.proClientRecord.updateMany).not.toHaveBeenCalled();
  });

  it("un devis SANS fiche : aucune lecture ni écriture de fiche", async () => {
    const { store, tx, journal } = build();
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: QUOTE_ID, clientRecordId: null, clientNameAr: null, clientNameLatin: "Amina" });
    await store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameLatin", nom: "Amina", completerLaFiche: toujours });
    expect(journal).toEqual(["updateMany", "findUniqueOrThrow"]);
    expect(tx.proClientRecord.updateMany).not.toHaveBeenCalled();
  });

  it("le champ LATIN s'écrit de la même façon, sur la copie puis sur la fiche", async () => {
    const { store, tx } = build();
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: QUOTE_ID, clientRecordId: FICHE, clientNameAr: "آمنة", clientNameLatin: "Amina" });
    await store.completerNomDuClient({ userId: "u-1", quoteId: QUOTE_ID, champ: "clientNameLatin", nom: "Amina", completerLaFiche: toujours });
    expect(tx.quote.updateMany.mock.calls[0]![0]).toMatchObject({ where: { clientNameLatin: null }, data: { clientNameLatin: "Amina" } });
    expect(tx.proClientRecord.updateMany).toHaveBeenCalledWith({ where: { id: FICHE, nameLatin: null, linkedUserId: null }, data: { nameLatin: "Amina" } });
  });
});
