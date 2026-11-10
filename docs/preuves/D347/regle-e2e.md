# D347 — règle de la preuve e2e, commitée AVANT les passes (R-15 de D343)

1. **Les rouges avant le code** (D334, point 5) : `docs/preuves/D347/rouges/` est commité AVANT la spec et le harnais. Chaque pièce porte l'empreinte sha256 du fichier joué.
2. **Chaque garde neuve mord** : 36 cibles de `neutralisation/neutralize-r49.py`, lues en `expect(...)` ; un délai d'action n'est pas une morsure (D323). Zéro muette, zéro non mesurée.
3. **L'e2e complète DEUX fois de suite, sur secteur** (`pnpm test:e2e`, serveurs de développement). Attendu : le nombre de tests de la suite avant le lot (82 passés + 1 ignoré, D346) PLUS les six de r49 = **88 passés + 1 ignoré**, chaque passe, zéro échec, aucun rejeu. Une passe rouge est **lue**, pas relancée ; un seul rejeu est permis s'il est décidé et écrit avant (par Ko ou le relecteur).
4. Poste : secteur (`BatteryStatus` = 2), RAM libre relevée, `chrome` et `headless_shell` à 0, Docker lancé, ports 3100/3101/5273/5274 libres, arbre propre. Batterie : aucune passe (R-9 de D340).
5. La première passe est celle du pilote `docs/preuves/D340/portes/passe-secteur.sh` (six portes en série, dont `test:e2e`) ; la seconde est `pnpm test:e2e` seul, juste après. Les deux sont rapportées avec leurs chiffres.
6. Les gardes de r49 ne dépendent pas du cache d'une heure des référentiels du client (R-5, carte).
