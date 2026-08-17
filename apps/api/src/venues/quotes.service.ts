// Devis — Flux E, Lot E2b ; machine à états refondue au lot Q2 (ex-C1c).
//
// ── LA RÈGLE QUI GOUVERNAIT CE FICHIER, ET POURQUOI ELLE TOMBE ───────────────
// « Toute version qui devient ACTIVE remplace la précédente active de sa
// chaîne » supposait qu'il existe un état ACTIF. Q2 le supprime : remettre un
// devis est un PARTAGE (D160), pas une transition. Il n'y a donc plus rien à
// rétrograder, et `supersedeActive()` a été RETIRÉE plutôt que reciblée.
//
// ⚠ C'EST LE PIÈGE N°1 DU LOT, ET IL SE SERAIT REFERMÉ EN SILENCE. La fonction
//   visait `ACTIVE_STATUSES = [SENT, ACCEPTED]`. `SENT` n'est plus écrit, et
//   `ACCEPTED` ne l'a JAMAIS été — vérifié dans tout le dépôt : deux lectures,
//   zéro écriture. Conservée, elle serait devenue un `updateMany` qui ne touche
//   jamais une ligne : aucune erreur, aucun test rouge, et une protection qu'on
//   croirait en place. Une garde qui ne mord plus se supprime, elle ne se
//   commente pas.
//
// ⚠ Ce que sa disparition NE laisse PAS à découvert, et ce qui a CHANGÉ depuis.
//   Les deux index partiels restent en base, mais pour des raisons désormais
//   OPPOSÉES :
//     `quotes_one_sent_per_chain`     → INERTE. `SENT` n'est plus écrit.
//     `quotes_one_accepted_per_chain` → il REDEVIENDRA actif avec E3, qui est
//        le seul chemin vers `ACCEPTED`. Il garantit qu'une chaîne n'a qu'un
//        devis accepté. ⚠ Point à traiter EN E3 : deux versions d'une même
//        chaîne peuvent chacune porter une réservation (`convert()` ne regarde
//        que le devis visé), donc deux passages en `ACCEPTED` sur une chaîne
//        violeraient cet index en 500.
//   ⚠ D165 EST RÉVOQUÉE POUR LE VERSIONNEMENT (décision A) : `chain_id`,
//   `version` et `parent_quote_id` ne sont PAS des colonnes en sursis. Le
//   versionnement est CONSERVÉ tel quel — c'est lui qui protège la traçabilité,
//   et `revise()` continue de créer une version au lieu d'écraser. Aucune garde
//   en base n'est donc nécessaire : sans écrasement, il n'y a rien à empêcher.
//
// ── D101 est REMPLACÉE par D159 : les deux parcours sont DISTINCTS ───────────
//   `Quote` est walk-in SEUL. Le parcours en ligne appelle
//   `POST /venues/:slug/bookings` et ne crée AUCUN devis — le code ne l'a jamais
//   fait, c'est la doctrine écrite qui avait quitté le code.
//
//   Reste vrai, et inchangé : l'acceptation d'un devis n'est pas une action.
//   Elle est la conséquence d'une chaîne complète — le pro accepte la date,
//   PUIS l'acompte est encaissé. Ce lot ne fournit donc AUCUN chemin vers
//   `Quote.ACCEPTED` ; la bascule appartient à E3, dans la MÊME transaction que
//   le passage en CONFIRMED.
//
// ⚠ Et comme partout ailleurs (D117, D121), un statut qui décide d'une
//   transition se lit DANS la transaction — par check-and-set conditionné au
//   statut, jamais par un contrôle lu avant.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BookingStatus,
  QUOTE_OPEN_STATUSES,
  QuoteErrorCode,
  QuoteStatus,
  ServiceErrorCode,
  isQuoteLost,
  type QuoteConvertInput,
  type QuoteConversionDTO,
  type QuoteCreateInput,
  type QuoteDTO,
  type QuoteDeliverInput,
  type QuoteSentVia
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

/** ⚠ IMPORTÉE de `@zwadj/types`, jamais recopiée ici. C'est la MÊME liste qui
 *  décide quels boutons l'app pro affiche : deux copies de « ce devis est-il
 *  encore ouvert ? » divergeraient, et la divergence serait silencieuse — un
 *  bouton présent que l'API refuse, ou l'inverse. */
