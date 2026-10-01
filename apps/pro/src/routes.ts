// Rang 29 (D321) — l'adresse de la page de connexion du Pro, écrite UNE fois.
//
// ⚠ POURQUOI CE FICHIER EXISTE. Huit liens et la déclaration de la route l'écrivaient chacun en dur. Que la page bouge,
// et chaque copie mène ailleurs — en silence : c'est exactement la 404 que le client a servie huit semaines à ses
// visiteurs anonymes (D315). La constante se vérifie contre la route qui rend la page (`routes.test.tsx`), et UNE garde
// (`apps/client/src/lib/login-path-guard.test.ts`) rougit si l'adresse réapparaît ailleurs dans le code du pro ou du client.
//
// ⚠ Le client y envoie aussi ses visiteurs professionnels (`${PRO_URL}${LOGIN_PATH}`) : la même garde vérifie que les
// deux constantes nomment la même page.

/** Page de connexion du Pro : la route de `App.tsx` qui rend `LoginPage`. */
export const LOGIN_PATH = "/auth/connexion";
