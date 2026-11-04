# D340 — signalements (défauts croisés RAPPORTÉS, jamais corrigés dans ce lot)

Forme des entrées neuves : D302 (« ce qu'elle bloque » · « son coût » · aucune durée). Aucune étiquette de priorité par urgence.

## SIG-1 — La valeur du cookie de rafraîchissement (`zwadj_rt`) est écrite dans le journal des requêtes

**Ce que c'est.** Le journal HTTP (`LoggerModule.forRoot({ pinoHttp: { … } })`, `apps/api/src/app.module.ts:25-32`) déclare `redact: ["req.headers.authorization", "req.headers.cookie"]` : les en-têtes **entrants** sont masqués. Les en-têtes de **réponse** ne le sont pas, et `pino-http` sérialise `res.headers` par défaut. Une réponse qui pose un cookie — `POST /auth/login`, `POST /auth/refresh`, `POST /auth/google` — écrit donc la ligne `Set-Cookie: zwadj_rt=<valeur du jeton>` dans le journal, au niveau `info`, qui est le niveau par défaut en production (`app.module.ts:27`).

**Comment c'est mesuré.** `docs/preuves/D340/mesures-cadrage.sh`, mesure **M27**, sortie dans `mesures-cadrage.txt` : `pino-http` 10.5.0, la configuration **recopiée du dépôt**, un serveur local, une requête portant un cookie et un `Authorization`, une réponse qui pose un `Set-Cookie`.

| configuration | cookie entrant | `Authorization` entrant | `Set-Cookie` **sortant** |
|---|---|---|---|
| actuelle (`app.module.ts:30`) | masqué | masqué | **visible** |
| actuelle + `res.headers["set-cookie"]` | masqué | masqué | masqué |

Les deux premières colonnes à « masqué » sont le **bras de contrôle** : la rédaction fonctionne là où elle est déclarée. La dernière ligne est le **bras du remède** : il agit.

**Ce qui n'est PAS mesuré (écrit).** La mesure est faite au niveau de `pino-http`, la bibliothèque que `nestjs-pino` enveloppe ; **l'application Nest démarrée n'a pas été rejouée**. Aucun déploiement n'existe : la question de savoir où les journaux de production seraient envoyés ou conservés est sans objet aujourd'hui.

**Ce qu'elle bloque.** Aucun rang, aucun lot, aujourd'hui. **Elle touche le lot L36-3a-1** (S-112 du cadrage) : ce lot pose deux nouveaux cookies d'identité sur la même route de journalisation, il doit donc la fermer pour les siens. La même ligne ferme alors le défaut existant. Pour le réparer **avant** L36-3a-1 : **à ordonner par Ko**.

**Son coût, en termes qui se relèvent.** Code (il **compte** au compteur pour mémoire, D283 amendé par D292) ; fichiers touchés : `apps/api/src/app.module.ts` (une ligne) plus un test qui lit **la sortie réelle** du journal (jamais une liste) ; migration : non ; dépendance : non ; chemin de l'argent : non ; e2e : la règle d'`AGENTS.md` l'exige avant un lot qui touche l'auth, et le cookie de rafraîchissement en fait partie — à lire par Ko ; ne mord qu'à partir de `LOG_LEVEL` ≤ `info`, c'est-à-dire en production par défaut.
