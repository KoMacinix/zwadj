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
// après son préfixe. Il se convertit à l'ENVOI par `toE164` — une seule fois par corps : `contactPayload` (la conclusion),
// `identifierPayload` (la création de la fiche).
//
// ⛔ RANG 41 (D336) — TROIS SAISIES, TROIS RÈGLES : l'IDENTIFIANT de l'étape Contact (`identifierBlockers` : un numéro OU un
// e-mail), les NOMS de l'étape Client (`clientBlockers` : un nom au moins, dans l'une ou l'autre écriture, puis les invités),
// et le CONTACT de la conclusion (`contactBlockers`, inchangé : prénom, nom et téléphone, que l'écran PRÉREMPLIT — K-12).
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  hasContactChannel,
  isPhoneComplete,
  isValidContactEmail,
  isValidPersonName,
  toE164,
  type PhoneCountryId
} from "@zwadj/types";

export type Contact = { firstName: string; lastName: string; phone: string; email: string };
export const NO_CONTACT: Contact = { firstName: "", lastName: "", phone: "", email: "" };

/** Rang 41 (D336) — l'IDENTIFIANT de l'étape Contact, la PREMIÈRE : le numéro (chiffres nationaux) et/ou l'e-mail — au moins l'un des deux (K-1, K-2). */
export type Identifiant = { phone: string; email: string };
export const NO_IDENTIFIANT: Identifiant = { phone: "", email: "" };

/** Rang 41 (D336) — les NOMS de l'étape Client, un par écriture : au moins l'un des deux (DB-3). Ce sont ceux du DEVIS (K-4) ; la fiche ne les reçoit qu'à sa création (K-2). */
export type Noms = { ar: string; latin: string };
export const NO_NOMS: Noms = { ar: "", latin: "" };

/** Ce qui retient le client à une étape : une CLÉ de catalogue (`venue.ui.walkin.<clé>`), jamais une phrase. */
export type Blocker =
  | "needFirstName"
  | "needFirstNameValid"
  | "needLastName"
  | "needLastNameValid"
  | "needPhoneLeading"
  | "needPhoneIncomplete"
  | "needGuests"
  | "needEmailValid"
  | "needIdentifier"
  | "needName"
  | "needNameArValid"
  | "needNameLatinValid";

/** Le premier chiffre du téléphone est-il refusé par le modèle de pays ? */
export function phoneLeadingRejected(digits: string, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): boolean {
  return digits !== "" && !PHONE_COUNTRIES[country].leadingDigits.includes(digits.charAt(0));
}

/**
 * Ce qui empêche de CONCLURE : le contact seul (D135 — le nombre d'invités n'est pas du contact). ⛔ L36-1 (D337) : UN NUMÉRO OU UN E-MAIL, au moins l'un des deux (Q2 de
 * Ko) — `hasContactChannel`, la MÊME fonction que `quoteConvertSchema` applique ; l'écran refuse donc ce que le serveur refuse. Ce qui est SAISI doit rester valide, même
 * quand l'autre champ l'est : un numéro incomplet ou un e-mail à moitié tapé retient (règle de l'étape Contact, `identifierBlockers`). Vide, l'autre ne retient rien.
 */
export function contactBlockers(contact: Contact, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): Blocker[] {
  const out: Blocker[] = [];
  const firstName = contact.firstName.trim();
  const lastName = contact.lastName.trim();
  if (firstName === "") out.push("needFirstName");
  else if (!isValidPersonName(firstName)) out.push("needFirstNameValid");
  if (lastName === "") out.push("needLastName");
  else if (!isValidPersonName(lastName)) out.push("needLastNameValid");
  if (!hasContactChannel(contact.phone, contact.email)) out.push("needIdentifier");
  else if (contact.phone !== "") {
    if (phoneLeadingRejected(contact.phone, country)) out.push("needPhoneLeading");
    else if (!isPhoneComplete(country, contact.phone)) out.push("needPhoneIncomplete");
  }
  if (contact.email.trim() !== "" && !isValidContactEmail(contact.email)) out.push("needEmailValid");
  return out;
}

