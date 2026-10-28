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
import { QUOTE_CLIENT_NAME_FIELD, UserRole, formatQuoteReference } from "@zwadj/types";
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
    // L36-2 (D339) — le devis est OFFICIEL par défaut (`is_official DEFAULT true`) ; un test de brouillon le surcharge.
    isOfficial: true,
    // Rang 39 (D333, L35-3) — la référence est bâtie sur la ligne STOCKÉE : l'année, le numéro du devis, et le numéro de la SALLE (une relation). Trois valeurs distinctes.
    referenceYear: 2026,
    referenceNumber: 89,
    venue: { number: 7 },
    // Rang 41 (D336, K-6) — la fiche et les deux copies du nom ; nulles pour un devis du parcours sans fiche.
    clientRecordId: null,
    clientNameAr: null,
    clientNameLatin: null,
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
    convertirEnDemande: vi.fn(),
    // Rang 41 (D336) — la fiche du pro (K-4) et le complément de la copie du nom (K-5).
    ficheDuPro: vi.fn(),
    completerNomDuClient: vi.fn(),
    // L36-2 (D339) — la promotion d'un brouillon : UNE transaction du port, qui écrit aussi la ligne d'audit.
    promouvoir: vi.fn()
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

describe("⛔ QuotesService — la référence du devis (K-6, rang 39)", () => {
  it("⛔ le DTO porte `reference`, bâtie sur la ligne stockée : année, numéro de la salle, numéro du devis, version — une seule formule (`formatQuoteReference`)", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow()]);
    const [dto] = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dto!.reference).toBe(formatQuoteReference({ year: 2026, venueNumber: 7, quoteNumber: 89, version: 1 }));
    expect(dto!.reference).toBe("DEVIS-2026-0007-0089 v1");
  });

  it("⛔ une révision garde l'année et les deux numéros de sa tête ; SEULE la version change", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow(), devisRow({ id: "v2", version: 2 }), devisRow({ id: "v3", version: 3 })]);
    const dtos = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dtos.map((d) => d.reference)).toEqual(["DEVIS-2026-0007-0089 v1", "DEVIS-2026-0007-0089 v2", "DEVIS-2026-0007-0089 v3"]);
  });

  it("⛔ l'ancienne référence (les huit premiers caractères de l'identifiant) a DISPARU", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow()]);
    const [dto] = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dto!.reference).not.toContain(QUOTE_ID.slice(0, 8));
  });

  it("⛔ la référence rendue par une transition (remise, annulation) est celle du devis, pas une autre", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.marquerRemis.mockResolvedValue({ ok: true, devis: devisRow({ sentVia: "SMS", referenceNumber: 90, version: 1 }) });
    const dto = await service.deliver(USER_ID, QUOTE_ID, { sentVia: "SMS" });
    expect(dto.reference).toBe("DEVIS-2026-0007-0090 v1");
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
//
// ⛔ Rang 39 (D333) — MÊME RAISON POUR `create` : l'année d'Alger et l'instant de création que le service passe au magasin (`algiersYear(maintenant)`) sont mesurés par
// `quote-numbering.int-spec.ts`, horloge FIGÉE aux deux côtés du passage de l'année, contre PostgreSQL ; la fonction pure l'est par `quote-reference.spec.ts` ; la séquence
// de la transaction par `quote-store.prisma.spec.ts`. Ne PAS la rejouer ici derrière un faux Prisma casté.

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

// ─────────────────────────────────────────────────────────────────────────────
// ⛔ RANG 41 (D336, L35-4 amendé) — LA FICHE ET LA COPIE DU NOM (K-4, K-5, K-6). Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md`.
// ⚠ Même doctrine que le bloc « ce qui n'est pas mesuré ici » ci-dessus : la création RÉUSSIE passe par `price()` (Prisma), elle est mesurée par
// `quotes.int-spec.ts`. Ce bloc mesure ce qui se décide AVANT `price()` — la fiche du pro, la copie d'une fiche liée — et la traduction du port de K-5.
// ─────────────────────────────────────────────────────────────────────────────
/** Le REFUS, lu en assertions NATIVES (D304, D316) : `rejects.toSatisfy` échoue par une `Error`, que la lecture fermée des harnais ne compte pas comme une
 *  morsure. La promesse doit être REJETÉE (sinon `expect.unreachable`, une `AssertionError`) ; la classe et le code du refus se jugent ensuite par `toBe`. */
async function refus(promesse: Promise<unknown>): Promise<unknown> {
  try {
    await promesse;
  } catch (e) {
    return e;
  }
  return expect.unreachable("la promesse devait être REFUSÉE");
}
function estRefus(e: unknown, classe: abstract new (...args: never[]) => unknown, attendu: string): void {
  expect(e instanceof classe, `classe du refus : ${String(e)}`).toBe(true);
  expect((e as { getResponse: () => { code?: string } }).getResponse().code).toBe(attendu);
}
describe("⛔ D336 — K-4 : la fiche se vérifie AVANT tout chiffrage, et la copie d'une fiche LIÉE est celle de la fiche", () => {
  const FICHE_ID = "018f0000-0000-7000-8000-0000000000f1";
  const CORPS = { eventDate: "2027-05-12", slotTemplateId: "018f0000-0000-7000-8000-000000000051", guests: 200 };

  it("⛔ MD-11 — la fiche d'un AUTRE pro (le port rend `null`) : 404 CLIENT_RECORD_NOT_FOUND, et RIEN n'est chiffré ni écrit", async () => {
    const { service, devis, prisma } = build();
    devis.ficheDuPro.mockResolvedValue(null);
    estRefus(await refus(service.create(USER_ID, VENUE_ID, { ...CORPS, clientRecordId: FICHE_ID, clientNameLatin: "Amina Bensalem" })), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
    expect(devis.ficheDuPro).toHaveBeenCalledWith(USER_ID, FICHE_ID);
    expect(prisma.venue.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(devis.creerTeteDeChaine).not.toHaveBeenCalled();
  });

  it("⛔ MD-6 — une fiche LIÉE et un nom DIFFÉRENT : 409 CLIENT_RECORD_LINKED, rien n'est chiffré ni écrit", async () => {
    const { service, devis, prisma } = build();
    devis.ficheDuPro.mockResolvedValue({ id: FICHE_ID, nameAr: null, nameLatin: "Amina Bensalem", linkedUserId: "018f0000-0000-7000-8000-0000000000ee" });
    estRefus(await refus(service.create(USER_ID, VENUE_ID, { ...CORPS, clientRecordId: FICHE_ID, clientNameLatin: "Autre Nom" })), ConflictException, "CLIENT_RECORD_LINKED");
    expect(prisma.venue.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(devis.creerTeteDeChaine).not.toHaveBeenCalled();
  });

  it("la RÉVISION applique la même règle : la fiche d'un autre pro est refusée avant le verrou de chaîne", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.ficheDuPro.mockResolvedValue(null);
    estRefus(await refus(service.revise(USER_ID, QUOTE_ID, { ...CORPS, clientRecordId: FICHE_ID, clientNameLatin: "Amina Bensalem" })), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
    expect(devis.creerRevision).not.toHaveBeenCalled();
  });

  it("sans fiche, le port des fiches n'est PAS lu (un devis du parcours sans contact reste possible)", async () => {
    const { service, devis } = build();
    await service.create(USER_ID, VENUE_ID, CORPS).catch(() => undefined);
    expect(devis.ficheDuPro).not.toHaveBeenCalled();
  });

  it("⛔ K-6 — le DTO porte la fiche et les DEUX copies, telles que STOCKÉES", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow({ clientRecordId: FICHE_ID, clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem" })]);
    const [dto] = await service.listForVenue(USER_ID, VENUE_ID);
    expect({ id: dto!.clientRecordId, ar: dto!.clientNameAr, latin: dto!.clientNameLatin }).toEqual({ id: FICHE_ID, ar: "آمنة بن سالم", latin: "Amina Bensalem" });
  });
});

describe("⛔ D336 — K-5 : compléter la copie du nom (compare-and-set sur NULL), la fiche sous C-C3", () => {

  it("la langue choisit la copie par l'AUTORITÉ (`QUOTE_CLIENT_NAME_FIELD`) : « ar » écrit `clientNameAr`, « fr » `clientNameLatin`", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: true, devis: devisRow({ clientNameAr: "آمنة" }) });
    await service.completeClientName(USER_ID, QUOTE_ID, { locale: "ar", name: "آمنة" });
    await service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Amina" });
    const champs = devis.completerNomDuClient.mock.calls.map((c) => (c[0] as { champ: string }).champ);
    expect(champs).toEqual([QUOTE_CLIENT_NAME_FIELD.ar, QUOTE_CLIENT_NAME_FIELD.fr]);
    expect(devis.completerNomDuClient.mock.calls[0]![0]).toMatchObject({ userId: USER_ID, quoteId: QUOTE_ID, nom: "آمنة" });
  });

  it("⛔ MD-8 — la décision de compléter AUSSI la fiche est la politique C-C3, passée au port (le port ne la réécrit pas)", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: true, devis: devisRow() });
    await service.completeClientName(USER_ID, QUOTE_ID, { locale: "ar", name: "آمنة بن سالم" });
    const decide = (devis.completerNomDuClient.mock.calls[0]![0] as { completerLaFiche: (fiche: unknown, copie: unknown) => boolean }).completerLaFiche;
    const fiche = { id: "f", nameAr: null, nameLatin: "Amina Bensalem", linkedUserId: null };
    expect(decide(fiche, { ar: "آمنة بن سالم", latin: "Amina Bensalem" })).toBe(true);
    expect(decide(fiche, { ar: "ياسين", latin: "Yacine Bensalem" })).toBe(false);
    expect(decide({ ...fiche, linkedUserId: "u1" }, { ar: "آمنة بن سالم", latin: "Amina Bensalem" })).toBe(false);
  });

  it("⛔ MD-7 — le port refuse (la copie est déjà là) : 409 QUOTE_CLIENT_NAME_ALREADY_SET", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: false });
    devis.trouverDuPro.mockResolvedValue(devisRow({ clientNameLatin: "Amina Bensalem" }));
    estRefus(await refus(service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Autre" })), ConflictException, "QUOTE_CLIENT_NAME_ALREADY_SET");
  });

  it("le port refuse ET le devis n'est pas au pro : 404 QUOTE_NOT_FOUND ; un identifiant hors motif : 404 sans toucher le port", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: false });
    devis.trouverDuPro.mockResolvedValue(null);
    estRefus(await refus(service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Amina" })), NotFoundException, "QUOTE_NOT_FOUND");
    devis.completerNomDuClient.mockClear();
    estRefus(await refus(service.completeClientName(USER_ID, "pas-un-uuid", { locale: "fr", name: "Amina" })), NotFoundException, "QUOTE_NOT_FOUND");
    expect(devis.completerNomDuClient).not.toHaveBeenCalled();
  });
});

