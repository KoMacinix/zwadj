## Session du 25/09/2026 — D306 · rang 23 (reste ouvert), SESSION ADVERSE de 23a, lot DOCUMENTAIRE : le rouge rejoué, chaque garde neutralisée à la main, et quatre gardes que la suite ne mesure pas

⛔ **NUMÉRO PRIS EN LISANT LE REGISTRE** : sa dernière ligne portait **D305** ⇒ **D306** ; « D306 » : **0** occurrence dans
les fichiers suivis à `HEAD` (`git grep`). ⇒ **RANG 23, sous-lot 23a, forme de revue de D302** : une AUTRE session,
ouverte à froid, tente de casser 23a ; **elle ne corrige rien, elle rapporte** ; le relecteur (chat) décide ; Ko garde le
veto. **SHA de départ : `b715943`** — `HEAD` = `origin/main` après `git fetch`, arbre propre, `a-verser/` vide ; parent
de `b715943` = `6e87430` (**vérifié**, `git rev-parse HEAD^`). **Documentaire** : `docs/preuves/D306/` et
`ZWADJ_CONTINUITE.md` seul (cette section, le registre, l'ordre des rangs, le point d'entrée du rang 23 — périmètre
d'écriture fixé par la consigne de Ko) — **compteur de lots de code non certifiés : UN, inchangé** (D283 amendé par
D292). ⚠ `docs/preuves/D306/` porte du TypeScript et du Python JETABLES (une sonde, des outils) : **aucune porte ne les
lit** — relevé : 27 fichiers de configuration suivis (`tsconfig*`, `vitest.config*`, `eslint.config*`,
`playwright.config*`), **un seul** cite `docs`, et c'est une pièce de D304. La sonde et les mutations ont tourné **depuis
`apps/api`**, configuration d'intégration réelle, `zwadj_test` **recréée vide** par le `globalSetup`. **Aucune porte,
aucune campagne du dépôt** : aucun code n'a changé ; les sources mutées ont toutes été **restaurées, empreinte à
l'appui**.
⛔ **Aucun verdict d'ensemble** (consigne) : chaque tentative est rangée **TIENT**, **CASSE** ou **NON CONCLUANT** — et
« casse » dit ce qui a cassé : le comportement, ou seulement sa garde. **Le relecteur décide.** **Aucun correctif n'est
proposé** : un défaut se décrit et se reproduit.

### D306 — la reprise (forme allégée)

| question | réponse | lue où |
|---|---|---|
| rang | 23 **ouvert** ; « 23a CODÉ LE 25/09/2026 (D305) — ATTEND LA SESSION ADVERSE ; COMPTEUR À UN » ; dernière ligne « ⇒ RANG N » : « **RANG 24 : EN ATTENTE D'ARBITRAGE DE KO** » | point d'entrée du rang 23, ordre des rangs |
| numéro | dernière ligne du registre : **D305** ⇒ **D306** | registre |
| compteur | **UN** (23a) | ordre des rangs, ligne D305 |
| synchronisation | `HEAD` = `origin/main` = `b715943` ; arbre propre ; `a-verser/` vide ; `HEAD^` = `6e87430` | `git` |
| fichiers de 23a | `git diff --name-only 6e87430 b715943` hors `docs/preuves/` : **10**, exactement le tableau « les fichiers » de D305 | `git` |
| état machine | secteur, `node` = 0, `chrome` = 15 ; calibration **rejouée** (CPU 22 → 100 %, PERF 96,6 → 146,8 %) | `docs/preuves/D306/etat-machine/00-entree-calibree.txt` |

**État machine pendant les mesures** (`etat-machine/01` à `03`) : 19:08, 19:27, 19:31 — **secteur**, `node` = 0 avant
chaque mesure, `chrome` = 15, CPU médian 11 à 17 %, PERF 79 à 82 %. ⚠ **Aucun verdict de ce lot n'est une durée** : les
courses se prouvent par `pg_blocking_pids` (sondage jusqu'à 5 s, qui LÈVE si personne n'attend), les sondes P6 et P10
par un code SQLSTATE (`40P01`, `55P03`) — `deadlock_timeout` relu par `SHOW` (1 s, défaut du serveur), `lock_timeout`
posé à 2 s. Un relevé sous charge changerait des durées, pas ces codes (*inférence*, non éprouvée sous charge).

