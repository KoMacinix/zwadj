// Carte (session « carte », lot CA-2) — le fond de carte du CLIENT, lu de l'environnement.
//
// ⚠ LES TROIS VARIABLES SONT ÉCRITES EN TOUTES LETTRES, et c'est obligatoire : Next remplace `process.env.NEXT_PUBLIC_…` à
// la COMPILATION, par recherche du texte exact. Une lecture indirecte (`process.env[nom]`) rendrait `undefined` dans le
// navigateur — c'est-à-dire « carte indisponible » en production alors que la variable est posée.
// ⚠ La RÈGLE (production sans variable ⇒ pas de carte ; développement ⇒ le défaut OpenStreetMap) n'est pas ici : elle vit
// dans `resolveMapTiles` (`@zwadj/ui`), partagée avec l'app Pro. Ce fichier ne fait que lui passer SON environnement.
import { resolveMapTiles, type MapTiles } from "@zwadj/ui";

export const CLIENT_MAP_TILES: MapTiles | null = resolveMapTiles({
  production: process.env.NODE_ENV === "production",
  url: process.env.NEXT_PUBLIC_MAP_TILES_URL,
  attribution: process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION,
  attributionUrl: process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION_URL
});
