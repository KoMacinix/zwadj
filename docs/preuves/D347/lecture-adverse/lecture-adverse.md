# D347 — lecture adverse de la consigne « RANG 49 » (avant tout .md d'autorité)

Chaque affirmation de la consigne est confrontée au dépôt au SHA `d3141b8` (= `b0db574` + la table d'ouverture). Lue, pas supposée.

| # | affirmation | mesure | verdict |
|---|---|---|---|
| 1 | origin/main = b0db574, arbre propre, sans stash | `git rev-parse HEAD origin/main` : les deux `b0db574…` ; `git status` vide ; `git stash list` vide | ✓ |
| 2 | rang 48 CLOS, compteur VINGT-DEUX, « RANG 49 : EN ATTENTE DE CADRAGE DU RELECTEUR » | `ZWADJ_CONTINUITE.md` l.2673 et bloc « ÉTAT À LA CLÔTURE DU RANG 48 » (l.2764-2781) | ✓ |
| 3 | dernier numéro D346, numéro attendu D347 | registre : dernière ligne `| D346 |` (l.26733) | ✓ |
| 4 | r32 compte cinq tests | `grep test(` sur `r32-nouvelle-reservation.e2e.ts` : lignes 101, 243, 256, 277, 335 | ✓ |
| 5 | (2) « Bloquer la date » : fenêtre « bloquée », ACCEPTED écrit | r32 l.243-254 | ✓ |
| 6 | (4) un jour bloqué de week-end : couleur de statut + hachurage | `theme.css` l.100-104 : `repeating-linear-gradient` et `--cal-hatch` existent | ✓ (l'ancre existe encore) |
| 7 | (5) arabe à 360 px | r32 l.335-379 ; `fc2-debordement-360` mesure le CLIENT seulement (« l'app Pro : non mesurée », en-tête du fichier) | ✓ — personne ne couvre le Pro |
| 8 | r41, r43, r47 couvrent « le début du parcours (contact, fiche, noms, devis brouillon, aller-retour d'onglet) » | r41 : contact → fiche → noms → devis → conversion préremplie (corps de la requête). r43 : brouillon / promotion / remise. r47 : aller-retour d'onglet. **Aucun des trois ne mesure les RÈGLES DE SAISIE des champs** (téléphone, e-mail, noms, « Continuer » qui dit pourquoi, exemples) — `grep leadingDigit\|needPhone\|wk-continue\|placeholder\|getByRole("alert")` dans `e2e/specs/` : r41:181 (un refus de MD-4) et r42 (panneau CLIENT) seulement | **≈ ÉCART DE LECTURE** : voir ci-dessous |
| 9 | « aucune ligne d'apps/ dans ce lot » | le harnais de neutralisation (R-4) MUTE un fichier d'`apps/` le temps d'une mesure puis le restaure ; D318 (décision du relecteur) : « une neutralisation de mesure n'est pas un changement ». Le diff final ne doit contenir aucun fichier d'`apps/` | ✓ à condition de le lire ainsi — écrit ici |
| 10 | « remplirClient ne se reprend pas » | l'étape Client n'a plus de champ « Prénom »/« Nom » au départ : les champs sont `nameLatin`/`nameAr` (`messages` : `venue.ui.walkin`), le contact vient avant | ✓ |
| 11 | R-5 : le cache d'une heure des référentiels ne doit pas être réparé ici | les gardes de r49 vivent dans l'app Pro (salle créée par `createPublishedVenue`) ; aucune ne lit les styles ni les équipements du client (`revalidate: 3600` est côté client) | ✓ — aucune dépendance prévue, à reconfirmer à la carte |
| 12 | « Précédent » : Ko a répondu « pas maintenant » pour le bouton | `previousButton` existe encore dans `walkin-journey.tsx` (l.989-993) : la réponse de Ko vise l'assistant de recherche CLIENT (D346), pas ce bouton du Pro | ✓ — la garde « Précédent à gauche en FR / à droite en AR » de r32 reste mesurable |

## L'écart de lecture (ligne 8) — ce que je fais

La consigne résume le test (1) de r32 en « le parcours de bout en bout jusqu'à la demande enregistrée, la fenêtre APRÈS la réponse et « Nouveau devis » ». Le test (1) contient aussi, en tête, **les règles de saisie** (points 1 à 6 de la consigne de Ko du rang 32). Ces règles ne sont mesurées dans un navigateur par aucune spec d'aujourd'hui. La consigne dit « r49 n'écrit QUE ce que la carte dit « personne » » : elles sont « personne », donc elles entrent dans r49 — adaptées à l'écran d'aujourd'hui (contact d'abord, puis noms). Décision de la session, à ratifier : S-158.

## Ce que cette lecture ne couvre pas
Elle ne dit pas si les gardes neuves mordront : c'est le rôle des rouges et du harnais.
