-- Lot C1b — LE CANAL DE REMISE DU DEVIS. Écrite À LA MAIN (`prisma migrate dev`
-- reste interdit : il effacerait les index PARTIELS de `20260802140000`, qui ne
-- tombent qu'en C1e, et pas ici).
--
-- ── Pourquoi cette colonne existe, et pourquoi elle arrive SEULE ─────────────
-- L'entonnoir de transformation compte aujourd'hui les chaînes dont `sent_at`
-- n'est pas nul. La décision 3 de C1 change ce dénominateur : ce ne sont plus
-- les devis « envoyés » — le mot ne décrit aucun parcours réel — mais les devis
-- REMIS au client, quel que soit le canal.
--
-- Or `sent_at` ne porte qu'un horodatage : il ne dit pas PAR QUOI le devis est
-- parti. Tant que cette information n'existe pas, on ne peut pas retirer
-- `SENT` sans que l'entonnoir retombe à zéro en silence.
--
-- ⚠ CETTE MIGRATION NE CHANGE AUCUN COMPORTEMENT, ET C'EST VOULU. La colonne
-- naît NULLABLE et personne ne l'écrit encore : l'entonnoir continue de compter
-- sur `sent_at`, exactement comme avant. Le basculement est le lot suivant.
-- Tant que rien n'écrit ici, le retour arrière est une bascule de code — pas
-- une restauration de sauvegarde.
--
-- ── Pourquoi TEXT et pas un type énuméré ────────────────────────────────────
-- La liste des canaux est explicitement OUVERTE : impression, SMS, remise en
-- main propre, accord par téléphone, et d'autres à venir. Un type PostgreSQL
-- imposerait un `ALTER TYPE ... ADD VALUE` — donc une migration — à chaque
-- libellé ajouté. Le jeu de valeurs est tenu par un schéma Zod partagé, où
-- l'ajouter coûte une ligne et se teste.
--
-- Le `CHECK` ci-dessous ne duplique PAS cette liste : il interdit seulement le
-- vide et le blanc, qui ne sont pas des canaux et rendraient l'entonnoir faux
-- sans jamais lever d'erreur. La liste elle-même a une seule autorité, et elle
-- est dans le code.
--
-- ── Ce que les lignes existantes deviennent ─────────────────────────────────
-- NULL, et on ne cherche pas à reconstituer. Un vieux devis `SENT` ne dit pas
-- s'il a réellement été remis ou si le pro a cliqué pour débloquer l'étape
-- suivante ; l'inventer produirait un entonnoir qui a l'air juste. Le sort de
-- ces lignes est tranché séparément (décision 7 : `SENT` sans réservation
-- redevient `DRAFT`, `SENT` avec réservation garde son état de converti).

ALTER TABLE "quotes" ADD COLUMN "sent_via" TEXT;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_sent_via_not_blank"
  CHECK ("sent_via" IS NULL OR btrim("sent_via") <> '');

COMMENT ON COLUMN "quotes"."sent_via" IS
  'Canal de remise du devis au client (C1b). NULL = pas encore remis. Jeu de valeurs tenu par quoteSentViaSchema dans @zwadj/types.';
