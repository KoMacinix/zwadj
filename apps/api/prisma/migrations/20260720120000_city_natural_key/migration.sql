-- Lot A1 — Clé naturelle des villes : (wilaya_id, name_fr).
-- Motivation : l'upsert idempotent du seed exige une contrainte UNIQUE réelle
-- (« upsert par clé naturelle », cadrage Flux A) ; bénéfice collatéral, deux
-- villes homonymes dans une même wilaya sont désormais impossibles EN BASE.
-- L'index simple sur wilaya_id devient redondant (préfixe gauche de l'unique).

-- DropIndex
DROP INDEX "cities_wilaya_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "cities_wilaya_id_name_fr_key" ON "cities"("wilaya_id", "name_fr");
