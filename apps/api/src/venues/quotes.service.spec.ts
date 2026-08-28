// ⛔ S10b-1 — LE PREMIER SPEC UNITAIRE DE `QuotesService`. Il n'en avait aucun.
//
// ⚠ CE N'EST PAS UN REMPLACEMENT DU FILET D'INTÉGRATION : `quotes.int-spec.ts`
// (35 tests, 160 assertions) reste la preuve que le comportement n'a pas bougé.
// Ce fichier mesure ce que l'intégration ne peut pas isoler — la TRADUCTION
// d'un résultat de port en réponse HTTP, et les décisions prises avant l'appel.
//
// ⚠ DOUBLE TYPÉ D'EMBLÉE (`satisfies`), jamais `as unknown as`. Le service ne
// dépendant plus de Prisma pour son cycle de vie, il n'y avait aucune raison de
// naître avec le défaut que S10a vient de corriger ailleurs.
import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { QuotesService } from "./quotes.service";
import { QuoteCommand, quoteAllowedFrom, quoteWrittenStatus } from "./quote-transitions";
import type { QuoteRow, QuoteStore } from "./quote-store.types";

const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";
const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const QUOTE_ID = "018f0000-0000-7000-8000-00000000dddd";

const devisRow = (overrides: Record<string, unknown> = {}) =>
  ({
    id: QUOTE_ID,
    venueId: VENUE_ID,
    clientId: null,
    status: "DRAFT",
    version: 1,
    chainId: QUOTE_ID,
    parentQuoteId: null,
    eventDate: new Date("2027-05-12T00:00:00.000Z"),
    slotTemplateId: null,
    guests: 200,
    basePriceCents: 18_000_000,
    servicesTotalCents: 0,
    totalCents: 18_000_000,
    depositCents: 5_400_000,
    lines: [],
    sentAt: null,
    sentVia: null,
    acceptedAt: null,
    createdAt: new Date("2027-01-01T00:00:00.000Z"),
    booking: null,
    ...overrides
  }) as unknown as QuoteRow;

function build() {
  const devis = {
    creerTeteDeChaine: vi.fn(),
    creerRevision: vi.fn(),
    marquerRemis: vi.fn(),
    changerStatut: vi.fn(),
    listerDeLaSalle: vi.fn(),
    listerPourEntonnoir: vi.fn(),
    trouverDuPro: vi.fn(),
    salleAppartientAu: vi.fn().mockResolvedValue(true),
    convertirEnDemande: vi.fn()
  } satisfies QuoteStore;
  // ⚠ Prisma subsiste pour `price()` et `convert()` — hors de ce lot. Aucun
  // test d'ici ne l'emprunte : s'il était touché, ce serait le signe qu'une
  // méthode du cycle de vie a gardé un chemin direct vers la base.
  // ⚠ Prisma subsiste pour `price()` et les deux lectures de `convert` qui
  // alimentent un calcul PUR (créneau, mode de réservation). Elles ne sont ni
  // transactionnelles ni risquées : par la règle du cadrage, elles ne
  // justifient pas un port. On les bouchonne, sans plus.
  const prisma = {
    quote: {},
    venue: { findUniqueOrThrow: vi.fn().mockResolvedValue({ bookingMode: "SINGLE_SLOT" }) },
    holiday: {},
    service: {},
    slotTemplate: { findUnique: vi.fn().mockResolvedValue(null) },
    booking: {}
  };
  return { service: new QuotesService(devis, prisma as unknown as PrismaService), devis, prisma };
}

const estConflitStatut = (e: unknown, statut: string): boolean =>
  e instanceof ConflictException &&
  (e.getResponse() as { code?: string; status?: string }).code === "QUOTE_STATUS_CONFLICT" &&
  (e.getResponse() as { status?: string }).status === statut;

const est404 = (e: unknown): boolean =>
  e instanceof NotFoundException && (e.getResponse() as { code?: string }).code === "QUOTE_NOT_FOUND";

