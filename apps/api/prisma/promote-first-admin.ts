// Le PREMIER admin (ADM-1, D349, rang 51 ; D-3 de Ko, D321) : promeut un compte EXISTANT, vérifié et actif, et refuse sinon. AUCUN mot de passe n'est manipulé : la personne s'est inscrite elle-même
// (compte client) et a vérifié son adresse ; ce script ne change que son RÔLE, et écrit une ligne d'`audit_logs` dans la même transaction.
//
// La décision et l'écriture vivent dans `src/admin/first-admin.ts` (module pur, testé sans base et sur la base d'intégration) : ce fichier n'est que l'enveloppe — arguments, connexion, impression.
// ⛔ Il n'est JAMAIS joué par un lot de code sur la base de développement de Ko : la procédure, pas à pas, est dans `docs/preuves/D349/premier-admin-ko.md`.
//
//   pnpm --filter @zwadj/api run admin:promote -- --dry-run adresse@exemple.dz     (dit ce qui SERAIT fait, n'écrit RIEN)
//   pnpm --filter @zwadj/api run admin:promote -- adresse@exemple.dz               (promeut)
//
// Codes de sortie : 0 = promu, déjà admin, ou (--dry-run) promouvable ; 1 = refusé (rien n'a été écrit) ; 2 = mauvais appel ou base injoignable.
import "dotenv/config"; // no-op si l'environnement est déjà posé (dotenv n'écrase jamais)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { promoteFirstAdmin, type PromotionDb, type PromotionResult } from "../src/admin/first-admin";

const USAGE = "usage : admin:promote [--dry-run] <adresse e-mail du compte à promouvoir>";

const REFUS: Record<string, string> = {
  NOT_FOUND: "aucun compte n'a cette adresse",
  NOT_ACTIVE: "le compte n'est pas actif (suspendu ou anonymisé)",
  EMAIL_NOT_VERIFIED: "l'adresse e-mail du compte n'est pas vérifiée : la personne doit d'abord ouvrir le lien reçu par e-mail",
  IS_PRO: "c'est un compte PRO : il perdrait l'accès à ses salles. Inscrivez un compte client dédié, vérifiez son adresse, puis promouvez celui-là",
  CHANGED: "le compte a changé pendant l'opération : rien n'a été écrit, relancez"
};

/** Où le script va écrire — hôte, port et nom de la base, JAMAIS l'identifiant ni le mot de passe de connexion. */
function cible(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port === "" ? "" : `:${u.port}`}${u.pathname}`;
  } catch {
    return "(adresse de base illisible)";
  }
}

function dire(r: PromotionResult, dryRun: boolean): number {
  switch (r.outcome) {
    case "PROMOTED":
      console.log(`✓ Compte promu ADMIN (identifiant ${r.userId}). Une ligne a été écrite dans le journal. Le rôle prend effet à la PROCHAINE connexion de la personne.`);
      return 0;
    case "ALREADY_ADMIN":
      console.log(`✓ Ce compte est déjà ADMIN (identifiant ${r.userId}). Rien n'a été écrit.`);
      return 0;
    case "WOULD_PROMOTE":
      console.log(`✓ (--dry-run) Ce compte SERAIT promu ADMIN (identifiant ${r.userId}). Rien n'a été écrit.`);
      return 0;
    case "REFUSED":
      console.error(`✗ Refusé${dryRun ? " (--dry-run)" : ""} : ${REFUS[r.reason] ?? r.reason}. Rien n'a été écrit.`);
      return 1;
  }
}

async function main(): Promise<number> {
  // `pnpm run admin:promote -- <args>` peut transmettre le `--` lui-même : un `--` seul n'est ni une option ni l'adresse.
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const options = args.filter((a) => a.startsWith("--"));
  const positionnels = args.filter((a) => !a.startsWith("--"));
  if (options.some((o) => o !== "--dry-run") || positionnels.length !== 1) {
    console.error(USAGE);
    return 2;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquante (apps/api/.env) — rien n'a été tenté.");
    return 2;
  }
  const dryRun = options.includes("--dry-run");
  console.log(`Base visée : ${cible(url)}${dryRun ? "  (--dry-run : aucune écriture)" : ""}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    // ⚠ Le client Prisma n'est pas assignable à l'interface minimale du module (ses délégués sont des génériques surchargés) : le cast est à la FRONTIÈRE, ici, une seule fois.
    return dire(await promoteFirstAdmin(prisma as unknown as PromotionDb, positionnels[0] as string, { dryRun }), dryRun);
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error("✗ Échec (rien n'a été écrit si la transaction n'a pas abouti) :", e instanceof Error ? e.message : e);
    process.exit(2);
  }
);
