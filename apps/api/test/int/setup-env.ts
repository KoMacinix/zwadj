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
// Rang 58 (D356, R-2) — le secret du HMAC du PIN : une valeur JETABLE de TEST, posée par la configuration des tests elle-même (jamais lue d'un `.env`, jamais la valeur d'un poste) : l'API refuse de démarrer sans elle.
// ⛔ Elle est posée SANS CONDITION, après `dotenv/config` : un secret posé dans le `.env` de Ko ne change rien aux tests, et un test ne dépend pas de la présence du NOM dans ce fichier.
process.env.STAFF_PIN_HMAC_SECRET = "secret-jetable-des-tests-dintegration-sans-valeur-0123456789";
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
// Rang 58 (D356, MP-36) — le MÊME levier (D128) pour la connexion par PIN : les courses du PIN envoient vingt requêtes en parallèle, le 429 de cette clé n'est pas ce qu'elles mesurent.
process.env.THROTTLE_STAFF_PIN_LIMIT = "10000";
process.env.THROTTLE_CHANGE_PASSWORD_LIMIT = "10000";
// Rang 44 (D341) — LEVIER OUBLIÉ AUX ROUGES, trouvé à la première passe verte : `POST /me/change-email` (limite réelle : 3 / 15 min / IP, `AUTH_THROTTLE.changeEmail`) était la seule clé de la famille à ne pas être
// relâchée. Le spec du garde du personnel rejoue TOUTES les routes d'un Pro plusieurs fois dans une même application : la quatrième requête rendait 429 (le ThrottlerGuard précède tout), et le cas « la session d'une
// autre salle est refusée » lisait ce 429 comme « route franchie ». Le MÊME levier que les autres (D128) — aucun second mécanisme.
process.env.THROTTLE_CHANGE_EMAIL_LIMIT = "10000";
