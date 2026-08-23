// Ouverture d'un paiement — LE SERVICE, vu par son PORT (lots S5a-0 puis S5a).
//
// ⚠ CE FICHIER A ÉTÉ RÉÉCRIT PAR S5a, ET IL FAUT LE DIRE PLUTÔT QUE DE LE
// TAIRE. La règle du dépôt est qu'une spec ne se modifie pas pour redevenir
// verte. Ici la modification n'est pas une réparation : le constructeur du
// service a changé — il reçoit un PORT et non plus `PrismaService` — donc la
// façon de le construire devait suivre. Les COMPORTEMENTS mesurés, eux, sont
// les mêmes, et ceux qui portaient sur la forme des requêtes n'ont pas disparu :
// ils ont déménagé dans `payment-store.prisma.spec.ts`, avec le code qu'ils
// mesurent. Aucune garde n'a été perdue dans le trajet — c'est vérifiable en
// comptant.
//
// ⚠ CE QUI EST MESURÉ ICI. Les quatre RÈGLES de décision vivent dans
// `payment-intent.ts`, pur, et ont déjà leur spec ; les redoubler serait
// tautologique (D223). Ce fichier mesure ce que le SERVICE ajoute : ce qu'il
// demande au port, ce qu'il en fait, et comment il traduit un refus.
import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayableBooking, PaymentIntent } from "./payment-store.types";
import { PaymentsService } from "./payments.service";

/** Réservation ACCEPTED avec acompte : le seul cas passant (décision E3a). */
const RESERVATION: PayableBooking = { id: "b-1", status: "ACCEPTED", depositCents: 12_000_000 };

