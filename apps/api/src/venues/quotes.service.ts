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
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
// ⚠ `BookingStatus` A ÉTÉ RETIRÉ DE CETTE LISTE (D263), et ce n'était pas un
//   import décoratif : avant S10b-2, la conversion écrivait le statut de la
//   demande ICI, depuis l'énumération partagée. La transaction est partie dans
//   `quote-store.prisma.ts`, et la valeur y est devenue une CHAÎNE LITTÉRALE.
//   L'import est resté derrière, sans consommateur. ⛔ Le défaut qu'il
//   signalait est OUVERT et consigné au backlog — voir le commentaire posé sur
//   `convertirEnDemande`. Le supprimer ferme la porte lint ; il ne ferme pas le
//   défaut, et cette phrase existe pour qu'on ne l'oublie pas.
import {
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
import {
  QuoteCommand,
  quoteAllowedFrom,
  quoteWrittenStatus
} from "./quote-transitions";
// ⚠ `QUOTE_SELECT` et `DevisChiffre` retirés (D263) : résidus de S10b-1, qui a
//   emporté dans l'adaptateur les quatre transactions du devis — donc la forme
//   du `select` et le type du chiffrage. Vérifié : leurs SEULS consommateurs
//   sont `quote-store.types.ts`, `quote-store.prisma.ts` et son spec. Contrairement
//   au précédent, ceux-là ne signalent rien : ils sont morts pour de bon.
import {
  QUOTE_STORE,
  type QuoteRow,
  type QuoteStore
} from "./quote-store.types";
import { resolveServiceLine, type ResolvedLine } from "./service-pricing";
import { SERVICE_SELECT } from "./services.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ⚠ `OPEN` A DISPARU AU LOT S3, et ce n'était pas une copie fautive : elle
// dérivait déjà de `@zwadj/types`. Ce qui manquait, c'est QUI l'utilise — la
// même liste gardait quatre commandes sans que rien ne dise laquelle écrit un
// statut. `quote-transitions.ts` porte désormais le tableau, et l'autorité
// reste `QUOTE_OPEN_STATUSES` : la politique la référence, elle ne la copie pas.


@Injectable()
export class QuotesService {
  // ⚠ DEUX DÉPENDANCES, ET C'EST DÉLIBÉRÉ (S10b-1). Le cycle de vie du devis
  // — ses quatre blocs transactionnels — passe par le port. `price()` et
  // `convert()` gardent Prisma : les lectures de tarification ne sont ni
  // transactionnelles ni risquées, et `convert()` écrit dans un AUTRE agrégat,
  // sur le chemin de l'argent — c'est S10b-2, avec son propre cadrage.
  constructor(
    @Inject(QUOTE_STORE) private readonly devis: QuoteStore,
    private readonly prisma: PrismaService
  ) {}

  async listForVenue(userId: string, venueId: string): Promise<QuoteDTO[]> {
    await this.ownedVenue(userId, venueId);
    const rows = await this.devis.listerDeLaSalle(venueId);
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
    const rows = await this.devis.listerPourEntonnoir(venueId);

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

    // ⚠ Les deux écritures — créer, puis se désigner tête de chaîne — sont
    // atomiques dans l'adaptateur. Le service dit CE QU'IL VEUT, pas comment.
    const row = await this.devis.creerTeteDeChaine(venueId, priced);

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

    const resultat = await this.devis.marquerRemis({
      quoteId: current.id,
      statutsAdmis: quoteAllowedFrom(QuoteCommand.DELIVER),
      sentVia: input.sentVia,
      sentAt: new Date()
    });
    // ⚠ LE 409 EST LEVÉ HORS DE LA TRANSACTION DÉSORMAIS. Inoffensif : un refus
    // signifie qu'aucune ligne n'avait été écrite, donc l'annulation ne défaisait
    // rien. Mais le changement est réel et se dit (MD1 du cadrage S10b-1).
    if (!resultat.ok) this.throwStatusConflict(resultat.statutActuel);
    return this.toDTO(resultat.devis);
  }

  /** Révision — la version N+1 de la chaîne, en DRAFT.
   *
   *  ⚠ Le passage à l'ÉCRASEMENT est Q3, pas ici (D167) : il ouvre le trou de
   *  D163 — l'écrasement arrive AVEC sa garde en base, jamais avant.
   *
   *  ⚠ LE MOTIF D'ORIGINE ÉTAIT FAUX, ET IL A ÉTÉ CORRIGÉ — pas la décision.
   *  Il disait que `Booking.quoteId` référence le devis « sans recopier les
   *  montants », donc qu'écraser changerait rétroactivement le montant d'une
   *  réservation. Mesuré le 28/08/2026 : `convert()` RECOPIE les quatre
   *  montants dans la demande, et rien dans `apps/api/src` ne lit un montant
   *  à travers `quoteId`. Écraser un devis ne toucherait donc AUCUNE
   *  réservation existante.
   *
   *  La décision tient quand même, pour une raison qu'il faut dire
   *  correctement : le devis est le DOCUMENT REMIS AU CLIENT. L'écraser
   *  ferait diverger ce que le pro a en base de ce que le client a en main,
   *  et la chaîne de versions existe précisément pour éviter ça.
   *
   *  ⛔ Q3 est planifié CONTRE ce commentaire : quelqu'un raisonnera dessus.
   *  Une justification périmée sur le chemin de l'argent coûte plus cher
   *  qu'une absence de justification. */
  async revise(userId: string, quoteId: string, input: QuoteCreateInput): Promise<QuoteDTO> {
    const current = await this.ownedQuote(userId, quoteId);
    // Une chaîne close ne se révise plus : ni un refus, ni une acceptation ne se
    // rouvrent par une version de plus.
    this.assertStatus(current, quoteAllowedFrom(QuoteCommand.REVISE));

    const priced = await this.price(current.venueId, input);
    // ⚠ LE VERROU DE CHAÎNE EST DANS L'ADAPTATEUR, avec le `MAX(version)` qu'il
    // protège. Les séparer aurait rendu la garde invisible à la relecture.
    const row = await this.devis.creerRevision({
      venueId: current.venueId,
      chainId: current.chainId,
      parentQuoteId: current.id,
      chiffre: priced
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
    this.assertStatus(current, quoteAllowedFrom(QuoteCommand.CONVERT));

    // `bookings.quote_id` est UNIQUE : sans cette garde, une seconde conversion
    // remonterait en 500 au lieu d'un 409 lisible. La base reste l'autorité —
    // on ne fait que traduire d'avance ce qu'elle refuserait de toute façon.
    if (current.booking !== null) this.throwAlreadyConverted();

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
    // La garde `current.booking !== null` plus haut est lue HORS transaction :
    // deux conversions concurrentes la passent toutes les deux.
    // `bookings.quote_id` est UNIQUE, donc la base arrête bien la seconde — mais
    // la violation remontait telle quelle en **500**, alors que le même refus,
    // vu une milliseconde plus tôt, rend un 409 lisible.
    //
    // ⚠ On ne remplace PAS la garde applicative : elle évite d'écrire pour rien
    // dans le cas courant. On traduit ce qu'elle ne peut pas voir.
    //
    // ⚠ `source` est DÉCIDÉ ICI : lire la provenance d'une affaire est du métier,
    // pas de la persistance. Un adaptateur qui la déduirait tiendrait une
    // seconde définition de « client connu ».
    const resultat = await this.devis.convertirEnDemande({
      venueId: current.venueId,
      quoteId: current.id,
      clientId: current.clientId,
      slotTemplateId: current.slotTemplateId,
      source: current.clientId === null ? "WALK_IN" : "CLIENT",
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
      lignes: lines
    });
    if (!resultat.ok) this.throwAlreadyConverted();

    // Le devis ne bouge PAS. Il attend l'acompte.
    // ⚠ RELECTURE APRÈS ÉCRITURE : le DTO rendu porte `booking`, et c'est ce
    // que l'écran du pro affiche immédiatement après la conversion. Relire une
    // ligne périmée afficherait « non converti » sur un devis qui vient de
    // l'être.
    const row = await this.devis.trouverDuPro(userId, current.id);
    if (!row) this.throwNotFound();
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
    const resultat = await this.devis.changerStatut({
      quoteId: current.id,
      statutsAdmis: quoteAllowedFrom(QuoteCommand.CANCEL),
      // ⚠ Le statut cible vient de la machine à états, pas du port : c'est le
      // service qui la connaît, et une seconde copie divergerait.
      nouveauStatut: quoteWrittenStatus(QuoteCommand.CANCEL)
    });
    if (!resultat.ok) this.throwStatusConflict(resultat.statutActuel);
    return this.toDTO(resultat.devis);
  }

  // ───────────────────────────────────────────────────────────────────────────



  /** ⚠ LE 409 DE CONFLIT DE STATUT, ÉCRIT UNE SEULE FOIS. `deliver` et
   *  `cancel` le lèvent sur le même résultat de port ; deux copies
   *  divergeraient, et c'est le corps du 409 que le client lit pour savoir
   *  POURQUOI son geste est refusé. */
  private throwStatusConflict(statutActuel: string): never {
    throw new ConflictException({
      code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,
      message: "quote.errors.statusConflict",
      status: statutActuel
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
    if (!(await this.devis.salleAppartientAu(userId, venueId))) this.throwNotFound();
  }

  private async ownedQuote(userId: string, quoteId: string): Promise<QuoteRow> {
    if (!UUID_PATTERN.test(quoteId)) this.throwNotFound();
    const row = await this.devis.trouverDuPro(userId, quoteId);
    if (!row) this.throwNotFound();
    return row;
  }


  /** ⚠ LE 409 DE DOUBLE CONVERSION, ÉCRIT UNE SEULE FOIS. La garde applicative
   *  et le refus du port doivent rendre le MÊME code : un utilisateur ne
   *  devrait pas recevoir deux erreurs différentes pour un seul empêchement. */
  private throwAlreadyConverted(): never {
    throw new ConflictException({
      code: QuoteErrorCode.QUOTE_ALREADY_CONVERTED,
      message: "quote.errors.alreadyConverted"
    });
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
