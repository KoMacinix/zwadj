# FC-6 — LES DATES ET LES NOMBRES EN ARABE EN `ar-DZ`, PAR UNE SEULE RÈGLE — rapport · **PRÊT À INTÉGRER** (une partie ARRÊTÉE)

Session `front-client`, 05/11/2026. Départ `b595bde` (FC-5 poussé, local = origin vérifié). Commits du lot : `90d3ae2` (table,
seule) → `69440ae` (relevé navigateur, prémisse, rouges) → `039444b` (extension 1, seule) → `43c938e` (code) → `610a477` (extension 2,
seule) → `ac36580` (extension 3, seule : le conditionnel `crlf/r30.txt` mis en ligne de table) → le commit de clôture.
Méthode NORMALE avec la règle des montants (D325) : un montant affiché vient du serveur ; ce lot n'en calcule aucun, il ne change
que la LANGUE de leur mise en forme.

## Fait
- **Le relevé navigateur d'abord**, comme Ko l'exigeait (`releve-ar-dz.txt`, outil `releve-ar-dz.mjs`, Chromium 153 du conteneur,
  calibré) : `ar` nomme août « أغسطس », `ar-DZ` « أوت » (et « جانفي, فيفري, أفريل, ماي, جوان, جويلية… ») ; le numéro du jour, les
  noms de jours et la date en chiffres sont identiques ; **`fr` = `fr-DZ` sur les neuf formats de date des deux applications** ;
  `ar-DZ` groupe les milliers par un point (« ‏235.000 د.ج.‏ »).
