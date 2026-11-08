# D345 — la règle de la porte `test:e2e`, commitée AVANT la mesure (R-15 de D343, R-6 de la consigne)

1. L'e2e complète (`pnpm test:e2e`) se joue **DEUX fois de suite**, sur **secteur**, **après la dernière modification** de code.
2. **Deux passes à 0 échec** ⇒ la porte `test:e2e` est verte. (Les tests ignorés comptent comme au départ : 1 ignoré à `942d450`.)
3. **Un seul rouge** ⇒ **arrêt, pas de poussée**. Aucun rejeu unique n'est prévu pour ce lot (le rejeu de D339 était une décision de Ko, pas une règle).
4. Sur batterie : **aucune porte** (R-9 de D340).
5. Le nombre de tests de la suite à `942d450` est **79** (D344) ; la suite de ce lot en liste **79 + le nombre de tests de r47**.
6. Les serveurs de développement ne se touchent pas pendant la suite (D270) : aucun fichier n'est édité pendant une passe.
