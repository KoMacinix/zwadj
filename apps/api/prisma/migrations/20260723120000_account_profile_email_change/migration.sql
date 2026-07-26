-- Lot A10 (1/2) — champs de compte en libre-service.
-- Séparée de la migration « suppression de compte » à dessein : ce sont deux
-- sujets, et une migration qui mélange un ajout de colonne anodin avec la
-- machinerie d'anonymisation se relit mal le jour où il faut la rejouer.

-- ── D38 : seconde ligne téléphonique du pro ──────────────────────────────────
-- NULLABLE : un seul numéro reste obligatoire (celui de l'inscription, D3).
ALTER TABLE "pro_profiles" ADD COLUMN "phone2" TEXT;

-- ── Changement d'e-mail avec preuve de possession ────────────────────────────
-- L'ancienne adresse RESTE l'identifiant tant que la nouvelle n'est pas
-- prouvée : le lien part À LA NOUVELLE adresse, et une faute de frappe ne peut
-- pas verrouiller quelqu'un dehors.
--
-- Table SÉPARÉE de email_verification_tokens, et non un drapeau ajouté dessus :
-- le même token devrait alors signifier deux choses (vérifier l'adresse
-- courante / basculer vers une autre), et la règle « un seul lien valide à la
-- fois » (DELETE des non consommés) ferait s'annuler les deux flux entre eux.
-- Aucune contrainte d'unicité sur new_email : l'unicité réelle est celle de
-- users.email, tranchée à la CONSOMMATION du token (une adresse peut être
-- convoitée par deux demandes, une seule aboutira).
CREATE TABLE "email_change_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "new_email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_change_tokens_token_hash_key" ON "email_change_tokens"("token_hash");
CREATE INDEX "email_change_tokens_user_id_idx" ON "email_change_tokens"("user_id");

ALTER TABLE "email_change_tokens"
  ADD CONSTRAINT "email_change_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
