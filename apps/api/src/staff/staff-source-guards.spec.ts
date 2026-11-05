// Les GARDES DE SOURCE de la couche du personnel — rang 44, L36-3a-1 (D341, MP-11, MP-33, MP-41, MP-43, S-98). Ce qu'aucun test de comportement ne voit parce que le défaut ne produit AUCUN comportement
// différent le jour où on l'écrit : une horloge lue côté API (dérive entre l'API et la base), une durée recopiée en dur (deux leviers pour une règle), un journal qui reçoit un secret, un second site qui
// écrit l'audit, un garde déplacé dans la chaîne, une route ajoutée à la liste blanche sans que personne le décide.
//
// ⛔ CHAQUE DÉTECTEUR SE CALIBRE SUR DEUX BRAS avant de servir (D286) : un échantillon fautif connu doit être VU, un échantillon sain connu ne doit PAS l'être. Un détecteur qui répond « rien » à tout
// passerait la garde et déclarerait sain ce qui ne l'est pas — un zéro sur zéro élément parcouru (D290). Chaque garde imprime donc aussi CE QU'ELLE A PARCOURU (nombre de fichiers).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const STAFF = join(SRC, "staff");

/** Commentaires retirés (bloc et ligne) AVANT toute recherche : la documentation qui explique pourquoi un jeton est interdit ne doit pas faire rougir la garde (AGENTS.md, « une garde peut mesurer la documentation »). */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

function sourcesDuPersonnel(): Array<{ nom: string; code: string }> {
  return readdirSync(STAFF)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".spec.ts") && f !== "staff-common-passwords.ts")
    .map((nom) => ({ nom, code: sansCommentaires(readFileSync(join(STAFF, nom), "utf8")) }));
}

function lire(chemin: string): string {
  return readFileSync(join(SRC, chemin), "utf8");
}

