-- =============================================================================
-- ZWADJ — D282 : l'AGRÉGAT des montants devient une garantie de la BASE
-- =============================================================================
-- Ajoute, sur `bookings` ET sur `quotes`, l'identité qui manquait :
--
--     total_cents = base_price_cents + services_total_cents
--
-- -----------------------------------------------------------------------------
-- POURQUOI DEUX CONTRAINTES GOUVERNENT DÉSORMAIS LES MÊMES COLONNES
-- -----------------------------------------------------------------------------
-- ⛔ CE N'EST PAS UNE REDONDANCE, ET C'EST LE POINT LE PLUS IMPORTANT DE CE
-- FICHIER. `bookings_amounts_valid` et `quotes_amounts_valid` existent depuis
-- `20260707000001_booking_constraints` — la PREMIÈRE migration de contraintes du
-- dépôt — et elles gouvernent DÉJÀ ces trois colonnes :
--
--     base_price_cents >= 0 AND services_total_cents >= 0
--     AND total_cents >= 0 AND deposit_cents <= total_cents
--
-- Elles omettent précisément le conjoint ci-dessus. La garde qui devait tenir
-- les montants était donc là depuis le premier jour, sur les BONNES colonnes,
-- sans celui-là.
-- ⇒ Une ligne dont l'agrégat est faux n'est pas passée par un trou que personne
-- n'avait pensé à boucher : elle est passée par UNE CONTRAINTE ÉCRITE POUR ÇA.
--
-- -----------------------------------------------------------------------------
-- CE QUI JUSTIFIE CETTE MIGRATION EST UNE OBSERVATION, PAS UN RAISONNEMENT
-- -----------------------------------------------------------------------------
-- Le 08/09/2026 (D279), la cible 8 de `neutralisation/neutralize-s11b.py` a muté
-- une ligne du calcul partagé. Les DEUX chemins — demande directe et devis — ont
-- alors écrit en base des lignes dont `base_price_cents` ne correspondait plus à
-- `total_cents - services_total_cents`, et PostgreSQL comme les 36 fichiers
-- d'intégration les ont ACCEPTÉES, en vert.
-- ⇒ La question n'est donc pas « une erreur d'agrégation pourrait-elle passer ? »
-- mais « combien de temps est-elle passée sans que rien ne le dise ? ».
-- ⛔ QUI VOUDRA RETIRER CETTE CONTRAINTE DEVRA EXPLIQUER CE QUE DEVIENT CETTE
-- MESURE-LÀ, pas répondre à une inquiétude théorique.
--
-- -----------------------------------------------------------------------------
-- LES DEUX TABLES, ET PAS UNE SEULE
-- -----------------------------------------------------------------------------
-- Le dépôt contraint ces deux tables ensemble et symétriquement depuis sa
-- première migration : `quotes_amounts_valid` et `bookings_amounts_valid` y sont
-- écrites à quatre lignes d'écart, avec un contenu identique. Poser le CHECK sur
-- `bookings` seul casserait une symétrie tenue depuis l'origine.
-- ⚠ Et le sens de la copie l'exige : les trois colonnes de `Booking` sont
-- annotées « snapshots copiés du devis à la création ». Le devis est l'AMONT ;
-- contraindre la copie sans la source, ce serait garder le mauvais bout.
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE CONTRAINTE SÉPARÉE PLUTÔT QU'UN CONJOINT DANS `amounts_valid`
-- -----------------------------------------------------------------------------
-- Parce qu'un `23514` doit NOMMER la faute. Fondu dans `amounts_valid`, six
-- conditions rendraient toutes le même nom de contrainte, et le diagnostic
-- serait perdu au moment précis où on en a besoin. Sur le chemin de l'argent,
-- le nom porte le diagnostic.
--
-- -----------------------------------------------------------------------------
-- ⛔ PAS DE `NOT VALID`, ET C'EST UNE DÉCISION
-- -----------------------------------------------------------------------------
-- `NOT VALID` ferait passer cette migration sur une base incohérente sans rien
-- vérifier — donc annulerait exactement la garantie qu'elle apporte. La
-- migration ÉCHOUE FRANC si une ligne ne passe pas.
-- ⚠ Elle ne RÉPARE rien non plus : aucun `UPDATE` correctif. Sur le chemin de
-- l'argent, une migration qui recalcule des montants toute seule est pire que
-- celle qui s'arrête — c'est le sens du « EXPIRÉES, pas supprimées » d'E3d-1.
-- ⇒ CONSÉQUENCE À PORTER : sur une base portant une ligne incohérente, ce
-- déploiement s'arrête. Compter AVANT d'appliquer :
--     SELECT count(*) FROM bookings
--      WHERE total_cents <> base_price_cents + services_total_cents;
--     SELECT count(*) FROM quotes
--      WHERE total_cents <> base_price_cents + services_total_cents;
-- Relevé sur `zwadj` le 09/09/2026, avant application : 0 violante sur 4
-- réservations, 0 sur 38 devis. ⚠ Les 38 devis sont un relevé NEUF — le
-- prérequis de D278 n'avait porté que sur les 4 réservations, et il ne bornait
-- à peu près rien.
--
-- ⚠ AUCUNE DÉCLARATION PRISMA N'ACCOMPAGNE CES DEUX OBJETS, ET C'EST NORMAL :
-- Prisma ne sait pas exprimer un CHECK. Il n'y a donc rien à déclarer dans
-- `schema.prisma` — à l'inverse d'un `@@index`/`@@unique`, dont l'absence serait
-- une dérive.
--
-- ⚠ CE QUE CETTE MIGRATION NE COUVRE PAS : l'accord entre `services_total_cents`
-- et la SOMME des lignes de `booking_services`. Un CHECK ne référence pas une
-- autre table — même limite, et même motif, que la correspondance
-- `Service.pricingType` ↔ `ServicePricing` déjà documentée dans
-- `20260707000001`. Cela reste une garantie applicative.
-- =============================================================================

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_total_coherent" CHECK (
    "total_cents" = "base_price_cents" + "services_total_cents"
  );

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_total_coherent" CHECK (
    "total_cents" = "base_price_cents" + "services_total_cents"
  );
