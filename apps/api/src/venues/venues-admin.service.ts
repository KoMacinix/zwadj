// Endpoints ADMIN des salles (Lot A3) : publication + réglage des deux taux
// D35. L'admin voit TOUTES les salles vivantes (pas de filtre owner — c'est la
// différence structurelle avec le service pro), mais jamais les supprimées :
// 404 indistincts (inexistante / supprimée / id malformé), doctrine A2.
// VENUE_ADMIN_SELECT = allow-list pro + les deux taux : la SEULE surface de
// l'API où commission_rate_bps et cashback_rate_bps quittent la base.
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueErrorCode,
  VenuePublicationStatus,
  type VenueAdminDTO,
  type VenueRatesUpdateInput
} from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";
import { toVenueProDTO } from "./venues.service";
// ⚠ `VENUE_PRO_SELECT` a déménagé dans le fichier de port (S10a) : le port en
// a besoin, et le service a besoin du port. Le laisser dans le service aurait
// fermé un cycle ; le recopier aurait fait DEUX formes de la même ligne.
import { VENUE_PRO_SELECT } from "./venue-store.types";

const VENUE_ADMIN_SELECT = {
  ...VENUE_PRO_SELECT,
  commissionRateBps: true,
  cashbackRateBps: true
} as const;

type VenueAdminRow = Prisma.VenueGetPayload<{ select: typeof VENUE_ADMIN_SELECT }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class VenuesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  /** A4 : même résolution clé → URL que le service pro (mapper partagé). */
  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  /**
   * Publication ONE-WAY (arbitrage A3-④) : DRAFT → PUBLISHED directement
   * (PENDING inutilisé au MVP, verrouillé). Re-publier une salle déjà publiée
   * est IDEMPOTENT : 200 sans update — updatedAt ne bouge pas, le tri
   * « recent » de la liste publique n'est pas faussé par un double-clic admin.
   * Pas de dépublication : le pro a déjà status=HIDDEN (D33) pour se retirer.
   */
  async publish(venueId: string): Promise<VenueAdminDTO> {
    const current = await this.livingVenue(venueId);
    if (current.publicationStatus === VenuePublicationStatus.PUBLISHED) return this.toDTO(current);

    // D46 (B1) — garde de publication : sans créneau actif, la salle serait
    // publiée mais absente du calendrier et non réservable. Le refus est ici,
    // au dernier point de contrôle, plutôt qu'en amont : le pro construit son
    // brouillon dans l'ordre qu'il veut.
    const activeSlots = await this.prisma.slotTemplate.count({
      where: { venueId: current.id, isActive: true }
    });
    if (activeSlots === 0) {
      throw new ConflictException({
        code: VenueErrorCode.SLOT_TEMPLATE_REQUIRED,
        message: "venue.errors.slotRequired"
      });
    }

    const row = await this.prisma.venue.update({
      where: { id: current.id },
      data: { publicationStatus: VenuePublicationStatus.PUBLISHED },
      select: VENUE_ADMIN_SELECT
    });
    return this.toDTO(row);
  }

  /**
   * D35 : les DEUX taux au même endroit, corps partiel. La contrainte croisée
   * cashback ≤ commission est validée APRÈS fusion avec l'existant (patron
   * capacités d'A2) — message explicite, jamais l'erreur Postgres brute ; le
   * CHECK SQL reste le filet mécanique en dessous.
   */
  async setRates(venueId: string, input: VenueRatesUpdateInput): Promise<VenueAdminDTO> {
    const current = await this.livingVenue(venueId);

    const commissionRateBps = input.commissionRateBps ?? current.commissionRateBps;
    const cashbackRateBps = input.cashbackRateBps ?? current.cashbackRateBps;
    if (cashbackRateBps > commissionRateBps) {
      throw new BadRequestException({
        code: VenueErrorCode.CASHBACK_EXCEEDS_COMMISSION,
        message: "venue.errors.cashbackExceedsCommission"
      });
    }

    const row = await this.prisma.venue.update({
      where: { id: current.id },
      data: { ...input },
      select: VENUE_ADMIN_SELECT
    });
    return this.toDTO(row);
  }

  /** id + vivante (deletedAt IS NULL) — tout échec est le même 404. */
  private async livingVenue(venueId: string): Promise<VenueAdminRow> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null },
      select: VENUE_ADMIN_SELECT
    });
    if (!row) this.throwNotFound();
    return row;
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private toDTO(row: VenueAdminRow): VenueAdminDTO {
    return {
      ...toVenueProDTO(row, this.urlOf),
      commissionRateBps: row.commissionRateBps,
      cashbackRateBps: row.cashbackRateBps
    };
  }
}
