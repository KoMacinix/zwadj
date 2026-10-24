# D337 — les écritures sur la base de développement de Ko (règle permanente du 23/10/2026 : la commande, l'heure, l'effet mesuré)

Base : `zwadj` dans le conteneur `zwadj-db` (PostgreSQL), celle que lit `apps/api/.env`. Les heures sont en **UTC**, relevées par `date -u` du poste.

## UNE écriture

| quoi | valeur |
|---|---|
| commande | `pnpm --filter @zwadj/api run prisma:migrate` (= `prisma migrate deploy`, jamais `migrate dev`) |
| heure | **24/10/2026 06:25:41 UTC** (la migration se termine à `06:25:44.894216`, lue dans `_prisma_migrations.finished_at`) |
| migration appliquée | `20261024100000_booking_contact_phone_optional` — `bookings.contact_phone` facultatif et `CHECK bookings_contact_reachable` |
| pourquoi sur la base de Ko | pour que ses gestes (`scenarios-ko.md`) marchent : une réservation par e-mail seul s'écrit `contact_phone` NULL ; sans la migration, le formulaire en ligne répondrait 500. |

**Avant** (relevé à 06:25:33 UTC) : `contact_phone` `NOT NULL` (`is_nullable = NO`) ; contrainte `bookings_contact_reachable` absente ; `bookings` : 10 lignes, 10 avec numéro, 10 avec e-mail ; 30 migrations journalisées, la dernière `20261022120000_pro_client_records`.
**Après** (relevé à 06:25:45 UTC) : `contact_phone` nullable (`YES`) ; `bookings_contact_reachable CHECK (((contact_phone IS NOT NULL) OR (contact_email IS NOT NULL)))` ; `bookings` : **10 lignes, 10 avec numéro, 10 avec e-mail — inchangées** ; 31 migrations journalisées, la dernière la neuve.
**Effet** : rien n'a été réécrit ; la colonne a été assouplie, la contrainte posée. Retour arrière, si Ko le veut : `ALTER TABLE bookings DROP CONSTRAINT bookings_contact_reachable; ALTER TABLE bookings ALTER COLUMN contact_phone SET NOT NULL;` n'est possible **que tant qu'aucune réservation par e-mail seul n'existe** (sinon le `SET NOT NULL` échoue) — et il ne retire pas la ligne `_prisma_migrations`.

## Des LECTURES (ce ne sont pas des écritures, dites parce qu'elles servent de preuve)

- `SELECT … FROM _prisma_migrations` (date d'application de `20261022120000_pro_client_records` : **23/10/2026 04:06:41.651575 UTC**, ce que la consigne appelait « omission de D336 ») ; `SELECT count(*)` sur `pro_client_records`, `quotes`, `bookings` — à l'ouverture (1 fiche, 26 devis, 10 réservations : les 2 devis et la fiche de plus que le « 0 fiche, 24 devis » du 23/10 sont ceux des gestes de Ko, faits depuis).
- Aucune ligne de la base de développement n'a été écrite par les tests : `test:int` et la campagne `--int` recréent `zwadj_test`, la suite e2e `zwadj_e2e`, la sonde de migration `zwadj_migration_test`.
