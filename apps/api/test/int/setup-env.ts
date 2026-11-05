// setupFiles Vitest (chaque worker, AVANT l'import des specs) : bascule la
// config sur la base de test et relâche les limites de throttling — le spec
// dédié au 429 les re-fige à leurs vraies valeurs en tête de fichier.
import "dotenv/config";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TEST_DB, withDatabase } from "./db-url";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = withDatabase(process.env.DATABASE_URL ?? "", TEST_DB);

// Lot A4 : les uploads d'intégration écrivent de VRAIS objets via le port —
// racine média jetable hors du repo (jamais var/media du poste de dev).
process.env.MEDIA_DISK_ROOT = mkdtempSync(join(tmpdir(), "zwadj-media-test-"));

// D128 — le limiteur PAR DÉFAUT (hors /auth) rejoint le même levier.
process.env.THROTTLE_DEFAULT_LIMIT = "1000000";
process.env.THROTTLE_REGISTER_LIMIT = "10000";
process.env.THROTTLE_VERIFY_LIMIT = "10000";
process.env.THROTTLE_RESEND_LIMIT = "10000";
process.env.THROTTLE_LOGIN_LIMIT = "10000";
process.env.THROTTLE_REFRESH_LIMIT = "10000";
process.env.THROTTLE_LOGOUT_LIMIT = "10000";
process.env.THROTTLE_FORGOT_LIMIT = "10000";
process.env.THROTTLE_RESET_LIMIT = "10000";
process.env.THROTTLE_GOOGLE_LIMIT = "10000"; // Lot 8
// Rang 44 (D341, MP-36) — le MÊME levier (D128) pour les clés neuves du personnel ; `THROTTLE_CHANGE_PASSWORD_LIMIT` est relâché aussi : la route `POST /pro/staff/password` l'emploie
// (le spec du personnel change des mots de passe plus de dix fois par fichier, et le 429 de cette clé n'est pas ce qu'il mesure).
process.env.THROTTLE_STAFF_ACTIVATE_LIMIT = "10000";
process.env.THROTTLE_STAFF_LOGIN_LIMIT = "10000";
process.env.THROTTLE_CHANGE_PASSWORD_LIMIT = "10000";
