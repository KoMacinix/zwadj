-- Lot E2b — cycle de vie du DEVIS. Écrite À LA MAIN (`prisma migrate dev` reste
-- interdit : il effacerait les index PARTIELS ci-dessous, qui sont toute la
-- garantie de ce lot).
--
-- La table `quotes` existe depuis l'init mais n'a jamais reçu une seule ligne :
-- aucun code ne l'écrivait. Les reprises sont donc formelles — elles restent
-- écrites correctement, parce qu'une migration se rejoue un jour sur une base
-- qu'on n'a pas sous les yeux.
--
-- ── Ce que ce lot rend possible, et qui était STRUCTURELLEMENT impossible ─────
-- Un devis vivait forcément accroché à une réservation via `BookingService`.
-- Conséquence : un devis qui n'aboutit pas n'avait NULLE PART où exister, donc
-- le taux de transformation n'était pas « pas encore mesuré », il était
-- impossible à mesurer. C'est la raison d'être de ce lot.

-- =============================================================================
-- 1. STATUTS
-- =============================================================================
-- ⚠ Pas d'EXPIRED. Un statut que rien ne fait basculer devient un mensonge en
-- base — c'est la leçon de D80, écrite deux lots plus tôt. Un devis dont
-- `valid_until` est passé EST expiré : la condition est déterministe, donc
-- l'expiration se DÉRIVE à la lecture. Le jour où un job pg-boss existera, la
-- question se rouvrira ; pas avant.
--
-- SUPERSEDED n'est pas DECLINED, et la nuance n'est pas cosmétique :
--   DECLINED   = quelqu'un a explicitement refusé CE devis
--   SUPERSEDED = ce devis a été remplacé par une version plus récente
-- Six mois plus tard, devant un litige, « remplacé » et « refusé » n'appellent
-- pas la même réponse.
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'SUPERSEDED');

ALTER TABLE "quotes"
  ADD COLUMN "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "chain_id" UUID,
  ADD COLUMN "parent_quote_id" UUID,
  ADD COLUMN "sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "accepted_at" TIMESTAMPTZ(6);

-- =============================================================================
-- 2. LA CHAÎNE DE VERSIONS
-- =============================================================================
-- `chain_id` est DÉNORMALISÉ : égal à son propre id pour la v1, hérité tel quel
-- par chaque version suivante.
--
-- ⚠ Pourquoi ne pas se contenter de `parent_quote_id` ? Parce qu'une chaîne
-- reliée seulement de proche en proche ne se parcourt que par récursion, et
-- qu'un INDEX UNIQUE ne peut pas s'appuyer sur une CTE récursive. Sans colonne
-- dénormalisée, la règle « au plus un devis actif par chaîne » ne serait pas
-- garantissable par la base — seulement espérée par le service.
-- `parent_quote_id` reste utile pour lire l'historique dans l'ordre ; il n'est
-- simplement pas l'autorité.
UPDATE "quotes" SET "chain_id" = "id" WHERE "chain_id" IS NULL;
ALTER TABLE "quotes" ALTER COLUMN "chain_id" SET NOT NULL;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_parent_quote_id_fkey"
  FOREIGN KEY ("parent_quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Une v1 n'a pas de parent ; toute version ultérieure en a un. Les deux sens.
ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_version_parent_coherent"
  CHECK (("version" = 1) = ("parent_quote_id" IS NULL));

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_version_positive" CHECK ("version" >= 1);

-- Deux « v2 » dans la même chaîne seraient deux totaux concurrents sous le même
-- numéro. La base tranche.
CREATE UNIQUE INDEX "quotes_chain_version_unique" ON "quotes"("chain_id", "version");

-- =============================================================================
-- 3. AU PLUS UN DEVIS ACTIF PAR CHAÎNE
-- =============================================================================
-- Règle UNIQUE, valable pour les deux états actifs : toute version qui devient
-- active remplace la précédente active de sa chaîne. Deux index plutôt qu'un
-- seul sur « actif », parce qu'un SENT et un ACCEPTED de la même chaîne ne
-- doivent pas non plus coexister — l'un remplace l'autre.
--
-- ⚠ CES INDEX NE SONT PAS DIFFÉRABLES, et ce n'est pas un oubli : `DEFERRABLE`
-- ne s'applique qu'aux CONTRAINTES, et `ADD CONSTRAINT UNIQUE` n'accepte pas de
-- clause `WHERE`. Un index unique partiel est vérifié à CHAQUE instruction.
-- Conséquence directe pour le service : dans la transaction d'acceptation, il
-- faut RÉTROGRADER l'ancienne active AVANT d'activer la nouvelle. L'ordre n'est
-- pas une précaution, c'est le seul chemin qui passe.
--
-- Une contrainte EXCLUDE différable aurait été possible — le dépôt sait faire,
-- c'est le mécanisme anti-double-réservation — mais différer fait remonter
-- l'erreur au COMMIT, loin de l'instruction fautive, et rend un 409 propre
-- beaucoup plus difficile à produire.
CREATE UNIQUE INDEX "quotes_one_accepted_per_chain" ON "quotes"("chain_id") WHERE "status" = 'ACCEPTED';
CREATE UNIQUE INDEX "quotes_one_sent_per_chain" ON "quotes"("chain_id") WHERE "status" = 'SENT';

-- =============================================================================
-- 4. COHÉRENCE DES HORODATAGES
-- =============================================================================
-- Un DRAFT n'a pas été envoyé. Tout le reste l'a été — y compris un SUPERSEDED,
-- puisque seule une version ACTIVE se fait remplacer.
ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_sent_at_coherent"
  CHECK ("status" = 'DRAFT' OR "sent_at" IS NOT NULL);

-- `accepted_at` survit à la supersession : un devis accepté puis remplacé garde
-- la trace de son acceptation. D'où une implication, et non une équivalence.
ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_accepted_at_coherent"
  CHECK ("accepted_at" IS NULL OR "status" IN ('ACCEPTED', 'SUPERSEDED'));

-- =============================================================================
-- 5. REPORTING
-- =============================================================================
-- La raison d'être n°3 de la table : « combien de devis envoyés, combien
-- transformés ». Sans cet index, la question se pose par balayage complet.
CREATE INDEX "quotes_venue_status_created_idx" ON "quotes"("venue_id", "status", "created_at");
