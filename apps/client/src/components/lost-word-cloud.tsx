// NUAGE DE MOTS DE LA 404 — décor de fond, plein écran, SANS CHEVAUCHEMENT.
//
// ⚠⚠ TROIS CONTRAINTES COMMANDENT TOUT CE FICHIER.
//
// 1. « ALÉATOIRE » ET « RENDU SERVEUR » NE VONT PAS ENSEMBLE. Un `Math.random()`
//    à l'affichage donnerait un dessin au serveur et un AUTRE au navigateur :
//    React signalerait un écart d'hydratation et le nuage sauterait sous les
//    yeux du visiteur. Tout sort d'un générateur À GRAINE FIXE, évalué une fois
//    au chargement du module — pure fonction d'une constante, donc identique des
//    deux côtés. Le hasard est dans le RÉSULTAT, jamais dans l'exécution.
//    ⛔ NE PAS remplacer la graine par `Date.now()`. Le test « disposition
//    STABLE » est là pour ça.
//
// 2. AUCUN CHEVAUCHEMENT. Chaque mot réserve sa boîte ; un mot ne se pose que
//    sur une place libre. Les boîtes restent PARALLÈLES AUX AXES — d'où des mots
//    horizontaux ou tournés de 90°, jamais inclinés de 7° : une boîte oblique ne
//    se teste pas avec quatre comparaisons, et un test approximatif ne prouve
//    rien.
//
// 3. LE CENTRE EST INTERDIT. Le titre, la phrase et les deux boutons y vivent.
//    La zone est réservée AVANT le premier mot, comme un obstacle déjà posé —
//    pas retirée après coup, ce qui laisserait des trous ailleurs.
//
// ── ⚠ LE POINT DÉLICAT : LA LARGEUR D'UN MOT ───────────────────────────────
// Mesurer un glyphe demande un moteur de rendu. Il n'y en a pas au chargement
// d'un module, ni sur le serveur. La largeur est donc ESTIMÉE (nombre de
// caractères × chasse moyenne), ce qui serait une approximation — et une
// approximation ne garantit aucun non-chevauchement.
// D'où `textLength` sur chaque `<text>` : l'attribut IMPOSE au navigateur la
// largeur calculée. L'estimation cesse d'être une prédiction pour devenir une
// CONSIGNE, et la boîte réservée est exactement la boîte dessinée.
// ⛔ RETIRER `textLength` REMET LE CHEVAUCHEMENT, sans qu'aucun test ne bouge :
// les boîtes resteraient disjointes, seul le dessin ne les suivrait plus.

/** Le vocabulaire, apparié : chaque tournure en latin a son écriture arabe.
 *
 *  ⚠ SOURCE UNIQUE. `LATIN_LOST_WORDS` en est DÉRIVÉE, pas recopiée à côté :
 *  une seconde liste tenue à la main aurait divergé au premier ajout. */
export const LOST_WORDS = [
  { texte: "Wedderna el-cortege", lang: "fr" },
  { texte: "ضيّعنا الكورتيج", lang: "ar" },
  { texte: "Tlef el-khit", lang: "fr" },
  { texte: "تلف الخيط", lang: "ar" },
  { texte: "Khredjt 3la la-piste", lang: "fr" },
  { texte: "خرجت على البيست", lang: "ar" },
  { texte: "Khredjti 3la el-pista", lang: "fr" },
  { texte: "خرجتي على البيستا", lang: "ar" },
  { texte: "Tlef", lang: "fr" },
  { texte: "تلف", lang: "ar" },
  { texte: "Wedder", lang: "fr" },
  { texte: "ودّر", lang: "ar" },
  { texte: "Tbahr", lang: "fr" },
  { texte: "تبحّر", lang: "ar" },
  { texte: "Hayer", lang: "fr" },
  { texte: "حاير", lang: "ar" },
  { texte: "Ghlat", lang: "fr" },
  { texte: "غلط", lang: "ar" },
  { texte: "Tbahhar", lang: "fr" },
  { texte: "تلفتو الطريق", lang: "ar" },
  { texte: "Tleftou el-triq", lang: "fr" }
] as const;

export const LATIN_LOST_WORDS = LOST_WORDS.filter((m) => m.lang === "fr").map((m) => m.texte);
export const ARABIC_LOST_WORDS = LOST_WORDS.filter((m) => m.lang === "ar").map((m) => m.texte);