// ══ L36-2 (D339) — LE DEVIS BROUILLON NON OFFICIEL : ce que le SERVICE décide et traduit. Modes de défaillance : `docs/preuves/D339/cadrage-complement.md` (D-1, D-2, D-4 à D-6, D-17).
// ⚠ Même doctrine que ci-dessus : la création et la révision RÉUSSIES passent par `price()` (Prisma) et sont mesurées par `quotes.int-spec.ts` ; ce bloc mesure la TRADUCTION d'un résultat
// de port en réponse HTTP, l'ORDRE des refus sur des cas doublement fautifs, et ce que le service passe au port. En assertions NATIVES (`estRefus`, D304/D316).

describe("⛔ D339 — le DTO d'un devis dit s'il est officiel, et sa référence porte le préfixe de SON état", () => {
  it("⛔ un devis officiel : `isOfficial: true` et `DEVIS-…` (inchangé d'un octet)", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow()]);
    const [dto] = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dto!.isOfficial).toBe(true);
    expect(dto!.reference).toBe("DEVIS-2026-0007-0089 v1");
  });

  it("⛔ un brouillon : `isOfficial: false` et `BROUILLON-…`, même année, mêmes numéros, même version — bâtie par la MÊME formule", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow({ isOfficial: false })]);
    const [dto] = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dto!.isOfficial).toBe(false);
    expect(dto!.reference).toBe(formatQuoteReference({ year: 2026, venueNumber: 7, quoteNumber: 89, version: 1, official: false }));
    expect(dto!.reference).toBe("BROUILLON-2026-0007-0089 v1");
  });

  it("⛔ dans une même chaîne, la v1 brouillon et la v2 promue portent chacune le préfixe de SA ligne — le numéro est le même", async () => {
    const { service, devis } = build();
    devis.listerDeLaSalle.mockResolvedValue([devisRow({ isOfficial: false }), devisRow({ id: "v2", version: 2, isOfficial: true })]);
    const dtos = await service.listForVenue(USER_ID, VENUE_ID);
    expect(dtos.map((d) => d.reference)).toEqual(["BROUILLON-2026-0007-0089 v1", "DEVIS-2026-0007-0089 v2"]);
  });
});