describe("QuotesService — 404 indistincts", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("id hors motif UUID : 404 SANS toucher le port", async () => {
    await expect(ctx.service.cancel(USER_ID, "pas-un-uuid")).rejects.toSatisfy(est404);
    expect(ctx.devis.trouverDuPro).not.toHaveBeenCalled();
  });

  it("le port rend `null` (inexistant / salle supprimée / autre pro) : même 404", async () => {
    ctx.devis.trouverDuPro.mockResolvedValue(null);
    await expect(ctx.service.cancel(USER_ID, QUOTE_ID)).rejects.toSatisfy(est404);
    expect(ctx.devis.changerStatut).not.toHaveBeenCalled();
  });

  it("salle d'un autre pro : `listForVenue` s'arrête AVANT de lire les devis", async () => {
    ctx.devis.salleAppartientAu.mockResolvedValue(false);
    await expect(ctx.service.listForVenue(USER_ID, VENUE_ID)).rejects.toSatisfy(est404);
    expect(ctx.devis.listerDeLaSalle).not.toHaveBeenCalled();
  });
});

describe("QuotesService — le refus du check-and-set devient un 409 QUI PORTE LE STATUT", () => {
  it("⛔ `cancel` refusé : 409 avec le statut RELU, pas un booléen", async () => {
    // ⚠ C'est cette valeur que le client reçoit et qui lui dit POURQUOI son
    // geste est refusé. Un port qui rendrait `false` la ferait disparaître (MD2).
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.changerStatut.mockResolvedValue({ ok: false, raison: "statutConflit", statutActuel: "CONVERTED" });
    await expect(service.cancel(USER_ID, QUOTE_ID)).rejects.toSatisfy((e) => estConflitStatut(e, "CONVERTED"));
  });

  it("⛔ `deliver` refusé : même 409, même statut porté", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.marquerRemis.mockResolvedValue({ ok: false, raison: "statutConflit", statutActuel: "CANCELLED" });
    await expect(service.deliver(USER_ID, QUOTE_ID, { sentVia: "PHONE" })).rejects.toSatisfy((e) =>
      estConflitStatut(e, "CANCELLED")
    );
  });

  it("⚠ le statut ADMIS vient de la machine à états, pas du port", async () => {
    // Le port ne connaît pas `quote-transitions.ts` — et ne doit pas : une
    // seconde copie de la machine à états divergerait au premier ajout d'état.
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.changerStatut.mockResolvedValue({ ok: true, devis: devisRow({ status: "CANCELLED" }) });
    await service.cancel(USER_ID, QUOTE_ID);
    const args = devis.changerStatut.mock.calls[0]![0] as {
      statutsAdmis: readonly string[];
      nouveauStatut: string;
    };
    // ⛔ ÉGALITÉ AVEC L'AUTORITÉ, PAS APPARTENANCE. Une première version
    // assertait `toContain("DRAFT")` : la neutralisation posait
    // `["DRAFT", "CONVERTED"]`, qui contient bien "DRAFT", et la garde restait
    // VERTE. Une assertion d'appartenance ne mesure pas une LISTE.
    //
    // ⚠ On compare à `quoteAllowedFrom`, jamais à une liste écrite ici : une
    // copie de la machine à états divergerait au premier état ajouté.
    expect(args.statutsAdmis).toEqual([...quoteAllowedFrom(QuoteCommand.CANCEL)]);
    expect(args.nouveauStatut).toBe(quoteWrittenStatus(QuoteCommand.CANCEL));
  });
});

describe("QuotesService.deliver — une remise est RÉPÉTABLE (D160)", () => {
  it("⚠ le devis ne change PAS de statut : seuls le canal et la date sont écrits", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.marquerRemis.mockResolvedValue({ ok: true, devis: devisRow({ sentVia: "SMS" }) });

    const dto = await service.deliver(USER_ID, QUOTE_ID, { sentVia: "SMS" });

    // ⚠ `changerStatut` JAMAIS appelé : remettre un devis est un partage, pas
    // une transition. Le jour où quelqu'un rétablit un état « remis », ce test
    // tombe — c'est exactement ce qu'on veut qu'il fasse.
    expect(devis.changerStatut).not.toHaveBeenCalled();
    expect(dto.sentVia).toBe("SMS");
    expect(dto.status).toBe("DRAFT");
  });
});

