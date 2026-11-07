# FC-5 — SOURCE UNIQUE : LA SEMAINE, ET LES ADRESSES DE PAGES — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `e537bb1` (FC-4 poussé, local = origin vérifié). Commits du lot : `6129255` (table,
seule) → `ffc59d7` (rouges) → `da80aba` (extension 1, seule) → `65748f7` (tests typés, rouges rejoués) → `d309510` (extension 2,
seule) → `6a256a9` (extension 3, seule) → `d1d5698` (code) → le commit de clôture. Méthode NORMALE (constantes et liens : chaque
constante vaut l'adresse qu'elle remplace). Les deux calendriers de la fiche salle : HORS lot (décision de Ko).

## Fait
- **La semaine algérienne a UNE définition** : `packages/types/src/week.ts` (`WEEK_START_DAY = 0`, `WEEKEND_DAYS = [5, 6]`, D56),
  exportée par `@zwadj/types` ; `apps/client/src/lib/calendar.ts` et `apps/pro/src/venues/pro-calendar.ts` l'IMPORTENT au lieu de
  la déclarer (arbitrage de Ko du 04/10/2026 : « Le week-end : une seule définition, partagée par le client et le pro »). Garde de
  SOURCE `semaine-source-unique.test.ts` (arbre TypeScript) ; la VALEUR est mesurée dans les DEUX consommateurs (`calendar.spec.ts`,
  `pro-calendar.spec.ts`, confrontés à l'autorité).
- **Une adresse de page ne s'écrit que dans la table de son application** : `apps/client/src/lib/routes.ts` (une constante par
  page, `venuePath(slug)`, `localeHomePath(locale)`) et `apps/pro/src/routes.ts` (une constante par route, `venuePath(id)`,
  `VENUE_PATH_PATTERN`, et `CLIENT_TERMS_PATH` / `CLIENT_PRIVACY_PATH` pour les pages du client liées depuis le pro). **76**
  adresses en dur remplacées dans 38 fichiers (26 client, 12 pro), chaque constante valant exactement l'adresse remplacée.
- **Gardes** : `adresses-guard.test.ts` (autorité : les pages DÉCLARÉES — `page.tsx` du client, `<Route path>` de `App.tsx` ; voit
  chaînes, gabarits, JSX, requêtes, préfixes de locale ; jamais un commentaire) ; `routes.test.ts` (chaque constante du client
  désigne un `page.tsx`, chaque page déclarée a sa constante) ; `routes.test.tsx` du pro (chaque constante est une route DÉCLARÉE :
  la table réelle y rend une page SANS la quitter — patron de D322 — ; `venuePath` ; bras négatif connecté).
- **Rouges avant le code** (`ffc59d7`, rejoués typés `65748f7`) : semaine 5 échecs, adresses 2 (76 occurrences), table client 4,
  table pro 2 — tous par AssertionError, contre l'état d'avant, empreintes sha256.
- **Harnais** `neutralisation/neutralize-fc5.py` : **11 sur 11 mordues** (W-1 à W-4 la semaine, dont W-3/W-4 dans les DEUX
  consommateurs ; A-1 à A-4 les adresses ; R-1 à R-3 les tables).
- **Campagnes touchées** (`campagnes.txt`, 16 campagnes, avant le commit du code) : **314 mordues**, 6 arrêts — **aucun ne vient
  d'une garde muette de ce lot** : 5 ancres écrites en CRLF EN DUR (404 C4, available-on 6, horizon H6, maxprice M7, r30 R30-4 —
  ce conteneur extrait le dépôt en LF) et r33 M-12 (garde de fuseau muette sur un serveur en UTC, prouvée en FC-4) ; r25 : 4 cibles
  `--int`/`--e2e` hors de la commande par défaut (R25-7, l'unitaire de la même ancre que R25-E2, mord).
- **Quatre ancres d'AUTRES rangs périmées par ce lot, réorientées par écrit** (même faute mutée, nouveau site, note « RÉORIENTÉE
  (FC-5) » sur place) : 404 C5, available-on 10, r30 R30-7, r37 E-3 (extensions 2 et 3, commitées seules avant).