describe("⛔ D-1 — `deliver` : un brouillon ne se remet pas, et le STATUT passe avant l'état officiel", () => {
  it("⛔ le port refuse `nonOfficiel` : 409 QUOTE_NOT_OFFICIAL, le message du catalogue, et aucun statut dans la réponse", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false }));
    devis.marquerRemis.mockResolvedValue({ ok: false, raison: "nonOfficiel" });
    const e = await refus(service.deliver(USER_ID, QUOTE_ID, { sentVia: "PRINT" }));
    estRefus(e, ConflictException, "QUOTE_NOT_OFFICIAL");
    const corps = (e as ConflictException).getResponse() as { message?: string; status?: string };
    expect(corps.message).toBe("quote.errors.notOfficial");
    expect(corps.status, "un refus « pas officiel » ne porte pas de statut").toBeUndefined();
  });

  it("⛔ le port refuse `statutConflit` : 409 QUOTE_STATUS_CONFLICT avec le statut RELU — deux refus, deux codes, jamais confondus", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false, status: "CANCELLED" }));
    devis.marquerRemis.mockResolvedValue({ ok: false, raison: "statutConflit", statutActuel: "CANCELLED" });
    await expect(service.deliver(USER_ID, QUOTE_ID, { sentVia: "PRINT" })).rejects.toSatisfy((e) => estConflitStatut(e, "CANCELLED"));
  });
});