// ⛔ CE QUI N'EST PAS MESURÉ ICI, ET POURQUOI — `revise`.
//
// Sa propagation de chaîne (hériter `chainId`, désigner `parentQuoteId`) passe
// par `price()`, qui reste sur Prisma hors de ce lot. La mesurer ici exigerait
// de rebouchonner les trois lectures de tarification derrière un faux Prisma
// casté — c'est-à-dire de réintroduire le défaut que S10a vient de corriger.
//
// ⚠ UNE PREMIÈRE VERSION DE CE FICHIER CONTOURNAIT LE PROBLÈME par un
// `if (calls.length > 0)` autour de l'assertion. Un test qui ne mesure que si
// le chemin a marché ne mesure rien : il est vert quand `price()` lève, vert
// quand la chaîne est perdue, vert toujours. Retiré.
//
// La propagation de chaîne est couverte par `quotes.int-spec.ts`, contre une
// vraie base — et le VERROU qui la protège est mesuré dans
// `quote-store.prisma.spec.ts`. Elle reviendra ici le jour où `price()` aura
// son propre port, pas avant.

describe("⛔ QuotesService.convert — CHEMIN DE L'ARGENT (S10b-2)", () => {
  const CONTACT = { contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001" };

  it("⛔ les QUATRE MONTANTS partent VERBATIM du devis — aucun recalcul", async () => {
    // C'est le montant que le client paiera. Un champ perdu ou dérivé ici
    // produit une demande dont le total ne correspond plus au devis signé.
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.convertirEnDemande.mockResolvedValue({ ok: true });

    await service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" });

    const envoye = devis.convertirEnDemande.mock.calls[0]![0];
    expect(envoye.basePriceCents).toBe(18_000_000);
    expect(envoye.servicesTotalCents).toBe(0);
    expect(envoye.totalCents).toBe(18_000_000);
    expect(envoye.depositCents).toBe(5_400_000);
  });

  it("⚠ `source` est une lecture MÉTIER de la provenance, faite ICI", async () => {
    // Un adaptateur qui la déduirait tiendrait une seconde définition de
    // « client connu », et les deux divergeraient un jour.
    const { service, devis } = build();
    devis.convertirEnDemande.mockResolvedValue({ ok: true });

    devis.trouverDuPro.mockResolvedValue(devisRow({ clientId: null }));
    await service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" });
    expect(devis.convertirEnDemande.mock.calls[0]![0].source).toBe("WALK_IN");

    devis.trouverDuPro.mockResolvedValue(devisRow({ clientId: "cli-1" }));
    await service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" });
    expect(devis.convertirEnDemande.mock.calls[1]![0].source).toBe("CLIENT");
  });

  it("⛔ le refus du port devient un 409 `QUOTE_ALREADY_CONVERTED`, jamais un 500", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.convertirEnDemande.mockResolvedValue({ ok: false, raison: "dejaConverti" });
    await expect(service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictException &&
        (e.getResponse() as { code?: string }).code === "QUOTE_ALREADY_CONVERTED"
    );
  });

  it("⚠ la garde applicative évite d'écrire pour rien — et rend LE MÊME code", async () => {
    // Un utilisateur ne doit pas recevoir deux erreurs différentes pour un seul
    // empêchement, selon qu'il arrive une milliseconde avant ou après.
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ booking: { id: "b-1" } }));
    await expect(service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictException &&
        (e.getResponse() as { code?: string }).code === "QUOTE_ALREADY_CONVERTED"
    );
    expect(devis.convertirEnDemande).not.toHaveBeenCalled();
  });

  it("⛔ LE DEVIS NE BOUGE PAS — il attend l'acompte", async () => {
    // Une méthode nommée « convertir » invite à changer aussi son statut. Le jour
    // où quelqu'un le fait, ce test tombe.
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.convertirEnDemande.mockResolvedValue({ ok: true });
    await service.convert(USER_ID, QUOTE_ID, { ...CONTACT, paymentMethod: "CASH" });
    expect(devis.changerStatut).not.toHaveBeenCalled();
    expect(devis.marquerRemis).not.toHaveBeenCalled();
  });
});
