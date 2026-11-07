// FC-3 (session `front-client`) — LE NOM D'UNE DONNÉE BILINGUE, DANS LA LANGUE DE LA PAGE, AVEC UN REPLI DIT.
//
// ⚠ LE DÉFAUT QU'IL FERME. Le panneau de demande de la fiche salle lisait `nameFr`, `labelFr` et `unitNameFr` quelle que soit
// la langue : un visiteur arabophone voyait « Soirée », « Traiteur », « Formule or » au milieu d'une page en arabe, alors que
// les DTO portent `nameAr`, `labelAr`, `unitNameAr` (packages/types/src/service.ts, venue.ts).
//
// ⚠ LA RÈGLE, UNE SEULE FOIS. En arabe : le champ arabe ; s'il est VIDE (blancs compris), le français le remplace — et la
// réponse le DIT (`repli`, `langue: "fr"`), pour que l'écran pose `lang="fr"` et `dir="ltr"` sur ce texte : un lecteur d'écran
// le prononce alors en français, et la règle « tout élément qui déclare `lang` déclare sa direction » (harnais, D226) tient.
// En français : le champ français, sans repli (le contrat l'exige non vide). Module PUR (D205) : la décision se mesure sans
// monter un composant.
//
// ⚠ AFFICHAGE SEUL (décision du relecteur pour FC-3) : aucun montant, aucun identifiant envoyé au serveur ne passe par ici.

export interface NomLocalise {
  /** Le texte à afficher. */
  texte: string;
  /** La langue du texte RENDU — `fr` quand l'arabe manque et que le français le remplace. */
  langue: "fr" | "ar";
  /** Vrai quand la page est en arabe et que le texte rendu est le français, faute d'arabe. */
  repli: boolean;
}

export function nomLocalise(fr: string | null | undefined, ar: string | null | undefined, locale: string): NomLocalise {
  const francais = fr ?? "";
  if (locale !== "ar") return { texte: francais, langue: "fr", repli: false };
  const arabe = (ar ?? "").trim();
  return arabe === "" ? { texte: francais, langue: "fr", repli: true } : { texte: arabe, langue: "ar", repli: false };
}

/** Les attributs à poser sur l'élément qui porte le texte : RIEN hors repli (la page dit déjà sa langue), `lang` ET `dir`
 *  ensemble dans le repli. */
export function attributsDeLangue(nom: NomLocalise): { lang?: "fr"; dir?: "ltr" } {
  return nom.repli ? { lang: "fr", dir: "ltr" } : {};
}