- **Relevé statique des ancres** (`ancres-campagnes.txt`, instrument versé `outils/releve-ancres.py`, calibré à sept bras) :
  **360 cibles examinées sur 360**, 0 ancre périmée, 8 ancres CRLF en dur (environnement). ⚠ Sa **première version**, écrite en
  ligne, sautait en silence les 12 cibles de 404 (clé `chemin`) et les comptait comme examinées : c'est la campagne qui l'a montré ;
  le défaut est écrit dans l'en-tête de l'instrument, dans l'extension 3 et dans la pièce.
- **Les campagnes à ancres CRLF, JOUÉES sous CRLF simulé** (`crlf/`, outil versé `outils/crlf-simule.py` : fichiers visés ramenés
  en CRLF le temps de la campagne, puis rendus en LF **à l'identique**, empreintes vérifiées) : **404 12/12 · available-on 10/10 ·
  horizon 6/6 · maxprice 10/10 · r30 8/8** — les trois cibles réorientées qui n'y étaient jamais jouées (404 C5, available-on 10,
  r30 R30-7) **mordent**.
- **Les gardes de source de la session sur des sources en CRLF** (`crlf/gardes.txt`) : contraste (FC-1), semaine, adresses, routes
  (FC-5) — **33/33 verts sur 133 fichiers convertis**, rendus à l'identique. Ce sont les fins de ligne du poste de Ko. ⚠ `week.ts`,
  pas encore suivi par git au moment du jeu, n'était pas dans la liste (`git ls-files`) : il est resté en LF.

## Pas fait, et pourquoi
- Les deux calendriers de la fiche salle : hors lot (décision de Ko).
- La page d'accueil `/` n'est pas relevée comme adresse (D321 ne la relevait pas : « rester sur `/` » ne distingue rien) ; le pro
  déclare quand même sa route par `DASHBOARD_PATH`.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Le pro nomme les pages du CLIENT par des constantes qui les désignent** (`CLIENT_TERMS_PATH = "/cgu"`,
   `CLIENT_PRIVACY_PATH = "/confidentialite"`), confrontées par la garde aux constantes du client (les deux applications sont deux
   bundles : le pro n'importe pas le code du client). Pour Ko : rien à faire.
2. **L'autorité des adresses est la page DÉCLARÉE**, pas la liste de D321 : la garde voit `path="/salles/:id"` et
   `` `/salles?${q}` `` que le relevé de D321 ne retenait pas. Pour Ko : rien à faire.
3. **Cinq ancres de campagnes d'AUTRES rangs réorientées par ce lot**, faute de quoi leurs campagnes s'arrêtaient : 404 C5,
   available-on 10, r30 R30-7, r37 E-3 — même faute mutée, nouveau site, commentaire « RÉORIENTÉE (FC-5) » sur place. Pour Ko :
   à l'intégration, elles se rejouent.
4. **Deux instruments versés** (`docs/preuves/front-client/outils/`) : `releve-ancres.py` (le relevé statique des ancres — sa
   première version, écrite en ligne, sautait en silence les 12 cibles de 404 : défaut écrit dans son en-tête et dans
   l'extension 3) et `crlf-simule.py` (joue une campagne à ancres CRLF sur ses fichiers ramenés en CRLF, puis rendus en LF à
   l'identique). Pour Ko : rien à faire ; ils servent aux lots suivants.

## Défauts croisés — rapportés, non corrigés (hors lot)
- **Cinq harnais anciens écrivent des ancres en CRLF EN DUR** (404, available-on, horizon, maxprice, r30) : ils ne se jouent que sur
  un poste en CRLF. Le socle de la session normalise ; eux non. Joués ici sous CRLF simulé (`crlf/`).

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 441/36** · pro **668/41** — 2 264 tests, 154 fichiers ;
client +17 tests et +2 fichiers, pro +15 tests depuis FC-4) · build 0 · test:int **611/619** — les 8 rouges sont EXACTEMENT
l'ensemble de concurrence relevé à l'entrée sur les deux mêmes fichiers (`etat-entree.md`, ligne « deux fichiers seuls » : MD-1 ×2,
F-1, F-2 en `read ECONNRESET` ; F-3, F-4, F-6 ×2 à la suite) : **pas « vert », à jouer à l'intégration** · e2e 0 (69 passés,
1 ignoré, 0 échec ; journal brut hors dépôt, « token= » restants 0).

## Audit de secrets
`audit-secrets-fc5.txt` (scellée) et `tri-audit-fc5.txt` : 3 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).

## Arabe à relire
Aucune chaîne visible n'est ajoutée par ce lot.
