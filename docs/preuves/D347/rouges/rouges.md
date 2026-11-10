# D347 — les rouges de r49, lus AVANT le commit de la spec et du harnais (D334, point 5)

Fichiers joués (non encore commités à l'écriture de cette pièce) :

| fichier | sha256 |
|---|---|
| `e2e/specs/r49-nouvelle-reservation.e2e.ts` | `bd326b455cbf562f01c320197383079bfd1f217423821ec82f1c4bf7fa5da784` |
| `neutralisation/neutralize-r49.py` | `ca5d06e1be22c77aa86f183daa0db7310521b2fff977d04ec8b12d3d34f6162d` |

Ici « rouge » = la spec, inchangée, jouée contre l'application dont UNE garde est neutralisée par le harnais ; la spec n'a pas de « avant » sans elle (l'application d'aujourd'hui ne contredit aucune garde — R-3 n'a pas joué). Vert d'abord : la spec jouée seule sur l'application intacte donne 6 passés + 1 préchauffage (`ok 6 · x 0`, pré-vol des deux passes du harnais).

## Résultat — 36 cibles, 36 mordues (lues en `expect(...)`), 0 muette, 0 non mesurée
- **Passe 1** (`rouges/campagne-passe-1.txt`) : 17 mordues (R49-1 à R49-10, R49-12 à R49-18). Deux incidents d'instrument, écrits ici :
  - **R49-11 MUETTE — mutation ÉQUIVALENTE** : la cible neutralisait `leadingDigitRejected` de `applyPhoneInput`, un champ que le composant `PhoneField` ne lit pas (il recalcule `rejected` lui-même, `packages/ui/src/phone-field.tsx:95`). Ce n'était pas une garde aveugle : la mutation ne changeait rien (précédent D325). Réorientée sur `rejected`.
  - **R49-19 « MUTATION NON POSÉE »** : le texte remplaçant contenait l'ancre (ancre 1→1), la campagne s'est arrêtée avant de la jouer (code 2). Réécrite en substitution.
- **Passe 2** (`rouges/campagne-passe-2.txt`) : reprise par `--seulement` des 19 cibles R49-11 et R49-19 à R49-36 — 19 mordues sur 19. ⚠ **La campagne n'a donc pas été jouée d'un seul tenant** (deux passes, la seconde partielle) ; la réunion est complète (36 sur 36, chaque cible jouée sur le code actuel du harnais SAUF R49-1 à R49-10 et R49-12 à R49-18, jouées par la version du harnais avant l'ajout de `--seulement` et la correction de R49-11/19 — leurs ancres et leurs remplacements n'ont pas changé).
- Une relance de la reprise lancée par erreur sur le harnais ancien (sans `--seulement`) a été arrêtée pendant son pré-vol, avant toute mutation (arbre propre vérifié).
- `rouges/extraits-des-echecs.txt` : pour chacune des 36 cibles, le bloc d'échec du test visé. Les journaux bruts ne sont pas versés (ils contiennent des jetons de développement des courriels d'activation).
- Arbre rendu à son état de départ : vérifié à l'arrivée de chaque passe (« arbre rendu à son état de départ : vérifié »).

## Mesures ajoutées par la campagne à la lecture
- R49-34 (la page arabe n'est plus `rtl`) : première ligne `Error:` absente du résumé (« — »), mais le bloc porte `expect(locator).toHaveAttribute` avec `Expected "rtl"` / `Received "ltr"` (extrait).
