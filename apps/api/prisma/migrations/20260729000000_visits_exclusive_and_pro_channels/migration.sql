-- =============================================================================
-- Flux C — D59 : un rendez-vous de visite est EXCLUSIF (supersède D47)
--                D60 : le pro choisit son canal de notification
-- =============================================================================
--
-- D47 tolérait le chevauchement des visites et n'imposait donc aucune
-- contrainte. Décision renversée par Ko : un créneau déjà pris ne peut plus
-- être pris par quelqu'un d'autre. On le garantit EN BASE, pas seulement dans
-- le service — une vérification applicative laisse toujours une fenêtre entre
-- le test et l'insertion, et deux clients qui cliquent sur le même créneau à la
-- même seconde sont le cas le plus probable, pas le plus rare.
--
-- Index UNIQUE PARTIEL, et non contrainte d'exclusion : une visite dure 30 min
-- fixes (D58) et commence toujours sur un multiple de créneau, donc l'égalité
-- de `scheduled_at` suffit — pas besoin du recouvrement d'intervalles que les
-- fêtes exigent. Le filtre `status = 'CONFIRMED'` est essentiel : une visite
-- ANNULÉE doit LIBÉRER son créneau, et un index total l'en empêcherait à jamais.
CREATE UNIQUE INDEX "visit_bookings_no_double_confirmed"
  ON "visit_bookings" ("venue_id", "scheduled_at")
  WHERE "status" = 'CONFIRMED';

-- Le canal SMS existe désormais. Transport retenu : WhatsApp — c'est ce que les
-- pros algériens utilisent réellement pour leur activité.
-- `ADD VALUE` reste hors de toute utilisation dans CETTE migration : PostgreSQL
-- refuserait d'employer une valeur d'enum ajoutée dans la même transaction.
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'SMS';

-- D60 — DEUX booléens plutôt qu'un enum à trois valeurs.
-- Un enum { EMAIL, SMS, BOTH } explose dès le troisième canal : il faudrait
-- EMAIL_PUSH, SMS_PUSH, EMAIL_SMS_PUSH… Deux drapeaux se combinent, et le
-- suivant s'ajoute sans toucher aux existants.
ALTER TABLE "pro_profiles"
  ADD COLUMN "notify_by_email" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notify_by_sms" BOOLEAN NOT NULL DEFAULT false;

-- Le revers des deux booléens est qu'ils autorisent « aucun canal » — un pro
-- qui coupe tout ne verrait plus jamais une demande de visite arriver. La base
-- l'interdit, pour que ce ne soit pas au formulaire de s'en souvenir.
ALTER TABLE "pro_profiles"
  ADD CONSTRAINT "pro_profiles_one_channel_required"
  CHECK ("notify_by_email" OR "notify_by_sms");
