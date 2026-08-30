-- R4 — `quotes_sent_at_coherent` INTERDISAIT DE CLORE UN BROUILLON JAMAIS REMIS.
--
-- Second défaut du même chemin, découvert APRÈS avoir corrigé le premier : une
-- fois `CANCELLED` entré dans le type, `POST /quotes/:id/cancel` rendait encore
-- 500 sur un devis non remis. La contrainte disait :
--     CHECK (status = 'DRAFT' OR sent_at IS NOT NULL)
-- soit « tout état autre que DRAFT implique une remise ».
--
-- ⚠ CETTE PRÉMISSE ÉTAIT VRAIE LE JOUR OÙ ELLE A ÉTÉ ÉCRITE, ET Q2 L'A RENDUE
-- FAUSSE. En août, `SENT` était un STATUT : sortir de DRAFT, c'était être
-- envoyé, donc `sent_at` non nul allait de soi. Depuis Q2/D160, `DRAFT` est le
-- seul état ouvert et la remise est un geste RÉPÉTABLE qui ne change pas le
-- statut. Un devis peut donc parfaitement être clos sans avoir jamais été
-- remis : le pro rédige, le client renonce, le pro clôt. C'est même un cas que
-- l'entonnoir D162 compte explicitement — « un devis qui n'aboutit PAS existe
-- quand même ».
--
-- La règle D55 s'applique telle quelle, et dans le sens qui dérange : avant
-- d'écrire une borne, écrire le cas réel qu'elle doit accepter. Le cas réel
-- existe, la borne le refusait — c'est la BORNE qui est fausse, pas l'appel.
-- La contrainte n'a pas été supprimée pour autant : elle continue d'exiger une
-- remise pour les statuts qui l'impliquent réellement.
--
-- ⚠ POURQUOI UNE MIGRATION SÉPARÉE DE `20260821000000`, et non deux
-- instructions dans le même fichier : `ALTER TYPE … ADD VALUE` n'autorise pas
-- l'USAGE de la valeur neuve avant le commit. Un `CHECK` qui NOMME 'CANCELLED'
-- dans la même transaction échoue. Les fusionner aurait produit une migration
-- qui casse au déploiement — précisément ce que la première annonce.
--
-- ⚠ AUCUNE LIGNE EXISTANTE NE PEUT VIOLER LA NOUVELLE FORME : elle est plus
-- PERMISSIVE que l'ancienne, elle n'ajoute aucun refus. Le `DROP` puis `ADD`
-- revalide toute la table, ce qui est ici gratuit et sans risque.
--
-- ⚠ CE QUI RESTE OUVERT, ET QUI N'EST PAS TRAITÉ ICI : `ACCEPTED` porte la même
-- prémisse périmée. Un BROUILLON se convertit sans remise préalable (D160,
-- mesuré), et E3 posera `ACCEPTED` à l'encaissement de l'acompte — sur une
-- ligne dont `sent_at` peut être NUL. La contrainte lèvera alors, sur le chemin
-- de l'argent. Rien ne le mesure aujourd'hui (E3c en pause, `PAYMENTS_ENABLED`
-- à `false`), et élargir sans test rouge violerait la doctrine du dépôt. À
-- trancher AVANT que E3 n'écrive son premier `ACCEPTED` — consigné, pas oublié.
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_sent_at_coherent";

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_sent_at_coherent"
  CHECK ("status" IN ('DRAFT', 'CANCELLED') OR "sent_at" IS NOT NULL);

COMMENT ON CONSTRAINT "quotes_sent_at_coherent" ON "quotes" IS
  'Un devis hors DRAFT/CANCELLED a forcement ete remis. CANCELLED est exempte depuis R4 : cloturer un brouillon jamais remis est un cas reel (D160/D162).';
