-- =============================================================================
-- ZWADJ — D333 (rang 39, L35-3) : chaque SALLE reçoit un NUMÉRO, une séquence sur toute la plateforme
-- =============================================================================
-- Règle de Ko (R3, ratifiée le 11/10/2026) : « Le numéro de salle vient d'une SÉQUENCE PostgreSQL, sur toute la plateforme : il peut sauter une valeur, ne se
-- répète jamais. Il a sa règle d'unicité. Les salles existantes, y compris les salles supprimées (archivées, `deleted_at`), sont numérotées par la migration dans
-- leur ordre de création (départage par identifiant). »
--
-- Ce numéro est la deuxième partie de la référence d'un devis : `DEVIS-2026-0001-0089 v1` (`0001` est ce numéro). Il alimente la migration suivante
-- (`20261015100100_quote_reference`) ; il n'est lu par aucune autre route — aucun contrat d'API ne l'expose (K-6 ne porte que la référence).
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE SÉQUENCE, ET POURQUOI `integer`
-- -----------------------------------------------------------------------------
-- · Une séquence est atomique par construction : deux salles créées ensemble ne peuvent pas recevoir le même numéro. Elle SAUTE une valeur quand une transaction est
--   annulée après `nextval` : Ko l'a admis. Elle ne se répète pas ; la garantie contre une répétition (restauration d'une sauvegarde plus ancienne, insertion directe)
--   est l'`UNIQUE` ci-dessous, pas la séquence.
-- · `integer` et non `bigint` (S-20) : un `BigInt` Prisma ressort en `bigint` JavaScript, que `JSON.stringify` refuse dès qu'une ligne de salle fuit vers une réponse.
--   La séquence est déclarée `AS integer` : à la limite elle ÉCHOUE (« reached maximum value »), elle ne boucle pas.
--
-- -----------------------------------------------------------------------------
-- L'ORDRE DE CE FICHIER EST LA GARANTIE
-- -----------------------------------------------------------------------------
-- 1. colonne NULLABLE (aucun défaut : les lignes existantes ne reçoivent pas un numéro au hasard de la séquence) ;
-- 2. numérotation des lignes existantes, TOUTES (supprimées comprises), `ORDER BY created_at, id` — l'`id` départage deux salles créées à la même microseconde ;
-- 3. `setval` au MAXIMUM : la prochaine salle prend max + 1 (`setval(seq, 1, false)` sur une table vide : la première prend 1) ;
-- 4. défaut `nextval`, `NOT NULL`, `UNIQUE`, `CHECK` posés APRÈS le remplissage (un `NOT NULL` posé avant échouerait sur toute table non vide, D123) ;
-- 5. le déclencheur d'immuabilité EN DERNIER — la numérotation de l'étape 2 est elle-même un `UPDATE` de `number`, qu'il aurait refusé.
--
-- -----------------------------------------------------------------------------
-- LE NUMÉRO NE CHANGE JAMAIS (S-23)
-- -----------------------------------------------------------------------------
-- R3 dit « ne se répète jamais », pas « ne change jamais » : or une référence imprimée sur un PDF déjà remis doit rester vraie. Un déclencheur refuse donc toute modification
-- de `venues.number`. `UPDATE … SET number = number` (la même valeur) n'est pas une modification et passe (`WHEN (OLD.number IS DISTINCT FROM NEW.number)`).
--
-- Retour arrière : DROP TRIGGER, DROP FUNCTION, DROP COLUMN "number" (la séquence, `OWNED BY`, tombe avec elle).
-- Ce fichier est écrit à la MAIN (`prisma migrate dev` est INTERDIT : AGENTS.md) et s'applique par `prisma migrate deploy`.
-- =============================================================================

CREATE SEQUENCE "venue_number_seq" AS integer;

ALTER TABLE "venues" ADD COLUMN "number" integer;

UPDATE "venues" AS v
   SET "number" = n."rang"
  FROM (
        SELECT "id", (row_number() OVER (ORDER BY "created_at", "id"))::integer AS "rang"
          FROM "venues"
       ) AS n
 WHERE v."id" = n."id";

SELECT setval('venue_number_seq', COALESCE(MAX("number"), 1), MAX("number") IS NOT NULL) FROM "venues";

ALTER TABLE "venues"
  ALTER COLUMN "number" SET DEFAULT nextval('venue_number_seq'),
  ALTER COLUMN "number" SET NOT NULL,
  ADD CONSTRAINT "venues_number_key" UNIQUE ("number"),
  ADD CONSTRAINT "venues_number_positive" CHECK ("number" >= 1);

-- La séquence appartient à la colonne : `TRUNCATE … RESTART IDENTITY` (les tests d'intégration) et `DROP TABLE` la traitent avec elle.
ALTER SEQUENCE "venue_number_seq" OWNED BY "venues"."number";

CREATE FUNCTION "venues_number_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'venues.number est immuable : une référence de devis déjà imprimée doit rester vraie (D333)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "venues_number_immutable"
  BEFORE UPDATE OF "number" ON "venues"
  FOR EACH ROW
  WHEN (OLD."number" IS DISTINCT FROM NEW."number")
  EXECUTE FUNCTION "venues_number_immutable"();
