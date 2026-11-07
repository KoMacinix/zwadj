RANG 45 — INTÉGRATION DE LA BRANCHE front-client DANS main (texte proposé par le relecteur, adopté par Ko tel quel)

0. REPRISE (avant toute écriture)
- Lis ZWADJ_CONTINUITE.md seul (la section la plus récente, l'ordre des rangs, le registre), puis rapporte : le dernier rang clos, le compteur pour mémoire, le rang attendu, le SHA d'origin/main.
- Attendu : rang 44 CLOS SUR LE CODE (D341), compteur QUATRE, « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR », origin/main = d44867a, origin/front-client = 43996e2 (vérifiés par le relecteur le 06/11/2026), arbre propre, sans stash.
- Si un seul de ces points diffère : tu t'arrêtes, tu le dis, tu n'écris rien.
- Poste : relève l'état machine (secteur, RAM libre, chrome, headless_shell, Docker lancé). Sur batterie : aucune porte (R-9 de D340).

1. CE QUE KO ARBITRE OU ADOPTE — par ADOPTION de ce message (Ko l'a collé), sauf la citation de c)
a) Rang 45 = l'intégration, dans main, de la branche front-client (session cloud des 05 et 06/11/2026, sous l'exception bornée à « un lot par session » adoptée par Ko le 04/11/2026 ; pièces : docs/preuves/front-client/, dont BILAN.md). Numéro attendu : D342.
b) L'exception de la session cloud est CONSOMMÉE : retour à une session à la fois, en local (Ko, 06/11/2026).
c) Ko, mot pour mot, dans le chat du relecteur le 06/11/2026, sur la question de FP-3 (la copie du nom complétée par K-5 doit-elle survivre à une révision pour une fiche liée ?) : « oui, pour FP-3 ». ⇒ entrée de backlog neuve, lot d'API, à ordonner (R-9).
d) S-113 à S-129 (D341) : ratifiées par adoption ; S-116 acceptée telle quelle (R-2).

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. L'intégration passe avant L36-3a-2. Motif : le relecteur a fusionné origin/front-client dans origin/main (d44867a) sans aucun conflit, et rejoué sur la fusion typecheck 0, lint 0, test 0 (2 601 tests, 173 fichiers : api-client 66, api 1 336, client 488, pro 711), build 0 ; chaque lot de main éloigne la branche ; la branche touche les écrans, L36-3a-2 le serveur.
- R-2. S-116 est acceptée : pendant la pause, chaque essai paie le coût factice, et la rafale est bornée par le débit par IP (S-123), pas par la pause. Motif : R-3 de D340 (réponse et coût identiques, DR5) ; un coût réduit pendant la pause trahirait qu'un compte existe.
- R-3. La fusion est un `git merge --no-ff origin/front-client`, JAMAIS un rebase ni un squash : les pièces de chaque lot citent les SHA de la branche, une réécriture les rendrait faux (D276 : git fait foi). Le commit de fusion vient APRÈS la table et la lecture adverse (§ 3).
- R-4. La « session adverse » de FP-1 n'est PAS due : les sessions B sont en pause avec les certifications (DR1, pause de Ko du 22/10/2026). FP-1 a eu ses rouges avant le code et son harnais, la forme renforcée sous la pause (précédent du rang 43). Le BILAN qui la dit due est annoté (ajout seul).
- R-5. Compteur pour mémoire : les quatorze lots de code de la branche comptent (consigne de la session cloud, 0 d) : QUATRE → DIX-HUIT. La limite de cinq reste suspendue ; ce chiffre dit ce qu'une certification devra couvrir avant le premier client réel (R-2 de D340).
- R-6. Les lots ARRÊTÉS de la branche : FC-11 (404) — on garde l'état et on écrit la limite (option recommandée par la session) ; FP-4 — on garde l'état ; FP-5 — rien (la décision A tient). Chacun devient, si besoin, une entrée ouverte du backlog sans rang (D302), jamais un lot.
- R-7. Les prémisses fausses relevées par la session se BARRENT avec leur motif (D276) : l'entrée « Retirer le repli maxPriceCents … Retirer aussi la clé de SEARCH_VARIANT_PARAMS » (FC-7 : la clé n'y a jamais été) ; la mention de maxPriceCents dans isVariant de D230 (FC-8 : sa prémisse a changé avec FC-7).
- R-8. FC-6 : « dates et nombres en ar-DZ » (arbitrage de Ko du 04/10/2026, « avant le lancement ») n'est tenu qu'en partie : les montants d'un devis restent en français à l'écran ET dans le PDF, ensemble (QUOTE_AMOUNT_LOCALE). Entrée de backlog neuve : un lot qui touche apps/api et apps/pro ensemble ; BLOQUE : le lancement (motif de Ko).
- R-9. Entrées de backlog neuves (forme D302), une par point : FP-3 + 1 c (lot d'API) ; FP-2 (un GET /quotes/:id serait plus sobre : contrat neuf) ; le catalogue des prestations du Pro affiche palier et unité en français en arabe (services-section.tsx) ; /salles sans JavaScript reste sur son indicateur ; aucun hreflang, sitemap ni robots (BLOQUE : le lancement, règle SEO de D216) ; les harnais à ancres CRLF en dur ; le récapitulatif du comptoir montrerait l'identifiant d'un créneau tout juste créé (FP-4, non reproduit) ; la relecture arabe des 16 clés neuves et de la clé modifiée (BILAN § 4). Les entrées du backlog que la branche a traitées se cochent avec le renvoi au lot.
- R-10. Les outils de la session (outils/portes.sh, outils/controle-lot.py, neutralisation/socle_front_client.py) restent tels quels, sans promotion dans cette session ; l'étalon de FC-9 (test-setup-calibration.test.ts) reste.
- R-11. Avant typecheck : `rm -rf apps/client/.next/types` (BILAN § 3, point 6 : un artefact périmé après la suppression de /[locale]/assistant).

3. LE LOT
- Premier commit : docs/preuves/D342/table-ouverture.md SEUL — les fichiers que la fusion apporte (la sortie de `git diff --name-only origin/main...origin/front-client`, chemins complets, versée telle quelle), puis les pièces de D342 et les trois .md d'autorité. Lecture adverse de CETTE consigne contre le dépôt (dont chaque affirmation du BILAN qu'elle cite), sortie versée avant tout .md d'autorité. Cette consigne versée en pièce (docs/preuves/D342/consigne.md). Audits de secrets avant chaque versement (D298) ; la branche a eu un incident de jetons corrigé en local (FC-10) : l'audit couvre tout docs/preuves/front-client/.
- La fusion (R-3). Puis, APRÈS elle, sur secteur, par le pilote de D340 (passe-secteur.sh) : les six portes et l'e2e, état machine relevé pendant ; puis `python3 neutralisation/lancer-campagnes.py` sur le diff de la fusion (l'angle mort du tri de D341 compris : les campagnes qui lisent un chemin relatif se calculent à part).
- test:int : la branche ne l'a jamais eu vert (concurrence de pro-clients et quote-numbering, classe D265, fichiers non touchés). Ici il doit être vert. Rouge hors des fichiers de la branche : R-6 de D339 (un seul rejeu, règle écrite avant, les deux passes versées) ; rouge encore : tu ne pousses pas, tu rapportes.
- Rouge dans un fichier de la branche : tu ne corriges pas ; tu trouves le lot fautif (le test rejoué sur le commit de clôture de chaque lot, comme la troisième condition de Ko du 14/10/2026) et tu rapportes.
- Aucune ligne de code neuve dans ce lot : si une porte exige une correction, c'est un arrêt.

