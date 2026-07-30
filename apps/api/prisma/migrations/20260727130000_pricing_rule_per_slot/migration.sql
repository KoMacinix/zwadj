-- D46 (B2) — le PRIX descend dans le créneau, et les règles de prix avec lui.
--
-- Migration DESTRUCTIVE assumée : `pricing_rules` n'a jamais servi (aucun
-- endpoint ne l'écrivait avant ce lot, Flux B n'était pas commencé). On vide
-- donc la table plutôt que d'inventer un rattachement pour des lignes qui
-- n'existent pas — une conversion multiplicateur → prix absolu exigerait un
-- prix de base de référence, et il n'y en a pas d'unique.
DELETE FROM "pricing_rules";

-- Le multiplicateur disparaît : des prix ABSOLUS ne se composent pas, ce qui
-- est précisément ce qui rend la résolution décidable (une seule règle gagne).
ALTER TABLE "pricing_rules" DROP COLUMN "multiplier_bps";
ALTER TABLE "pricing_rules" ADD COLUMN "price_cents" integer NOT NULL;
ALTER TABLE "pricing_rules" ADD COLUMN "slot_template_id" uuid NOT NULL;

ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_slot_template_id_fkey"
  FOREIGN KEY ("slot_template_id") REFERENCES "slot_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "pricing_rules_slot_template_id_idx" ON "pricing_rules"("slot_template_id");

-- Même filet que slot_templates_base_price_positive : un prix nul n'est pas
-- un tarif, c'est un oubli — et il deviendrait le « à partir de » public.
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_price_positive" CHECK ("price_cents" > 0);

-- Renfort ANTI-INTER-SALLES (patron des FK composites du Lot A4) : sans lui,
-- rien n'empêcherait une règle de la salle A de pointer un créneau de la
-- salle B, et le « à partir de » de A intégrerait un prix qui n'est pas le
-- sien. La clé candidate composite est le support de la FK composite.
ALTER TABLE "slot_templates" ADD CONSTRAINT "slot_templates_id_venue_id_key" UNIQUE ("id", "venue_id");
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_slot_belongs_to_venue"
  FOREIGN KEY ("slot_template_id", "venue_id")
  REFERENCES "slot_templates"("id", "venue_id") ON DELETE CASCADE ON UPDATE CASCADE;
