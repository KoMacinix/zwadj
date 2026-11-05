// Rang 29 (D321) — l'adresse de la page de connexion du Pro, écrite UNE fois.
//
// ⚠ POURQUOI CE FICHIER EXISTE. Huit liens et la déclaration de la route l'écrivaient chacun en dur. Que la page bouge,
// et chaque copie mène ailleurs — en silence : c'est exactement la 404 que le client a servie huit semaines à ses
// visiteurs anonymes (D315). La constante se vérifie contre la route qui rend la page (`routes.test.tsx`), et UNE garde
// (`apps/client/src/lib/login-path-guard.test.ts`) rougit si l'adresse réapparaît ailleurs dans le code du pro ou du client.
//
// ⚠ Le client y envoie aussi ses visiteurs professionnels (`${PRO_URL}${LOGIN_PATH}`) : la même garde vérifie que les
// deux constantes nomment la même page.
//
// ⛔ FC-5 (session `front-client`) — CE FICHIER EST DÉSORMAIS LA TABLE DE TOUTES LES ROUTES DU PRO : `App.tsx` déclare ses
// `<Route path>` avec ces constantes, et chaque lien les emploie. Lot « source unique » (arbitrage de Ko du 04/10/2026) ; les
// adresses relevées en dur par D321 (`docs/preuves/D321/adresses/releve.txt`) y sont montées. Gardes : `routes.test.tsx`
// (chaque constante est une route DÉCLARÉE — la table de routes réelle y rend sa page sans la quitter, patron de D322) et
// `apps/client/src/lib/adresses-guard.test.ts` (aucune adresse de page écrite ailleurs que dans ce fichier et dans celui du client).

/** Page de connexion du Pro : la route de `App.tsx` qui rend `LoginPage`. */
export const LOGIN_PATH = "/auth/connexion";
export const REGISTER_PATH = "/auth/inscription";
export const FORGOT_PASSWORD_PATH = "/auth/mot-de-passe-oublie";
/** Ouverte même connecté : elle consomme un jeton reçu par e-mail (D148). */
export const RESET_PASSWORD_PATH = "/auth/reinitialisation";
/** Ouverte même connecté : elle consomme un jeton reçu par e-mail (D148). */
export const VERIFY_EMAIL_PATH = "/auth/verification-email";
/** Le tableau de bord — « Nouvelle réservation » (D130). */
export const DASHBOARD_PATH = "/";
export const REQUESTS_PATH = "/demandes";
export const CALENDAR_PATH = "/calendrier";
/** Dates verrouillées (D131). */
export const BOOKINGS_PATH = "/reservations";
export const ACCOUNT_PATH = "/compte";
export const VENUES_PATH = "/salles";
/** STATIQUE avant PARAMÈTRE dans `App.tsx` : « nouvelle » n'est pas un identifiant de salle. */
export const NEW_VENUE_PATH = "/salles/nouvelle";
/** Le motif DÉCLARÉ de l'assistant d'une salle ; les liens passent par `venuePath`. */
export const VENUE_PATH_PATTERN = "/salles/:id";

/** L'assistant d'une salle (`VENUE_PATH_PATTERN`). */
export function venuePath(id: string): string {
  return `${VENUES_PATH}/${id}`;
}

/** Pages du SITE CLIENT liées depuis le pro (inscription) : elles doivent nommer les pages du client — la garde
 *  `adresses-guard.test.ts` les confronte à `TERMS_PATH` et `PRIVACY_PATH` de `apps/client/src/lib/routes.ts`. */
export const CLIENT_TERMS_PATH = "/cgu";
export const CLIENT_PRIVACY_PATH = "/confidentialite";
