// Téléphone — UNE SEULE AUTORITÉ, sur le modèle de `roundToDinar`.
//
// Pourquoi ce fichier existe (Lot R3). Le dédoublonnage du portefeuille client
// s'appuiera sur `(venueId, phone)` : deux écritures du MÊME numéro qui ne
// donnent pas la même chaîne produisent deux fiches pour une seule personne, et
// le pro ressaisit tout à chaque visite. Une normalisation recopiée dans le
// Pro, le Client et l'API, c'est trois vérités — donc, tôt ou tard, trois
// résultats. Elle vit ici, dans le paquet que les trois consomment déjà.
//
// ⚠ MOBILE UNIQUEMENT (décision produit, confirmée par Ko le 04/10/2026, rang 32).
// Les fixes sont écartés : `+213` suivi de 8 chiffres (Alger `021`, Oran
// `041`…) ne passe plus. Ce n'est pas un durcissement gratuit —
// `ProProfile.phone` est la DESTINATION WhatsApp des notifications (D60), et
// WhatsApp n'existe pas sur un fixe. Un pro inscrit avec un fixe ne recevait
// rien, sans la moindre erreur nulle part.
//
// ── Le MODÈLE DE PAYS (rang 32, D325) ───────────────────────────────────────
// La règle « mobile, +213, 9 chiffres, premier chiffre 5, 6 ou 7 » était écrite
// en dur dans ce fichier sous forme d'expressions, et le champ de saisie de
// chaque écran en recopiait des morceaux (« +213 » tapé à la main, « 8 à 9
// chiffres » dans un message). Elle est désormais UNE donnée par pays,
// `PHONE_COUNTRIES`, dont TOUT ce qui suit — la normalisation, le schéma Zod, la
// règle de saisie des champs — se DÉRIVE. Ajouter un pays, c'est ajouter UNE
// entrée ici ; le compilateur exige alors son drapeau (`PHONE_COUNTRY_FLAGS` de
// `@zwadj/ui`, un `Record<PhoneCountryId, …>`), et le catalogue son nom et son
// gabarit (`common.phone.*`, gardé par un test qui énumère ce modèle).
//
// ⚠ `lib: ["ES2022"]` SEULE dans ce paquet : aucun global DOM ni Node ici.

/** Identifiant d'un pays dont on accepte les numéros. UNE entrée aujourd'hui. */
export type PhoneCountryId = "DZ";

export interface PhoneCountry {
  readonly id: PhoneCountryId;
  /** Indicatif international, avec son « + » — jamais recopié dans un composant. */
  readonly dialCode: string;
  /** Nombre de chiffres NATIONAUX d'un mobile, sans le zéro de ligne nationale. */
  readonly nationalLength: number;
  /** Premiers chiffres admis : chaque caractère de cette chaîne en est un. Algérie : 05 Ooredoo, 06 Mobilis, 07 Djezzy. */
  readonly leadingDigits: string;
  /** Préfixe que l'on tape devant le numéro national (« 0555… ») et qui disparaît à la normalisation. */
  readonly trunkPrefix: string;
}

/**
 * Les pays acceptés. ⚠ `[5-7]` PLUTÔT QUE `\d` — arbitrage à connaître. Neuf chiffres suffiraient à exclure les
 * fixes (qui en ont 8), et restreindre le premier chiffre attrape en plus les fautes de frappe. Le prix : si un nouveau
 * préfixe mobile s'ouvre, `leadingDigits` le rejettera. C'est un caractère à changer ici, et un seul.
 */
export const PHONE_COUNTRIES = {
  DZ: { id: "DZ", dialCode: "+213", nationalLength: 9, leadingDigits: "567", trunkPrefix: "0" }
} as const satisfies Record<PhoneCountryId, PhoneCountry>;

/** Le pays par défaut d'un champ de saisie : l'Algérie. */
export const DEFAULT_PHONE_COUNTRY: PhoneCountryId = "DZ";

/** Les identifiants, dans l'ordre du modèle. */
export const PHONE_COUNTRY_IDS = Object.keys(PHONE_COUNTRIES) as PhoneCountryId[];

export function phoneCountry(id: PhoneCountryId = DEFAULT_PHONE_COUNTRY): PhoneCountry {
  return PHONE_COUNTRIES[id];
}

