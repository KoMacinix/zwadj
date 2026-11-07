# FC-8 — LE LOT ③ : L'ASSISTANT EST UN MODE DE `/salles` — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `a2d96f0` (FC-7 poussé, local = origin vérifié). Commits du lot : `483a6b8` (table,
seule) → `7cbb976` (prémisse, rouges client) → `62e16cf` (extension 1, seule) → `bbebb96` (spec e2e et son rouge) → `4bb9a77`
(extension 2, seule) → `afc3b8e` (spec e2e au sélecteur exact, rouge rejoué) → `5e000d1` (extension 3, seule) → `09aa55f`
(extension 4, seule) → `93fc2e0` (les deux tests du panneau modal et leur rouge) → `88fabd6` (extension 5, seule) → `75cc9d6`
(le lecteur d'URL du test en assertion, les rouges rejoués avec le test livré) → `8fa1413` (code) → le commit de clôture. Méthode NORMALE : le budget voyage en DINARS sous `maxPrice` dans l'URL publique ; `toApiQuery` reste la seule
conversion vers l'API ; aucun montant n'est calculé ni recalculé dans le navigateur.

## Fait
- **L'assistant n'est plus une route, c'est un MODE de `/salles` (D229).** `apps/client/src/app/[locale]/assistant/page.tsx` est
  SUPPRIMÉE, `ASSISTANT_PATH` retirée de `routes.ts` (avec la raison écrite à sa place). La page `/salles` (composant serveur) lit
  `?guide=<étape>` par `parseGuide` et le passe à la vue ; la vue rend l'assistant PAR-DESSUS les résultats réels quand l'étape est
  connue (`.wz-overlay`, `role="dialog"`, `aria-modal`, titre lié).
- **AUCUN ÉTAT LOCAL : l'URL est la seule source de vérité (D229).** `filter-wizard.tsx` est réécrit EN PLACE (même fichier, même
  nom) : il reçoit l'étape et l'état de recherche de la page ; chaque réponse POUSSE une URL de `/salles` (`router.push`, donc le
  bouton retour recule d'une question — D230) ; une coche (styles, équipements) REMPLACE l'URL sans quitter l'étape
  (`router.replace`) ; « Voir les salles » ferme le panneau (l'URL perd `guide`). Les champs commune et invités sont NON contrôlés
  (D229 : « le champ invités est le seul non contrôlé » — la commune l'est aussi, voir décisions). Le compteur « N salles » est le
  `total` des résultats de la page : le même calcul serveur, plus aucun appel d'API propre à l'assistant.
- **Les règles sont PURES** (`search-query.ts`) : `GUIDE_STEPS`, `parseGuide` (une étape connue, sinon `null` : **toute valeur
  inconnue FERME le panneau**, D230), `guidedSearchQuery` (construit l'URL avec `toPublicQuery`, donc les noms et l'encodage que
  `/salles` lit — D228), `guideAnswered`, `nextGuideStep` (la première étape SANS réponse APRÈS celle qu'on quitte, sinon la
  dernière : « Passer » avance et la séquence se TERMINE — l'assistant d'avant pouvait retomber sur la commune).
- **`guide` est une VARIANTE** (`seo.ts`, D230, D216) : `noindex, follow`, canonical sur la page nue.
- **L'accueil (D231) : trois champs, strictement additif.** La commune (les communes sont chargées par la page d'accueil, serveur),
  les invités, le budget — sans JavaScript, le formulaire soumet ces trois champs et rien d'autre (le champ `guide` n'est PAS dans le
  HTML du serveur) ; avec JavaScript, le même formulaire devient l'ÉTAPE 1 : il porte l'étape SUIVANTE de l'assistant (« répondre à
  la première question pousse vers `/salles?cityId=…&guide=guests` », D229 mot pour mot). Le lien « Li hwas lqa » ouvre l'assistant à
  sa première étape (`/salles?guide=city`).
- **Une boîte MODALE se comporte comme telle** (complément, extension 4) : le panneau déclarait `aria-modal="true"` sans en avoir le
  comportement — relu avant le commit du code, Échap ne fermait rien et Tab sortait vers la page qu'un lecteur d'écran tait. Il est
  BRANCHÉ sur le seul piège de focus du dépôt (`useDismissLayer`, `@zwadj/ui`, lot A11a) : Échap ferme (la même URL que « Fermer »),
  Tab boucle dans la boîte, la page dessous ne défile plus. Deux tests d'abord, leur ROUGE lu contre le code du lot sans le piège
  (`rouges/rouge-client-v2.txt`), puis le câblage ; cible G-12 du harnais.
