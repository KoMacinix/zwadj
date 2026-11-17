// ADM-1 (D349, rang 51, R-6, D-3) — le PREMIER admin. Arbitrage de Ko (D321), mot pour mot : « c1. Un script versionné qui promeut un compte existant, vérifié et actif, et refuse sinon. Aucun
// mot de passe manipulé. » Ce module est PUR (aucune dépendance, aucun Prisma) : la décision (`judgePromotion`) et l'écriture sur une base ABSTRAITE (`promoteFirstAdmin`). Le script
// (`prisma/promote-first-admin.ts`) n'est qu'une enveloppe qui lui donne une connexion et imprime le résultat.
//
// ⛔ AUCUN mot de passe n'est manipulé : la lecture ne SÉLECTIONNE pas `password_hash`, l'écriture n'écrit que `role`. La personne s'est inscrite elle-même et a vérifié son adresse : son mot de passe
// est celui qu'elle a choisi (D1 : un ADMIN ne se connecte qu'avec une adresse vérifiée).
// ⚠ Deux refus que D-3 ne dit pas, et le lot les a posés (voir `docs/preuves/D349/lecture-adverse/lecture-adverse.md`, B10) : un compte PRO est refusé (il perdrait l'accès à ses salles : MD-ADM-3,
// « le mauvais compte ») ; un compte DÉJÀ admin est un « rien à faire », pas une erreur.
// ⚠ Le rôle est une claim du jeton d'accès (D4) : la promotion prend effet à la CONNEXION suivante ; un jeton déjà émis garde son ancien rôle jusqu'à son expiration (`JWT_ACCESS_TTL`).
import { UserRole, UserStatus } from "@zwadj/types";
import { promoteAdminEntry, type AdminAuditEntry } from "../common/admin-audit";

export type PromotionRefusal = "NOT_FOUND" | "NOT_ACTIVE" | "EMAIL_NOT_VERIFIED" | "IS_PRO";

export type PromotionVerdict = { ok: true; action: "PROMOTE" | "ALREADY_ADMIN" } | { ok: false; reason: PromotionRefusal };

/** Ce que le script lit d'un compte : AUCUN hachage, aucun nom, aucune adresse. */
export interface PromotableUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
}

/** L'ordre des refus est celui de la phrase de D-3 : existe, actif, vérifié ; puis ce que le rôle dit. */
export function judgePromotion(user: PromotableUser | null): PromotionVerdict {
  if (user === null) return { ok: false, reason: "NOT_FOUND" };
  if (user.status !== UserStatus.ACTIVE) return { ok: false, reason: "NOT_ACTIVE" };
  if (user.emailVerifiedAt === null) return { ok: false, reason: "EMAIL_NOT_VERIFIED" };
  if (user.role === UserRole.ADMIN) return { ok: true, action: "ALREADY_ADMIN" };
  if (user.role === UserRole.PRO) return { ok: false, reason: "IS_PRO" };
  return { ok: true, action: "PROMOTE" };
}

/** L'inscription stocke l'adresse en minuscules : la saisie au terminal est rognée et abaissée de la même façon. */
export function normalizeAdminEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** La transaction, vue par ce module : les trois opérations dont il a besoin et pas une de plus. */
export interface PromotionTx {
  user: {
    findUnique(args: { where: { email: string }; select: { id: true; role: true; status: true; emailVerifiedAt: true } }): Promise<PromotableUser | null>;
    updateMany(args: {
      where: { id: string; role: typeof UserRole.CLIENT; status: typeof UserStatus.ACTIVE; emailVerifiedAt: { not: null } };
      data: { role: typeof UserRole.ADMIN };
    }): Promise<{ count: number }>;
  };
  auditLog: { create(args: { data: AdminAuditEntry }): Promise<unknown> };
}

export interface PromotionDb extends PromotionTx {
  $transaction<T>(fn: (tx: PromotionTx) => Promise<T>): Promise<T>;
}

export type PromotionResult =
  | { outcome: "PROMOTED" | "ALREADY_ADMIN" | "WOULD_PROMOTE"; userId: string }
  | { outcome: "REFUSED"; reason: PromotionRefusal | "CHANGED" };

/**
 * Promeut le compte désigné par son adresse, dans UNE transaction : lecture, écriture CONDITIONNÉE (CLIENT, ACTIF, adresse vérifiée — compte = 1 exigé), ligne de journal. À 0, le compte a changé
 * entre la lecture et l'écriture (deux promotions simultanées, une suspension) : refus `CHANGED`, AUCUNE ligne. `dryRun` rend ce qui SERAIT fait et n'écrit RIEN.
 */
export async function promoteFirstAdmin(db: PromotionDb, rawEmail: string, options: { dryRun?: boolean } = {}): Promise<PromotionResult> {
  const email = normalizeAdminEmail(rawEmail);
  return db.$transaction(async (tx): Promise<PromotionResult> => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, role: true, status: true, emailVerifiedAt: true } });
    const verdict = judgePromotion(user);
    if (!verdict.ok) return { outcome: "REFUSED", reason: verdict.reason };
    // `user` n'est pas `null` : le verdict l'a refusé sinon.
    const compte = user as PromotableUser;
    if (verdict.action === "ALREADY_ADMIN") return { outcome: "ALREADY_ADMIN", userId: compte.id };
    if (options.dryRun === true) return { outcome: "WOULD_PROMOTE", userId: compte.id };

    const { count } = await tx.user.updateMany({
      where: { id: compte.id, role: UserRole.CLIENT, status: UserStatus.ACTIVE, emailVerifiedAt: { not: null } },
      data: { role: UserRole.ADMIN }
    });
    if (count !== 1) return { outcome: "REFUSED", reason: "CHANGED" };
    await tx.auditLog.create({ data: promoteAdminEntry(compte.id, compte.role) });
    return { outcome: "PROMOTED", userId: compte.id };
  });
}
