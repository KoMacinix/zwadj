# FC-2 — DÉBORDEMENT À 360 px — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `5f95ba3` (FC-1 poussé, local = origin vérifié). Commits du lot : `fa38448` (table,
seule) → `4fc4050` (rouges) → `ee427ed` (code) → `da56bf1` (extension 1, seule : `controle.txt`, omis à l'ouverture et trouvé hors table par le contrôle) → le commit de clôture. Méthode NORMALE (CSS d'affichage).

## Fait
- **Prémisse mesurée dans un navigateur, plus large que la consigne** : à 360 px, visiteur anonyme, TOUTES les pages françaises
  (accueil, recherche, fiche) avaient `scrollWidth` 364 — c'est l'en-tête, commun aux trois ; l'arabe tenait (360).
- **Garde neuve** `e2e/specs/fc2-debordement-360.e2e.ts` : la règle universelle « la page tient dans la fenêtre » (`scrollWidth`
  ≤ 360) sur les trois gabarits publics, FR et AR, session résolue. **Rouges avant le code** (`4fc4050`) : 3 échecs FR lus
  (« Expected: <= 360 · Received: 364 »), 3 verts AR.
- **Code** (`apps/client/src/app/theme.css`) : `.site-header--stacked .header-auth { flex-wrap: wrap; justify-content: flex-end;
  row-gap: 8px }` — la barre de session passe à la ligne à toute largeur où elle ne tient plus, sans seuil ni `@media` ;
  `flex-end` est logique (droite en FR, gauche en AR) ; l'en-tête du client seul (`--stacked`), les deux en-têtes Pro ne bougent pas.
- **Harnais** `neutralisation/neutralize-fc2.py` : **1 sur 1 mordue** (W-1, `flex-wrap: nowrap` ⇒ les trois pages FR redébordent,
  chacune par une assertion), arbre restauré.
- **Campagnes touchées** : b7 3/3, fc1 4/4 (+2 e2e non jouées sans `--e2e` : ce lot ne touche ni leurs ancres ni `.filters-reset`
  / `.range-value`), fc2 joué à part 1/1.
- **Portes** : typecheck 0 · lint 0 · test 0 (2 208 / 149) · build 0 · test:int 616/619 (MD-1 ×2, F-1 : l'ensemble d'entrée,
  environnement) · e2e 0 (**69** passés — 63 + les 6 neufs — 1 ignoré, 0 échec).

## Écarts
- **Le conteneur a redémarré pendant l'e2e des portes** (processus tués, démon Docker arrêté). Les cinq premières portes sont
  celles de la passe interrompue (aucun fichier n'a changé depuis) ; l'e2e a été **rejouée seule** après le redémarrage du démon
  et de la base, même commande, même filtrage — écrit dans `portes/resume.txt` et en tête de `portes/test-e2e.txt`.
- Deux captures à 360 px (FR, AR) ont été regardées pour contrôler l'aspect — **non versées** (l'e2e est la mesure). Elles
  montrent : en FR, « Inscription » passe sous « Connexion », aligné à droite ; en AR, « إنشاء حساب » passe à la ligne, aligné à
  gauche — alors qu'AVANT, en arabe, les libellés des boutons se coupaient sur DEUX lignes à l'intérieur du bouton (capture
  `docs/preuves/D321/captures/images/16m-client-ar-salle-360.jpg`).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **La barre passe à la ligne (plutôt que des boutons rétrécis ou un seuil `@media`)** : robuste à toute langue et à tout
  libellé futur. Pour Ko : sur téléphone, l'en-tête anonyme fait une ligne de plus (« Inscription » sous les autres boutons).
2. **La garde couvre accueil, recherche et fiche, pas la seule fiche** : l'en-tête est commun. Pour Ko : rien à faire.

## Arabe à relire
Aucune clé ajoutée.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
