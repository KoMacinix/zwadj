# CA-3 — LES ROUGES, lus contre l'état d'avant (aucune ligne de code du lot)

Joués le 13/11/2026 sur `aaf94a7` + les deux fichiers de test, non commités à cet instant. Sortie : `client-vitest.txt`.
Ligne « Tests » : `1 failed | 28 passed (29)`, `Test Files 2 failed (2)`.

| fichier | lecture |
|---|---|
| `components/map/near-viewport-map.test.tsx` | ⚠ PAS une assertion : chute À LA COLLECTE (le composant n'existe pas). Aucun test n'a tourné. |
| `app/[locale]/page.test.tsx` | 1 en échec, `AssertionError: expected [] to deeply equal [ '' ]` — l'accueil rend encore le cartouche « Carte à venir », il ne pose aucune carte. Les 28 autres tests du fichier restent verts. |

## Empreintes sha256 des fichiers de test joués
    3994f8c11d41f43113cd8928d2440949cd5c8eebbcf6c59614978a4f83690b04  apps/client/src/components/map/near-viewport-map.test.tsx
    b3ce8c67759d990441500df959bab3c0941bbaa5501e0d1a5a7ed3629f80e45c  apps/client/src/app/[locale]/page.test.tsx
