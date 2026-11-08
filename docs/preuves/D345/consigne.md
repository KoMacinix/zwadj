# Consigne du relecteur « RANG 47 » — versée telle que reçue (adoptée par Ko tel quel, 08/11/2026)

RANG 47 — LE PARCOURS « CLIENT SUR PLACE » GARDE SON ÉTAPE ET SES SAISIES QUAND ON CHANGE D'ONGLET (texte proposé par le relecteur, adopté par Ko tel quel)

0. REPRISE (avant toute écriture)
- Lis ZWADJ_CONTINUITE.md seul (section la plus récente, ordre des rangs, registre) et rapporte. Attendu : rang 46 CLOS (D344), compteur POUR MÉMOIRE VINGT, « RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR » avec le candidat proposé L36-3a-2 non arbitré (ce message arbitre autrement : 1 a), origin/main = 942d450 (vérifié par le relecteur le 08/11/2026), arbre propre, sans stash. Un écart : tu t'arrêtes et tu le dis.
- État machine : secteur, RAM libre, chrome, headless_shell, Docker lancé. Sur batterie : aucune porte (R-9 de D340).

1. CE QUE KO ADOPTE — par ADOPTION de ce message
a) Ko demande, mot pour mot (chat du relecteur, 08/11/2026) : « faire en sorte de garder en memoir l'etape et les donner dans le processus du client sur place, et ne pas revenir au debut des qu'en passe a un onglet demande ou autre et revenir pour trouver qu'on reviens a l'etape de depart ». Rang 47 = ce lot ; L36-3a-2 n'est pas le rang 47. Numéro attendu : D345. Lot de code : il compte (D283), VINGT → VINGT ET UN.
b) Les décisions prises seule par la session de D344 (S-138 à S-143) sont ratifiées par adoption.

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. Le brouillon du parcours (apps/pro/src/dashboard/walkin-journey.tsx : étape, identifiant, fiche, noms, retouches, date, créneau, invités, prestations, détails FP-1, chainQuoteId) vit dans un fournisseur React monté AU-DESSUS des routes de l'app Pro, EN MÉMOIRE SEULEMENT : jamais localStorage, sessionStorage ni IndexedDB. Motif : il porte le numéro, l'e-mail et le nom d'un client, et le poste du comptoir est partagé. Constat du relecteur au dépôt (942d450) : l'état est aujourd'hui dans les useState locaux du composant, donc perdu quand l'écran se démonte ; le seul accès au stockage du navigateur de l'app Pro est la langue (apps/pro/src/i18n.ts) — à mesurer par toi, pas à recopier.
- R-2. Le brouillon survit au changement d'onglet ; il ne survit ni au rechargement ni à la fermeture. C'est le comportement attendu, rien ne l'annonce à l'écran ; écris-le au rapport.
- R-3. Au retour : la même étape et les mêmes saisies. Le devis AFFICHÉ n'est pas restauré tel quel : il est marqué « à recalculer », un clic le recalcule (la salle ou les prix ont pu changer entre-temps). Le chainQuoteId est gardé (la révision reste dans la bonne chaîne).
- R-4. Le brouillon s'efface : à la fin du parcours (réservation créée ou devis remis), à la déconnexion, au changement de compte, et par un bouton « Recommencer » (FR/AR, parité). Entrée de backlog pour L36-4 : effacer aussi au verrouillage du poste et au changement de membre du personnel.
- R-5. Aucun contrat d'API, aucune migration, apps/api intouché ; « une seule source » de ProVenuesProvider tient. Si la salle choisie change, le brouillon d'une autre salle n'est pas montré : il s'efface (défaut).
- R-6. Tests : les rouges d'abord — aller à « Demandes » puis revenir : l'étape et les saisies sont là ; recharger : tout est vide ; se déconnecter : tout est vide ; « Recommencer » : tout est vide ; garde de SOURCE : aucun accès au stockage du navigateur dans le fournisseur. Harnais neutralize-r47. E2e : l'aller-retour d'onglet, joué contre l'écran d'aujourd'hui (comme r41 et r43), sans reprendre remplirClient de l'archive r32. Deux passes e2e vertes de suite, règle commitée avant (R-15 de D343).
- R-7. Réponse à la question de D344 : la classification de r32 en « comportement qui contredit la spec » est MAINTENUE. Motif : son test 1 échoue sur le CONTENU d'une assertion (quatre raisons attendues, une reçue), pas sur un nom ni une adresse ; la faire passer obligerait à récrire ses assertions, ce que R-3 de D344 interdit.
- R-8. L'entrée de backlog de S-142 (le parcours « Nouvelle réservation » sans spec navigateur) se place APRÈS le rang 48 et AVANT L36-4. Motif : R-1 de D344 (un filet e2e complet avant les écrans du personnel) ; et ce rang 47 change le même écran, une spec écrite avant serait à reprendre. Annotation additive de l'entrée, rien n'est réécrit.
- R-9. S-143, le secret Google : tu COMPTES, sans rien afficher d'autre que le nombre, les occurrences du préfixe GOCSPX dans chaque .env (même forme que D330 : jamais une valeur). 0 partout ⇒ tu annotes l'entrée [SÉCU] « ligne retirée : mesuré par comptage, 0 » et tu la coches pour cette partie ; « ancien supprimé dans Google Cloud » reste « déclaré par Ko, non vérifiable ici ». Plus de 0 ⇒ tu ne coches rien et tu le dis.

3. FORME
Premier commit : docs/preuves/D345/table-ouverture.md SEUL, chemins complets ; lecture adverse de cette consigne avant tout .md d'autorité ; rouges avant code ; audits de secrets avant chaque versement (D298) ; consigne versée (docs/preuves/D345/consigne.md). Six portes après la dernière modification.

4. FIN
- Contrôle de fin de lot (D288, D328), push puis fetch, local = origin/main.
- Ordre des rangs : « RANG 47 : CLOS », puis « RANG 48 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : l'assistant de recherche client qui ne reprend pas les choix déjà faits — Ko, 08/11 : « rien n'est autopopuler apres avoir mis les choix »).
- Gestes de Ko : commencer un parcours client sur place, aller à « Demandes », revenir ; puis « Recommencer ». Écris-les dans docs/preuves/D345/scenarios-ko.md.
- Rapport en français : fait, pas fait, écarts, décisions prises seule (une phrase simple chacune, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.
