-- D46 (B1) — le prix de location descend de la SALLE vers le CRÉNEAU.
--
-- `venues.base_price_cents` n'est PAS supprimée : elle devient un DÉRIVÉ, le
-- minimum des créneaux actifs, recalculé par l'API dans la même transaction
-- que toute modification de créneau. La recherche publique (Lots A3/A7) filtre
-- et trie dessus ; la retirer imposerait une jointure et une réécriture du
-- contrat pour un gain nul.
--
-- DEFAULT puis DROP DEFAULT : le DEFAULT ne sert qu'à traverser l'ajout de la
-- colonne NOT NULL sur d'éventuelles lignes existantes. On ne le LAISSE pas —
-- un créneau créé sans prix explicite doit échouer, pas valoir zéro.
ALTER TABLE "slot_templates" ADD COLUMN "base_price_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "slot_templates" ALTER COLUMN "base_price_cents" DROP DEFAULT;

-- Filet de sécurité en base, doublant la validation Zod : un créneau gratuit
-- n'est pas un prix, c'est un oubli de saisie — et il deviendrait le
-- « à partir de » public de la salle. Même doctrine que
-- venues_capacity_valid et venues_commission_rate_range.
ALTER TABLE "slot_templates"
  ADD CONSTRAINT "slot_templates_base_price_positive" CHECK ("base_price_cents" > 0);

-- Les bornes du créneau (dans la journée, début < fin) sont DÉJÀ contraintes
-- par `slot_templates_minutes_valid`, posée en 20260707000001. Ne pas la
-- redéclarer : la suite d'intégration rejoue chaque migration dans l'ordre et
-- un ADD CONSTRAINT en double échoue en 42710.
