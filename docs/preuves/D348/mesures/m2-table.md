# D348 — M-2 : pourquoi une salle publiée ne s'affiche pas — chaque condition du code, JOUÉE

Jouée par `e2e/specs/r50-salle-publiee.e2e.ts` (describe « R50 · M-2 », un seul test, test 9 de `rouges/rouge-1-e2e-r50-contre-etat-avant.txt`), sur le site client lu dans un navigateur et sur l'application Pro lue à l'écran. Code d'application : `26ad5c7`, inchangé. La table brute est `pieces/m2-table-brute.json` (ligne `R50-M2-TABLE` de la sortie). **Aucune ligne n'est écrite de mémoire : chacune est un relevé, et la spec l'affirme (`toEqual` sur la table attendue).**

Chaque salle est isolée par un prix unique (`minPrice = maxPrice`). « Liste » = la salle est une carte de `/fr/salles`. « Liste + date » = idem avec `availableOn` à +60 jours. « Fiche » = statut HTTP de `/fr/salles/<slug>`, la PREMIÈRE visite faite APRÈS le changement d'état (le cache de 300 s de la fiche est la mesure M-3, pas celle-ci).

| # | condition (lue dans le code) | où dans le code | liste | liste + date | fiche | ce que le PRO lit sur « Mes salles » |
|---|---|---|---|---|---|---|
| 0 | **témoin** : publiée, `ACTIVE`, un créneau actif | — | oui | oui | 200 | « Publiée » · visibilité « Visible » |
| 1 | **brouillon** : jamais publiée | `PUBLIC_BASE_WHERE` : `publicationStatus = PUBLISHED` (`venues-public.service.ts:146`) | non | non | **404** | « **En attente de publication par Zwadj** » · « Visible » — le pro est averti que la salle attend ; il ne lit pas qu'elle est absente du site |
| 2 | **masquée** par le pro (`HIDDEN`) | liste : `status = ACTIVE` (`:188`) ; détail : `HIDDEN` hors de `PUBLIC_DETAIL_STATUSES` (`:141`) | non | non | **404** | « Publiée » · visibilité « **Masquée** » (le choix du pro, dit par le sélecteur). La phrase « une salle masquée reste modifiable : elle n'apparaît simplement pas dans la recherche » n'est lue qu'à l'étape 7 de l'assistant, pas sur la liste |
| 3 | **temporairement indisponible** (`TEMPORARILY_UNAVAILABLE`) | liste : `ACTIVE` seul ; détail : admis (`:141-144`, D33) | non | non | **200** | « Publiée » · « Temporairement indisponible ». ⚠ **la liste et la fiche se contredisent par conception (D33)** : introuvable en recherche, ouverte par son adresse |
| 4 | **supprimée** par le pro (`deletedAt`) | `PUBLIC_BASE_WHERE` : `deletedAt = null` | non | non | **404** | la salle a quitté la liste du pro (la confirmation de suppression le dit) |
| 5 | **publiée, aucun créneau actif**, avec une date demandée | `slotTemplates: { some: ACTIVE_SLOT }` quand `availableOn` est posé (`:213`, « situation B ») | **oui** (sans date) | **non** | 200 | « Publiée » · « Visible » — **aucun mot ne dit au pro que sa salle disparaît des recherches datées**. ⚠ L'API REFUSE de produire cet état (retirer le dernier créneau d'une salle publiée : 409) ; il n'est joué que par la base jetable |
| 6 | **compte du pro supprimé** (demande approuvée par l'admin) | `account-deletion.service.ts:206-212` : les salles du pro reçoivent `deletedAt` | non | non | **404** | sans objet : le compte est anonymisé, le pro n'a plus d'écran |
| 7 | filtre qui l'exclut (ville, budget, équipement, style) | `where` de `list()` | non | non | 200 | sans objet (c'est le visiteur qui filtre) — joué dans M-1 par les jumeaux négatifs |
| 8 | filtre « invités » : 300 places, 450 invités | `capacityMax >= guests` | non (250 invités : **oui**) | — | 200 | sans objet — joué ici, par M-2 |

## Conditions relevées dans le code et NON jouées, avec la raison

- **Compte du pro suspendu** : `UserStatus.SUSPENDED` existe, **aucun code ne l'écrit** (relevé : un commentaire seulement, `visit-bookings.controller.ts:4`) ; ni la liste ni la fiche ne lisent le compte du pro. Si une suspension est un jour écrite, la question se posera ; elle ne se pose pas aujourd'hui. Entrée de backlog.
- **Position dans la pagination** : `/salles` rend 12 cartes par page ; une salle publiée au-delà de la douzième est sur la page 2. Ce n'est pas « ne s'affiche pas », c'est un choix de présentation ; non joué.
- **L'accueil** ne montre que 6 « récentes » + 3 « moins chères » (sans doublon) : une salle publiée peut être sur `/salles` sans figurer à l'accueil. Dit dans M-1 (hors de ses garanties).
- **Aucune photo** : la salle est montrée avec « Aucune photo » (`.venue-card-nophoto`) ; ce n'est pas une condition d'exclusion. Constaté sur les cartes de M-2 (aucune photo) : toutes les salles sans photo restent dans la liste.
- **Salle prise à la date demandée** (« situation A ») : grisée, jamais retirée — comportement documenté (`availableOn`), non rejoué ici.

## Ce que le PRO sait, et ce qu'il ignore (constat, pas un défaut établi)

1. Il lit l'ÉTAT de publication (« En attente de publication par Zwadj » / « Publiée ») et la VISIBILITÉ qu'il a choisie : c'est suffisant pour comprendre un brouillon et une salle masquée.
2. **Aucun écran ne lui dit** : (a) qu'une salle « temporairement indisponible » reste ouverte par son adresse ; (b) qu'une salle publiée sans créneau actif disparaît des recherches datées (cas que l'API empêche déjà) ; (c) quand sa salle vient d'être publiée (aucun message, aucun lien « voir ma salle sur le site ») — ces deux dernières entrées sont celles de R-8 : **entrées de backlog**, rien n'est codé.
