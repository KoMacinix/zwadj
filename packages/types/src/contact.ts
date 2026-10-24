// Le CONTACT d'une demande ou d'un devis — nom, prénom, e-mail. UNE SEULE AUTORITÉ (rang 32, D325).
//
// Pourquoi ce fichier existe. Les règles du nom et de l'e-mail du client vivaient chacune dans le
// schéma de la route qui les reçoit (`bookingCreateSchema`, `quoteConvertSchema`), recopiées
// presque à l'identique — et l'écran du Pro, lui, n'en appliquait AUCUNE : un nom « Amina123 » ou
// un e-mail à moitié tapé ne se refusait qu'au `400` du serveur, à la conclusion du devis. Une
// règle de validation vit UNE fois, dans le contrat, et le front l'IMPORTE (D147) : le serveur
// refuse alors exactement ce que l'écran refuse, parce que c'est la même fonction.
//
// ⚠ Ce fichier ne contient AUCUNE règle de téléphone : elle est dans `./phone`, et `dzPhoneSchema`
// (`./auth`) la porte. ⚠ `lib: ["ES2022"]` SEULE : aucun global DOM ni Node ici.
import { z } from "zod";

/** Plafond d'un nom ou d'un prénom — celui que les deux routes appliquaient déjà. */
export const PERSON_NAME_MAX = 80;
/** Plafond d'un e-mail de contact — celui que les deux routes appliquaient déjà. */
export const CONTACT_EMAIL_MAX = 180;

/**
 * Un nom de personne : des LETTRES de toute écriture (le français accentué ET l'arabe), leurs marques
 * combinantes (les voyelles brèves de l'arabe, un accent décomposé), des espaces, le tiret « - » et
 * l'apostrophe (droite « ' » ou typographique « ’ »). **Aucun chiffre, aucun autre symbole.**
 *
 * Il COMMENCE par une lettre : « -- » ou « ' » ne sont pas un nom. L'unicode (`\p{L}`, `\p{M}`) plutôt
 * qu'un `[a-zA-Z]` : l'arabe n'y passerait pas, et « Éloïse » non plus.
 */
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u;

export function isValidPersonName(raw: string): boolean {
  return PERSON_NAME_PATTERN.test(raw.trim());
}

export interface PersonNameMessages {
  required: string;
  tooLong: string;
  invalid: string;
}

/**
 * Le schéma d'un nom ou d'un prénom. Les messages sont des CLÉS de catalogue, propres à la route qui
 * l'emploie (`booking.validation.*`, `quote.validation.*`) : la règle est partagée, pas les phrases.
 *
 * ⚠ La règle du motif ne se déclenche PAS sur une chaîne vide : « obligatoire » et « invalide » ne se
 * disent pas ensemble d'un champ simplement resté vide.
 */
export function personNameSchema(messages: PersonNameMessages) {
  return z
    .string()
    .trim()
    .min(1, messages.required)
    .max(PERSON_NAME_MAX, messages.tooLong)
    .refine((valeur) => valeur === "" || PERSON_NAME_PATTERN.test(valeur), messages.invalid);
}

export interface ContactEmailMessages {
  invalid: string;
  tooLong?: string;
}

/**
 * Le schéma de l'e-mail de contact : `.email()` de Zod — **aucune expression régulière de plus** —, rogné,
 * 180 caractères au plus. FACULTATIF à l'appelant de le rendre `.optional()` (D135 : le client au comptoir
 * n'en a souvent pas).
 */
export function contactEmailSchema(messages: ContactEmailMessages) {
  return z
    .string()
    .trim()
    .email(messages.invalid)
    .max(CONTACT_EMAIL_MAX, messages.tooLong ?? messages.invalid);
}

const contactEmailProbe = contactEmailSchema({ invalid: "invalid", tooLong: "tooLong" });

/** L'e-mail passe-t-il la règle du contrat ? C'est le MÊME schéma que les routes — pas une seconde règle. */
export function isValidContactEmail(raw: string): boolean {
  return contactEmailProbe.safeParse(raw).success;
}

/**
 * L'e-mail d'une FICHE CLIENT, normalisé — rang 41 (D336, S-55) : rogné, NFKC, minuscules. UNE fonction, que le contrat de la fiche applique à la recherche (K-1),
 * à la création (K-2) et à la modification (K-3b) : « Amina@Mail.DZ », « amina@mail.dz » et la même adresse en caractères pleine chasse désignent UNE fiche, et
 * l'unicité `(pro, e-mail)` de la base ne voit qu'une forme (MD-3).
 *
 * ⚠ NFKC AVANT les minuscules : la pleine chasse (« ＡＭＩＮＡ ») et les lettres décomposées se ramènent d'abord à leurs caractères ordinaires, puis la casse se
 * replie. ⚠ Aucun `CHECK` de forme n'est posé en base (S-55, non ratifié) : la forme vient du contrat, qui est le seul chemin d'écriture.
 */
export function normalizeContactEmail(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}

/**
 * ⛔ L36-1 (D337) — « UN NUMÉRO OU UNE ADRESSE E-MAIL » : l'UNIQUE définition de « on peut joindre ce client ».
 *
 * Q2 de Ko (22/10/2026) : « Une réservation est tout à fait possible avec une adresse e-mail uniquement. Le numéro de téléphone reste optionnel. » `bookings.contact_phone`
 * est facultatif en base, gardé par `CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)` ; la règle d'ici est la MÊME, côté contrat : les deux schémas de route
 * (`bookingCreateSchema`, `quoteConvertSchema`), le formulaire en ligne du client et l'écran de conversion du pro l'IMPORTENT (D147) — l'écran refuse ce que le serveur
 * refuse, parce que c'est la même fonction.
 *
 * ⚠ Elle juge la PRÉSENCE, jamais la validité : un numéro saisi doit encore passer `dzPhoneSchema`, un e-mail saisi `contactEmailSchema` — l'un ne « rachète » pas l'autre.
 * ⚠ Une chaîne vide ou blanche vaut « absent » ICI (c'est ce que tape un formulaire), mais le CONTRAT refuse `""` à l'API : « facultatif » y veut dire CLÉ OMISE.
 */
export function hasContactChannel(phone: string | null | undefined, email: string | null | undefined): boolean {
  return estRenseigne(phone) || estRenseigne(email);
}

/**
 * Une valeur est-elle RENSEIGNÉE ? `null`, `undefined`, une chaîne vide ou blanche : non. ⚠ Toute AUTRE valeur : oui — y compris celle qu'un schéma a déjà refusée
 * (`z.NEVER`, que `dzPhoneSchema` rend d'un numéro invalide et sur laquelle Zod exécute quand même le `superRefine` de l'objet) : un numéro SAISI et invalide a déjà son
 * message, il n'y a pas lieu d'y ajouter « indiquez un numéro ou un e-mail ».
 */
function estRenseigne(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined) return false;
  return typeof valeur === "string" ? valeur.trim() !== "" : true;
}

/**
 * Le moyen de joindre le client À AFFICHER ou à citer : le numéro d'abord (le pro rappelle), à défaut l'e-mail, sinon `null` — jamais le mot « null », jamais un trou
 * (le patron que la VISITE applique déjà : `contactPhone ?? client.email`). Une seule fonction pour la liste du pro et la notification.
 */
export function reachableContact(phone: string | null | undefined, email: string | null | undefined): string | null {
  const numero = (phone ?? "").trim();
  if (numero !== "") return numero;
  const adresse = (email ?? "").trim();
  return adresse !== "" ? adresse : null;
}
