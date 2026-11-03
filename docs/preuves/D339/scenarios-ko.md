# D339 — rang 43, L36-2 : les gestes de Ko pour le devis brouillon non officiel

En langage simple. **Ta base de développement n'a PAS reçu la migration** (ce lot n'a écrit sur elle à aucun moment). Avant de jouer ces gestes : `pnpm --filter @zwadj/api run prisma:migrate`, puis redémarre l'API.

1. **Le second bouton.** App Pro, « Nouvelle réservation », première question : sous « Continuer » il y a **« Le client ne donne ni numéro ni e-mail »**, avec une phrase qui dit ce qu'il fait. Clique-le : tu arrives aux invités, **sans aucun champ de nom**.
2. **Le brouillon.** Tape un nombre d'invités, choisis la date, le créneau, les prestations, « Calculer le devis ». À constater : un bandeau « BROUILLON — non officiel », une référence qui commence par **`BROUILLON-`**, et **aucun** bouton de remise (SMS, e-mail…) ni de conclusion.
3. **Le PDF, en français puis en arabe.** « Télécharger le brouillon » : une fenêtre te demande la langue, sans te poser la question du nom. Ouvre les deux fichiers. **Le mot BROUILLON en diagonale doit être sur chaque page, et les montants doivent rester lisibles dessous** (S-82) — surtout sur un brouillon de plusieurs pages (beaucoup de prestations). Le champ « Client » affiche « — ».
4. **Rendre le devis officiel.** « Ajouter les coordonnées du client » : tape un numéro, puis un nom, puis « Rendre le devis officiel ». À constater : la référence devient **`DEVIS-…` avec le même numéro**, le message le dit, et les cinq canaux de remise apparaissent.
5. **Un devis ordinaire ne change pas.** Refais un devis par le chemin habituel (numéro tapé) : pas de filigrane sur son PDF, et **le second bouton n'est plus offert** une fois un devis officiel calculé.
6. **En arabe.** Refais 1, 2 et 4 avec l'interface en arabe : le bouton, le bandeau et le message se lisent en arabe.
