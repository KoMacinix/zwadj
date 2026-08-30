-- Lot Q2 (ex-C1c) — LE BASCULEMENT. Écrite À LA MAIN (`prisma migrate dev` reste
-- interdit : il effacerait les index PARTIELS de `20260802140000`, qui ne
-- tombent qu'en Q4, et pas ici).
--
-- ── Ce que fait cette migration, et RIEN d'autre ────────────────────────────
-- Un seul `UPDATE`. Aucune colonne ajoutée, aucune supprimée, aucun type
-- modifié. Tout le reste du lot est du CODE — c'est ce qui rend le retour
-- arrière possible sans restauration de sauvegarde (D165).
--
-- ── ⚠ LE CRITÈRE DE TRI, ET POURQUOI IL N'EST PAS « IMPRIMÉ OU NON » ────────
-- L'arbitrage initial disait « `SENT` → `DRAFT`, sans distinction de cas ».
-- Il était faux, et D166 l'a corrigé : `convert()` crée la réservation et LAISSE
-- le devis en `SENT`. Un `SENT` peut donc déjà porter un `Booking` vivant. Le
-- basculer en `DRAFT` le rendrait éditable — c'est-à-dire que la migration
-- elle-même violerait D163, la règle qui protège le montant d'une réservation
-- acceptée et bientôt payée.
--
-- Le critère retenu n'est pas « ce devis a-t-il vraiment été imprimé » — cette
-- information est irrécupérable, et l'inventer produirait exactement l'entonnoir
-- faussement juste que D168 refuse. C'est « ce devis adosse-t-il une
-- réservation », information EXACTE et gratuite, lisible dans `bookings.quote_id`.
--
-- ── Ce que les lignes conservées deviennent ─────────────────────────────────
-- Elles restent `SENT`. Ce statut n'est donc PAS supprimé du type PostgreSQL :
-- il devient LEGACY — plus jamais écrit, toujours lu. `QuoteStatus.SENT` reste
-- dans l'union TypeScript pour cette raison, et l'écran sait encore l'afficher.
-- Le retirer du type demanderait de recréer l'énuméré ; ce n'est ni nécessaire
-- ni sans risque, et Q4 tranchera avec les colonnes.
--
-- ⚠ AUCUNE REPRISE DE `sent_via`. Les devis conservés en `SENT` gardent un canal
-- NUL, donc sortent du nouvel entonnoir (D162 compte sur `sent_via`). L'effet
-- est visible et il est VOULU : l'indicateur repart de zéro plutôt que de
-- prétendre savoir par quel canal un devis de juillet est parti.
--
-- ⚠ Aucune violation d'index possible dans ce sens : `quotes_one_sent_per_chain`
-- ne contraint QUE les lignes `SENT` (index PARTIEL). En retirer des lignes ne
-- peut pas créer de doublon. L'inverse — repasser des lignes en `SENT` — le
-- pourrait, et c'est une raison de plus pour que le retour arrière soit une
-- bascule de CODE, pas un `UPDATE` symétrique.

UPDATE "quotes" q
   SET "status" = 'DRAFT'
 WHERE q."status" = 'SENT'
   AND NOT EXISTS (
     SELECT 1 FROM "bookings" b WHERE b."quote_id" = q."id"
   );

COMMENT ON COLUMN "quotes"."status" IS
  'Cycle de vie du devis. DRAFT est le seul etat ouvert depuis Q2. SENT et SUPERSEDED sont LEGACY : plus jamais ecrits, toujours lus (SENT survit sur les devis deja convertis, D166). ACCEPTED est pose par E3 a l''encaissement de l''acompte.';

COMMENT ON COLUMN "quotes"."valid_until" IS
  'NEUTRALISEE au lot Q2 (D160) : plus rien ne l''ecrit ni ne la lit. Conservee pour que le retour arriere reste une bascule de code ; suppression prevue avec chain_id / version / parent_quote_id au lot Q4 (D165).';
