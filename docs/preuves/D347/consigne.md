RANG 49 — LE PARCOURS « NOUVELLE RÉSERVATION » DU PRO RETROUVE UNE SPEC NAVIGATEUR (texte proposé par le relecteur, adopté par Ko tel quel)

0. REPRISE (avant toute écriture)
- Lis ZWADJ_CONTINUITE.md seul (section la plus récente, ordre des rangs, registre) et rapporte. Attendu : rang 48 CLOS (D346), compteur POUR MÉMOIRE VINGT-DEUX, « RANG 49 : EN ATTENTE DE CADRAGE DU RELECTEUR », origin/main = b0db574 (vérifié par le relecteur le 09/11/2026), arbre propre, sans stash. Un écart : tu t'arrêtes et tu le dis.
- État machine : secteur, RAM libre, chrome, headless_shell, Docker lancé. Sur batterie : aucune porte (R-9 de D340).

1. CE QUE KO ADOPTE — par ADOPTION de ce message
a) Rang 49 = l'entrée de backlog de S-142 (D344) : le parcours « Nouvelle réservation » (client sur place) n'a plus de spec navigateur depuis l'arrêt de r32. Numéro attendu : D347. Lot de code de test : il compte (D283), VINGT-DEUX → VINGT-TROIS.
b) Les décisions prises seule par la session de D346 (S-150 à S-157) sont ratifiées par adoption.
c) Réponse de Ko à la question de D346 : pas de bouton « Précédent » pour l'instant ; l'entrée de backlog [PRODUIT] reste ouverte, sans rang (annotation additive « Ko, 09/11 : pas maintenant »).

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. Une spec NEUVE, e2e/specs/r49-nouvelle-reservation.e2e.ts, écrite contre l'écran d'AUJOURD'HUI. L'archive docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts reste intacte (D295) ; elle sert de liste de ce qui doit être gardé, jamais de source de valeurs attendues ni de saisie (remplirClient ne se reprend pas). Les attendus sont DÉRIVÉS de l'application et des messages (packages/i18n), jamais écrits de mémoire.
- R-2. D'abord la CARTE, versée avant tout code (docs/preuves/D347/carte.md) : pour chaque garde de r32, ce qui la mesure DÉJÀ dans un navigateur aujourd'hui (r41, r43, r47 ou autre spec : fichier et test) ou « personne ». Constat du relecteur au dépôt (b0db574), à mesurer par toi : les tests de r32 sont (1) le parcours de bout en bout jusqu'à la demande enregistrée, la fenêtre de confirmation APRÈS la réponse du serveur et « Nouveau devis » ; (2) « Bloquer la date » : la fenêtre dit « bloquée » et c'est ACCEPTED qui est écrit ; (3) un échec du serveur ne confirme rien : la fenêtre reste fermée, l'erreur s'affiche ; (4) le calendrier du parcours : un jour bloqué de week-end garde sa couleur de statut et un hachurage, le week-end libre est plus clair ; (5) en arabe à 360 px : disposition reflétée, numéro de gauche à droite, chaque libellé pointe son champ, rien ne déborde. r41, r43 et r47 couvrent le début du parcours (contact, fiche, noms, devis brouillon, aller-retour d'onglet). r49 n'écrit QUE ce que la carte dit « personne » ; aucun doublon.
- R-3. Si l'application d'aujourd'hui contredit une garde (un vrai défaut, pas une ancre) : tu ne corriges ni la spec ni l'application, tu arrêtes cette garde, tu la rapportes et tu ouvres une entrée de backlog (précédent R-3 de D344). Aucune ligne d'apps/ dans ce lot.
- R-4. La preuve : chaque garde neuve mord (harnais neutralize-r49, compte des remplacements, aucune cible muette ; un délai d'action n'est pas une morsure, D323) ; puis l'e2e complète DEUX fois de suite, sur secteur, règle commitée avant (R-15 de D343).
- R-5. Le piège du cache des référentiels (entrée [E2E][INFRA] de D346 : styles et équipements mis en cache une heure, lus vides par le préchauffage) n'est PAS réparé ici. Si une garde de r49 en dépend, tu le dis à la carte. Cette entrée est le candidat du rang 50 : c'est elle qui rend la partie « goûts » de r48 non mesurée dans la suite complète (S-153), et le filet e2e doit être complet avant L36-4 (R-1 de D344).
- R-6. Annotations additives : l'entrée de backlog de S-142 et l'annotation de r32 dans AGENTS.md reçoivent « remplacée par r49, D347 » pour les gardes reprises, et la liste des gardes arrêtées s'il y en a ; rien n'est réécrit (D276).

3. FORME
Premier commit : docs/preuves/D347/table-ouverture.md SEUL, chemins complets ; lecture adverse de cette consigne avant tout .md d'autorité ; la carte, puis les rouges (la spec qui échoue contre une garde neutralisée), avant le commit de la spec ; audits de secrets avant chaque versement (D298) ; consigne versée (docs/preuves/D347/consigne.md). Six portes après la dernière modification.

4. FIN
- Contrôle de fin de lot (D288, D328), push puis fetch, local = origin/main.
- Ordre des rangs : « RANG 49 : CLOS », puis « RANG 50 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : le cache d'une heure des référentiels du client, entrée [E2E][INFRA] de D346).
- Gestes de Ko : aucun ; dis-le.
- Rapport en français : fait, pas fait, écarts, décisions prises seule (une phrase simple chacune, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.
