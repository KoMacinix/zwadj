# Consigne du rang 46 — versée telle que collée en tête de la session (07/11/2026 → 08/11/2026)

Première ligne du message de Ko, avant le texte collé : « (secret Google régénéré, ancien supprimé, ligne retirée du .env) ».

---

RANG 46 — LES DEUX SPECS E2E SORTIES À CAUSE DE D265 REVIENNENT DANS LA SUITE (texte proposé par le relecteur, adopté par Ko tel quel)

0. REPRISE (avant toute écriture)
- Lis ZWADJ_CONTINUITE.md seul (section la plus récente, ordre des rangs, registre) et rapporte. Attendu : rang 45 CLOS (D342, D343), compteur DIX-NEUF, « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR », origin/main = 5e932b3 (vérifié par le relecteur le 07/11/2026), arbre propre, sans stash. Un écart : tu t'arrêtes et tu le dis.
- État machine : secteur, RAM libre, chrome, headless_shell, Docker lancé. Sur batterie : aucune porte (R-9 de D340).

1. CE QUE KO ADOPTE — par ADOPTION de ce message
a) Rang 46 = le retour dans e2e/specs/ des deux specs sorties de la suite à cause de D265 : docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts (rang 32, D325, ratifié par Ko le 05/10/2026) et docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts (rang 30, D322). Numéro attendu : D344. Lot de code de test : il compte (D283), DIX-NEUF → VINGT.
b) Les décisions prises seul par la session de D343 sont ratifiées par adoption (garde permanente d265-socket-perimee ; appel commun appelHttp avec la chaîne des causes ; bras E laissé réfuté ; loginContext hors réparation ; compteur ; extensions ; annotations).

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. Ce lot passe avant L36-3a-2. Motif : ces deux specs n'étaient dehors qu'à cause de D265, réparé par D343 (e2e/fixtures/harness.ts, connection: close, relu par le relecteur) ; L36-4 (les écrans du personnel) passera par ces parcours, et un filet e2e complet doit être en place avant.
- R-2. Les pièces versées restent intactes (D295 : une archive ne se retouche pas) : chaque spec est COPIÉE dans e2e/specs/, jamais déplacée. Tout écart entre la copie et l'archive est un diff déclaré dans la table et motivé ligne par ligne.
- R-3. Si une spec échoue contre l'application d'aujourd'hui : tu lis la première ligne du bloc d'échec (D304). Une ancre périmée (un nom accessible, une adresse — l'application a changé depuis le rang 30 et le rang 32, dont FC-5 et FC-8 de front-client) se met à jour, déclarée, SANS affaiblir l'assertion. Un comportement de l'application qui contredit la spec : tu ne corriges ni l'une ni l'autre, tu arrêtes cette spec et tu rapportes (elle reste dans docs/preuves/).
- R-4. La preuve : chaque spec, une fois revenue, mord (neutralisation à la main de la garde qu'elle mesure, rouge lu, restauration — précédent de D325) ; puis l'e2e complète DEUX fois de suite, sur secteur, règle commitée avant : deux vertes ⇒ porte verte ; un rouge ⇒ arrêt, pas de poussée (R-15 de D343).
- R-5. Les annotations : AGENTS.md (« la spec e2e du rang 32 est HORS de la suite ») et les entrées de backlog des deux reports reçoivent une annotation additive « revenue dans la suite, D344 » ; rien n'est réécrit (D276).

3. FORME
Premier commit : docs/preuves/D344/table-ouverture.md SEUL, chemins complets ; lecture adverse de cette consigne avant tout .md d'autorité ; les rouges (la spec qui échoue contre une garde neutralisée) avant tout changement d'une spec ; audits de secrets avant chaque versement (D298) ; consigne versée (docs/preuves/D344/consigne.md). Six portes après la dernière modification.

4. FIN
- Contrôle de fin de lot (D288, D328), push puis fetch, local = origin/main.
- Ordre des rangs : « RANG 46 : CLOS », puis « RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : L36-3a-2, avec S-104).
- Gestes de Ko : aucun ; dis-le.
- Rapport en français : fait, pas fait, écarts, décisions prises seul (une phrase simple chacune, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.
