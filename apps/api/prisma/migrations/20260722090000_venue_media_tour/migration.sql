-- Lot A4 — venue_media_tour : médias des salles + tour 360° multi-scènes (D34).
-- Tables VIDES par construction (aucun endpoint d'upload n'a existé avant A4) :
-- les ADD COLUMN NOT NULL sans défaut sont sûrs, et documentés comme tels.
--
-- Principe de stockage : la base porte des CLÉS du port MEDIA_STORAGE (A0),
-- jamais une URL figée — publicUrl() est recalculée à CHAQUE lecture, donc la
-- bascule disque → S3/CDN ne réécrira aucune ligne.

-- ── venue_photos ─────────────────────────────────────────────────────────────
ALTER TABLE "venue_photos" RENAME COLUMN "url" TO "storage_key";
ALTER TABLE "venue_photos"
  ADD COLUMN "thumb_key" TEXT NOT NULL,
  ADD COLUMN "width" INTEGER NOT NULL,
  ADD COLUMN "height" INTEGER NOT NULL;

-- ── venue_photos_360 : D34, plus d'unicité par salle ─────────────────────────
ALTER TABLE "venue_photos_360" RENAME COLUMN "url" TO "storage_key";
ALTER TABLE "venue_photos_360" ADD COLUMN "thumb_key" TEXT NOT NULL;
DROP INDEX "venue_photos_360_venue_id_key";
CREATE INDEX "venue_photos_360_venue_id_idx" ON "venue_photos_360"("venue_id");
-- Renfort D34 n°1 (cible) : rend possibles les FK composites des liaisons.
ALTER TABLE "venue_photos_360"
  ADD CONSTRAINT "venue_photos_360_id_venue_id_unique" UNIQUE ("id", "venue_id");

-- ── venue_photo_360_links : une ligne = une liaison bidirectionnelle ─────────
CREATE TABLE "venue_photo_360_links" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "venue_id" UUID NOT NULL,
    "photo_a_id" UUID NOT NULL,
    "photo_b_id" UUID NOT NULL,
    "yaw_a" DOUBLE PRECISION NOT NULL,
    "pitch_a" DOUBLE PRECISION NOT NULL,
    "yaw_b" DOUBLE PRECISION NOT NULL,
    "pitch_b" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_photo_360_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "venue_photo_360_links_venue_id_idx" ON "venue_photo_360_links"("venue_id");
CREATE INDEX "venue_photo_360_links_photo_a_id_idx" ON "venue_photo_360_links"("photo_a_id");
CREATE INDEX "venue_photo_360_links_photo_b_id_idx" ON "venue_photo_360_links"("photo_b_id");

ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_photo_a_id_fkey"
    FOREIGN KEY ("photo_a_id") REFERENCES "venue_photos_360"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_photo_b_id_fkey"
    FOREIGN KEY ("photo_b_id") REFERENCES "venue_photos_360"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Renforts D34 (SQL manuel, patron commission_rate_bps) ────────────────────
-- 1. FK COMPOSITES : chaque extrémité doit appartenir à LA salle de la liaison
--    — l'inter-salles est impossible en base, pas seulement en application.
ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_photo_a_same_venue_fkey"
    FOREIGN KEY ("photo_a_id", "venue_id")
    REFERENCES "venue_photos_360"("id", "venue_id") ON DELETE CASCADE,
  ADD CONSTRAINT "venue_photo_360_links_photo_b_same_venue_fkey"
    FOREIGN KEY ("photo_b_id", "venue_id")
    REFERENCES "venue_photos_360"("id", "venue_id") ON DELETE CASCADE;

-- 2. Pas d'auto-liaison.
ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_distinct_photos" CHECK ("photo_a_id" <> "photo_b_id");

-- 3. Doublon inversé (A,B)/(B,A) refusé — la liaison est bidirectionnelle,
--    une seule ligne la porte dans les deux sens.
CREATE UNIQUE INDEX "venue_photo_360_links_pair_unique"
  ON "venue_photo_360_links" (LEAST("photo_a_id", "photo_b_id"), GREATEST("photo_a_id", "photo_b_id"));

-- Bornes des hotspots (degrés) : filet mécanique sous la validation Zod.
ALTER TABLE "venue_photo_360_links"
  ADD CONSTRAINT "venue_photo_360_links_yaw_range"
    CHECK ("yaw_a" BETWEEN -180 AND 180 AND "yaw_b" BETWEEN -180 AND 180),
  ADD CONSTRAINT "venue_photo_360_links_pitch_range"
    CHECK ("pitch_a" BETWEEN -90 AND 90 AND "pitch_b" BETWEEN -90 AND 90);
