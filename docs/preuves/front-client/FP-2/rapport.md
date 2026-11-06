# FP-2 — APRÈS LE 409 DE K-5, L'ÉCRAN GARDE LA COPIE DU NOM QUI EXISTE DÉJÀ — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 06/11/2026. Départ `8fb0296` (FP-1 poussé, local = origin vérifié). Commits du lot : `2d72b9b` (table, seule) →
`89da76e` (tests, rouge) → `45e632c` (extension 1, seule) → `dabd62a` (le test corrigé, rouge rejoué) → `401fd58` (code) → le commit de
clôture. Méthode NORMALE : la copie du nom d'un devis est une donnée d'identité, jamais un montant.

## Fait
- **La prémisse, vérifiée AVANT de coder** : le 409 `QUOTE_CLIENT_NAME_ALREADY_SET` ne porte que `{ code, message }` ; il n'existe pas de
  `GET /quotes/:id` ; mais `GET /pro/venues/:id/quotes` (`quotes.listForVenue`, déjà au client d'API) rend le devis relu. **La condition
  d'arrêt de la consigne (« impossible sans `GET /quotes/:id` ») n'est pas remplie** : le lot se fait, sans nouvelle route.
- **Le défaut, lu** : sur un 409, le devis local restait SANS la copie ; chaque remise suivante dans la langue reposait la question du nom
  et se heurtait au même 409 — l'écran tournait en rond.
- **Le correctif** (`walkin-journey.tsx`, `completerLeNom`) : sur CE 409 seulement, l'écran relit la liste des devis de LA SALLE, cherche le
  devis PAR SON IDENTIFIANT et garde celui du serveur, copie comprise. Le refus reste DIT ; **rien n'est remis ni téléchargé** (la
  décision de K-5 tient) ; la remise suivante part sans reposer la question ; le nom que le pro a tapé n'est jamais écrit (M-6) — il est
  refusé UNE fois. La relecture est un confort : si elle échoue, ou ne retrouve pas le devis, l'écran reste tel qu'il était.
- **Rouges avant le code** (`89da76e`, rejoué `dabd62a`) : 2 sur 5 tests neufs en `AssertionError` (la liste n'est pas relue, la question
  se repose) ; les 3 autres (un AUTRE devis ne passe pas, une relecture qui échoue ne change rien, un 500 ne relit rien) verts À VIDE —
  bras de calibration, mordus par le harnais ; les 165 d'avant, verts.
- **Harnais** `neutralisation/neutralize-fp2.py` : **6 sur 6 mordues** — le 409 qui ne relit plus (A-1), n'importe quel refus qui relit
  (A-2), le devis cherché sans son identifiant (A-3), la relecture sur le mauvais identifiant (A-4), une relecture qui échoue et vide le
  devis (A-5), l'écran qui remet de lui-même (A-6). **⚠ La première passe en rendait 5 sur 6 : A-5 MUETTE** — le test échouait sur une
  requête qui lève (le bouton du canal introuvable), pas sur une assertion (D304, D316) ; le bouton est désormais vérifié par une
  assertion native AVANT le code (extension 1, rouge rejoué), puis le harnais entier rejoué.
- **Campagnes** (`campagnes.txt`) : 11 sélectionnées, **403 mordues · 1 muette · 0 non mesurée** (4 726 s) : fp2 6/6, fp1 18/18, fc6 12/12,
  journey 7/7, r32 65/65, r38 46/46, r39 35/35, r41 54/54, r42 22/22, r43 52/52 ; r33 86/86 + **M-12 MUETTE** (la garde de fuseau d'un
  serveur en UTC, prouvée d'environnement en FC-4), comme aux lots précédents. Relevé statique des ancres : 485 sur 485, 0 périmée.

## Pas fait, et pourquoi
- Le nom TAPÉ par le pro n'est ni conservé dans la boîte ni réécrit : le serveur ne remplace jamais une copie (M-6), et la copie qu'il
  garde fait foi.
- Pas de remise automatique après la relecture : le pro n'a rien demandé de plus ; il relance la remise, qui part au premier clic.
- Pas de nouvelle clé : le refus garde son message (`quote.errors.clientNameAlreadySet`).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Pas de remise automatique** après la relecture (la décision de K-5 — « rien n'est remis ni téléchargé » après un refus — tient) : un
   clic de plus, et le pro voit ce qu'il remet. Pour Ko : si une remise automatique est voulue, c'est un changement d'une ligne et d'un test.
2. **La relecture passe par la liste des devis de la salle**, qui rend TOUTES les versions de TOUS les devis : lourde si la salle en a des
   centaines, mais elle ne part qu'après ce 409 rare. Pour Ko : un `GET /quotes/:id` serait plus sobre — un contrat d'API, hors session.
3. **Seul CE 409 relit** : tout autre refus de l'API laisse l'écran inchangé (la copie n'est pas « déjà là »).

## Arabe à relire
Aucune clé ajoutée.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
`portes/resume.txt` (HEAD `401fd58`, six portes lancées l'une après l'autre) :
- `pnpm typecheck` **0** · `pnpm lint` **0** · `pnpm build` **0**.
- `pnpm test` **0** : api-client 59/6, api 1 096/71, client 488/41, pro **698/44** (le lot ajoute 5 tests à l'écran du comptoir).
- `pnpm test:int` **1 — PAS VERT, à jouer à l'intégration** : 609 passés, **10 rouges** sur 619, tous dans `pro-clients.int-spec.ts`
  (MD-1 ×2) et `quote-numbering.int-spec.ts` (F-1, F-2, F-3/F-4 ×2, F-6 ×3, F-7) — **la classe de concurrence de l'ensemble d'entrée**
  (`etat-entree.md` : `read ECONNRESET` sur des requêtes simultanées, puis `deadlock detected` dans `truncateAll` en cascade ; F-7 est
  un de ces blocages en cascade, relevé dans le journal). Aucun fichier de ces deux specs, ni de `apps/api`, n'est touché par le lot ;
  le nombre de rouges varie d'une passe à l'autre (3, 8, 7 au lot précédent, 10 ici). **Dit comme tel : `test:int` n'est pas déclaré vert.**
- `pnpm test:e2e` **0** : 75 passés, 1 ignoré, 0 échec (« token= » restants dans la copie versée : 0).

## Audit de secrets
`audit-secrets-fp2.txt` (scellé) : 4 864 fichiers parcourus, 4 719 audités, 145 exclus, 1 049 alertes ; tri différentiel
contre FP-1 (`tri-audit-fp2.txt`) : **4 alertes nouvelles lues au contexte, 0 valeur réelle** (des phrases qui COMPTENT les jetons
restants et un nom de champ). `git grep -E "token=[A-Za-z0-9_-]{16,}"` sur HEAD : 0.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
