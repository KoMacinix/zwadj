-- =============================================================================
-- ZWADJ — D333 (rang 39, L35-3) : chaque DEVIS reçoit sa référence — année, numéro, et garde de BASE
-- =============================================================================
-- Règles de Ko (R3, ratifiée le 11/10/2026) :
--   · « Le numéro du devis est tenu par une TABLE DE COMPTEURS dédiée, une ligne par (salle, année), incrémentée de façon atomique dans la transaction de création.
--     Jamais « lire le plus grand puis ajouter 1 ». »
--   · « L'unicité en base porte sur (salle, année, numéro) pour la PREMIÈRE version de chaque devis. Les versions suivantes recopient année et numéro, et un test le prouve. »
--   · « L'année est celle de la création de la version 1, à l'heure d'Alger (D48). Une révision garde année et numéro ; seul `v` change, même l'année suivante. »
--   · « Les devis existants sont numérotés par la migration, par ordre de création. Test sur base non vide (D123). »
--
-- La référence imprimée est `DEVIS-<année>-<numéro de la salle>-<numéro du devis> v<version>` ; ce fichier pose les deux colonnes du devis et la table de compteurs. Le
-- numéro de la salle vient de la migration précédente (`20261015100000_venue_number`).
--
-- -----------------------------------------------------------------------------
-- CE QUE CE FICHIER GARANTIT — LA BASE, PAS LE SERVICE (D186)
-- -----------------------------------------------------------------------------
-- 1. `quote_number_counters` : UNE ligne par (salle, année) ; le service l'incrémente par `INSERT … ON CONFLICT DO UPDATE … + 1 … RETURNING` dans la MÊME transaction
--    que le devis (un échec ultérieur rend le numéro : pas de saut). La table ne passe JAMAIS par `venues` : l'acceptation d'une réservation et la création d'un blocage
--    posent `FOR UPDATE` sur la ligne de la salle (D51, D117), et `venues.updated_at` est la clé de tri de la liste (D327).
-- 2. `quotes_reference_head_unique` : index unique PARTIEL `(salle, année, numéro) WHERE version = 1` — deux têtes ne peuvent pas porter le même numéro, mais une version 2
--    PEUT reprendre celui de sa tête (c'est le filtre qui le permet). Prisma n'exprime pas un index partiel : il n'est déclaré dans aucun `@@index` (doctrine de ce dépôt).
-- 3. `quotes_chain_head_fkey` : clé étrangère COMPOSITE de chaque version vers la tête de sa chaîne, sur `(chain_id, venue_id, reference_year, reference_number)` — une version
--    qui n'a pas l'année, le numéro ou la salle de sa tête est REFUSÉE (patron B2). Elle est IMMÉDIATE : la tête naît donc avec `chain_id = id` en UNE écriture (S-22) — mesuré
--    sur PostgreSQL 18.4, l'ancienne écriture (`chain_id` provisoire puis `UPDATE`) est refusée par cette clé (`docs/preuves/D333/releve-code/premisses-postgres-sortie.txt`).
-- 4. Les bornes : `reference_number >= 1`, `reference_year` de 2000 à 9999 (quatre chiffres), `last_number >= 1`.
--
-- -----------------------------------------------------------------------------
-- L'ORDRE DE CE FICHIER EST LA GARANTIE
-- -----------------------------------------------------------------------------
-- colonnes NULLABLES → numérotation des têtes → recopie sur les révisions → VÉRIFICATION qui LÈVE si une ligne est restée sans numéro → compteurs amorcés au maximum →
-- `NOT NULL`, `CHECK`, `UNIQUE`, clé étrangère. Tout est posé APRÈS le remplissage (D123) : une contrainte posée avant échouerait sur toute base non vide.
--
-- · Les têtes sont les lignes `version = 1` (migration `20260802140000` : `chain_id = id` pour toute tête). Elles sont numérotées par (salle, ANNÉE D'ALGER de `created_at`),
--   dans l'ordre `created_at, id` (l'`id` départage deux devis créés à la même microseconde). `Africa/Algiers` est UTC + 1 sans heure d'été (D48) : le 31/12 à 23 h 00 UTC est
--   déjà l'année SUIVANTE. Pour une base créée par le code du lot, `reference_year` est l'année d'Alger du MÊME instant que `created_at` (S-21) : la migration décrit la même règle.
-- · Une révision recopie l'année et le numéro de sa tête, même écrite l'année suivante.
-- · ⚠ La migration lit une fois le plus grand numéro par (salle, année) pour AMORCER les compteurs depuis les devis existants : c'est un rétro-calcul unique, pas une allocation.
--
-- Une révision sans tête (chaîne cassée) laisserait une ligne sans numéro : la vérification LÈVE, la transaction implicite du fichier est annulée, la base reste intacte.
-- Retour arrière : supprimer la clé, l'index, l'unicité, les deux colonnes, puis la table de compteurs.
-- Ce fichier est écrit à la MAIN (`prisma migrate dev` est INTERDIT : AGENTS.md) et s'applique par `prisma migrate deploy`.
-- =============================================================================

CREATE TABLE "quote_number_counters" (
  "venue_id"    uuid     NOT NULL,
  "year"        smallint NOT NULL,
  "last_number" integer  NOT NULL,
  CONSTRAINT "quote_number_counters_pkey" PRIMARY KEY ("venue_id", "year"),
  CONSTRAINT "quote_number_counters_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quote_number_counters_last_number_positive" CHECK ("last_number" >= 1),
  CONSTRAINT "quote_number_counters_year_range" CHECK ("year" BETWEEN 2000 AND 9999)
);

ALTER TABLE "quotes"
  ADD COLUMN "reference_year"   smallint,
  ADD COLUMN "reference_number" integer;

-- Les têtes : (salle, année d'Alger), dans l'ordre de création.
UPDATE "quotes" AS q
   SET "reference_year" = h."annee", "reference_number" = h."rang"
  FROM (
        SELECT "id",
               (EXTRACT(YEAR FROM "created_at" AT TIME ZONE 'Africa/Algiers'))::smallint AS "annee",
               (row_number() OVER (
                  PARTITION BY "venue_id", EXTRACT(YEAR FROM "created_at" AT TIME ZONE 'Africa/Algiers')
                  ORDER BY "created_at", "id"
               ))::integer AS "rang"
          FROM "quotes"
         WHERE "version" = 1
       ) AS h
 WHERE q."id" = h."id";

-- Les révisions recopient leur tête.
UPDATE "quotes" AS q
   SET "reference_year" = h."reference_year", "reference_number" = h."reference_number"
  FROM "quotes" AS h
 WHERE q."version" > 1
   AND h."id" = q."chain_id"
   AND h."version" = 1;

-- Aucune ligne ne doit rester sans numéro : sinon la migration LÈVE (et la transaction implicite du fichier est annulée).
DO $$
DECLARE
  restantes integer;
BEGIN
  SELECT count(*) INTO restantes FROM "quotes" WHERE "reference_year" IS NULL OR "reference_number" IS NULL;
  IF restantes > 0 THEN
    RAISE EXCEPTION 'quotes : % ligne(s) sans numéro de référence (une révision sans tête de chaîne ?) — migration annulée', restantes;
  END IF;
END
$$;

-- Les compteurs : le plus grand numéro de chaque (salle, année), pour que la prochaine création prenne le suivant.
INSERT INTO "quote_number_counters" ("venue_id", "year", "last_number")
SELECT "venue_id", "reference_year", MAX("reference_number")
  FROM "quotes"
 WHERE "version" = 1
 GROUP BY "venue_id", "reference_year";

ALTER TABLE "quotes"
  ALTER COLUMN "reference_year" SET NOT NULL,
  ALTER COLUMN "reference_number" SET NOT NULL,
  ADD CONSTRAINT "quotes_reference_number_positive" CHECK ("reference_number" >= 1),
  ADD CONSTRAINT "quotes_reference_year_range" CHECK ("reference_year" BETWEEN 2000 AND 9999);

CREATE UNIQUE INDEX "quotes_reference_head_unique" ON "quotes"("venue_id", "reference_year", "reference_number") WHERE "version" = 1;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_head_reference_key" UNIQUE ("id", "venue_id", "reference_year", "reference_number");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_chain_head_fkey"
  FOREIGN KEY ("chain_id", "venue_id", "reference_year", "reference_number")
  REFERENCES "quotes"("id", "venue_id", "reference_year", "reference_number")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
