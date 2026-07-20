-- Lot 8 (OAuth Google) : comptes Google sans mot de passe + identité Google liée.
-- password_hash nullable : NULL = compte créé via Google (register exige toujours
-- un mot de passe — le NULL ne peut PAS apparaître par le flux classique).
-- google_sub : claim `sub` du token GIS (identifiant Google stable, contrairement
-- à l'email) — unique quand présent, NULL pour tous les comptes classiques.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "google_sub" TEXT;
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");
