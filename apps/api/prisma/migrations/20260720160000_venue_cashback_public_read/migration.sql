-- Lot A3 — D35 (taux de cashback par salle) + index de lecture publique.
-- cashback_rate_bps : pourcentage du prix de base (MÊME base que
-- commission_rate_bps, pas un dérivé de la commission), réglé par l'admin
-- seul. Défaut 0 = « pas de cashback tant que Ko ne l'a pas réglé » (A3-③).
-- Le CHECK rend MÉCANIQUE la garantie D7/D35 « prélevé sur la commission,
-- jamais sur les fonds Zwadj » : même base ⇒ comparer les pourcentages suffit.
-- Patron SQL manuel identique à venues_commission_rate_range (booking_constraints).

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "cashback_rate_bps" INTEGER NOT NULL DEFAULT 0;

-- CHECK D35
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_cashback_rate_range" CHECK ("cashback_rate_bps" BETWEEN 0 AND "commission_rate_bps");

-- Index PARTIEL de la liste publique (différé depuis A2 — la requête réelle de
-- GET /venues est désormais connue : c'est exactement ce prédicat, D33).
CREATE INDEX "venues_public_list_idx" ON "venues" ("city_id", "base_price_cents")
  WHERE "publication_status" = 'PUBLISHED' AND "deleted_at" IS NULL AND "status" = 'ACTIVE';
