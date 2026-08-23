// Lecture PUBLIQUE des salles (Lot A3) — les deux règles D33, verrouillées :
// - LISTE  : PUBLISHED ∧ deletedAt IS NULL ∧ status = ACTIVE (strictement) ;
// - DÉTAIL : PUBLISHED ∧ deletedAt IS NULL ∧ status ∈ {ACTIVE, TEMPORARILY_
//   UNAVAILABLE} (bandeau côté A8) ; HIDDEN = 404 même en accès direct (SEO).
// Aucun taux ne peut sortir d'ici : les SELECT ne les contiennent pas.
// Sémantique des filtres : VALEUR inconnue (cityId, clé d'amenity) ⇒ résultat
// vide, pas une erreur — seul le FORMAT invalide fait un 400 (Zod).
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  BOOKING_HORIZON_MONTHS,
  HARD_BOOKING_STATUSES,
  VenueAvailabilityStatus,
  VenueErrorCode,
  VenuePublicationStatus,
  type VenueListQueryInput,
  type VenueListResponse,
  type VenuePublicDTO,
  type VenueSummaryDTO,
  CEREMONY_TYPE_MATCHES
} from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { MEDIA_STORAGE, type MediaStorage } from "../media/media.types";
import { PrismaService } from "../prisma/prisma.service";
import { computeDaySlotStatuses, type BookingWindow, type Interval, type SlotForStatus } from "./availability-engine";
import {
  addMonthsCivil,
  civilDayLoadEndMs,
  civilDayStartMs,
  civilTodayAt,
  civilUtcMs,
  parseCivilDate,
  type CivilDate
} from "./availability-time";
import { SERVICE_SELECT, toServiceDTO } from "./services.service";

/** Colonnes des cartes de la liste (VenueSummaryDTO) — ni taux, ni GPS.
 *  A4-② : la couverture est tirée en SQL (take: 1 imbriqué — jamais les 30
 *  photos pour une carte) + _count pour le signal « complétude ». */
const VENUE_SUMMARY_SELECT = {
  id: true,
  slug: true,
  cityId: true,
  nameFr: true,
  nameAr: true,
  taglineFr: true,
  taglineAr: true,
  districtFr: true,
  districtAr: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  ceremonyType: true,
  publicationStatus: true,
  // Couverture = PREMIÈRE photo par sortOrder (règle A4 verrouillée) — le
  // réordonnancement pro fait office de sélecteur de couverture.
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }] as Prisma.VenuePhotoOrderByWithRelationInput[],
    take: 1,
    select: { thumbKey: true }
  },
  _count: { select: { photos: true } }
} as const;

/** Colonnes du détail public (VenuePublicDTO) + ville et référentiel amenities. */
const VENUE_PUBLIC_SELECT = {
  id: true,
  slug: true,
  nameFr: true,
  nameAr: true,
  taglineFr: true,
  taglineAr: true,
  descriptionFr: true,
  descriptionAr: true,
  districtFr: true,
  districtAr: true,
  address: true,
  lat: true,
  lng: true,
  capacityMax: true,
  basePriceCents: true,
  bookingMode: true,
  depositRateBps: true,
  depositAmountCents: true,
  // E2d — ACTIVES seulement, dans l'ordre où le pro les a rangées.
  services: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: SERVICE_SELECT },
  status: true,
  // D45 (A6a) : A8 monte l'iframe Matterport au geste utilisateur.
  matterportModelId: true,
  city: { select: { id: true, nameFr: true, nameAr: true } },
  ceremonyType: true,
  amenities: { select: { amenity: { select: { id: true, key: true, nameFr: true, nameAr: true, icon: true } } } },
  // D65 (A13) — tri fait EN BASE par l'ordre éditorial : le mapping n'a plus à
  // décider, et il ne peut donc plus décider autrement que le référentiel.
  styles: {
    orderBy: [{ style: { sortOrder: "asc" } }, { styleId: "asc" }] as Prisma.VenueStyleLinkOrderByWithRelationInput[],
    select: { style: { select: { id: true, key: true, nameFr: true, nameAr: true, sortOrder: true } } }
  },
  // Lot A4 — galerie ordonnée (l'ordre du tableau EST l'ordre d'affichage).
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }] as Prisma.VenuePhotoOrderByWithRelationInput[],
    select: { id: true, storageKey: true, thumbKey: true, width: true, height: true, altFr: true, altAr: true }
  }
} satisfies Prisma.VenueSelect; // `satisfies` et non `as const` : ce SELECT porte
// un `orderBy` en TABLEAU, et `as const` le rendrait readonly — les types
// générés par Prisma le refusent. `satisfies` valide sans élargir les `true`.

