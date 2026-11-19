// LE MOT DE PASSE TEMPORAIRE — rang 56, L36-3a-2 (D354, R-5, DR5 « généré par défaut, 7 jours, changement obligatoire », S-109). Un module PUR : l'aléa lui est PASSÉ en paramètre (aucun `Math.random`, aucun port
// `Random` : S-109), il le consomme par ÉCHANTILLONNAGE AVEC REJET — sans quoi 31 symboles tirés modulo 256 favoriseraient les huit premiers (9 chances sur 256 au lieu de 8), un biais que rien ne verrait.
//
// ⛔ L'ALPHABET : 31 symboles sans les caractères qui se confondent à l'œil (0, O, 1, I, l) — un Manager dicte ce mot de passe à voix haute ou le lit sur un écran. Il contient des lettres ET des chiffres : le
// contrat `passwordSchema` en exige un de chaque, et un mot de passe que le contrat refuserait ne serait pas utilisable comme « mot de passe actuel » au changement.
// ⛔ Douze caractères = environ 59 bits : la fenêtre d'attaque est de sept jours et de cinq essais par pause de quinze minutes.
export const TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TEMPORARY_PASSWORD_LENGTH = 12;

const N = TEMPORARY_PASSWORD_ALPHABET.length;
/** Les octets ≥ ce seuil sont REJETÉS : 248 = 8 × 31, le plus grand multiple de 31 sous 256 — chaque symbole a exactement huit octets qui le donnent. */
const SEUIL_DE_REJET = Math.floor(256 / N) * N;

/**
 * Douze caractères tirés des octets fournis, DANS L'ORDRE, ou `null` quand ces octets ne suffisent pas à faire un mot de passe VALABLE : moins de douze octets acceptés, ou aucun chiffre, ou aucune lettre. Jamais
 * un mot de passe plus court ni refusé par le contrat — l'appelant tire d'autres octets.
 */
export function temporaryPasswordFrom(bytes: Uint8Array): string | null {
  let out = "";
  for (let i = 0; i < bytes.length && out.length < TEMPORARY_PASSWORD_LENGTH; i += 1) {
    const octet = bytes[i]!;
    if (octet >= SEUIL_DE_REJET) continue;
    out += TEMPORARY_PASSWORD_ALPHABET[octet % N];
  }
  if (out.length < TEMPORARY_PASSWORD_LENGTH) return null;
  if (!/[A-Z]/.test(out) || !/[2-9]/.test(out)) return null;
  return out;
}
