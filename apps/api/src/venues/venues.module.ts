// Module Venue (Flux A + B). Six contrôleurs (Lots A2 + A3 + A4 + B3) :
// pro (CRUD, ownership), admin (publication + taux D35), public (lecture D33),
// médias (photos ; la visite virtuelle Matterport est une colonne, D45).
// MediaModule importé pour le port MEDIA_STORAGE : uploads (écriture d'objets)
// ET lectures (publicUrl recalculée dans chaque mapper — les clés seules
// vivent en base).
import { Module } from "@nestjs/common";
import { AvailabilityBlocksController } from "./availability-blocks.controller";
import { AvailabilityBlocksService } from "./availability-blocks.service";
import { AvailabilityController } from "./availability.controller";
import { BookingNotificationsService } from "./booking-notifications.service";
import { BookingsController } from "./bookings.controller";
import { BookingsProController } from "./bookings-pro.controller";
import { BookingsService } from "./bookings.service";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
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
    ServicesService,
    QuotesService
  ],
  exports: [VenuesService]
})
export class VenuesModule {}
