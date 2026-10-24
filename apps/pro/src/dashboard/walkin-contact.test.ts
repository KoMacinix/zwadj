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
import {
  NO_CONTACT,
  clientBlockers,
  contactBlockers,
  contactPayload,
  fieldErrors,
  identifierBlockers,
  identifierPayload,
  nameFieldErrors,
  phoneLeadingRejected,
  type Contact,
  type Noms
} from "./walkin-contact";

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

  it("⛔ L36-1 (D337) — un contact vide retient le prénom, le nom et « un numéro OU un e-mail » — dans l'ordre de l'écran", () => {
    expect(contactBlockers(NO_CONTACT)).toEqual(["needFirstName", "needLastName", "needIdentifier"]);
  });

  it("⚠ chaque raison est PRÉCISE : le prénom manque ≠ le nom manque ≠ aucun moyen de joindre le client", () => {
    expect(contactBlockers({ ...COMPLET, firstName: "  " })).toEqual(["needFirstName"]);
    expect(contactBlockers({ ...COMPLET, lastName: "" })).toEqual(["needLastName"]);
    expect(contactBlockers({ ...COMPLET, phone: "" })).toEqual(["needIdentifier"]);
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

  it("⚠ le téléphone : vide (sans e-mail) ≠ premier chiffre refusé ≠ incomplet — trois raisons, trois états", () => {
    expect(contactBlockers({ ...COMPLET, phone: "" })).toEqual(["needIdentifier"]);
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

// ⛔ Rang 41 (D336) — l'étape Client porte désormais les NOMS (arabe, latin) et le nombre d'invités ; le contact (numéro OU e-mail) est l'étape d'AVANT.
describe("clientBlockers — ce qui empêche de CONTINUER après l'étape Client : un nom au moins, PUIS le nombre d'invités", () => {
  const NOMS: Noms = { ar: "", latin: "Amine Belkacem" };

  it("un seul manque : « le nombre d'invités est obligatoire », et rien d'autre", () => {
    expect(clientBlockers(NOMS, "")).toEqual(["needGuests"]);
    expect(clientBlockers(NOMS, "0")).toEqual(["needGuests"]);
    expect(clientBlockers(NOMS, "200")).toEqual([]);
  });

  it("tout manque : les raisons s'énumèrent TOUTES, le nombre d'invités en dernier", () => {
    expect(clientBlockers({ ar: "", latin: "" }, "")).toEqual(["needName", "needGuests"]);
  });

  it("UN nom suffit, dans l'une OU l'autre écriture (DB-3 : au moins un des deux)", () => {
    expect(clientBlockers({ ar: "أمين بلقاسم", latin: "" }, "200")).toEqual([]);
    expect(clientBlockers({ ar: "", latin: "Amine Belkacem" }, "200")).toEqual([]);
    expect(clientBlockers({ ar: "  ", latin: "  " }, "200")).toEqual(["needName"]);
  });

  it("un nom SAISI et refusé par la règle du contrat retient AUTREMENT qu'un nom absent — champ par champ", () => {
    for (const nom of ["Amine1", "A@B"]) {
      expect(isValidPersonName(nom)).toBe(false);
      expect(clientBlockers({ ar: "", latin: nom }, "200")).toEqual(["needNameLatinValid"]);
      expect(clientBlockers({ ar: nom, latin: "Amine" }, "200")).toEqual(["needNameArValid"]);
    }
  });
});

describe("⛔ D336 — identifierBlockers : ce qui empêche de CONTINUER après l'étape Contact (un numéro OU un e-mail)", () => {
  it("rien de tapé : « un numéro ou un e-mail est obligatoire », une seule raison", () => {
    expect(identifierBlockers({ phone: "", email: "" })).toEqual(["needIdentifier"]);
    expect(identifierBlockers({ phone: "", email: "   " })).toEqual(["needIdentifier"]);
  });

  it("un numéro COMPLET seul, ou un e-mail VALIDE seul, suffit", () => {
    expect(identifierBlockers({ phone: NUMERO, email: "" })).toEqual([]);
    expect(identifierBlockers({ phone: "", email: "amine@example.com" })).toEqual([]);
    expect(identifierBlockers({ phone: NUMERO, email: "amine@example.com" })).toEqual([]);
  });

  it("⚠ un identifiant SAISI et invalide retient, même si l'autre est bon : le téléphone (premier chiffre, longueur), l'e-mail (la règle du contrat)", () => {
    expect(identifierBlockers({ phone: MAUVAIS_PREMIER, email: "amine@example.com" })).toEqual(["needPhoneLeading"]);
    expect(identifierBlockers({ phone: NUMERO.slice(0, pays.nationalLength - 1), email: "" })).toEqual(["needPhoneIncomplete"]);
    expect(identifierBlockers({ phone: NUMERO, email: "amine@" })).toEqual(["needEmailValid"]);
  });

  it("`identifierPayload` : le numéro au format du contrat (indicatif + chiffres saisis), l'e-mail rogné, et la CLÉ ABSENTE d'un identifiant vide", () => {
    expect(identifierPayload({ phone: NUMERO, email: "" })).toEqual({ phone: `${pays.dialCode}${NUMERO}` });
    expect(identifierPayload({ phone: "", email: "  amine@example.com " })).toEqual({ email: "amine@example.com" });
    expect(identifierPayload({ phone: NUMERO, email: "amine@example.com" })).toEqual({ phone: `${pays.dialCode}${NUMERO}`, email: "amine@example.com" });
  });

  it("`nameFieldErrors` : seuls les noms SAISIS et refusés sont en erreur", () => {
    expect(nameFieldErrors({ ar: "", latin: "" })).toEqual({ ar: false, latin: false });
    expect(nameFieldErrors({ ar: "أمين1", latin: "Amine" })).toEqual({ ar: true, latin: false });
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

// ══ L36-1 (D337) — la CONVERSION par e-mail seul : le numéro n'est plus exigé quand un e-mail valide est donné ═══════════
// ML-1, ML-2, ML-8, ML-9. Une seule règle — `hasContactChannel` — que le serveur applique aussi (`quoteConvertSchema`) : l'écran refuse ce que le serveur refuse.
describe("⛔ contactBlockers — un numéro OU un e-mail (L36-1)", () => {
  const MAIL = "amine@example.com";
  const SANS_NUMERO: Contact = { ...COMPLET, phone: "", email: MAIL };

  it("ML-2 — un e-mail VALIDE seul suffit : rien ne retient", () => {
    expect(contactBlockers(SANS_NUMERO)).toEqual([]);
  });

  it("ML-1 — ni numéro ni e-mail (même des blancs) : une seule raison, « un numéro ou un e-mail »", () => {
    expect(contactBlockers({ ...COMPLET, phone: "", email: "" })).toEqual(["needIdentifier"]);
    expect(contactBlockers({ ...COMPLET, phone: "", email: "   " })).toEqual(["needIdentifier"]);
  });

  it("ML-8 — un e-mail SAISI et invalide retient, numéro absent : « adresse invalide », pas « manque un moyen de joindre »", () => {
    expect(contactBlockers({ ...COMPLET, phone: "", email: "amine@" })).toEqual(["needEmailValid"]);
  });

  it("ML-8 — un numéro SAISI et invalide retient même avec un e-mail valide (l'e-mail ne « rachète » pas un numéro faux)", () => {
    expect(contactBlockers({ ...COMPLET, phone: MAUVAIS_PREMIER, email: MAIL })).toEqual(["needPhoneLeading"]);
    expect(contactBlockers({ ...COMPLET, phone: NUMERO.slice(0, pays.nationalLength - 1), email: MAIL })).toEqual(["needPhoneIncomplete"]);
  });

  it("l'écran et le serveur rendent le MÊME verdict sur les neuf paires (numéro, e-mail) : absent / valide / invalide", () => {
    const NUMEROS: [string, string][] = [["absent", ""], ["valide", NUMERO], ["invalide", NUMERO.slice(0, pays.nationalLength - 1)]];
    const MAILS: [string, string][] = [["absent", ""], ["valide", MAIL], ["invalide", "amine@"]];
    let examinees = 0;
    let acceptees = 0;
    for (const [nomN, phone] of NUMEROS) {
      for (const [nomM, email] of MAILS) {
        examinees += 1;
        const contact: Contact = { ...COMPLET, phone, email };
        const ecran = contactBlockers(contact).length === 0;
        const serveur = quoteConvertSchema.safeParse({ ...contactPayload(contact), paymentMethod: "CASH" }).success;
        if (ecran) acceptees += 1;
        expect(serveur, `numéro ${nomN}, e-mail ${nomM}`).toBe(ecran);
      }
    }
    expect(examinees).toBe(9);
    expect(acceptees, "la comparaison discrimine").toBe(3);
  });
});

describe("contactPayload — la valeur ENVOYÉE est celle saisie, au format que le contrat attend", () => {
  it("⛔ L36-1 — sans numéro, la clé `contactPhone` est ABSENTE du corps (ni \"\", ni null, ni « +213 » seul) ; l'e-mail part rogné", () => {
    const corps = contactPayload({ firstName: "Amine", lastName: "Belkacem", phone: "", email: " amine@example.com " });
    expect(Object.prototype.hasOwnProperty.call(corps, "contactPhone")).toBe(false);
    expect(corps).toEqual({ contactFirstName: "Amine", contactLastName: "Belkacem", contactEmail: "amine@example.com" });
    const verdict = quoteConvertSchema.safeParse({ ...corps, paymentMethod: "CASH" });
    expect(verdict.success).toBe(true);
    if (verdict.success) expect(Object.prototype.hasOwnProperty.call(verdict.data, "contactPhone")).toBe(false);
  });

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