const OPEN = [...QUOTE_OPEN_STATUSES];

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
  sentAt: true,
  sentVia: true,
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
    return rows.map((row) => this.toDTO(row));
  }

  /**
   * Taux de transformation. On compte des CHAÎNES, pas des versions — trois
   * révisions d'un même devis sont UNE affaire, pas trois.
   *
   * ⚠ LE DÉNOMINATEUR A CHANGÉ DE DÉFINITION (D162). Il portait sur
   * `sentAt IS NOT NULL`, c'est-à-dire sur l'horodatage que le clic « Envoyer »
   * posait — un clic qu'il fallait faire pour débloquer la conversion, et que
   * les pros faisaient donc SANS rien envoyer. L'entonnoir comptait un geste
   * technique, pas une remise.
   *
   * Il porte désormais sur `sentVia`, qui n'existe que si quelqu'un a déclaré
   * PAR QUOI le devis est parti. Les quatre canaux incluent `IN_PERSON` et
   * `PHONE` précisément pour que le devis conclu de vive voix au comptoir — le
   * cas le plus courant — entre dans l'entonnoir au lieu d'en disparaître.
   *
   * ⚠ CONSÉQUENCE ASSUMÉE SUR LES DONNÉES EXISTANTES. Aucune reprise n'a été
   * faite (D168) : les devis antérieurs à Q1 n'ont pas de canal et sortent donc
   * du dénominateur. L'entonnoir REPART de zéro. C'est le prix d'un indicateur
   * qui dit la vérité — inventer un canal sur des lignes anciennes aurait
   * produit un entonnoir qui a l'air juste, ce qui est exactement le pire.
   */
  async conversion(userId: string, venueId: string): Promise<QuoteConversionDTO> {
    await this.ownedVenue(userId, venueId);
    const rows = await this.prisma.quote.findMany({
      where: { venueId, sentVia: { not: null } },
      orderBy: [{ chainId: "asc" }, { version: "desc" }],
      select: { chainId: true, status: true, version: true }
    });

    const seen = new Set<string>();
    const result: QuoteConversionDTO = { delivered: 0, accepted: 0, cancelled: 0 };

    for (const row of rows) {
      // La version la plus récente de la chaîne décide du sort de l'affaire :
      // le tri `version desc` fait qu'on la rencontre en premier.
      if (seen.has(row.chainId)) continue;
      seen.add(row.chainId);
      result.delivered += 1;
      if (row.status === QuoteStatus.ACCEPTED) result.accepted += 1;
      // ⚠ `isQuoteLost` ET NON `=== CANCELLED`. C'est LA garde de l'absorption : le
      // jour du déploiement, toutes les affaires perdues de l'historique sont en
      // `DECLINED`, et aucune migration ne les basculera (pas de reprise).
      // Comparer au seul statut neuf afficherait « 0 perdus » sur une salle qui
      // en a trente — faux, et dans le sens flatteur.
      else if (isQuoteLost(row.status)) result.cancelled += 1;
    }
    return result;
  }

  /** v1 d'une nouvelle chaîne. Naît en DRAFT — et y RESTE tant que rien ne la
   *  ferme : depuis Q2, remettre le devis au client ne change plus son statut. */
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

    return this.toDTO(row);
  }

  /**
   * REMISE du devis au client — remplace `send()`.
   *
   * ⚠ CE QUE CETTE MÉTHODE NE FAIT PLUS, ET C'EST TOUT LE LOT. Elle ne change
   * AUCUN statut. Le devis reste `DRAFT` : il n'existe plus d'état « remis »
   * qui conditionnerait la suite. Remettre un devis est un partage, sans effet
   * sur le prix et sans effet sur ce qui est permis ensuite (D160).
   *
   * ⚠ ELLE EST DONC RÉPÉTABLE, DÉLIBÉRÉMENT. Un pro qui imprime puis envoie par
   * SMS a fait deux remises ; la seconde écrase `sentVia` et `sentAt`. Le
   * dernier canal gagne, et l'entonnoir compte la chaîne UNE fois de toute
   * façon. C'est un journal de partage, pas une transition.
   *
   * ⚠ CE QUI DISPARAÎT AVEC ELLE, ET POURQUOI CE N'EST PAS UNE RÉGRESSION. La
   * garde de concurrence de D117 protégeait `sentAt` : « le second envoi
   * réécrirait la date que le client a sous les yeux sur un devis déjà parti ».
   * Cette phrase supposait un envoi unique et irréversible. Une remise ne l'est
   * pas — réécrire `sentAt` est désormais le comportement ATTENDU. La garde
   * n'est donc pas retirée par négligence : son objet n'existe plus.
   *
   * Ce qui RESTE, en revanche, c'est la doctrine : le statut qui autorise
   * l'écriture est lu DANS la transaction, par check-and-set. Un devis refusé
   * ou remplacé ne se remet pas au client, même si la fermeture arrive une
   * milliseconde avant la remise.
   */
  async deliver(userId: string, quoteId: string, input: QuoteDeliverInput): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);

    const row = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.quote.updateMany({
        where: { id: current.id, status: { in: OPEN } },
        data: { sentVia: input.sentVia, sentAt: new Date() }
      });
      if (consumed.count === 0) {
        const fresh = await tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: { status: true } });
        this.assertStatus(fresh, OPEN);
        throw new ConflictException({
          code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,
          message: "quote.errors.statusConflict",
          status: fresh.status
        });
      }
      return tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: QUOTE_SELECT });
    });
    return this.toDTO(row);
  }

  /** Révision — la version N+1 de la chaîne, en DRAFT.
   *
   *  ⚠ Le passage à l'ÉCRASEMENT est Q3, pas ici (D167) : il ouvre le trou de
   *  D163 — `Booking.quoteId` référence le devis sans recopier les montants,
   *  donc écraser changerait rétroactivement le montant d'une réservation
   *  acceptée, et payée une fois E3 en place, sans qu'aucune erreur ne soit
   *  levée. L'écrasement arrive AVEC sa garde en base, jamais avant. */
  async revise(userId: string, quoteId: string, input: QuoteCreateInput): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);
    // Une chaîne close ne se révise plus : ni un refus, ni une acceptation ne se
    // rouvrent par une version de plus.
    this.assertStatus(current, OPEN);

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
    return this.toDTO(row);
  }

  /** Conversion — le devis devient une DEMANDE de réservation.
   *
   *  ⚠ UN BROUILLON SE CONVERTIT DÉSORMAIS, et c'est le cœur de Q2. La règle
   *  d'avant disait : « sans envoi, personne d'autre que le pro ne l'a vu ».
   *  Elle décrivait un parcours à distance qui n'existe pas ici — au comptoir,
   *  le client a le montant sous les yeux pendant que le pro le tape. Exiger un
   *  clic « Envoyer » avant de conclure ne prouvait donc rien : il rendait le
   *  clic obligatoire, donc systématique, donc muet.
   *
   *  ⚠ La réservation naît en **PENDING**, pas en ACCEPTED. C'est le pro qui
   *  accepte la date ensuite, par la route de E1a — exactement comme pour une
   *  demande venue du site. Le devis, lui, ne bouge pas : il ne passera
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
    this.assertStatus(current, OPEN);

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
        // D135 — absent ⇒ NULL explicite (même règle que côté demande client).
        contactEmail: input.contactEmail ?? null,
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
    return this.toDTO(row);
  }

  /** CLÔTURE d'un devis qui n'aboutira pas — remplace `decline()` (D161).
   *
   *  ⚠ UN SEUL ÉTAT POUR DEUX CAS RÉELS, et c'est le lot Q3a en une phrase. Le
   *  client a dit non, ou le pro a renoncé : rien dans la suite du parcours ne
   *  les traite différemment — l'affaire est perdue et le créneau reste libre.
   *  La nuance avait un sens quand le devis partait à distance et qu'un refus
   *  était un événement reçu ; au comptoir, c'est la même conversation.
   *
   *  ⚠ À ne pas confondre avec `SUPERSEDED`, qui reste distinct : « remplacé par
   *  une version plus récente » n'est toujours pas « l'affaire est perdue ». Le
   *  versionnement est CONSERVÉ (décision A), donc cette distinction-là garde
   *  toute sa valeur — c'est même la seule chose qui protège la traçabilité
   *  maintenant qu'aucune garde en base n'est posée.
   *
   *  ⚠ Les lignes déjà `DECLINED` ne sont PAS reprises. Elles restent lisibles,
   *  et l'entonnoir les compte avec les `CANCELLED` — voir `conversion()`. */
  async cancel(userId: string, quoteId: string): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);

    // D121 — check-and-set, même famille que `decline`/`cancel` côté demandes.
    // Le contrôle lu hors transaction laissait passer DEUX refus concurrents :
    // 201 les deux fois, sur un devis déjà refusé.
    const row = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.quote.updateMany({
        where: { id: current.id, status: { in: OPEN } },
        data: { status: QuoteStatus.CANCELLED }
      });
      if (consumed.count === 0) {
        const fresh = await tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: { status: true } });
        this.assertStatus(fresh, OPEN);
        throw new ConflictException({
          code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,
          message: "quote.errors.statusConflict",
          status: fresh.status
        });
      }
      return tx.quote.findUniqueOrThrow({ where: { id: current.id }, select: QUOTE_SELECT });
    });
    return this.toDTO(row);
  }

  // ───────────────────────────────────────────────────────────────────────────

  /** Sérialise les écritures d'une chaîne. Le verrou porte sur la RACINE
   *  (`chainId`), qui est une vraie ligne : c'est la v1 elle-même.
   *
   *  ⚠ CONSERVÉ alors que la supersession a disparu, et pour une raison qui lui
   *  est propre : `revise()` lit le `MAX(version)` puis écrit `version + 1`, et
   *  `quotes_chain_version_unique` refuserait la seconde de deux révisions
   *  simultanées. Le verrou les sérialise. Ce n'est pas un reste. */
  private async lockChain(tx: Prisma.TransactionClient, chainId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${chainId}::uuid FOR UPDATE`;
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
    // ⚠ `validUntil` NE FIGURE PLUS ICI (D160), et sa COLONNE a été supprimée au
    // lot Q4 — après que Q2 et Q3a aient été vérifiés verts sur base réelle.
    // C'est le premier point de non-retour de la série : toutes les migrations
    // précédentes laissaient le retour arrière à portée d'une bascule de code.
    // ⚠ `chain_id`, `version` et `parent_quote_id` NE L'ONT PAS SUIVIE. D165 les
    // condamnait au même lot ; la décision A les en a retirées — le versionnement
    // est conservé, donc ces trois colonnes sont ACTIVES.
    return {
      clientId: input.clientId ?? null,
      slotTemplateId: slot.id,
      eventDate: new Date(civilUtcMs(date)),
      guests: input.guests,
      basePriceCents,
      servicesTotalCents,
      totalCents,
      depositCents: resolveDepositCents(venue, totalCents),
      lines: lines as unknown as Prisma.InputJsonValue
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

  /** ⚠ D117 — `{ status }` et non `QuoteRow` : les check-and-set relisent le
   *  statut avec un `select` minimal, pas un `QUOTE_SELECT` complet. */
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

  private toDTO(row: QuoteRow): QuoteDTO {
    return {
      id: row.id,
      venueId: row.venueId,
      clientId: row.clientId,
      status: row.status,
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
      sentAt: row.sentAt?.toISOString() ?? null,
      // ⚠ Le `as` reste nécessaire : la colonne est TEXT en base (liste ouverte,
      // D168), donc Prisma rend `string | null`. L'autorité sur le jeu de
      // valeurs est `quoteSentViaSchema`, appliqué à l'ÉCRITURE par la pipe Zod
      // du contrôleur — jamais à la lecture, où elle ferait tomber une ligne
      // ancienne au lieu de l'afficher.
      sentVia: (row.sentVia as QuoteSentVia | null) ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      bookingId: row.booking?.id ?? null
    };
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: QuoteErrorCode.QUOTE_NOT_FOUND, message: "quote.errors.notFound" });
  }
}
