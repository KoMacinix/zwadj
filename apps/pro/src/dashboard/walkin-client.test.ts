// La FICHE et le NOM du parcours « Nouvelle réservation » — rang 41 (D336, L35-4 amendé). Fonctions PURES : ces tests se rejouent sans DOM.
// Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md` (MD-9 — le découpage du nom ; MD-17 — l'écran ; S-57 — l'ordre de la recherche).
import { describe, expect, it } from "vitest";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, QUOTE_CLIENT_NAME_FIELD, type ClientRecordDTO, type QuoteDTO } from "@zwadj/types";
import { copiePourDevis, decouperNom, nomManquant, nomPourConversion, ordreDeRecherche, prefillConversion } from "./walkin-client";

const pays = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
/** Un numéro national COMPLET et valide, construit depuis le modèle — jamais recopié. */
const NUMERO = pays.leadingDigits.charAt(0) + "3".repeat(pays.nationalLength - 1);

const fiche = (over: Partial<ClientRecordDTO> = {}): ClientRecordDTO => ({
  id: "fiche-1",
  phone: `${pays.dialCode}${NUMERO}`,
  email: null,
  nameAr: null,
  nameLatin: "Amina Bensalem",
  linked: false,
  createdAt: "2026-10-22T10:00:00.000Z",
  updatedAt: "2026-10-22T10:00:00.000Z",
  ...over
});
const copie = (latin: string | null, ar: string | null = null) => ({ clientNameLatin: latin, clientNameAr: ar });

describe("⛔ MD-9 (C-2 / C2-5) — `decouperNom` : au PREMIER espace — ce qui précède est le prénom, le reste le nom ; sans espace, tout au nom", () => {
  it("« Amina Bensalem » : prénom « Amina », nom « Bensalem »", () => {
    expect(decouperNom("Amina Bensalem")).toEqual({ firstName: "Amina", lastName: "Bensalem" });
  });

  it("⚠ un prénom COMPOSÉ tombe mal — « Abd El Kader Benali » donne « Abd » / « El Kader Benali » : c'est le défaut écrit, que le pro corrige à la main", () => {
    expect(decouperNom("Abd El Kader Benali")).toEqual({ firstName: "Abd", lastName: "El Kader Benali" });
  });

  it("l'arabe se coupe pareillement : « عبد القادر بن علي » donne « عبد » / « القادر بن علي »", () => {
    expect(decouperNom("عبد القادر بن علي")).toEqual({ firstName: "عبد", lastName: "القادر بن علي" });
  });

  it("SANS espace : tout va dans le nom, le prénom reste VIDE (à saisir) — aucun prénom n'est inventé", () => {
    expect(decouperNom("Bensalem")).toEqual({ firstName: "", lastName: "Bensalem" });
  });

  it("les espaces de bord ne comptent pas, et plusieurs espaces de suite ne laissent pas d'espace en tête du nom", () => {
    expect(decouperNom("  Amina   Bensalem  ")).toEqual({ firstName: "Amina", lastName: "Bensalem" });
    expect(decouperNom("")).toEqual({ firstName: "", lastName: "" });
  });
});

describe("`nomPourConversion` — la copie de la LANGUE DE L'INTERFACE, à défaut l'autre (consigne v3, § 6 e)", () => {
  it("interface française : la copie latine ; interface arabe : la copie arabe", () => {
    expect(nomPourConversion(copie("Amina Bensalem", "آمنة بن سالم"), "fr")).toBe("Amina Bensalem");
    expect(nomPourConversion(copie("Amina Bensalem", "آمنة بن سالم"), "ar")).toBe("آمنة بن سالم");
  });

  it("à défaut, l'AUTRE écriture ; sans aucune copie, rien", () => {
    expect(nomPourConversion(copie(null, "آمنة بن سالم"), "fr")).toBe("آمنة بن سالم");
    expect(nomPourConversion(copie("Amina Bensalem", null), "ar")).toBe("Amina Bensalem");
    expect(nomPourConversion(copie(null, null), "fr")).toBeNull();
  });
});

describe("K-12 — `prefillConversion` : le contact de la conversion PRÉREMPLI depuis la copie et la fiche ; rien n'est réécrit", () => {
  it("prénom et nom découpés de la copie ; numéro et e-mail de la FICHE (le numéro en chiffres nationaux, le champ ajoute l'indicatif à l'envoi)", () => {
    const rempli = prefillConversion({ quote: copie("Amina Bensalem"), fiche: fiche({ email: "amina@example.dz" }), saisie: { phone: "", email: "" }, langue: "fr" });
    expect(rempli).toEqual({ firstName: "Amina", lastName: "Bensalem", phone: NUMERO, email: "amina@example.dz" });
  });

  it("⛔ une fiche SANS numéro : le numéro est DEMANDÉ — vide si rien n'a été tapé, sinon le numéro tapé à l'étape Contact", () => {
    expect(prefillConversion({ quote: copie("Amina Bensalem"), fiche: fiche({ phone: null, email: "amina@example.dz" }), saisie: { phone: "", email: "amina@example.dz" }, langue: "fr" }).phone).toBe("");
    expect(prefillConversion({ quote: copie("Amina Bensalem"), fiche: fiche({ phone: null }), saisie: { phone: NUMERO, email: "" }, langue: "fr" }).phone).toBe(NUMERO);
  });

  it("un devis SANS copie du nom : prénom et nom vides, à saisir (la conversion se fait comme aujourd'hui)", () => {
    expect(prefillConversion({ quote: copie(null, null), fiche: null, saisie: { phone: NUMERO, email: "" }, langue: "fr" })).toEqual({
      firstName: "",
      lastName: "",
      phone: NUMERO,
      email: ""
    });
  });
});

describe("le reste de l'écran, en règles pures", () => {
  it("⛔ S-57 — `ordreDeRecherche` : d'abord le NUMÉRO, puis l'E-MAIL ; un identifiant incomplet ou invalide n'est pas cherché", () => {
    expect(ordreDeRecherche({ phone: NUMERO, email: " Amina@Example.DZ " })).toEqual([{ phone: `${pays.dialCode}${NUMERO}` }, { email: "Amina@Example.DZ" }]);
    expect(ordreDeRecherche({ phone: "", email: "amina@example.dz" })).toEqual([{ email: "amina@example.dz" }]);
    expect(ordreDeRecherche({ phone: NUMERO.slice(0, 3), email: "amina@" })).toEqual([]);
  });

  it("`nomManquant` — la copie de la langue DU DOCUMENT manque-t-elle ? La correspondance vient de l'AUTORITÉ (`QUOTE_CLIENT_NAME_FIELD`)", () => {
    const devis = { clientNameLatin: "Amina Bensalem", clientNameAr: null } as Pick<QuoteDTO, "clientNameAr" | "clientNameLatin">;
    expect(nomManquant(devis, "fr")).toBe(false);
    expect(nomManquant(devis, "ar")).toBe(true);
    expect(QUOTE_CLIENT_NAME_FIELD.ar).toBe("clientNameAr");
  });

  it("`copiePourDevis` — la fiche et les noms NON VIDES, rognés ; un nom vide n'est pas envoyé (le contrat refuserait la chaîne vide)", () => {
    expect(copiePourDevis({ ar: "", latin: "  Amina Bensalem " }, "fiche-1")).toEqual({ clientRecordId: "fiche-1", clientNameLatin: "Amina Bensalem" });
    expect(copiePourDevis({ ar: "آمنة", latin: "Amina" }, "fiche-1")).toEqual({ clientRecordId: "fiche-1", clientNameAr: "آمنة", clientNameLatin: "Amina" });
  });
});
