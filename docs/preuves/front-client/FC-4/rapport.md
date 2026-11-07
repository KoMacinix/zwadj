# FC-4 — LE JOUR ET LE CRÉNEAU DÉJÀ DEMANDÉS SE CHOISISSENT, AVEC UN AVIS — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `470dfe1` (FC-3 poussé, local = origin vérifié). Commits du lot : `0c6f35e` (table,
seule) → `58f8e0e` (rouges) → `f9a658a` (extension 1, seule) → `a4b50f5` (code) → le commit de clôture. Méthode NORMALE avec la
règle des montants (D325).

## Fait
- **Relevé AVANT de promettre** (`premisse.md`) : dans le moteur, REQUESTED = au moins une demande PENDING qui recouvre le créneau
  par l'HEURE, « elle ne verrouille RIEN » ; le moteur ne dit pas qui a demandé. L'avis dit donc « d'AUTRES demandes sont déjà en
  attente pour ce créneau » (d'autres que celle qu'on envoie : vrai dans tous les cas), jamais « d'autres personnes ».
- **Une règle** (`apps/client/src/lib/booking-calendar.ts`) : `CHOOSABLE_SLOT_STATUSES` = AVAILABLE et REQUESTED,
  `isSlotChoosable`, `dayState` (libre / demandé / complet) ; `isDaySelectable` en dérive. Le jour ET le créneau la suivent
  (décision du relecteur : le créneau suit le jour). BOOKED et BLOCKED restent fermés.
- **Le calendrier** : un jour qui n'a que des créneaux demandés se choisit, se nomme « {date}, demandes en attente », et porte un
  bord pointillé (`--ink-2`, contraste non textuel ≥ 3:1) ; un jour libre à côté d'une demande reste « disponible ».
- **Le panneau** : le créneau demandé est actif, son libellé dit « demandes en attente » ; le choisir fait paraître l'AVIS
  (`role="status"`), lu dans la disponibilité du serveur. **Le prix** affiché est celui du serveur (test d'égalité avec le
  formateur appliqué à `priceCents`).
- **Catalogues** : trois clés FR et AR (`dayRequested`, `requested`, `requestedNotice`), parité verte ; l'arabe est à relire
  (`arabe-a-relire.md`).
- **Inversion écrite** : `booking-calendar.test.ts`, C-b exigeait un jour `BOOKED, REQUESTED, BLOCKED` inactif — il porte
  désormais `BOOKED, BLOCKED`, et un test neuf exige qu'un REQUESTED suffise.
- **Rouges avant le code** (`58f8e0e`) : panneau 5 échecs par AssertionError (2 verts de non-régression), calendrier 1 échec.
- **Harnais** `neutralisation/neutralize-fc4.py` : **7 sur 7 mordues** (S-1 à S-3 la règle, J-1 le calendrier, K-1 à K-3 le
  panneau), titres relevés en découverte.

- **Campagnes touchées** (`campagnes.txt`, 13 campagnes, tirées surtout par les catalogues) : **283 mordues**. Le tri a arrêté
  **r29** sur deux ancres que CE lot a périmées (R29-1, R29-7) : **réorientées par écrit** dans `neutralisation/neutralize-r29.py`
  (même faute, nouveau site), r29 rejouée **15/15**. Deux arrêts qui ne viennent PAS de ce lot, prouvés et écrits dans
  `ancres-campagnes.txt` : **r30** (ancre R30-4 écrite avec un CRLF en dur, injouable dans un dépôt en LF — à jouer à
  l'intégration) et **r33 M-12** (garde de fuseau muette sur un serveur à l'est ou à l'heure de Greenwich : rouge sous
  `TZ=America/Los_Angeles`, verte en UTC et en UTC+1).

## Pas fait, et pourquoi
- L'aperçu d'acompte du panneau (calcul côté navigateur, existant) : hors session (§ 4) ; ce lot ne le touche pas.
- Les prix restent formatés en `fr` dans le panneau arabe : FC-6.
- Les specs e2e `r25` et `r26` choisissent le premier jour **libre** (`JOUR_LIBRE` = message `dayFree`) : un jour seulement
  demandé ne porte pas ce nom, elles ne changent pas ; aucune spec « r29 » n'existe (lecture adverse FC4-5).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Un jour qui porte un créneau libre ET un créneau demandé reste « disponible »** (pas « demandes en attente ») : le libre prime
   pour le nom du jour ; l'avis paraît quand le créneau demandé est choisi. Pour Ko : rien à faire.
2. **Le jour demandé a un bord pointillé** (marque visuelle discrète, sans accent) : l'arbitrage disait « avec un avis » ; la
   marque fait voir à l'œil ce que le lecteur d'écran entend. Pour Ko : à regarder ; le retirer est une règle CSS.
3. **Deux cibles d'un harnais d'un AUTRE rang (r29) réorientées** par ce lot, faute de quoi la campagne s'arrêtait : même faute,
   nouveau site, commentaire « RÉORIENTÉE (FC-4) » sur place. Pour Ko : à l'intégration, r29 se rejoue (15/15 ici).
4. **Texte de l'avis** : « D'autres demandes sont déjà en attente pour ce créneau. La salle choisit entre les demandes : vous pouvez
   envoyer la vôtre. » Pour Ko : à relire (FR) et à faire relire (AR).

## Limite écrite
- L'**aspect** (bord pointillé du jour demandé, cadre de l'avis) n'a PAS été regardé dans un navigateur dans ce lot : les tests
  mesurent le comportement et les noms ; la CSS est vérifiée pour le contraste (calcul) seulement.

## Arabe à relire
`arabe-a-relire.md` : `dayRequested`, `requested`, `requestedNotice`.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 424/34** · pro 653/41 — 2 232 tests, 152 fichiers ;
client +10 tests, +1 fichier) · build 0 · test:int 614/619 — les 5 rouges sont dans l'ensemble de concurrence d'entrée (MD-1 ×2,
F-1, F-2, F-3 : environnement) : **pas « vert », à jouer à l'intégration** · e2e 0 (69 passés, 1 ignoré, 0 échec — `r25` et
`r26` compris).

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