- **La chrome partagée est GARDÉE** (`@zwadj/ui/journey`, D223) : rail, récapitulatif, liaison, carte remontée — les gardes de
  `neutralize-journey.py` et de `neutralize-r32.py` (R-1) y sont rejouées (ci-dessous).
- **Rouges avant le code** (`7cbb976`) : 37 échecs sur 156 tests contre l'état d'avant (l'assistant d'avant a un autre contrat : les
  éléments introuvables sont écrits comme tels, par assertions natives) ; e2e (`afc3b8e`, rejouée au sélecteur exact) : 2 échecs
  par assertions web-first (le parcours guidé, l'entrée arabe), 2 bras de calibration verts (la valeur inconnue, le HTML sans
  JavaScript) ; empreintes sha256 dans les pièces.
- **Harnais** `neutralisation/neutralize-fc8.py` : **12 sur 12 mordues** avec `--e2e` (`neutralisation/sortie.txt`, rejoué après le
  complément) — dont les deux que seul un navigateur voit (D205) : le panneau rendu par le SERVEUR (G-7) et la page qui ne passe plus
  `guide` (G-8) ; et G-12, la boîte qui se dit modale sans en avoir le comportement.
- **Trois harnais d'autres rangs réorientés, par écrit** (extension 1) : `neutralize-available-on.py` cible 7 (la liste des
  variantes porte `guide` après `page`) ; `neutralize-maxprice.py` M3 RÉORIENTÉE (l'assistant pousse des CENTIMES dans l'URL
  publique — le facteur 100) et M4 RETIRÉE (le compteur d'API de l'assistant n'existe plus) ; `neutralize-e3d1-s8.py` S8-1 à S8-3
  DÉPLACÉES sur `venue-detail-view.test.tsx` (`filter-wizard.test.tsx` n'émet plus aucun avertissement `act` : 0 observé sous un
  plafond de 3 — un plafond y serait muet).
- **Campagnes** (`campagnes.txt`) : la série — 14 campagnes, **226 mordues · 3 muettes ou en erreur · 9 non mesurées** — puis les
  rejeux. Les trois écarts sont d'ENVIRONNEMENT : available-on 6 et horizon H6 (ancres écrites en CRLF, conteneur en LF) → **sous
  CRLF simulé : available-on 10/10, horizon 6/6** (`crlf/`) ; r33 M-12 (garde de fuseau muette sur un serveur en UTC, prouvé en FC-4,
  comme en FC-6). Les 9 non mesurées : fc1 (2) et fc2 (1) → **rejouées avec `--e2e` : 6/6 et 1/1** ; fc8 (2) → `--e2e` : voir le
  harnais ; r25 (4 : `--int`, `--e2e`) hors de ce que ce lot touche. Après le complément : journey **7/7**, maxprice **6/6**,
  e3d1-s8 S8-1 à S8-3 **3/3** sur leur nouveau fichier (`e3d1-s8.txt`), r32 **65/65** après l'extension 5 (`r32.txt`). Relevé statique des ancres : 274
  cibles examinées sur 274, 0 périmée, 3 CRLF (environnement) ; après le complément, 105 sur 105, 0 écart.
- **⚠ Ce que le rejeu de r32 a TROUVÉ** (extension 3, puis 5) : sous R-1 (le rail ne réagit plus au clic), le test réécrit de
  l'assistant rougissait par un PLANTAGE (« TypeError: Cannot read properties of undefined (reading 'split') » — il lisait une URL
  jamais poussée), que le lecteur strict ne compte pas comme une morsure : **R-1 était muette côté client**. Le lecteur d'URL du test
  (`relue`) dit désormais une URL absente en assertion native ; les rouges sont rejoués avec le test livré (`rouges/rouge-client-v3.txt`).

## La prémisse (`premisse.md`, D231)
Le cadrage ne contredit pas le code : le lot se fait. **Une incidente, créée par FC-7** : D230 faisait entrer `maxPriceCents` dans
`isVariant` parce que le repli le LISAIT encore ; FC-7 l'a retiré, le paramètre n'a plus aucun effet sur la page, il ne fait donc
pas une seconde adresse. Seul `guide` entre dans `SEARCH_VARIANT_PARAMS`.

