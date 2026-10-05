// Le CONTACT du parcours « Nouvelle réservation » — ses règles, en fonctions PURES. Rang 32, D325.
//
// ── Pourquoi un module à part ───────────────────────────────────────────────
// Ces règles vivaient dans `walkin-journey.tsx` sous la forme `contact.phone.trim() !== ""` : « non vide » tenait lieu de
// « valide », et le serveur, au `400` de la conclusion, découvrait le reste. Une garde qui vit dans un composant ne se
// neutralise qu'à la cadence d'une suite de rendu (D187, D205) ; ici elle se rejoue en millisecondes, sans DOM.
//
// ⚠ AUCUNE RÈGLE N'EST ÉCRITE ICI. Chaque test vient du CONTRAT (`@zwadj/types`) : le nom (`isValidPersonName`), l'e-mail
// (`isValidContactEmail`), le téléphone (`isPhoneComplete`, `applyPhoneInput`). C'est la même fonction que le serveur
// applique à la conversion du devis — l'écran refuse donc ce que le serveur refuse, parce que c'est la même règle (D147).
//
// ⚠ LE TÉLÉPHONE EST UNE SUITE DE CHIFFRES NATIONAUX (sans indicatif ni zéro initial) : ce que le champ partagé affiche
// après son préfixe. Il se convertit à l'ENVOI par `toE164` — une seule fois, dans `contactPayload`.
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  isPhoneComplete,
  isValidContactEmail,
  isValidPersonName,
  toE164,
  type PhoneCountryId
} from "@zwadj/types";

export type Contact = { firstName: string; lastName: string; phone: string; email: string };
export const NO_CONTACT: Contact = { firstName: "", lastName: "", phone: "", email: "" };

/** Ce qui retient le client à une étape : une CLÉ de catalogue (`venue.ui.walkin.<clé>`), jamais une phrase. */
export type Blocker =
  | "needFirstName"
  | "needFirstNameValid"
  | "needLastName"
  | "needLastNameValid"
  | "needPhone"
  | "needPhoneLeading"
  | "needPhoneIncomplete"
  | "needGuests"
  | "needEmailValid";

/** Le premier chiffre du téléphone est-il refusé par le modèle de pays ? */
export function phoneLeadingRejected(digits: string, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): boolean {
  return digits !== "" && !PHONE_COUNTRIES[country].leadingDigits.includes(digits.charAt(0));
}

/**
 * Ce qui empêche de CONCLURE : le contact seul (D135 — le nombre d'invités n'est pas du contact). L'e-mail reste
 * FACULTATIF : vide, il ne retient rien ; saisi, il doit passer la règle du contrat.
 */
export function contactBlockers(contact: Contact, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): Blocker[] {
  const out: Blocker[] = [];
  const firstName = contact.firstName.trim();
  const lastName = contact.lastName.trim();
  if (firstName === "") out.push("needFirstName");
  else if (!isValidPersonName(firstName)) out.push("needFirstNameValid");
  if (lastName === "") out.push("needLastName");
  else if (!isValidPersonName(lastName)) out.push("needLastNameValid");
  if (contact.phone === "") out.push("needPhone");
  else if (phoneLeadingRejected(contact.phone, country)) out.push("needPhoneLeading");
  else if (!isPhoneComplete(country, contact.phone)) out.push("needPhoneIncomplete");
  if (contact.email.trim() !== "" && !isValidContactEmail(contact.email)) out.push("needEmailValid");
  return out;
}

/** Ce qui empêche de CONTINUER après l'étape Client : le contact, puis le nombre d'invités (il chiffre les prestations). */
export function clientBlockers(contact: Contact, guests: string, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): Blocker[] {
  const out = contactBlockers(contact, country);
  if (!(Number(guests) > 0)) out.push("needGuests");
  return out;
}

/** Les erreurs à AFFICHER sous les champs : seulement ce qui est SAISI et refusé. Un champ resté vide n'est pas fautif — il est « obligatoire », ce que la liste des raisons dit. */
export function fieldErrors(contact: Contact): { firstName: boolean; lastName: boolean; email: boolean } {
  return {
    firstName: contact.firstName.trim() !== "" && !isValidPersonName(contact.firstName),
    lastName: contact.lastName.trim() !== "" && !isValidPersonName(contact.lastName),
    email: contact.email.trim() !== "" && !isValidContactEmail(contact.email)
  };
}

/**
 * Le corps envoyé à la conversion du devis. ⚠ LA VALEUR ENVOYÉE EST CELLE SAISIE : noms rognés seulement ; téléphone = l'indicatif du
 * pays PLUS les chiffres saisis (la forme canonique que le contrat attend aujourd'hui — aucun changement de format) ; e-mail rogné, et la
 * CLÉ ABSENTE s'il est vide (D135 : `.email()` refuserait la chaîne vide).
 */
export function contactPayload(contact: Contact, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY) {
  return {
    contactFirstName: contact.firstName.trim(),
    contactLastName: contact.lastName.trim(),
    contactPhone: toE164(country, contact.phone),
    ...(contact.email.trim() === "" ? {} : { contactEmail: contact.email.trim() })
  };
}
