# D339 — L'arrêt de l'e2e de clôture sur `r41:65`, la règle du rejeu écrite AVANT lui, et son résultat

Pièce de la décision **R-7** du relevé de Ko du 03/11/2026 (« consigne l'arrêt dans une pièce sous `docs/preuves/D339/`, avec son extension de table déclarée seule d'abord »). Extension : n° 9 de `docs/preuves/D339/table-ouverture.md` (commit `361a864`) ; la comparaison au 02/11 : extension n° 10 (commit `09137e7`).

⛔ **ÉTAT DE CETTE PIÈCE À SON PREMIER COMMIT.** Les sections 1 à 6 sont écrites ; la section 7 (le résultat du rejeu) est **vide** — elle s'écrit après le rejeu, dans un commit **postérieur**. Le premier commit de cette pièce **précède le lancement du rejeu** : c'est `git log` qui le prouve, pas cette phrase. Aucune section 1 à 6 n'est retouchée après le rejeu, sauf correction d'une coquille déclarée dans la section 7.

## 1. D'où vient cette pièce

- Le lot : D339, rang 43 (L36-2, le devis brouillon non officiel), repris le 30/10/2026 après l'arrêt de la session précédente (`docs/preuves/D339/reprise/etat.md`).
- La porte : `pnpm test:e2e` (racine ⇒ `pnpm --filter @zwadj/e2e test:e2e` ⇒ `playwright test`), serveurs de développement (client sur 3100, API sur 3101, Pro sur 5273), base jetable `zwadj_e2e` recréée à chaque passe, `retries: 0` (volontaire), `workers: 2`.
- Le code joué par la passe 1 : `HEAD` **`138a7dc8fd014c08e4908e125fa5f49b05e8d3c1`**, arbre : trois chemins non suivis, tous sous `docs/preuves/D339/` (`portes/_index.txt`).
- Les décisions qui encadrent le rejeu : **R-6 à R-10**, relevé de Ko du 03/11/2026, texte de la section 5.

## 2. L'arrêt et ses chiffres — la passe 1 des portes du 03/11/2026

Pièces : `portes/_index.txt` (l'index), `portes/etat-machine.txt`, `portes/etat-env-ouverture.txt` et `portes/etat-env-cloture.txt`, `portes/test-e2e.txt` (la sortie rouge, **MASQUÉE** : 77 jetons de liens de vérification d'une base jetable ; brut gardé hors dépôt, sha256 `a9ef33fa8b984b5a41a1a29a25c17cb1c89a01e1932c1302d2294251dc2d110f`, la forme masquée porte `2e6f3a38…117e`).

```
départ : 2026-11-03 09:08:01 · HEAD 138a7dc8…
typecheck 0 21s · lint 0 14s · test 0 93s · build 0 32s · test:int 0 395s (619 sur 619, 40 fichiers) · test:e2e 1 220s
fin : 2026-11-03 09:20:57
```

