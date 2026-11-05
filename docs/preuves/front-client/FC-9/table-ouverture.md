# FC-9 — LES AVERTISSEMENTS `act(...)` DE LA SUITE CLIENT — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `f4c925622526024c7054f46082ba351c356f6fc2` (dernier commit de FC-8, poussé, local = origin vérifié). Méthode : NORMALE
— aucun code produit n'est touché : les avertissements viennent de TESTS qui rendaient la main avant la dernière mise à jour d'état.
Consigne : « analyser le journal, vérifier la garde de `test-setup.ts`, corriger à la source, jamais faire taire ». Entrée de backlog
`[CLIENT][P2]` « LA SUITE CLIENT ÉMET DES `act(...)` » : son point à vérifier avant d'ouvrir (« `apps/client` a-t-il une garde
équivalente à celle d'`apps/pro` ? ») est tranché par la lecture — OUI, `apps/client/src/test-setup.ts` (lots S7, S8), quatre fichiers
EXEMPTÉS par un plafond.
Le relevé, fait AVANT cette table (trois passes `UPDATE_CONSOLE_CEILINGS=1`, sortie lue, aucune écriture au dépôt), dit : 100
avertissements dans `venue-detail-view.test.tsx` (5 par test sur 20 tests : `AvailabilityCalendar` ×2, `AuthProvider`,
`VisitBookingPanel`, `BookingRequestPanel`), 1 dans `google-signin.test.tsx` (`AuthProvider`, le test « feature OFF »), 0 dans
`booking-request-panel.test.tsx` (plafond 5) et dans `filter-wizard.test.tsx` (plafond 3) — les trois passes identiques.
Ordre des commits : (1) cette table seule ; (2) le relevé et les ROUGES — la garde sans exemption lue contre les tests d'avant,
empreintes sha256 ; (3) les corrections (des tests) ; (4) les harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-9/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-9/releve.md` | le RELEVÉ : par fichier, par test, par composant émetteur, et la cause | 2 |
| 3 | `docs/preuves/front-client/FC-9/releve/passe-1.txt` | sortie de la passe 1 (relevé), codes ANSI retirés | 2 |
| 4 | `docs/preuves/front-client/FC-9/releve/passe-2.txt` | sortie de la passe 2 | 2 |
| 5 | `docs/preuves/front-client/FC-9/releve/passe-3.txt` | sortie de la passe 3 | 2 |
| 6 | `apps/client/src/test-setup.ts` | les QUATRE exemptions retirées ; la garde d'un fichier non exempté devient une ASSERTION (son échec se lit comme tel, D304) ; le cas de calibration exempté à son compte connu | 2 |
| 7 | `apps/client/src/test-setup-calibration.test.ts` | NEUF — le CAS CONNU du mécanisme de plafond : sans fichier exempté, plus rien ne prouverait que « dépasser fait tomber », la sentinelle `A_RELEVER` et le mode relevé marchent | 2 |
| 8 | `docs/preuves/front-client/FC-9/rouges/rouge-client.txt` | la garde sans exemption lue contre les tests d'avant + sha256 | 2 |
| 9 | `apps/client/src/components/venue/venue-detail-view.test.tsx` | les tests attendent l'état FINAL de la fiche (ses quatre chargements) avant de rendre la main | 3 |
| 10 | `apps/client/src/components/auth/google-signin.test.tsx` | le test « feature OFF » attend la fin de l'amorçage de session | 3 |
| 11 | `neutralisation/neutralize-e3d1-s8.py` | S8-1 à S8-3 et la mesure de relevé DÉPLACÉES sur le cas de calibration (`venue-detail-view.test.tsx` n'est plus exempté) | 4 |
| 12 | `docs/preuves/front-client/FC-9/e3d1-s8.txt` | `neutralize-e3d1-s8.py 6 8` joué À LA MAIN après réorientation (le tri ne la sélectionne pas : elle lit des tests) | 4 |
| 13 | `neutralisation/neutralize-fc9.py` | NEUF — le harnais du lot | 4 |
| 14 | `docs/preuves/front-client/FC-9/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 15 | `docs/preuves/front-client/FC-9/ancres-campagnes.txt` | relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 16 | `docs/preuves/front-client/FC-9/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 17 | `docs/preuves/front-client/FC-9/portes/typecheck.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FC-9/portes/lint.txt` | journal de porte | 4 |
| 19 | `docs/preuves/front-client/FC-9/portes/test.txt` | journal de porte | 4 |
| 20 | `docs/preuves/front-client/FC-9/portes/build.txt` | journal de porte | 4 |
| 21 | `docs/preuves/front-client/FC-9/portes/test-int.txt` | journal de porte | 4 |
| 22 | `docs/preuves/front-client/FC-9/portes/test-e2e.txt` | journal de porte | 4 |
| 23 | `docs/preuves/front-client/FC-9/portes/resume.txt` | journal de porte | 4 |
| 24 | `docs/preuves/front-client/FC-9/audit-secrets-fc9.txt` | audit de secrets scellé | 4 |
| 25 | `docs/preuves/front-client/FC-9/tri-audit-fc9.txt` | son tri | 4 |
| 26 | `docs/preuves/front-client/FC-9/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 27 | `docs/preuves/front-client/FC-9/rapport.md` | le rapport du lot | 4 |

Conditionnels, avec leur condition : (a) un COMPOSANT dont la mise à jour tardive serait un défaut réel (un état écrit après
démontage) — le relevé n'en montre aucun ; s'il en apparaissait un, sa correction serait déclarée par une extension avant son
commit ; (b) un harnais d'un autre rang dont une ancre ou une mesure est périmée par ce lot (le relevé statique et les campagnes le
diront) — déclaré par une extension, commitée seule, avant sa réorientation.

## Extension 1 — commitée SEULE, avant le fichier qu'elle déclare (le conditionnel (b) s'est réalisé)

| # | fichier | rôle | commit |
|---|---|---|---|
| 28 | `neutralisation/neutralize-solid-s7.py` | S7-1 RÉORIENTÉE par écrit : « vider la liste d'exemptions du client fait tomber les fichiers qu'elle couvre » — le fichier couvert est désormais l'étalon `test-setup-calibration.test.ts` (l'entrée de `venue-detail-view.test.tsx` est retirée par ce lot) | 4 |

Motif : le relevé statique des trois campagnes que le tri sélectionne (calculé depuis le SHA de départ du lot : ses fichiers sont
commités avant les campagnes) rend 1 ancre PÉRIMÉE — `neutralize-solid-s7.py` S7-1, `apps/client/src/test-setup.ts` ×0. L'intention de
la cible est inchangée ; seule son ancre suit la liste.
