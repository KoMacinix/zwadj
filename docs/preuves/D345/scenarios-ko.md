# D345 — les gestes de Ko (rang 47), à jouer dans un vrai navigateur

Condition : l'application Pro lancée sur ta base de développement, un compte PRO connecté, au moins une salle publiée ou en brouillon. **Rien n'est écrit sur ta base par ces gestes** : le parcours n'enregistre rien tant que tu n'as pas calculé un devis ; un devis calculé est un brouillon de devis dans ta liste (comme aujourd'hui).

| # | Geste | Ce que tu dois voir | Si tu vois autre chose |
|---|---|---|---|
| 1 | « Nouvelle réservation » : tape un numéro, clique « Continuer », écris un nom et un nombre d'invités, clique « Continuer » (tu es à « Quelle date ? »). Va à **Demandes**, puis reviens à « Nouvelle réservation ». | Tu retrouves « Quelle date ? », avec le récapitulatif de tes réponses (le numéro, le nom, les invités). Pas la première question. | Dis-moi à quelle étape tu es revenu. |
| 2 | Choisis une date et un créneau, coche une prestation, clique « Voir le devis », puis « Calculer le devis ». Va à **Calendrier**, reviens. | Tu es sur l'étape « Devis ». **Le total n'est plus affiché** et l'écran dit « Les conditions ont changé : recalculez le devis… ». Le bouton s'appelle « Modifier le devis » ; un clic recalcule (c'est une nouvelle VERSION du même devis, pas un second devis). | Si le total est affiché tel quel, ou si un second devis (et non une version de plus du premier) est apparu dans ta liste de devis. |
| 3 | À n'importe quelle étape : clique **« Recommencer »** (le bouton en haut du parcours, qui s'appelait « Annuler »). Va à **Demandes**, reviens. | Le parcours est vide, à « Comment joindre le client ? », et il le reste après l'aller-retour. | Si tes réponses reviennent. |
| 4 | Commence un parcours, puis **recharge la page** (F5). | Parcours vide. C'est voulu : le brouillon ne vit qu'en mémoire (il porte le numéro et le nom d'un client, le poste du comptoir est partagé). Rien ne l'annonce à l'écran. | Si tes réponses reviennent après F5. |
| 5 | Commence un parcours, **déconnecte-toi**, reconnecte-toi, rouvre « Nouvelle réservation ». | Parcours vide. | Si tes réponses reviennent. |
| 6 | Si tu as **deux salles** : commence un parcours sur la salle A, change la salle choisie pour la salle B (sélecteur), puis reviens à la salle A. | Le parcours de B est vide ; celui de A a été effacé (une seule salle à la fois). | Si le créneau ou les réponses de A apparaissent sur B. |
| 7 | Mène un parcours jusqu'à la réservation (« Enregistrer sans bloquer »), ferme la fenêtre de confirmation, va à **Demandes**, reviens. | Parcours vide (le brouillon s'efface à la fin du parcours). | Si tu retrouves le devis conclu. |

En arabe (bascule de langue en haut de page) : le bouton s'appelle « إعادة البدء » ; les gestes 1 et 3 se jouent à l'identique.

**Ce que ces gestes ne couvrent pas, et qui est écrit au rapport** : un poste partagé garde le brouillon d'un client **tant que l'onglet vit**, même si un autre membre du comptoir s'assoit devant — seuls la déconnexion, la fin de parcours, « Recommencer » et le rechargement l'effacent. Effacer aussi au verrouillage du poste et au changement de membre du personnel est l'entrée L36-4 du backlog.
