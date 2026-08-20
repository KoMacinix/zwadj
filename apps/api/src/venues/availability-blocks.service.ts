// Blocages de disponibilité côté PRO — Lot B3, D51.
//
// ── Pourquoi une vérification APPLICATIVE, alors que tout le reste du projet
//    garantit par la base ─────────────────────────────────────────────────────
// Une contrainte `EXCLUDE` ne traverse pas deux tables. Le conflit
// réservation ↔ réservation reste garanti par la BDD
// (`bookings_no_overlap_accepted_confirmed`, migration 20260707000001) ; le
// conflit bloc ↔ réservation, lui, ne PEUT pas l'être. On le vérifie donc dans
// la transaction, sous verrou `SELECT … FOR UPDATE` de la ligne `venues` — le
// même verrou que prendra l'acceptation d'une réservation (Flux B ultérieur).
// Les deux écritures d'une même salle se sérialisent ainsi l'une l'autre, et la
// fenêtre entre le test et l'insertion se referme.
//
// C'est une exception assumée à la doctrine « garantir en base », pas un
// relâchement : elle est ici parce qu'aucune contrainte ne peut la porter.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  HARD_BOOKING_STATUSES,
  VenueErrorCode,
  type AvailabilityBlockCreateInput,
  type AvailabilityBlockDTO,
  type AvailabilityWindowQueryInput
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import {
  civilDateTimeToMs,
  civilDayStartMs,
  msToCivilDateTime,
  parseCivilDate,
  SLOT_END_MAX_MINUTES,
  type CivilDate
} from "./availability-time";

const BLOCK_SELECT = {
  id: true,
  blockedFrom: true,
  blockedUntil: true,
  reason: true,
  createdAt: true
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ⚠ `SLOT_END_MAX_MINUTES` et `HARD_BOOKING_STATUSES` étaient RECOPIÉS ici.
// Les deux sont désormais partagés (`availability-time.ts` et `@zwadj/types`) :
// ce fichier, la disponibilité publique et la liste publique bornaient la même
// fenêtre et testaient les mêmes statuts en trois exemplaires. Seules ces deux
// -là s'opposent à un blocage — une demande PENDING ne verrouille rien : poser
// un bloc par-dessus est précisément la façon dont le pro dit non (D101).
const MINUTE_MS = 60_000;

interface BlockRow {
  id: string;
  blockedFrom: Date;
  blockedUntil: Date;
  reason: string | null;
  createdAt: Date;
}

/** D51 — SYMÉTRIE : le pro relit exactement le repère civil local qu'il a
 *  écrit. Renvoyer de l'UTC forcerait le front pro à reconvertir, donc à
 *  héberger une seconde décision de fuseau. */
export function toAvailabilityBlockDTO(row: BlockRow): AvailabilityBlockDTO {
  return {
    id: row.id,
    startsAt: msToCivilDateTime(row.blockedFrom.getTime()),
    endsAt: msToCivilDateTime(row.blockedUntil.getTime()),
    reason: row.reason,
    createdAt: row.createdAt.toISOString()
  };
}

type BlockTx = Pick<PrismaService, "venue" | "booking" | "availabilityBlock">;

@Injectable()
export class AvailabilityBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, venueId: string, query: AvailabilityWindowQueryInput): Promise<AvailabilityBlockDTO[]> {
    await this.ownedVenue(this.prisma, userId, venueId);
    const from = parseCivilDate(query.from) as CivilDate;
    const to = parseCivilDate(query.to) as CivilDate;
    const windowStartMs = civilDayStartMs(from);
    const windowEndMs = civilDayStartMs(to) + SLOT_END_MAX_MINUTES * MINUTE_MS;

    // RECOUVREMENT, pas inclusion : un blocage de six mois qui enjambe la
    // fenêtre sans y commencer doit apparaître — c'est justement celui que le
    // pro cherche quand son calendrier est vide sans qu'il comprenne pourquoi.
    const rows = await this.prisma.availabilityBlock.findMany({
      where: {
        venueId,
        blockedFrom: { lt: new Date(windowEndMs) },
        blockedUntil: { gt: new Date(windowStartMs) }
      },
      orderBy: [{ blockedFrom: "asc" }, { id: "asc" }],
      select: BLOCK_SELECT
    });
    return rows.map(toAvailabilityBlockDTO);
  }

  async create(userId: string, venueId: string, input: AvailabilityBlockCreateInput): Promise<AvailabilityBlockDTO> {
    // Zod a garanti la forme, dont `endsAt > startsAt`.
    const blockedFrom = new Date(civilDateTimeToMs(input.startsAt));
    const blockedUntil = new Date(civilDateTimeToMs(input.endsAt));

    return this.prisma.$transaction(async (tx) => {
      await this.ownedVenue(tx, userId, venueId);

      // PREMIER SQL BRUT APPLICATIF DU DÉPÔT. Template balisé : le paramètre
      // est LIÉ, jamais concaténé (AGENTS.md — « ORM paramétré, pas de SQL
      // concaténé »). Prisma n'exprime pas `FOR UPDATE`, et c'est ce verrou
      // qui sérialise les écritures concurrentes d'une même salle.
      //
      // VÉRIFIÉ EN BASE : aucun cast `::uuid` n'est nécessaire — avec Prisma 7
      // et l'adapter `pg`, le driver infère le type du paramètre depuis la
      // colonne. Le cast fonctionnerait aussi ; on écrit la forme simple.
      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${venueId} FOR UPDATE`;

      const clash = await tx.booking.findFirst({
        where: {
          venueId,
          status: { in: [...HARD_BOOKING_STATUSES] },
          startsAt: { lt: blockedUntil },
          endsAt: { gt: blockedFrom }
        },
        select: { id: true }
      });
      if (clash) {
        throw new ConflictException({
          code: VenueErrorCode.AVAILABILITY_BLOCK_CONFLICT,
          message: "venue.errors.blockConflict"
        });
      }

      // Chevauchement bloc ↔ bloc : AUTORISÉ. L'union est la sémantique voulue,
      // et refuser un bloc qui en touche un autre serait une friction pure.
      const row = await tx.availabilityBlock.create({
        data: { venueId, blockedFrom, blockedUntil, reason: input.reason ?? null, createdById: userId },
        select: BLOCK_SELECT
      });
      return toAvailabilityBlockDTO(row);
    });
  }

  /** Suppression DURE, autorisée même sur un blocage passé : un blocage n'est
   *  pas un historique de vente, contrairement à un créneau déjà réservé
   *  (409 `SLOT_TEMPLATE_IN_USE` en B1). */
  async remove(userId: string, venueId: string, blockId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.ownedVenue(tx, userId, venueId);
      const existing = UUID_PATTERN.test(blockId)
        ? await tx.availabilityBlock.findFirst({ where: { id: blockId, venueId }, select: { id: true } })
        : null;
      if (!existing) {
        throw new NotFoundException({
          code: VenueErrorCode.AVAILABILITY_BLOCK_NOT_FOUND,
          message: "venue.errors.blockNotFound"
        });
      }
      await tx.availabilityBlock.delete({ where: { id: blockId } });
    });
  }

  /** 404 INDISTINCT (doctrine A2) : inexistante, supprimée, id malformé ou
   *  salle d'un autre pro — anti-énumération. */
  private async ownedVenue(tx: BlockTx, userId: string, venueId: string): Promise<void> {
    const venue = UUID_PATTERN.test(venueId)
      ? await tx.venue.findFirst({ where: { id: venueId, deletedAt: null, owner: { userId } }, select: { id: true } })
      : null;
    if (!venue) {
      throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
    }
  }
}
