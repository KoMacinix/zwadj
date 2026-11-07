# FC-3 — NOMS EN ARABE DANS LE PANNEAU DE DEMANDE — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `7113356` (FC-2 poussé, local = origin vérifié). Commits du lot : `c780dfc` (table,
seule) → `0ad454f` (rouges v1) → `8a2c45b` (extension 1, seule) → `5351e73` (test typé + rouge v2) → `13a9c2c` (code) → le
commit de clôture. Méthode NORMALE (décision du relecteur : affichage seul, aucun montant).

## Fait
- **Une règle, un module pur** : `apps/client/src/lib/nom-localise.ts` — en arabe le champ arabe ; le français seulement si
  l'arabe est VIDE (blancs compris, ou `null`) ; le repli se DIT (`repli`, `langue: "fr"`), et l'écran pose alors `lang="fr"`
  ET `dir="ltr"` sur le texte (`attributsDeLangue`). En français : le français, sans repli. Garde : `nom-localise.test.ts` (6 tests).
- **Le panneau** (`booking-request-panel.tsx`) : le nom du CRÉNEAU, de la PRESTATION (case, libellés « palier » et « quantité »),
  de l'UNITÉ et du PALIER passent par la règle ; un composant `Nom` pose le repli sur le seul texte replié. Garde :
  `booking-request-panel-langue.test.tsx` (8 tests, dont 2 de non-régression).
- **Rouges avant le code** : 6 échecs par AssertionError (v1, `0ad454f`) ; le test, commité, passait sous vitest mais ne
  compilait pas (`as const`) — corrigé AVANT le code, le code mis de côté, et le rouge REJOUÉ sur l'état d'avant (v2, `5351e73`,
  mêmes 6 échecs, l'empreinte du test livré).
- **Harnais** `neutralisation/neutralize-fc3.py` : **8 sur 8 mordues** (N-1 à N-3 sur la règle, P-1 à P-5 sur le panneau ; titres
  relevés en découverte d'abord).
- **Campagnes touchées** (`campagnes.txt`) : fc3 8/8, r25 7 (+4 e2e non jouées sans `--e2e`, hors de ce que touche le lot), r29
  15/15, r32 65/65, r42 22/22 — **117 mordues, 0 muette**.
- **Portes** : voir `portes/resume.txt` et la section ci-dessous.

## Pas fait, et pourquoi
- Le repli d'une **unité** n'est pas marqué `lang` : l'unité vit DANS une phrase de message (« {amount} par {unit} »), où aucun
  élément ne peut s'insérer ; son texte suit quand même la règle (arabe si présent). Le contrat exige `unitNameAr` non vide pour
  une prestation « à l'unité » : le cas ne se produit que sur une donnée héritée.
- Les montants du panneau restent formatés en `fr` (`formatDZD` sans locale) : c'est **FC-6** (ar-DZ), pas ce lot.
- Les autres écrans qui choisissent le nom par `ar ? x.nameAr : x.nameFr` (carte de salle, recherche, assistant, compte) n'ont
  PAS de repli : hors du panneau, hors de ce lot (pas de défaut mesuré).

## Écarts
- **Le nom du créneau** n'était pas nommé par la consigne (« nameFr, labelFr, unitNameFr ») : même défaut, même panneau, même
  DTO — inclus (lecture adverse FC3-2).
- **Faute de la session, attrapée avant le code** : le test commité avec les rouges ne compilait pas ; la correction et son rouge
  rejoué sont deux commits déclarés (extension 1). Une commande de commit a échoué pendant cette reprise (fichier neuf non ajouté)
  et la remise du code (stash) s'est faite quand même : l'arbre est resté cohérent, et le commit du test corrigé a été refait en
  nommant ses chemins — aucun fichier de code n'y est entré (`git show --name-only 5351e73`).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **« Et le dire » = `lang="fr"` + `dir="ltr"` sur le texte replié**, sans mention visible : un lecteur d'écran prononce le
   nom en français, l'œil voit des lettres latines. Pour Ko : si une mention visible est voulue (« (en français) »), c'est une clé
   de plus et un lot.
2. **Le repli ne vaut que pour la page ARABE** : en français, un `nameFr` vide resterait vide (le contrat l'interdit). Pour Ko : rien.

## Arabe à relire
Aucune clé ajoutée (les noms viennent des données des salles).

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 414/33** · pro 653/41 — 2 222 tests, 151 fichiers ;
client +14 tests, +2 fichiers) · build 0 · test:int 613/619 — les 6 rouges sont dans l'ensemble de concurrence d'entrée (MD-1 ×2,
F-1, F-2, F-3 ×2 : `ECONNRESET` puis `deadlock` en cascade, environnement) : **pas « vert », à jouer à l'intégration** · e2e 0
(69 passés, 1 ignoré, 0 échec).

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
