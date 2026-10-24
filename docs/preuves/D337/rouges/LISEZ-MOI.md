# D337 — les rouges de L36-1, LUS contre l'état d'avant (règle de `AGENTS.md`, D334 item 5 : cette pièce entre dans un commit ANTÉRIEUR au premier commit de code)

**État d'avant** : aucun fichier de production n'est modifié ; `git diff 2c48afb --name-only` sur `apps/**/src` hors tests, `packages/**` et `apps/api/prisma` est vide au moment du jeu. Les seuls fichiers modifiés sont des fichiers de TEST (empreintes dans `empreintes-fichiers-de-test.txt`, calculées AVANT le jeu, sur les fichiers tels que joués). Le dernier commit est `2c48afb` (dette de preuve de r41).

| mesure | commande | sortie | résultat |
|---|---|---|---|
| unitaires API | `pnpm --filter @zwadj/api exec vitest run src/common/contact.spec.ts src/venues/bookings.schemas.spec.ts src/venues/booking-notification-input.spec.ts` | `rouge-api-unitaire.txt` | 12 échecs / 99 |
| client | `pnpm --filter @zwadj/client exec vitest run src/components/venue/booking-request-panel.test.tsx src/lib/contact-channel-guard.test.ts` | `rouge-client.txt` | 10 échecs / 39 |
| pro | `pnpm --filter @zwadj/pro exec vitest run src/dashboard/walkin-contact.test.ts src/dashboard/walkin-journey.test.tsx src/venues/booking-requests-section.test.tsx` | `rouge-pro.txt` | 12 échecs / 168 |
| intégration (PostgreSQL réel) | `pnpm --filter @zwadj/api exec vitest run -c vitest.config.int.ts test/int/bookings.int-spec.ts test/int/quotes.int-spec.ts test/int/migration-non-empty.int-spec.ts` | `rouge-integration.txt` | 13 échecs / 134 |
| e2e | `pnpm --filter @zwadj/e2e exec playwright test r42-reservation-email-seul` | `rouge-e2e.txt` | 2 échecs sur 2 (+ le préchauffage, passé) |

**47 tests rouges lus** (12 + 10 + 12 + 13) plus 2 pour l'e2e, lus par un lecteur (`scratchpad`, non versé : il lit les blocs `FAIL … > titre` regroupés, patron de `neutralize-r41.py`), la première ligne du bloc de chacun étant relevée.

## Ce que chaque rouge dit, et pourquoi il est rouge (lu, pas déduit)

- **Fonctions de la règle absentes** (`TypeError: (0 , hasContactChannel) is not a function`, 6 tests de `contact.spec.ts`) : rouges parce que la règle n'existe pas encore ; ce sont des plantages, PAS des assertions — le verdict d'assertion viendra au vert, et la morsure par le harnais `neutralize-r42.py`.
- **Les schémas refusent l'e-mail seul** (`expected false to be true`, `bookings.schemas.spec.ts` ML-2 et ML-3, `contact.spec.ts` ML-2 de la conversion) et **ne portent pas la clé du message neuf** (`expected [] to have a length of 1`, ML-1) : assertions natives, rouges pour la bonne raison.
- **La charge utile de notification ne donne pas l'e-mail** (`expected null to be 'yasmine@example.dz'`) : assertion native.
- **L'API refuse l'e-mail seul** (`expected 201 "Created", got 400`, cinq tests de `bookings.int-spec.ts`, un de `quotes.int-spec.ts`) : erreur de supertest (`Error`, pas `AssertionError`) ; la lecture « assertion » de R1 est exigée sur le chemin de l'argent seulement, et ce lot est de méthode NORMALE (le montant est inchangé) — dit ici pour ne pas se lire comme tenu. Les deux tests « clé du message neuf » (`expect(JSON.stringify(res.body)).toContain`) sont des assertions natives.
- **La migration du lot n'existe pas** (`expected -1 to be greater than or equal to 0`, premier test du bloc L36-1 de `migration-non-empty.int-spec.ts`) : assertion native. ⚠ **Les quatre tests suivants du bloc rougissent en CASCADE** (`relation "bookings" does not exist` : la préparation n'a pas eu lieu) ou parce que la colonne est encore obligatoire — rouges parce que la migration manque, mais le message de deux d'entre eux ne le dit pas ; ils se relisent au vert.
- **Le formulaire client** : `expected true to be false` (le bouton reste inerte sans numéro, ML-2) et le champ du numéro porte encore `required` (L-b) : assertions natives ; **`It looks like undefined was passed instead of a matcher`** (ML-1, ML-19, ML-7 en arabe) : rouges parce que les clés `contactHint` et `emailInvalid` n'existent pas encore dans le catalogue — une erreur de requête, pas une assertion.
- **Le contact du pro** : `contactBlockers` rend encore `needPhone` (assertions natives, 7 tests) ; `contactPayload` envoie encore la clé du numéro (assertion native) ; la liste des demandes ne rend pas l'e-mail (`TestingLibraryElementError`, 2 tests — erreur de requête).
- **L'écran de conversion** (`walkin-journey.test.tsx`) : le bouton « Enregistrer » reste grisé sans numéro (assertion native) et un libellé de l'e-mail manque (`TestingLibraryElementError`).
- **La garde de source** (`contact-channel-guard.test.ts`) : les quatre consommateurs n'utilisent pas encore `hasContactChannel` (assertion native) ; les clés neuves sont absentes (assertion native).
- **L'e2e** : `TypeError: Cannot read properties of undefined (reading 'unicode')` — `B.contactHint` et `B.emailInvalid` n'existent pas dans le catalogue ; l'e2e ne dit donc rien de plus que « les messages manquent ». Elle se lit au vert.

## Les tests qui sont déjà VERTS avant le code (garde de non-régression, pas des rouges)

Dans les mêmes fichiers : ML-8, ML-9, ML-10 et ML-17 des schémas (un numéro invalide, vide ou `null` est refusé ; une clé inconnue reste refusée) — vrais aujourd'hui et qui doivent le rester ; ML-4 de la réservation en ligne (numéro + e-mail, numéro seul) ; « le pro PEUT ajouter un numéro à la conversion » ; ML-1 de la conversion côté écran (il est vrai aujourd'hui POUR LA MAUVAISE RAISON — le numéro manque —, et reste vrai demain pour la bonne : `needIdentifier` ; le test lit la raison affichée) ; ML-6 (SMS et appel bloqués sans numéro, e-mail disponible). Ceux-là ne prouvent rien contre le défaut ; ils gardent ce que le lot ne doit pas casser.

## Un rejeu, dit

Le test « ML-1 à la conversion » de `walkin-journey.test.tsx` cherchait le champ e-mail de la conversion par le libellé de l'étape Contact (`FR.contactEmail`) : première sortie, `Unable to find a label…` (erreur de requête, pas une assertion). Le libellé de la conversion est `FR.email` ; le fichier a été corrigé, **l'empreinte ci-dessous est celle du fichier corrigé**, et `rouge-pro.txt` est la sortie du REJEU (12 échecs sur 168, dont ce test, désormais par `AssertionError`). Les autres sorties n'ont pas été rejouées : leurs fichiers n'ont pas changé entre le jeu et l'empreinte.
