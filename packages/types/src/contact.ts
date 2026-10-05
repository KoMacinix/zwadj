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