/** Regroupe des lignes plates par identifiant de salle, en projetant chaque
 *  ligne au passage. Trois requêtes rendent trois tableaux SANS ordre par
 *  salle : sans ce regroupement, chaque salle relirait les trois tableaux
 *  entiers — quadratique dès la deuxième page. */
function groupBy<Row, Out>(
  rows: readonly Row[],
  keyOf: (row: Row) => string,
  project: (row: Row) => Out
): Map<string, Out[]> {
  const out = new Map<string, Out[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = out.get(key);
    if (bucket === undefined) out.set(key, [project(row)]);
    else bucket.push(project(row));
  }
  return out;
}

type VenueSummaryRow = Prisma.VenueGetPayload<{ select: typeof VENUE_SUMMARY_SELECT }>;
type VenuePublicRow = Prisma.VenueGetPayload<{ select: typeof VENUE_PUBLIC_SELECT }>;

/** Forme produite par slugify + suffixes de collision — tout le reste est 404
 *  AVANT la base (même court-circuit que l'uuid côté pro, A2). */
/** EXPORTÉ (B3) : l'endpoint de disponibilité résout la MÊME salle par le
 *  même slug. Un second motif, même identique aujourd'hui, finirait par
 *  diverger — et un 404 de calendrier sur une page qui, elle, s'affiche est un
 *  bug muet. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Prédicat commun D33 (le détail élargit ensuite les status admis). */
/** D33 — status admis par le DÉTAIL public, et donc par la disponibilité :
 *  TEMPORARILY_UNAVAILABLE reste consultable (bandeau A8). EXPORTÉ pour que la
 *  page détail et son calendrier ne puissent pas répondre différemment. */
export const PUBLIC_DETAIL_STATUSES = [
  VenueAvailabilityStatus.ACTIVE,
  VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE
] as const;

export const PUBLIC_BASE_WHERE = {
  publicationStatus: VenuePublicationStatus.PUBLISHED,
  deletedAt: null
} as const;

/** « Créneau qui compte » — actif, donc réservable.
 *
 *  ⚠ UNE SEULE DÉFINITION, consommée à DEUX endroits qui doivent s'accorder :
 *  le `where` qui exclut les salles sans aucun créneau (situation B) et le
 *  `findMany` qui charge les créneaux à annoter. Deux copies de ce prédicat
 *  produiraient une salle retenue par le filtre puis annotée sur zéro créneau —
 *  c'est-à-dire grisée sans raison visible. */
const ACTIVE_SLOT = { isActive: true } as const;