- **UNE règle** : `intlLocale(langue)` (`packages/types/src/intl-locale.ts`) — `ar` → `ar-DZ`, sinon `fr-DZ` — que suivent TOUS
  les formateurs de date et de nombre des deux applications : `formatDZD` et `formatRating` (qui l'écrivaient chacun en ligne),
  le prix du calendrier de la fiche (idem), et les neuf `Intl.DateTimeFormat` (client : numéro du jour, date longue, en-têtes,
  mois ; pro : date du devis, mois et jours des règles de prix, en-têtes, mois). Le catalogue et les routes restent `ar`.
- **La langue passe** : les 20 montants qui s'affichaient sans langue — donc en français au milieu d'une page arabe — la
  reçoivent (panneau de demande, prix de base de la fiche ; au pro, catalogue des prestations et prix d'un créneau du calendrier).
- **Les deux dates de demande de suppression** (client, pro) ne passent plus par `toLocaleDateString()` — langue ET fuseau du
  NAVIGATEUR — mais par `formatInstantDate` : langue de la page, fuseau d'Alger (`ALGIERS_TIME_ZONE`, D48).
- **D56 et D57 tenus** : la semaine ne se lit nulle part dans la locale (`ar-DZ` dit « samedi ») ; aucune heure ne passe par `Intl`.
- **Gardes** : `intl-locale-guard.test.ts` (source, deux applications et trois paquets, arbre TypeScript : montant ou note sans
  langue, formateur `Intl` hors de la règle, date sans fuseau explicite, `toLocale…String` — calibrée à deux bras) ;
  `intl-locale.test.ts` (client) et `intl-locale-pro.test.ts` (pro) : la règle et les mois en `ar-DZ`, attendus tirés des MOTS de
  Ko (`ar-DZ`), jamais d'`intlLocale` ; `booking-request-panel-montants.test.tsx` : page arabe, les montants du SERVEUR en `ar-DZ`
  (ce que la garde de source ne voit pas : une langue écrite en dur) ; `quote-amount.test.ts` : l'écran du devis suit le PDF.
- **Deux tests existants suivent les mots de Ko** (`booking-date-picker.test.tsx`, `walkin-journey.test.tsx`) : leurs attendus en
  arabe venaient d'`Intl` en `ar` ; ils viennent d'`ar-DZ`. La liste des noms interdits en dur du sélecteur compte aussi `ar-DZ`.
- **Rouges avant le code** (`69440ae`) : client 9 échecs, pro 5 — tous par AssertionError ; la garde relevait **34 fautes**.
- **Harnais** `neutralisation/neutralize-fc6.py` : **12 sur 12 mordues** — dont F-1 (la règle) dans les DEUX consommateurs,
  F-9 (une langue écrite en dur : la garde de source ne la voit pas, le test de rendu si) et F-12 (une MESURE dans
  `apps/api`, restaurée : le PDF passe une langue, l'écran ne le suit plus).
- **Campagnes touchées** (`campagnes.txt`, 15 campagnes, avant le commit du code) : **427 mordues** ; deux arrêts
  d'ENVIRONNEMENT, aucun de ce lot : r30 (ancre R30-4 écrite en CRLF) et r33 M-12 (fuseau UTC du conteneur) ; r25 : 4 cibles
  `--int`/`--e2e` hors de la commande par défaut.
- **Six ancres d'autres rangs périmées par ce lot, réorientées par écrit** (extension 1, commitée seule avant) : fc5 W-1/W-2
  (l'import de la semaine reçoit `intlLocale`) et r30 R30-1 à R30-4 (les formateurs passent par la règle) — même faute mutée.
  **Relevé statique** (`ancres-campagnes.txt`) : 521 cibles examinées sur 521, 0 périmée après réorientation, 1 CRLF (R30-4).
- **r30 joué sous CRLF simulé** (`crlf/r30.txt`) : **8/8**, dont les quatre cibles réorientées.

## ⛔ ARRÊTÉ pour une partie : les montants d'un DEVIS
Le PDF du devis (`apps/api/src/documents/quote-document.ts`) imprime ses montants par `formatDZD(cents)` SANS langue — le format
français, même en arabe —, et D326 (décision 1) exige que le devis imprimé ne soit pas « différent de celui affiché à l'écran ».
Passer l'écran du devis en `ar-DZ` sans le PDF ferait mentir cette décision ; passer le PDF touche `apps/api`, hors de la session.
⇒ **L'écran du devis (récapitulatif du comptoir, liste des devis) garde le format français, EXPLICITEMENT** :
`QUOTE_AMOUNT_LOCALE` (`@zwadj/types`), confrontée par `quote-amount.test.ts` aux appels du PDF relus dans sa source. **Décision
due à Ko** : passer l'écran ET le PDF en `ar-DZ` ensemble (un lot qui touche `apps/api`), ou garder le français pour le devis.

## Pas fait, et pourquoi
- Le PDF garde sa propre écriture de la règle pour ses DATES (`ar-DZ` / `fr-DZ`, déjà juste) : `apps/api`, hors session.
- Les nombres qui ne passent par AUCUN formateur (une capacité « 400 », un compte) restent tels quels : chiffres latins, comme
  `ar-DZ` les rend ; l'arbitrage visait la mise en forme `Intl`.
- L'aperçu d'acompte du panneau reste RECALCULÉ dans le navigateur (hors session, § 4) : ce lot n'en change que la langue
  d'affichage — le test des montants ne compare pas l'acompte, seulement ce que le serveur rend.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **La règle vaut aussi pour le français : `fr-DZ`** — mesuré sans effet sur les dates (mêmes octets, neuf formats), déjà la
   règle des montants. Une règle, pas deux. Pour Ko : rien à voir à l'écran.
2. **La date d'une demande de suppression s'écrit en chiffres, dans la langue de la page, à l'heure d'Alger** (elle suivait le
   navigateur). Pour un visiteur en Algérie, rien ne bouge. Pour Ko : rien à faire.
3. **Les montants d'un devis restent en français, explicitement** (partie arrêtée ci-dessus) : décision due à Ko.
4. **Deux campagnes d'autres rangs réorientées** (fc5 W-1/W-2, r30 R30-1 à R30-4 : même faute, nouveau site, note sur place).

## Défauts croisés — rapportés, non corrigés (hors lot)
- **Le catalogue des prestations du PRO affiche les noms de PALIER et d'UNITÉ en français même en arabe** (`labelFr`,
  `unitNameFr` dans `services-section.tsx`) — la faute que FC-3 a corrigée côté client ; ce lot n'y a passé que la langue des
  montants.

## Arabe à relire
Aucune clé neuve. Les noms de mois algériens viennent du moteur (`Intl`, CLDR `ar-DZ`), pas du catalogue.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 457/39** · **pro 676/43** — 2 288 tests, 159 fichiers ;
client +16 tests et +3 fichiers, pro +8 tests et +2 fichiers depuis FC-5) · build 0 · test:int **608/619** — 11 rouges, tous dans
les deux fichiers de CONCURRENCE (`pro-clients` MD-1 ×2 ; `quote-numbering` F-1 à F-8, `read ECONNRESET` puis `deadlock detected`
en cascade). Trois portent des titres hors du libellé de l'ensemble d'entrée (F-6 « le prochain numéro SUIT le plus grand »,
F-7, F-8) : **rejoués SEULS sur le code du lot** (`portes/test-int-isole.txt`, extension 2), les deux fichiers rendent 46/52 —
les 6 rouges sont TOUS dans l'ensemble d'entrée, **F-6, F-7 et F-8 passent** : la cascade est d'environnement (ce lot ne touche
pas `apps/api`). **Pas « vert », à jouer à l'intégration** · e2e 0 (69 passés, 1 ignoré, 0 échec ; « token= » restants 0).

## Audit de secrets
`audit-secrets-fc6.txt` (scellée) et `tri-audit-fc6.txt` : 3 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
