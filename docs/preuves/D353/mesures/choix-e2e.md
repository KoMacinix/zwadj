# D353 — R-1 : le choix de la correction e2e, mesuré — et pourquoi elle n'est PAS livrée

⛔ **Résumé** : une correction e2e à **trois gestes** a été écrite et mesurée. Chaque geste est **nécessaire quand l'application ne relit pas une réponse vide** ; **aucun ne l'est plus une fois la relecture de R-3 en place** (`r48` jouée seule est verte depuis un cache neuf comme depuis un cache empoisonné, avec l'e2e du DÉPART). Par le principe du plus petit changement, **la correction e2e n'est pas livrée** ; son diff et ses mesures sont versés comme **option écartée**. C'est une **décision de la session** (S-232, à ratifier) : la consigne (R-1) attendait un correctif « dans `e2e/` seul ».

Conditions communes : sur secteur, `r48-assistant-choix.e2e.ts` DURCIE (sha256 `226032872cca15128236cb7fb6ea000c5f78452cfd9f11f127817597b4c70d10`), jouée **seule** (`playwright test specs/r48-assistant-choix.e2e.ts`, avec sa dépendance de projet, le préchauffage), serveurs de développement, base `zwadj_e2e`. États de départ : **F** = cache de données du client ABSENT ; **E** = cache EMPOISONNÉ (trois entrées à `[]`, de moins d'une heure, restaurées depuis une copie de référence avec des dates fraîches). Code d'application : celui du départ (`cd8e079`) pour M1 à M8 ; **avec la relecture de R-3** (`api.ts` corrigé) pour « β seule ».

## Les mesures (candidate à trois gestes : (Q) la sonde de disponibilité du client vise `/icon.svg` ; (O) `globalSetup` sème les référentiels ; (P) `globalSetup` purge `fetch-cache`)

| mesure | gestes posés | état de départ | résultat | cache à la fin (styles / wilayas / équipements) | pièce |
|---|---|---|---|---|---|
| **P1 de `regle-portes.md`** (suite COMPLÈTE) | aucun | F | **VERT** (109 passés) — prédiction CONTREDITE | 4 / 58 / 23 (écrit à 01:30, 60 s après le préchauffage ; **relevé à l'écran, non versé**) | `rouges/` |
| **r48 seule, aucun geste** | aucun | F | **ROUGE** : « puces de STYLES : attendu 4, reçu 0 » | 0 / 58 / 0 | `rouges/` |
| **r48 seule, aucun geste** | aucun | E | **ROUGE** : `expect(valeurCommune).not.toBe("")` | 0 / 0 / 0 | `rouges/` |
| **M1** | O + P (pas de Q) | F | **ROUGE** : `valeurCommune` vide — **prédiction P5 CONTREDITE** | 4 / *absente* / 23 | `choix/` |
| **M5** | Q + O + P | F | **VERT** (3 passés) | 4 / 58 / 23 | `choix/` |
| **M6** | Q + O + P | E | **VERT** (3 passés) | 4 / 58 / 23 | `choix/` |
| **M7** | Q + O (pas de P) | E | **ROUGE** : `valeurCommune` vide | 0 / 0 / 0 (inchangé) | `choix/` |
| **M8** | Q + P (pas de O) | F | **ROUGE** : `valeurCommune` vide | 0 / 0 / 0 | `choix/` |
| **β seule** (relecture de R-3, e2e du DÉPART) | aucun | F | **VERT** (3 passés) | — | `choix/` |
| **β seule** | aucun | E | **VERT** (3 passés) | — | `choix/` |

## Lecture

1. **Ce que M1 a trouvé et que la règle écrite avant n'avait pas prévu** : le journal de l'API montre `GET /api/v1/wilayas` à 01:51:21, **avant la migration** — c'est la **sonde de disponibilité du client** (Playwright démarre les serveurs AVANT `globalSetup`, code de 1.50.1), qui rend l'accueil, qui lit les wilayas, sur la base laissée par la passe précédente. Le serveur de développement garde cette réponse **en mémoire** : purger le fichier de cache ne l'efface pas (aucune entrée `wilayas` sur disque à la fin, et pourtant des communes vides). ⇒ le geste (Q) existe pour cette raison. **INFÉRENCE sur le mécanisme de la mémoire** (non lue dans le code de Next) : la mesure dit le comportement (entrée absente du disque, liste vide servie), pas où la réponse est gardée.
2. **Chaque geste est nécessaire, sans l'application corrigée** : retirer (Q) → M1 rouge ; retirer (P) → M7 rouge ; retirer (O) → M8 rouge. Les trois sont posés dans M5 et M6 (verts).
3. **Mais l'application corrigée suffit** : avec la relecture des réponses vides (R-3) et **aucun** des trois gestes, `r48` seule est verte depuis F et depuis E. La relecture rend les listes pleines à chaque rendu tant que l'entrée gardée est vide, quelle que soit la façon dont l'entrée est arrivée là — sonde, préchauffage ou session de développement antérieure.
4. **Pourquoi ne pas livrer les trois gestes quand même** : (a) le plus petit changement — la correction de l'application est déjà là et déjà mesurée en production (`mesures/r2-production.md`) ; (b) la purge **couple la suite e2e à un chemin interne de Next** (`apps/client/.next/cache/fetch-cache`), qui change sans prévenir ; (c) un test e2e qui ne passe que grâce à un geste de la suite masquerait un défaut de l'application — c'est exactement ce que la suite complète faisait (un spec qui recharge la page rafraîchit le cache). **La garde est le test durci lui-même** : si la relecture disparaît, `r48` rougit (cible R55-10 de `neutralisation/neutralize-r55.py`, depuis un cache empoisonné).
5. **Ce que cette décision ne ferme pas** : si la relecture de R-3 est un jour retirée ou changée, les trois gestes redeviennent nécessaires — leur diff est versé (`choix/candidat-e2e-correction-ecartee.diff`, 50 lignes) pour être repris en un geste.

## Ce que ces mesures NE disent PAS

- **La suite COMPLÈTE n'a pas été rejouée avec la candidate à trois gestes** : seuls `r48` seule (cinq configurations) et « β seule » (deux états) l'ont été. La suite complète depuis un cache neuf était déjà verte sans correction (ligne 1) ; avec la correction livrée, elle sera rejouée deux fois de suite (portes).
- **Le spec de la suite complète qui rafraîchit le cache** n'a pas été identifié (aucune bissection) : le rechargement est le suspect, mesuré sur un cas isolé (`mesures/pieces/cas-reload-dev.txt`).
- Les mesures M1 et M5 à M8 ont tourné pendant qu'un audit de secrets lisait `docs/preuves/` : le préchauffage dure 35 à 48 s au lieu de 19 s ; **aucun verdict ne dépend d'une durée**.
- Chaque état E a été reconstruit à partir d'une copie de référence dont les trois entrées portent `[]` ; **ce n'est pas un cache que la suite a produit** mais une copie d'un cache qu'une mesure sur le serveur de développement a produit (`cas-i-dev`). Le harnais de R55-10 fabrique le même état (mêmes noms de fichiers, mêmes corps), et son pré-vol exige que `r48` y soit VERTE avec la relecture en place.
