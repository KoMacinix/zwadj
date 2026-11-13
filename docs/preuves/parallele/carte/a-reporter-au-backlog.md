# À REPORTER AU BACKLOG — session « carte »

Cette session n'écrit pas dans `ZWADJ_BACKLOG.md` (consigne, point 0 d). Ce qui devrait y entrer est écrit ici, dans la forme
des entrées neuves (D302) : CE QUE L'ENTRÉE BLOQUE (ou « à ordonner par Ko ») et son COÛT en termes qui se relèvent.
Aucune durée estimée. Chaque lot complète ce fichier.

## Trouvé en chemin (défauts qui ne sont pas l'objet de la session — non corrigés)

### `[HARNAIS]` `neutralize-horizon.py`, cible H6 : ancre périmée, la campagne sort en « ERREUR DE SCRIPT »
- Relevé le 13/11/2026 (lot CA-1) : « H6. Une PANNE emprunte le message de date : 0 occurrence(s), 1 attendue dans
  apps/client/src/components/search/search-view.tsx ». À cet instant `search-view.tsx` était IDENTIQUE à `origin/main`
  (`26ad5c7`, vérifié par `git diff`) : l'ancre était périmée AVANT la session. Les cinq cibles jouées avant H6 mordent ;
  celles qui suivent H6 ne sont pas jouées (une campagne partiellement jouée n'est pas une campagne verte).
- Bloque : à ordonner par Ko. Tant que l'ancre n'est pas réécrite, `lancer-campagnes.py --tout` sort en erreur sur cette
  campagne, et tout lot qui touche `venues-public.service.ts` ou `search-view.tsx` la rejoue.
- Coût : code de harnais (il compte), 1 fichier (`neutralisation/neutralize-horizon.py`), ni e2e ni migration.

### `[HARNAIS]` `neutralize-available-on.py`, cible 6 : l'ancre porte un `\r\n` en dur
- Relevé le 13/11/2026 (lot CA-2) : « 0 occurrence(s), 1 attendue(s) dans apps/client/src/lib/search-query.ts ». L'ancre est
  écrite `…state.availableOn);\r\n  query.set("sort"…` : elle ne se trouve que dans un fichier en CRLF (poste de Ko,
  `core.autocrlf=true`). Dans un clone en LF (Linux, CI, session cloud) la campagne s'arrête là.
- Bloque : rien sur le poste de Ko ; toute campagne `--tout` jouée ailleurs.
- Coût : code de harnais (il compte), 1 fichier ; le socle `socle_front_client.py` montre la forme (`_adapter`).

### `[HARNAIS]` `neutralize-r33.py`, cible M-12 : muette sur une machine en UTC
- Relevé le 13/11/2026 (lot CA-2) : « la date d'un événement dérive du fuseau du serveur » — 61 passés, 0 échec. Une garde
  de fuseau ne peut pas mordre quand le serveur est en UTC (AGENTS.md, leçon S11-a : épingler `process.env.TZ`).
- Bloque : rien sur le poste de Ko (fuseau d'Alger ?) — à vérifier ; ailleurs, la campagne sort en 1.
- Coût : code de test ou de harnais (il compte), 1 ou 2 fichiers.

### `[INFRA][TEST]` quatre tests de requêtes SIMULTANÉES tombent en `read ECONNRESET` dans le conteneur cloud
- `pro-clients.int-spec.ts` (MD-1 ×2) et `quote-numbering.int-spec.ts` (F-1, F-2), déterministes sur `origin/main` dans ce
  conteneur (PostgreSQL 16 + polyfill, Linux). Cause NON établie (aucune erreur côté PostgreSQL ; dix requêtes simultanées
  par supertest sur un serveur nu passent). Sur le poste de Ko ces tests sont verts (D347 : six portes à 0).
- Bloque : rien sur le poste de Ko. Toute session cloud trouve `test:int` rouge à l'entrée.
- Coût : enquête documentaire d'abord ; aucun fichier connu à toucher.

## Clés de catalogue devenues mortes (à retirer à l'intégration, pas ici)
Les catalogues sont partagés avec les deux autres sessions : cette session n'y écrit qu'un bloc neuf et ne retire rien.
- `search.map.title`, `search.map.soon` : plus lues depuis CA-2 (la vue « carte » est la carte).
- `home.map.soon` : plus lue depuis CA-3 (l'accueil monte la vraie carte). `home.map.title` reste lue.
- ⚠ `home.map.title` vaut « Carte des salles · Alger » alors que la carte de l'accueil montre TOUTES les salles publiques
  situées, où qu'elles soient. Le titre n'a pas été changé (c'est un texte produit existant) : à trancher par Ko —
  garder « Alger » tant que le catalogue est algérois, ou retirer la ville. Coût : 2 valeurs de catalogue, documentaire.
- Coût : documentaire côté catalogues (2 fichiers), plus le repère « le total ne recule pas » de
  `apps/api/src/common/i18n-parity.spec.ts`, à relever DÉLIBÉRÉMENT (il compte les clés ; la session ajoute 18 clés à CA-2
  et ne touche pas ce fichier, que d'autres sessions peuvent modifier).

## Hors session par décision (R-8, R-10) — à ordonner par Ko
(complété au lot CA-6.)
