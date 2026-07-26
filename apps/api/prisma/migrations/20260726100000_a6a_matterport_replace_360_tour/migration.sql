-- Lot A6a — D45 : Matterport remplace le tour 360° maison (supersède D34).
-- Scan interne, compte Matterport UNIQUE Zwadj. Le tour multi-photos liées
-- (Pannellum) et son éditeur A6b sont abandonnés : la visite virtuelle tient
-- désormais dans UNE colonne sur venues.
--
-- ÉCRITE À LA MAIN (`migrate dev --create-only`), délibérément. Ce schéma porte
-- une trentaine de CHECK, un EXCLUDE USING gist et des index partiels/
-- d'expression qui n'existent QUE dans le SQL des migrations : `schema.prisma`
-- ne peut pas les exprimer, donc un diff généré n'a aucune autorité sur eux.
-- Leçon A9 (le CHECK venues_capacity_valid emporté en silence par un
-- DROP COLUMN) : sur ce dépôt, tout DROP se relit à la main.
--
-- ⚠ venue_photos_360 a été créée par la migration INIT (20260707000000), pas
-- par le Lot A4 — A4 n'a fait que la remanier (thumb_key, unique composite) et
-- créer la table des liaisons. Les deux tables partent ici.
--
-- Ce que le DROP TABLE emporte AVEC les tables (vérifié en base réelle, aucun
-- résidu attendu dans pg_constraint / pg_indexes) :
--   · venue_photos_360_id_venue_id_unique      (renfort D34 n°1)
--   · venue_photo_360_links_photo_{a,b}_same_venue_fkey (FK composites, n°1)
--   · venue_photo_360_links_distinct_photos    (CHECK, renfort D34 n°2)
--   · venue_photo_360_links_pair_unique        (LEAST/GREATEST, renfort n°3)
--   · venue_photo_360_links_{yaw,pitch}_range  (CHECK bornes hotspots)
--   · tous les index venue_id / photo_a_id / photo_b_id
-- AUCUNE contrainte d'une AUTRE table n'est touchée : les renforts vivent tous
-- sur ces deux tables. En particulier venues_capacity_valid,
-- venues_cashback_rate_range et l'EXCLUDE gist des bookings restent en place.

-- ── Ordre imposé : enfant d'abord ────────────────────────────────────────────
-- venue_photo_360_links référence venue_photos_360 par trois FK. Dropper le
-- parent d'abord exigerait un CASCADE, qui masquerait toute dépendance
-- imprévue. L'ordre explicite échoue bruyamment si quelque chose d'autre s'est
-- greffé entre-temps — c'est le comportement voulu.
DROP TABLE "venue_photo_360_links";
DROP TABLE "venue_photos_360";

-- ── venues.matterport_model_id ───────────────────────────────────────────────
-- Nullable : toutes les salles ne sont pas scannées, et la colonne est ajoutée
-- sur une table déjà peuplée (aucun DEFAULT, aucun backfill).
-- UNIQUE : un modèle Matterport appartient à UNE salle. Postgres autorisant
-- plusieurs NULL dans un index unique, les salles sans scan cohabitent sans
-- contorsion (pas besoin d'index partiel ici).
-- VarChar(24) : borne haute du format d'ID (MATTERPORT_ID_PATTERN côté types).
-- La validation de FORME reste applicative (parseMatterportInput) — un CHECK
-- SQL sur un format tiers se périmerait sans préavis le jour où Matterport
-- allonge ses identifiants.
ALTER TABLE "venues" ADD COLUMN "matterport_model_id" VARCHAR(24);

CREATE UNIQUE INDEX "venues_matterport_model_id_key"
  ON "venues"("matterport_model_id");
