# FC-9 — LES AVERTISSEMENTS `act(...)` DE LA SUITE CLIENT — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `f4c9256` (FC-8 poussé, local = origin vérifié). Commits du lot : `32c140b` (table,
seule) → `0c20c54` (le relevé, la garde sans exemption, l'étalon, les rouges) → `f515872` (les corrections, dans les tests) →
`8a7dde9` (extension 1, seule) → le commit de clôture. Méthode NORMALE : aucun code produit n'est touché.

## Fait
- **Le relevé d'abord** (`releve.md`, trois passes `UPDATE_CONSOLE_CEILINGS=1` identiques) : **100** avertissements dans
  `venue-detail-view.test.tsx` (5 par rendu, 19 tests : `AvailabilityCalendar` ×2, `AuthProvider`, `VisitBookingPanel`,
  `BookingRequestPanel`), **1** dans `google-signin.test.tsx` (le test « feature OFF », `AuthProvider`), **0** dans
  `booking-request-panel.test.tsx` (plafond 5) et dans `filter-wizard.test.tsx` (plafond 3). Aucun fichier non exempté bruyant.
- **La cause, désignée par la mesure** : les tests rendaient la page puis rendaient la main AVANT ses chargements asynchrones ; le
  seul test de la fiche qui attendait l'état final n'émettait RIEN. Aucun composant n'écrit un état après démontage : la correction
  est dans les TESTS (le conditionnel (a) de la table ne se réalise pas).
- **Corrigé à la source, jamais réduit au silence** : la fiche se rend dans `act` puis attend un état final lu à l'écran (le panneau de visite qui
  a reçu ses créneaux, lu DANS ce rendu) ; le test « feature OFF » se rend dans `act`, et l'amorçage de session est vérifié appelé.
  ⇒ **0 avertissement** dans la suite client (hors l'étalon, voir plus bas).
- **La garde de `test-setup.ts`** : les QUATRE exemptions sont RETIRÉES — chacun de ces fichiers est gardé comme les autres, son
  premier avertissement le fait tomber ; la garde d'un fichier non exempté échoue désormais par une ASSERTION (même message, D304) ;
  le mécanisme de plafond garde un **cas connu**, `test-setup-calibration.test.ts` (deux lignes émises exprès, exemptées à deux).
- **Rouges avant les corrections** (`0c20c54`) : la garde sans exemption lue contre les tests d'avant — **20 échecs, tous
  AssertionError** (19 dans la fiche, 1 dans le bouton Google) ; l'étalon et les deux fichiers aux plafonds périmés, verts.
- **Harnais** `neutralisation/neutralize-fc9.py` : **2 sur 2 mordues** (K-1 : la fiche rendue NUE, ses 20 tests tombent ; K-2 : le
  bouton Google hors `act`). ⚠ **Mesuré avant d'écrire la cible (D209, n° 2)** : retirer SEULEMENT l'attente de l'état final laisse
  les 20 tests verts — le rendu dans `act` suffit seul avec ces doubles, et l'attente seule aussi ; K-1 retire donc les deux. Le
  panneau de demande et l'assistant n'ont pas de cible : un fichier propre ne fait rougir aucune garde (écrit dans le harnais).
- **Deux harnais d'autres rangs, réorientés par écrit** : `neutralize-e3d1-s8.py` — S8-1 à S8-3 et la mesure de relevé passent sur
  l'étalon : **3/3**, pré-vol inversé tenu (un relevé rougit toujours) ; `neutralize-solid-s7.py` — S7-1 (« vider la liste
  d'exemptions du client fait tomber le fichier qu'elle couvre ») suit l'étalon (extension 1) : **2/2**.
- **Campagnes** (`campagnes.txt`) : 3 sélectionnées — **7 mordues · 0 muette · 5 non mesurées** (E1 à E5 de e3d1-s8, `--int`, le
  paiement : hors de ce que ce lot touche). Relevé statique des ancres : 12 sur 12, 0 écart après la réorientation (1 périmée avant).

## Pas fait, et pourquoi
- La suite **Pro** et ses `act(…)` (entrées `[PRO][P0]` du backlog, `apps/pro/src/test-setup.ts`) : les lots FC sont ceux du client.
- `AvailabilityCalendar` écrit DEUX états par réponse (`setData` puis `setState`) — d'où son ×2 ; les réunir en un seul (l'idiome de
  `ProVenuesProvider`) n'est pas nécessaire à la correction, et changerait un composant sans défaut mesuré : rapporté, pas fait.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Un étalon dans la suite** (`test-setup-calibration.test.ts`, deux `console.error` émis exprès) : sans fichier exempté, le
   mécanisme de plafond (dépasser fait tomber, `A_RELEVER`, le mode relevé) n'aurait plus rien à juger, et ses gardes S8 et S7-1
   n'auraient plus de fichier. L'autre voie — retirer les cibles et garder un mécanisme que plus rien ne mesure — est écartée (S8 :
   « un code que plus personne n'emprunte est un code dont on ne sait plus s'il marche »). Pour Ko : si Ko ne veut aucun bruit
   délibéré dans la suite, l'étalon et le mécanisme se retirent ENSEMBLE.
2. **La garde échoue par une assertion** (`expect`) au lieu d'une `Error` nue — même message ; seul le client change. La garde du
   **Pro** lève toujours une `Error` : l'asymétrie est écrite, à aligner par un lot du Pro.
3. **Le tri des campagnes calculé depuis le SHA de départ** : les fichiers du lot étaient commités avant les campagnes, et l'outil,
   tel quel, n'aurait rien sélectionné. Procédure écrite en tête de `campagnes.txt` (les fonctions mêmes de l'outil, `modifies`
   remplacée).

## Arabe à relire
Aucune chaîne visible n'est ajoutée.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 474/40** · pro 676/43 — 2 305 tests, 160 fichiers ; client
+1 test et +1 fichier sur FC-8 : l'étalon) · build 0 · test:int **616/619** — les 3 rouges sont EXACTEMENT l'ensemble d'entrée
(`etat-entree.md` : MD-1 ×2, F-1, `read ECONNRESET`) : **pas « vert », à jouer à l'intégration** · e2e 0 (73 passés, 1 ignoré, 0
échec ; « token= » restants 0). ⚠ La suite client n'imprime PLUS AUCUN message de plafond ni d'avertissement (l'étalon est à son
plafond, il se tait) ; la suite Pro imprime « PLAFOND ABAISSABLE … venue-wizard.test.tsx : 3 sous 4 » — hors de ce lot.

## Audit de secrets
`audit-secrets-fc9.txt` (scellée) et `tri-audit-fc9.txt` : 4 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture). ⚠ Ce lot n'a AUCUN code de produit (des tests, `test-setup.ts`, un étalon) : le point
3 du contrôle (« rouges avant le code ») est dit sans verdict, et c'est attendu.
