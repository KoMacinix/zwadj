-- =============================================================================
-- ZWADJ — D341 (rang 44, L36-3a-1) : LA COUCHE DU PERSONNEL — trois tables, trois énumérations, deux colonnes
-- =============================================================================
-- Schéma RATIFIÉ par Ko (consigne v3 du relecteur, adoptée le 22/10/2026, § 4, tranche [L36-3]) ET ses extensions ADOPTÉES par la consigne de L36-3a-1 (D341, section 1, par adoption — DR8) :
--   · pro_profiles : + staff_layer_enabled_at NULLABLE.
--   · pro_staff_members : id uuidv7 ; pro_profile_id FK RESTRICT ; account_name et account_name_key (normalisé) ; role enum StaffRole (MANAGER, EMPLOYEE) ; status enum StaffStatus (ACTIVE, DISABLED) et
--     disabled_at ; password_hash (Argon2id), password_changed_at, password_expires_at, must_change_password ; password_failed_count, password_locked_until ; pin_hash, pin_generated_at, pin_expires_at,
--     pin_failed_count (CHECK entre 0 et 3), pin_locked_at ; last_login_at ; created_by_member_id NULLABLE ; created_at, updated_at. UNIQUE (pro_profile_id, account_name_key).
--   · pro_staff_devices : id ; member_id FK ; token_hash UNIQUE ; label court ; created_at, expires_at (jamais au-delà de pin_expires_at), last_used_at, revoked_at.
--   · pro_staff_sessions : id ; member_id FK ; device_id FK ; token_hash UNIQUE ; created_at, last_activity_at, expires_at (plafond absolu 12 h), ended_at ; end_reason enum (IDLE, LOGOUT, DISABLED, PASSWORD_CHANGED, PIN_LOCKED).
--   · audit_logs : + actor_member_id NULLABLE, FK → pro_staff_members ON DELETE SET NULL, indexé.
-- Nullabilité du § 5.2 du cadrage de D340 (1 a) : sont NULLABLES pin_hash, pin_generated_at, pin_expires_at, pin_locked_at, disabled_at, last_login_at, password_locked_until, created_by_member_id (membres) ;
--   last_used_at, revoked_at (appareils) ; ended_at, end_reason (sessions). Tout le reste est NOT NULL (défauts : status ACTIVE, must_change_password false, les deux compteurs 0).
-- Six garanties de base du § 5.3 (1 b) : (a) status = 'DISABLED' ⇔ disabled_at non nul ; (b) pin_hash, pin_generated_at, pin_expires_at tous nuls ou tous non nuls ; (c) ended_at et end_reason tous deux nuls ou tous deux
--   non nuls ; (d) expires_at > created_at sur les sessions et les appareils ; (e) password_failed_count >= 0 ; (f) account_name_key <> ''. ⛔ AUCUN déclencheur pour « jamais zéro Manager » (§ 3.2 du cadrage) :
--   c'est un verrou de ligne et un test concurrent, pas un objet de base.
--
-- -----------------------------------------------------------------------------
-- CE QUE CE FICHIER GARANTIT — LA BASE, PAS LE SERVICE (D186)
-- -----------------------------------------------------------------------------
-- Prisma n'exprime ni les CHECK ni l'unicité composite avec son nom : tout ce qui suit est la MIGRATION, jamais `schema.prisma`.
-- 1. Un nom de compte (sa CLÉ normalisée, calculée par `normalizeStaffAccountName`) est unique PAR SALLE : `pro_staff_members_pro_profile_id_account_name_key_key`, un index unique COMPLET (pas partiel), de la forme
--    que Prisma déclare pour `@@unique([proProfileId, accountNameKey])` — donc sans dérive. La clé n'est jamais vide.
-- 2. Un jeton (de session, d'appareil) n'est stocké que par son SHA-256 et ne se partage pas : un UNIQUE sur chaque `token_hash`.
-- 3. Un membre désactivé a sa date, un membre actif n'en a pas (a) ; les trois colonnes d'un PIN naissent et meurent ensemble (b) ; une session finie a sa raison (c) ; une échéance suit toujours sa création (d) ; un
--    compteur de PIN reste entre 0 et 3 (la tranche) et un compteur de mot de passe n'est jamais négatif (e). ⚠ Le SEUIL de la pause de mot de passe (5) n'est PAS une règle de la base : c'est `STAFF_LIMITS`,
--    un paramètre — la CHECK (e) laisse donc passer une valeur au-delà de 5.
-- 4. Les membres, les appareils et les sessions ne se SUPPRIMENT pas : toutes les clés étrangères sont RESTRICT (un membre se désactive, un appareil se révoque, une session se termine). ⚠ Décision de la session de D341,
--    à ratifier : la tranche ne dit pas l'action de suppression de `created_by_member_id` ; RESTRICT, comme les autres liens entre ces tables, rend une suppression manuelle BRUYANTE au lieu de silencieusement
--    orpheline. Seul l'auteur-membre d'une ligne d'AUDIT est `ON DELETE SET NULL` : le journal survit à son auteur (la tranche).
-- 5. Le journal est indexé par auteur-membre (`audit_logs_actor_member_id_idx`) : la tranche le dit, et les lignes servent le carnet des accès (MS-3).
-- ⚠ Les index simples (`..._member_id_idx`, `..._device_id_idx`, `audit_logs_actor_member_id_idx`) ne garantissent rien : ils servent la vérification des clés étrangères et les lectures « les sessions d'un membre » ;
--   ils sont déclarés dans `schema.prisma` (`@@index`), sans quoi ce serait une dérive.
--
-- -----------------------------------------------------------------------------
-- SUR UNE BASE NON VIDE (D123)
-- -----------------------------------------------------------------------------
-- Les trois tables sont NEUVES (aucune ligne). `pro_profiles.staff_layer_enabled_at` et `audit_logs.actor_member_id` sont NULLABLES et sans défaut : les profils et les lignes d'audit existants la traversent INCHANGÉS,
-- leurs colonnes neuves NULLES — aucune salle n'est activée par la migration (« avant toute activation, rien ne change »). Mesuré par `test/int/migration-non-empty.int-spec.ts`, bloc « L36-3a-1 ».
-- Retour arrière : supprimer l'index, la clé étrangère puis la colonne d'`audit_logs`, les trois tables (sessions, appareils, membres), la colonne de `pro_profiles`, puis les trois énumérations.
-- Ce fichier est écrit à la MAIN (`prisma migrate dev` est INTERDIT : AGENTS.md) et s'applique par `prisma migrate deploy`.
-- =============================================================================

-- 1. Les énumérations.
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'EMPLOYEE');
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "StaffSessionEndReason" AS ENUM ('IDLE', 'LOGOUT', 'DISABLED', 'PASSWORD_CHANGED', 'PIN_LOCKED');

