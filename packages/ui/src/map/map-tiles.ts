// Carte — session « carte », lot CA-2. Module PUR, partagé par les deux applications : QUEL fond de carte, où centrer, à
// quelle précision écrire une coordonnée. Aucune dépendance (ni Leaflet, ni React) : il se rejoue en millisecondes, et il
// est importé par des pages rendues côté serveur sans y traîner la bibliothèque de carte.
//
// ── Le fond de carte (les « tuiles ») — décision R-2, adoptée par Ko ────────
// L'adresse du serveur de tuiles et la mention d'attribution viennent de VARIABLES D'ENVIRONNEMENT. Le SEUL endroit du dépôt
// où une adresse de tuiles est écrite est `DEV_MAP_TILES`, ci-dessous : le défaut de DÉVELOPPEMENT (OpenStreetMap).
// ⛔ EN PRODUCTION, VARIABLE ABSENTE ⇒ `null` ⇒ l'écran affiche « carte indisponible ». Jamais le défaut de développement :
// les tuiles publiques d'OpenStreetMap ont des conditions d'usage, et le fournisseur de production est une décision de Ko
// qui n'est pas prise (`docs/preuves/parallele/carte/a-reporter-au-backlog.md`).
// Chaque application lit SES variables (Next et Vite ne les nomment pas pareil) et appelle `resolveMapTiles` : la règle, elle,
// n'existe qu'ici (D205 — une décision d'environnement est une fonction pure qui reçoit son environnement en paramètre).

export interface MapTiles {
  /** Gabarit d'adresse des tuiles : porte `{z}`, `{x}` et `{y}`. */
  url: string;
  /** Mention d'attribution, affichée en TEXTE sous la carte (jamais injectée comme du HTML). */
  attribution: string;
  /** Lien de la mention (page de licence du fournisseur), `null` : mention sans lien. */
  attributionUrl: string | null;
}

/** ⚠ DÉVELOPPEMENT SEULEMENT. Tuiles publiques d'OpenStreetMap et leur attribution. */
export const DEV_MAP_TILES: MapTiles = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap",
  attributionUrl: "https://www.openstreetmap.org/copyright"
};

export interface MapTilesEnv {
  /** `true` : build de production. C'est l'appelant qui le sait (`NODE_ENV`, `import.meta.env.PROD`). */
  production: boolean;
  url: string | undefined;
  attribution: string | undefined;
  attributionUrl: string | undefined;
}

const propre = (value: string | undefined): string => (value ?? "").trim();

/** Un gabarit de tuiles utilisable : `https://` (ou `http://` hors production, pour un serveur local) et les trois jetons. */
function isTileTemplate(url: string, production: boolean): boolean {
  const schemeOk = url.startsWith("https://") || (!production && url.startsWith("http://"));
  return schemeOk && url.includes("{z}") && url.includes("{x}") && url.includes("{y}");
}

/** Le fond de carte à employer, ou `null` : PAS de carte (l'écran le dit).
 *
 *  ⚠ L'adresse et la mention vont ENSEMBLE. Une adresse sans mention afficherait les tuiles d'un tiers sans le créditer ;
 *  une mention sans adresse créditerait le défaut de développement d'un autre nom. Les deux cas rendent `null`, en
 *  développement comme en production : une configuration à moitié faite ne se devine pas (D55 : on refuse, on n'arrange pas). */
export function resolveMapTiles(env: MapTilesEnv): MapTiles | null {
  const url = propre(env.url);
  const attribution = propre(env.attribution);
  if (url === "" && attribution === "") return env.production ? null : DEV_MAP_TILES;
  if (url === "" || attribution === "") return null;
  if (!isTileTemplate(url, env.production)) return null;
  const attributionUrl = propre(env.attributionUrl);
  return { url, attribution, attributionUrl: attributionUrl.startsWith("https://") ? attributionUrl : null };
}

export interface MapPosition {
  lat: number;
  lng: number;
}

/** Centre par défaut quand il n'y a aucun point à montrer : Alger. L'accueil titre « Carte des salles · Alger ». */
export const DEFAULT_MAP_CENTER: MapPosition = { lat: 36.7538, lng: 3.0588 };
/** Zoom du centre par défaut : l'agglomération. */
export const DEFAULT_MAP_ZOOM = 11;
/** Zoom sur UN point (une salle, le point posé par le pro) : le quartier. */
export const SINGLE_POINT_ZOOM = 15;

/** Précision d'une coordonnée : six décimales, celle de la colonne (`DECIMAL(9,6)`), soit ~11 cm. */
export const COORDINATE_DECIMALS = 6;

/** Une coordonnée telle que la base la stockera. ⚠ Arrondie AVANT d'être écrite dans le champ : sinon le pro lirait
 *  `36.75381234567` et la relecture après enregistrement rendrait `36.753812` — un champ qui change tout seul. */
export function roundCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

/** Latitude et longitude plausibles — les bornes du contrat (`latSchema`, `lngSchema` de `@zwadj/types`). */
export function isMapPosition(position: { lat: number; lng: number }): boolean {
  return (
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lng) &&
    position.lat >= -90 &&
    position.lat <= 90 &&
    position.lng >= -180 &&
    position.lng <= 180
  );
}

/** La boîte qui contient tous les points, ou `null` s'il n'y en a aucun. */
export function boundsOf(points: readonly MapPosition[]): { south: number; west: number; north: number; east: number } | null {
  if (points.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const point of points) {
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
    west = Math.min(west, point.lng);
    east = Math.max(east, point.lng);
  }
  return { south, west, north, east };
}