/** L'indicatif sans son « + » : `213`. */
const dialDigits = (country: PhoneCountry): string => country.dialCode.replace(/\D/g, "");

/** Les chiffres nationaux d'un mobile, une fois tout préfixe retiré. DÉRIVÉ du modèle. */
function nationalPattern(country: PhoneCountry): RegExp {
  return new RegExp(`^[${country.leadingDigits}]\\d{${country.nationalLength - 1}}$`);
}

/**
 * Forme canonique d'un mobile algérien : `+213` puis 9 chiffres commençant par 5, 6 ou 7.
 *
 * Les trois opérateurs mobiles algériens : 05 Ooredoo, 06 Mobilis, 07 Djezzy. DÉRIVÉE du modèle de pays.
 */
export const DZ_MOBILE_E164 = new RegExp(
  `^\\+${dialDigits(PHONE_COUNTRIES.DZ)}[${PHONE_COUNTRIES.DZ.leadingDigits}]\\d{${PHONE_COUNTRIES.DZ.nationalLength - 1}}$`
);

/**
 * Ramène une saisie humaine à la forme E.164 d'un pays, ou `null` si ce n'est pas un mobile de ce pays.
 *
 * ⚠ RETOURNE `null`, NE LÈVE PAS ET NE DEVINE PAS. Un numéro qu'on ne sait pas
 * lire est un numéro qu'on ne connaît pas : le réparer au jugé ferait entrer en
 * base un contact qui ne répondra jamais, et l'appelant ne saurait pas que la
 * valeur a été inventée.
 *
 * Ce que la fonction accepte, écrit AVANT la règle (D55) — ce sont les formes
 * réellement tapées par quelqu'un, pas des cas de laboratoire (exemples algériens) :
 *
 *   0555123456        comme on le tape sur un clavier de téléphone
 *   05 55 12 34 56    comme on l'écrit sur une carte de visite
 *   0555-12-34-56     tirets, points, parenthèses : indifférents
 *   555123456         sans le zéro, quand on sait que l'indicatif le remplace
 *   +213555123456     déjà canonique — l'existant en base et l'API actuelle
 *   00213555123456    préfixe international composé à l'ancienne
 *   213555123456      le même, sans le `+`
 *
 * Et ce qu'elle refuse, tout aussi délibérément :
 *
 *   021234567         fixe d'Alger — décision produit, mobile uniquement
 *   0455123456        préfixe 4 : aucun opérateur mobile
 *   055512345         huit chiffres après le zéro : il en manque un
 *   +33612345678      indicatif étranger
 */
export function normalizePhone(id: PhoneCountryId, raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const country = PHONE_COUNTRIES[id];

  // Tout ce qui n'est pas un chiffre est de la mise en forme : espaces, points,
  // tirets, parenthèses, espaces insécables. Le `+` disparaît aussi — les
  // préfixes sont reconnus sur les chiffres seuls, juste en dessous.
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;

  const national = stripPhonePrefixes(country, digits);
  return nationalPattern(country).test(national) ? `${country.dialCode}${national}` : null;
}

/**
 * ⚠ L'ORDRE DE CES TESTS EST LE CŒUR DE LA FONCTION. Retirer d'abord le zéro
 * initial casserait `00213555123456` : il deviendrait `0213555123456`, que
 * plus rien ne saurait lire. Les préfixes internationaux passent donc AVANT le
 * zéro national.
 *
 * Aucune ambiguïté entre eux : un mobile national commence par un chiffre de
 * `leadingDigits`, jamais par le zéro de ligne nationale ni par l'indicatif —
 * `213…` ne peut donc pas être un numéro local.
 */
function stripPhonePrefixes(country: PhoneCountry, digits: string): string {
  const dial = dialDigits(country);
  let national = digits;
  if (national.startsWith(`00${dial}`)) national = national.slice(2 + dial.length);
  else if (national.startsWith(dial)) national = national.slice(dial.length);
  if (national.startsWith(country.trunkPrefix)) national = national.slice(country.trunkPrefix.length);
  return national;
}

/** L'Algérie, par son nom historique : tout appelant existant (`dzPhoneSchema`, l'API) garde sa signature. */
export function normalizeDzPhone(raw: string | null | undefined): string | null {
  return normalizePhone("DZ", raw);
}

