# D352 — les gestes de Ko, pas à pas (rang 54 : « Refusée » dans « Mes salles »)

**Ce document est une liste de gestes à faire par Ko, pas des gestes faits.** Aucune session de code n'a touché votre base de développement pour ce lot (règle de D337) : tout ce qui a été mesuré l'a été sur des bases jetables (`zwadj_test`, `zwadj_e2e`) et sous jsdom. **Personne n'a regardé la carte de la liste dans un navigateur à la clôture** : c'est le but de ces gestes.

Les mots en gras sont ceux que vous verrez à l'écran.

## Avant de commencer

1. Lancez l'application comme d'habitude : `pnpm dev`. L'application Pro est à l'adresse habituelle (`http://localhost:5173`).
2. **Aucune migration, aucune écriture sur votre base** : ce lot ne change ni le schéma ni l'API.
3. Il vous faut un **compte pro** dont une salle est **en brouillon**, et votre **compte administrateur** (le premier admin, procédure de `docs/preuves/D349/premier-admin-ko.md`, geste 0 de `docs/preuves/D350/scenarios-ko.md`). Si vous avez déjà une salle **refusée** (rejetée avec un motif), passez au geste 2.

## Geste 1 — refuser une salle (côté administrateur)

1. Connectez-vous avec le compte **administrateur** : vous arrivez sur **Salles en attente de validation**.
2. Ouvrez la salle du compte pro, écrivez un motif (par exemple « Les photos sont floues. »), cliquez sur **Rejeter**. Le message de rejet apparaît ; la salle reste un brouillon.
3. Déconnectez-vous.

## Geste 2 — le pro voit « Refusée » dans la liste

1. Connectez-vous avec le compte **pro** et ouvrez **Ma salle** / **Mes salles** (la liste).
2. La carte de la salle refusée porte, en bas, le badge **Publication · Refusée** (en rouge pâle) — et **plus** « En attente de publication par Zwadj ».
3. **Le motif n'est PAS dans la liste** : vous ne lisez ni « Les photos sont floues. » ni une date sur la carte. C'est voulu (consigne R-1 : le motif se lit en ouvrant la salle).
4. Une salle **jamais refusée** du même compte (si vous en avez une) dit toujours **En attente de publication par Zwadj** ; une salle **publiée** dit **Publiée**.
5. Regardez la carte à l'**arrivée** sur la liste : pendant un très court instant, le badge ne porte que **Publication** (sans mot) puis le bon état apparaît. Il ne doit **jamais** afficher « En attente… » pour devenir « Refusée » ensuite.

## Geste 3 — en arabe

1. Passez l'interface en **arabe** (menu de la langue).
2. La même carte dit **النشر · مرفوضة** (texte de `publicationReview.refusedBadge`, **déjà relu au rang 52** ; ce lot n'ajoute **aucune clé arabe**). Le texte reste lisible de droite à gauche, le badge ne déborde pas de la carte à 360 px.

## Geste 4 — ouvrir la salle : le motif

1. Cliquez sur **Modifier** (la carte) puis allez à l'étape **Publication**.
2. Vous lisez **Zwadj n'a pas publié votre salle**, le **motif** de l'admin tel qu'il l'a écrit, la **date** du refus et ce que vous pouvez faire (D350, inchangé).

## Ce que vous pouvez ignorer

Les 29 gardes de tests des écrans `/admin` (R-2) ne changent **rien à l'écran** : elles changent la manière dont les tests échouent (une assertion, plus une requête qui lève). Rien à regarder.
