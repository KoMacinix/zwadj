-- =============================================================================
-- ZWADJ — D337 (rang 42, L36-1) : la RÉSERVATION PAR E-MAIL SEUL
-- =============================================================================
-- Schéma RATIFIÉ (consigne du relecteur du 22/10/2026, tranche [L36-1], DR3) et Q2 de Ko (22/10/2026) : « Une réservation est tout à fait possible avec une adresse
-- e-mail uniquement. Le numéro de téléphone reste optionnel, bien qu'il soit préférable pour le Professionnel afin d'assurer une communication plus rapide. »
--
--   · bookings.contact_phone devient NULLABLE (il était NOT NULL depuis `20260707000000_init`) ;
--   · CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL) : une réservation a TOUJOURS un moyen de joindre le client. Le contrat applique la même règle
--     (`hasContactChannel`, `@zwadj/types`) ; la base est la dernière garde (D186 : l'autorité sur les garanties est la migration, jamais `schema.prisma`).
--
-- -----------------------------------------------------------------------------
-- CE QUE CE FICHIER GARANTIT — ET CE QU'IL NE TOUCHE PAS
-- -----------------------------------------------------------------------------
-- 1. Aucune ligne existante n'est réécrite : `contact_phone` était NOT NULL, donc CHAQUE réservation existante a un numéro et satisfait le CHECK. `ADD CONSTRAINT`
--    valide les lignes existantes ; il ne peut donc pas échouer sur une base issue de l'ancien schéma (D123 : mesuré sur base non vide par
--    `migration-non-empty.int-spec.ts`, bloc « L36-1 »).
-- 2. `bookings.contact_email` ne bouge pas (nullable depuis toujours). `visit_bookings.contact_phone` ne bouge pas (nullable depuis `20260730000000`, D61) : hors lot.
-- 3. Prisma n'exprime pas un CHECK : AUCUNE déclaration dans `schema.prisma` pour lui (doctrine de ce dépôt) ; seul `Booking.contactPhone` devient `String?`.
--    `prisma migrate dev` proposerait de le supprimer — d'où `migrate deploy` seul (AGENTS.md, « Migrations »).
-- 4. Le CHECK est posé APRÈS le DROP NOT NULL, dans la même transaction (le fichier est appliqué en bloc) : il n'existe aucun instant où une réservation sans numéro
--    ni e-mail pourrait entrer.
ALTER TABLE "bookings" ALTER COLUMN "contact_phone" DROP NOT NULL;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_contact_reachable"
  CHECK ("contact_phone" IS NOT NULL OR "contact_email" IS NOT NULL);
