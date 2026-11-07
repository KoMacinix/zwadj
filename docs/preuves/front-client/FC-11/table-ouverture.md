# FC-11 — LE HTML INITIAL VIDE DES PAGES 404 — table d'ouverture (premier commit du lot, SEUL) · lot **ARRÊTÉ** (prémisse fausse)

SHA de départ : `eb98ee79326a4d8f57a7a13b1454497c7ecc191e` (dernier commit de FC-10, poussé, local = origin vérifié). Consigne :
« mesurer sur build de production ; lang/dir selon la locale ; aucune `loading.tsx` au-dessus d'une page qui refuse (D250) ;
l'attrape-tout de D249 tient ; si `<html>` doit sortir de `[locale]/layout.tsx` avec un risque sur lang/dir → ARRÊTÉ avec options ».
La mesure a été faite AVANT cette table, sans aucune écriture au dépôt (les essais B et C ont posé des fichiers TEMPORAIRES, retirés,
arbre vérifié propre) : elle décide que le lot S'ARRÊTE — la prémisse du backlog (« la correction connue passe par un `app/layout.tsx`
racine ») est FAUSSE, mesurée trois fois, et le défaut est celui de Next 15.5.20 lui-même (une application minimale le reproduit).
⇒ Aucun code, aucun test, aucun harnais : les fichiers du lot sont la pièce d'arrêt et ses mesures. Aucune porte n'est rejouée :
aucun fichier qu'une porte lit ne change (D292 : `docs/preuves/` ne compte pas).

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-11/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-11/arret.md` | la pièce « ARRÊTÉ » : la prémisse confrontée, le mécanisme, les options pour Ko | 2 |
| 3 | `docs/preuves/front-client/FC-11/mesures/mesure-404.mjs` | l'instrument (le HTML SERVI : statut, `__next_error__`, lang/dir, texte visible hors scripts ; témoin calibré) | 2 |
| 4 | `docs/preuves/front-client/FC-11/mesures/A-depart-production.txt` | état de départ, `next build` + `next start` | 2 |
| 5 | `docs/preuves/front-client/FC-11/mesures/A-depart-developpement.txt` | état de départ, `next dev` (la suite e2e tourne là) | 2 |
| 6 | `docs/preuves/front-client/FC-11/mesures/B-layout-racine-passe-plat.txt` | essai B : un `app/layout.tsx` qui rend ses enfants (le `<html>` reste dans `[locale]/layout.tsx`) | 2 |
| 7 | `docs/preuves/front-client/FC-11/mesures/C-html-dans-un-layout-racine.txt` | essai C : le `<html lang dir>` monté dans un layout racine (la « correction connue » du backlog) | 2 |
| 8 | `docs/preuves/front-client/FC-11/mesures/mini-next-standard.txt` | une application Next MINIMALE (mêmes versions, sans next-intl ni intergiciel), puis avec `experimental.globalNotFound` | 2 |
| 9 | `docs/preuves/front-client/FC-11/audit-secrets-fc11.txt` | audit de secrets scellé | 3 |
| 10 | `docs/preuves/front-client/FC-11/tri-audit-fc11.txt` | son tri | 3 |
| 11 | `docs/preuves/front-client/FC-11/controle.txt` | sortie du contrôle de fin de lot | 3 |
