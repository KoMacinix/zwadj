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

  it("un téléphone tapé à la locale : il est normalisé, pas rejeté (R3)", () => {
    const r = bookingCreateSchema.safeParse({ ...VALID, contactPhone: "0550 00 00 01" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactPhone).toBe("+213550000001");
  });

  it("paiement en espèces : l'Algérie paie surtout comme ça", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, paymentMethod: "CASH" }).success).toBe(true);
  });

  /** ⚠ LE CAS RÉEL, écrit AVANT la borne (D55). Ce test-ci est la raison d'être
   *  de D135 : `bookings.contact_email` est `String?` depuis toujours, seule la
   *  borne Zod était plus stricte que la base, et ce qu'elle rejetait n'était
   *  pas un cas limite — c'était le client algérien au comptoir, sans adresse
   *  e-mail. Sans lui, le parcours sur place était inachevable. */
  it("sans e-mail : le client au comptoir n'en a pas (D135)", () => {
    const sansEmail: Record<string, unknown> = { ...VALID };
    delete sansEmail.contactEmail;
    expect(bookingCreateSchema.safeParse(sansEmail).success).toBe(true);
  });
});

describe("bookingCreateSchema — ce qu'il doit REFUSER", () => {
  it("le créneau manquant : il porte le PRIX, dans les deux modes", () => {
    const without: Record<string, unknown> = { ...VALID };
    delete without.slotTemplateId;
    expect(bookingCreateSchema.safeParse(without).success).toBe(false);
  });

  /** DEUX, désormais : le prénom et le nom. ⛔ L36-1 (D337) : le TÉLÉPHONE est sorti de cette liste, comme l'e-mail l'était depuis D135 —
   *  `contact_phone` est facultatif en base, et c'est « un numéro OU un e-mail » (au moins l'un des deux) qui est exigé, prouvé plus bas.
   *  Ils restent obligatoires parce que `User.firstName` et `lastName` sont nullable : le compte ne peut pas les fournir de façon fiable. */
  it("le prénom et le nom restent obligatoires — le profil ne les garantit pas (D135)", () => {
    for (const key of ["contactFirstName", "contactLastName"]) {
      const body: Record<string, unknown> = { ...VALID };
      delete body[key];
      expect(bookingCreateSchema.safeParse(body).success, key).toBe(false);
    }
  });

  /** ⚠ « Facultatif » veut dire CLÉ OMISE, jamais chaîne vide (D135) : `.email()`
   *  refuse `""`. Un formulaire qui envoie le champ vide plutôt que de ne pas
   *  l'envoyer prend un 400 — c'est ici qu'on l'apprend, pas en production. */
  it("un e-mail VIDE n'est pas un e-mail absent", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, contactEmail: "" }).success).toBe(false);
  });

  it("un fixe : la réservation exige un mobile joignable (R3)", () => {
    // `0550000001` — la saisie locale — est désormais ACCEPTÉE et normalisée ;
    // c'est prouvé du côté ACCEPTER. Ce qui reste refusé, c'est le fixe.
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: "021234567" }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: "+33612345678" }).success).toBe(false);
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

// ══ L36-1 (D337) — LA RÉSERVATION PAR E-MAIL SEUL ═══════════════════════════════════════════════════════════════════
// Q2 de Ko (22/10/2026) : « Une réservation est tout à fait possible avec une adresse e-mail uniquement. » Le numéro devient facultatif ; UN des deux
// est exigé. Les cas ci-dessous viennent des modes de défaillance ML-1, ML-2, ML-3, ML-8, ML-9, ML-10 et ML-17 (`docs/preuves/D337/modes-de-defaillance.md`).
describe("⛔ bookingCreateSchema — un numéro OU un e-mail (L36-1)", () => {
  const sans = (...cles: string[]): Record<string, unknown> => {
    const corps: Record<string, unknown> = { ...VALID };
    for (const cle of cles) delete corps[cle];
    return corps;
  };
  const CLE_NEUVE = "booking.validation.contactChannelRequired";

  it("ML-2 — un e-mail SEUL : accepté, et le numéro reste ABSENT de la donnée (pas une chaîne vide)", () => {
    const r = bookingCreateSchema.safeParse(sans("contactPhone"));
    expect(r.success).toBe(true);
    if (r.success) {
      expect("contactPhone" in r.data).toBe(false);
      expect(r.data.contactEmail).toBe("amina@example.dz");
    }
  });

  it("un numéro SEUL : accepté (le parcours d'avant, D135)", () => {
    expect(bookingCreateSchema.safeParse(sans("contactEmail")).success).toBe(true);
  });

  it("ML-1 — NI numéro NI e-mail : refusé, avec la clé du message neuf, portée par le champ du numéro", () => {
    const r = bookingCreateSchema.safeParse(sans("contactPhone", "contactEmail"));
    expect(r.success).toBe(false);
    if (!r.success) {
      const ciblee = r.error.issues.filter((i) => i.message === CLE_NEUVE);
      expect(ciblee).toHaveLength(1);
      expect(ciblee[0]?.path).toEqual(["contactPhone"]);
    }
  });

  it("ML-8 — un numéro SAISI et invalide est refusé même avec un e-mail valide (et l'inverse)", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: "021234567" }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...sans("contactPhone"), contactEmail: "amina@" }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...VALID, contactEmail: "amina@" }).success).toBe(false);
  });

  it("ML-9 — « facultatif » veut dire CLÉ OMISE : un numéro VIDE n'est pas un numéro absent, même avec un e-mail", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: "" }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...sans("contactEmail"), contactPhone: "" }).success).toBe(false);
  });

  it("ML-10 — `contactPhone: null` n'est pas une absence : refusé", () => {
    expect(bookingCreateSchema.safeParse({ ...VALID, contactPhone: null }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...sans("contactEmail"), contactPhone: null }).success).toBe(false);
  });

  it("ML-3 (S-55, SIGNALEMENT SANS ALIGNEMENT) — l'e-mail de la réservation est ROGNÉ seulement : « Amina@Example.DZ » reste tel que saisi, alors que la fiche le met en minuscules", () => {
    const r = bookingCreateSchema.safeParse({ ...sans("contactPhone"), contactEmail: "  Amina@Example.DZ  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactEmail).toBe("Amina@Example.DZ");
  });

  it("ML-17 — la règle s'ajoute SANS retirer `.strict()` : une clé inconnue reste refusée, e-mail seul compris", () => {
    expect(bookingCreateSchema.safeParse({ ...sans("contactPhone"), totalCents: 1 }).success).toBe(false);
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
