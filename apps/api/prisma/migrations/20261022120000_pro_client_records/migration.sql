-- =============================================================================
-- ZWADJ — D336 (rang 41, L35-4 amendé) : la FICHE CLIENT d'un pro, et la COPIE du nom sur le devis
-- =============================================================================
-- Schéma RATIFIÉ par Ko (consigne v3 du relecteur, adoptée le 22/10/2026, § 4, tranche [41]) :
--   · pro_client_records (neuve) : id uuidv7 ; pro_profile_id NOT NULL, FK RESTRICT ; phone NULLABLE, canonique (M-2) ; email NULLABLE, normalisé (trim, minuscules,
--     NFKC), jamais vérifié ; name_ar et name_latin NULLABLES (DB-3) ; linked_user_id NULLABLE et linked_at ; created_at, updated_at.
--     CHECK (phone IS NOT NULL OR email IS NOT NULL) ; CHECK (name_ar IS NOT NULL OR name_latin IS NOT NULL) ; CHECK ((linked_user_id IS NULL) = (linked_at IS NULL)) ;
--     UNIQUE (pro_profile_id, phone) WHERE phone IS NOT NULL ; UNIQUE (pro_profile_id, email) WHERE email IS NOT NULL.
--     « Le CHECK de forme du numéro (décision 7 de D328) est à trancher dans ce lot » ⇒ TRANCHÉ OUI (S-50, décision de la session à ratifier par Ko).
--   · quotes : + client_record_id NULLABLE, FK ON DELETE SET NULL ; + client_name_ar et client_name_latin NULLABLES (copies, R8 et C-C3).
--
-- -----------------------------------------------------------------------------
-- CE QUE CE FICHIER GARANTIT — LA BASE, PAS LE SERVICE (D186)
-- -----------------------------------------------------------------------------
-- 1. Une fiche a TOUJOURS un identifiant (le numéro OU l'e-mail : « pour un vrai devis, il faut le numéro ou l'adresse e-mail », Ko, 21/10/2026) et TOUJOURS un nom
--    (une écriture au moins, DB-3) — `pro_client_records_identifier_present`, `pro_client_records_name_present`.
-- 2. Un lien à un compte est ENTIER ou absent : le compte ET la date, ou ni l'un ni l'autre — `pro_client_records_link_coherent`. Aucun code de ce lot n'écrit ce lien
--    (la fusion, L35-6) ; la garde existe pour le jour où il s'écrira.
-- 3. Un numéro de fiche est sous la forme CANONIQUE que rend `normalizePhone` pour le seul pays du modèle (`PHONE_COUNTRIES`, DZ : « +213 », un premier chiffre 5, 6
--    ou 7, puis 8 chiffres) — `pro_client_records_phone_canonical` (S-50). Sans elle, l'unicité `(pro, numéro)` serait MUETTE (M-2) : « 0555123456 » et
--    « +213555123456 » seraient deux fiches pour une personne. ⚠ `[0-9]` et non `\d` : selon la collation, `\d` de PostgreSQL peut admettre des chiffres non latins.
--    ⚠ AJOUTER UN PAYS au modèle EXIGERA LA MIGRATION DE CE CHECK : un test d'intégration confronte son expression à `DZ_MOBILE_E164`, échantillon par échantillon.
-- 4. Un numéro, et un e-mail, désignent au plus UNE fiche par pro — `pro_client_records_pro_phone_unique`, `pro_client_records_pro_email_unique`, index uniques
--    PARTIELS (`WHERE … IS NOT NULL` : deux fiches sans e-mail coexistent). Prisma n'exprime pas un index partiel : AUCUN `@@unique` ni `@@index` nu dans
--    `schema.prisma` pour eux (doctrine de ce dépôt). Le service crée par `INSERT … ON CONFLICT DO NOTHING` puis relit (MD-1) : la base tranche, jamais « lire puis insérer ».
-- 5. La fiche appartient au PRO (`pro_profile_id`, RESTRICT : un profil qui porte des fiches ne se supprime pas en dur) ; le compte lié, RESTRICT aussi (S-56 : un compte
--    qui porte des fiches liées ne se supprime pas en dur — la suppression de compte est une DEMANDE, D37, et J-1 reste ouverte).
-- 6. Le devis garde sa COPIE du nom quand sa fiche disparaît : `quotes_client_record_id_fkey` est `ON DELETE SET NULL` — le lien tombe, la copie reste (R8).
--
-- ⚠ Les deux index simples (`pro_client_records_pro_profile_id_idx`, `quotes_client_record_id_idx`) ne garantissent rien : ils servent la vérification des clés
-- étrangères et la lecture des fiches d'un pro ; ils sont déclarés dans `schema.prisma` (`@@index`), sans quoi ce serait une dérive.
--
-- -----------------------------------------------------------------------------
-- SUR UNE BASE NON VIDE (D123)
-- -----------------------------------------------------------------------------
-- Aucune reprise de données : la table est neuve (aucune ligne), les trois colonnes de `quotes` sont NULLABLES et sans défaut — les devis existants la traversent
-- inchangés, leurs colonnes neuves NULLES (mesuré par `test/int/migration-non-empty.int-spec.ts`, bloc « L35-4 »). Aucun devis existant ne reçoit de fiche ni de nom
-- (DB-4 : les `bookings.contact_*` existants ne deviennent pas des fiches).
-- Retour arrière : supprimer la clé et l'index de `quotes`, ses trois colonnes, puis la table.
-- Ce fichier est écrit à la MAIN (`prisma migrate dev` est INTERDIT : AGENTS.md) et s'applique par `prisma migrate deploy`.
-- =============================================================================

