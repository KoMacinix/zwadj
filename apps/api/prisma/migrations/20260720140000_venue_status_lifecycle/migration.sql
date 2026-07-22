-- Lot A2 — D33 (statut de visibilité pro) + soft delete.
-- status : troisième axe d'état du cycle de vie d'une salle, ORTHOGONAL à
-- publication_status (porte de modération Zwadj, one-way) et à deleted_at
-- (fin de vie). Piloté librement par le PRO, réversible.
-- deleted_at : JAMAIS de DELETE SQL sur venues — l'historique réservations/
-- commissions doit survivre à la fin de vie d'une salle.
-- Index de lecture publique (publication_status/status/deleted_at) : différés
-- à A3, qui connaîtra la requête réelle de GET /venues.

-- CreateEnum
CREATE TYPE "VenueAvailabilityStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'TEMPORARILY_UNAVAILABLE');

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "status" "VenueAvailabilityStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);