- **`test:e2e` : code 1.** Résumé Playwright, lu dans la sortie : `1 failed` · `1 skipped` · `62 passed (3.6m)` ; 62 + 1 + 1 = **64 tests**.
- **Le seul échec** : `specs\r41-fiche-client.e2e.ts:65:5`, le **55ᵉ** test de la passe (`x  55`, ligne 1825 de `portes/test-e2e.txt`), **le premier test de sa spec**. Message (lignes 2272 à 2275) : « `POST http://localhost:3101/api/v1/auth/register a échoué après 3 ms.` — Chaîne des causes : `TypeError: fetch failed` ← `Error [ECONNRESET]: read ECONNRESET` », levé dans `e2e\fixtures\harness.ts:65` (`postJson`), appelé par `createVerifiedAccount` (`harness.ts:88`), `createPublishedVenue` (`harness.ts:324`) et `ouvrir` (`r41-fiche-client.e2e.ts:30`). C'est **avant toute ligne de la spec et avant tout geste de navigateur** : le premier appel réseau du test.
- **Les trois tests de la spec du lot passent** : `r43-devis-brouillon.e2e.ts:85` en français (ligne 2161) et en arabe (ligne 2217), et `:185` le chemin ordinaire (ligne 2267).
- **Le test ignoré** : `a5-cold-reload-vs-spa.e2e.ts:175` (test n° 20, ligne 713) ; il l'est aussi dans la passe du 02/11 (section 3).
- **État machine relevé AVANT la passe** (`portes/etat-machine.txt`, 09:07:41) : secteur `Online`, batterie 100 %, **RAM libre 3 107 Mo** sur 16 095, `chrome` 0, `headless_shell` 0, `node` 0, ports 3100/3101/3000/4000 libres. **APRÈS** (relevé en lecture seule, non versé comme pièce, noté au rapport) : RAM libre 3 602 Mo, `chrome` 0, `headless_shell` 0, `node` 0. ⚠ **Rien n'a été relevé PENDANT cette passe** : c'est l'écart que R-8 corrige pour le rejeu.
- **Les `.env`** (D330) : trois fichiers, 8 variables d'URL, **0 hôte non local** à l'ouverture ; à la clôture `comparer` rend « IDENTIQUE — mêmes fichiers, mêmes empreintes », code 0 (empreinte de `apps/api/.env` : `813afbfc…80e1` aux deux relevés).
- **Classe** : la signature décrite à D265 (« `fetch failed` ← `ECONNRESET` » dans `postJson`, après quelques millisecondes, au premier appel d'une spec). **Arbitrage de Ko du 04/10/2026 (D325), repris par R-6** : aucune nouvelle tentative AUTOMATIQUE ; la spec reste dans la suite ; l'enquête est un lot à part. L'hypothèse de D265 n'est ni reproduite ni exclue.

## 3. Le même code, la veille — la première passe du 02/11/2026

Pièces : `portes/passe-02-11-index.txt`, `portes/passe-02-11-etat-machine.txt`, `portes/passe-02-11-test-e2e.txt` (masquée : 79 jetons ; sha256 de la forme masquée `45d175cb…4104`).

- Même `HEAD` `138a7dc8…`, mêmes trois chemins non suivis. `test:e2e` : **code 0**, 213 s, **`1 skipped` · `63 passed (3.5m)`** — 63 + 1 = 64 tests. `r41:65` y est vert.
- État machine (12:30:37) : secteur branché, **RAM libre 4 229 Mo**, `chrome` 0, `headless_shell` 0.
- **Ce que la comparaison NE dit PAS** : la RAM libre a baissé de 4 229 à 3 107 Mo entre les deux passes ; **aucune cause n'est établie** (la RAM libre avant n'a pas de seuil hors certification, note de Ko du 02/11, point 1 ; aucune charge n'a été relevée pendant l'une ou l'autre).
- `test:int` de cette passe du 02/11 (rouge, 2 tests, cause : un `.env` pointant sur un hôte non local, que Ko a remis en local) n'entre **pas** au dépôt (extension 10).

## 4. Les trois passes isolées de `r41-fiche-client` — le 03/11/2026, hors porte

Commande (depuis la racine, sans modifier `retries`) : `pnpm --filter @zwadj/e2e exec playwright test r41-fiche-client`, sortie redirigée vers un fichier de travail ; **aucune modification du dépôt**. Les trois sorties sont versées MASQUÉES (6 jetons chacune) : `portes/isolee-r41-1.txt` (`f0244486…2399`), `portes/isolee-r41-2.txt` (`409d3704…1d24`), `portes/isolee-r41-3.txt` (`e2f5a3af…2a74`).

```
passe 1 · 09:24:12 · secteur=Online · RAM libre avant=3409 Mo · sortie=0 · 72s
passe 2 · 09:25:23 · secteur=Online · RAM libre avant=3436 Mo · sortie=0 · 70s
passe 3 · 09:26:34 · secteur=Online · RAM libre avant=3398 Mo · sortie=0 · 70s
```

- Chacune : **`4 passed`** (la préchauffe `warmup.setup.ts` et les trois tests de la spec, dont `:65`, lignes 332, 383 et 431 de la première sortie versée). **0 échec, 0 ignoré.**
- ⚠ **Ce que ces passes prouvent et ne prouvent pas** : la spec, jouée SEULE, est verte trois fois sur trois, à RAM libre voisine de celle de la passe 1 (3 398 à 3 436 Mo contre 3 107 Mo). Elle ne prouve ni que la cause tient à la suite entière, ni qu'elle tient à la machine : **deux hypothèses restent ouvertes, aucune n'est testée**. C'est le précédent du rang 32 : classer d'après des passes isolées, sans les compter comme la porte.
- ⚠ Le journal de commandes de ces trois passes (heure, RAM, durée) est une **transcription de la session** ; la ligne de commande exacte vient de son transcript, non d'un fichier versé.

## 5. La règle du rejeu — ÉCRITE AVANT LE REJEU

**Source : relevé de Ko du 03/11/2026, décisions du relecteur (chat), déléguées par Ko, mot pour mot** (R-6 ; R-8 et R-9 ci-dessous la complètent) :

> R-6. L'e2e de clôture se rejoue EN ENTIER, UNE fois, à la main (`retries` reste à 0). Avant de lancer, tu écris cette règle dans la pièce de R-7 :
> · rejeu vert (0 échec) : la porte est verte AU REJEU ; la passe rouge (masquée) et la passe verte se versent côte à côte, et le rapport écrit les deux résultats ;
> · rejeu rouge sur r41-fiche-client.e2e.ts:65 avec la même signature (fetch failed ← ECONNRESET dans le fixture) : deux sur deux n'est plus un aléa (leçon du rang 32). Tu ne clôtures pas, tu ne sors pas la spec de la suite (elle est hors du lot), tu t'arrêtes et tu rapportes ;
> · tout autre rouge : arrêt et rapport ;
> · pas de deuxième rejeu, quel que soit le résultat.
> Motif : c'est le précédent écrit du dépôt (ZWADJ_CONTINUITE.md:2659 et :4860 : « une porte ne se déclare pas verte en taisant sa première passe »). (b) ferait partir le lot dans main sous une porte rouge, ce que D270 interdit « même quand le rouge vient d'ailleurs ». L'arbitrage (c) de Ko sur D265 interdit les nouvelles tentatives AUTOMATIQUES ; un rejeu unique, décidé à la main, sa règle écrite avant, la passe rouge gardée, n'en est pas une.

> R-8. L'état machine se relève PENDANT le rejeu : juste avant, toutes les 30 s pendant (secteur ou batterie, RAM libre, nombre de chrome et de headless_shell), juste après. Le relevé ne touche aucun fichier suivi ; sa sortie entre dans la pièce de R-7. Motif : l'écart que tu as nommé toi-même ; D270 : « un intermittent sans état relevé ne veut rien dire ».

> R-9. Tes deux décisions prises seul sont ratifiées : les trois passes isolées de r41 (précédent du rang 32) et « rien d'autre » (ni retrait de spec, ni délai, ni rejeu pour verdir).

**Ce que la session précise, DÉRIVÉ DE LA RÈGLE et écrit ici avant le lancement (à confirmer par Ko) :**

1. **Une seule commande, une seule fois** : `pnpm test:e2e` depuis la racine, par `portes/outils/rejeu.sh` (lanceur archivé comme preuve), `retries` inchangé. **Aucun** délai changé, **aucune** spec exclue ou ignorée en plus, **aucune** relance — y compris si le lancement échoue après son départ.
2. **Portes dures du lanceur, avant la commande** — si l'une est rouge, **le rejeu ne démarre pas, la pièce le dit, et la session rapporte sans relancer** : (a) les `.env` : un hôte non local, ou une erreur du relevé (`etat-env.py`, D330) ; (b) l'état machine **AVANT** : secteur ≠ `Online`, ou `chrome` > 0, ou `headless_shell` > 0 (D290, D331). La RAM libre n'est **pas** une porte : elle est déclarée (note de Ko du 02/11, point 1).
3. **Le relevé machine (R-8)** : une ligne juste avant, une toutes les 30 s pendant (secteur, batterie, RAM libre, `chrome`, `headless_shell`, et en plus `node` et le taux du processeur, **déclarés sans seuil**), une juste après. Pendant l'e2e `headless_shell` > 0 est NORMAL (c'est le navigateur de Playwright) ; seuls AVANT et APRÈS exigent 0. Le relevé s'écrit hors dépôt et se copie après. Les `.env` sont relevés à l'ouverture et à la clôture du rejeu et comparés.
4. **Comment le verdict se lit** : sur la sortie BRUTE du rejeu (D275), avec le total attendu à côté du mesuré :
   - **vert** = la commande sort en **0** ET le résumé de Playwright ne porte **aucune ligne `failed`** (`N passed`, 0 échec) ; le nombre d'ignorés est relevé et rapporté (1 aux deux passes précédentes) ; un nombre d'ignorés différent sans échec ne change pas le verdict, il se rapporte ;
   - **même signature** = le SEUL échec est `r41-fiche-client.e2e.ts:65` ET son message porte « `POST http://localhost:3101/api/v1/auth/register a échoué après N ms` » avec les causes `TypeError: fetch failed` et `Error [ECONNRESET]` ;
   - **tout autre rouge** = tout le reste : un autre test, plusieurs échecs, un autre message, `ECONNRESET` dans un AUTRE test (même classe D265, **autre test** : la règle dit « tout autre rouge »), un échec de lancement après son départ. L'arrêt et le rapport sont les mêmes que pour « même signature » ; seuls les mots changent.
