// Schémas Zod des demandes de réservation — Lot E1a.
//
// Ce fichier prouve la FRONTIÈRE : ce que le corps accepte et ce qu'il refuse.
// Le comportement du service (prix recalculé, verrou, transitions) se prouve en
// intégration, contre une vraie base — le mocker ici ne prouverait que le mock.
import { describe, expect, it } from "vitest";
import { bookingCancelSchema, bookingCreateSchema } from "@zwadj/types";

const VALID = {
  eventDate: "2027-08-15",
  slotTemplateId: "0198f0c2-1b3d-7a41-9c8e-2f4b6d8a0c11",
  guests: 250,
  paymentMethod: "ONLINE",
  contactFirstName: "Amina",
  contactLastName: "Bensalem",
  contactPhone: "+213550000001",
  contactEmail: "amina@example.dz",
  expectedTotalCents: 20_000_000,
  expectedDepositCents: 6_000_000
};

describe("bookingCreateSchema — ce qu'il doit ACCEPTER", () => {
  it("le corps complet, message compris", () => {
    const parsed = bookingCreateSchema.safeParse({ ...VALID, clientMessage: "Mariage, arrivée 19h." });
    expect(parsed.success).toBe(true);
  });

  it("sans message : il est facultatif (D79)", () => {
    expect(bookingCreateSchema.safeParse(VALID).success).toBe(true);
  });

  it("un message de 1000 caractères EXACTEMENT — la borne est incluse", () => {
    const parsed = bookingCreateSchema.safeParse({ ...VALID, clientMessage: "a".repeat(1000) });
    expect(parsed.success).toBe(true);
  });

  it("paiement en espèces : l'Algérie paie surtout comme ça", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, paymentMethod: "CASH" }).success).toBe(true);
  });
});

describe("bookingCreateSchema — ce qu'il doit REFUSER", () => {
  it("le créneau manquant : il porte le PRIX, dans les deux modes", () => {
    const without: Record<string, unknown> = { ...VALID };
    delete without.slotTemplateId;
    expect(bookingCreateSchema.safeParse(without).success).toBe(false);
  });

  it("les quatre champs de contact sont obligatoires — le profil ne les garantit pas", () => {
    for (const key of ["contactFirstName", "contactLastName", "contactPhone", "contactEmail"]) {
      const body: Record<string, unknown> = { ...VALID };
      delete body[key];
      expect(bookingCreateSchema.safeParse(body).success, key).toBe(false);
    }
  });

  it("un téléphone non +213", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: "0550000001" }).success).toBe(false);
  });

  it("les DEUX montants attendus sont obligatoires (D75)", () => {
    for (const key of ["expectedTotalCents", "expectedDepositCents"]) {
      const body: Record<string, unknown> = { ...VALID };
      delete body[key];
      expect(bookingCreateSchema.safeParse(body).success, key).toBe(false);
    }
  });

  it("1001 caractères de message : un de trop suffit", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, clientMessage: "a".repeat(1001) }).success).toBe(false);
  });

  it("zéro invité", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, guests: 0 }).success).toBe(false);
  });

  it("une date irréelle — le 31 février a une FORME valide", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, eventDate: "2027-02-31" }).success).toBe(false);
  });

  it("une clé inconnue : `.strict()` ferme la porte", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, totalCents: 1 }).success).toBe(false);
  });
});

describe("bookingCancelSchema", () => {
  it("sans motif : valide au SCHÉMA — l'obligation dépend du statut, donc du service (D83)", () => {
    expect(bookingCancelSchema.safeParse({}).success).toBe(true);
  });

  it("un motif vide est refusé : ce n'est pas la même chose que l'absence de motif", () => {
    expect(bookingCancelSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("501 caractères de motif", () => {
    expect(bookingCancelSchema.safeParse({ reason: "a".repeat(501) }).success).toBe(false);
  });
});