describe("⛔ D-2 (Q5) — `convert` : un brouillon ne se convertit pas, refusé AVANT toute lecture et toute écriture", () => {
  const CONTACT = { contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001", paymentMethod: "CASH" as const };

  it("⛔ un brouillon DRAFT : 409 QUOTE_NOT_OFFICIAL ; ni la salle, ni le créneau ne sont lus, aucune demande n'est écrite", async () => {
    const { service, devis, prisma } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false }));
    const e = await refus(service.convert(USER_ID, QUOTE_ID, CONTACT));
    estRefus(e, ConflictException, "QUOTE_NOT_OFFICIAL");
    expect(devis.convertirEnDemande).not.toHaveBeenCalled();
    expect(prisma.venue.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prisma.slotTemplate.findUnique).not.toHaveBeenCalled();
  });

  it("⛔ L'ORDRE, sur un cas doublement fautif : un brouillon ANNULÉ répond « statut » (le devis est clos — l'information utile), pas « pas officiel »", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false, status: "CANCELLED" }));
    const e = await refus(service.convert(USER_ID, QUOTE_ID, CONTACT));
    estRefus(e, ConflictException, "QUOTE_STATUS_CONFLICT");
    expect(devis.convertirEnDemande).not.toHaveBeenCalled();
  });

  it("⚠ un devis OFFICIEL se convertit comme avant (la garde ne gêne pas ce qu'elle ne vise pas)", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow());
    devis.convertirEnDemande.mockResolvedValue({ ok: true });
    await service.convert(USER_ID, QUOTE_ID, CONTACT);
    expect(devis.convertirEnDemande).toHaveBeenCalledTimes(1);
  });
});

describe("⛔ D-17 (R-3) — K-5 sur un brouillon : 404, puis « un brouillon n'a pas de nom », puis « copie déjà là »", () => {
  it("⛔ le port refuse ET le devis est un brouillon : 409 QUOTE_DRAFT_HAS_NO_CLIENT (pas « déjà renseigné » — il n'y a rien à compléter sur un brouillon)", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: false });
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false }));
    const e = await refus(service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Amina Bensalem" }));
    estRefus(e, ConflictException, "QUOTE_DRAFT_HAS_NO_CLIENT");
    expect(((e as ConflictException).getResponse() as { message?: string }).message).toBe("quote.errors.draftHasNoClient");
  });

  it("⚠ le port refuse, le devis est OFFICIEL : le refus d'avant (copie déjà là) est inchangé ; introuvable : 404 d'abord", async () => {
    const { service, devis } = build();
    devis.completerNomDuClient.mockResolvedValue({ ok: false });
    devis.trouverDuPro.mockResolvedValue(devisRow({ clientNameLatin: "Amina Bensalem" }));
    estRefus(await refus(service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Autre" })), ConflictException, "QUOTE_CLIENT_NAME_ALREADY_SET");
    devis.trouverDuPro.mockResolvedValue(null);
    estRefus(await refus(service.completeClientName(USER_ID, QUOTE_ID, { locale: "fr", name: "Autre" })), NotFoundException, "QUOTE_NOT_FOUND");
  });
});

