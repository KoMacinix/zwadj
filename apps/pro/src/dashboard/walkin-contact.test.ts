// Les règles du CONTACT du parcours « Nouvelle réservation » — rang 32, D325. Fonctions PURES : ces tests se rejouent sans DOM.
//
// ⚠ AUCUNE RÈGLE N'EST RECOPIÉE ICI. Chaque attendu vient du CONTRAT : `isValidPersonName`, `isValidContactEmail`, `isPhoneComplete`, et le
// modèle de pays pour le premier chiffre et la longueur. Un test qui recopierait « 5, 6 ou 7 » ou « 9 chiffres » deviendrait une seconde
// règle, qui dérive en silence (D147). Les seuls littéraux sont des SAISIES — des noms, des adresses —, jamais une règle.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  isPhoneComplete,
  isValidContactEmail,
  isValidPersonName,
  nationalDigitsOf,
  quoteConvertSchema
} from "@zwadj/types";
import { NO_CONTACT, clientBlockers, contactBlockers, contactPayload, fieldErrors, phoneLeadingRejected, type Contact } from "./walkin-contact";

const pays = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];
/** Un numéro national COMPLET et valide, construit depuis le modèle. */
const NUMERO = pays.leadingDigits.charAt(0) + "3".repeat(pays.nationalLength - 1);
/** Un premier chiffre que le modèle REFUSE. */
const MAUVAIS_PREMIER = [..."0123456789"].find((c) => !pays.leadingDigits.includes(c)) as string;

const COMPLET: Contact = { firstName: "Amine", lastName: "Belkacem", phone: NUMERO, email: "" };

describe("contactBlockers — ce qui empêche de CONCLURE", () => {
  it("un contact complet ne retient rien — l'e-mail est FACULTATIF (D135)", () => {
    expect(isPhoneComplete(DEFAULT_PHONE_COUNTRY, COMPLET.phone)).toBe(true);
    expect(contactBlockers(COMPLET)).toEqual([]);
  });

  it("un contact vide retient le prénom, le nom et le téléphone — dans l'ordre de l'écran, jamais l'e-mail", () => {
    expect(contactBlockers(NO_CONTACT)).toEqual(["needFirstName", "needLastName", "needPhone"]);
  });

  it("⚠ chaque raison est PRÉCISE : le prénom manque ≠ le nom manque ≠ le téléphone manque", () => {
    expect(contactBlockers({ ...COMPLET, firstName: "  " })).toEqual(["needFirstName"]);
    expect(contactBlockers({ ...COMPLET, lastName: "" })).toEqual(["needLastName"]);
    expect(contactBlockers({ ...COMPLET, phone: "" })).toEqual(["needPhone"]);
  });

  it("un nom écrit avec un caractère que le contrat refuse retient AUTREMENT qu'un nom absent", () => {
    for (const nom of ["Amine1", "A@B", "٣٤٥"]) {
      expect(isValidPersonName(nom)).toBe(false);
      expect(contactBlockers({ ...COMPLET, firstName: nom })).toEqual(["needFirstNameValid"]);
      expect(contactBlockers({ ...COMPLET, lastName: nom })).toEqual(["needLastNameValid"]);
    }
  });

  it("les noms que le contrat ACCEPTE ne retiennent rien : accentué, composé, apostrophe, arabe", () => {
    for (const nom of ["Éloïse", "Jean-Pierre", "O'Brien", "أمينة"]) {
      expect(isValidPersonName(nom)).toBe(true);
      expect(contactBlockers({ ...COMPLET, firstName: nom })).toEqual([]);
    }
  });

  it("⚠ le téléphone : vide ≠ premier chiffre refusé ≠ incomplet — trois raisons, trois états", () => {
    expect(contactBlockers({ ...COMPLET, phone: "" })).toEqual(["needPhone"]);
    expect(phoneLeadingRejected(MAUVAIS_PREMIER)).toBe(true);
    expect(contactBlockers({ ...COMPLET, phone: MAUVAIS_PREMIER })).toEqual(["needPhoneLeading"]);
    const incomplet = NUMERO.slice(0, pays.nationalLength - 1);
    expect(isPhoneComplete(DEFAULT_PHONE_COUNTRY, incomplet)).toBe(false);
    expect(phoneLeadingRejected(incomplet)).toBe(false);
    expect(contactBlockers({ ...COMPLET, phone: incomplet })).toEqual(["needPhoneIncomplete"]);
  });

  it("l'e-mail SAISI doit passer la règle du contrat ; vide, il ne retient rien", () => {
    for (const adresse of ["amine@", "pas une adresse", "a@@b.co"]) {
      expect(isValidContactEmail(adresse)).toBe(false);
      expect(contactBlockers({ ...COMPLET, email: adresse })).toEqual(["needEmailValid"]);
    }
    for (const adresse of ["", "   ", "amine@example.com"]) {
      expect(contactBlockers({ ...COMPLET, email: adresse })).toEqual([]);
    }
  });
});

