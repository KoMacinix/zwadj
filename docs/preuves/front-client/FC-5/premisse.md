# FC-5 — la prémisse, vérifiée à `6129255` (D231)

**La semaine** : `WEEK_START_DAY = 0` et `WEEKEND_DAYS = [5, 6]` sont DÉCLARÉES deux fois — `apps/client/src/lib/calendar.ts`
(l. 28-35) et `apps/pro/src/venues/pro-calendar.ts` (l. 37-44, « COPIE ASSUMÉE »). Aucune dans `@zwadj/types`. Arbitrage de Ko
du 04/10/2026 : « Le week-end : une seule définition, partagée par le client et le pro. »

**Les adresses** : l'instrument de D321 (`docs/preuves/D321/adresses/relever-adresses.mjs`), rejoué en lecture seule à ce SHA,
rend **38** occurrences dans le client (60 fichiers parcourus, 13 adresses) et **39** dans le pro (55 fichiers, 15 adresses —
dont `/auth/me`, une route d'API, pas une page). La garde neuve (`adresses-guard.test.ts`), qui prend pour autorité les pages
DÉCLARÉES (fichiers `page.tsx` du client, `<Route path>` de `App.tsx`), en compte **76** hors des deux tables : elle voit aussi
`path="/salles/:id"` et `` `/salles?${q}` `` que le relevé de D321 ne retenait pas (deux-points, requête), et ne compte ni la
constante de connexion ni `/auth/me`.

**Ce qui change, et ce qui ne change pas** : chaque adresse écrite en dur devient une constante de la table de son application
(`apps/client/src/lib/routes.ts`, `apps/pro/src/routes.ts`) — **chaque constante vaut exactement l'adresse qu'elle remplace** :
aucune page ne bouge, aucun lien ne change de cible. La page d'accueil `/` n'est pas relevée (D321 ne la relevait pas) ; le pro
déclare quand même sa route `/` par `DASHBOARD_PATH`. Les deux calendriers de la fiche salle : HORS lot.
