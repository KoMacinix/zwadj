# FP-3 — UNE RÉVISION REPREND LA COPIE DU NOM DE LA VERSION COURANTE (fiche non liée) — rapport · **PRÊT À INTÉGRER** (avec une limite du serveur, dite plus bas)

Session `front-client`, 06/11/2026. Départ `8432070` (FP-2 poussé, local = origin vérifié). Commits du lot : `2efecd1` (table, seule) →
`513a2a5` (tests, rouges) → `5091b0b` (code) → `87029e0` (extension 1, seule) → `1c97c65` (le test ajouté, vert à vide) → `7b4ba4d` (le harnais) → `519e6db` (extension 2, seule) → `f0ee431` (quatre harnais d'autres rangs) → le commit de clôture. Méthode NORMALE : la copie du nom d'un devis est une donnée d'identité, jamais un montant ; l'écran n'envoie que des noms.
Ne touche ni L36-2 (un brouillon n'a ni fiche ni nom : la règle n'est appelée que hors brouillon, comme avant) ni K-5.

## Fait
- **La prémisse, vérifiée AVANT de coder** : le serveur ÉCRIT lui-même que « une révision porte le corps ENTIER, la copie du nom comprise
  (celle que l'écran a préremplie du devis précédent, DB-17) » et ne substitue pas la fiche vivante. Le défaut, lu : l'écran bâtissait le corps
  d'une révision depuis ses seuls champs (`copiePourDevis(nomsEffectifs, fiche.id)`), qui ne connaissent pas la copie que la boîte de langue
  (K-5) avait COMPLÉTÉE sur la version précédente ; la version N+1 la perdait, et K-5 reposait sa question à la remise suivante dans cette langue.
- **Une règle PURE** (`walkin-client.ts`, `copiePourRevision`, D187) : comme `copiePourDevis`, mais un nom ABSENT de l'écran est repris de la
  version courante ; un nom TAPÉ l'emporte ; la copie reprise est celle de la version, jamais inventée.
- **L'écran** (`walkin-journey.tsx`) : la dernière version que le serveur a rendue est gardée À PART (une référence mise à jour par un effet sur
  `quote`) — parce que toute modification jette le devis affiché (`invalidate` : `quote` redevient `null`), alors que la révision a besoin de la
  copie qu'il portait. Le corps d'une révision passe par la règle ; la création (aucune chaîne) reste `copiePourDevis`.
- **Deux cas où la version n'est JAMAIS reprise** : une **fiche liée** (le serveur refuse un nom qu'elle n'a pas, voir la limite) et **une autre
  fiche** que celle de la version (la copie de l'ancien client ne passe pas au nouveau).
- **Rouges avant le code** (`513a2a5`, pièce `rouges/rouge-pro.txt`, empreintes sha256) : **11 sur 12** tests neufs en `AssertionError` (8 de la
  règle, 3 de l'écran), le 12ᵉ (la fiche liée n'en reçoit rien) **vert à vide — bras de calibration**, que le harnais mord ; les 170 d'avant verts.
  Un premier essai avait un nom de test avec un point que la règle de nom refuse : l'échec était une requête qui lève, pas une assertion ; corrigé
  AVANT la mesure versée.
- **Un test ajouté APRÈS le code** (extension 1, `rouges/rouge-pro-v2.txt`) : « Annuler » puis un nouveau devis pour la même fiche ne reprend pas
  la copie de l'ancien. Il est vert sur l'état d'avant (la création n'a jamais repris de copie) : pas de rouge à lire, rejoué à vide, et la cible
  E-4 du harnais le fait mordre. La règle « les rouges avant le code » ne pouvait pas s'y appliquer ; la table l'a déclaré avant sa pièce.
- **Harnais** `neutralisation/neutralize-fp3.py` : 10 sur 10 mordues, lues en assertion (R-1 à R-6 sur la règle pure, E-1 à E-4 sur l'écran) ; pré-vol vert (175 + 8 tests) ; arbre rendu à son état de départ. Quatre mutations sans cible, ÉCRITES dans l'en-tête du harnais : retirer `version === null` fait lever un `TypeError` (un plantage, pas une assertion, D304) ; le rognage de la copie reprise est une mutation ÉQUIVALENTE (`copiePourDevis` rogne à son tour) ; les deux gardes de lien à la chaîne ne se mesurent que retirées ensemble (E-4).
- **Campagnes** (`campagnes.txt`) : 14 sélectionnées sur 54 (le tri est calculé depuis le SHA de départ, le code étant déjà commité — procédure écrite en tête). **419 gardes mordues · 1 muette · 0 non mesurée.** La muette est M-12 de r33 (la garde de fuseau d'un serveur en UTC, d'environnement, comme aux lots précédents). ⚠ **Quatre harnais d'AUTRES rangs ont dû être remis d'aplomb, et la série a d'abord rendu 1 ou 2 pour eux sans jouer une cible** : `r41` (J-6) et `r43` (P-3) — leur ancre, la ligne du corps du devis, tient sur trois lignes depuis ce lot (réorientées, même faute) ; `act-plafonds` et `horloge` — la constante de comptage 158 (le fichier de tests en compte 175 : FP-1, FP-2 et FP-3 cumulés ; ils n'avaient pas été sélectionnés par le tri des deux lots précédents). Déclarés par l'extension 2 de la table AVANT leur correction ; rejoués en entier : r41 54/54, r43 52/52, et — ces deux anciens harnais exigeant des fichiers entièrement en CRLF, ce que ce conteneur en LF ne donne pas — act-plafonds 4/4 et horloge 2/2 sous CRLF simulé (`crlf-simule.py`, fichiers rendus à l'identique). Relevé statique des ancres : 495 sur 495, 0 périmée (12 harnais importables).

