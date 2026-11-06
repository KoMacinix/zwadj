# FP-5 — LES VERSIONS PRÉCÉDENTES D'UN DEVIS — table d'ouverture (premier commit du lot, SEUL) · lot **ARRÊTÉ** (aucune route d'écran ne les rend)

SHA de départ : `fd9dac0943abe94cc41cdbe46b6f0726d372a0a7` (dernier commit de FP-4, poussé, local = origin vérifié). Consigne : « afficher les versions
précédentes d'un devis, seulement si une route existante les rend, sinon ARRÊTÉ ».
La lecture a été faite AVANT cette table, sans aucune écriture au dépôt : aucun écran de l'application Pro ne rend les versions précédentes d'un devis —
`QuotesSection`, qui portait l'historique, n'est montée nulle part (`dashboard-page.tsx` le dit) et le comptoir n'affiche que la version courante de la chaîne
en cours. Leur retrait est une décision écrite (`AGENTS.md`, « DÉCISION A — le versionnement est CONSERVÉ » : « seul l'AFFICHAGE de l'historique quitte
l'écran pro »), et le point « Remonter `QuotesSection` » est au backlog, à ordonner par Ko. La route de DONNÉE existe (`GET /pro/venues/:id/quotes`,
`quotes.listForVenue`, « toutes versions »), mais la condition de la consigne — une route d'ÉCRAN existante — n'est pas remplie, et afficher l'historique
renverserait la décision A au lieu de l'appliquer.
⇒ Aucun code, aucun test, aucun harnais : les fichiers du lot sont la pièce d'arrêt. Aucune porte n'est rejouée : aucun fichier qu'une porte lit ne
change (D292 : `docs/preuves/` ne compte pas).

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FP-5/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FP-5/arret.md` | la pièce « ARRÊTÉ » : ce que le dépôt dit, pourquoi la session s'arrête, les options pour Ko | 2 |
| 3 | `docs/preuves/front-client/FP-5/audit-secrets-fp5.txt` | audit de secrets scellé | 3 |
| 4 | `docs/preuves/front-client/FP-5/tri-audit-fp5.txt` | son tri | 3 |
| 5 | `docs/preuves/front-client/FP-5/controle.txt` | sortie du contrôle de fin de lot | 3 |
