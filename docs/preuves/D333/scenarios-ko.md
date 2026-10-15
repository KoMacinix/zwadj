# D333 — rang 39 — les scénarios de Ko (condition de clôture)

Écrits **avant le code** (décision 4 du relecteur), en langage simple. Le lot est clos **sur le code** ; la condition reste **ouverte jusqu'au constat de Ko** (précédents des rangs 33, 37 et 38). À jouer dans l'application Pro, **en français puis en arabe**, sur une salle publiée ou non — la numérotation ne dépend pas de la publication.

La référence a toujours la forme `DEVIS-<année>-<numéro de la salle>-<numéro du devis> v<version>` : l'année est celle d'Alger, le numéro de la salle et celui du devis ont **au moins quatre chiffres** (`0001`). Les numéros que tu verras dépendent de ta base : ce qui compte, c'est la forme et la suite, pas la valeur.

1. **Créer un devis.** « Nouvelle réservation », remplir jusqu'à « Calculer le devis ». Juste après le calcul, la référence s'affiche : `DEVIS-…-… v1`. À constater : la forme ci-dessus ; la version est `v1`.
2. **La fenêtre de remise.** Choisir un des cinq canaux, puis une langue dans la boîte. La fenêtre qui s'ouvre **commence par la même référence**. En arabe, la référence reste lisible de gauche à droite (`DEVIS-…` n'est pas inversée).
3. **Le fichier téléchargé.** Son nom est `DEVIS-…_fr_v1.pdf` si tu as choisi « Français », `DEVIS-…_ar_v1.pdf` si tu as choisi « العربية ». Le PDF imprime la **même** référence que l'écran.
4. **Un deuxième devis dans la même salle.** « Nouveau devis », calculer. Le **numéro du devis est le suivant** de celui du premier ; le numéro de la salle ne change pas ; la version est `v1`.
5. **Une révision.** Sur un devis déjà calculé, changer le nombre d'invités et recalculer (« Modifier le devis »). La référence **garde le même numéro** et passe en `v2` ; le fichier téléchargé finit par `_v2.pdf`.
6. **Une autre salle.** Un devis dans une autre de tes salles : le **numéro de la salle est différent** ; le premier devis de cette salle pour l'année porte le numéro `0001`.

Ce que ces scénarios **ne regardent pas** : le nom du client sur le PDF (L35-4, condition du rang 33 toujours ouverte).
