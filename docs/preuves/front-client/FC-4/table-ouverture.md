# FC-4 — LE JOUR ET LE CRÉNEAU DÉJÀ DEMANDÉS (REQUESTED) DEVIENNENT CHOISISSABLES, AVEC UN AVIS — table d'ouverture (SEULE)

SHA de départ : `470dfe15a7db950bf8237e419ca12d58a78a2fc5` (dernier commit de FC-3, poussé). Méthode : NORMALE avec la règle des montants (D325) — l'écran ne calcule
aucun prix : le prix d'un créneau demandé est celui que le serveur rend, et un test l'exige ; décision du relecteur : « le
créneau suit le jour ». Ordre des commits : (1) cette table seule ; (2) les ROUGES — les tests, lus contre l'état d'avant,
empreintes sha256 ; (3) le code ; (4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-4/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-4/premisse.md` | la prémisse vérifiée à ce SHA (D231), et ce que REQUESTED veut dire, relevé dans le moteur | 2 |
| 3 | `apps/client/src/components/venue/booking-request-panel-demande.test.tsx` | NEUF — la garde du panneau : jour et créneau demandés choisissables, nommés, l'avis, le prix du serveur | 2 |
| 4 | `apps/client/src/lib/booking-calendar.test.ts` | la règle du jour : C-b INVERSÉ par l'arbitrage (un REQUESTED suffit) ; puis `dayState` et `isSlotChoosable` | 2 et 3 |
| 5 | `docs/preuves/front-client/FC-4/rouges/rouge-panneau.txt` | sortie du test du panneau contre l'état d'avant + sha256 | 2 |
| 6 | `docs/preuves/front-client/FC-4/rouges/rouge-calendrier.txt` | sortie du test du module pur contre l'état d'avant + sha256 | 2 |
| 7 | `apps/client/src/lib/booking-calendar.ts` | le CODE : `CHOOSABLE_SLOT_STATUSES`, `isSlotChoosable`, `dayState` ; `isDaySelectable` les suit | 3 |
| 8 | `apps/client/src/components/venue/booking-date-picker.tsx` | le CODE : le nom et l'aspect d'un jour suivent son état | 3 |
| 9 | `apps/client/src/components/venue/booking-request-panel.tsx` | le CODE : le créneau demandé se choisit, son libellé le dit, l'avis | 3 |
| 10 | `apps/client/src/app/theme.css` | le CODE : le jour demandé en bord pointillé, l'avis en encre normale | 3 |
| 11 | `packages/i18n/messages/fr.json` | trois clés : `dayRequested`, `requested`, `requestedNotice` | 3 |
| 12 | `packages/i18n/messages/ar.json` | les mêmes trois clés (parité) | 3 |
| 13 | `neutralisation/neutralize-fc4.py` | NEUF — le harnais du lot | 4 |
| 14 | `docs/preuves/front-client/FC-4/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 15 | `docs/preuves/front-client/FC-4/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 16 | `docs/preuves/front-client/FC-4/portes/typecheck.txt` | journal de porte | 4 |
| 17 | `docs/preuves/front-client/FC-4/portes/lint.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FC-4/portes/test.txt` | journal de porte | 4 |
| 19 | `docs/preuves/front-client/FC-4/portes/build.txt` | journal de porte | 4 |
| 20 | `docs/preuves/front-client/FC-4/portes/test-int.txt` | journal de porte | 4 |
| 21 | `docs/preuves/front-client/FC-4/portes/test-e2e.txt` | journal de porte (sans lignes `[WebServer]`) | 4 |
| 22 | `docs/preuves/front-client/FC-4/portes/resume.txt` | code de sortie et durée de chaque porte | 4 |
| 23 | `docs/preuves/front-client/FC-4/arabe-a-relire.md` | les trois clés arabes neuves, à relire par un humain | 4 |
| 24 | `docs/preuves/front-client/FC-4/audit-secrets-fc4.txt` | audit de secrets scellé | 4 |
| 25 | `docs/preuves/front-client/FC-4/tri-audit-fc4.txt` | son tri différentiel | 4 |
| 26 | `docs/preuves/front-client/FC-4/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 27 | `docs/preuves/front-client/FC-4/rapport.md` | le rapport du lot | 4 |

Conditionnels : aucun.
