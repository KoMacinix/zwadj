-- Lot A10 (2/2) — D37/D41 : demande de suppression de compte + archivage.
--
-- Rien ici ne SUPPRIME quoi que ce soit. Une demande est déposée, l'admin Zwadj
-- tranche, et l'exécution est une ANONYMISATION : commissions dues et
-- historique de réservations doivent survivre (même doctrine que
-- venues.deleted_at, jamais de DELETE SQL).

-- CreateEnum
CREATE TYPE "AccountDeletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "status" "AccountDeletionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "email_hash" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(6),
    "decided_by_id" UUID,
    "decision_note" TEXT,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id");
CREATE INDEX "account_deletion_requests_status_requested_at_idx"
  ON "account_deletion_requests"("status", "requested_at");

ALTER TABLE "account_deletion_requests"
  ADD CONSTRAINT "account_deletion_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- SET NULL et non CASCADE : si le compte ADMIN décideur disparaît un jour, on
-- perd QUI a tranché, jamais LA décision elle-même.
ALTER TABLE "account_deletion_requests"
  ADD CONSTRAINT "account_deletion_requests_decided_by_id_fkey"
    FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Renfort SQL manuel (patron venues_commission_rate_range) ─────────────────
-- UNE SEULE demande en attente par compte, garantie EN BASE. Un contrôle
-- applicatif seul laisserait la fenêtre TOCTOU ouverte sur un double-clic ;
-- l'index unique PARTIEL la ferme, et n'entrave pas l'historique (un compte
-- peut cumuler autant de demandes CANCELLED/REJECTED que nécessaire).
CREATE UNIQUE INDEX "account_deletion_requests_one_pending"
  ON "account_deletion_requests" ("user_id") WHERE "status" = 'PENDING';

-- CreateTable — D41 : trace de CE qui a été archivé par CETTE demande.
-- Table fille, pas un tableau scalaire : le schéma n'en utilise aucun, et la
-- FK vers venues garantit que la trace ne peut pas pendre dans le vide.
-- Sans elle, une restauration ne pourrait pas distinguer ces salles de celles
-- que le pro avait lui-même supprimées des mois plus tôt — et ressusciterait
-- les mauvaises.
CREATE TABLE "account_deletion_archived_venues" (
    "request_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_archived_venues_pkey" PRIMARY KEY ("request_id", "venue_id")
);

CREATE INDEX "account_deletion_archived_venues_venue_id_idx"
  ON "account_deletion_archived_venues"("venue_id");

ALTER TABLE "account_deletion_archived_venues"
  ADD CONSTRAINT "account_deletion_archived_venues_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "account_deletion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_deletion_archived_venues"
  ADD CONSTRAINT "account_deletion_archived_venues_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