/**
 * Le numéro est-il déjà sous forme canonique ?
 *
 * Utile là où une valeur vient de la base plutôt que d'une saisie : on veut
 * savoir si elle est conforme, pas la réparer silencieusement.
 */
export function isDzPhoneE164(value: string): boolean {
  return DZ_MOBILE_E164.test(value);
}

// ── La règle de SAISIE d'un champ (rang 32, D325) ───────────────────────────
// Le contrat valide un numéro COMPLET, à l'envoi. Un champ, lui, voit un numéro se TAPER : il lui faut
// une règle sur les états intermédiaires. Elle est écrite ici, UNE fois, pour que les neuf champs du produit
// ne l'inventent pas chacun — et qu'un test rejoue le cas qu'elle doit accepter (le collage d'un numéro
// complet, D55) avant ceux qu'elle doit refuser.

export interface PhoneInputState {
  /** Les chiffres NATIONAUX, sans indicatif ni zéro initial : ce que le champ affiche après son préfixe. */
  readonly digits: string;
  /** Le premier chiffre n'est pas un de `leadingDigits` : le champ le garde, SEUL, et dit pourquoi. */
  readonly leadingDigitRejected: boolean;
}

const leadingOk = (country: PhoneCountry, digit: string | undefined): boolean =>
  digit !== undefined && country.leadingDigits.includes(digit);

/**
 * Applique une saisie à un champ de téléphone. `previous` est la valeur AVANT la frappe, `raw` ce que le champ rapporte.
 *
 *  1. SEULS LES CHIFFRES PASSENT : lettres, symboles, espaces, `+` sont écartés.
 *  2. UN COLLAGE OU UN REMPLISSAGE AUTOMATIQUE ajoute plusieurs chiffres d'un coup : le préfixe international
 *     (`+213`, `00213`, `213`) et le zéro de ligne nationale sont alors reconnus et retirés, comme `normalizePhone` le fait.
 *     Une frappe, elle, n'est jamais réinterprétée : un `0` tapé en premier est un premier chiffre refusé.
 *  3. AU PLUS `nationalLength` chiffres.
 *  4. PREMIER CHIFFRE REFUSÉ : il reste affiché, SEUL, `leadingDigitRejected` vaut `true`, et la saisie SUIVANTE est BLOQUÉE —
 *     taper un chiffre de plus ne change rien tant que le premier n'est pas effacé ou remplacé.
 */
export function applyPhoneInput(id: PhoneCountryId, previous: string, raw: string): PhoneInputState {
  const country = PHONE_COUNTRIES[id];
  let digits = raw.replace(/\D/g, "");

  const multiple = digits.length - previous.length > 1 || (previous === "" && digits.length > 1);
  if (multiple) digits = stripPhonePrefixes(country, digits);
  digits = digits.slice(0, country.nationalLength);

  const previousRejected = previous !== "" && !leadingOk(country, previous[0]);
  if (previousRejected && digits.length > previous.length && digits.startsWith(previous)) {
    digits = previous;
  } else if (digits !== "" && !leadingOk(country, digits[0])) {
    digits = digits.slice(0, 1);
  }
  return { digits, leadingDigitRejected: digits !== "" && !leadingOk(country, digits[0]) };
}

/** Le numéro national est-il COMPLET et valide ? */
export function isPhoneComplete(id: PhoneCountryId, digits: string): boolean {
  return nationalPattern(PHONE_COUNTRIES[id]).test(digits);
}

/** Les chiffres nationaux d'une valeur déjà enregistrée (`+213555123456`), ou `""` si elle n'est pas un mobile de ce pays. */
export function nationalDigitsOf(id: PhoneCountryId, stored: string | null | undefined): string {
  const country = PHONE_COUNTRIES[id];
  const e164 = normalizePhone(id, stored);
  return e164 === null ? "" : e164.slice(country.dialCode.length);
}

/**
 * La valeur ENVOYÉE à l'API : `+213` suivi des chiffres nationaux. C'est la forme canonique que `dzPhoneSchema`
 * accepte et rend — le format attendu par le contrat n'a pas changé. Un champ vide reste vide : l'appelant décide
 * s'il l'omet ou le refuse.
 */
export function toE164(id: PhoneCountryId, digits: string): string {
  return digits === "" ? "" : `${PHONE_COUNTRIES[id].dialCode}${digits}`;
}
