// Téléphone algérien — UNE SEULE AUTORITÉ, sur le modèle de `roundToDinar`.
//
// Pourquoi ce fichier existe (Lot R3). Le dédoublonnage du portefeuille client
// s'appuiera sur `(venueId, phone)` : deux écritures du MÊME numéro qui ne
// donnent pas la même chaîne produisent deux fiches pour une seule personne, et
// le pro ressaisit tout à chaque visite. Une normalisation recopiée dans le
// Pro, le Client et l'API, c'est trois vérités — donc, tôt ou tard, trois
// résultats. Elle vit ici, dans le paquet que les trois consomment déjà.
//
// ⚠ MOBILE UNIQUEMENT (décision produit). Les fixes sont écartés : `+213` suivi
// de 8 chiffres (Alger `021`, Oran `041`…) ne passe plus. Ce n'est pas un
// durcissement gratuit — `ProProfile.phone` est la DESTINATION WhatsApp des
// notifications (D60), et WhatsApp n'existe pas sur un fixe. Un pro inscrit
// avec un fixe ne recevait rien, sans la moindre erreur nulle part.

/**
 * Forme canonique : `+213` puis 9 chiffres commençant par 5, 6 ou 7.
 *
 * Les trois opérateurs mobiles algériens : 05 Ooredoo, 06 Mobilis, 07 Djezzy.
 *
 * ⚠ `[5-7]` PLUTÔT QUE `\d` — arbitrage à connaître. Neuf chiffres suffiraient
 * à exclure les fixes (qui en ont 8), et `[5-7]` attrape en plus les fautes de
 * frappe. Le prix : si un nouveau préfixe mobile s'ouvre, cette classe le
 * rejettera. C'est un caractère à changer ici, et un seul.
 */
export const DZ_MOBILE_E164 = /^\+213[5-7]\d{8}$/;

/** Les neuf chiffres nationaux, une fois tout préfixe retiré. */
const NATIONAL = /^[5-7]\d{8}$/;

/**
 * Ramène une saisie humaine à la forme E.164, ou `null` si ce n'est pas un
 * mobile algérien.
 *
 * ⚠ RETOURNE `null`, NE LÈVE PAS ET NE DEVINE PAS. Un numéro qu'on ne sait pas
 * lire est un numéro qu'on ne connaît pas : le réparer au jugé ferait entrer en
 * base un contact qui ne répondra jamais, et l'appelant ne saurait pas que la
 * valeur a été inventée.
 *
 * Ce que la fonction accepte, écrit AVANT la règle (D55) — ce sont les formes
 * réellement tapées par quelqu'un, pas des cas de laboratoire :
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
export function normalizeDzPhone(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  // Tout ce qui n'est pas un chiffre est de la mise en forme : espaces, points,
  // tirets, parenthèses, espaces insécables. Le `+` disparaît aussi — les
  // préfixes sont reconnus sur les chiffres seuls, juste en dessous.
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;

  // ⚠ L'ORDRE DE CES TESTS EST LE CŒUR DE LA FONCTION. Retirer d'abord le zéro
  // initial casserait `00213555123456` : il deviendrait `0213555123456`, que
  // plus rien ne saurait lire. Les préfixes internationaux passent donc AVANT
  // le zéro national.
  //
  // Aucune ambiguïté entre eux : un mobile national commence par 5, 6 ou 7,
  // jamais par 0 ni par 2 — `213…` ne peut donc pas être un numéro local.
  let national = digits;
  if (national.startsWith("00213")) national = national.slice(5);
  else if (national.startsWith("213")) national = national.slice(3);
  if (national.startsWith("0")) national = national.slice(1);

  return NATIONAL.test(national) ? `+213${national}` : null;
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
