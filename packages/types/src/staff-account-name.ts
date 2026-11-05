// La CLÉ D'UNICITÉ du nom de compte du personnel — rang 44, L36-3a-1 (D341, MP-9, S-110 + R-4 (D341)).
//
// ⛔ UNE FONCTION, PARTAGÉE (D147) : l'écran, le serveur et la base disent le même « même nom ». `normalizeStaffAccountName` fabrique `account_name_key`, sur laquelle porte
// `UNIQUE (pro_profile_id, account_name_key)` : deux noms qui s'affichent pareil ne doivent pas faire deux comptes (R-4 (D341)). Le nom AFFICHÉ (`account_name`) est celui que la personne a tapé, rogné.
//
// Dans l'ordre, et l'ordre compte :
//   1. NFKC (pleine chasse, ligatures, blancs spéciaux, présentations arabes) ;
//   2. retrait des caractères INVISIBLES — U+200B à U+200F, U+202A à U+202E, U+2066 à U+2069, U+FEFF (R-4) : NFKC ne les ramène pas (mesuré par la lecture adverse de D341, rejouée par un test) ;
//      AVANT les blancs, car U+FEFF vaut un blanc pour `\s` : le retirer APRÈS le comprimerait en espace au lieu de le faire disparaître ;
//   3. minuscules (`toLowerCase`, jamais `toLocaleLowerCase` : la clé ne dépend PAS de la locale du moteur, D48) ;
//   4. retrait des diacritiques LATINS (NFD puis U+0300–U+036F), puis NFC : la décomposition d'une lettre arabe (أ = ا + hamza) est RECOMPOSÉE avant l'étape 6 ;
//   5. retrait des voyelles brèves (U+064B–U+065F, U+0670) et du tatweel (U+0640) arabes ;
//   6. lettres arabes ramenées l'une à l'autre : أ إ آ ٱ → ا ; ى → ي ; ة → ه ; et, par R-4, ؤ → و, ئ → ي, ک → ك, ی → ي ;
//   7. chiffres arabes-indiens (U+0660–U+0669) et persans (U+06F0–U+06F9) → 0–9 (R-4) : NFKC ne les ramène pas ;
//   8. blancs comprimés en un espace, bords rognés.
// La fonction est IDEMPOTENTE (test) : normaliser une clé ne la change pas. ⚠ `packages/types` compile avec `lib: ["ES2022"]` SEULE : rien ici n'emploie un global DOM ou Node.

const INVISIBLES = /[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}\u{FEFF}]/gu;
const DIACRITIQUES_LATINS = /[\u{0300}-\u{036F}]/gu;
const VOYELLES_BREVES_ET_TATWEEL = /[\u{064B}-\u{065F}\u{0670}\u{0640}]/gu;
const LETTRES_ARABES_RAMENEES = /[\u{0623}\u{0625}\u{0622}\u{0671}\u{0649}\u{0629}\u{0624}\u{0626}\u{06A9}\u{06CC}]/gu;
const CHIFFRES_NON_ASCII = /[\u{0660}-\u{0669}\u{06F0}-\u{06F9}]/gu;

const LETTRE_RAMENEE: Readonly<Record<string, string>> = {
  "أ": "ا", // أ → ا
  "إ": "ا", // إ → ا
  "آ": "ا", // آ → ا
  "ٱ": "ا", // ٱ → ا
  "ى": "ي", // ى → ي
  "ة": "ه", // ة → ه
  "ؤ": "و", // ؤ → و (R-4)
  "ئ": "ي", // ئ → ي (R-4)
  "ک": "ك", // ک → ك (R-4)
  "ی": "ي" //  ی → ي (R-4)
};

/** Un chiffre arabe-indien (U+0660 + n) ou persan (U+06F0 + n) → son chiffre ASCII. */
function chiffreAscii(c: string): string {
  const point = c.charCodeAt(0);
  return String.fromCharCode(48 + (point >= 0x06f0 ? point - 0x06f0 : point - 0x0660));
}

export function normalizeStaffAccountName(raw: string): string {
  let s = raw.normalize("NFKC");
  s = s.replace(INVISIBLES, "");
  s = s.toLowerCase();
  s = s.normalize("NFD").replace(DIACRITIQUES_LATINS, "").normalize("NFC");
  s = s.replace(VOYELLES_BREVES_ET_TATWEEL, "");
  s = s.replace(LETTRES_ARABES_RAMENEES, (c) => LETTRE_RAMENEE[c] ?? c);
  s = s.replace(CHIFFRES_NON_ASCII, chiffreAscii);
  return s.replace(/\s+/gu, " ").trim();
}