-- 2. Le drapeau de la couche, sur le profil du pro : nul = éteinte (l'app Pro marche comme avant).
ALTER TABLE "pro_profiles" ADD COLUMN "staff_layer_enabled_at" timestamptz(6);

-- 3. Les membres.
CREATE TABLE "pro_staff_members" (
  "id"                    uuid           NOT NULL DEFAULT uuidv7(),
  "pro_profile_id"        uuid           NOT NULL,
  "account_name"          text           NOT NULL,
  "account_name_key"      text           NOT NULL,
  "role"                  "StaffRole"    NOT NULL,
  "status"                "StaffStatus"  NOT NULL DEFAULT 'ACTIVE',
  "disabled_at"           timestamptz(6),
  "password_hash"         text           NOT NULL,
  "password_changed_at"   timestamptz(6) NOT NULL,
  "password_expires_at"   timestamptz(6) NOT NULL,
  "must_change_password"  boolean        NOT NULL DEFAULT false,
  "password_failed_count" integer        NOT NULL DEFAULT 0,
  "password_locked_until" timestamptz(6),
  "pin_hash"              text,
  "pin_generated_at"      timestamptz(6),
  "pin_expires_at"        timestamptz(6),
  "pin_failed_count"      integer        NOT NULL DEFAULT 0,
  "pin_locked_at"         timestamptz(6),
  "last_login_at"         timestamptz(6),
  "created_by_member_id"  uuid,
  "created_at"            timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pro_staff_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pro_staff_members_pin_failed_count_range" CHECK ("pin_failed_count" BETWEEN 0 AND 3),
  CONSTRAINT "pro_staff_members_status_disabled_coherent" CHECK (("status" = 'DISABLED') = ("disabled_at" IS NOT NULL)),
  CONSTRAINT "pro_staff_members_pin_triple_coherent" CHECK (("pin_hash" IS NULL) = ("pin_generated_at" IS NULL) AND ("pin_hash" IS NULL) = ("pin_expires_at" IS NULL)),
  CONSTRAINT "pro_staff_members_password_failed_count_nonneg" CHECK ("password_failed_count" >= 0),
  CONSTRAINT "pro_staff_members_account_name_key_present" CHECK ("account_name_key" <> ''),
  CONSTRAINT "pro_staff_members_pro_profile_id_fkey" FOREIGN KEY ("pro_profile_id") REFERENCES "pro_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pro_staff_members_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "pro_staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Un nom de compte (sa clé normalisée) par salle : un index unique COMPLET, au nom que Prisma donne à `@@unique([proProfileId, accountNameKey])`.
CREATE UNIQUE INDEX "pro_staff_members_pro_profile_id_account_name_key_key" ON "pro_staff_members"("pro_profile_id", "account_name_key");

-- 4. Les appareils.
CREATE TABLE "pro_staff_devices" (
  "id"           uuid           NOT NULL DEFAULT uuidv7(),
  "member_id"    uuid           NOT NULL,
  "token_hash"   text           NOT NULL,
  "label"        text           NOT NULL,
  "created_at"   timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"   timestamptz(6) NOT NULL,
  "last_used_at" timestamptz(6),
  "revoked_at"   timestamptz(6),
  CONSTRAINT "pro_staff_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pro_staff_devices_expires_after_created" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "pro_staff_devices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "pro_staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pro_staff_devices_token_hash_key" ON "pro_staff_devices"("token_hash");
CREATE INDEX "pro_staff_devices_member_id_idx" ON "pro_staff_devices"("member_id");

-- 5. Les sessions.
CREATE TABLE "pro_staff_sessions" (
  "id"               uuid                    NOT NULL DEFAULT uuidv7(),
  "member_id"        uuid                    NOT NULL,
  "device_id"        uuid                    NOT NULL,
  "token_hash"       text                    NOT NULL,
  "created_at"       timestamptz(6)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_activity_at" timestamptz(6)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"       timestamptz(6)          NOT NULL,
  "ended_at"         timestamptz(6),
  "end_reason"       "StaffSessionEndReason",
  CONSTRAINT "pro_staff_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pro_staff_sessions_ended_coherent" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL)),
  CONSTRAINT "pro_staff_sessions_expires_after_created" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "pro_staff_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "pro_staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pro_staff_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "pro_staff_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pro_staff_sessions_token_hash_key" ON "pro_staff_sessions"("token_hash");
CREATE INDEX "pro_staff_sessions_member_id_idx" ON "pro_staff_sessions"("member_id");
CREATE INDEX "pro_staff_sessions_device_id_idx" ON "pro_staff_sessions"("device_id");

-- 6. Le journal : l'auteur-membre de toute action du personnel. Le journal SURVIT à son auteur (SET NULL).
ALTER TABLE "audit_logs" ADD COLUMN "actor_member_id" uuid;
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_member_id_fkey" FOREIGN KEY ("actor_member_id") REFERENCES "pro_staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "audit_logs_actor_member_id_idx" ON "audit_logs"("actor_member_id");
