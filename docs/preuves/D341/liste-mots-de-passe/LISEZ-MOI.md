# D341 — la liste des mots de passe courants (R-5 (D341)) : provenance, licence, empreintes, rejeu

Cette pièce dit **d'où vient** la liste que `apps/api/src/staff/staff-password-policy.ts` oppose aux mots de passe du personnel, **sous quelle licence**, **comment on la vérifie** et **ce qu'elle n'établit pas**. Les chiffres viennent de la table d'ouverture du lot (`docs/preuves/D341/table-ouverture.md`, commit `ed30944`, section « La liste des mots de passe courants »), écrite AVANT tout code ; le module généré et les tests la confrontent, ils ne la recopient pas.

| champ | valeur |
|---|---|
| source | dépôt public `danielmiessler/SecLists` (<https://github.com/danielmiessler/SecLists>), fichier `Passwords/Common-Credentials/10k-most-common.txt` |
| version | commit `4afe4d3de0a5d227c59ae2f162d22b93b4c27bfd` ; le fichier de `master` et celui de ce commit ont les mêmes octets (mesuré à l'ouverture) |
| licence | **MIT**, « Copyright (c) 2018 Daniel Miessler » (1 072 octets, sha256 `3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c`). La licence exige que l'avis de droit d'auteur et le texte de permission accompagnent les copies : ils sont versés ici (`LICENSE-SecLists-MIT.txt`) **et** reproduits dans l'en-tête du module généré |
| sha256 du fichier source | `68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce` — 73 026 octets, fins de ligne LF |
| entrées | **10 001**, toutes distinctes, ASCII seul, aucune vide ; **aucune ne porte de majuscule** (mesuré le 04/11/2026 : 0 sur 10 001) |
| comparaison | après mise en minuscules des **deux** côtés (R-5) : le candidat l'est à chaque appel, la liste à la construction de l'ensemble. ⚠ Comme la source n'a aucune majuscule, la mise en minuscules de la LISTE est sans effet sur ces données : elle est mesurée par un test à source de remplacement (`staff-password-policy.spec.ts`, « la liste est mise en minuscules à la CONSTRUCTION »), pas par la liste réelle |
| ce que la licence NE dit PAS | la licence est celle du **dépôt** ; elle ne documente pas l'origine des mots de ce fichier. L'origine des mots n'est pas relevée |
| ce que la liste ajoute au schéma actuel | **340** des 10 001 entrées passent déjà `passwordSchema` (≥ 8 caractères, une lettre, un chiffre) ; les 9 661 autres sont refusées avant la liste. Elle n'ajoute que **340 refus** à la règle d'aujourd'hui |

## Les fichiers de ce dossier

| fichier | rôle | octets | sha256 |
|---|---|---:|---|
| `10k-most-common.txt` | la source, **octet pour octet** | 73 026 | `68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce` |
| `LICENSE-SecLists-MIT.txt` | l'avis de licence, octet pour octet | 1 072 | `3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c` |
| `generer-liste.py` | le générateur du module (archivé comme PREUVE, jamais promu en instrument, D291) | — | `d6440bac122fdcdbca1d5b0af94b873a2b0609cd0ffdddfc750538b542a8b899` |

`.gitattributes` coupe toute conversion de fin de ligne sous `docs/preuves/` (`-text`) : les octets versés sont ceux qui ont été mesurés.

## Le module généré

`apps/api/src/staff/staff-common-passwords.ts` — 125 719 octets, sha256 `707bfd6c841cc0a23eba379dd9dd223cb17c1aa29dce7e0e56a07853c6dad977` à la date de cette écriture. En tête : « MODULE GÉNÉRÉ — NE PAS ÉDITER À LA MAIN », la source, le commit, l'empreinte, l'avis MIT. Puis les 10 001 littéraux de chaîne, dans l'ordre du fichier, puis la provenance **en donnée** (`STAFF_COMMON_PASSWORDS_SOURCE`).

**Pourquoi un module généré et pas un fichier lu à l'exécution** : `nest build` ne copie que le code compilé ; lire un fichier de données au démarrage demanderait une configuration d'actifs de build et un chemin qui diffère entre `src/` (vitest) et `dist/` (production). Un module TypeScript voyage avec le code.

## Ce qui garde la liste

- `staff-password-policy.spec.ts` relit le fichier versé, recalcule son sha256, le confronte à celui de la table d'ouverture et au module (ligne à ligne), et vérifie le nombre d'entrées (≥ 10 000, R-5) : un module qui dériverait de sa source, ou une table qui dériverait du module, rougit.
- `generer-liste.py` **refuse** de rien écrire si le sha256 de la source ou celui de l'avis n'est pas celui que la table écrit (code 3).
- Rejeu : `python3 docs/preuves/D341/liste-mots-de-passe/generer-liste.py` depuis la racine reproduit **les mêmes octets** — rejoué le 04/11/2026 sur le module livré : sha256 `707bfd6c841cc0a23eba379dd9dd223cb17c1aa29dce7e0e56a07853c6dad977` AVANT et APRÈS, 125 719 octets, 10 001 entrées.

## Ce que cette liste n'établit pas (écrit pour ne pas se lire comme tenu)

- Qu'un mot de passe **absent** de la liste soit bon : DR5 et R-5 n'imposent aucune règle au-delà de « `passwordSchema` + refus des plus courants + refus de réutiliser le précédent ». Un mot de passe de 8 caractères avec une lettre et un chiffre, hors liste, passe.
- Que la liste couvre les mots de passe **algériens** ou arabophones : c'est une liste anglophone générique.
- Que la licence couvre l'origine des mots (voir plus haut).