CREATE TABLE "pro_client_records" (
  "id"             uuid           NOT NULL DEFAULT uuidv7(),
  "pro_profile_id" uuid           NOT NULL,
  "phone"          text,
  "email"          text,
  "name_ar"        text,
  "name_latin"     text,
  "linked_user_id" uuid,
  "linked_at"      timestamptz(6),
  "created_at"     timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pro_client_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pro_client_records_identifier_present" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL),
  CONSTRAINT "pro_client_records_name_present" CHECK ("name_ar" IS NOT NULL OR "name_latin" IS NOT NULL),
  CONSTRAINT "pro_client_records_link_coherent" CHECK (("linked_user_id" IS NULL) = ("linked_at" IS NULL)),
  CONSTRAINT "pro_client_records_phone_canonical" CHECK ("phone" IS NULL OR "phone" ~ '^\+213[567][0-9]{8}$'),
  CONSTRAINT "pro_client_records_pro_profile_id_fkey" FOREIGN KEY ("pro_profile_id") REFERENCES "pro_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pro_client_records_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "pro_client_records_pro_profile_id_idx" ON "pro_client_records"("pro_profile_id");

-- Les unicités PARTIELLES : un numéro (et un e-mail) par pro, au plus une fiche ; l'absence ne compte pas.
CREATE UNIQUE INDEX "pro_client_records_pro_phone_unique" ON "pro_client_records"("pro_profile_id", "phone") WHERE "phone" IS NOT NULL;
CREATE UNIQUE INDEX "pro_client_records_pro_email_unique" ON "pro_client_records"("pro_profile_id", "email") WHERE "email" IS NOT NULL;

-- Le devis : la fiche à laquelle il se rattache, et la COPIE du nom pour CE devis (R8 : modifier la fiche ne touche aucune copie déjà faite).
ALTER TABLE "quotes"
  ADD COLUMN "client_record_id"  uuid,
  ADD COLUMN "client_name_ar"    text,
  ADD COLUMN "client_name_latin" text;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_client_record_id_fkey" FOREIGN KEY ("client_record_id") REFERENCES "pro_client_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quotes_client_record_id_idx" ON "quotes"("client_record_id");
