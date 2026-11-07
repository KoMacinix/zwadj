# FC-1 — CONTRASTE — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `1e6426f` ; commits du lot : `aee7bc4` (table, seule) → `19270c7` (rouges) →
`951ac3d` (extension 1, seule) → `b6d3aa3` (code) → `d70625b` (extension 2, seule) → le commit de clôture (harnais, pièces, ce
rapport). Méthode NORMALE : CSS d'affichage, aucun montant, aucun contrat.

## Fait
- **Quatre** textes en `var(--accent)` passent en `var(--accent-text)` (D264) dans `apps/client/src/app/theme.css` :
  `.filters-reset`, `.range-value`, `.results-count-n`, `.wz-eyebrow`. En clair, 4,16 à 4,39:1 → 5,74 à 6,31:1 ; en sombre,
  inchangé (5,32 à 6,55:1). Aucun token partagé ne bouge (D129).
- Le commentaire de `.results-count-n` (« légitime ici et seulement ici, parce que `.search-results` est sur blanc pur ») est
  corrigé : c'est lui qui avait laissé passer ce texte.
- `e2e/baselines/a11y.json` : les deux seules tolérances concernées (`color-contrast @ .filters-reset`, `@ .range-value`, écran
  « client recherche de salles ») sont retirées ; rien d'autre ne bouge dans la référence.
- **Garde neuve** `apps/client/src/app/theme-contrast.test.ts` : elle résout les tokens des deux feuilles dans l'ordre de
  chargement et exige 4,5:1 sur CHAQUE fond neutre (`--bg`, `--surface`, `--bg-2`) des DEUX thèmes, pour les quatre sélecteurs ;
  calibrée à deux bras (21:1 et 1:1 ; `--accent` échoue sur `--bg`).
- **Rouges avant le code** (`19270c7`, `rouges/`) : 4 échecs unitaires lus (AssertionError, 4,16:1) et 1 échec e2e lu (B8 :
  « NOUVELLES violations » `.filters-reset`, `.range-value`), contre le `theme.css` d'avant, empreintes sha256.
- **Harnais** `neutralisation/neutralize-fc1.py` : **6 sur 6 mordues** (C-1 à C-4 unitaires, E-1 et E-2 e2e avec `--e2e`), ancre
  1→0 et marqueur 0→1 chacune, arbre restauré et empreintes égales (`neutralisation/`).
- **Campagnes touchées** (`campagnes.txt`) : `neutralize-b7.py` 3/3 ; `neutralize-fc1.py` 4/4 et 2 non jouées sans `--e2e`
  (jouées à part : 6/6).
- **Portes** (`portes.md`) : typecheck 0 · lint 0 · test 0 (2 208 / 149) · build 0 · test:int 614/619, rouges = ensemble d'entrée
  (environnement) · e2e 0 (63 / 1 / 0).

## Pas fait, et pourquoi
- Le cinquième « texte » de l'intitulé du backlog : l'entrée n'en nomme que quatre ; son cinquième, `.locale-switch:hover`, était
  mesuré conforme (sur `--surface`) — aucun changement.
- `test:int` n'est pas déclaré vert : 5 rouges de concurrence, tous de l'ensemble d'entrée (`ECONNRESET`), à jouer à l'intégration.

## Écarts
- La table prévoyait une synthèse `portes.md` ; les journaux bruts qu'elle cite sont versés (extension 1), avec le pilote.
- **Faute de la session, attrapée avant toute poussée** : le premier commit de l'extension 1 a emporté `theme.css`, resté dans
  l'index après un `git reset --soft` (le tri des campagnes exige le code NON commité). Vu en relisant `git show --name-only` ;
  défait localement et refait : extension seule (`951ac3d`), puis le code (`b6d3aa3`). Aucun historique poussé n'a été réécrit.
  Depuis, chaque commit nomme ses chemins (`git commit -- <chemins>`), et l'outil de contrôle (extension 2) vérifie
  l'ordre et le contenu des commits.

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Quatre sélecteurs, pas cinq** : « cinq » venait du titre de l'entrée du backlog ; rien à faire pour Ko.
2. **La garde exige 4,5:1 sur le PIRE fond neutre**, pas sur le fond « réel » de chaque élément : plus stricte que B8, elle
   rougira si un futur texte accentué est posé n'importe où en `--accent`. Pour Ko : un texte en `--accent` sur ces quatre
   sélecteurs ne passera plus, même sur blanc pur.
3. **Un socle partagé des harnais** (`neutralisation/socle_front_client.py`) plutôt qu'une copie par harnais : les lecteurs de
   r38 (vitest) et r26 (Playwright) y sont repris tels quels, plus la forme Linux « ✓ / ✘ » du rapporteur Playwright (défaut
   d'instrument trouvé avant le premier usage, recalibré : 20 bras, 0 manqué). Pour Ko : à l'intégration, ce fichier est le seul
   à relire pour tous les harnais `neutralize-fc*.py` / `fp*.py`.
4. **Deux outils de session versés comme pièces** (`docs/preuves/front-client/outils/portes.sh`, `controle-lot.py`). Pour Ko :
   ils ne sont pas des instruments du dépôt ; l'intégration peut les promouvoir ou non.

## Arabe à relire
Aucune clé ajoutée.

## Contrôle de fin de lot
Sortie : `controle.txt` (avant le commit de clôture ; les fichiers de clôture y figurent comme « non commités », tous dans la
table). La vérification « local = origin/front-client » est faite après la poussée et reportée au rapport du lot suivant et au
bilan.
