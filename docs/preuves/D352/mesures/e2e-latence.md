# D352 — le critère 4 de `regle-portes.md` : l'e2e refuse-t-il la voie (A) ?

**Question** (`regle-portes.md`, § 1, critère 4) : la carte de « Mes salles » ne connaît l'état de publication d'une salle qu'à la réponse de `GET /pro/venues/:id/publication`. Une spec de navigateur qui LIT le texte d'une carte sans attendre cet état est-elle une garde qui refuse la voie (A) — et, si oui, est-ce un motif pour la voie (B) ?

## Ce qui a été relevé avant de mesurer (par lecture du code)

- `e2e/specs/a2-mount-effects.e2e.ts` compte `/api/v1/pro/venues` par `includes` : une lecture `…/pro/venues/:id/publication` entrerait dans ce compte **si le compte de test portait une salle** — **mesuré : aucun des comptes de ce fichier ne porte de salle** (comptes créés par `createVerifiedAccount("PRO")`, aucune salle) ; la liste est vide, aucune carte, aucune lecture. Le risque est écarté par la lecture ET par les deux passes e2e.
- `e2e/specs/r50-salle-publiee.e2e.ts` (M-2) lit le texte d'une carte par `innerText()` **juste après** `toBeVisible()` et affirme `toContain(V.publication.draft)` : une lecture qui **n'attend pas**.

## Les trois mesures (sorties masquées par `portes/masquer-jetons.py`, copie non modifiée de celle de D351)

| mesure | pièce | résultat |
|---|---|---|
| le code de R-1, `r50` + `r37` + `r52`, API locale (quelques millisecondes) | `e2e-sous-ensemble-avant-correctif.txt` | **20 passés** (4,7 min), `r50` M-2 **vert** : la lecture arrive avant que le spec ne lise — **par chance, pas par construction** |
| même code, `r50` M-2 copié dans `zz-r50-latence.e2e.ts.txt` avec **1,5 s de latence** injectée sur la route de lecture du refus (`page.route`, `route.continue()` après 1 500 ms) | `e2e-latence-rouge.txt` | **ROUGE** : `Error: expect(received).toContain(expected)` — attendu « En attente de publication par Zwadj », reçu « Aucune photo R50 M2 2 … PUBLICATION VISIBILITÉ Visible Masquée … » : la carte porte « PUBLICATION » **sans état**, exactement le badge neutre que R-1 pose (elle ne sait pas) |
| **spec corrigé** (une ligne d'attente avant la lecture : `toContainText` de l'un OU l'autre état), même latence de 1,5 s | `e2e-latence-vert.txt` | **VERT** (2 passés : le préchauffage et le test) |

## Ce que cela décide

- La lecture `innerText()` immédiate **était une course** que l'API locale gagnait toujours : **un échec qui se déplace** (D127), et c'est cette lecture qui doit attendre, pas la carte qui doit afficher un état qu'elle ne connaît pas. Le correctif est dans le spec (`r50-salle-publiee.e2e.ts`, M-2), une attente web-first avant la lecture ; les `toContain` qui disent QUEL état, plus bas, sont **inchangés**.
- **La voie (A) tient** : le critère 4 est satisfait **par la révision écrite du spec, avec sa mesure** (`regle-portes.md`, critère 4 : « ou la révision écrite … avec sa mesure »), pas par un assouplissement silencieux. Ce n'est pas un motif pour la voie (B).
- ⚠ **Écrit pour ne pas se lire comme tenu** : une SEULE latence (1,5 s) et UN spec (M-2) sont mesurés ; les autres specs qui ouvrent la liste (`r37`, `r52`, `ca6`, `fc2`) ont été **lus**, pas rejoués sous latence : `r37` n'emploie que des assertions web-first (`toBeVisible`, `toHaveCount`), `r52` aussi ; `ca6` et `fc2` n'affirment rien du badge (lecture du code, `grep` sur « publication.draft »/« publication.published »). Une spec future qui lirait la carte sans attendre retrouverait la même course.
