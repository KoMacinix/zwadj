import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` — même raison que `phone.spec.ts` : `packages/types` n'a pas de lanceur de tests,
// et un test qui ne tourne pas est pire que pas de test.
import {
  CONTACT_EMAIL_MAX,
  PERSON_NAME_MAX,
  bookingCreateSchema,
  contactEmailSchema,
  isValidContactEmail,
  isValidPersonName,
  personNameSchema,
  quoteConvertSchema
} from "@zwadj/types";

// ══ Rang 32 (D325) — LE NOM ET L'E-MAIL DU CONTACT : UNE règle, que l'écran importe et que le serveur applique ═══════
// Consigne de Ko : « NOM ET PRÉNOM : lettres de toute écriture (français accentué ET arabe), espaces, « - » et « ' ». Aucun chiffre, aucun
// autre symbole. E-MAIL : la même validation que le contrat d'API, importée. Pas d'expression régulière de plus. Une règle de validation
// vit UNE fois, dans le contrat partagé, et le front l'importe (D147, source unique). Le serveur refuse ce que l'écran refuse. »

describe("isValidPersonName — ce qu'elle doit ACCEPTER", () => {
  /** ⚠ D55 : la liste des noms que PORTENT réellement des clients algériens — français accentué, composés, apostrophes, arabe. Si la règle en
   *  refusait un, ce serait la règle qui aurait tort. */
  const ACCEPTES: [string, string][] = [
    ["Amine", "un prénom simple"],
    ["Belkacem", "un nom simple"],
    ["Éloïse", "français accentué"],
    ["Éloïse", "les mêmes accents, DÉCOMPOSÉS (lettre + marque combinante)"],
    ["Jean-Pierre", "composé, avec un tiret"],
    ["O'Brien", "apostrophe droite"],
    ["N’Diaye", "apostrophe typographique"],
    ["Marie Claire", "deux mots séparés par une espace"],
    ["أمينة", "arabe"],
    ["بن علي", "arabe, deux mots"],
    ["أَمِينَة", "arabe avec voyelles brèves (marques combinantes)"],
    ["Ben Aïssa-El Hadj", "français, composé, accentué"]
  ];
  for (const [nom, pourquoi] of ACCEPTES) {
    it(`« ${nom} » — ${pourquoi}`, () => {
      expect(isValidPersonName(nom)).toBe(true);
    });
  }

  it("les espaces autour sont ignorés : le schéma rogne avant de juger", () => {
    expect(isValidPersonName("  Amine  ")).toBe(true);
  });
});

describe("isValidPersonName — ce qu'elle doit REFUSER : aucun chiffre, aucun autre symbole", () => {
  const REFUSES: [string, string][] = [
    ["Amine1", "un chiffre à la fin"],
    ["4mine", "un chiffre au début"],
    ["12", "des chiffres seuls"],
    ["٣٤٥", "des chiffres ARABES-INDIENS : ce sont des chiffres"],
    ["A@B", "un arobase"],
    ["Ben_Ali", "un tiret bas"],
    ["Jean.Pierre", "un point"],
    ["Amine!", "un point d'exclamation"],
    ["Amine<script>", "une balise"],
    ["-Jean", "commence par un tiret"],
    ["'Jean", "commence par une apostrophe"],
    [" -", "un tiret seul"],
    ["", "chaîne vide"],
    ["   ", "des espaces seulement"],
    ["Amine \u{1F600}", "un émoji"]
  ];
  for (const [nom, pourquoi] of REFUSES) {
    it(`« ${nom} » — ${pourquoi}`, () => {
      expect(isValidPersonName(nom)).toBe(false);
    });
  }
});

describe("le NOM — « le serveur refuse ce que l'écran refuse » : la même fonction", () => {
  const COMMUN = { contactLastName: "Bensalem", contactPhone: "+213550000001" };
  const RESERVATION = {
    eventDate: "2027-08-15",
    slotTemplateId: "0198f0c2-1b3d-7a41-9c8e-2f4b6d8a0c11",
    guests: 250,
    paymentMethod: "ONLINE",
    expectedTotalCents: 20_000_000,
    expectedDepositCents: 6_000_000,
    ...COMMUN
  };
  const CONVERSION = { ...COMMUN, paymentMethod: "CASH" };
  const echantillon = ["Amina", "Éloïse", "Jean-Pierre", "O'Brien", "أمينة", "Amina123", "A@B", "-Jean", "Ben_Ali", "٣٤٥", ""];

  it("la demande de réservation et la conversion du devis jugent TOUS les noms comme l'écran (`isValidPersonName`)", () => {
    for (const nom of echantillon) {
      const ecran = isValidPersonName(nom);
      const reservation = bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: nom }).success;
      const conversion = quoteConvertSchema.safeParse({ ...CONVERSION, contactFirstName: nom }).success;
      expect(reservation, `réservation « ${nom} »`).toBe(ecran);
      expect(conversion, `conversion « ${nom} »`).toBe(ecran);
    }
  });

  it("le NOM de famille suit la même règle que le PRÉNOM, sur les deux routes", () => {
    for (const nom of ["Amina123", "A@B"]) {
      expect(bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: "Amina", contactLastName: nom }).success).toBe(false);
      expect(quoteConvertSchema.safeParse({ ...CONVERSION, contactFirstName: "Amina", contactLastName: nom }).success).toBe(false);
    }
  });

  it("le refus porte une CLÉ de catalogue propre à sa route — `booking.validation.contactInvalid`, `quote.validation.nameInvalid`", () => {
    const reservation = bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: "Amina123" });
    const conversion = quoteConvertSchema.safeParse({ ...CONVERSION, contactFirstName: "Amina123" });
    expect(reservation.success || reservation.error.issues.map((i) => i.message)).toEqual(["booking.validation.contactInvalid"]);
    expect(conversion.success || conversion.error.issues.map((i) => i.message)).toEqual(["quote.validation.nameInvalid"]);
  });

  it("un champ simplement VIDE dit « obligatoire » seul — pas aussi « invalide »", () => {
    const reservation = bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: "" });
    expect(reservation.success || reservation.error.issues.map((i) => i.message)).toEqual(["booking.validation.contactRequired"]);
  });

  it("le plafond reste celui des deux routes d'avant : 80 caractères, bornes incluses", () => {
    expect(PERSON_NAME_MAX).toBe(80);
    expect(bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: "a".repeat(80) }).success).toBe(true);
    expect(bookingCreateSchema.safeParse({ ...RESERVATION, contactFirstName: "a".repeat(81) }).success).toBe(false);
    expect(quoteConvertSchema.safeParse({ ...CONVERSION, contactFirstName: "a".repeat(80) }).success).toBe(true);
    expect(quoteConvertSchema.safeParse({ ...CONVERSION, contactFirstName: "a".repeat(81) }).success).toBe(false);
  });

  it("`personNameSchema` : la fabrique rend la règle avec LES messages de l'appelant", () => {
    const schema = personNameSchema({ required: "r", tooLong: "l", invalid: "i" });
    expect(schema.safeParse("Amina").success).toBe(true);
    const refus = schema.safeParse("Amina1");
    expect(refus.success || refus.error.issues.map((x) => x.message)).toEqual(["i"]);
  });
});

describe("l'E-MAIL — le MÊME schéma sur l'écran, la réservation et la conversion", () => {
  const COMMUN = { contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001" };
  const RESERVATION = {
    eventDate: "2027-08-15",
    slotTemplateId: "0198f0c2-1b3d-7a41-9c8e-2f4b6d8a0c11",
    guests: 250,
    paymentMethod: "ONLINE",
    expectedTotalCents: 20_000_000,
    expectedDepositCents: 6_000_000,
    ...COMMUN
  };
  const CONVERSION = { ...COMMUN, paymentMethod: "CASH" };
  const longue = `${"a".repeat(CONTACT_EMAIL_MAX - 5)}@b.co`;
  const echantillon = [
    "amina@example.dz",
    "a@b.co",
    "prenom.nom+tag@example.com",
    "amina@",
    "@example.com",
    "amina@@example.com",
    "a b@c.co",
    "amina",
    "amina@example",
    "  amina@example.dz  ",
    longue,
    `${longue}x`
  ];

  it("l'écran (`isValidContactEmail`), la réservation et la conversion rendent le MÊME verdict, sur douze adresses", () => {
    let examinees = 0;
    for (const adresse of echantillon) {
      examinees += 1;
      const ecran = isValidContactEmail(adresse);
      expect(bookingCreateSchema.safeParse({ ...RESERVATION, contactEmail: adresse }).success, `réservation « ${adresse} »`).toBe(ecran);
      expect(quoteConvertSchema.safeParse({ ...CONVERSION, contactEmail: adresse }).success, `conversion « ${adresse} »`).toBe(ecran);
    }
    expect(examinees).toBe(12);
  });

  it("le verdict n'est pas toujours « oui » ni toujours « non » : la comparaison ci-dessus discrimine", () => {
    const verdicts = echantillon.map(isValidContactEmail);
    expect(verdicts).toContain(true);
    expect(verdicts).toContain(false);
  });

  it("l'adresse est FACULTATIVE (D135) : absente, les deux routes l'acceptent — la règle ne juge que ce qui est saisi", () => {
    expect(bookingCreateSchema.safeParse(RESERVATION).success).toBe(true);
    expect(quoteConvertSchema.safeParse(CONVERSION).success).toBe(true);
  });

  it("`contactEmailSchema` : la fabrique rend la règle avec LES messages de l'appelant, 180 caractères au plus", () => {
    const schema = contactEmailSchema({ invalid: "i", tooLong: "l" });
    expect(schema.safeParse(longue).success).toBe(true);
    const trop = schema.safeParse(`${longue}x`);
    expect(trop.success || trop.error.issues.map((x) => x.message)).toContain("l");
    const faux = schema.safeParse("amina@");
    expect(faux.success || faux.error.issues.map((x) => x.message)).toEqual(["i"]);
  });
});
