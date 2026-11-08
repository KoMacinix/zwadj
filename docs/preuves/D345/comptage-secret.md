# D345 — R-9 : comptage du préfixe GOCSPX dans chaque `.env` (08/11/2026)

Forme de D330 : **aucune valeur n'est lue à l'écran, versée ni écrite** — seulement des nombres. Commande par fichier : `grep -o GOCSPX <fichier> | wc -l` (et `wc -l` pour le nombre de lignes parcourues, D290).

| Fichier | Occurrences de `GOCSPX` | Lignes parcourues | Attendu |
|---|---|---|---|
| `apps/api/.env` | **0** | 38 | 0 |
| `apps/client/.env` | **0** | 10 | 0 |
| `apps/pro/.env` | **0** | 5 | 0 |

Calibration (les deux bras, D286) : une ligne contenant le préfixe rend **1** ; une ligne sans le préfixe rend **0**.

Lecture : **0 partout** ⇒ la partie « ligne retirée du `.env` » de la déclaration de Ko est **mesurée par comptage**. « Ancien secret supprimé dans Google Cloud » reste **déclaré par Ko, non vérifiable ici**. Limite écrite : le comptage cherche le **préfixe** `GOCSPX` ; il ne voit pas une valeur de forme secrète d'un autre format.
