# FC-8 — LE LOT ③ : L'ASSISTANT EST UN MODE DE `/salles` — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `a2d96f056fe2c5d165d5c326fb470da52609ab15` (dernier commit de FC-7, poussé, local = origin vérifié). Méthode :
NORMALE (aucun montant calculé : le budget voyage en dinars sous `maxPrice`, `toApiQuery` reste la seule conversion vers l'API).
Le cadrage est D229 (« l'assistant n'est plus une route, c'est un MODE de `/salles` » ; aucun état local, l'URL seule source de
vérité), D230 (`?guide=<étape>` ; une valeur inconnue FERME le panneau ; `guide` entre dans `isVariant`), D231 (l'accueil, formulaire
SSR à TROIS champs, strictement additif) ; la consigne ajoute : supprimer `/[locale]/assistant`, le libellé « Li hwas lqa », la date
(cinquième étape) HORS lot. Si le cadrage contredit le code actuel : ARRÊTÉ.
Ordre des commits : (1) cette table seule ; (2) la prémisse et les ROUGES — lus contre l'état d'avant, empreintes sha256 ; (3) le
code ; (4) les harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-8/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-8/premisse.md` | la prémisse vérifiée au SHA de départ (D231) : le cadrage confronté au code d'aujourd'hui, point par point | 2 |
| 3 | `apps/client/src/components/filter-wizard.test.tsx` | RÉÉCRIT : l'assistant lit son étape et ses réponses dans l'URL, chaque réponse pousse une URL de `/salles` ; les gardes de la chrome partagée (rail, liaison, carte remontée) conservées | 2 |
| 4 | `apps/client/src/lib/search-query.test.ts` | `parseGuide` : une étape connue, sinon RIEN (le panneau se ferme) | 2 |
| 5 | `apps/client/src/lib/seo.test.ts` | `guide` fait d'une page de recherche une VARIANTE | 2 |
| 6 | `apps/client/src/components/search/search-view.test.tsx` | la page de résultats porte l'assistant quand `guide` est connu, et pas sinon | 2 |
| 7 | `apps/client/src/app/[locale]/page.test.tsx` | l'accueil : trois champs aux noms du contrat ; « Li hwas lqa » mène au mode guidé de `/salles` | 2 |
| 8 | `docs/preuves/front-client/FC-8/rouges/rouge-client.txt` | sortie des tests contre l'état d'avant + sha256 | 2 |
| 9 | `apps/client/src/components/filter-wizard.tsx` | RÉÉCRIT : un mode de `/salles`, sans état local, rendu par-dessus les résultats | 3 |
| 10 | `apps/client/src/components/search/search-view.tsx` | rend l'assistant quand `guide` est connu | 3 |
| 11 | `apps/client/src/app/[locale]/salles/(recherche)/page.tsx` | lit `guide` (par `parseGuide`) et le passe | 3 |
| 12 | `apps/client/src/lib/search-query.ts` | `GUIDE_STEPS`, `parseGuide`, `guidedSearchQuery` — purs | 3 |
| 13 | `apps/client/src/lib/seo.ts` | `guide` entre dans `SEARCH_VARIANT_PARAMS` | 3 |
| 14 | `apps/client/src/components/home-view.tsx` | trois champs (commune, invités, budget) ; avec JavaScript, le même formulaire devient l'étape 1 ; « Li hwas lqa » | 3 |
| 15 | `apps/client/src/app/[locale]/page.tsx` | l'accueil charge les communes (le premier champ) | 3 |
| 16 | `apps/client/src/app/[locale]/assistant/page.tsx` | SUPPRIMÉ (consigne) | 3 |
| 17 | `apps/client/src/lib/routes.ts` | `ASSISTANT_PATH` retirée avec sa page | 3 |
| 18 | `apps/client/src/app/theme.css` | la mise en page du panneau par-dessus les résultats | 3 |
| 19 | `packages/i18n/messages/fr.json` | « Li hwas lqa », « Fermer l'assistant » | 3 |
| 20 | `packages/i18n/messages/ar.json` | leurs pendants arabes (à relire) | 3 |
| 21 | `docs/preuves/front-client/FC-8/arabe-a-relire.md` | les clés arabes neuves ou modifiées | 3 |
| 22 | `neutralisation/neutralize-fc8.py` | NEUF — le harnais du lot | 4 |
| 23 | `docs/preuves/front-client/FC-8/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 24 | `docs/preuves/front-client/FC-8/ancres-campagnes.txt` | le relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 25 | `docs/preuves/front-client/FC-8/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 26 | `docs/preuves/front-client/FC-8/portes/typecheck.txt` | journal de porte | 4 |
| 27 | `docs/preuves/front-client/FC-8/portes/lint.txt` | journal de porte | 4 |
| 28 | `docs/preuves/front-client/FC-8/portes/test.txt` | journal de porte | 4 |
| 29 | `docs/preuves/front-client/FC-8/portes/build.txt` | journal de porte | 4 |
| 30 | `docs/preuves/front-client/FC-8/portes/test-int.txt` | journal de porte | 4 |
| 31 | `docs/preuves/front-client/FC-8/portes/test-e2e.txt` | journal de porte | 4 |
| 32 | `docs/preuves/front-client/FC-8/portes/resume.txt` | journal de porte | 4 |
| 33 | `docs/preuves/front-client/FC-8/audit-secrets-fc8.txt` | audit de secrets scellé | 4 |
| 34 | `docs/preuves/front-client/FC-8/tri-audit-fc8.txt` | son tri | 4 |
| 35 | `docs/preuves/front-client/FC-8/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 36 | `docs/preuves/front-client/FC-8/rapport.md` | le rapport du lot | 4 |

Conditionnels, avec leur condition : les harnais d'autres rangs qui MESURENT l'assistant — `neutralisation/neutralize-maxprice.py`
(M3, M4), `neutralisation/neutralize-journey.py` (D3), `neutralisation/neutralize-r32.py` (R-1, mesure « client-wizard »),
`neutralisation/neutralize-e3d1-s8.py` (S8-1 à S8-3, le plafond d'avertissements de `filter-wizard.test.tsx`) — si une ancre, un
titre ou une mesure y est périmé par ce lot (le relevé et les campagnes le diront) : déclaré par une extension, commitée seule,
avant sa réorientation ; et sa sortie sous CRLF simulé s'il porte des ancres CRLF.

## Extension 1 — commitée SEULE, avant les fichiers qu'elle déclare (les conditionnels se sont réalisés)

| # | fichier | rôle | commit |
|---|---|---|---|
| 37 | `e2e/specs/fc8-mode-guide.e2e.ts` | NEUF — le mode guidé dans un VRAI navigateur : la page serveur passe `guide` (D205 : invisible aux tests unitaires), chaque réponse pousse l'URL, une valeur inconnue ne l'ouvre pas, sans JavaScript la page de résultats reste entière, « Li hwas lqa » l'ouvre en arabe | 2 bis |
| 38 | `docs/preuves/front-client/FC-8/rouges/rouge-e2e.txt` | sa sortie contre l'état d'avant (code mis de côté) + sha256, lignes `[WebServer]` retirées | 2 bis |
| 39 | `neutralisation/neutralize-available-on.py` | cible 7 RÉORIENTÉE : la liste des variantes de `seo.ts` porte désormais `guide` après `page` (même faute : `page` n'est plus une variante) | 4 |
| 40 | `neutralisation/neutralize-maxprice.py` | M3 RÉORIENTÉE (l'assistant pousse des CENTIMES dans l'URL publique — le facteur 100), M4 RETIRÉE par écrit (le compteur d'API n'existe plus) | 4 |
| 41 | `neutralisation/neutralize-e3d1-s8.py` | S8-1 à S8-3 et leurs mesures DÉPLACÉES sur `venue-detail-view.test.tsx` : `filter-wizard.test.tsx` n'émet plus aucun avertissement `act`, le plafond n'y peut plus rien mesurer | 4 |
| 42 | `docs/preuves/front-client/FC-8/crlf/available-on.txt` | `neutralize-available-on.py` joué sous CRLF simulé (ancres 6 et 7 en CRLF) | 4 |
| 43 | `docs/preuves/front-client/FC-8/crlf/horizon.txt` | `neutralize-horizon.py` joué sous CRLF simulé (ancre H6 en CRLF ; le tri la sélectionne) | 4 |
| 44 | `docs/preuves/front-client/FC-8/e3d1-s8.txt` | `neutralize-e3d1-s8.py` joué À LA MAIN après réorientation (le tri ne la sélectionne pas : elle lit un fichier de test, pas un fichier de code du lot) | 4 |

Motif : (1) le relevé statique des 13 campagnes que le tri sélectionne rend 3 ancres PÉRIMÉES par ce lot (available-on 7, maxprice
M3, M4) ; (2) la suite du client rend « PLAFOND ABAISSABLE `filter-wizard.test.tsx` : 0 observé sous un plafond de 3 » — les cibles
S8 de `neutralize-e3d1-s8.py`, qui prouvent le mécanisme de plafond SUR CE FICHIER, deviendraient muettes ; (3) la page `/salles`
est un composant serveur : le passage de `guide` ne se mesure qu'en navigateur.