/** Chasse moyenne d'un caractère, en fraction du corps.
 *
 *  ⚠ CE NE SONT PAS DES MESURES, ce sont des CONSIGNES : `textLength` force le
 *  rendu à s'y conformer. Les baisser resserrerait les lettres, les monter les
 *  écarterait — dans les deux cas la mise en page resterait juste. */
const CHASSE = { fr: 0.54, ar: 0.5 } as const;

/** Hauteur d'une ligne, en fraction du corps — hampes hautes et basses
 *  comprises. L'arabe descend plus bas que le latin. */
const HAUTEUR_LIGNE = { fr: 1.0, ar: 1.25 } as const;

/** Marge autour de chaque boîte, en fraction du corps. Sans elle, deux mots
 *  « ne se chevauchent pas » tout en se touchant, ce qui se lit comme une
 *  collision. */
const MARGE = 0.16;

/** Paliers, du plus GRAND au plus petit. La taille est une fraction de la PLUS
 *  PETITE dimension du canevas ; le nombre croît quand le corps décroît, comme
 *  dans un nuage de mots classique.
 *
 *  ⚠ La plus petite dimension, et non la hauteur. Mesuré sur un canevas
 *  portrait de 420 × 900 : indexé sur la hauteur, le premier palier tombait à
 *  94 px pour 420 px de large — aucun mot un peu long n'entrait, le paquet se
 *  vidait en refus, et 13 mots seulement se posaient sur 56.
 *
 *  ⚠ Opacité CORRÉLÉE à la taille : plus un mot est grand, plus il est net.
 *  Décorréler les deux donnerait du bruit — un petit mot très net à côté d'un
 *  grand mot pâle ne se lit pas comme un arrière-plan. */
const PALIERS = [
  { part: 0.105, nombre: 3, opacite: 0.16 },
  { part: 0.075, nombre: 5, opacite: 0.13 },
  { part: 0.055, nombre: 9, opacite: 0.105 },
  { part: 0.04, nombre: 15, opacite: 0.085 },
  { part: 0.029, nombre: 24, opacite: 0.065 }
] as const;

export interface MotPlace {
  cle: string;
  texte: string;
  lang: string;
  x: number;
  y: number;
  taille: number;
  largeurImposee: number;
  opacite: number;
  vertical: boolean;
  accent: boolean;
}

