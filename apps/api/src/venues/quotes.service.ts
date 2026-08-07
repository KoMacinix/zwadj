// Devis — Flux E, Lot E2b.
//
// ── La règle qui gouverne tout le fichier ────────────────────────────────────
// TOUTE version qui devient ACTIVE remplace la précédente active de sa chaîne.
// « Active » vaut SENT ou ACCEPTED, et « remplace » vaut SUPERSEDED — jamais
// DECLINED : personne n'a refusé, c'est le temps qui a passé.
//
// ⚠ L'ORDRE DES ÉCRITURES N'EST PAS UNE PRÉCAUTION, C'EST LE SEUL CHEMIN QUI
//   PASSE. `quotes_one_accepted_per_chain` et `quotes_one_sent_per_chain` sont
//   des index PARTIELS, donc NON différables (`DEFERRABLE` ne s'applique qu'aux
//   contraintes, et `UNIQUE` n'accepte pas de `WHERE`). Ils sont vérifiés à
//   chaque instruction : activer avant de rétrograder échoue systématiquement.
//
// ⚠ D101 (REMPLACE D100) — l'acceptation d'un devis n'est PAS une action.
//   Elle est la CONSÉQUENCE d'une chaîne complète, dans cet ordre :
//     1. devis SENT
//     2. le client demande une date  → Booking PENDING
//     3. le pro accepte la date      → Booking ACCEPTED
//     4. l'acompte est encaissé      → Booking CONFIRMED **et** Quote ACCEPTED
//   Les deux conditions sont nécessaires, et dans cet ordre : sans acceptation
//   du pro il n'y a rien à payer, et sans paiement rien n'est conclu. Ce lot ne
//   fournit donc AUCUN chemin vers `Quote.ACCEPTED` — la bascule appartient au
//   lot Paiement, dans la MÊME transaction que le passage en CONFIRMED.
//
//   Corollaire : les deux parcours — client en ligne, pro en présentiel — ne se
//   distinguent que par l'ACTEUR et l'INTERFACE. Mêmes lignes, mêmes statuts,
//   mêmes transitions. Un pro qui encaisse un acompte en espèces déclenche
//   exactement la même bascule qu'un paiement Chargily.
//
// ⚠ Et comme partout ailleurs (D78), l'unicité appartient à la BASE. Le service
//   rétrograde `WHERE chain_id = X AND status = …` — jamais un id précis lu
//   auparavant — et prend un `SELECT … FOR UPDATE` sur la racine de la chaîne
//   pour sérialiser les acceptations concurrentes. Le 409 reste le filet ; il
//   ne se devine pas.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BookingStatus,
  QuoteErrorCode,
  QuoteStatus,
  ServiceErrorCode,
  isQuoteExpired,
  type QuoteConvertInput,
  type QuoteConversionDTO,
  type QuoteCreateInput,
  type QuoteDTO
} from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { civilUtcMs, holidayKey, parseCivilDate, toCalendarDay, type CivilDate } from "./availability-time";
import { computeBookingWindow } from "./booking-window";
import { resolveDepositCents } from "./deposit";
import { resolveSlotPrice } from "./pricing-engine";
import { RULE_SELECT } from "./pricing-rules.service";
import { resolveServiceLine, type ResolvedLine } from "./service-pricing";
import { SERVICE_SELECT } from "./services.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** États ACTIFS d'une chaîne. Miroir des deux index partiels : si l'un bouge,
 *  l'autre doit bouger, sinon le service croit une chose et la base une autre. */
const ACTIVE_STATUSES = [QuoteStatus.SENT, QuoteStatus.ACCEPTED] as const;