describe("clientBlockers — ce qui empêche de CONTINUER : le contact, PUIS le nombre d'invités", () => {
  it("un seul manque : « le nombre d'invités est obligatoire », et rien d'autre", () => {
    expect(clientBlockers(COMPLET, "")).toEqual(["needGuests"]);
    expect(clientBlockers(COMPLET, "0")).toEqual(["needGuests"]);
    expect(clientBlockers(COMPLET, "200")).toEqual([]);
  });

  it("tout manque : les raisons s'énumèrent TOUTES, le nombre d'invités en dernier", () => {
    expect(clientBlockers(NO_CONTACT, "")).toEqual(["needFirstName", "needLastName", "needPhone", "needGuests"]);
  });
});

describe("fieldErrors — ce que l'écran AFFICHE sous un champ", () => {
  it("un champ resté vide n'est pas fautif : c'est « obligatoire », ce que la liste des raisons dit", () => {
    expect(fieldErrors(NO_CONTACT)).toEqual({ firstName: false, lastName: false, email: false });
  });

  it("un champ saisi et refusé l'est, champ par champ", () => {
    expect(fieldErrors({ ...COMPLET, firstName: "Amine1" })).toEqual({ firstName: true, lastName: false, email: false });
    expect(fieldErrors({ ...COMPLET, lastName: "A@B" })).toEqual({ firstName: false, lastName: true, email: false });
    expect(fieldErrors({ ...COMPLET, email: "amine@" })).toEqual({ firstName: false, lastName: false, email: true });
  });
});

describe("contactPayload — la valeur ENVOYÉE est celle saisie, au format que le contrat attend", () => {
  it("noms rognés, téléphone = l'indicatif du modèle + les chiffres saisis, e-mail omis s'il est vide", () => {
    const corps = contactPayload({ firstName: "  Amine ", lastName: "Belkacem  ", phone: NUMERO, email: "" });
    expect(corps).toEqual({ contactFirstName: "Amine", contactLastName: "Belkacem", contactPhone: `${pays.dialCode}${NUMERO}` });
    expect("contactEmail" in corps).toBe(false);
  });

  it("l'e-mail saisi part rogné", () => {
    expect(contactPayload({ ...COMPLET, email: "  amine@example.com " }).contactEmail).toBe("amine@example.com");
  });

  it("le corps passe le schéma du SERVEUR tel quel, et son téléphone se relit à l'identique (aller-retour)", () => {
    const corps = contactPayload(COMPLET);
    const verdict = quoteConvertSchema.safeParse({ ...corps, paymentMethod: "CASH" });
    expect(verdict.success).toBe(true);
    if (verdict.success) {
      expect(verdict.data.contactPhone).toBe(corps.contactPhone);
      expect(nationalDigitsOf(DEFAULT_PHONE_COUNTRY, verdict.data.contactPhone)).toBe(NUMERO);
    }
  });
});
