-- Lot E1a — Demande de réservation : politique d'acompte par salle (D81) et
-- message du client (D79). Écrite À LA MAIN : `prisma migrate dev` reste
-- interdit (AGENTS.md), il effacerait les garanties SQL de ce dépôt.
--
-- Tout le reste du parcours existait déjà depuis `20260707000001` :
-- l'EXCLUDE anti-double-réservation, l'index GiST des conflits pending, les
-- CHECK de montants. Cette migration n'ajoute que ce qui manquait vraiment.

-- =============================================================================
-- 1. POLITIQUE D'ACOMPTE PAR SALLE (D81)
-- =============================================================================
-- Pourcentage OU montant fixe, jamais les deux, jamais aucun. Deux colonnes
-- plutôt qu'un couple `type` + `valeur` : mélanger des centimes et des points
-- de base dans une même colonne est exactement ce que D46 refuse. Chacune garde
-- son unité ET ses bornes.
-- ⚠ DEFAULT sur le taux, et il n'est pas cosmétique : sans lui, la contrainte
-- d'exclusivité ci-dessous rejetterait toute salle CRÉÉE ensuite — la reprise
-- ne sert que les lignes déjà là. Le défaut appartient à la colonne et non au
-- service : un seed, une migration de données ou un INSERT brut doivent
-- produire une salle valide eux aussi.
ALTER TABLE "venues"
  ADD COLUMN "deposit_rate_bps" INTEGER DEFAULT 3000,
  ADD COLUMN "deposit_amount_cents" INTEGER;

-- Reprise des salles existantes : les 30 % implicites d'avant ce lot, ceux que
-- le design annonce déjà partout. Fait AVANT les contraintes — l'inverse
-- échouerait sur la première ligne.
UPDATE "venues" SET "deposit_rate_bps" = 3000 WHERE "deposit_rate_bps" IS NULL AND "deposit_amount_cents" IS NULL;

-- Exclusivité : exactement un des deux est renseigné. `<>` sur deux booléens est
-- le XOR de PostgreSQL — il rend NULL si l'un des opérandes l'est, mais
-- `IS NULL` ne rend jamais NULL, donc le CHECK est bien à deux valeurs ici.
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_deposit_policy_exclusive"
  CHECK (("deposit_rate_bps" IS NULL) <> ("deposit_amount_cents" IS NULL));

-- Bornes du taux. Le plancher n'est pas décoratif : 0 % voudrait dire « on
-- confirme sans rien encaisser », ce qui n'est plus du request-to-book. Le
-- plafond de 10000 bps autorise le paiement intégral en ligne, choix légitime.
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_deposit_rate_range"
  CHECK ("deposit_rate_bps" IS NULL OR "deposit_rate_bps" BETWEEN 500 AND 10000);

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_deposit_amount_positive"
  CHECK ("deposit_amount_cents" IS NULL OR "deposit_amount_cents" > 0);

-- =============================================================================
-- 2. MESSAGE DU CLIENT (D79)
-- =============================================================================
-- « 02 · Message à la salle (optionnel) ». Facultatif, et plafonné à 1000
-- caractères par Zod SEULEMENT : ajouter ici un CHECK de longueur créerait une
-- seconde vérité sur la même borne, ce que D55 interdit.
ALTER TABLE "bookings"
  ADD COLUMN "client_message" TEXT;
