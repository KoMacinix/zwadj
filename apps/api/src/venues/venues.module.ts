// Module Venue (Flux A + B). Six contrôleurs (Lots A2 + A3 + A4 + B3) :
// pro (CRUD, ownership), admin (publication + taux D35), public (lecture D33),
// médias (photos ; la visite virtuelle Matterport est une colonne, D45).
// MediaModule importé pour le port MEDIA_STORAGE : uploads (écriture d'objets)
// ET lectures (publicUrl recalculée dans chaque mapper — les clés seules
// vivent en base).
import { Module } from "@nestjs/common";
import { AvailabilityBlocksController } from "./availability-blocks.controller";
import { AvailabilityBlocksService } from "./availability-blocks.service";
import { AvailabilityController, AvailabilityProController } from "./availability.controller";
import { BookingNotificationsService } from "./booking-notifications.service";
import { DomainEvents } from "./domain-events";
import { NotificationSubscriptions } from "./notification-subscriptions";
import { PrismaBookingLocks } from "./booking-locks.prisma";
import { BOOKING_LOCKS } from "./booking-locks.types";
import { BookingsController } from "./bookings.controller";
import { BookingsProController } from "./bookings-pro.controller";
import { BookingsService } from "./bookings.service";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { PrismaQuoteStore } from "./quote-store.prisma";
import { QUOTE_STORE } from "./quote-store.types";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";
import { VisitBookingsController } from "./visit-bookings.controller";
import { VisitBookingsService } from "./visit-bookings.service";
import { VisitNotificationsService } from "./visit-notifications.service";
import { VisitSlotsController } from "./visit-slots.controller";
import { VisitSlotsService } from "./visit-slots.service";
import { VisitAvailabilitiesController } from "./visit-availabilities.controller";
import { VisitAvailabilitiesService } from "./visit-availabilities.service";
import { AvailabilityService } from "./availability.service";
import { MediaModule } from "../media/media.module";
import { VenueMediaController } from "./venue-media.controller";
import { VenueMediaService } from "./venue-media.service";
import { VenuesAdminController } from "./venues-admin.controller";
import { VenuesAdminService } from "./venues-admin.service";
import { VenuesPublicController } from "./venues-public.controller";
import { VenuesPublicService } from "./venues-public.service";
import { PricingRulesController } from "./pricing-rules.controller";
import { PricingRulesService } from "./pricing-rules.service";
import { SlotTemplatesController } from "./slot-templates.controller";
import { SlotTemplatesService } from "./slot-templates.service";
import { VenuesController } from "./venues.controller";
import { VenuesService } from "./venues.service";
import { PrismaReferentielsExistence, PrismaVenueStore } from "./venue-store.prisma";
import { REFERENTIELS_EXISTENCE, VENUE_STORE } from "./venue-store.types";

@Module({
  imports: [MediaModule],
  controllers: [
    VenuesController,
    VenueMediaController,
    SlotTemplatesController,
    PricingRulesController,
    VenuesAdminController,
    VenuesPublicController,
    AvailabilityController,
    // ⚠ Leçon R1 : un contrôleur écrit mais non enregistré ne répond à rien, et
    // les six portes passent quand même. On le déclare dans le même geste.
    AvailabilityProController,
    AvailabilityBlocksController,
    VisitAvailabilitiesController,
    VisitSlotsController,
    VisitBookingsController,
    BookingsController,
    BookingsProController,
    ServicesController,
    QuotesController
  ],
  providers: [
    // ⛔ S10a — LES DEUX PORTS SALLE. Le service ne reçoit plus `PrismaService` :
    // c'est ici, et seulement ici, qu'on décide que la persistance est Prisma.
    { provide: VENUE_STORE, useClass: PrismaVenueStore },
    { provide: REFERENTIELS_EXISTENCE, useClass: PrismaReferentielsExistence },
    // ⛔ S10b-1 — le cycle de vie du devis. `convert()` reste sur Prisma :
    // il écrit dans `bookings`, sur le chemin de l'argent (S10b-2).
    { provide: QUOTE_STORE, useClass: PrismaQuoteStore },

    VenuesService,
    VenueMediaService,
    SlotTemplatesService,
    PricingRulesService,
    VenuesAdminService,
    VenuesPublicService,
    AvailabilityService,
    AvailabilityBlocksService,
    VisitAvailabilitiesService,
    VisitSlotsService,
    VisitBookingsService,
    VisitNotificationsService,
    BookingsService,
    BookingNotificationsService,
    DomainEvents,
    // ⚠ INSTANCIÉ POUR SON EFFET DE BORD : `onModuleInit` pose la table de
    // routage. Sans cette ligne, les événements partent dans le vide — et
    // silencieusement, puisque publier sans abonné ne lève pas.
    NotificationSubscriptions,
    // ⚠ L'ADAPTATEUR EST LE SEUL À OUVRIR UNE TRANSACTION sur ce chemin. Le
    // service reçoit le port : il ne peut plus, même par accident, poser un
    // verrou ou traduire une erreur PostgreSQL.
    { provide: BOOKING_LOCKS, useClass: PrismaBookingLocks },
    ServicesService,
    QuotesService
  ],
  exports: [VenuesService]
})
export class VenuesModule {}
