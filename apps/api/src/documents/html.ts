// Échappement HTML STRUCTUREL — rang 33 (D326), décision 3 du relecteur : « toute donnée insérée dans le modèle est échappée ».
//
// ⛔ POURQUOI UNE BALISE DE GABARIT ET PAS UNE FONCTION `esc()` APPELÉE À LA MAIN. Le modèle d'un document est une page web remplie de SAISIES
// (nom de salle, de prestation, de client). Non échappé, un nom devient du balisage ; et une fonction qu'il faut penser à appeler à chaque
// insertion s'oublie à la première insertion qu'on ajoute en pressé. Ici c'est l'INVERSE : `html\`…${x}…\`` échappe TOUT ce qu'on lui
// interpole, par défaut, et il faut un geste EXPLICITE (`raw`) pour insérer du balisage de confiance. Oublier d'échapper n'est plus possible
// par distraction — seulement par un `raw()` écrit, donc visible à la relecture.
//
// ⚠ Ce que `raw` est fait pour : le CSS et les polices du dépôt (des octets que le dépôt écrit, jamais une saisie). Un `raw()` appelé sur une
// donnée venue d'un utilisateur est le défaut que ce module existe pour empêcher ; `quote-document.spec.ts` le mesure sur des noms hostiles.
//
// ⚠ Ce module n'importe RIEN : il se rejoue en millisecondes, sans base, sans navigateur (D187 : le motif qui tient est la vitesse).
const SAFE = Symbol("SafeHtml");

/** Un fragment de HTML que le module garantit déjà sûr. Seuls `html` et `raw` en fabriquent. */
export interface SafeHtml {
  readonly [SAFE]: true;
  readonly value: string;
}

const ENTITES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Échappe une chaîne pour un nœud texte OU une valeur d'attribut entre guillemets simples ou doubles. */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ENTITES[c] as string);
}

function fabrique(value: string): SafeHtml {
  return { [SAFE]: true, value };
}

export function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === "object" && value !== null && (value as { [SAFE]?: unknown })[SAFE] === true;
}

/** Du balisage DE CONFIANCE, inséré tel quel. ⚠ Jamais une saisie. */
export function raw(value: string): SafeHtml {
  return fabrique(value);
}

function rendu(valeur: unknown): string {
  if (isSafeHtml(valeur)) return valeur.value;
  if (typeof valeur === "string" || typeof valeur === "number") return escapeHtml(valeur);
  if (Array.isArray(valeur)) return valeur.map(rendu).join("");
  // ⚠ Une valeur d'un autre type n'est PAS stringifiée en silence : « [object Object] » dans un devis est un défaut qu'on veut voir, pas imprimer.
  throw new TypeError(`html : valeur non insérable (${valeur === null ? "null" : typeof valeur}) — convertis-la explicitement.`);
}

/** Gabarit : tout ce qui est interpolé est ÉCHAPPÉ, sauf un `SafeHtml` (fabriqué par `html` ou `raw`) ; un tableau est rendu élément par élément. */
export function html(chaines: TemplateStringsArray, ...valeurs: unknown[]): SafeHtml {
  let sortie = chaines[0] as string;
  for (let i = 0; i < valeurs.length; i += 1) sortie += rendu(valeurs[i]) + (chaines[i + 1] as string);
  return fabrique(sortie);
}

/** Le texte final d'un fragment. */
export function toHtmlString(fragment: SafeHtml): string {
  return fragment.value;
}