### D306 — la lecture adverse depuis la clôture de D305, en entier

Relue à `b715943` : la section D305, le point d'entrée et le cadrage du rang 23 (§ 2, § 5, § 6, § 8), le bloc D305 de la
méthode renforcée, les ajouts de D305 à `AGENTS.md`, les pièces `docs/preuves/D305/`. **Chaque chiffre repris a été
relu dans sa pièce, par le lecteur de CETTE session** — `outils/lire.py`, écrit sans reprendre celui de D305, calibré
sur 15 sorties brutes dont la réponse a été lue à la main (deux bras : assertion ⇒ morsure ; plantage, `Error`, délai,
import, fichier vide, crochet, titre absent, titre ambigu ⇒ non prouvée) et sur l'unicité de chaque préfixe de titre :
**33 cas, 0 manqué** (`outils/calibrer-lire-sortie-3.txt` ; versions 1 et 2 à côté, avant l'ajout de titres).
**Ce qui tient, confronté aux pièces** :
- **portes** — les six à **0** ; API **663/58**, api-client 36/3, client 287/20, pro 347/28 ; intégration **441/441, 36
  fichiers**, 298,17 s ; e2e **34 réussis, 1 ignoré** (`D305/portes/*.log`, `*.code`) ;
- **campagnes** — `rang23` 5/5, `s11a` 18/18, `s11b` 9 + 4 non mesurées (sortie 3), `solid-s3` 6/6, `solid-s5b` 5/5 ;
- **audit** — 972 = 935 + 37, 108 alertes ; final 974 = 936 + 38, 108 ; une alerte neuve triée ;
- **S5b** — `s5b1-avant-T5` : **47/47** ; `s5b1` : **un** titre en échec, T5, `AssertionError` ; `s5b2` : **un** titre,
  T4, `AssertionError: expected 'BOOKING_BLOCKED_PERIOD' to be 'BOOKING_STATUS_CONFLICT'` ;
- **le harnais** `neutralize-rang23.py` — conforme à ce que la section dit ; `verifier-mutations.py rang23` rejoué :
  **POSEES 5 · NON POSEES 0** (`lecture-adverse/verifier-mutations-rang23.txt`) ;
- **les fichiers** — le diff depuis `6e87430` est exactement les dix énumérés, plus `docs/preuves/D305/`.
**Ce qui ne tient pas, ou manquait** :
1. ⚠ **« 8 copies sur 8 identiques par empreinte » ne se rejoue plus, et ce n'est pas un défaut de copie.** Les pièces
   `D305/neutralisation/` datent de **00:49** (passe de 00:44–00:49) ; les journaux locaux homonymes ont été **réécrits
   à 01:00–01:03** par `lancer-campagnes.py`, pendant la passe des portes (chronologie de D305 : campagnes
   00:59–01:11) — **mesuré** : 7 homonymes, **7 empreintes différentes**. ⇒ La campagne `rang23` **comptée dans la table
   des portes** (5/5) est celle de 01:00, **dont les sorties n'étaient pas versées**. Copiées ici octet pour octet
   (`lecture-adverse/journaux-rang23-passe-des-portes/`, `EMPREINTES.txt`) et **lues : 5 morsures sur 5, pré-vols
   verts** — comme la passe versée (`lecture-adverse/lecture-rang23-deux-passes.txt`). **Tient au fond ; la pièce versée
   n'était pas celle du chiffre cité.**
2. ⚠ **T3 n'asserte ni le `code` ni le `status` de son 400**, seulement `message.message` — mesuré par X14 (partie D).

### D306 — partie A : le ROUGE, rejoué indépendamment (consigne, point 1)

**Méthode** : les sources d'avant posées puis restaurées (`outils/rouge-sources-avant.py`, journal `rouge/journal.txt`) —
`git checkout 6e87430 --` des TROIS fichiers de code de 23a, les tests de `HEAD` gardés, les deux mesures, `git checkout
HEAD --` en `finally`. **Parent** : `HEAD^` = `6e87430` ⇒ OUI. **Posé** : `git hash-object` sur disque = blob de
`6e87430`, 3 sur 3. **Restauré** : SHA-256 après = avant, 3 sur 3 ; `git status` des trois fichiers vide.
| mesure | sources d'avant (`6e87430`) | `HEAD` |
|---|---|---|
| `bookings.int-spec.ts` | **48 collectés, 3 en échec, 0 échec de fichier** — T1 `expected 201 to be 409` (ligne `ACCEPTED`), T2 `expected 201 to be 409` (`ACCEPTED`, motif d'annulation posé), T3 `expected 200 to be 400` (`CANCELLED`, motif `null`), **les trois en `AssertionError`** ; T4, T5 verts (préservation) | **48/48** |
| `booking-transitions.spec.ts` | **23 collectés, 4 en échec**, U1, U2 et les deux gardes de bord en `TypeError: (0 , writableFrom) is not a function` | **23/23** |
⇒ T1, T2, T3 : **TIENT** (rouge lu, titres attendus, `AssertionError` ; puis vert). ⇒ U1, U2 : **NON CONCLUANT par le
rouge**, et c'est attendu : la fonction n'existait pas, l'échec est un plantage ; leur preuve est R23-F5-c (partie C).
Pièces : `rouge/*.txt`, `vert/*.txt`.

### D306 — partie B : les modes de défaillance du § 2 (consigne, point 2)

« Suite » = `bookings.int-spec.ts` à `HEAD` (48/48). « Sonde » = `sondes/test/int/adverse-23a.int-spec.ts`, hors suite,
jouée à `HEAD` : **14 collectés, 14 verts** (`sondes/sorties/sonde-HEAD.txt`, journal `journal-sonde-HEAD.txt`).
« Mutation » = parties C et D.
| mode | rejoué | lu | rangé |
|---|---|---|---|
| **MD-F1-1** refus pendant accept | T1 ; rouge ; R23-F1-a, -b, X1, X13 ; sonde P5b | 409 `DECLINED`, ligne intacte, 0 e-mail ; **0** notification `booking.accepted`, 0 WhatsApp (P5b) ; les quatre mutations font rougir T1 | **TIENT** |
| **MD-F1-2** annulation client pendant accept | T2 ; rouge ; R23-F1-a, -b, X1 ; X13 | 409 `CANCELLED` ; X13 (écriture élargie à `DECLINED` **seul**) laisse T2 vert et fait rougir T1 seul : chaque test épingle SON rival | **TIENT** |
| **MD-F1-3** 23P01 sous `updateMany` | X12 (traduction retirée) | « deux demandes DIFFÉRENTES… » : `AssertionError: expected [ 201, 500 ] to deeply equal [ 201, 409 ]` ; le test séquentiel « la SECONDE acceptation… 23P01 » rougit par `Error` de supertest (`got 500`) | **TIENT** (par le test concurrent) |
| **MD-F1-4** accept contre accept | D117 ×2, ×3 ; S5b-1 et S5b-2 **sans** T5 / T4 (filtre `-t`) | verts ; sous S5b-1 sans T5 et S5b-2 sans T4 : **47 verts, 1 ignoré** — l'écriture conditionnelle sérialise seule ce cas ; **les deux inférences de D305 sont reproduites** | **TIENT** |
| **MD-F1-5** blocage pendant accept | T5 ; S5b-1 ; X8 | T5 seul rougit sous S5b-1 et sous X8 (`201`, `ACCEPTED`) | **TIENT** |
| **MD-F1-6** interblocage | relevé au source ; sonde P6a, P6b (ordre inverse FORCÉ par un rival brut : la ligne, puis la salle) | **aucun chemin du code ne prend la ligne puis la salle** — verrous explicites : `SELECT … venues FOR UPDATE` dans `acceptUnderVenueLock` et `availability-blocks.service.ts`, `quotes FOR UPDATE` dans `quote-store.prisma.ts` ; écrivains de `bookings.status` : les deux `updateMany` de `booking-locks.prisma.ts`, seuls. Forcé : **P6a** (rival qui demande la salle aussitôt) ⇒ `accept` est la victime, **500** « Internal server error », ligne restée `PENDING` ; **P6b** (après 1,5 s) ⇒ le rival est la victime (`40P01`), `accept` **201** | **TIENT** — et la phrase du cadrage « un 40P01 sortirait en 500 » est **mesurée** |
| **MD-F1-7** refus PUIS accept | T4 (refus, blocage, accept) | 409 `DECLINED` | **TIENT** |
| **MD-F1-8** ordre des refus | T4 ; S5b-2 ; S5b-2 sans T4 | T4 seul sous S5b-2 ; sans T4, muette | **TIENT** |
| **MD-F5-1** accept pendant annulation client sans motif | T3 ; rouge ; R23-F5-a, -b, -c | 400, ligne `ACCEPTED` intacte ; les trois mutations mordent | **TIENT** |
| **MD-F5-2** avec motif, depuis `ACCEPTED` | X15 (le site d'appel ignore le motif) ; sonde P4 (concurrent) | comportement : P4, **200**, annulée avec son motif. Garde : sous X15, **seul** « le client DOIT un motif… » rougit, **par `Error` de supertest** (`expected 200 "OK", got 409`) — code de sortie 1, **pas une morsure sous la lecture de R1** ; P4 rougit (`expected 409 to be 200`) | comportement **TIENT** ; garde **CASSE sous R1** (mord au code seulement) |
| **MD-F5-3** annulation client contre refus | sonde P1, P1b (séquentiels), P2, P3 (concurrents) ; X4 | comportement : **409 `DECLINED`** dans les quatre cas, ligne `DECLINED`, `cancelled_at` nul. Garde : sous X4, **48/48 verts** | comportement **TIENT** ; garde **CASSE** (partie D, C1) |
| **MD-F5-4** statut (409) avant motif (400) | unitaire de `decideBookingTransition` ; sonde P1, P2, P11 ; X10 | comportement : 409 `DECLINED` / `CANCELLED` sans motif. Garde : sous X10, **48/48 verts** | comportement **TIENT** ; garde **CASSE** (partie D, C2) |
| **MD-X-1** jamais 500 | tous les tests concurrents ; P6a | aucun 500 hors l'interblocage FORCÉ, qu'aucun chemin du code ne produit | **TIENT** ; l'existant « attente de verrou > délai de transaction Prisma » (§ 2, non introduit) : **NON CONCLUANT**, non joué |

### D306 — partie C : les sept gardes neuves ou réorientées, NEUTRALISÉES À LA MAIN (consigne, point 3)

**Outil** : `outils/neutraliser.py` — les mutations sont **écrites par cette session d'après l'intention** de chaque
cible (§ 5), **aucune ancre importée** des harnais de D305. Par cible : ancre **unique** exigée ; preuve de **pose** par
édition, forme D286 (« ancre 1 → 0 **et** marqueur n → n + Δ ») ; fichier **relu octet pour octet égal** au texte muté ;
mesure, sortie brute versée ; **restauration** en `finally`, SHA-256 comparé, `git status` vide ; **lecture** par
`lire.py`, chaque titre attendu exigé en `AssertionError`, tout autre titre en échec imprimé et **non compté**.
**Bilan de l'outil sur tout le lot : 25 cibles, 26 éditions — 26 poses prouvées, 25 restaurations prouvées, 0 échec.**
Sorties : `neutralisation/<cible>-{int,unit,sonde}.txt` et `<cible>-lecture.txt` ; campagnes : `campagne-*.txt`.
⚠ `neutraliser.py` et `titres.py` ont été **étendus** après la campagne d'intégration (cibles X4-sonde, X10-sonde, X14,
X15, X15-sonde ; titres de la sonde) : **les définitions des cibles déjà jouées sont inchangées**, et la calibration du
lecteur a été **rejouée** à chaque ajout de titres (32, puis 33 cas, 0 manqué).
| cible | mutation de cette session | titres en échec, classe, 1ʳᵉ ligne | rangé |
|---|---|---|---|
| **R23-F1-a** | `where` de l'`updateMany` d'accept réduit à `{ id }` | T1, T2 — `AssertionError` (`201` au lieu de `409`) | **TIENT** |
| **R23-F1-b** | `if (ecrit.count !== 1 && false)` | T1, T2 — `AssertionError` | **TIENT** |
| **R23-F5-a** | `from: allowedFrom(CANCEL_AS_CLIENT)` | T3 — `AssertionError` ; autre : « le client DOIT un motif… » par `Error` (`got 200`) | **TIENT** |
| **R23-F5-b** | `REASON_REQUIRED && false` | T3 — `AssertionError` (`statusCode 409`) ; autre : même test, `Error` (`got 409`) | **TIENT** |
| **R23-F5-c** | `writableFrom` décide avec un motif forcé | U1, U2 — `expected [ 'PENDING', 'ACCEPTED' ] to deeply equal [ 'PENDING' ]` (23 collectés) | **TIENT** |
| **S5b-2** | `if (false && !input.allowedFrom.includes(…))` | T4 seul — `expected 'BOOKING_BLOCKED_PERIOD' to be 'BOOKING_STATUS_CONFLICT'` | **TIENT** |
| **S5b-1** | le `SELECT … venues FOR UPDATE` retiré | T5 seul — `AssertionError` (`201`, `ACCEPTED`) | **TIENT** |
| S5b-1 **sans T5** / S5b-2 **sans T4** | mêmes mutations, filtre `-t` excluant le test | **47 verts, 1 ignoré** chacune — muettes, comme D305 l'a écrit | **TIENT** (les deux réorientations étaient nécessaires) |

### D306 — partie D : ce que D305 n'a pas essayé, et ce que la consigne demandait en plus (points 4 et suivants)

**1. La relecture après un compte à 0.**
- **dans `accept`** — X1 : la relecture remplacée par le statut PÉRIMÉ lu avant l'écriture ⇒ T1, T2 rougissent,
  `expected 'PENDING' to be 'DECLINED'` / `'CANCELLED'`. D305 : « aucune cible ne le prouve » — **prouvé : TIENT**.
- **dans `transition`**, qui depuis la décision 2 **choisit le code** de l'annulation client — X2b (relecture = premier
  statut source) ⇒ T3 rougit (`409` avec `status: PENDING`) : **TIENT pour ce cas**. X2a (relecture = `ACCEPTED`
  toujours) ⇒ **48/48 verts** : **CASSE (garde) — C3**. Ni les 409 de `decline`, `cancelAsPro`, `cancelAsClient`
  perdants (les tests D121 n'assertent que le `code`), ni le choix 400/409 hors du cas T3, ne sont épinglés.
  ⚠ `transition` n'est pas modifié par 23a ; c'est 23a qui a rendu sa relecture porteuse du code.
- **peut-elle voir un état qui a ENCORE changé ?** Mesuré au niveau SQL (sonde P10) : **P10a** — compte 0 obtenu
  **après une attente** : la requête **garde un verrou sur la ligne** (une annulation pro rivale échoue en `55P03`), la
  relecture lit l'état qui a fait échouer l'écriture (`ACCEPTED` ⇒ 400) ; **P10b** — compte 0 **sans attente** : aucun
  verrou, l'annulation pro commite, la relecture lit `CANCELLED` ⇒ 409. **P11** (même état, séquentiel) : **409
  `CANCELLED`**. ⇒ Le code suit l'état RELU, et c'est la réponse séquentielle pour cet état : **TIENT**. La consigne
  citait « une annulation client sans motif, face à un refus commité » : **P2, 409 `DECLINED`**, pas 400 — **TIENT**.
- **la branche « décision ALLOWED après un compte 0 »** (le service rend alors 409) : **P9b**, sur les 5 arêtes du
  tableau, 9 cas (motif absent et présent × statuts refusés) — **0** statut inscriptible atteignable ; `EXPIRED` et
  `CONFIRMED` n'ont **aucun** écrivain à l'exécution (relevé au source). ⇒ **Branche morte aujourd'hui : TIENT.** ⚠ Elle
  cesse de l'être le jour où un écrivain ramène une ligne vers `PENDING` ou `ACCEPTED` : *inférence*, rien ne le fait.

**2. L'interblocage** — partie B, MD-F1-6 : **TIENT**.

**3. L'aide `courirOuAboutir`** — branche « revenue sans attendre » : S5b-1 (T5 rougit) ; branche « bloquée » avec la
garde absente : X8 (verrou de salle pris APRÈS le contrôle de blocage) ⇒ T5 rougit, `201`, `ACCEPTED` — **TIENT** pour
les deux ; ⚠ que X8 ait bien pris la branche « bloquée » est une **inférence** (le rival tient la salle, la requête la
demande ; la sortie ne le journalise pas). Branche « ni revenue, ni bloquée » (`Error` « la course n'a pas eu lieu ») :
non exercée — **NON CONCLUANT**.

**4. Le perdant publie-t-il ?** Sonde P5 (refus perdant contre accept) : 409 `ACCEPTED`, **0** e-mail, **0**
notification `booking.declined` ; P5b (accept perdant contre refus) : **0** notification `booking.accepted`, 0 e-mail,
0 WhatsApp. Mutation X7 (le perdant d'accept publie « acceptée » avant son 409) ⇒ T1, T2 et D117 rougissent sur le
compte d'e-mails. `DomainEvents.publish` est `await`é (source) : l'assertion est synchrone. **TIENT.**

**5. `writableFrom` et `decideBookingTransition`, pour TOUS les couples** — sonde P9 : **120 couples** (4 commandes ×
5 motifs dont `" "` et `null` × 6 statuts), **0 écart** : `writableFrom` est dérivé par filtre, l'accord est structurel.
**Élargi d'un statut** : dans la fonction pure (X3, `+ DECLINED`) ⇒ **4 tests unitaires** rougissent (U1, U2 et les deux
gardes de bord) — **TIENT** ; **au site d'appel** (X4, `+ DECLINED`) ⇒ **48/48 verts** — **CASSE (garde) — C1** ;
`+ CANCELLED` (X4b) ⇒ D121 (deux annulations client) rougit.

**6. Ce que la suppression du contrôle d'avant transaction a retiré.** Relu (diff `6e87430..b715943`) : la lecture passe
de `BOOKING_SELECT` à `{ id: true }` ; le DTO vient, **comme avant**, de la ligne rendue par `transition` (à `6e87430`
par `transitionStatus`) ; codes et clés i18n inchangés — la sonde relit `code`, `message` et `status` réels dans les réponses (P1, P2, P3, P11). **Aucune donnée
lue plus loin, aucun message perdu : TIENT.** ⚠ **Mais elle a retiré une seconde barrière** : à `6e87430`, ce contrôle
refusait `DECLINED` et `CANCELLED` **avant toute écriture** (*lecture du code, non mesurée sur les sources d'avant*) ;
depuis 23a, le prédicat de l'écriture est la **seule** garde de ce refus — et pour `DECLINED` aucune mesure ne la voit
(C1). ⚠ Et un effet de bord **mesuré** (P10a) : une annulation refusée **après attente** tient un verrou sur la ligne
jusqu'à la fin de sa transaction (la relecture) — son poids sous charge : **NON CONCLUANT**, non mesuré.

### ⛔ D306 — LE RAPPORT : ce qui CASSE

Quatre gardes que **la suite laisse passer**, plus une qui ne mord qu'au code. **Aucun comportement de `HEAD` n'est
faux dans ce que cette session a joué** : la sonde les voit toutes rendre la bonne réponse — ce qui casse, c'est la
**mesure**. Chacune est **observable** : la sonde (hors suite) rougit sous la même mutation.
| | mutation (posée, restaurée) | suite de 23a | sonde | ce qui n'est plus gardé |
|---|---|---|---|---|
| **C1** | X4 — prédicat de l'annulation client `+ DECLINED` au site d'appel | **48/48 verts** | P1, P1b, P2, P3 : `expected 200 to be 409` | un client annule une demande **REFUSÉE** : `DECLINED` → `CANCELLED` (MD-F5-3) ; seconde barrière retirée par 23a |
| **C2** | X10 — après un compte 0, code choisi comme si le statut était `ACCEPTED` | **48/48 verts** | P1, P2, P11 : `expected 400 to be 409` | « motif manquant » (400) sur une demande déjà refusée ou annulée — l'inversion que `decideBookingTransition` documente comme interdite (MD-F5-4) |
| **C3** | X2a — la relecture de `transition` rend `ACCEPTED` | **48/48 verts** | — (non rejouée sur la sonde) | le statut des 409 perdants, et le choix 400/409 hors du cas T3 |
| **C4** | X14 — le `status` du 400 remplacé par `PENDING` | **48/48 verts** | — | le statut réel dans le 400 `cancelReasonRequired` (T3 et SEQ400 n'assertent que `message.message`) |
| **C5** | X15 — le site d'appel ignore le motif | **1** échec, par `Error` de supertest | P4 : `expected 409 to be 200` | MD-F5-2 ne mord qu'**au code** — **pas une morsure sous la lecture de R1** |
⚠ **Portée** : `bookings.int-spec.ts` est le **seul** spec du dépôt qui appelle l'annulation client (relevé : aucun
autre `int-spec`, aucun e2e, aucune spec unitaire de `bookings.service.ts`) — ces verts couvrent donc **toute** la
couverture existante de ce chemin. **Suite e2e non jouée** (aucun code changé).

### D306 — constats croisés, RAPPORTÉS (le backlog n'est pas dans le périmètre d'écriture de cette session)

- **`assertStatus`** (`bookings.service.ts`) n'a **aucun appelant**, à `6e87430` comme à `HEAD` (`grep`) ; la doc de
  `allowedFrom` le cite encore. Antérieur à 23a.
- **Deux gardes existantes ne mordent que par supertest** : « le client DOIT un motif… » (MD-F5-2, C5) et « la SECONDE
  acceptation reçoit 409 via le 23P01 » (MD-F1-3, couvert par ailleurs par le test concurrent). Pour R1 : deux
  instances mesurées de plus du constat supertest de D305.
- **Les sorties d'une campagne comptée dans une table de portes n'étaient pas versées** (lecture adverse, point 1) : la
  pièce versée d'une campagne doit-elle être celle de la passe dont le chiffre est cité ? — **au relecteur**.

### D306 — ce qui a atterri, et où

| quoi | fichier, endroit |
|---|---|
| ce rapport | `ZWADJ_CONTINUITE.md`, cette section |
| l'état du rang | point d'entrée du rang 23 : titre et table annotés (« session adverse FAITE, D306 ») |
| la ligne du lot | ordre des rangs : ligne D306 ; lignes D305 « attend la session adverse » annotées |
| le numéro | registre : ligne D306 |
| les preuves | `docs/preuves/D306/` — `outils/`, `rouge/`, `vert/`, `neutralisation/`, `sondes/`, `lecture-adverse/`, `etat-machine/`, `passe-d277/`, `controles/`, audits |
⇒ **Aucune décision n'a été prise dans ce lot** : il n'y avait rien à décider, seulement à rapporter.

### ⛔ D306 — CE QUE CE LOT NE FAIT PAS

- **Il ne clôt pas 23a** : **le relecteur décide** sur ce rapport ; Ko garde le veto ; puis la certification (bloquée
  par R1).
- **Il ne corrige rien et ne propose aucun correctif** : C1 à C5 sont décrits et reproduits, rien de plus.
- **Il n'écrit ni `AGENTS.md` ni `ZWADJ_BACKLOG.md`** : périmètre d'écriture de la consigne. Les constats croisés
  vivent ici.
- **Il n'arbitre pas** si R1 peut s'ouvrir avant la décision du relecteur sur 23a : **à Ko** (inchangé depuis D305).
- **Il ne rejoue ni les six portes, ni `lancer-campagnes.py`, ni l'e2e** : aucun code n'a changé ; les deux mesures de
  23a ont été jouées à `HEAD` (48/48, 23/23).
