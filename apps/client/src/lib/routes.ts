// Rang 25 (D316) — les CIBLES de lien du client qu'un défaut a déjà fait mentir.
//
// ⚠ POURQUOI CE FICHIER EXISTE. Le panneau de demande visait `/connexion` ; la
// page est `/auth/connexion`. Le visiteur anonyme — celui qu'on veut faire
// entrer — tombait sur une 404, pendant huit semaines, et aucun test ne le
// voyait (D315). Un chemin écrit en dur dans un composant ne se vérifie nulle
// part ; une constante se vérifie UNE fois, contre le NOM DE FICHIER de la page
// (`routes.test.ts`, D249 : une garde de routage mesure des fichiers).
//
// ⚠ Chemins SANS locale : le `Link` de `i18n/navigation` ajoute `/fr` ou `/ar`.
// Un préfixe écrit ici casserait l'une des deux langues (MD2-b).
//
// ⛔ FC-5 (session `front-client`) — CE FICHIER RECENSE DÉSORMAIS TOUTES LES PAGES DU CLIENT, une constante par page. Il
// portait : « ce fichier ne recense PAS toutes les routes du client […] les AUTRES adresses de pages restent écrites en dur —
// relevées au rapport de D321, non corrigées ». Le lot « source unique » (arbitrage de Ko du 04/10/2026) les y a montées.
// Deux gardes : `routes.test.ts` (chaque constante désigne un `page.tsx`, et chaque `page.tsx` a sa constante) et
// `adresses-guard.test.ts` (aucune adresse de page n'est écrite ailleurs que dans ce fichier et dans celui du pro).
import type { AppLocale } from "@zwadj/i18n";

/** Page de connexion du client : `src/app/[locale]/auth/connexion/page.tsx`. */
export const LOGIN_PATH = "/auth/connexion";
/** `src/app/[locale]/auth/inscription/page.tsx`. */
export const REGISTER_PATH = "/auth/inscription";
/** `src/app/[locale]/auth/mot-de-passe-oublie/page.tsx`. */
export const FORGOT_PASSWORD_PATH = "/auth/mot-de-passe-oublie";
/** `src/app/[locale]/auth/reinitialisation/page.tsx`. */
export const RESET_PASSWORD_PATH = "/auth/reinitialisation";
/** `src/app/[locale]/auth/verification-email/page.tsx`. */
export const VERIFY_EMAIL_PATH = "/auth/verification-email";
/** La recherche : `src/app/[locale]/salles/(recherche)/page.tsx` (le groupe ne fait pas partie de l'adresse, D250). */
export const SEARCH_PATH = "/salles";
/** `src/app/[locale]/assistant/page.tsx`. */
export const ASSISTANT_PATH = "/assistant";
/** `src/app/[locale]/compte/page.tsx`. */
export const ACCOUNT_PATH = "/compte";
/** `src/app/[locale]/cgu/page.tsx`. */
export const TERMS_PATH = "/cgu";
/** `src/app/[locale]/confidentialite/page.tsx`. */
export const PRIVACY_PATH = "/confidentialite";

/** La fiche d'une salle : `src/app/[locale]/salles/[slug]/page.tsx`. Le slug est déjà sûr (`SLUG_PATTERN` côté API). */
export function venuePath(slug: string): string {
  return `${SEARCH_PATH}/${slug}`;
}

/** L'accueil d'UNE langue, AVEC sa locale : seule la page 404 RACINE (hors du segment `[locale]`, sans `Link` localisé) en a
 *  besoin — `src/app/[locale]/page.tsx`. */
export function localeHomePath(locale: AppLocale): string {
  return `/${locale}`;
}
