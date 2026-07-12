-- =============================================================================
-- ZWADJ — Migration SQL complémentaire : contraintes hors-Prisma
-- =============================================================================
-- Prisma ne sait pas exprimer : EXCLUDE USING gist, les CHECK, les index
-- uniques partiels, ni CREATE EXTENSION. Ce fichier les ajoute.
--
-- Cette migration est COMMITTÉE dans prisma/migrations : `prisma migrate dev`
-- / `migrate deploy` l'applique comme n'importe quelle autre, après l'init.
--
-- PRÉREQUIS VERSION : PostgreSQL 18+ (fonction native uuidv7() utilisée par
-- les DEFAULT de la migration init — décision validée, docker-compose fourni).
--
-- =============================================================================


-- =============================================================================
-- 1. EXTENSION — backlog 3.1 : btree_gist (permet l'égalité uuid dans un
--    index/contrainte GiST, requis par la contrainte d'exclusion ci-dessous)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- =============================================================================
-- 2. ANTI-DOUBLE-RÉSERVATION — backlog 3.4 / invariant AGENTS.md
-- =============================================================================
-- LA garantie centrale du projet : deux réservations ACCEPTED/CONFIRMED d'une
-- même salle ne peuvent JAMAIS se chevaucher dans le temps — garanti par la
-- base, pas par une vérification applicative.
--
-- Mécanique :
-- - tstzrange(starts_at, ends_at, '[)') : plage semi-ouverte → un créneau qui
--   finit à 18:00 et un qui commence à 18:00 ne se chevauchent PAS (enchaîné).
-- - WHERE status IN ('ACCEPTED','CONFIRMED') : les demandes PENDING peuvent se
--   chevaucher librement (décision AGENTS.md — la salle tranche manuellement) ;
--   DECLINED/EXPIRED/CANCELLED libèrent le créneau automatiquement.
-- - Mode SINGLE_SLOT : l'application matérialise starts_at/ends_at sur la
--   journée locale entière [date 00:00, date+1 00:00) → la contrainte impose
--   mécaniquement "1 réservation/jour", sans règle supplémentaire.
-- - Les walk-ins (source=WALK_IN, créés CONFIRMED) vivent dans la même table
--   → couverts par la même contrainte, aucun cas particulier.
--
-- Côté API (6.2/6.3) : intercepter l'erreur PostgreSQL 23P01
-- (exclusion_violation) sur POST /bookings/:id/accept et le walk-in, et la
-- traduire en réponse 409 propre ("créneau déjà pris").
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_accepted_confirmed"
  EXCLUDE USING gist (
    "venue_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('ACCEPTED', 'CONFIRMED'));

-- Index GiST séparé, TOUS statuts confondus : sert la détection de
-- chevauchement des demandes PENDING (6.2 "overlap detection… surfaced as a
-- conflict list") et l'écran pro "demandes en conflit" (Phase 10). Le conflit
-- est CALCULÉ à la lecture (jamais un flag persisté → pas d'obsolescence si
-- la réservation acceptée s'annule ensuite).
CREATE INDEX "bookings_venue_timerange_gist"
  ON "bookings"
  USING gist ("venue_id", tstzrange("starts_at", "ends_at", '[)'));

-- Blocages pro (availability_blocks) : une contrainte EXCLUDE ne traverse pas
-- deux tables → le conflit bloc↔réservation est vérifié applicativement DANS
-- la transaction d'acceptation (verrou SELECT … FOR UPDATE sur la ligne
-- venues, pris aussi à la création d'un bloc — sérialise les deux écritures
-- par salle). Index GiST pour rendre cette requête de chevauchement rapide :
CREATE INDEX "availability_blocks_venue_timerange_gist"
  ON "availability_blocks"
  USING gist ("venue_id", tstzrange("blocked_from", "blocked_until", '[)'));


-- =============================================================================
-- 3. INTÉGRITÉ TEMPORELLE
-- =============================================================================
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_range_valid" CHECK ("ends_at" > "starts_at");

ALTER TABLE "availability_blocks"
  ADD CONSTRAINT "availability_blocks_range_valid" CHECK ("blocked_until" > "blocked_from");

-- SlotTemplate — minutes locales depuis minuit ; end > 1440 = déborde sur le
-- lendemain (soirée 20h→02h = 1200→1560). Bornes : start ∈ [0,1440),
-- end ∈ (start, 2880].
ALTER TABLE "slot_templates"
  ADD CONSTRAINT "slot_templates_minutes_valid" CHECK (
    "start_minutes" >= 0 AND "start_minutes" < 1440
    AND "end_minutes" > "start_minutes" AND "end_minutes" <= 2880
  );

-- Visites — fenêtres intra-journée uniquement (pas de passage de minuit)
ALTER TABLE "visit_availabilities"
  ADD CONSTRAINT "visit_availabilities_day_valid" CHECK ("day_of_week" BETWEEN 0 AND 6);
ALTER TABLE "visit_availabilities"
  ADD CONSTRAINT "visit_availabilities_minutes_valid" CHECK (
    "start_minutes" >= 0 AND "end_minutes" > "start_minutes" AND "end_minutes" <= 1440
  );


-- =============================================================================
-- 4. TARIFICATION DES PRESTATIONS — backlog 3.4 / AGENTS.md (4 types purs)
-- =============================================================================
-- ⚠ PÉRIMÈTRE RÉDUIT PAR LA DÉCISION 2 (ServicePricing = table séparée,
-- choix conscient) : un CHECK ne référence pas une autre table, donc la
-- correspondance Service.pricingType ↔ contenu de ServicePricing/ServiceTier
-- est désormais une RÈGLE APPLICATIVE (service layer NestJS + tests Phase 15),
-- pas une garantie base — à l'inverse du principe appliqué ailleurs (ex :
-- anti-double-réservation). Non vérifiable ici :
--   - qu'un service FIXED/PER_GUEST/PER_UNIT possède bien SA ligne de pricing
--     et que le mode rempli corresponde au pricingType déclaré ;
--   - qu'un service TIERED n'ait PAS de ligne de pricing et ait ≥ 1 tier actif.
--
-- Ce que la base garantit ENCORE sur une ligne service_pricings isolée :
--   1. exactement UN des trois modes de prix est rempli (jamais 0, jamais 2) ;
--   2. un prix PER_UNIT est toujours accompagné de ses libellés d'unité FR+AR ;
--   3. les bornes min/max n'existent qu'en PER_UNIT et sont cohérentes ;
--   4. les montants sont ≥ 0 ;
--   5. au plus UNE ligne par service (index unique sur service_id, généré par
--      Prisma via @unique).
ALTER TABLE "service_pricings"
  ADD CONSTRAINT "service_pricings_shape" CHECK (
    -- 1. exactement un mode rempli
    (
      ("fixed_price_cents" IS NOT NULL)::int
      + ("per_guest_price_cents" IS NOT NULL)::int
      + ("per_unit_price_cents" IS NOT NULL)::int
    ) = 1
    -- 4. montants positifs (sur le mode rempli)
    AND COALESCE("fixed_price_cents", 0) >= 0
    AND COALESCE("per_guest_price_cents", 0) >= 0
    AND COALESCE("per_unit_price_cents", 0) >= 0
    -- 2./3. libellés d'unité et bornes : uniquement et obligatoirement en per_unit
    AND (
      (
        "per_unit_price_cents" IS NOT NULL
        AND "unit_name_fr" IS NOT NULL AND "unit_name_ar" IS NOT NULL
        AND ("min_units" IS NULL OR "min_units" >= 0)
        AND ("min_units" IS NULL OR "max_units" IS NULL OR "max_units" >= "min_units")
      ) OR (
        "per_unit_price_cents" IS NULL
        AND "unit_name_fr" IS NULL AND "unit_name_ar" IS NULL
        AND "min_units" IS NULL AND "max_units" IS NULL
      )
    )
  );

ALTER TABLE "service_tiers"
  ADD CONSTRAINT "service_tiers_price_positive" CHECK ("price_cents" >= 0);

-- PricingRule — cohérence des champs de portée selon le type de règle
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_multiplier_positive" CHECK ("multiplier_bps" > 0);
ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_scope_shape" CHECK (
    (
      "rule_type" = 'SEASON'
      AND "start_month" BETWEEN 1 AND 12 AND "end_month" BETWEEN 1 AND 12
      AND COALESCE(cardinality("days_of_week"), 0) = 0
    ) OR (
      "rule_type" = 'WEEKDAY'
      AND "start_month" IS NULL AND "end_month" IS NULL
      AND COALESCE(cardinality("days_of_week"), 0) > 0
      AND "days_of_week" <@ ARRAY[0,1,2,3,4,5,6]
    ) OR (
      "rule_type" = 'HOLIDAY'
      AND "start_month" IS NULL AND "end_month" IS NULL
      AND COALESCE(cardinality("days_of_week"), 0) = 0
    )
  );


-- =============================================================================
-- 5. INTÉGRITÉ MONÉTAIRE — invariant AGENTS.md (centimes entiers, cohérence)
-- =============================================================================
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_base_price_positive" CHECK ("base_price_cents" >= 0);
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_capacity_valid" CHECK ("capacity_min" > 0 AND "capacity_max" >= "capacity_min");

-- Commission 1–5 % en points de base (100–500), fixée par l'admin Zwadj seul
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_commission_rate_range" CHECK ("commission_rate_bps" BETWEEN 100 AND 500);

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_amounts_valid" CHECK (
    "guests" > 0
    AND "base_price_cents" >= 0 AND "services_total_cents" >= 0
    AND "total_cents" >= 0 AND "deposit_cents" >= 0
    AND "deposit_cents" <= "total_cents"
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_amounts_valid" CHECK (
    "guests" > 0
    AND "base_price_cents" >= 0 AND "services_total_cents" >= 0
    AND "total_cents" >= 0 AND "deposit_cents" >= 0
    AND "deposit_cents" <= "total_cents"
  );

