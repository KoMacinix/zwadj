# CA-4 — LES ROUGES, lus contre l'état d'avant (aucune ligne de code du lot)

Joués le 13/11/2026 sur le commit de la table + les deux fichiers de test, non commités à cet instant. Sortie :
`client-vitest.txt`. Ligne « Tests » : `2 failed | 30 passed (32)`, `Test Files 2 failed (2)`.

| fichier | lecture |
|---|---|
| `components/venue/venue-location-map.test.tsx` | ⚠ PAS une assertion : chute À LA COLLECTE (le composant n'existe pas). Aucun test n'a tourné. |
| `components/venue/venue-detail-view.test.tsx` | 2 en échec, deux `AssertionError` (`expected [] to deeply equal [ [ '36.745312', '3.031987', … ] ]`, et son pendant arabe) : la fiche ne pose aucune carte. Les deux tests « sans coordonnées » et « une seule coordonnée » sont VERTS avant comme après — des gardes que le harnais neutralisera. |

## Empreintes sha256 des fichiers de test joués
    3ecebc783b8c64beef5b56b4d00c27b4b11ae294a2e40613d9eea75531556d35  apps/client/src/components/venue/venue-location-map.test.tsx
    6f6615d28e8b477b2a389c2271e8a94710410f3cd2b0508d05b436ca83ca5326  apps/client/src/components/venue/venue-detail-view.test.tsx
