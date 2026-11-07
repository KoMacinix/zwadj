# FP-2 — APRÈS LE 409 DE K-5, L'ÉCRAN GARDE LA COPIE DU NOM QUI EXISTE DÉJÀ — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `8fb0296fa24a13f4f322dc8ed56ac04a8a616ab1` (dernier commit de FP-1, poussé, local = origin vérifié). Méthode : NORMALE
(aucun montant : la copie du nom d'un devis est une donnée d'identité, jamais calculée ; la valeur remplacée à l'écran est celle que le
SERVEUR rend). Consigne : « après le 409 de K-5, garder la copie ; si impossible sans `GET /quotes/:id` → ARRÊTÉ ».
**La prémisse est vérifiée AVANT cette table** (lecture du code, D231) : le 409 `QUOTE_CLIENT_NAME_ALREADY_SET` ne porte que
`{ code, message }` (`apps/api/src/venues/quotes.service.ts`, `completeClientName`) ; il n'existe PAS de `GET /quotes/:id` ; MAIS la
liste des devis d'une salle (`GET /pro/venues/:id/quotes`, « toutes versions », `quotes.listForVenue` du client d'API) existe déjà et
rend le devis relu. ⇒ La relecture est possible SANS nouvelle route : la condition d'arrêt de la consigne n'est pas remplie, le lot se
fait. Le défaut, lu : sur un 409, le devis local reste SANS la copie (`nomManquant` reste vrai) — chaque remise suivante dans cette
langue repose la question du nom et se heurte au même 409.
Ordre des commits : (1) cette table seule ; (2) les tests et leurs ROUGES — lus contre l'état d'avant, empreintes sha256 ; (3) le code ;
(4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FP-2/table-ouverture.md` | cette table | 1 |
| 2 | `apps/pro/src/dashboard/walkin-journey.test.tsx` | après le 409, la liste des devis de LA SALLE est relue, le devis local reçoit la copie du serveur, la remise suivante part sans reposer la question ; un autre refus ne relit rien ; une relecture qui échoue ou qui ne retrouve pas le devis ne change rien | 2 |
| 3 | `docs/preuves/front-client/FP-2/rouges/rouge-pro.txt` | sortie des tests contre l'état d'avant + sha256 | 2 |
| 4 | `apps/pro/src/dashboard/walkin-journey.tsx` | le refus 409 de K-5 relit le devis (best effort) et garde la copie du serveur | 3 |
| 5 | `neutralisation/neutralize-fp2.py` | NEUF — le harnais du lot | 4 |
| 6 | `docs/preuves/front-client/FP-2/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 7 | `docs/preuves/front-client/FP-2/ancres-campagnes.txt` | relevé statique des ancres des campagnes concernées | 4 |
| 8 | `docs/preuves/front-client/FP-2/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 9 | `docs/preuves/front-client/FP-2/portes/typecheck.txt` | journal de porte | 4 |
| 10 | `docs/preuves/front-client/FP-2/portes/lint.txt` | journal de porte | 4 |
| 11 | `docs/preuves/front-client/FP-2/portes/test.txt` | journal de porte | 4 |
| 12 | `docs/preuves/front-client/FP-2/portes/build.txt` | journal de porte | 4 |
| 13 | `docs/preuves/front-client/FP-2/portes/test-int.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FP-2/portes/test-e2e.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FP-2/portes/resume.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FP-2/audit-secrets-fp2.txt` | audit de secrets scellé | 4 |
| 17 | `docs/preuves/front-client/FP-2/tri-audit-fp2.txt` | son tri | 4 |
| 18 | `docs/preuves/front-client/FP-2/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 19 | `docs/preuves/front-client/FP-2/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ancre ou une mesure serait périmée par ce lot (le relevé et les campagnes le
diront) — déclaré par une extension, commitée seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il porte des ancres CRLF.
Aucune chaîne visible n'est ajoutée : le refus garde son message (`quote.errors.clientNameAlreadySet`) ⇒ aucune clé arabe à relire.

## Extension 1 — commitée SEULE, avant le fichier qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 20 | `docs/preuves/front-client/FP-2/rouges/rouge-pro-v2.txt` | le ROUGE REJOUÉ contre l'état d'avant après la correction d'un test (le bouton du canal vérifié par une assertion, plus par une requête qui lève) ; empreinte du test livré | 2 bis |

Motif : la cible A-5 du harnais (ligne 5 de la table) — « une relecture qui échoue VIDE le devis local » — se lit PAS-ASSERTION : sous la
mutation, l'assistant de test du bloc FP-2 (ligne 2) échoue par `getByRole("button", { name: "Imprimé et remis" })` — une erreur de
REQUÊTE (le bouton n'existe plus, le devis est vidé), que le lecteur strict ne compte pas comme une morsure (D304, D316). Le test change
après son rouge : le bouton est vérifié par `queryByRole` + une assertion native, puis cliqué ; le rouge est rejoué avec le test livré.
