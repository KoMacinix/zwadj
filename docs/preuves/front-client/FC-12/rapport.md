# FC-12 — LA GALERIE DE PHOTOS D'UNE FICHE ET SA VISIONNEUSE — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `01f3c25` (FC-11 poussé, local = origin vérifié). Commits du lot : `dbb986a` (table,
seule) → `8ef4e79` (tests, rouge) → `a72153e` (extension 1, seule) → `c6b7fca` (le test du retour du focus corrigé, rouge rejoué) →
`917b6de` (code) → `d258394` (extension 2, seule) → le commit de clôture. Méthode NORMALE (aucun montant).

## Fait
- **La visionneuse, en amélioration progressive** (`apps/client/src/components/venue/venue-photos.tsx`, monté par la fiche) : chaque
  vignette RESTE un lien vers la photo pleine taille — le geste du lot A8, le repli sans JavaScript ; avec JavaScript, un clic SIMPLE
  ouvre la visionneuse sur CETTE photo ; un clic avec modificateur (Ctrl, Cmd, Maj, Alt, autre bouton) garde le comportement du lien.
- **Ce que la consigne demandait** : Échap ferme ; le FOCUS REVIENT à la vignette qui l'a ouverte, même quand le clic ne lui a pas
  donné le focus (macOS) ; Tab reste dans la boîte ; la page dessous ne défile plus — par le SEUL piège de focus du dépôt
  (`useDismissLayer`, `@zwadj/ui`, lot A11a), aucun second ; les FLÈCHES suivent la direction de lecture (en arabe, la gauche AVANCE)
  et la galerie boucle ; l'`alt` est celui que le pro a saisi, dans la langue de la page (vide : image décorative, jamais inventé) ;
  « Photo n sur N » nomme la boîte et s'annonce (`aria-live`) ; une seule photo : ni précédente ni suivante ; aucune dépendance.
- **AA, sans couleur en dur** (`theme.css`) : voile et commandes tirés de la palette PARTAGÉE (`--dark-bg`, `--dark-ink`), présente
  dans les deux thèmes — un voile sombre et des commandes claires partout ; contraste des commandes, `#f0f0f0` sur `#111` à 92 % :
  au-delà de 15:1. Propriétés logiques (RTL) ; la boîte tient à 360 px.
- **Rouges avant le code** (`8ef4e79`, rejoué `c6b7fca`) : 7 sur 8 tests neufs en `AssertionError` (la boîte ne s'ouvre pas) ; le 8e
  (le clic avec modificateur) vert À VIDE, bras de calibration.
- **Harnais** `neutralisation/neutralize-fc12.py` : **7 sur 7 mordues** — le piège de focus débranché (V-1), la boîte qui ne sait plus
  d'où elle vient (V-2), les flèches qui ne suivent plus la lecture (V-3), l'alt hors de la langue (V-4), le clic avec modificateur
  (V-5), les boutons d'une seule photo (V-6), la galerie qui ne boucle plus (V-7). Deux mutations sans cible, écrites : retirer
  `preventDefault` (jsdom ne navigue pas : muette par construction) ; démonter la galerie (l'échec serait une requête Testing Library,
  pas une assertion).
- **⚠ Ce que le harnais a fait corriger** : le test du retour du focus donnait le focus à la vignette avant de cliquer — la cible V-2
  aurait été muette par construction. Corrigé AVANT le code (extension 1), rouge rejoué.
- **Campagnes** (`campagnes.txt`) : b7 3/3, fc12 7/7, r33 86 (+ M-12 MUETTE : garde de fuseau muette sur un serveur en UTC, prouvé en FC-4 — ce lot ne
  touche pas la date d'un événement), r38 46/46, r39 35/35 ; fc1 et fc2 rejouées avec `--e2e` (ce lot touche `theme.css`) : 6/6 et
  1/1. Relevé statique des ancres : 209 sur 209, 0 périmée, 0 CRLF.

## Pas fait, et pourquoi
- La galerie « magazine » à cinq photos du backlog (une mise en page) : la consigne de ce lot demande la visionneuse ; la mise en page
  de la galerie est inchangée (couverture en grand, vignettes ensuite).
- Le geste de balayage (swipe) sur mobile : non demandé ; les boutons et les flèches couvrent le besoin.
- Une e2e de la visionneuse : la fixture e2e (`createPublishedVenue`) ne publie AUCUNE photo — en ajouter exige le pipeline de
  médias ; le clavier, le focus et l'alt sont mesurés par jsdom, sur la fiche rendue.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Aucune fermeture au clic sur le voile** : Échap et « Fermer » suffisent, et un clic de navigation raté ne doit rien fermer.
2. **Le voile reste sombre dans les deux thèmes** (palette partagée, pas un jeton qui bascule) : une photo se regarde sur fond sombre.
3. **Les libellés arabes** sont proposés (`arabe-a-relire.md`), à relire.

## Arabe à relire
`arabe-a-relire.md` : `venueDetail.viewerLabel`, `viewerClose`, `viewerPrevious`, `viewerNext` (neuves).

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · **test 1 à la première passe, 0 au REJEU UNIQUE** · build 0 · test:int **614/619** — les 5 rouges sont DANS
l'ensemble d'entrée (MD-1 ×2, F-1, F-2, F-3) : **pas « vert », à jouer à l'intégration** · e2e 0 (75 passés, 1 ignoré, 0 échec ;
« token= » restants 0).
⚠ **La première passe de `test` a rougi sur un fichier que ce lot ne touche pas** (`account-settings-view.test.tsx`, la garde des
sorties console : 5 `act(...)` tardifs de `BookingsSection` et `VisitBookingsSection`) ; mesuré ensuite : le fichier seul 10/10
vert, la suite client 3/3, et le **rejeu unique de la porte vert** — api-client 59/6 · api 1 096/71 · **client 488/41** · pro
676/43, 2 319 tests (`portes/test-rejeu.txt`, `portes/act-intermittent.md`, extension 2). La cause est lue : ce test rend la main
avant les deux sections asynchrones de la page (la faute de FC-9, sur un fichier où elle ne se voit qu'au gré du minutage) —
**rapportée, pas corrigée dans ce lot** ; précédent du rejeu : D338, D339.

## Audit de secrets
`audit-secrets-fc12.txt` (scellée) et `tri-audit-fc12.txt` : 6 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
