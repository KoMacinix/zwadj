-- Lot A9 — D36 : suppression RÉELLE de capacity_min, pas un champ masqué.
-- Une colonne que personne ne remplit est une donnée morte qui MENT à la
-- recherche (`capacity_min <= guests` filtrait sur une valeur jamais saisie).
-- capacity_max porte seul l'information utile : « jusqu'à N invités ».
--
-- ⚠ Le CHECK "venues_capacity_valid" (migration 20260707000001) porte sur les
-- DEUX colonnes. Postgres l'emporterait SILENCIEUSEMENT avec la colonne (un
-- DROP COLUMN supprime toute contrainte qui la référence) : on perdrait au
-- passage la garantie « capacité > 0 » sur capacity_max, sans une ligne de
-- diff pour le signaler. On le retire donc explicitement, puis on le REPOSE
-- sur la seule colonne survivante.

ALTER TABLE "venues" DROP CONSTRAINT "venues_capacity_valid";

-- DropColumn
ALTER TABLE "venues" DROP COLUMN "capacity_min";

-- L'index "venues_capacity_max_idx" (filtre capacité de GET /venues) est
-- inchangé : il ne portait déjà que sur capacity_max.
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_capacity_valid" CHECK ("capacity_max" > 0);