5. **Dans les trois cas** : la sortie du rejeu est versée **à côté** de la passe rouge (`portes/test-e2e-rejeu.txt`), **jamais à sa place** ; ni la passe rouge ni cette section ne sont retouchées.
6. **Si le rejeu est vert** : la clôture reprend là où elle s'est arrêtée (verts, audit de clôture, passe D277, fichiers d'autorité, contrôle de fin de lot, push). La porte `test:e2e` s'écrit « **verte AU REJEU** » avec les deux résultats (62 passés et 1 échec ; puis le résultat du rejeu), jamais « verte » seul.
7. **Si le rejeu est rouge (même signature ou autre)** : la session **ne clôture pas**, **ne sort pas `r41` de la suite**, **ne rejoue pas**, rapporte, et s'arrête. Rien n'est poussé.
8. **R-10 (à la clôture, si elle a lieu)** : l'entrée D265 du backlog reçoit une annotation **additive** — le 03/11/2026, D265 a mordu une spec DANS la suite (`r41`, premier appel du fixture, après 3 ms), avec le renvoi à cette pièce. Ni rang ni entrée nouvelle (D302).
9. **R-6 à R-10 s'écrivent dans `ZWADJ_CONTINUITE.md`**, sous « DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO », avec leurs motifs, dans les écritures de clôture.

## 6. Ce que cette pièce ne dit pas

- **Aucune cause de l'échec de `r41:65` n'est établie.** Les trois passes isolées, la passe du 02/11 et la RAM libre plus basse du 03/11 sont des éléments de classement, pas une explication.
- **Le rejeu ne dit pas non plus la cause** : vert ou rouge, une passe de plus est une autre observation, pas une enquête. L'enquête de D265 est un lot à part, à placer par Ko.
- **Le code joué par le rejeu n'est pas exactement celui de la passe 1** : `HEAD` aura avancé de commits qui ne touchent QUE `docs/preuves/` (`git diff 138a7dc..HEAD --name-only` rend aujourd'hui `docs/preuves/D339/table-ouverture.md` seul ; la section 7 relève la liste au lancement). Aucune porte ne lit `docs/preuves/` (D292) ; ce contrôle est écrit, pas supposé.
- **Cette pièce n'établit pas que la suite sera verte** à la clôture : elle écrit seulement comment un rejeu se lit.

## 7. Résultat du rejeu

*(à écrire après le rejeu, dans un commit postérieur au premier commit de cette pièce.)*
