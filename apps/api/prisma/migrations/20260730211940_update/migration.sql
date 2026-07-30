-- DropForeignKey
ALTER TABLE "pricing_rules" DROP CONSTRAINT "pricing_rules_slot_belongs_to_venue";

-- DropIndex
DROP INDEX "slot_templates_id_venue_id_key";

-- DropIndex
DROP INDEX "venues_ceremony_type_idx";
