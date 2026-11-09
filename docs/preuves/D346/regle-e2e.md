# D346 — règle de la preuve e2e, commitée AVANT les passes (R-15 de D343)

1. **Le rouge isolé avant** : `docs/preuves/D346/rouges/rouge-2-navigateur.txt` (commit antérieur à tout code produit).
2. **Le vert isolé après la réparation** : la même spec, la même commande, sur le code réparé.
3. **La réparation neutralisée, le rouge revient** : `neutralisation/neutralize-r48.py`, cibles lues en `AssertionError`.
4. **L'e2e complète DEUX fois de suite, sur secteur** (`pnpm test:e2e`, serveurs de développement). Le résultat attendu est celui de la suite *avant* le lot plus les deux tests de `r48` : zéro échec, aucun rejeu. Une passe qui sort rouge est **lue**, pas relancée ; un seul rejeu est permis s'il est décidé et écrit avant.
5. Poste : secteur, RAM libre relevée, `chrome` et `headless_shell` à 0, Docker lancé, port 3100/3101/5273 libres, arbre propre. Batterie : aucune passe.
6. **Ce que la spec doit supporter dans la suite complète** : le préchauffage lit `/fr/salles` AVANT tout semis ; les listes de styles et d'équipements du client sont alors vides pour une heure. La spec ne s'appuie donc sur les puces de goûts que si elles existent, et le dit.
