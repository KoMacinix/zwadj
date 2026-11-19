# D353 — les rouges, versés AVANT le premier commit de code (D334, point 5)

⛔ **Ce document dit ce que les mesures ont donné, y compris ce qu'elles ont CONTREDIT des prédictions de `regle-portes.md` (écrites avant).** Une prédiction contredite se lit et s'écrit comme telle (D291) ; elle n'est pas réécrite après coup.

Code d'application et e2e : **inchangés** (`cd8e079`) pour toutes les mesures de ce document. Les trois fichiers de test joués existent dans l'arbre de travail, NON commités à ce moment ; chaque pièce porte l'empreinte sha256 de ce qu'elle a joué :

| fichier de test joué | sha256 | pièce |
|---|---|---|
| `e2e/specs/r48-assistant-choix.e2e.ts` (durcie : plus de tolérance, attendu dérivé de la base) | `226032872cca15128236cb7fb6ea000c5f78452cfd9f11f127817597b4c70d10` | `r1-etat-avant-rouge-F.txt` |
| `apps/client/src/lib/api.test.ts` (le test du `no-store` de la carte) | `3242f5aa4ac94146c219717daa6dd8dbab7725153020f9d5fde8eaa5874535a6` | `r4-mutation-no-store-sous-test-neuf.txt` |
| `apps/api/test/int/venue-map.int-spec.ts` (le cas « sans créneau actif, avec une date ») | `1cdfdbffd7b17a2edec286945f3530b83de0cfdb5ec423b6139f967c3e225c66` | `r5-carte-sans-creneau-actif-sortie.txt` |

## 1. R-1 — la partie e2e : la prédiction P1 est CONTREDITE, et ce qu'on a mesuré à la place

**Prédiction P1 (écrite avant)** : depuis l'état F (cache de données absent), `r48` durcie, dans la suite COMPLÈTE, est ROUGE sur une assertion. **MESURÉ : FAUX.** `pnpm test:e2e` complet, depuis F, sur le code de départ : **109 passés, 1 ignoré, code 0** (6,4 minutes) — `r1-suite-complete-etat-F-VERTE-sortie-masquee.txt` ; `r48` (français et arabe) y passe avec ses assertions durcies (puces de styles = `count(*)` de la base, puces d'équipements idem). **On ne peut donc pas écrire que la suite complète rougit.**

