# FP-1 — LA QUANTITÉ (PER_UNIT) ET LE PALIER (TIERED) AU COMPTOIR — rapport · **PRÊT À INTÉGRER** (méthode RENFORCÉE)

Session `front-client`, 06/11/2026. Départ `aec8141` (FC-12 poussé, local = origin vérifié). Commits du lot : `5178a73` (table, seule)
→ `3359873` (les modes de défaillance, avant tout code) → `27f483a` (tests, rouges) → `f54f6b5` (extension 1, seule) → `fa69f4a` (le test corrigé, rouge rejoué) → `0778bb6` (code) → le commit de clôture.
**Méthode RENFORCÉE** : la donnée qui entre dans le calcul d'un montant par le serveur (branche 5, D311) ; l'écran ne fait que la
SAISIR (règle des montants, D325) — aucun montant n'est calculé, converti ni affiché avant le devis.

## Fait
- **Le défaut, mesuré avant de coder** : l'écran des prestations envoyait `{ serviceId }` SEUL ; le contrat
  (`bookingServiceChoiceSchema`) exige `tierId` en TIERED et `quantity` en PER_UNIT : une prestation « par formule » ou « à l'unité »
  cochée au comptoir faisait REFUSER le devis par le serveur (400), sans que l'écran dise pourquoi.
- **Les modes de défaillance d'abord** (`modes-de-defaillance.md`, commité AVANT tout test et tout code) : onze, MD-1 à MD-11, chacun
  avec sa garde prévue.
- **Une règle PURE** (`apps/pro/src/dashboard/walkin-services.ts`, D187) : `choixDePrestation` rend le choix tel que le contrat
  l'attend — `{ serviceId }` (FIXED, PER_GUEST), `{ serviceId, tierId }` (TIERED : un palier ACTIF de CETTE prestation, jamais un
  palier par défaut), `{ serviceId, quantity }` (PER_UNIT : un ENTIER saisi tel quel, dans les bornes du CATALOGUE, incluses) — ou
  `null` quand le détail manque ; `choixDuDevis` rend les choix des prestations cochées et les identifiants de celles qui ne peuvent
  pas partir (jamais omises en silence). Les types viennent de l'autorité (`ServicePricingType`), les choix sont confrontés au
  CONTRAT RÉEL (`safeParse`) par les tests.
- **L'écran ne fait que saisir** : sous chaque prestation cochée qui l'exige, la liste des paliers actifs (aucun choisi d'avance) ou
  le champ de quantité (bornes `min`/`max` du catalogue, nom de l'unité dans la langue de la page) ; « Voir le devis » et « Calculer
  le devis » restent INACTIFS tant qu'un détail manque, et la raison est DITE (« Il manque une formule ou une quantité : … ») ;
  décocher EFFACE le détail ; changer un détail jette le devis affiché ; le corps de la création ET de la révision passent par la
  même règle. Aucun prix, aucun total n'est calculé à l'écran.
- **Rouges avant le code** (`27f483a`) : **17 sur 17** tests neufs en `AssertionError` (10 de la règle, 7 de l'écran), les 158 d'avant
  verts ; empreintes sha256 dans la pièce.
- **Harnais** `neutralisation/neutralize-fp1.py` : **18 sur 18 mordues** (`neutralisation/sortie.txt`) — sept sur la règle pure (un palier par défaut, un palier inactif accepté, une
  quantité qui n'est plus un entier strict, la borne basse puis la borne haute du catalogue ignorées, un palier envoyé à qui n'en veut pas,
  une prestation incomplète omise en silence) et onze sur l'écran (le corps qui ignore la règle, la révision qui perd les choix, décocher
  qui n'efface pas, un détail changé qui ne jette pas le devis, « Voir le devis » non retenu, la raison tue, l'unité et le palier hors
  de la langue, un palier inactif proposé, les deux bornes du champ). **⚠ La première passe en rendait 17 sur 18 : P-3 MUETTE** —
  « 1e3 » était rattrapée par la borne haute du catalogue, donc le test ne distinguait pas un entier strict d'un `Number()` ; deux saisies
  EN bornes (« 1e1 », « 0x10 ») ont été ajoutées AVANT le code (extension 1, rouge rejoué), puis le harnais entier rejoué.
- **Campagnes** (`campagnes.txt`) : 10 campagnes sélectionnées, **397 mordues · 1 muette · 0 non mesurée** (4 365 s) : fp1 18/18, fc6 12/12, journey 7/7, r32 65/65 (le
  comptoir), r38 46/46, r39 35/35, r41 54/54, r42 22/22, r43 52/52 ; r33 86/86 + **M-12 MUETTE**, la garde de fuseau d'un serveur en UTC
  (prouvée d'environnement en FC-4), comme en FC-6, FC-8 et FC-12 — ce lot ne touche pas la date d'un événement. Relevé statique des
  ancres : 479 sur 479, 0 périmée, 0 CRLF.

## Pas fait, et pourquoi
- **La session ADVERSE** (la forme de revue d'un lot du chemin de l'argent : une session ouverte à froid qui tente de casser le code,
  le relevé de Ko qui décide — D302, D303) **n'a pas eu lieu** : elle ne se joue pas dans cette session. ⛔ **Elle est DUE avant
  l'intégration de ce lot** ; la liste des modes de défaillance et le harnais sont ses points de départ.
- Aucun montant à l'écran avant le devis : un prix de palier ou d'unité lu du catalogue serait un affichage de montant — hors lot.
- Le détail d'une prestation n'est pas saisi hors du comptoir (la page de demande du CLIENT choisit déjà palier et quantité : lot
  antérieur).
- Trois mutations sans cible, écrites dans le harnais : la garde redondante de `confirmStep` (équivalente), `aria-describedby` du
  bouton, la remise à zéro des détails.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Le palier se choisit dans une liste déroulante, la quantité dans un champ numérique** (au lieu de boutons radio ou d'un
   pas à pas) : le moins de code, le clavier et le lecteur d'écran natifs. Pour Ko : à regarder ; changer la forme est une affaire
   d'écran, la règle ne bouge pas.
2. **« Voir le devis » est retenu (bouton inactif) plutôt que d'accepter puis refuser au calcul** : le pro voit la raison AVANT.
3. **Une prestation cochée qui a disparu du catalogue compte comme un manque**, jamais omise en silence : le devis ne change pas
   sans que l'écran le dise.
4. **Le libellé « Formule »** pour un palier (le type s'affiche déjà « Par formule ») ; l'arabe « الصيغة » proposé, à relire.

## Arabe à relire
`arabe-a-relire.md` : huit clés neuves, `venue.ui.walkin.tierLabel` à `servicesMissing`.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · client 488/41 · **pro 693/44** — 2 336 tests, 162 fichiers ; pro +17 tests et
+1 fichier sur FC-12) · build 0 · test:int **612/619** — les 7 rouges sont DANS l'ensemble d'entrée (`etat-entree.md` : MD-1 ×2, F-2 en
`ECONNRESET`, puis F-3/F-4 ×2 et F-6 ×2 en `deadlock detected`, à la suite) et dans des fichiers que ce lot ne touche pas : **pas « vert », à
jouer à l'intégration** · e2e 0 (75 passés, 1 ignoré, 0 échec ; « token= » restants 0).

## Audit de secrets
`audit-secrets-fp1.txt` (scellée) et `tri-audit-fp1.txt` : 4 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
