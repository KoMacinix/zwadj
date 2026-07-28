// Lot A7 — jumeau CÔTÉ CLIENT de `apps/pro/src/lib/media-url.ts` (correctif
// A6a-P-①). L'adapter disque du Lot A0 renvoie une URL publique RELATIVE
// (`/api/v1/media/<clé>`) et son contrat dit « les fronts préfixent leur base
// API » : sans ce préfixe, Next irait chercher l'image sur sa propre origine.
//
// Deux fichiers plutôt qu'un partagé : la base n'a pas la même source (Vite
// `import.meta.env` d'un côté, `process.env.NEXT_PUBLIC_*` de l'autre), et
// `packages/api-client` ne doit pas dépendre d'une variable de build d'app.
//
// Le test de forme n'est pas décoratif : en production l'adapter S3/CDN
// renverra une URL ABSOLUE, qu'une concaténation aveugle transformerait en
// `https://api.zwadj.dz/https://cdn…`.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** URL d'affichage d'un média : absolue telle quelle, relative préfixée. */
export function mediaSrc(url: string): string {
  return /^[a-z][a-z0-9+.-]*:|^\/\//i.test(url) ? url : `${API_URL}${url}`;
}
