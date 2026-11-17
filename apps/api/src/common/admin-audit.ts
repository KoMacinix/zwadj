// ADM-1 (D349, rang 51, R-5, D-8) — la LIGNE de journal des actions admin. Module PUR : aucune dépendance, aucun Nest, aucun Prisma. Il construit la charge utile d'`audit_logs.create` ;
// l'ÉCRITURE est le travail des services, dans la transaction de l'action (une action sans trace, ou une trace sans action, est MD-ADM-6).
//
// ⛔ AUCUNE DONNÉE PERSONNELLE dans une ligne : pas de nom, de numéro de téléphone, d'e-mail, de note de décision, d'identifiant de compte supprimé (même règle que `quote.promote`, S-81 du rang 43).
// `before` et `after` ne portent que des valeurs simples (chaîne, nombre, booléen, `null`). Le motif d'un rejet est écrit par l'admin pour le PRO : il est dans la ligne (publier l'efface de la colonne,
// « le journal garde l'histoire », R-2).
// ⚠ Le réglage des taux n'a PAS de constructeur ici : il n'est pas journalisé (R-1, MD-ADM-17).
import { AdminAuditAction, AdminAuditEntity, UserRole, VenuePublicationStatus } from "@zwadj/types";

type Valeur = string | number | boolean | null;

/** Qui agit : le compte ADMIN (celui du jeton). */
export interface AdminAuditActor {
  readonly userId: string;
  readonly role: UserRole;
}

/** Exactement les sept clés d'`audit_logs` que ce module écrit (`actorMemberId` reste `null` : un admin n'est pas un membre du personnel d'un pro). */
export interface AdminAuditEntry {
  actorId: string | null;
  actorRole: string;
  action: AdminAuditAction;
  entityType: AdminAuditEntity;
  entityId: string;
  before: Record<string, Valeur>;
  after: Record<string, Valeur>;
}

export function venuePublishEntry(actor: AdminAuditActor, venueId: string, from: VenuePublicationStatus): AdminAuditEntry {
  return {
    actorId: actor.userId,
    actorRole: actor.role,
    action: AdminAuditAction.VENUE_PUBLISH,
    entityType: AdminAuditEntity.VENUE,
    entityId: venueId,
    before: { publicationStatus: from },
    after: { publicationStatus: VenuePublicationStatus.PUBLISHED }
  };
}

/** `before` est toujours « jamais rejetée » : un second rejet à motif différent est refusé (R-2), le motif stocké n'est jamais remplacé. */
export function venueRejectEntry(actor: AdminAuditActor, venueId: string, reason: string): AdminAuditEntry {
  return {
    actorId: actor.userId,
    actorRole: actor.role,
    action: AdminAuditAction.VENUE_REJECT,
    entityType: AdminAuditEntity.VENUE,
    entityId: venueId,
    before: { rejectionReason: null },
    after: { rejectionReason: reason }
  };
}

/** Approuver ou rejeter une demande de suppression. `archivedVenues` n'existe que pour une approbation ; ni la note de décision, ni l'adresse, ni l'identifiant du compte n'entrent. */
export function deletionDecisionEntry(
  actor: AdminAuditActor,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  archivedVenues?: number
): AdminAuditEntry {
  const after: Record<string, Valeur> = { status: decision };
  if (decision === "APPROVED" && archivedVenues !== undefined) after.archivedVenues = archivedVenues;
  return {
    actorId: actor.userId,
    actorRole: actor.role,
    action: decision === "APPROVED" ? AdminAuditAction.DELETION_APPROVE : AdminAuditAction.DELETION_REJECT,
    entityType: AdminAuditEntity.DELETION_REQUEST,
    entityId: requestId,
    before: { status: "PENDING" },
    after
  };
}

/** La promotion du premier admin (D-3) : aucun admin n'existe encore pour agir, l'acteur est `SCRIPT` et `actorId` reste `null`. */
export function promoteAdminEntry(userId: string, from: UserRole): AdminAuditEntry {
  return {
    actorId: null,
    actorRole: "SCRIPT",
    action: AdminAuditAction.USER_PROMOTE_ADMIN,
    entityType: AdminAuditEntity.USER,
    entityId: userId,
    before: { role: from },
    after: { role: UserRole.ADMIN }
  };
}