describe("⛔ D-4, D-5, D-6 — `promote` : la fiche et le nom DÉCIDÉS ICI, l'écriture et ses refus TRADUITS ICI", () => {
  const FICHE_ID = "018f0000-0000-7000-8000-0000000000f1";
  const ACTEUR = { userId: USER_ID, role: UserRole.PRO };
  const CORPS = { clientRecordId: FICHE_ID, clientNameLatin: "Amina Bensalem" };
  const FICHE = { id: FICHE_ID, nameAr: null, nameLatin: null, linkedUserId: null };
  const preparer = () => {
    const ctx = build();
    ctx.devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false }));
    ctx.devis.ficheDuPro.mockResolvedValue(FICHE);
    return ctx;
  };

  it("⛔ le succès rend le DTO de la LIGNE que le port renvoie (officielle, `DEVIS-…`, même numéro) — pas un objet bâti avec ce que l'appelant a envoyé", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: true, devis: devisRow({ isOfficial: true, clientRecordId: FICHE_ID, clientNameLatin: "Nom Du Serveur" }) });
    const dto = await service.promote(ACTEUR, QUOTE_ID, CORPS);
    expect(dto.isOfficial).toBe(true);
    expect(dto.reference).toBe("DEVIS-2026-0007-0089 v1");
    expect(dto.clientNameLatin, "le nom rendu est celui de la ligne").toBe("Nom Du Serveur");
  });

  it("⛔ le port reçoit l'ACTEUR (identifiant ET rôle — ils vont dans la ligne d'audit), le devis, les statuts source de la MACHINE À ÉTATS, et la copie décidée par la politique", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: true, devis: devisRow({ isOfficial: true }) });
    await service.promote(ACTEUR, QUOTE_ID, { clientRecordId: FICHE_ID, clientNameLatin: "Amina Bensalem", clientNameAr: "آمنة بن سالم" });
    expect(devis.promouvoir).toHaveBeenCalledTimes(1);
    const args = devis.promouvoir.mock.calls[0]![0] as { acteur: unknown; quoteId: string; statutsAdmis: readonly string[]; copie: unknown };
    expect(args.acteur).toEqual({ userId: USER_ID, role: UserRole.PRO });
    expect(args.quoteId).toBe(QUOTE_ID);
    // ⚠ Égalité avec l'AUTORITÉ, jamais une liste écrite ici (leçon de S10b).
    expect(args.statutsAdmis).toEqual([...quoteAllowedFrom(QuoteCommand.PROMOTE)]);
    expect(args.copie).toEqual({ clientRecordId: FICHE_ID, clientNameAr: "آمنة بن سالم", clientNameLatin: "Amina Bensalem" });
  });

  it("⛔ un nom absent de la saisie est NULL dans la copie (jamais une chaîne vide, jamais le nom de la fiche en repli sur une fiche non liée)", async () => {
    const { service, devis } = preparer();
    devis.ficheDuPro.mockResolvedValue({ ...FICHE, nameAr: "اسم الفيشة" });
    devis.promouvoir.mockResolvedValue({ ok: true, devis: devisRow({ isOfficial: true }) });
    await service.promote(ACTEUR, QUOTE_ID, CORPS);
    expect((devis.promouvoir.mock.calls[0]![0] as { copie: unknown }).copie).toEqual({ clientRecordId: FICHE_ID, clientNameAr: null, clientNameLatin: "Amina Bensalem" });
  });

  it("⛔ le devis n'est pas au pro (le port le rend `null`) : 404 QUOTE_NOT_FOUND AVANT la fiche, et rien n'est écrit ; un identifiant hors motif : 404 sans toucher le port", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(null);
    estRefus(await refus(service.promote(ACTEUR, QUOTE_ID, CORPS)), NotFoundException, "QUOTE_NOT_FOUND");
    expect(devis.ficheDuPro).not.toHaveBeenCalled();
    expect(devis.promouvoir).not.toHaveBeenCalled();
    devis.trouverDuPro.mockClear();
    estRefus(await refus(service.promote(ACTEUR, "pas-un-uuid", CORPS)), NotFoundException, "QUOTE_NOT_FOUND");
    expect(devis.trouverDuPro).not.toHaveBeenCalled();
  });

  it("⛔ la fiche d'un AUTRE pro (le port rend `null`) : 404 CLIENT_RECORD_NOT_FOUND indistinct, et rien n'est écrit", async () => {
    const { service, devis } = preparer();
    devis.ficheDuPro.mockResolvedValue(null);
    estRefus(await refus(service.promote(ACTEUR, QUOTE_ID, CORPS)), NotFoundException, "CLIENT_RECORD_NOT_FOUND");
    expect(devis.ficheDuPro).toHaveBeenCalledWith(USER_ID, FICHE_ID);
    expect(devis.promouvoir).not.toHaveBeenCalled();
  });

  it("⛔ une fiche LIÉE à un compte et un nom DIFFÉRENT : 409 CLIENT_RECORD_LINKED, rien n'est écrit", async () => {
    const { service, devis } = preparer();
    devis.ficheDuPro.mockResolvedValue({ ...FICHE, nameLatin: "Amina Bensalem", linkedUserId: "018f0000-0000-7000-8000-0000000000ee" });
    estRefus(await refus(service.promote(ACTEUR, QUOTE_ID, { clientRecordId: FICHE_ID, clientNameLatin: "Autre Nom" })), ConflictException, "CLIENT_RECORD_LINKED");
    expect(devis.promouvoir).not.toHaveBeenCalled();
  });

  it("⛔ le port refuse « introuvable » : 404 QUOTE_NOT_FOUND", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: false, raison: "introuvable" });
    estRefus(await refus(service.promote(ACTEUR, QUOTE_ID, CORPS)), NotFoundException, "QUOTE_NOT_FOUND");
  });

  it("⛔ D-5 — le port refuse « déjà officiel » : 409 QUOTE_ALREADY_OFFICIAL, le message du catalogue", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: false, raison: "dejaOfficiel" });
    const e = await refus(service.promote(ACTEUR, QUOTE_ID, CORPS));
    estRefus(e, ConflictException, "QUOTE_ALREADY_OFFICIAL");
    expect(((e as ConflictException).getResponse() as { message?: string }).message).toBe("quote.errors.alreadyOfficial");
  });

  it("⛔ D-6 — le port refuse « version non active » : 409 QUOTE_VERSION_NOT_ACTIVE PORTANT `latestVersion` (l'écran sait laquelle est active)", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: false, raison: "versionNonActive", versionActive: 3 });
    const e = await refus(service.promote(ACTEUR, QUOTE_ID, CORPS));
    estRefus(e, ConflictException, "QUOTE_VERSION_NOT_ACTIVE");
    expect(((e as ConflictException).getResponse() as { latestVersion?: number }).latestVersion).toBe(3);
  });

  it("⛔ le port refuse « statut » : 409 QUOTE_STATUS_CONFLICT avec le statut RELU (un brouillon annulé est CLOS)", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: false, raison: "statutConflit", statutActuel: "CANCELLED" });
    await expect(service.promote(ACTEUR, QUOTE_ID, CORPS)).rejects.toSatisfy((e) => estConflitStatut(e, "CANCELLED"));
  });

  it("⚠ la promotion ne touche ni la remise, ni le statut, ni la conversion : elle ne change aucun montant", async () => {
    const { service, devis } = preparer();
    devis.promouvoir.mockResolvedValue({ ok: true, devis: devisRow({ isOfficial: true }) });
    await service.promote(ACTEUR, QUOTE_ID, CORPS);
    expect(devis.marquerRemis).not.toHaveBeenCalled();
    expect(devis.changerStatut).not.toHaveBeenCalled();
    expect(devis.convertirEnDemande).not.toHaveBeenCalled();
    expect(devis.creerRevision).not.toHaveBeenCalled();
    expect(devis.creerTeteDeChaine).not.toHaveBeenCalled();
  });
});

describe("⛔ D-15 — `revise` : la fiche d'un autre pro sur une chaîne brouillon reste un 404, décidé AVANT le verrou", () => {
  it("⛔ l'ordre : la fiche (404) est décidée avant l'écriture ; le refus « un brouillon ne porte pas de client » vient du PORT, sous le verrou de la chaîne", async () => {
    const { service, devis } = build();
    devis.trouverDuPro.mockResolvedValue(devisRow({ isOfficial: false }));
    devis.ficheDuPro.mockResolvedValue(null);
    estRefus(
      await refus(service.revise(USER_ID, QUOTE_ID, { eventDate: "2027-05-12", slotTemplateId: "018f0000-0000-7000-8000-000000000051", guests: 200, clientRecordId: "018f0000-0000-7000-8000-0000000000f1", clientNameLatin: "Amina Bensalem" })),
      NotFoundException,
      "CLIENT_RECORD_NOT_FOUND"
    );
    expect(devis.creerRevision).not.toHaveBeenCalled();
  });
});