## ⚠ La limite du serveur — pourquoi le lot ne dit pas « tout est repris »
`copieDuNomPourDevis` (`apps/api/src/clients/pro-client-policy.ts`) REFUSE (409 `CLIENT_RECORD_LINKED`) un nom que la fiche LIÉE à un compte n'a
pas : « le nom manquant d'une fiche liée se complète sur le DEVIS seulement, par la boîte de langue ». Pour une fiche **liée**, la copie arabe
complétée par K-5 sur la version N **ne peut pas** être reprise par la révision N+1 sans que le serveur la refuse : la révision ne la porte donc
PAS (test dédié, écran et règle), et K-5 reposera sa question après une révision. Ce n'est pas un défaut de l'écran : c'est la règle du serveur
(`apps/api`, hors session). Pour Ko : si la copie doit survivre à la révision aussi pour une fiche liée, c'est un changement de la règle du
serveur (la révision accepterait la copie de la version précédente), donc un lot d'API.

## Pas fait, et pourquoi
- Aucune copie reprise pour une fiche liée, ni pour une autre fiche (ci-dessus).
- Le nom corrigé par le pro n'est pas remonté à la fiche : aucune écriture de fiche après sa création (K-2, hors lot).
- Aucune clé arabe ajoutée : aucune chaîne visible n'est neuve.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **La version gardée est une référence d'écran**, pas un état : elle n'est lue qu'au moment d'envoyer une révision, jamais rendue ; elle évite un
   rendu de plus et suit toutes les écritures de `quote` par UN seul effet (sept endroits écrivent `quote` : le calcul, la conversion, la remise, la relecture de FP-2, la complétion du nom, la promotion, la remise à zéro).
2. **Un nom tapé l'emporte sur la copie de la version** (les noms corrigés vont au devis) ; l'autre écriture est reprise. Pour Ko : si le nom tapé
   devait toujours être écarté au profit de la copie du serveur, c'est une ligne de la règle et un test.
3. **Fiche liée : aucune reprise** (la règle du serveur), au lieu d'envoyer et de faire échouer la révision en 409.

## Arabe à relire
Aucune clé ajoutée.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
`portes/resume.txt` (HEAD `f0ee431`, six portes lancées l'une après l'autre, la base remontée après le redémarrage du worker) :
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm build` **0**.
- `pnpm test` **0** : api-client 59/6, api 1 096/71, client 488/41, pro **711/45** (le lot ajoute 13 tests : 8 de la règle pure, 5 de l'écran).
- `pnpm test:int` **1 — PAS VERT, à jouer à l'intégration** : 610 passés, **9 rouges** sur 619, tous dans `pro-clients.int-spec.ts` (MD-1) et
  `quote-numbering.int-spec.ts` (F-1, F-2, F-3/F-4, F-6) — **la classe de concurrence de l'ensemble d'entrée** (`etat-entree.md` : `read ECONNRESET` sur des
  requêtes simultanées, puis `deadlock detected` en cascade). Aucun fichier de ces deux specs, ni de `apps/api`, n'est touché par le lot ; le nombre de rouges
  varie d'une passe à l'autre (3, 8, 7, 10 aux lots précédents, 9 ici). **Dit comme tel : `test:int` n'est pas déclaré vert.**
- `pnpm test:e2e` **0** : 75 passés, 1 ignoré, 0 échec (« token= » restants dans la copie versée : 0).

## Audit de secrets
`audit-secrets-fp3.txt` (scellé) : 4 881 fichiers parcourus, 4 735 audités, 146 exclus, 1 057 alertes ; tri différentiel contre FP-2 (`tri-audit-fp3.txt`) : **8 alertes nouvelles lues au contexte, 0 valeur réelle** (des phrases qui COMPTENT les jetons restants ou NOMMENT le motif du contrôle, un nom de champ, le titre d'un test existant). Le `git grep` du motif de jeton sur HEAD : 0 (relevé à la clôture).

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