const QUOTE_SELECT = {
  id: true,
  venueId: true,
  clientId: true,
  status: true,
  version: true,
  chainId: true,
  parentQuoteId: true,
  eventDate: true,
  slotTemplateId: true,
  guests: true,
  basePriceCents: true,
  servicesTotalCents: true,
  totalCents: true,
  depositCents: true,
  lines: true,
  validUntil: true,
  sentAt: true,
  acceptedAt: true,
  createdAt: true,
  booking: { select: { id: true } }
} satisfies Prisma.QuoteSelect;

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof QUOTE_SELECT }>;

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForVenue(userId: string, venueId: string): Promise<QuoteDTO[]> {
    await this.ownedVenue(userId, venueId);
    const rows = await this.prisma.quote.findMany({
      where: { venueId },
      orderBy: [{ chainId: "asc" }, { version: "asc" }],
      select: QUOTE_SELECT
    });
    const nowMs = Date.now();
    return rows.map((row) => this.toDTO(row, nowMs));
  }

  /** Taux de transformation. C'est la raison d'être n°3 de la table : on compte
   *  des CHAÎNES, pas des versions — trois révisions d'un même devis sont UNE
   *  affaire, pas trois. */
  async conversion(userId: string, venueId: string): Promise<QuoteConversionDTO> {
    await this.ownedVenue(userId, venueId);
    const rows = await this.prisma.quote.findMany({
      where: { venueId, sentAt: { not: null } },
      orderBy: [{ chainId: "asc" }, { version: "desc" }],
      select: { chainId: true, status: true, validUntil: true, version: true }
    });

    const nowMs = Date.now();
    const seen = new Set<string>();
    const result: QuoteConversionDTO = { sent: 0, accepted: 0, declined: 0, expired: 0 };

    for (const row of rows) {
      // La version la plus récente de la chaîne décide du sort de l'affaire :
      // le tri `version desc` fait qu'on la rencontre en premier.
      if (seen.has(row.chainId)) continue;
      seen.add(row.chainId);
      result.sent += 1;
      if (row.status === QuoteStatus.ACCEPTED) result.accepted += 1;
      else if (row.status === QuoteStatus.DECLINED) result.declined += 1;
      else if (isQuoteExpired({ status: row.status, validUntil: row.validUntil?.toISOString() ?? null }, nowMs)) {
        result.expired += 1;
      }
    }
    return result;
  }

  /** v1 d'une nouvelle chaîne. Naît en DRAFT : un devis se relit avant de
   *  partir, et un envoi n'est pas rattrapable. */
  async create(userId: string, venueId: string, input: QuoteCreateInput): Promise<QuoteDTO> {
    await this.ownedVenue(userId, venueId);
    const priced = await this.price(venueId, input);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: { venueId, ...priced, chainId: "00000000-0000-0000-0000-000000000000", version: 1 },
        select: { id: true }
      });
      // `chainId` = son propre id : impossible à écrire en une passe, l'id est
      // généré par la base (`uuidv7()`). Le second UPDATE est dans la MÊME
      // transaction, donc aucune ligne n'est jamais visible avec la valeur
      // temporaire.
      await tx.quote.update({ where: { id: created.id }, data: { chainId: created.id } });
      return tx.quote.findUniqueOrThrow({ where: { id: created.id }, select: QUOTE_SELECT });
    });

    return this.toDTO(row, Date.now());
  }

  /** Envoi. C'est ici que le devis devient ACTIF — donc ici que la version
   *  précédemment active de la chaîne se fait remplacer. */
  async send(userId: string, quoteId: string): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockChain(tx, current.chainId);

      // D117 — LE STATUT SE LIT SOUS LE VERROU DE CHAÎNE, jamais avant.
      //
      // ⚠ Contrairement à `accept()`, AUCUN défaut n'a été reproduit ici : le
      // code d'avant rendait déjà 201 + 409 sur deux envois concurrents du même
      // brouillon, parce que la seconde requête voyait déjà SENT dans son
      // `ownedQuote()`. Mais cette sérialisation venait de l'ordonnancement du
      // pool de connexions — pas d'une garantie. Une seconde instance d'API la
      // ferait disparaître, et les index partiels `quotes_one_*_per_chain` ne
      // rattraperaient rien : il n'y a qu'UNE ligne, elle ne se dédouble pas, et
      // `supersedeActive` s'exclut elle-même par `exceptId`. Le second envoi
      // réécrirait `sentAt` sur un devis déjà parti.
      //
      // On rend donc STRUCTUREL ce qui n'était qu'OBSERVÉ, au même endroit et
      // par le même moyen que pour `accept()` — une seule autorité (D78).
      //
      // ⚠ Deux envois de brouillons DIFFÉRENTS de la même chaîne étaient déjà
      // corrects par construction (le verrou les sérialise, le second supersède
      // le premier). Ce chemin-là ne change pas.
      const fresh = await tx.quote.findUniqueOrThrow({
        where: { id: current.id },
        select: { status: true }
      });
      this.assertStatus(fresh, [QuoteStatus.DRAFT]);

      await this.supersedeActive(tx, current.chainId, current.id);
      return tx.quote.update({
        where: { id: current.id },
        data: { status: QuoteStatus.SENT, sentAt: new Date() },
        select: QUOTE_SELECT
      });
    });
    return this.toDTO(row, Date.now());
  }

  /** Révision — la version N+1 de la chaîne, en DRAFT. Elle ne remplace rien
   *  tant qu'elle n'est pas envoyée : tant que le pro la prépare, le client a
   *  toujours l'ancienne sous les yeux, et c'est ce qu'il doit avoir. */
  async revise(userId: string, quoteId: string, input: QuoteCreateInput): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);
    // Une chaîne close ne se révise plus : ni un refus, ni une acceptation ne se
    // rouvrent par une version de plus.
    this.assertStatus(current, [QuoteStatus.DRAFT, QuoteStatus.SENT]);

    const priced = await this.price(current.venueId, input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockChain(tx, current.chainId);
      const max = await tx.quote.aggregate({ where: { chainId: current.chainId }, _max: { version: true } });
      return tx.quote.create({
        data: {
          venueId: current.venueId,
          ...priced,
          chainId: current.chainId,
          version: (max._max.version ?? 1) + 1,
          parentQuoteId: current.id
        },
        select: QUOTE_SELECT
      });
    });
    return this.toDTO(row, Date.now());
  }

  /** Conversion — le devis devient une DEMANDE de réservation.
   *
   *  ⚠ La réservation naît en **PENDING**, pas en ACCEPTED (D101). C'est le pro
   *  qui accepte la date ensuite, par la route de E1a — exactement comme pour
   *  une demande venue du site. Le devis, lui, RESTE `SENT` : il ne passera
   *  `ACCEPTED` qu'au moment où l'acompte sera encaissé.
   *
   *  Ce que ça change concrètement : une demande PENDING ne verrouille rien, le
   *  créneau reste disputable, et l'`EXCLUDE` ne peut donc pas refuser ici. Le
   *  409 `BOOKING_SLOT_TAKEN` arrive plus tard, à l'acceptation du pro — un seul
   *  endroit du dépôt le produit, et c'est celui qui verrouille.
   *
   *  Le contact est exigé parce que `bookings.contact_*` est NOT NULL et que le
   *  devis ne le porte pas : il est connu au moment où le client s'engage.
   *
   *  ⚠ `bookings.quote_id` est UNIQUE : un devis ne se convertit qu'une fois. Si
   *  la demande née d'ici est annulée, il faut RÉVISER le devis, pas le
   *  reconvertir — et c'est cohérent, une nouvelle négociation est une nouvelle
   *  version.
   */
  async convert(userId: string, quoteId: string, input: QuoteConvertInput): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);
    // Un DRAFT ne se convertit pas : sans envoi, personne d'autre que le pro ne
    // l'a vu, et il n'y a donc rien que le client ait accepté.
    this.assertStatus(current, [QuoteStatus.SENT]);

    if (isQuoteExpired({ status: current.status, validUntil: current.validUntil?.toISOString() ?? null }, Date.now())) {
      throw new ConflictException({ code: QuoteErrorCode.QUOTE_EXPIRED, message: "quote.errors.expired" });
    }

    // `bookings.quote_id` est UNIQUE : sans cette garde, une seconde conversion
    // remonterait en 500 au lieu d'un 409 lisible. La base reste l'autorité —
    // on ne fait que traduire d'avance ce qu'elle refuserait de toute façon.
    if (current.booking !== null) {
      throw new ConflictException({
        code: QuoteErrorCode.QUOTE_ALREADY_CONVERTED,
        message: "quote.errors.alreadyConverted"
      });
    }

    const date = this.civilOf(current.eventDate);
    const slot =
      current.slotTemplateId === null
        ? null
        : await this.prisma.slotTemplate.findUnique({
            where: { id: current.slotTemplateId },
            select: { startMinutes: true, endMinutes: true, nameFr: true, nameAr: true }
          });
    const venue = await this.prisma.venue.findUniqueOrThrow({
      where: { id: current.venueId },
      select: { bookingMode: true }
    });
    const window = computeBookingWindow(date, venue.bookingMode === "SINGLE_SLOT" || slot === null ? null : slot);

    const lines = (current.lines ?? []) as unknown as ResolvedLine[];
    // D121 — LA BASE EST L'AUTORITÉ, ET SA RÉPONSE DOIT ÊTRE TRADUITE.
    //
    // La garde `current.booking !== null` juste au-dessus est lue HORS
    // transaction : deux conversions concurrentes la passent toutes les deux.
    // `bookings.quote_id` est UNIQUE, donc la base arrête bien la seconde — mais
    // la violation remontait telle quelle en **500**, alors que le même refus,
    // vu une milliseconde plus tôt, rend un 409 lisible. Un utilisateur ne
    // devrait pas recevoir deux erreurs différentes pour un seul empêchement.
    //
    // ⚠ On ne remplace PAS la garde applicative : elle évite d'écrire pour rien
    // dans le cas courant. On traduit ce qu'elle ne peut pas voir.
    await this.createBookingForQuote({
      data: {
        venueId: current.venueId,
        clientId: current.clientId,
        quoteId: current.id,
        slotTemplateId: current.slotTemplateId,
        source: current.clientId === null ? "WALK_IN" : "CLIENT",
        status: BookingStatus.PENDING,
        paymentMethod: input.paymentMethod,
        eventDate: current.eventDate,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        slotNameFr: slot?.nameFr ?? null,
        slotNameAr: slot?.nameAr ?? null,
        guests: current.guests,
        basePriceCents: current.basePriceCents,
        servicesTotalCents: current.servicesTotalCents,
        totalCents: current.totalCents,
        depositCents: current.depositCents,
        contactFirstName: input.contactFirstName,
        contactLastName: input.contactLastName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        services: {
          create: lines.map((line) => ({
            serviceId: line.serviceId,
            tierId: line.tierId,
            nameFr: line.nameFr,
            nameAr: line.nameAr,
            pricingType: line.pricingType as "FIXED" | "PER_GUEST" | "TIERED" | "PER_UNIT",
            tierLabelFr: line.tierLabelFr,
            tierLabelAr: line.tierLabelAr,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents
          }))
        }
      }
    });

    // Le devis ne bouge PAS. Il attend l'acompte.
    const row = await this.prisma.quote.findUniqueOrThrow({ where: { id: current.id }, select: QUOTE_SELECT });
    return this.toDTO(row, Date.now());
  }

  /** Refus EXPLICITE. À ne pas confondre avec la supersession : ici quelqu'un a
   *  dit non à ce devis-là. */
  async decline(userId: string, quoteId: string): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);

    // D121 — check-and-set, même famille que `decline`/`cancel` côté demandes.
    // Le contrôle lu hors transaction laissait passer DEUX refus concurrents :
    // 201 les deux fois, sur un devis déjà refusé.
    const row = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.quote.updateMany({
        where: { id: current.id, status: QuoteStatus.SENT },
        data: { status: QuoteStatus.DECLINED }
      });
      if (consumed.count === 0) {
        const fresh = await tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: { status: true } });
        this.assertStatus(fresh, [QuoteStatus.SENT]);
        throw new ConflictException({
          code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,
          message: "quote.errors.statusConflict",
          status: fresh.status
        });
      }
      return tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: QUOTE_SELECT });
    });
    return this.toDTO(row, Date.now());
  }

  // ───────────────────────────────────────────────────────────────────────────

  /** Sérialise les écritures d'une chaîne. Le verrou porte sur la RACINE
   *  (`chainId`), qui est une vraie ligne : c'est la v1 elle-même. */
  private async lockChain(tx: Prisma.TransactionClient, chainId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${chainId}::uuid FOR UPDATE`;
  }

  /** Rétrograde l'active de la chaîne. Vise le STATUT, jamais un id lu avant :
   *  entre la lecture et l'écriture, la ligne active a pu changer. */
  private async supersedeActive(tx: Prisma.TransactionClient, chainId: string, exceptId: string): Promise<void> {
    await tx.quote.updateMany({
      where: { chainId, id: { not: exceptId }, status: { in: [...ACTIVE_STATUSES] } },
      data: { status: QuoteStatus.SUPERSEDED }
    });
  }

  private async price(venueId: string, input: QuoteCreateInput) {
    const date = parseCivilDate(input.eventDate) as CivilDate;
    const venue = await this.prisma.venue.findUniqueOrThrow({
      where: { id: venueId },
      select: {
        depositRateBps: true,
        depositAmountCents: true,
        capacityMax: true,
        slotTemplates: {
          where: { id: input.slotTemplateId, isActive: true },
          select: { id: true, basePriceCents: true, pricingRules: { where: { isActive: true }, select: RULE_SELECT } }
        }
      }
    });
    const slot = venue.slotTemplates[0];
    if (!slot) this.throwNotFound();

    const holidays = await this.prisma.holiday.findMany({
      where: { date: new Date(civilUtcMs(date)) },
      select: { date: true }
    });
    const day = toCalendarDay(date, new Set(holidays.map((row) => holidayKey(row.date))));
    const basePriceCents = resolveSlotPrice(slot.basePriceCents, slot.pricingRules, day).priceCents;

    const choices = input.services ?? [];
    const lines: ResolvedLine[] = [];
    if (choices.length > 0) {
      const catalogue = await this.prisma.service.findMany({
        where: { venueId, id: { in: choices.map((choice) => choice.serviceId) } },
        select: SERVICE_SELECT
      });
      for (const choice of choices) {
        const found = catalogue.find((row) => row.id === choice.serviceId);
        if (!found) throw new ConflictException({ code: ServiceErrorCode.SERVICE_UNAVAILABLE, message: "service.errors.SERVICE_UNAVAILABLE" });
        const resolved = resolveServiceLine(found, choice, input.guests);
        if (!resolved.ok) {
          throw new ConflictException({ code: resolved.failure.code, message: `service.errors.${resolved.failure.code}` });
        }
        lines.push(resolved.line);
      }
    }

    const servicesTotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const totalCents = basePriceCents + servicesTotalCents;
    return {
      clientId: input.clientId ?? null,
      slotTemplateId: slot.id,
      eventDate: new Date(civilUtcMs(date)),
      guests: input.guests,
      basePriceCents,
      servicesTotalCents,
      totalCents,
      depositCents: resolveDepositCents(venue, totalCents),
      lines: lines as unknown as Prisma.InputJsonValue,
      validUntil: input.validUntil === undefined ? null : new Date(civilUtcMs(parseCivilDate(input.validUntil) as CivilDate))
    };
  }

  private async ownedVenue(userId: string, venueId: string): Promise<void> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const owned = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null, owner: { userId } },
      select: { id: true }
    });
    if (!owned) this.throwNotFound();
  }

  private async ownedQuote(userId: string, quoteId: string): Promise<QuoteRow> {
    if (!UUID_PATTERN.test(quoteId)) this.throwNotFound();
    const row = await this.prisma.quote.findFirst({
      where: { id: quoteId, venue: { deletedAt: null, owner: { userId } } },
      select: QUOTE_SELECT
    });
    if (!row) this.throwNotFound();
    return row;
  }


  /**
   * D121 — crée la demande issue d'un devis et TRADUIT la violation d'unicité
   * de `bookings.quote_id` en conflit métier. Un seul endroit : la garde
   * applicative et la garde de la base doivent rendre le MÊME code.
   */
  private async createBookingForQuote(args: { data: Prisma.BookingUncheckedCreateInput }): Promise<void> {
    try {
      await this.prisma.booking.create({ data: args.data, select: { id: true } });
    } catch (error) {
      if (typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002") {
        throw new ConflictException({
          code: QuoteErrorCode.QUOTE_ALREADY_CONVERTED,
          message: "quote.errors.alreadyConverted"
        });
      }
      throw error;
    }
  }

  /** ⚠ D117 — `{ status }` et non `QuoteRow` : `send()` relit le statut sous le
   *  verrou de chaîne avec un `select` minimal, pas un `QUOTE_SELECT` complet. */
  private assertStatus(row: { status: string }, allowed: readonly string[]): void {
    if (!allowed.includes(row.status)) {
      throw new ConflictException({
        code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,
        message: "quote.errors.statusConflict",
        status: row.status
      });
    }
  }

  private civilOf(date: Date): CivilDate {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  private toDTO(row: QuoteRow, nowMs: number): QuoteDTO {
    const validUntil = row.validUntil?.toISOString() ?? null;
    return {
      id: row.id,
      venueId: row.venueId,
      clientId: row.clientId,
      status: row.status,
      isExpired: isQuoteExpired({ status: row.status, validUntil }, nowMs),
      version: row.version,
      chainId: row.chainId,
      parentQuoteId: row.parentQuoteId,
      eventDate: row.eventDate.toISOString().slice(0, 10),
      slotTemplateId: row.slotTemplateId,
      guests: row.guests,
      basePriceCents: row.basePriceCents,
      servicesTotalCents: row.servicesTotalCents,
      totalCents: row.totalCents,
      depositCents: row.depositCents,
      lines: row.lines as unknown as QuoteDTO["lines"],
      validUntil,
      sentAt: row.sentAt?.toISOString() ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      bookingId: row.booking?.id ?? null
    };
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: QuoteErrorCode.QUOTE_NOT_FOUND, message: "quote.errors.notFound" });
  }
}