/**
 * Ce qui empêche de CONTINUER après l'étape Client : un nom au moins, dans l'une OU l'autre écriture (DB-3), chaque nom SAISI passant la règle du
 * contrat ; puis le nombre d'invités (il chiffre les prestations). ⛔ Rang 41 (D336) : le contact n'est plus ici — c'est l'étape d'AVANT
 * (`identifierBlockers`), et celui de la conclusion se juge à part (`contactBlockers`).
 */
export function clientBlockers(noms: Noms, guests: string): Blocker[] {
  const out: Blocker[] = [];
  const ar = noms.ar.trim();
  const latin = noms.latin.trim();
  if (ar === "" && latin === "") out.push("needName");
  if (ar !== "" && !isValidPersonName(ar)) out.push("needNameArValid");
  if (latin !== "" && !isValidPersonName(latin)) out.push("needNameLatinValid");
  if (!(Number(guests) > 0)) out.push("needGuests");
  return out;
}

/**
 * ⛔ Rang 41 (D336) — ce qui empêche de CONTINUER après l'étape Contact : RIEN de tapé (un numéro OU un e-mail est obligatoire) ; un numéro saisi
 * dont le premier chiffre est refusé ou qui est incomplet ; un e-mail saisi que le contrat refuse. Un identifiant saisi et invalide retient même
 * quand l'autre est bon : on ne cherche pas une fiche sur une saisie à moitié fausse.
 */
export function identifierBlockers(identifiant: Identifiant, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): Blocker[] {
  if (identifiant.phone === "" && identifiant.email.trim() === "") return ["needIdentifier"];
  const out: Blocker[] = [];
  if (identifiant.phone !== "") {
    if (phoneLeadingRejected(identifiant.phone, country)) out.push("needPhoneLeading");
    else if (!isPhoneComplete(country, identifiant.phone)) out.push("needPhoneIncomplete");
  }
  if (identifiant.email.trim() !== "" && !isValidContactEmail(identifiant.email)) out.push("needEmailValid");
  return out;
}

/** Rang 41 (D336) — l'erreur à AFFICHER sous l'e-mail de l'étape Contact : seulement une adresse SAISIE et refusée (même règle que `fieldErrors`). */
export function identifierFieldErrors(identifiant: Identifiant): { email: boolean } {
  return { email: identifiant.email.trim() !== "" && !isValidContactEmail(identifiant.email) };
}

/**
 * Rang 41 (D336) — l'identifiant tel que la CRÉATION de la fiche le reçoit (K-2) : le numéro au format du contrat (l'indicatif + les chiffres
 * saisis), l'e-mail rogné, et la CLÉ ABSENTE d'un identifiant vide (le contrat refuserait la chaîne vide).
 */
export function identifierPayload(identifiant: Identifiant, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): { phone?: string; email?: string } {
  const email = identifiant.email.trim();
  return {
    ...(identifiant.phone === "" ? {} : { phone: toE164(country, identifiant.phone) }),
    ...(email === "" ? {} : { email })
  };
}

/** Rang 41 (D336) — les erreurs à AFFICHER sous les deux noms : seulement un nom SAISI et refusé. */
export function nameFieldErrors(noms: Noms): { ar: boolean; latin: boolean } {
  return {
    ar: noms.ar.trim() !== "" && !isValidPersonName(noms.ar),
    latin: noms.latin.trim() !== "" && !isValidPersonName(noms.latin)
  };
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
 * CLÉ ABSENTE s'il est vide (D135 : `.email()` refuserait la chaîne vide). ⛔ L36-1 (D337) : la clé du NUMÉRO est absente, elle aussi, quand le numéro est vide
 * (`dzPhoneSchema` refuse `""`, et « +213 » seul n'est pas un numéro) — une conversion par e-mail seul n'envoie pas de numéro.
 */
export function contactPayload(contact: Contact, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY) {
  return {
    contactFirstName: contact.firstName.trim(),
    contactLastName: contact.lastName.trim(),
    ...(contact.phone === "" ? {} : { contactPhone: toE164(country, contact.phone) }),
    ...(contact.email.trim() === "" ? {} : { contactEmail: contact.email.trim() })
  };
}
