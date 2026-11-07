# L'e2e à l'entrée de la session `front-client` — 05/11/2026

`pnpm test:e2e` sur `e40c141`, arbre propre, `PLAYWRIGHT_BROWSERS_PATH` = le pont hors dépôt décrit dans `etat-entree.md`
(Playwright 1.50.1 de la suite, Chromium 153 du conteneur), PostgreSQL 18.6 dans Docker, base `zwadj_e2e` recréée par
`global-setup`.

| quoi | relevé |
|---|---|
| code de sortie | **0** |
| bilan | **63 passés · 1 ignoré · 0 échec** — mêmes chiffres que la passe sur secteur de D340 (« 63 passés, 1 ignoré, 0 échec ») |
| durée (ici) | 247 s — ne se compare à aucune durée du poste de Ko (D290) |
| pièce | `etat-entree-e2e-extrait.txt` : la ligne de résultat de chaque test et le bilan ; le journal brut n'est PAS versé (ses lignes `[WebServer]` portent des jetons de vérification d'e-mail) — son empreinte sha256 est en tête de l'extrait ; « token= » dans l'extrait : 0 |

⚠ **Un fait d'environnement, relevé ici et utile à tout harnais e2e de la session** : sous Linux, le rapporteur `list` de
Playwright marque les tests « ✓ » / « ✘ » ; sous Windows (poste de Ko), « ok » / « x ». Le lecteur de `neutralize-r26.py`
ne lit que la seconde forme. Le socle des harnais de cette session (`neutralisation/socle_front_client.py`, déclaré par la
table de FC-1) lit les deux, avec un bras de calibration pour chacune.

⇒ **Pour chaque lot**, l'e2e se rejoue ici dans les mêmes conditions et se juge contre ce relevé : 63 / 1 / 0. Une e2e verte
ICI reste une mesure d'environnement différent : l'intégration la rejoue sur le poste de Ko.
