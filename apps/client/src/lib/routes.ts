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
// ⚠ Ce fichier ne recense PAS toutes les routes du client. Il portait ici : « neuf
// autres liens écrivent encore `href="/auth/connexion"` en littéral (relevé du
// 26/09/2026) ». ⛔ Faux depuis le rang 29 (D321) : les neuf, les deux liens vers
// la connexion du Pro et la métadonnée canonique de la page passent par
// `LOGIN_PATH`, et `login-path-guard.test.ts` rougit si l'adresse réapparaît
// ailleurs dans le code du client ou du pro. Les AUTRES adresses de pages restent
// écrites en dur — relevées au rapport de D321, non corrigées (consigne de Ko).

/** Page de connexion du client : `src/app/[locale]/auth/connexion/page.tsx`. */
export const LOGIN_PATH = "/auth/connexion";
