-- =============================================================================
-- ZWADJ — D339 (rang 43, L36-2) : le DEVIS BROUILLON NON OFFICIEL
-- =============================================================================
-- Schéma RATIFIÉ (consigne du relecteur du 22/10/2026, tranche [L36-2], DR4) et ses deux extensions, ratifiées par ADOPTION du message de Ko du 28/10/2026 :
--
--   · quotes.is_official boolean NOT NULL DEFAULT true. `DEFAULT true` rend TOUT devis existant officiel sans qu'une ligne soit réécrite (aucune reprise de données) ET rend
--     la CHECK ci-dessous vraie pour chacune des lignes d'avant : l'ajouter à une base NON VIDE ne peut pas échouer (D123, mesuré par `migration-non-empty.int-spec.ts`).
--   · la CHECK `quotes_unofficial_inert` : un devis NON officiel est INERTE. Il n'est ni remis (sent_via, sent_at), ni accepté (statut ACCEPTED, accepted_at), ni hérité
--     (SENT, SUPERSEDED, DECLINED), et — extension Q2 (a) — il ne porte NI fiche NI nom de client (client_record_id, client_name_ar, client_name_latin à NULL). Les statuts admis
--     sont ceux que le code a le DROIT d'écrire (QUOTE_WRITABLE_STATUSES) moins ACCEPTED, donc DRAFT et CANCELLED : annuler un brouillon reste permis.
--   · un DÉCLENCHEUR sur bookings — extension Q5 (b), R-4 : une réservation ne se rattache pas à un brouillon, ni à l'INSERT ni par un UPDATE de quote_id. Une CHECK ne lit
--     que sa propre ligne, et la conversion n'écrit que bookings : aucune CHECK sur quotes ne la voit. Précédent : `venues_number_immutable` (20261015100000_venue_number).
--
-- ⚠ CE QUE CETTE MIGRATION NE FERME PAS, dit pour ne pas se lire comme tenu : la base n'interdit pas le sens `true → false` (une CHECK n'a pas de mémoire) tant que la ligne est
--   inerte, et le déclencheur est sur bookings, pas sur quotes. Aucun code n'écrit ce sens. Le fermer par un déclencheur sur quotes est hors de la tranche ratifiée.
-- ⚠ Le déclencheur pose ERRCODE check_violation (SQLSTATE 23514, la classe des refus de contrainte) que son précédent ne pose pas : un test le lit comme les CHECK.
--
-- ⛔ Écrite à la MAIN (D186) : `prisma migrate dev` est INTERDIT, la CHECK et le déclencheur n'ont aucune déclaration Prisma. Seule la colonne est déclarée dans schema.prisma.

ALTER TABLE "quotes" ADD COLUMN "is_official" boolean NOT NULL DEFAULT true;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_unofficial_inert" CHECK (
  "is_official"
  OR (
    "status" IN ('DRAFT', 'CANCELLED')
    AND "sent_via" IS NULL AND "sent_at" IS NULL AND "accepted_at" IS NULL
    AND "client_record_id" IS NULL AND "client_name_ar" IS NULL AND "client_name_latin" IS NULL
  )
);

CREATE FUNCTION "bookings_quote_must_be_official"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "quotes" q WHERE q."id" = NEW."quote_id" AND NOT q."is_official") THEN
    RAISE EXCEPTION 'bookings.quote_id désigne un devis non officiel : %', NEW."quote_id"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'bookings_quote_must_be_official';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bookings_quote_must_be_official"
  BEFORE INSERT OR UPDATE OF "quote_id" ON "bookings"
  FOR EACH ROW
  WHEN (NEW."quote_id" IS NOT NULL)
  EXECUTE FUNCTION "bookings_quote_must_be_official"();
