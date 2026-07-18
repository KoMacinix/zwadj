// setupFiles Vitest (chaque worker, AVANT l'import des specs) : bascule la
// config sur la base de test et relâche les limites de throttling — le spec
// dédié au 429 les re-fige à leurs vraies valeurs en tête de fichier.
import "dotenv/config";
import { TEST_DB, withDatabase } from "./db-url";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = withDatabase(process.env.DATABASE_URL ?? "", TEST_DB);

process.env.THROTTLE_REGISTER_LIMIT = "10000";
process.env.THROTTLE_VERIFY_LIMIT = "10000";
process.env.THROTTLE_RESEND_LIMIT = "10000";
process.env.THROTTLE_LOGIN_LIMIT = "10000";
process.env.THROTTLE_REFRESH_LIMIT = "10000";
process.env.THROTTLE_LOGOUT_LIMIT = "10000";
process.env.THROTTLE_FORGOT_LIMIT = "10000";
process.env.THROTTLE_RESET_LIMIT = "10000";