// ── Les détecteurs ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const HORLOGE = /\bnew Date\s*\(|\bDate\.now\s*\(|\bperformance\.now\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\(/;
const DUREES_EN_DUR: RegExp[] = [
  /make_interval\(\s*(mins|hours|days|secs)\s*=>\s*\d/,
  /\binterval\s*'/i,
  /\b(10|12|15|90)\s*\*\s*(60|3600|60_?000|86_?400(?:_?000)?|24)\b/,
  /\b(600|900|43_?200|36_?000|54_?000_?000|600_?000|900_?000|7_?776_?000)\b/
];
const JOURNAL = /\b(console|logger|Logger)\b\s*[.(]|new\s+Logger\s*\(/;
const duree = (code: string) => DUREES_EN_DUR.some((r) => r.test(code));

describe("calibration des détecteurs (deux bras chacun)", () => {
  it("l'horloge : `new Date()`, `Date.now()` et leurs voisins sont VUS ; `Date` comme type et `date.toISOString()` ne le sont pas", () => {
    for (const fautif of ["const t = new Date();", "x(Date.now())", "performance.now()", "setTimeout(() => 1, 10)"]) expect(HORLOGE.test(fautif), fautif).toBe(true);
    for (const sain of ["const d: Date = row.createdAt;", "row.expiresAt.toISOString()", "enabledAt: Date | null", "// new Date() est interdit"]) expect(HORLOGE.test(sansCommentaires(sain)), sain).toBe(false);
  });

  it("les durées en dur : un littéral dans un intervalle SQL, un produit « 15 * 60_000 », une valeur dérivée (900) sont VUS ; un paramètre, une constante et un facteur de conversion ne le sont pas", () => {
    for (const fautif of ["make_interval(mins => 10)", "now() - interval '10 minutes'", "const x = 15 * 60_000;", "const s = 12 * 3600;", "const ms = 900_000;", "maxAge: 90 * 86_400_000", "const t = 43200;"]) expect(duree(fautif), fautif).toBe(true);
    for (const sain of ["make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)", "STAFF_LIMITS.PIN_VALIDITY_DAYS * 24 * 60 * 60 * 1000", "const MS_PAR_JOUR = 24 * 60 * 60 * 1000;", "limit: 10"]) expect(duree(sain), sain).toBe(false);
  });

  it("le journal : un appel à `logger.`, `console.` ou `new Logger(` est VU ; un identifiant qui contient seulement le mot ne l'est pas", () => {
    for (const fautif of ["this.logger.warn(x)", "console.log(x)", "new Logger(Cls.name)", "Logger.log('a')"]) expect(JOURNAL.test(fautif), fautif).toBe(true);
    for (const sain of ["const journalisation = 1;", "blogger = 2", "audit.journal(x)"]) expect(JOURNAL.test(sain), sain).toBe(false);
  });

  it("le retrait des commentaires ne mange pas du code : une URL dans une chaîne reste, un commentaire de fin de ligne part", () => {
    expect(sansCommentaires('const u = "https://exemple.dz"; // commentaire')).toContain("https://exemple.dz");
    expect(sansCommentaires('const u = "https://exemple.dz"; // commentaire')).not.toContain("commentaire");
    expect(sansCommentaires("/* bloc new Date() */ const a = 1;")).not.toContain("new Date");
  });
});

describe("les sources du personnel", () => {
  const sources = sourcesDuPersonnel();

  it("le détecteur a parcouru les fichiers attendus (un zéro sur zéro fichier ne prouve rien, D290) — au moins neuf sources hors specs et hors liste générée", () => {
    expect(sources.length, sources.map((s) => s.nom).join(", ")).toBeGreaterThanOrEqual(9);
    for (const attendu of ["staff.module.ts", "staff-session.controller.ts", "staff-session.service.ts", "staff-session.guard.ts", "staff-decorators.ts", "staff-cookies.ts", "staff-store.types.ts", "staff-store.prisma.ts", "staff-session-policy.ts", "staff-password-policy.ts"]) {
      expect(sources.map((s) => s.nom), attendu).toContain(attendu);
    }
  });

  it("⛔ MP-41 — AUCUNE horloge côté API dans les sources du personnel : tout ce qui se décide dans le temps se décide dans la base (`now()`)", () => {
    expect(sources.length, "zéro fichier parcouru ne prouve rien (D290)").toBeGreaterThanOrEqual(9);
    const fautifs = sources.filter((s) => HORLOGE.test(s.code)).map((s) => s.nom);
    expect(fautifs, `fichiers qui lisent l'horloge de l'API : ${fautifs.join(", ")}`).toEqual([]);
  });

  it("⛔ MP-43 — AUCUNE durée en dur dans les sources du personnel : toutes viennent de `STAFF_LIMITS` (un levier ; changer 10 minutes en 11 se fait à UN endroit)", () => {
    expect(sources.length, "zéro fichier parcouru ne prouve rien (D290)").toBeGreaterThanOrEqual(9);
    const fautifs = sources.filter((s) => duree(s.code)).map((s) => s.nom);
    expect(fautifs, `fichiers qui écrivent une durée en dur : ${fautifs.join(", ")}`).toEqual([]);
  });

  it("⛔ MP-11 — le module du personnel NE JOURNALISE RIEN (ni `console`, ni `Logger`) : un journal qui ne reçoit aucun appel ne peut recevoir aucun secret (mot de passe, jeton, PIN)", () => {
    expect(sources.length, "zéro fichier parcouru ne prouve rien (D290)").toBeGreaterThanOrEqual(9);
    const fautifs = sources.filter((s) => JOURNAL.test(s.code)).map((s) => s.nom);
    expect(fautifs, `fichiers qui journalisent : ${fautifs.join(", ")}`).toEqual([]);
  });

  it("⛔ MP-33 — l'audit n'a QU'UN site d'écriture dans le module : `auditLog.create` apparaît UNE fois, dans l'adaptateur, et aucune autre source du module ne touche `audit_logs`", () => {
    const sites = sources.flatMap((s) => (s.code.match(/\bauditLog\s*\.\s*create\s*\(/g) ?? []).map(() => s.nom));
    expect(sites).toEqual(["staff-store.prisma.ts"]);
    const tables = sources.filter((s) => /audit_logs/.test(s.code)).map((s) => s.nom);
    expect(tables).toEqual([]);
  });

  it("⛔ D187 — les trois modules PURS n'importent ni Nest, ni Prisma, ni le système de fichiers : un module sans dépendance se rejoue en millisecondes et se neutralise à chaque passage", () => {
    for (const nom of ["staff-session-policy.ts", "staff-password-policy.ts", "staff-cookies.ts"]) {
      const source = sources.find((s) => s.nom === nom)!.code;
      const imports = [...source.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => ({ type: m[1] !== undefined, de: m[2]! }));
      for (const i of imports) {
        const admis = i.type || i.de === "@zwadj/types" || i.de.startsWith("./");
        expect(admis, `${nom} importe « ${i.de} »`).toBe(true);
      }
      expect(source, nom).not.toMatch(/@nestjs\/|@prisma\/|\.\.\/prisma|node:fs|node:crypto/);
    }
  });
});

describe("le câblage", () => {
  const module = sansCommentaires(lire("app.module.ts"));

  it("⛔ S-98 — le garde du personnel est le QUATRIÈME garde global, après `ThrottlerGuard`, `JwtAuthGuard` et `RolesGuard` (l'ordre d'enregistrement EST l'ordre d'exécution, D6)", () => {
    const gardes = [...module.matchAll(/provide:\s*APP_GUARD\s*,\s*useClass:\s*(\w+)/g)].map((m) => m[1]);
    expect(gardes).toEqual(["ThrottlerGuard", "JwtAuthGuard", "RolesGuard", "StaffSessionGuard"]);
  });

  it("l'application importe le module du personnel (leçon R1 : un contrôleur écrit mais non enregistré ne répond à rien, et les portes passent quand même)", () => {
    expect(module).toMatch(/\bStaffModule\b/);
    expect(module).toMatch(/imports:\s*\[[\s\S]*\bStaffModule\b[\s\S]*\]/);
  });

  it("⛔ MP-37 — `Secure` des cookies du personnel suit le levier EXISTANT `AUTH_COOKIE_SECURE`, lu par le contrôleur : ni littéral `secure = true|false`, ni second levier (aucun test d'intégration ne démarre l'application avec ce levier allumé)", () => {
    const litteral = /\bsecure\s*[=:]\s*(true|false)\b/;
    // calibration, deux bras : un littéral est VU, la lecture du levier ne l'est pas
    expect(litteral.test("const secure = false;")).toBe(true);
    expect(litteral.test('const secure = this.config.getOrThrow<boolean>("AUTH_COOKIE_SECURE");')).toBe(false);
    const controleur = sansCommentaires(readFileSync(join(STAFF, "staff-session.controller.ts"), "utf8"));
    expect(controleur).toMatch(/getOrThrow<boolean>\(\s*"AUTH_COOKIE_SECURE"\s*\)/);
    expect(controleur).not.toMatch(litteral);
  });

  it("⛔ R-7 (D341) / SIG-1 — le journal des requêtes masque le `Set-Cookie` de RÉPONSE, en plus de l'`Authorization` et du `Cookie` entrants (la garde qui lit la sortie réelle est `test/int/log-set-cookie.int-spec.ts`)", () => {
    expect(module).toMatch(/redact:\s*\[[^\]]*req\.headers\.authorization[^\]]*req\.headers\.cookie[^\]]*res\.headers\["set-cookie"\][^\]]*\]/);
  });

  it("⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exactement quatre handlers dans tout `apps/api/src` (GET /auth/me, activer, se connecter, lire l'état ; `pin-login` sera le cinquième au lot 3b)", () => {
    const comptes: Record<string, number> = {};
    const parcourir = (dossier: string): void => {
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, e.name);
        if (e.isDirectory()) {
          if (e.name !== "generated") parcourir(chemin);
        } else if (e.name.endsWith(".ts") && !e.name.endsWith(".spec.ts")) {
          const n = (sansCommentaires(readFileSync(chemin, "utf8")).match(/@StaffExempt\s*\(\s*\)/g) ?? []).length;
          if (n > 0) comptes[chemin.slice(SRC.length + 1).replace(/\\/g, "/")] = n;
        }
      }
    };
    parcourir(SRC);
    expect(comptes).toEqual({ "auth/auth.controller.ts": 1, "staff/staff-session.controller.ts": 3 });
  });
});
