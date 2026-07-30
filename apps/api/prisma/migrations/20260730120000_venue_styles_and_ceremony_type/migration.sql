-- =============================================================================
-- Flux A, Lot A13 — D65 : référentiel de STYLES + D66 : TYPE DE CÉRÉMONIE
-- =============================================================================
--
-- D65 — les styles sont un RÉFÉRENTIEL, pas une enum : ajouter « Ferme » ou
-- « Riad » dans six mois ne doit pas demander une migration, et les libellés
-- FR/AR vivent avec la donnée. Même patron exact qu'`amenities` /
-- `venue_amenities`, qui fonctionne déjà — un seul modèle mental pour deux
-- listes de même nature.
--
-- D66 — le type de cérémonie, lui, EST une enum : intérieur / extérieur / mixte
-- est exhaustif par construction, il ne s'étend pas. NULLABLE : les salles
-- existantes n'en ont pas, et un défaut `INDOOR` mentirait sur une donnée
-- jamais saisie — l'écran pro doit pouvoir montrer le vide.

-- CreateEnum
CREATE TYPE "CeremonyType" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- AlterTable
ALTER TABLE "venues" ADD COLUMN "ceremony_type" "CeremonyType";

-- CreateTable
CREATE TABLE "venue_styles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "key" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    -- Ordre d'affichage des puces : « Royal » avant « Patrimoine » est un choix
    -- éditorial, pas un tri alphabétique — et il doit être le MÊME dans les deux
    -- langues (un tri par libellé donnerait deux ordres différents en FR et AR).
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "venue_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_style_links" (
    "venue_id" UUID NOT NULL,
    "style_id" UUID NOT NULL,
    CONSTRAINT "venue_style_links_pkey" PRIMARY KEY ("venue_id", "style_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venue_styles_key_key" ON "venue_styles"("key");

-- CreateIndex
CREATE INDEX "venue_style_links_style_id_idx" ON "venue_style_links"("style_id");

-- CreateIndex : le filtre public interroge `ceremony_type` sur des salles déjà
-- restreintes par statut ; l'index sert le cas où un type est très minoritaire.
CREATE INDEX "venues_ceremony_type_idx" ON "venues"("ceremony_type");

-- AddForeignKey
ALTER TABLE "venue_style_links" ADD CONSTRAINT "venue_style_links_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_style_links" ADD CONSTRAINT "venue_style_links_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "venue_styles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
