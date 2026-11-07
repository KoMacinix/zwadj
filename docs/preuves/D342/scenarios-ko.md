D342 — gestes de Ko (consigne, § 4), sur la base de développement de Ko : la session NE LES JOUE PAS et n'écrit rien sur cette base.
0. [écriture de Ko] Appliquer les migrations en attente : `pnpm --filter @zwadj/api run prisma:migrate` (`migrate deploy`) — celle de D341, `20261104170000_staff_layer`, n'y est pas appliquée (S-129) ; sans elle les écrans du Pro risquent de ne pas s'ouvrir (inférence, non mesurée).
1. FC-2 — à 360 px de large : l'en-tête d'un visiteur non connecté passe à la ligne, sans déborder (accueil et fiche d'une salle, en FR puis en AR) ; il fait une ligne de plus : c'est voulu, à regarder.
2. FC-4 — fiche d'une salle : un jour qui a déjà une demande en attente a un bord pointillé, reste choisissable, et l'avis « D'autres demandes sont déjà en attente pour ce créneau… » s'affiche.
3. FC-8 — `/salles` : l'assistant (« Li hwas lqa » ; `اللي حوّس لقى` en arabe) s'ouvre depuis la page de résultats, se ferme par « Fermer l'assistant » et ne quitte pas la page.
4. FC-12 — fiche d'une salle avec photos : la visionneuse s'ouvre, Échap la ferme, les flèches changent de photo (sens inversé en arabe), en FR et en AR — aucune e2e ne la couvre.
5. FP-1 — application Pro, au comptoir : une prestation « par palier » (liste « Choisir une formule ») et une « à l'unité » (champ « Quantité ») ; « Voir le devis » reste inactif, avec la raison dite, tant que l'un des deux manque.
6. FC-6 — page client en arabe : une date et un nom de mois s'écrivent en `ar-DZ` ; les montants d'un devis restent en français, à l'écran comme dans le PDF (R-8).
Pour chaque geste : « vu, bon » ou « vu, à reprendre : … » — dans le chat ; la session l'écrira ensuite, mot pour mot, sans l'interpréter.
