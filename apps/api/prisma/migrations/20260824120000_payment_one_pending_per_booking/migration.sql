-- E3d-1 — UNE SEULE INTENTION « EN ATTENTE » PAR RÉSERVATION.
--
-- ⚠ CHEMIN DE L'ARGENT. Huit modes de défaillance ont été écrits et arbitrés
-- AVANT ce fichier. Les trois qui touchent à ce SQL sont reportés ci-dessous
-- (nettoyage préalable, départage à l'égalité de date, verrou franc).
-- Arbitrage Ko du 24/08/2026, option (a) — contrainte en base plutôt que
-- verrou applicatif, qu'un crash ou un déploiement multi-instance
-- contournerait. La décision et son numéro vivent dans ZWADJ_CONTINUITE.md.
--
-- ── LE DÉFAUT ───────────────────────────────────────────────────────────────
-- `findOrCreatePendingIntent` faisait `findFirst` PUIS `create`, hors
-- transaction. Deux appels concurrents ne trouvent rien tous les deux et créent
-- deux intentions — exactement ce que l'idempotence voulait empêcher. Le défaut
-- est ANTÉRIEUR au port S5a, qui l'a déplacé tel quel en le nommant.
--
-- ── POURQUOI CETTE FORME, ET PAS UNE AUTRE ──────────────────────────────────
-- `payments_one_paid_per_booking` porte DÉJÀ cette forme sur `PAID`. On ne fait
-- que l'appliquer au statut voisin. Un index partiel plutôt qu'une contrainte
-- pleine parce qu'une réservation DOIT pouvoir porter plusieurs tentatives : un
-- premier échec ne peut pas interdire le second. Ce sont les `PENDING`
-- SIMULTANÉS qui sont interdits, pas les tentatives successives.
--
-- ⚠ `PROCESSING` N'EST PAS COUVERT, ET C'EST DÉLIBÉRÉ. Le statut existe dans le
-- type mais n'est écrit nulle part dans `apps/api/src` — vérifié. L'ajouter au
-- prédicat changerait un comportement que personne n'a encore demandé :
-- aujourd'hui déjà, `findFirst` ne regarde que `PENDING`. Décision produit à
-- part, hors de ce lot (cadrage §2).
--
-- ⚠ PAS DE `CONCURRENTLY` : `PAYMENTS_ENABLED` vaut false, la table est vide,
-- et un verrou franc est plus simple à raisonner. À revoir si elle grossit
-- avant l'activation (cadrage MD7).

-- ── 1. NETTOYAGE AVANT INDEX ────────────────────────────────────────────────
-- ⛔ SANS CETTE ÉTAPE, `CREATE UNIQUE INDEX` TOMBE sur toute base portant déjà
-- deux `PENDING` pour une même réservation — c'est-à-dire toute base où la
-- course a eu lieu. La migration échouerait au déploiement, là où elle est le
-- plus coûteuse à diagnostiquer.
--
-- ⚠ QUEL DOUBLON SURVIT EST UNE DÉCISION D'ARGENT, pas un détail technique :
-- le PLUS ANCIEN, parce que c'est son lien de paiement qui est déjà entre les
-- mains d'un visiteur. Fermer celui-là fermerait la page ouverte devant
-- quelqu'un. Les autres passent `EXPIRED` — un statut qui existe déjà dans le
-- type, donc aucun `ALTER TYPE … ADD VALUE` ici, et donc aucun besoin de
-- migration en deux temps (contrairement à `CANCELLED`, R4).
UPDATE "payments" p
   SET "status" = 'EXPIRED', "updated_at" = now()
 WHERE p."status" = 'PENDING'
   AND EXISTS (
     SELECT 1 FROM "payments" plus_ancien
      WHERE plus_ancien."booking_id" = p."booking_id"
        AND plus_ancien."status" = 'PENDING'
        AND (plus_ancien."created_at", plus_ancien."id") < (p."created_at", p."id")
   );

-- ⚠ `(created_at, id)` ET PAS `created_at` SEUL. Deux intentions nées dans la
-- même course peuvent partager la microseconde ; départager sur la seule date
-- laisserait alors DEUX survivantes et l'index tomberait quand même. `id` est
-- un uuidv7, donc ordonné dans le temps : il tranche sans arbitraire.

-- ── 2. L'INDEX ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "payments_one_pending_per_booking"
  ON "payments" ("booking_id")
  WHERE "status" = 'PENDING';
