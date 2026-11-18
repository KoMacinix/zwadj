# CA-5 — LES ROUGES, lus contre l'état d'avant (aucune ligne de code du lot)

Joués le 14/11/2026 sur le commit de la table + les deux fichiers de test, non commités à cet instant. Sortie : `pro-vitest.txt`.

    1259: Test Files  2 failed (2)
    1260:      Tests  7 failed (7)

| fichier | lecture |
|---|---|
| `venues/venue-pin-map.test.tsx` | ⚠ PAS une assertion : chute À LA COLLECTE (`Failed to resolve import "./venue-pin-map"`). Aucun test n'a tourné. |
| `venues/place-fields-map.test.tsx` | 7 en échec : 3 `TypeError: pinOfFields is not a function` (la fonction n'existe pas) ; 4 `TestingLibraryElementError: Unable to find … carte-du-point` (`PlaceFields` ne pose aucune carte). ⚠ Aucune `AssertionError` : l'état d'avant ne le permet pas. Ces quatre tests seront réécrits en assertions natives avant le harnais (D316), et leurs empreintes finales versées avec les portes. |

## Empreintes sha256 des fichiers de test joués
    f00d0641d1cb7c9cd993f0e23a85186487e77e6b8a273cd12d3d7f655fa4d77d  apps/pro/src/venues/venue-pin-map.test.tsx
    c38a89ecec49d671e7205786acf6a1f13c5f3f84c65b0f489cf0489785e710c1  apps/pro/src/venues/place-fields-map.test.tsx