**Ce qui rougit, et que la consigne n'avait pas prévu comme forme** : **`r48` jouée SEULE** (avec sa dépendance de projet, le préchauffage) :
- **depuis F** : **ROUGE**, `expect.poll(...).toBe(...)` — « `fr — puces de STYLES (la base en compte 4)` · `Expected: 4` · `Received: 0` », puis la même chose en arabe (`r1-r48-seule-etat-F-ROUGE-sortie-masquee.txt`, ligne 331 et suivantes) : **l'assertion durcie mord exactement là où la tolérance de S-153 se taisait** ;
- **depuis E** (cache empoisonné, moins d'une heure) : **ROUGE** sur une assertion qui existait déjà — `expect(valeurCommune).not.toBe("")` (l. 127) : la liste des communes est vide (`r1-r48-seule-etat-E-ROUGE-sortie-masquee.txt`, ligne 309 et suivantes).

**Pourquoi la suite complète est verte (MESURÉ pour le mécanisme, INFÉRÉ pour l'identité du spec)** :
1. **Le cache s'empoisonne bien** (D346 est CONFIRMÉ) : sur le vrai `next dev` (`revalidate: 3600` réel), une entrée vide gardée n'est pas relue — **34 sondes sur 37, de +11,9 s à +86,9 s, la page reste vide pendant que l'API rend les listes pleines** (`mesures/pieces/cas-i-dev.txt`).
2. **Un rechargement du navigateur la rafraîchit** : une seule requête portant `Cache-Control: no-cache` + `Pragma: no-cache` (ce qu'envoie un rechargement) rend aussitôt les listes pleines, et les requêtes SIMPLES qui suivent aussi (`mesures/pieces/cas-reload-dev.txt`, de +22,4 s à +30,2 s). Dans la suite complète, les trois entrées du cache portaient, **à la fin du run**, des listes PLEINES (4, 23, 58) écrites à **01:30:19-22**, soixante secondes après le préchauffage : **relevé à l'écran juste après le run, NON versé** (le dossier de cache a été purgé ensuite par la mesure sur le serveur de développement, `cas-i-dev`) ; ce relevé se refait en rejouant la suite. **Un spec qui recharge `/fr/salles` après le semis est le suspect** (`a5-cold-reload-vs-spa` et d'autres rechargent). ⚠ **INFÉRENCE : le spec précis n'a PAS été identifié** (aucune bissection de la suite n'a été jouée).
3. **Conséquence écrite** : dans la suite complète, `r48` est verte **grâce à l'effet de bord d'un autre spec**, pas par construction. Jouée seule (`--grep`, un autre ordre, un autre découpage), elle rougit.

**D'où vient le cache empoisonné d'un poste neuf (MESURÉ pour les entrées, INFÉRÉ pour la cause)** — deux préchauffages seuls, jouées depuis F à quelques minutes d'intervalle, ont laissé des caches DIFFÉRENTS : le premier `wilayas` = 58 (liste pleine), `venue-styles` et `amenities` = 0 ; le second tout à 0 (`cache-03…`, `cache-04…`, `r1-warmup-seul-etat-F-2-base-timeline.txt` : la base e2e est à 0 wilaya, 0 ville, 0 équipement, 0 style pendant tout le second préchauffage). **Inférence, non confrontée** : Playwright démarre les serveurs (`webServer`) AVANT `globalSetup` (code de Playwright 1.50.1) ; la sonde de disponibilité du client rend l'accueil (qui lit les wilayas) sur la base **laissée par le run précédent** — pleine après `r48`, vide après un préchauffage — puis `globalSetup` la recrée, et le préchauffage, lui, voit des listes vides. L'entrée `wilayas` du premier cas date de 01:42:20, celles de `/fr/salles` de 01:42:34.

**Ce que ces rouges font de la règle du lot, et la décision de la session (S-231, à ratifier)** : `regle-portes.md` § 1 exigeait « la suite COMPLÈTE rouge d'abord ». **Elle ne l'est pas.** Le rouge du lot est donc celui de **`r48` jouée seule, depuis F et depuis E** ; la preuve « verte après » sera jouée **sur les trois formes** (seule depuis F, seule depuis E, suite complète deux fois de suite). Cela ne change aucun comportement du produit (code de test seul) ; cela change ce que le rouge PROUVE : l'**indépendance** de `r48` vis-à-vis de l'historique des passes, non « la suite complète rougit ».

**Les prédictions P2 à P5** (écrites pour la suite complète) sont REFORMULÉES sur `r48` seule dans la mesure du choix, versée avec le code (`mesures/choix-e2e.md`) ; P2 (« une seconde passe depuis E reste rouge ») est **confirmée** par la forme `r48` seule depuis E ci-dessus.

## 2. R-4 — le `no-store` de la carte

La mutation de D351 (`docs/preuves/D351/r4/mutation-no-store.py` : même ancre, même remplacement ; empreinte de départ de `api.ts` **identique** : `180342cfbbdada2500320cc7cfe96c88d03a43299995eb8a6d81082d15e54f6c`) est rejouée **sous le test neuf** : la suite ENTIÈRE du client passe de **564 verts / 0 échec (D351)** à **`1 failed | 564 passed (565)`**, le test visé en échec par **`AssertionError: expected 'force-cache' to be 'no-store'`** (première ligne de son bloc). Restauration prouvée : empreinte identique, `git status` vide sur `api.ts` (`r4-mutation-no-store-sous-test-neuf.txt`).

## 3. R-5 — « sans créneau actif », avec une date, sur la carte

**Prédiction : VERT. MESURÉ : VERT** — `venue-map.int-spec.ts`, **10 tests passés** (9 d'avant + le neuf), sur PostgreSQL réel, aucune ligne d'`apps/api/src` modifiée (`r5-carte-sans-creneau-actif-sortie.txt`). La carte et la liste **ne divergent pas** : mêmes identifiants, même total, même écho de la date ; seule la salle à créneau actif reste, des deux côtés. **Il n'y a donc pas de défaut à rapporter, et la règle d'arrêt de R-5 ne joue pas.** ⚠ Un test vert n'est une garde que s'il mord : les cibles R55-2 et R55-3 de `neutralize-r55.py` le mesureront (elles sont écrites après ce commit).

## 4. Ce que ces rouges NE disent PAS

- Le rouge de R-1 est **celui de `r48` seule**, pas celui de la suite complète ; aucune bissection de la suite n'a identifié le spec qui rafraîchit le cache.
- La suite complète **depuis l'état E** n'a pas été jouée au rouge (elle serait vraisemblablement verte pour la même raison).
- Aucune mesure n'a été prise avec la valeur réelle de 3 600 s en production : la fenêtre est de 20 s sur la copie (`mesures/r2-production.md`).
- `getVenueBySlug` n'a aucune garde unitaire de son `no-store` (lecture adverse, R-4.a) : entrée de backlog, non traitée ici (R-6).
