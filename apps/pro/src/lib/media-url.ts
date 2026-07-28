// Correctif A6a-P-① — les `<img>` des médias ne s'affichaient pas.
//
// L'adapter disque du Lot A0 renvoie une URL publique RELATIVE :
// `/api/v1/media/<clé>`, et son contrat le dit explicitement — « les fronts
// préfixent leur base API ». Ni la liste des salles (couverture, A11a) ni le
// volet photos (A6a-P) ne le faisaient : en développement l'app Pro est servie
// par Vite sur :5173 alors que l'API écoute sur :3001, et il n'y a AUCUN proxy
// `/api` dans `vite.config.ts`. Le navigateur allait donc chercher l'image sur
// http://localhost:5173/api/v1/media/… → l'icône d'image cassée.
//
// La correction vit côté front, pas dans l'adapter : garder `publicUrl`
// relative est ce qui permet à l'API d'être servie derrière n'importe quel
// domaine. Et en production l'adapter S3/CDN renverra une URL ABSOLUE — d'où
// le test de forme ci-dessous plutôt qu'une concaténation aveugle, qui
// fabriquerait alors `https://api.zwadj.dz/https://cdn…`.
import { API_BASE_URL } from "./auth-client";

/** URL d'affichage d'un média : absolue telle quelle, relative préfixée. */
export function mediaSrc(url: string): string {
  return /^[a-z][a-z0-9+.-]*:|^\/\//i.test(url) ? url : `${API_BASE_URL}${url}`;
}
