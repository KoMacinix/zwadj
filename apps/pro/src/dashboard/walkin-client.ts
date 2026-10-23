// La FICHE et le NOM du parcours « Nouvelle réservation » — leurs règles d'ÉCRAN, en fonctions PURES. Rang 41 (D336, L35-4 amendé).
//
// ── Pourquoi un module à part ───────────────────────────────────────────────
// Même raison que `walkin-contact.ts` (D187, D205) : une règle qui vit dans le composant ne se neutralise qu'à la cadence d'une suite de
// rendu ; ici elle se rejoue en millisecondes, sans DOM. Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md` (MD-9, MD-17).
//
// ⛔ AUCUNE DE CES RÈGLES N'EST STOCKÉE. Le découpage du nom (`decouperNom`) ne sert qu'à PRÉREMPLIR la conversion (K-12) : la base garde la
// copie entière du nom sur le devis, et le prénom et le nom que la conversion envoie sont ceux de l'ÉCRAN — préremplis, puis modifiables.
//
// ⚠ AUCUNE RÈGLE DU CONTRAT N'EST RECOPIÉE : le téléphone (`isPhoneComplete`, `toE164`, `nationalDigitsOf`), l'e-mail (`isValidContactEmail`)
// et la correspondance langue ↔ copie du nom (`QUOTE_CLIENT_NAME_FIELD`) viennent de `@zwadj/types`.
import {
  DEFAULT_PHONE_COUNTRY,
  QUOTE_CLIENT_NAME_FIELD,
  isPhoneComplete,
  isValidContactEmail,
  nationalDigitsOf,
  toE164,
  type ClientRecordDTO,
  type ClientRecordLookupInput,
  type PhoneCountryId,
  type QuoteDocumentLocale,
  type QuoteDTO
} from "@zwadj/types";
import type { Contact, Identifiant, Noms } from "./walkin-contact";

/** Les deux copies du nom qu'un devis porte (K-4) — `null` = pas de copie dans cette écriture. */
export type CopieDuDevis = Pick<QuoteDTO, "clientNameAr" | "clientNameLatin">;

/** Une copie absente ou vide ne compte pas : le contrat n'écrit jamais la chaîne vide, l'écran ne la prend pas pour un nom. */
function present(valeur: string | null): string | null {
  return valeur !== null && valeur.trim() !== "" ? valeur.trim() : null;
}

/**
 * ⛔ MD-9 (consigne v3, § 6 e) — le nom coupé au PREMIER espace : ce qui précède est le prénom, le reste est le nom. SANS espace, tout va dans le
 * nom et le prénom reste VIDE, à saisir : aucun prénom n'est inventé.
 * ⚠ Le défaut est ÉCRIT, pas corrigé : un prénom composé (« Abd El Kader ») ou un nom écrit avant le prénom tombe mal — le pro corrige les deux
 * champs à la main, ils restent modifiables avant l'envoi.
 */
export function decouperNom(nom: string): { firstName: string; lastName: string } {
  const propre = nom.trim();
  const espace = propre.indexOf(" ");
  if (espace === -1) return { firstName: "", lastName: propre };
  return { firstName: propre.slice(0, espace), lastName: propre.slice(espace + 1).trim() };
}

/** La copie de la LANGUE DE L'INTERFACE, à défaut l'autre ; sans aucune copie, rien (consigne v3, § 6 e). */
export function nomPourConversion(copie: CopieDuDevis, langue: QuoteDocumentLocale): string | null {
  const autre: QuoteDocumentLocale = langue === "ar" ? "fr" : "ar";
  return present(copie[QUOTE_CLIENT_NAME_FIELD[langue]]) ?? present(copie[QUOTE_CLIENT_NAME_FIELD[autre]]);
}

/**
 * ⛔ K-12 — le contact de la CONVERSION, PRÉREMPLI : prénom et nom découpés de la copie du devis ; le numéro et l'e-mail de la FICHE, à défaut
 * ceux tapés à l'étape Contact. Le numéro est rendu en chiffres NATIONAUX : c'est ce que le champ affiche après son indicatif, et `contactPayload`
 * l'y remet à l'envoi. ⛔ Rien n'est réécrit dans la fiche : une fiche SANS numéro laisse le champ vide, et le numéro est DEMANDÉ ici.
 */
export function prefillConversion({
  quote,
  fiche,
  saisie,
  langue,
  country = DEFAULT_PHONE_COUNTRY
}: {
  quote: CopieDuDevis;
  fiche: ClientRecordDTO | null;
  saisie: Identifiant;
  langue: QuoteDocumentLocale;
  country?: PhoneCountryId;
}): Contact {
  const nom = nomPourConversion(quote, langue);
  const { firstName, lastName } = nom === null ? { firstName: "", lastName: "" } : decouperNom(nom);
  const telephoneDeLaFiche = fiche?.phone ? nationalDigitsOf(country, fiche.phone) : "";
  return {
    firstName,
    lastName,
    phone: telephoneDeLaFiche !== "" ? telephoneDeLaFiche : saisie.phone,
    email: fiche?.email ?? saisie.email.trim()
  };
}

/**
 * ⛔ S-57 — l'ordre de la recherche (K-1) : d'abord le NUMÉRO, puis l'E-MAIL ; l'écran s'arrête à la première fiche trouvée. Un identifiant
 * incomplet ou invalide n'est pas cherché. L'e-mail part rogné, sans autre retouche : le contrat le normalise (S-55).
 */
export function ordreDeRecherche(identifiant: Identifiant, country: PhoneCountryId = DEFAULT_PHONE_COUNTRY): ClientRecordLookupInput[] {
  const ordre: ClientRecordLookupInput[] = [];
  if (isPhoneComplete(country, identifiant.phone)) ordre.push({ phone: toE164(country, identifiant.phone) });
  const email = identifiant.email.trim();
  if (email !== "" && isValidContactEmail(email)) ordre.push({ email });
  return ordre;
}

/** La copie du nom dans la langue DU DOCUMENT manque-t-elle ? Alors la boîte de langue la DEMANDE avant de remettre (K-5). */
export function nomManquant(devis: CopieDuDevis, locale: QuoteDocumentLocale): boolean {
  return present(devis[QUOTE_CLIENT_NAME_FIELD[locale]]) === null;
}

/** K-4 — ce que le devis reçoit : la fiche, et les noms NON VIDES de l'écran, rognés. Un nom vide n'est pas envoyé (le contrat refuserait la chaîne vide). */
export function copiePourDevis(noms: Noms, ficheId: string): { clientRecordId: string; clientNameAr?: string; clientNameLatin?: string } {
  const ar = noms.ar.trim();
  const latin = noms.latin.trim();
  return { clientRecordId: ficheId, ...(ar === "" ? {} : { clientNameAr: ar }), ...(latin === "" ? {} : { clientNameLatin: latin }) };
}

/** K-2 — les noms que la fiche reçoit à sa CRÉATION : non vides, rognés, la clé absente d'un nom vide. */
export function nomsPourFiche(noms: Noms): { nameAr?: string; nameLatin?: string } {
  const ar = noms.ar.trim();
  const latin = noms.latin.trim();
  return { ...(ar === "" ? {} : { nameAr: ar }), ...(latin === "" ? {} : { nameLatin: latin }) };
}

/** Les noms qu'une fiche apporte à l'écran : ceux qui PRÉREMPLISSENT le devis quand elle est trouvée, ceux qui s'IMPOSENT quand elle est liée (MD-6). */
export function nomsDeLaFiche(fiche: ClientRecordDTO): Noms {
  return { ar: fiche.nameAr ?? "", latin: fiche.nameLatin ?? "" };
}
