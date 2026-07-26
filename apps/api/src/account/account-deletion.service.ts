import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import {
  AccountErrorCode,
  type AdminDeletionRequestDTO,
  type DeletionRequestDTO,
  type DeletionRequestQueryInput
} from "@zwadj/types";
import { TokenService } from "../auth/token.service";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AccountEmailsService } from "./account-emails.service";
import { AccountService } from "./account.service";

/** Colonnes du DTO utilisateur d'une demande. */
const REQUEST_SELECT = {
  id: true,
  status: true,
  reason: true,
  requestedAt: true,
  decidedAt: true,
  decisionNote: true
} as const;

type RequestRow = Prisma.AccountDeletionRequestGetPayload<{ select: typeof REQUEST_SELECT }>;

/**
 * Lot A10 — D37 (la suppression est une DEMANDE) + D41 (les salles partent en
 * ARCHIVE, récupérables sur demande).
 *
 * CHEMIN SENSIBLE — les trois règles qui ne se négocient pas :
 *  1. **jamais de `DELETE` SQL** : ni `User`, ni `ProProfile`, ni `Venue`.
 *     Commissions dues et historique de réservations doivent survivre.
 *     L'exécution est une ANONYMISATION.
 *  2. **l'archivage réutilise `deletedAt`**, l'axe de soft delete existant. On
 *     n'introduit PAS un quatrième axe de visibilité : toutes les lectures
 *     publiques filtrent déjà `deletedAt IS NULL`, donc l'archivage est
 *     correct partout instantanément, avec zéro nouveau prédicat — donc zéro
 *     risque d'oubli et de fuite.
 *  3. **seules les salles VIVANTES sont archivées.** Une salle que le pro
 *     avait lui-même supprimée des mois plus tôt ne doit pas entrer dans la
 *     trace, sinon une restauration ultérieure ressusciterait les mauvaises.
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly account: AccountService,
    private readonly tokens: TokenService,
    private readonly emails: AccountEmailsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext("AccountDeletion");
  }

  // ── GET /me/deletion-request ──────────────────────────────────────────────
  /**
   * Demande LA PLUS RÉCENTE, ou `null`. A11 en a besoin pour rendre ses trois
   * états (aucune / en cours / refusée) : sans lui, l'écran re-proposerait la
   * suppression à quelqu'un qui a déjà une demande en attente, et la
   * soumission irait taper dans l'index unique partiel.
   */
  async current(userId: string): Promise<DeletionRequestDTO | null> {
    await this.account.requireActiveActor(userId);
    const row = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }], // tiebreak déterministe (discipline A3)
      select: REQUEST_SELECT
    });
    return row === null ? null : toDTO(row);
  }

  // ── POST /me/deletion-request ─────────────────────────────────────────────
  /** Dépose une demande. Ne supprime RIEN : le compte reste pleinement
   *  fonctionnel tant que l'admin n'a pas tranché. */
  async request(userId: string, reason: string | undefined): Promise<DeletionRequestDTO> {
    await this.account.requireActiveActor(userId);
    try {
      const row = await this.prisma.accountDeletionRequest.create({
        data: { userId, reason: reason ?? null },
        select: REQUEST_SELECT
      });
      return toDTO(row);
    } catch (e) {
      // L'index unique PARTIEL `account_deletion_requests_one_pending` est la
      // source de vérité : un double-clic ne peut pas créer deux demandes.
      // On le traduit en 409 explicite, jamais en erreur Postgres brute.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException({
          code: AccountErrorCode.DELETION_REQUEST_ALREADY_PENDING,
          message: "account.errors.deletionAlreadyPending"
        });
      }
      throw e;
    }
  }

  // ── POST /me/deletion-request/cancel ──────────────────────────────────────
  /** C'est CETTE réversibilité qui rend D37 tenable : tant que l'admin n'a pas
   *  tranché, l'utilisateur retire sa demande lui-même. */
  async cancel(userId: string): Promise<DeletionRequestDTO> {
    await this.account.requireActiveActor(userId);
    // updateMany conditionné au statut = check-and-set : une décision admin
    // concurrente ne peut pas être écrasée par l'annulation.
    const { count } = await this.prisma.accountDeletionRequest.updateMany({
      where: { userId, status: "PENDING" },
      data: { status: "CANCELLED", decidedAt: new Date() }
    });
    if (count === 0) {
      throw new NotFoundException({
        code: AccountErrorCode.DELETION_REQUEST_NOT_FOUND,
        message: "account.errors.deletionNotFound"
      });
    }
    const row = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: "CANCELLED" },
      orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
      select: REQUEST_SELECT
    });
    // La ligne vient d'être écrite dans la même connexion : `row` ne peut pas
    // être nul, mais on ne fait jamais confiance à un `!` sur un chemin sensible.
    if (!row) {
      throw new NotFoundException({
        code: AccountErrorCode.DELETION_REQUEST_NOT_FOUND,
        message: "account.errors.deletionNotFound"
      });
    }
    return toDTO(row);
  }

  // ── GET /admin/deletion-requests ──────────────────────────────────────────
  async list(query: DeletionRequestQueryInput): Promise<AdminDeletionRequestDTO[]> {
    const status = query.status ?? "PENDING";
    const rows = await this.prisma.accountDeletionRequest.findMany({
      where: { status },
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }], // file d'attente : le plus ancien d'abord
      select: {
        ...REQUEST_SELECT,
        userId: true,
        user: {
          select: {
            email: true,
            role: true,
            // Compte les salles qui SERAIENT archivées : exactement le même
            // prédicat que l'exécution, pour que l'admin décide sur le chiffre
            // réel et pas sur une estimation.
            proProfile: { select: { _count: { select: { venues: { where: { deletedAt: null } } } } } }
          }
        }
      }
    });
    return rows.map((r) => ({
      ...toDTO(r),
      userId: r.userId,
      userEmail: r.user.email,
      userRole: r.user.role,
      venueCount: r.user.proProfile?._count.venues ?? 0
    }));
  }

  // ── POST /admin/deletion-requests/:id/reject ──────────────────────────────
  /** Aucun effet sur le compte, qui reste `ACTIVE`. L'utilisateur est notifié
   *  du motif — sinon il resterait dans l'incertitude alors que son compte
   *  fonctionne toujours. */
  async reject(requestId: string, adminId: string, decisionNote: string | undefined): Promise<DeletionRequestDTO> {
    const pending = await this.loadPending(requestId);
    const row = await this.prisma.accountDeletionRequest.update({
      where: { id: pending.id },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedById: adminId,
        decisionNote: decisionNote ?? null
      },
      select: REQUEST_SELECT
    });

    await this.notify(() =>
      this.emails.sendDeletionRejected(
        { email: pending.user.email, role: pending.user.role, locale: pending.user.locale },
        decisionNote ?? null
      )
    );
    return toDTO(row);
  }

  // ── POST /admin/deletion-requests/:id/approve ─────────────────────────────
  /**
   * EXÉCUTION — une seule transaction, cinq effets. Aucun `DELETE` SQL.
   *
   * L'adresse e-mail est capturée AVANT : après commit elle n'existe plus, et
   * l'e-mail de décision n'aurait plus de destinataire.
   */
  async approve(requestId: string, adminId: string, decisionNote: string | undefined): Promise<DeletionRequestDTO> {
    const pending = await this.loadPending(requestId);
    const now = new Date();
    const recipient = { email: pending.user.email, role: pending.user.role, locale: pending.user.locale };

    const { row, archivedCount } = await this.prisma.$transaction(async (tx) => {
      // 1. Salles du pro → archivées. VIVANTES uniquement (règle 3 ci-dessus).
      let archived: { id: string }[] = [];
      const proProfileId = pending.user.proProfile?.id;
      if (proProfileId) {
        archived = await tx.venue.findMany({
          where: { ownerId: proProfileId, deletedAt: null },
          select: { id: true }
        });
        if (archived.length > 0) {
          await tx.venue.updateMany({
            where: { id: { in: archived.map((v) => v.id) } },
            data: { deletedAt: now }
          });
          await tx.accountDeletionArchivedVenue.createMany({
            data: archived.map((v) => ({ requestId: pending.id, venueId: v.id, archivedAt: now }))
          });
        }
      }

      // 2. Anonymisation du compte. L'e-mail devient non routable ET unique
      //    (TLD `.invalid`, réservé RFC 2606 — il ne peut pas être délégué,
      //    donc aucun courrier ne partira jamais vers cette adresse).
      //    `googleSub` → null EST INDISPENSABLE : le laisser en place ferait
      //    ressusciter le compte au premier clic « Continuer avec Google ».
      //    `String? @unique` autorise plusieurs NULL, c'est légal.
      await tx.user.update({
        where: { id: pending.userId },
        data: {
          status: "ANONYMIZED",
          email: `deleted-${randomUUID()}@zwadj.invalid`,
          firstName: null,
          lastName: null,
          phone: null,
          passwordHash: null,
          googleSub: null
        }
      });

      // 3. Toutes les sessions tombent, ET les liens encore vivants sont
      //    invalidés — un lien de reset ou de vérification émis avant la
      //    décision resterait sinon cliquable après l'anonymisation.
      await tx.refreshToken.updateMany({
        where: { userId: pending.userId, revokedAt: null },
        data: { revokedAt: now }
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: pending.userId, usedAt: null },
        data: { usedAt: now }
      });
      await tx.emailVerificationToken.updateMany({
        where: { userId: pending.userId, usedAt: null },
        data: { usedAt: now }
      });
      await tx.emailChangeToken.updateMany({
        where: { userId: pending.userId, usedAt: null },
        data: { usedAt: now }
      });

      // 4. ProProfile : coordonnées effacées, `businessName` CONSERVÉ — ce
      //    n'est pas une donnée personnelle, et c'est ce qui permettra
      //    d'identifier les salles archivées le jour où la personne revient.
      //    `phone` est NOT NULL en base : on pose la chaîne vide (le champ ne
      //    porte plus de donnée) plutôt que d'affaiblir la colonne par une
      //    migration dont l'inscription dépend.
      if (proProfileId) {
        await tx.proProfile.update({
          where: { id: proProfileId },
          data: { phone: "", phone2: null }
        });
      }

      // 5. Clôture de la demande. `emailHash` = SHA-256 de l'adresse
      //    RÉELLEMENT détruite : aucune PII en clair, mais une réclamation
      //    ultérieure depuis la même adresse reste vérifiable — sans lui, la
      //    promesse « vous pourrez récupérer vos salles » n'est pas outillée.
      const updated = await tx.accountDeletionRequest.update({
        where: { id: pending.id },
        data: {
          status: "APPROVED",
          decidedAt: now,
          decidedById: adminId,
          decisionNote: decisionNote ?? null,
          emailHash: this.tokens.hash(recipient.email)
        },
        select: REQUEST_SELECT
      });

      return { row: updated, archivedCount: archived.length };
    });

    this.logger.warn(
      { userId: pending.userId, requestId: pending.id, archivedVenues: archivedCount, decidedBy: adminId },
      "Demande de suppression approuvée : compte anonymisé, salles archivées"
    );

    // HORS transaction, après commit : l'adresse capturée reçoit la décision
    // et la promesse d'archivage. Sans cet e-mail, le compte cesserait
    // simplement de fonctionner, sans explication.
    await this.notify(() => this.emails.sendDeletionApproved(recipient, archivedCount));
    return toDTO(row);
  }

  /** Charge une demande PENDING + le contexte nécessaire à la décision. */
  private async loadPending(requestId: string) {
    const row = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        status: true,
        user: { select: { email: true, role: true, locale: true, proProfile: { select: { id: true } } } }
      }
    });
    if (!row) {
      throw new NotFoundException({
        code: AccountErrorCode.DELETION_REQUEST_NOT_FOUND,
        message: "account.errors.deletionNotFound"
      });
    }
    // Transition explicite : une demande déjà décidée (ou annulée par
    // l'utilisateur entre-temps) ne se re-décide pas. Code DISTINCT du 404 —
    // ici l'admin est légitime et doit savoir que la file a bougé.
    if (row.status !== "PENDING") {
      throw new BadRequestException({
        code: AccountErrorCode.DELETION_REQUEST_NOT_PENDING,
        message: "account.errors.deletionNotPending"
      });
    }
    return row;
  }

  /** Envoi best-effort : un échec est loggé, jamais bloquant (doctrine
   *  inscription). La décision est déjà commitée — la rejouer parce que le
   *  SMTP a hoqueté serait pire. */
  private async notify(send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (e) {
      this.logger.error({ err: e }, "Échec d'envoi de l'e-mail de décision de suppression");
    }
  }
}

function toDTO(row: RequestRow): DeletionRequestDTO {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: row.decidedAt === null ? null : row.decidedAt.toISOString(),
    decisionNote: row.decisionNote
  };
}