## Pas fait, et pourquoi
- La DATE (cinquième étape) : hors lot (consigne).
- Les paliers de budget : inchangés (hors lot) — l'assistant pousse le palier choisi en dinars.
- **`/salles` sans JavaScript reste sur la roue de `loading.tsx`** — défaut ANTÉRIEUR à ce lot, relevé contre l'état d'avant : le
  contenu diffusé n'est révélé que par un script. Ce lot garantit ce qui se lit dans le document servi (le panneau n'y est pas, le
  formulaire si — e2e) ; le défaut est RAPPORTÉ, pas corrigé (un lot ne corrige pas un défaut croisé).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **`maxPriceCents` n'entre pas dans `isVariant`** (D230 le demandait) : sa prémisse a changé avec FC-7. Pour Ko : à barrer de D230
   à l'intégration, ou à rétablir si Ko veut qu'une URL inerte reste marquée variante.
2. **Le panneau se monte côté CLIENT seulement** : sans JavaScript, `/salles?guide=…` est la page de résultats entière (un panneau
   modal qui ne répond pas masquerait une page qui marche). D229/D230 ne le disaient pas ; c'est la lecture de « strictement
   additif » (D231). Pour Ko : rien à faire.
3. **La commune est, elle aussi, un champ NON contrôlé** (D229 ne nomme que les invités) : une liste déroulante contrôlée par l'URL
   pousserait une navigation à chaque mouvement de clavier. Pour Ko : rien à faire ; une réponse ne part qu'au bouton.
4. **« Li hwas lqa » en arabe : « اللي حوّس لقى »** (la darja en lettres arabes) ; en français, la graphie latine de D229. Listée dans
   `arabe-a-relire.md` avec « إغلاق المساعد » (« Fermer l'assistant »). Pour Ko : relecture humaine de l'arabe.
5. **Les gardes du plafond `act` (S8) déménagent** sur `venue-detail-view.test.tsx`, le seul fichier exempté qui émet encore
   assez d'avertissements pour qu'un plafond y morde. ⚠ Si FC-9 assainit ce fichier, S8 devra être réorientée de nouveau.
6. **Trois réorientations et un retrait dans des harnais d'autres rangs** (available-on 7, maxprice M3/M4, e3d1-s8 S8) : même règle
   que « une cible devenue sans objet se retire ou se réoriente, par écrit » (AGENTS.md).

## À savoir pour l'intégration
- ⚠ **Un artefact de build périmé fait rougir `typecheck` après la suppression de la page** : `apps/client/.next/types/validator.ts`
  (ignoré par git) référence encore `assistant/page.tsx` — TS2307. Mesuré ici ; levé en supprimant `apps/client/.next/types` (ou par
  un `pnpm build`). Sur le poste de Ko : `rm -rf apps/client/.next/types` avant `pnpm typecheck`.

- ⚠ **Un écart à D270, dit ici** : un `vitest` du seul fichier de l'assistant (34 tests) a tourné PENDANT le rejeu de fc1 (qui
  mute `theme.css`). fc1 ne lit ni ce test ni ce composant, et rend 6/6 ; le résultat du `vitest` ne lit pas `theme.css`.
- **L'environnement a lâché une fois** : le processus de travail de la session a redémarré pendant la série de campagnes (après
  sa fin) ; le démon Docker est tombé avec lui. Premier rejeu de fc8 avec `--e2e` : pré-vol refusé (« ECONNREFUSED 127.0.0.1:5432 »),
  AUCUNE mutation posée. Le démon et la base ont été relancés (`dockerd`, `docker compose up -d` : les bases `zwadj`, `zwadj_e2e`,
  `zwadj_test` intactes, volume nommé), puis fc8 rejoué.

## Arabe à relire
`arabe-a-relire.md` : `home.search.assistant` (modifiée : « اللي حوّس لقى »), `wizard.close` (neuve : « إغلاق المساعد »).

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 473/39** · pro 676/43 — 2 304 tests, 159 fichiers ; client
+19 tests sur FC-7) · build 0 · test:int **613/619** — les 6 rouges sont DANS l'ensemble d'entrée (`etat-entree.md` : les tests de
concurrence MD-1 et F-1 à F-6) : MD-1 ×2, F-1 et F-2 en `read ECONNRESET`, F-3 et F-4 en `deadlock detected` dans le nettoyage, à la
suite : **pas « vert », à jouer à l'intégration** · e2e 0 (73 passés, 1 ignoré, 0 échec ; « token= » restants 0).
⚠ La suite client imprime « PLAFOND ABAISSABLE » pour `filter-wizard.test.tsx` (0 sous 3) et `booking-request-panel.test.tsx`
(0 sous 5) : non abaissés ici (un plafond s'abaisse sur plusieurs passes concordantes, `test-setup.ts`) — c'est l'objet de FC-9.

## Audit de secrets
`audit-secrets-fc8.txt` (scellée) et `tri-audit-fc8.txt` : 7 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