-- Ligne de prestation : le total snapshoté est arithmétiquement cohérent
ALTER TABLE "booking_services"
  ADD CONSTRAINT "booking_services_amounts_valid" CHECK (
    "quantity" > 0 AND "unit_price_cents" >= 0
    AND "line_total_cents" = "unit_price_cents" * "quantity"
  );

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amounts_valid" CHECK (
    "amount_cents" >= 0 AND "discount_applied_cents" >= 0
  );

-- Commission : taux snapshoté dans la même plage 1–5 %, et net = brut − 1000 DA
-- d'incitation. ASSIETTE (Décision 1) : base_amount_cents = prix de base de la
-- salle résolu à la date (copie de bookings.base_price_cents), JAMAIS le total
-- prestations incluses — le calcul break-even du cashback repose sur cette
-- assiette. net >= 0 grave dans la base l'invariant "break-even au pire cas,
-- jamais de perte sur fonds propres Zwadj" (validé : 1 % × 100 000 DA de prix
-- salle minimum = 1 000 DA = la déduction maximale).
-- (La cohérence base_amount_cents = bookings.base_price_cents traverse deux
-- tables → vérifiée applicativement + test d'intégration Phase 15, comme le
-- reste du chemin d'argent.)
ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_rate_range" CHECK ("rate_bps" BETWEEN 100 AND 500);
ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_amounts_valid" CHECK (
    "base_amount_cents" >= 0 AND "gross_amount_cents" >= 0
    AND "incentive_deduction_cents" >= 0
    AND "net_amount_cents" >= 0
    AND "net_amount_cents" = "gross_amount_cents" - "incentive_deduction_cents"
  );