4. LES REGARDS DE KO (gestes, versés dans docs/preuves/D342/scenarios-ko.md, 10 lignes au plus)
Sur la base de dev de Ko, migrations appliquées par Ko (geste 0, une écriture de Ko) : l'en-tête à 360 px (FC-2) ; le jour déjà demandé, bord pointillé et avis (FC-4) ; l'assistant ouvert depuis /salles (FC-8) ; la visionneuse photo, Échap et flèches, en FR et en AR (FC-12) ; au comptoir, une prestation par palier et une à l'unité (FP-1) ; une date et un mois en arabe (FC-6).

5. FIN DE LOT
- Contrôle de fin de lot (D288, D328) : premier commit = table seule ; lecture adverse avant tout .md d'autorité ; diff ⊆ table ; la fusion est --no-ff et garde les SHA de la branche ; local = origin/main après push puis fetch.
- Ordre des rangs : « RANG 45 : CLOS (intégration de front-client) », puis « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : L36-3a-2, avec S-104 que D341 n'a pas codée).
- Les trois .md d'autorité : la section D342 (les dix-sept lots de la branche, leur état, leurs SHA de départ et de clôture, leurs décisions prises seul RATIFIÉES par adoption de ce message), l'ordre des rangs, le registre, le compteur, la passe D277 des deux sens.
- La branche front-client n'est pas supprimée dans cette session.
- Rapport en français : fait, pas fait, écarts (une phrase chacun), décisions prises seul (une phrase simple chacune, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.
