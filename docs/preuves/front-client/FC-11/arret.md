# FC-11 — LE HTML INITIAL VIDE DES PAGES 404 — **ARRÊTÉ** (prémisse fausse, mesurée)

Session `front-client`, 05/11/2026. Départ `eb98ee7`. Aucun code, aucun test, aucun harnais : ce lot est cette pièce et ses mesures
(`mesures/`). Règle d'arrêt de la consigne : « prémisse fausse ».

## La prémisse, telle que le backlog l'écrit
`ZWADJ_BACKLOG.md`, `[FRONT][P1]` « Le HTML initial des deux pages 404 est VIDE » : « En production, elles délivrent `<html
id="__next_error__">` avec une frontière Suspense non résolue ; le contenu n'arrive que par la charge RSC […] robot sans JS : page
blanche. **La correction connue passe par un `app/layout.tsx` racine**, ce qui déplacerait le `<html>` porté par `[locale]/layout.tsx` :
décision de structure, non prise. »

## Ce que la mesure dit (Next 15.5.20, React 19.2.7 — `mesures/`)
| état | les quatre 404 (`/fr/nimportequoi`, `/ar/nimportequoi`, `/fr/salles/<inconnue>`, `/wp-login.php`) | témoin `/fr` |
|---|---|---|
| A — départ, **production** | 404 · `<html id="__next_error__">` · lang ∅ · dir ∅ · **0** caractère visible | 200 · texte servi |
| A — départ, **développement** | idem | idem |
| B — `app/layout.tsx` qui rend ses enfants (le `<html>` reste dans `[locale]/layout.tsx`) | **idem** | idem |
| C — le `<html lang dir>` monté dans un layout racine (« la correction connue ») | **idem** | idem |
| application Next MINIMALE, structure standard, sans next-intl ni intergiciel | **idem** (pour `notFound()` ET pour une route inconnue) | 200 · texte servi |
| la même avec `experimental.globalNotFound` + `global-not-found` | **idem** | idem |

⇒ **La prémisse est FAUSSE** : ni un layout racine qui passe ses enfants, ni le `<html>` monté dans un layout racine ne font servir le
contenu d'une 404 ; une application Next MINIMALE, de structure standard, aux mêmes versions, sert ses 404 de la même façon. **Le
défaut n'est pas celui de la structure de l'application : c'est le rendu des 404 de Next 15.5.20.** Sortir le `<html>` de
`[locale]/layout.tsx` — le risque que la consigne nomme pour arrêter — n'achèterait RIEN.

## Le mécanisme — lu dans le code de Next, confirmé par la mesure
`node_modules/next/dist/server/app-render/app-render.js` (15.5.20) : quand l'erreur de `notFound()` (`NEXT_HTTP_ERROR_FALLBACK;404`)
remonte jusqu'en haut du rendu serveur, Next rend sa COQUILLE d'erreur (`getErrorRSCPayload` : `<html id="__next_error__">`, corps
vide) et ne garde le contenu de la page 404 que dans la charge RSC, que le navigateur rend après hydratation. En développement, la
coquille porte le message de l'erreur qui a échappé : `data-next-error-message="NEXT_HTTP_ERROR_FALLBACK;404"` — pour `/fr/nimportequoi`
comme pour `/wp-login.php`. Le statut HTTP reste juste (404), et un navigateur avec JavaScript affiche la bonne page, dans sa langue.

## Ce que cela coûte aujourd'hui — mesuré, pas supposé
- Statut **404 correct** partout (aucun soft-404, D250 tient) ; l'attrape-tout de D249 tient : **dans Chromium, avec JavaScript**,
  `/fr/nimportequoi` affiche « Cette page n'existe pas » (`lang=fr dir=ltr`), `/ar/nimportequoi` « هذه الصفحة غير موجودة »
  (`lang=ar dir=rtl`), `/wp-login.php` la page bilingue (`mesures/A-depart-production.txt`, dernière section).
- **Sans JavaScript** (un robot qui n'exécute pas de script, un navigateur où il est coupé) : une page BLANCHE, sans `lang` ni `dir`
  (mesuré dans Chromium, JavaScript coupé : aucun `<h1>`, `lang` et `dir` nuls).
  Une 404 n'est pas indexée (statut 404) : le coût est pour le visiteur sans JavaScript, pas pour le référencement.

## Options pour Ko — une décision de dépendance, hors de cette session
1. **Garder l'état** (coût nul) : statut juste, page juste avec JavaScript ; écrire la limite.
2. **Changer de version de Next** (une version où la 404 se rend au serveur, À MESURER avec `mesures/mesure-404.mjs` sur l'application
   minimale d'abord, puis sur le client) : un lot de dépendance — six portes, e2e, la référence axe-core —, hors de cette session
   (consigne : « dépendance » hors lot) ; la mesure de cette pièce en est le banc d'essai.
3. **Une 404 statique hors de React** pour les seules routes inconnues (un intergiciel qui réécrit vers un HTML de `public/`) :
   couvrirait `/wp-login.php`, PAS un `notFound()` levé par une page (fiche dépubliée) ; une seconde page 404 hors de l'i18n — **non
   recommandé** (deux copies d'un même écran divergent, AGENTS.md).

⇒ Recommandation de la session : **1**, en écrivant la limite, puis **2** au prochain changement de version de Next, avec ce banc
d'essai. ⚠ L'entrée du backlog porte une prémisse fausse (« la correction connue ») : à barrer à l'intégration (la session n'écrit pas
les fichiers d'autorité).
