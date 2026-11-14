// Carte (session « carte », lot CA-5) — le fond de carte de l'app PRO, lu de l'environnement Vite.
//
// ⚠ La RÈGLE (production sans variable ⇒ pas de carte ; développement ⇒ le défaut OpenStreetMap) n'est pas ici : elle vit
// dans `resolveMapTiles` (`@zwadj/ui`), partagée avec le site client. Ce fichier ne fait que lui passer SON environnement.
// ⚠ Les trois variables sont lues en toutes lettres : Vite remplace `import.meta.env.VITE_…` à la compilation.
import { resolveMapTiles, type MapTiles } from "@zwadj/ui";

export const PRO_MAP_TILES: MapTiles | null = resolveMapTiles({
  production: import.meta.env.PROD,
  url: import.meta.env.VITE_MAP_TILES_URL as string | undefined,
  attribution: import.meta.env.VITE_MAP_TILES_ATTRIBUTION as string | undefined,
  attributionUrl: import.meta.env.VITE_MAP_TILES_ATTRIBUTION_URL as string | undefined
});