ALTER TABLE "cashback_claims"
  ADD CONSTRAINT "cashback_claims_amount_positive" CHECK ("amount_cents" > 0);

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_amount_positive" CHECK ("amount_cents" > 0);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_amount_positive" CHECK ("amount_cents" >= 0);


-- =============================================================================
-- 6. UNICITÉS PARTIELLES (inexprimables en Prisma)
-- =============================================================================
-- Un booking peut avoir plusieurs tentatives de paiement (échec → retry, 9.7)
-- mais UN SEUL paiement abouti — le double-encaissement d'acompte est
-- impossible au niveau base (complète l'idempotence webhook applicative).
CREATE UNIQUE INDEX "payments_one_paid_per_booking"
  ON "payments" ("booking_id")
  WHERE "status" = 'PAID';

-- Un seul cashback ACTIF par booking (invariant 6.5) ; une re-soumission
-- après un rejet reste possible — seuls les statuts non rejetés comptent.
CREATE UNIQUE INDEX "cashback_one_active_per_booking"
  ON "cashback_claims" ("booking_id")
  WHERE "status" IN ('PENDING_REVIEW', 'VERIFIED', 'PAID');


-- =============================================================================
-- 7. DIVERS
-- =============================================================================
-- Note d'avis bornée (PRD US8)
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