interface Boite {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Deux rectangles se recouvrent-ils ? Quatre comparaisons, exactes — c'est ce
 *  que l'alignement sur les axes achète. */
export function chevauchent(a: Boite, b: Boite): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

/** Accès indexé SÛR — `noUncheckedIndexedAccess` est actif dans ce dépôt. Une
 *  assertion `!` ferait taire le compilateur et mentirait le jour où la liste
 *  serait vidée ; une erreur explicite dit ce qui s'est passé. */
function elementSur<T>(liste: readonly T[], index: number): T {
  const valeur = liste[((index % liste.length) + liste.length) % liste.length];
  if (valeur === undefined) throw new Error("nuage de mots : liste vide");
  return valeur;
}

/** Largeur imposée au rendu.
 *
 *  ⚠ Les signes diacritiques arabes (fatha, shadda, sukun…) ne consomment
 *  AUCUNE avance : les compter gonflerait la boîte et creuserait des vides
 *  autour des mots qui en portent. */
export function largeurDuMot(texte: string, lang: string, taille: number): number {
  const utiles = [...texte].filter((c) => !/[\u064B-\u0652\u0670]/.test(c)).length;
  return utiles * (lang === "ar" ? CHASSE.ar : CHASSE.fr) * taille;
}

/** Générateur pseudo-aléatoire à graine (mulberry32).
 *
 *  ⚠ Écrit ici plutôt qu'importé : il tient en cinq lignes et DOIT rester
 *  déterministe entre le serveur et le navigateur. Une dépendance qui
 *  changerait d'algorithme entre deux versions casserait l'hydratation sans
 *  rien signaler. */
function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OptionsNuage {
  largeur: number;
  hauteur: number;
  graine: number;
  /** Demi-largeur et demi-hauteur de la zone centrale interdite, en fraction du
   *  canevas. */
  videCentral: { largeur: number; hauteur: number };
}

/** Nombre de positions tentées avant d'abandonner un mot. Assez pour que les
 *  petits corps se glissent dans les interstices, assez peu pour que le calcul
 *  reste instantané au chargement du module. */
const ESSAIS = 500;

/**
 * Dispose le vocabulaire sur tout le canevas, sans un seul recouvrement.
 *
 * ⚠ EXPORTÉE POUR ÊTRE MESURÉE. « Ça ne se chevauche pas », « le centre est
 * libre », « les tailles varient », « c'est stable d'un rendu à l'autre » ne se
 * vérifient pas à l'œil sur une capture : ils se vérifient sur cette sortie.
 */
export function disposerNuage({ largeur, hauteur, graine, videCentral }: OptionsNuage): MotPlace[] {
  const hasard = generateur(graine);

  // ⚠ POSÉE AVANT LE PREMIER MOT. Réserver le centre après coup reviendrait à
  // retirer des mots déjà placés, donc à creuser des trous ailleurs que là où
  // on les veut.
  const interdit: Boite = {
    x1: largeur * (0.5 - videCentral.largeur / 2),
    x2: largeur * (0.5 + videCentral.largeur / 2),
    y1: hauteur * (0.5 - videCentral.hauteur / 2),
    y2: hauteur * (0.5 + videCentral.hauteur / 2)
  };
  const occupees: Boite[] = [interdit];

  // Paquets battus et distribués SANS REMISE : un tirage avec remise
  // échantillonne un vocabulaire, il ne le couvre pas — et rien à l'écran ne
  // dirait qu'il en manque.
  const paquet = (mots: readonly { texte: string; lang: string }[]) => {
    const restant = [...mots];
    for (let i = restant.length - 1; i > 0; i -= 1) {
      const j = Math.floor(hasard() * (i + 1));
      const garde = elementSur(restant, i);
      restant[i] = elementSur(restant, j);
      restant[j] = garde;
    }
    let curseur = 0;
    return () => elementSur(restant, curseur++);
  };
  const tirer = { fr: paquet(LOST_WORDS.filter((m) => m.lang === "fr")), ar: paquet(LOST_WORDS.filter((m) => m.lang === "ar")) };

  const places: MotPlace[] = [];
  let rang = 0;

  // ⚠ DU PLUS GRAND AU PLUS PETIT. L'inverse remplirait l'espace de miettes et
  // ne laisserait plus de place aux grands corps : c'est la règle des nuages de
  // mots, et elle n'a rien d'esthétique — c'est de l'empilement.
  for (const palier of PALIERS) {
    const taille = Math.round(Math.min(largeur, hauteur) * palier.part);
    for (let n = 0; n < palier.nombre; n += 1) {
      // L'écriture alterne, elle n'est pas tirée au sort : un tirage laisserait
      // parfois une moitié d'écran entièrement latine, alors que le mélange des
      // deux alphabets est justement l'effet recherché.
      const lang = rang % 2 === 0 ? "fr" : "ar";

      // Un mot trop long pour ce corps ne sera jamais posé : on prend le suivant
      // du paquet plutôt que d'échouer, jusqu'à en trouver un qui tienne.
      let mot = tirer[lang]();
      let largeurTexte = largeurDuMot(mot.texte, lang, taille);
      for (let saut = 0; saut < LOST_WORDS.length && largeurTexte > largeur * 0.94; saut += 1) {
        mot = tirer[lang]();
        largeurTexte = largeurDuMot(mot.texte, lang, taille);
      }
      if (largeurTexte > largeur * 0.94) continue;

      const hauteurTexte = taille * (lang === "ar" ? HAUTEUR_LIGNE.ar : HAUTEUR_LIGNE.fr);
      const marge = taille * MARGE;
      // ⚠ Verticalité réservée aux petits corps, et seulement si le mot tient
      // dans la hauteur : un long mot dressé sur un canevas paysage dépasserait
      // par le haut ET par le bas.
      const vertical =
        taille < Math.min(largeur, hauteur) * 0.06 && hasard() < 0.3 && largeurTexte + marge * 2 < hauteur * 0.94;
      const boiteLargeur = (vertical ? hauteurTexte : largeurTexte) + marge * 2;
      const boiteHauteur = (vertical ? largeurTexte : hauteurTexte) + marge * 2;

      let pose = false;
      for (let essai = 0; essai < ESSAIS && !pose; essai += 1) {
        // ⚠ ARRONDI AVANT LE TEST, pas après. Mesuré : en arrondissant à la
        // pose, deux boîtes exactement jointives se retrouvaient chevauchantes
        // d'un demi-pixel dans la sortie — le calcul disait « libre », le
        // dessin disait le contraire. On teste les coordonnées qu'on écrira.
        const cx = Math.round(boiteLargeur / 2 + hasard() * (largeur - boiteLargeur));
        const cy = Math.round(boiteHauteur / 2 + hasard() * (hauteur - boiteHauteur));
        const candidate: Boite = {
          x1: cx - boiteLargeur / 2,
          x2: cx + boiteLargeur / 2,
          y1: cy - boiteHauteur / 2,
          y2: cy + boiteHauteur / 2
        };
        if (occupees.some((b) => chevauchent(candidate, b))) continue;

        occupees.push(candidate);
        places.push({
          cle: `p${rang}`,
          texte: mot.texte,
          lang,
          x: cx,
          y: cy,
          taille,
          largeurImposee: Math.round(largeurTexte),
          opacite: palier.opacite,
          vertical,
          accent: hasard() < 0.22
        });
        pose = true;
      }
      rang += 1;
    }
  }
  return places;
}

/** ⚠ ÉVALUÉS AU CHARGEMENT DU MODULE : une fois par processus, et à l'identique
 *  des deux côtés puisque la graine est fixe.
 *
 *  ⚠ Le vide central est plus GRAND que le bloc de texte qu'il protège. Les
 *  canevas sont posés en `preserveAspectRatio="slice"` : ils sont rognés, donc
 *  la correspondance exacte entre unités du `viewBox` et pixels à l'écran n'est
 *  connue qu'au moment du rendu. Une réserve trop juste laisserait un mot passer
 *  sous un bouton sur certaines fenêtres — une réserve large ne coûte que du
 *  vide. */
export const NUAGE_LARGE = disposerNuage({
  largeur: 1200,
  hauteur: 800,
  graine: 20260824,
  videCentral: { largeur: 0.56, hauteur: 0.42 }
});
export const NUAGE_COMPACT = disposerNuage({
  largeur: 420,
  hauteur: 900,
  graine: 8300,
  videCentral: { largeur: 0.9, hauteur: 0.34 }
});

function Canevas({
  places,
  largeur,
  hauteur,
  variante
}: {
  places: MotPlace[];
  largeur: number;
  hauteur: number;
  variante: string;
}) {
  return (
    <svg
      className={`lost-word-cloud__svg lost-word-cloud__svg--${variante}`}
      viewBox={`0 0 ${largeur} ${hauteur}`}
      // `slice` : le canevas COUVRE le conteneur au lieu de s'y insérer en
      // laissant des marges. C'est ce qui remplit l'écran jusqu'aux bords.
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {places.map((mot) => (
        <text
          key={mot.cle}
          className={mot.accent ? "lost-word-cloud__word is-accent" : "lost-word-cloud__word"}
          x={mot.x}
          y={mot.y}
          fontSize={mot.taille}
          opacity={mot.opacite}
          // ⚠ CE COUPLE FAIT TOUT LE NON-CHEVAUCHEMENT. `textLength` impose la
          // largeur qui a servi à réserver la place ; sans lui, le dessin
          // s'écarterait du calcul et les mots se marcheraient dessus pendant
          // que les tests resteraient verts.
          textLength={mot.largeurImposee}
          lengthAdjust="spacingAndGlyphs"
          // Ancrage au centre : le mot se pose sur son point quelle que soit son
          // écriture. Avec `start`, l'arabe partirait du bord droit et le latin
          // du bord gauche — les boîtes ne tomberaient pas au bon endroit.
          textAnchor="middle"
          dominantBaseline="middle"
          {...(mot.vertical ? { transform: `rotate(-90 ${mot.x} ${mot.y})` } : {})}
          {...(mot.lang === "ar" ? { lang: "ar", direction: "rtl" as const } : {})}
        >
          {mot.texte}
        </text>
      ))}
    </svg>
  );
}

export function LostWordCloud() {
  return (
    <div className="lost-word-cloud" aria-hidden="true">
      <Canevas places={NUAGE_LARGE} largeur={1200} hauteur={800} variante="wide" />
      <Canevas places={NUAGE_COMPACT} largeur={420} hauteur={900} variante="compact" />
    </div>
  );
}
