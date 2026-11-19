# D353 — le geste de Ko (un seul), pour ce que R-3 corrige de VISIBLE

⛔ **Ce que le lot a changé, et que seul un humain peut regarder** : quand l'API répond **200 avec des listes VIDES** (base migrée, pas encore semée), le site gardait cette réponse vide **une heure** : les filtres de `/fr/salles` (communes, équipements, styles) restaient absents alors que l'API avait ses listes. Maintenant une réponse vide n'est **jamais crue** : le site la relit sans cache. Ce que ce geste montre : **les filtres apparaissent dès qu'on recharge, après le semis**. (La mesure automatique est dans `mesures/r2-production.md` et dans les 18 tests de `apps/client/src/lib/api.test.ts` ; ce geste est le regard humain.)

⚠ **Ta base de développement n'est ni lue ni écrite** : tout se passe sur une base jetable `zwadj_geste`, dans le conteneur `zwadj-db` que tu as déjà. Les ports 3100 et 3101 doivent être libres (ce sont ceux de l'e2e ; tes serveurs de développement habituels n'ont pas à s'arrêter).

## Les étapes (PowerShell, depuis la racine du dépôt)

1. **Créer la base jetable et lui donner son schéma** :
   ```
   docker exec zwadj-db psql -U zwadj -c "CREATE DATABASE zwadj_geste"
   $env:DATABASE_URL = "postgresql://zwadj:zwadj@localhost:5432/zwadj_geste?schema=public"
   pnpm --filter @zwadj/api run prisma:migrate
   ```
   Attendu : « All migrations have been successfully applied » (33 migrations). **Ne pas semer.**
2. **Terminal A — l'API sur cette base** (la même fenêtre garde `$env:DATABASE_URL`) :
   ```
   $env:PORT = "3101"; $env:CORS_ORIGINS = "http://localhost:3100"; $env:CLIENT_URL = "http://localhost:3100"
   pnpm --filter @zwadj/api exec nest start
   ```
   Attendu : « Nest application successfully started » (une trentaine de secondes).
3. **Terminal B — le site client** :
   ```
   $env:NEXT_PUBLIC_API_URL = "http://localhost:3101"
   pnpm --filter @zwadj/client exec next dev --port 3100
   ```
4. **Ouvrir** `http://localhost:3100/fr/salles` dans le navigateur. **Attendu : AUCUN filtre de commune, d'équipement ni de style** (la base est vide : c'est normal, le panneau perd ses puces et la recherche continue).
5. **Terminal C — semer la base** (nouvelle fenêtre : remettre `$env:DATABASE_URL` comme à l'étape 1) :
   ```
   $env:DATABASE_URL = "postgresql://zwadj:zwadj@localhost:5432/zwadj_geste?schema=public"
   pnpm --filter @zwadj/api run db:seed
   ```
   Attendu : « Seed OK — 58 wilayas, 23 villes, 23 équipements ».
6. **Recharger la page `/fr/salles`** (F5 ordinaire, ou cliquer sur « Salles » dans la navigation). **ATTENDU APRÈS CE LOT : les filtres sont là** — 23 communes dans la liste, 23 équipements, 4 styles (Royal, Jardin, Bord de mer, Patrimoine). **AVANT ce lot** (code de `cd8e079`), ils seraient restés absents jusqu'à une heure (mesuré : 34 sondes sur 37 sans relecture sur `next dev`).
7. **Nettoyer** : arrêter les terminaux A et B (Ctrl+C), puis
   ```
   docker exec zwadj-db psql -U zwadj -c "DROP DATABASE zwadj_geste"
   ```

## Ce que ce geste ne vérifie PAS

- La **production** (`next start`, hébergeur) : mesurée avec une fenêtre de 20 s sur une copie, pas à la valeur réelle (une heure) ni chez un hébergeur.
- L'**arabe** (`/ar/salles`) : la correction ne touche aucun texte ; le même geste y vaut.
- Le **coût** d'une lecture d'API de plus par liste et par rendu tant que la liste est vide : **non mesuré**.