const INTENTION: PaymentIntent = {
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

/** ⚠ Construit à CHAQUE test, jamais partagé : un `vi.fn()` de portée module
 *  rend les compteurs dépendants de l'ordre d'exécution. */
function storeDouble(options: { booking?: PayableBooking | null } = {}) {
  return {
    findBookingForPayer: vi.fn(async (_userId: string, _bookingId: string) =>
      options.booking === undefined ? RESERVATION : options.booking
    ),
    findOrCreatePendingIntent: vi.fn(
      async (_input: { bookingId: string; amountCents: number; discountAppliedCents: number }) => INTENTION
    )
  };
}

const passerelle = { createCheckout: vi.fn() };

function service(store: ReturnType<typeof storeDouble>) {
  return new PaymentsService(store, passerelle as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("1. L'accès à la réservation", () => {
  it("⚠ le port rend `null` → 404, sans que le service puisse savoir POURQUOI (D47)", async () => {
    // Inexistante et « pas la vôtre » passent par le même `null` : le service
    // n'a PAS de quoi les distinguer, donc il ne peut pas fuiter la différence.
    const store = storeDouble({ booking: null });
    await expect(service(store).openIntent("u-1", "b-1", true)).rejects.toBeInstanceOf(NotFoundException);
    expect(store.findOrCreatePendingIntent).not.toHaveBeenCalled();
  });

  it("l'identité du demandeur est TRANSMISE au port — sans elle, la propriété ne peut pas être vérifiée", async () => {
    const store = storeDouble();
    await service(store).openIntent("u-42", "b-1", true);
    expect(store.findBookingForPayer).toHaveBeenCalledWith("u-42", "b-1");
  });
});

describe("2. Le refus de la décision devient un 409 qui NOMME sa raison", () => {
  it("drapeau éteint → 409 `PAYMENTS_DISABLED`, et RIEN n'est écrit", async () => {
    const store = storeDouble();
    await expect(service(store).openIntent("u-1", "b-1", false)).rejects.toMatchObject({
      response: { code: "PAYMENTS_DISABLED" }
    });
    expect(store.findOrCreatePendingIntent).not.toHaveBeenCalled();
  });

  it("réservation non payable → 409 `BOOKING_NOT_PAYABLE`, et RIEN n'est écrit", async () => {
    const store = storeDouble({ booking: { ...RESERVATION, status: "PENDING" } });
    await expect(service(store).openIntent("u-1", "b-1", true)).rejects.toMatchObject({
      response: { code: "BOOKING_NOT_PAYABLE" }
    });
    expect(store.findOrCreatePendingIntent).not.toHaveBeenCalled();
  });

  it("acompte nul → 409 `NOTHING_TO_PAY`, et RIEN n'est écrit", async () => {
    const store = storeDouble({ booking: { ...RESERVATION, depositCents: 0 } });
    await expect(service(store).openIntent("u-1", "b-1", true)).rejects.toMatchObject({
      response: { code: "NOTHING_TO_PAY" }
    });
    expect(store.findOrCreatePendingIntent).not.toHaveBeenCalled();
  });

  it("⚠ CHAQUE code de refus porte une clé i18n DISTINCTE et bien formée", async () => {
    // La table `REFUSAL_MESSAGE_KEYS` existe parce que l'interpolation
    // produisait `payment.errors.PAYMENTS_DISABLED` — une clé absente des DEUX
    // catalogues, donc invisible au test de parité, qui ne compare que FR à AR.
    // Une clé en CRIS est le symptôme du retour de l'interpolation.
    const cas: [boolean, PayableBooking, string][] = [
      [false, RESERVATION, "paymentsDisabled"],
      [true, { ...RESERVATION, status: "PENDING" }, "bookingNotPayable"],
      [true, { ...RESERVATION, depositCents: 0 }, "nothingToPay"]
    ];
    const vues = new Set<string>();
    for (const [drapeau, booking, attendu] of cas) {
      let erreur: ConflictException | null = null;
      try {
        await service(storeDouble({ booking })).openIntent("u-1", "b-1", drapeau);
      } catch (e) {
        erreur = e as ConflictException;
      }
      expect(erreur, "le refus n'a pas levé").not.toBeNull();
      const message = (erreur?.getResponse() as { message: string }).message;
      expect(message, `refus ${attendu}`).toBe(`payment.errors.${attendu}`);
      vues.add(message);
    }
    expect(vues.size, "deux refus partagent la même clé").toBe(3);
  });
});

describe("3. Ce que le service DEMANDE au port — le seul endroit où un montant se pose", () => {
  it("⚠ LES MONTANTS TRANSMIS SONT CEUX DE LA DÉCISION, pas une relecture de la réservation", async () => {
    const store = storeDouble();
    await service(store).openIntent("u-1", "b-1", true);

    expect(store.findOrCreatePendingIntent).toHaveBeenCalledTimes(1);
    expect(store.findOrCreatePendingIntent).toHaveBeenCalledWith({
      bookingId: "b-1",
      amountCents: RESERVATION.depositCents,
      discountAppliedCents: 0
    });
  });

  it("⚠ AUCUNE ARITHMÉTIQUE : le montant transmis est ÉGAL à l'acompte, au centime", async () => {
    // L'acompte est un instantané figé à la conversion. Le multiplier, l'arrondir
    // ou le recalculer ici produirait un second montant pour une seule affaire.
    const store = storeDouble({ booking: { ...RESERVATION, depositCents: 7_333_333 } });
    await service(store).openIntent("u-1", "b-1", true);
    expect(store.findOrCreatePendingIntent.mock.calls[0]?.[0].amountCents).toBe(7_333_333);
  });

  it("l'intention du port est rendue TELLE QUELLE — le service ne la réécrit pas", async () => {
    const store = storeDouble();
    expect(await service(store).openIntent("u-1", "b-1", true)).toBe(INTENTION);
  });
});

describe("4. La passerelle", () => {
  it("⚠ AUCUNE session n'est ouverte à l'ouverture d'intention", async () => {
    // E3b s'arrête à l'écriture. Appeler la passerelle ici enverrait le client
    // payer avant qu'un webhook signé n'existe pour en constater le résultat.
    const store = storeDouble();
    await service(store).openIntent("u-1", "b-1", true);
    expect(passerelle.createCheckout).not.toHaveBeenCalled();
  });

  it("`gatewayForCheckout` rend l'adaptateur injecté, sans le choisir", () => {
    expect(service(storeDouble()).gatewayForCheckout()).toBe(passerelle);
  });
});