@Injectable()
export class VenuesPublicService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage
  ) {}

  /** Clé → URL publique, recalculée à chaque lecture (port A0). */
  private readonly urlOf = (key: string): string => this.storage.publicUrl(key);

  async list(query: VenueListQueryInput): Promise<VenueListResponse> {
    // ⚠ AVANT toute requête. Une date hors bornes ne se calcule pas : elle se
    // refuse. Écart assumé avec D49, motivé par la différence entre une
    // FENÊTRE (qui rétrécit) et un POINT (qui se déplacerait en silence si on
    // l'écrêtait) — voir `AVAILABLE_ON_PAST` et `AVAILABLE_ON_BEYOND_HORIZON`.
    //
    // ⚠ UNE SEULE LECTURE D'HORLOGE PAR REQUÊTE (D48), et les DEUX bornes en
    // dérivent. Deux `Date.now()` peuvent tomber de part et d'autre de minuit
    // à Alger : la borne basse dirait « hier » pendant que la haute compte
    // depuis « aujourd'hui ».
    const annotateOn =
      query.availableOn === undefined ? null : this.civilDateOrRefuse(query.availableOn, Date.now());

    const amenityKeys = [...new Set((query.amenities ?? "").split(",").filter((k) => k.length > 0))];
    const styleKeys = [...new Set((query.styles ?? "").split(",").filter((k) => k.length > 0))];

    const where: Prisma.VenueWhereInput = {
      ...PUBLIC_BASE_WHERE,
      status: VenueAvailabilityStatus.ACTIVE, // D33 liste : ACTIVE seul
      ...(query.cityId === undefined ? {} : { cityId: query.cityId }),
      // D36 (A9) : la salle peut accueillir ⇒ guests ≤ capacityMax. Le
      // minimum a disparu : personne ne le remplissait, il excluait des
      // salles à tort.
      ...(query.guests === undefined ? {} : { capacityMax: { gte: query.guests } }),
      // ⚠ SITUATION B — la salle n'a AUCUN créneau actif, nulle part. Elle est
      // EXCLUE, pas grisée, et seulement quand une date est demandée.
      //
      // Deux refus étaient confondus sous un seul grisé (correction Ko) :
      //  · situation A — libre ailleurs, prise CE jour-là ⇒ `false`, grisée,
      //    « essayez une autre date » est un conseil UTILE ;
      //  · situation B — jamais configurée, ou entièrement retirée ⇒ aucune
      //    date ne marchera JAMAIS. La griser inviterait à réessayer pour rien.
      //
      // ⚠ POURQUOI DANS LE `where` ET PAS APRÈS LA PAGE. Un filtrage post-
      // requête retirerait des lignes après que `count()` les a comptées :
      // `total` annoncerait 37 pour 34 salles rendues, la dernière page serait
      // vide et la pagination mentirait. Ici les DEUX requêtes du
      // `$transaction` partagent le même `where` — l'accord est structurel, il
      // n'y a rien à resynchroniser.
      //
      // ⚠ SANS `availableOn`, RIEN NE CHANGE : ces salles restent visibles. La
      // recherche non datée ne pose pas la question, elle n'a donc pas à y
      // répondre en retirant des résultats.
      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),
      ...(query.minPriceCents === undefined && query.maxPriceCents === undefined
        ? {}
        : {
            basePriceCents: {
              ...(query.minPriceCents === undefined ? {} : { gte: query.minPriceCents }),
              ...(query.maxPriceCents === undefined ? {} : { lte: query.maxPriceCents })
            }
          }),
      // D68 (A13) — les deux poignées du curseur de capacité portent sur la MÊME
      // colonne : `guests` en est le plancher (D36 inchangé), `maxCapacity` le
      // plafond. Fusionnées en un seul objet, sinon la seconde écraserait la
      // première dans le littéral.
      ...(query.guests === undefined && query.maxCapacity === undefined
        ? {}
        : {
            capacityMax: {
              ...(query.guests === undefined ? {} : { gte: query.guests }),
              ...(query.maxCapacity === undefined ? {} : { lte: query.maxCapacity })
            }
          }),
      // D66 (A13) — filtre INCLUSIF, jamais une égalité : une salle MIXED répond
      // à une demande `indoor` comme à une demande `outdoor`. `in` porte la
      // table de correspondance de @zwadj/types — une seule règle, partagée.
      ...(query.ceremonyType === undefined
        ? {}
        : { ceremonyType: { in: CEREMONY_TYPE_MATCHES[query.ceremonyType] } }),
      // D65 (A13) — sémantique OU, à la différence des équipements juste en
      // dessous : cocher Jardin ET Bord de mer demande les deux listes, pas leur
      // intersection (presque toujours vide). Un style est un goût, un
      // équipement est une exigence.
      ...(styleKeys.length === 0 ? {} : { styles: { some: { style: { key: { in: styleKeys } } } } }),
      // Sémantique ET : la salle doit posséder CHAQUE clé demandée.
      ...(amenityKeys.length === 0
        ? {}
        : { AND: amenityKeys.map((key) => ({ amenities: { some: { amenity: { key } } } })) })
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where,
        orderBy: this.orderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: VENUE_SUMMARY_SELECT
      }),
      this.prisma.venue.count({ where })
    ]);

    // ⚠ APRÈS la page, et bornée par les salles de la page : c'est ce qui rend
    // l'annotation O(page) et non O(catalogue). Le tri, la pagination et le
    // `total` ne changent PAS — annoter n'est pas filtrer.
    const availability = annotateOn === null ? new Map<string, boolean | null>() : await this.annotatePage(rows, annotateOn);

    return {
      items: rows.map((row) => this.toSummary(row, availability)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      // ÉCHO : l'appelant ne doit jamais PRÉSUMER la date sur laquelle porte
      // l'annotation, pas plus qu'il ne présume les bornes de D49.
      availableOn: query.availableOn ?? null
    };
  }

  /**
   * Date civile validée par Zod (forme + existence) → date civile PAS ENCORE
   * PASSÉE à Alger, ou 400.
   *
   * ⚠ C'EST ICI, ET PAS DANS LE SCHÉMA. Le passé dépend de `Date.now()` : mis
   * dans Zod, il rendrait `venueListQuerySchema` non déterministe pour tous ses
   * autres appelants — dont les tests, qui deviendraient sensibles à l'heure de
   * leur exécution. Le service est déjà le seul endroit du dépôt autorisé à
   * lire l'horloge (D48).
   *
   * ⚠ UN SEUL appel à l'horloge. Deux pourraient tomber de part et d'autre de
   * minuit et faire refuser une date que la requête vient d'accepter.
   *
   * ⚠ AUJOURD'HUI EST ACCEPTÉ. Le cas réel à faire passer avant d'écrire la
   * borne (D55) : un couple qui cherche une salle *pour ce soir*. `<` et non
   * `<=` — l'inverse refuserait la date la plus demandée de la journée.
   */
  /** Les DEUX bornes du point demandé, dérivées d'un seul instant (D227). */
  private civilDateOrRefuse(value: string, nowMs: number): CivilDate {
    // Zod a garanti la forme ET l'existence (`isRealCivilDate`) : ce `parse` ne
    // peut plus rendre `null`. Le `??` n'est donc pas une branche vivante, il
    // empêche seulement un `as CivilDate` qui mentirait au prochain lecteur.
    const date = parseCivilDate(value);
    if (date === null) this.throwAvailableOnPast();

    const aujourdhui = civilTodayAt(nowMs);
    if (civilUtcMs(date) < civilUtcMs(aujourdhui)) this.throwAvailableOnPast();

    // D227 — idiome relevé de `visit-bookings.service.ts`, qui refuse déjà un
    // POINT hors horizon ; `BOOKING_HORIZON_MONTHS` est la MÊME constante, pas
    // une seconde valeur à faire diverger.
    // ⚠ Le jour de l'horizon LUI-MÊME est accepté (`>`, pas `>=`), exactement
    // comme aujourd'hui l'est en bas (`<`, pas `<=`) : les deux bornes sont
    // INCLUSES, et une salle réservable ce jour-là doit pouvoir être annotée.
    const horizon = addMonthsCivil(aujourdhui, BOOKING_HORIZON_MONTHS);
    if (civilUtcMs(date) > civilUtcMs(horizon)) this.throwAvailableOnBeyondHorizon();

    return date;
  }

  /**
   * Salle → « reste-t-il un créneau libre ce jour-là ? », pour les salles de LA
   * PAGE et elles seules.
   *
   * ⚠ TROIS REQUÊTES, PAS TROIS PAR SALLE. `venueId: { in: … }` les rend
   * collectives sans en ajouter une : douze salles coûtent le même nombre
   * d'allers-retours qu'une seule.
   *
   * ⚠ AUCUNE REQUÊTE DE FÉRIÉS. Les fériés ne déplacent que le PRIX, jamais la
   * disponibilité — et l'annotation ne dit rien d'un prix. La quatrième requête
   * du calendrier d'une salle n'a pas lieu d'être ici.
   */
  private async annotatePage(
    rows: readonly VenueSummaryRow[],
    date: CivilDate
  ): Promise<Map<string, boolean | null>> {
    const out = new Map<string, boolean | null>();
    const venueIds = rows.map((row) => row.id);
    if (venueIds.length === 0) return out;

    const dayStartMs = civilDayStartMs(date);
    // ⚠ PAS « minuit + 24 h ». Voir `civilDayLoadEndMs` : sans les 48 h, une
    // réservation de 00h30 le lendemain ne serait pas chargée, et la soirée
    // 20h→02h — le cas NORMAL d'un mariage algérien — serait annoncée libre.
    const dayEndMs = civilDayLoadEndMs(date);

    const [slotRows, bookingRows, blockRows] = await Promise.all([
      // Pas d'`orderBy` : on teste une EXISTENCE (« au moins un créneau
      // libre »), et un tri ne changerait pas la réponse. En ajouter un ferait
      // croire que l'ordre porte un sens ici.
      this.prisma.slotTemplate.findMany({
        where: { venueId: { in: venueIds }, ...ACTIVE_SLOT },
        select: { id: true, venueId: true, startMinutes: true, endMinutes: true }
      }),
      // ⚠ `PENDING` n'est PAS chargé (D101, arbitrage Ko). Ne pas le charger
      // est plus sûr que le filtrer plus loin : un filtre s'oublie au prochain
      // remaniement, une requête qui ne le demande pas ne peut pas le laisser
      // passer.
      this.prisma.booking.findMany({
        where: {
          venueId: { in: venueIds },
          status: { in: [...HARD_BOOKING_STATUSES] },
          startsAt: { lt: new Date(dayEndMs) },
          endsAt: { gt: new Date(dayStartMs) }
        },
        select: { venueId: true, startsAt: true, endsAt: true, slotTemplateId: true }
      }),
      this.prisma.availabilityBlock.findMany({
        where: {
          venueId: { in: venueIds },
          blockedFrom: { lt: new Date(dayEndMs) },
          blockedUntil: { gt: new Date(dayStartMs) }
        },
        select: { venueId: true, blockedFrom: true, blockedUntil: true }
      })
    ]);

    const slotsByVenue = groupBy(slotRows, (row) => row.venueId, (row) => ({
      id: row.id,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes
    }));
    const bookingsByVenue = groupBy(bookingRows, (row) => row.venueId, (row) => ({
      startMs: row.startsAt.getTime(),
      endMs: row.endsAt.getTime(),
      slotTemplateId: row.slotTemplateId,
      // Toujours `true` : seuls ACCEPTED et CONFIRMED ont été chargés. Écrit en
      // toutes lettres plutôt que déduit d'un statut qu'on ne sélectionne même
      // pas — le jour où la requête changerait, cette ligne devrait changer.
      hard: true
    }));
    const blocksByVenue = groupBy(blockRows, (row) => row.venueId, (row) => ({
      startMs: row.blockedFrom.getTime(),
      endMs: row.blockedUntil.getTime()
    }));

    for (const row of rows) {
      const slots: SlotForStatus[] = slotsByVenue.get(row.id) ?? [];
      // ⚠ `slots` NE PEUT PLUS ÊTRE VIDE ici : le `where` de `list()` a exclu
      // les salles sans créneau actif (situation B). La branche qui rendait
      // `null` a donc disparu — une branche morte laissée « au cas où » ferait
      // croire au prochain lecteur que le cas est encore atteignable.
      //
      // ⚠ SAUF COURSE : le pro peut désactiver son dernier créneau ENTRE la
      // requête de page et celle-ci. `.some()` sur un tableau vide rend alors
      // `false` — la salle apparaît grisée le temps d'un rafraîchissement.
      // Issue bénigne et transitoire, préférée à une exception sur un chemin de
      // lecture public.
      const statuses = computeDaySlotStatuses({
        dayStartMs,
        slots,
        bookings: (bookingsByVenue.get(row.id) ?? []) as BookingWindow[],
        blocks: (blocksByVenue.get(row.id) ?? []) as Interval[],
        // SINGLE_SLOT : une réservation dure sur n'importe quel créneau ferme
        // la journée entière. Le moteur porte cette règle, pas ce service.
        singleSlot: row.bookingMode === "SINGLE_SLOT"
      });
      out.set(row.id, statuses.some((entry) => entry.status === "AVAILABLE"));
    }
    return out;
  }

  async bySlug(slug: string): Promise<VenuePublicDTO> {
    if (!SLUG_PATTERN.test(slug)) this.throwNotFound();
    const row = await this.prisma.venue.findFirst({
      where: {
        slug,
        ...PUBLIC_BASE_WHERE,
        // D33 détail : TEMPORARILY_UNAVAILABLE reste visible (bandeau A8).
        status: { in: [...PUBLIC_DETAIL_STATUSES] }
      },
      select: VENUE_PUBLIC_SELECT
    });
    if (!row) this.throwNotFound();
    return this.toPublicDTO(row);
  }

  /** Arbitrage A3-② : prix ou fraîcheur (défaut) ; le composite « complétude »
   *  attend A4 (son signal principal, les photos, n'existe pas encore).
   *  Tiebreak par id (uuidv7 ≈ ordre de création) : pagination déterministe. */
  private orderBy(sort: VenueListQueryInput["sort"]): Prisma.VenueOrderByWithRelationInput[] {
    switch (sort) {
      case "price_asc":
        return [{ basePriceCents: "asc" }, { id: "asc" }];
      case "price_desc":
        return [{ basePriceCents: "desc" }, { id: "asc" }];
      case "recent":
        return [{ updatedAt: "desc" }, { id: "asc" }];
    }
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  /** 400 EXPLICITE, jamais une page « aucune salle disponible ». La différence
   *  compte : « personne n'est libre ce jour-là » invite à changer de date,
   *  « cette date est passée » dit qu'il n'y avait rien à demander. */
  private throwAvailableOnPast(): never {
    throw new BadRequestException({
      code: VenueErrorCode.AVAILABLE_ON_PAST,
      message: "venue.errors.availableOnPast"
    });
  }

  /** 400 EXPLICITE, et un code DISTINCT du précédent (D227). Les deux refus
   *  sont métier, mais ils n'appellent pas la même action : « cette date est
   *  passée » dit de regarder devant, « nous n'ouvrons pas encore si loin »
   *  dit de se rapprocher. Un code unique aurait forcé l'écran à en choisir
   *  un — faux une fois sur deux. */
  private throwAvailableOnBeyondHorizon(): never {
    throw new BadRequestException({
      code: VenueErrorCode.AVAILABLE_ON_BEYOND_HORIZON,
      message: "venue.errors.availableOnBeyondHorizon"
    });
  }

  private toSummary(row: VenueSummaryRow, availability: ReadonlyMap<string, boolean | null>): VenueSummaryDTO {
    return {
      id: row.id,
      slug: row.slug,
      cityId: row.cityId,
      nameFr: row.nameFr,
      nameAr: row.nameAr,
      taglineFr: row.taglineFr,
      taglineAr: row.taglineAr,
      districtFr: row.districtFr,
      districtAr: row.districtAr,
      capacityMax: row.capacityMax,
      basePriceCents: row.basePriceCents,
      bookingMode: row.bookingMode,
      ceremonyType: row.ceremonyType,
      publicationStatus: row.publicationStatus,
      coverThumbUrl: row.photos[0] === undefined ? null : this.urlOf(row.photos[0].thumbKey),
      photoCount: row._count.photos,
      // `??` et non `.get()` nu : une carte vide (question non posée) doit
      // rendre `null`, pas `undefined` — le contrat annonce `boolean | null`.
      availableOnDate: availability.get(row.id) ?? null
    };
  }

  private toPublicDTO(row: VenuePublicRow): VenuePublicDTO {
    return {
      id: row.id,
      slug: row.slug,
      nameFr: row.nameFr,
      nameAr: row.nameAr,
      taglineFr: row.taglineFr,
      taglineAr: row.taglineAr,
      descriptionFr: row.descriptionFr,
      descriptionAr: row.descriptionAr,
      districtFr: row.districtFr,
      districtAr: row.districtAr,
      address: row.address,
      lat: row.lat === null ? null : row.lat.toNumber(),
      lng: row.lng === null ? null : row.lng.toNumber(),
      capacityMax: row.capacityMax,
      basePriceCents: row.basePriceCents,
      bookingMode: row.bookingMode,
      depositRateBps: row.depositRateBps,
      depositAmountCents: row.depositAmountCents,
      status: row.status,
      city: row.city,
      amenities: row.amenities
        .map((link) => link.amenity)
        .sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr")),
      ceremonyType: row.ceremonyType,
      // Déjà trié par la requête (ordre éditorial) — aucun second tri ici.
      styles: row.styles.map((link) => link.style),
      photos: row.photos.map((p) => ({
        id: p.id,
        url: this.urlOf(p.storageKey),
        thumbUrl: this.urlOf(p.thumbKey),
        width: p.width,
        height: p.height,
        altFr: p.altFr,
        altAr: p.altAr
      })),
      matterportModelId: row.matterportModelId,
      services: row.services.map(toServiceDTO)
    };
  }
}
