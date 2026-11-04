NOTE DE KO POUR LA CLÔTURE DE D340 (rang 44) — 04/11/2026 (texte proposé par le relecteur, adopté par Ko tel quel)

0. SI CETTE NOTE OUVRE UNE SESSION NEUVE : lis d'abord ZWADJ_CONTINUITE.md (section « PROCHAIN LOT — rang 44 ») ; vérifie HEAD local = fba4c5e, origin/main = 8c18e7e, arbre propre. Si l'un diffère, tu t'arrêtes et tu le dis. Si cette note arrive dans la session qui a écrit D340, tu passes au point 1.

1. SECTEUR. Ko a branché le chargeur et fermé Chrome avant d'envoyer cette note. Tu relèves l'état machine (secteur ou batterie, RAM libre, chrome, headless_shell) et tu le verses en pièce. Si le poste est encore sur batterie, tu ne lances AUCUNE porte : tu t'arrêtes et tu le dis.

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO (suite de R-1 à R-6 de D340)
- R-7. Les deux passes du 03/11/2026 au soir (première passe et rejeu) ont été jouées sur batterie : elles sont NON CERTIFIANTES (D290). Elles restent versées telles quelles et ne décident rien, ni rouge ni vert. La règle de rejeu commitée avant le rejeu (49cd9f9) reste dans le dépôt : elle visait une mesure valable, et il n'y en a pas eu. Motif : D290 (« aucune mesure qui entre dans une décision ne se prend sur batterie ») ; la consigne du rang 44 (section 5) exigeait le secteur ; le code est celui d'ec44937, où les six portes et l'e2e étaient verts sur secteur le 03/11, et où le relecteur a rejoué typecheck, lint et test (2 194 tests, 148 fichiers) verts.
- R-8. La mesure qui décide : UNE passe des six portes et de l'e2e, sur secteur, état machine relevé juste avant, toutes les 30 s pendant, juste après. Tu écris et tu commites cette règle AVANT de lancer :
  · tout vert : la clôture se pousse. Les textes de clôture reçoivent une annotation additive : les passes sur batterie sont non certifiantes, la passe sur secteur est verte, avec ses chiffres. Le registre et l'ordre des rangs disent « RANG 44 : OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE » ;
  · un rouge, quel qu'il soit : tu ne pousses pas, tu ne rejoues pas, tu t'arrêtes et tu rapportes, avec la répartition des échecs par fichier et la première ligne de chaque bloc d'échec (D304).
  Motif : D270 (aucun lot ne part dans main sous une porte rouge) et D290 ; une seule passe valable, sa règle écrite avant, ce n'est pas rejouer pour verdir.
- R-9. Règle générale, à écrire dans AGENTS.md sous le bloc D290 (ajout seul) : « Une session qui trouve le poste sur batterie au moment des portes de clôture ne les lance pas : elle s'arrête et le dit. » Motif : la note du 02/11/2026 le disait pour D339 ; le 03/11, les portes ont été lancées sur batterie et n'ont rien décidé.
- R-10. walkin-journey.test.tsx (un test de D339) est tombé sur batterie par une AssertionError en 19 ms, sur les avertissements de console : ce n'est pas un délai dépassé. Quel que soit le résultat sur secteur, l'entrée ouverte du backlog sur la garde des sorties console reçoit une annotation additive (forme D302), qui renvoie à la pièce. S'il retombe sur secteur, R-8 s'applique : arrêt.

3. CE QUE TU NE FAIS PAS DANS CETTE SESSION. Rien d'autre que les points 1 et 2 : ni la découpe, ni S-98 à S-112, ni la nullabilité, ni les garanties de base. Le relecteur les donne dans la consigne du code de L36-3a-1, après la poussée de D340.

4. RAPPORT, en français : l'état machine ; les chiffres des six portes et de l'e2e ; local = origin/main après push puis fetch (ou pourquoi pas) ; le fichier où chaque décision de cette note a atterri.
