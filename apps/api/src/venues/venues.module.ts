// Module Venue (Flux A). Quatre contrôleurs (Lots A2 + A3 + A4) :
// pro (CRUD, ownership), admin (publication + taux D35), public (lecture D33),
// médias (photos ; la visite virtuelle Matterport est une colonne, D45).
// MediaModule importé pour le port MEDIA_STORAGE : uploads (écriture d'objets)
// ET lectures (publicUrl recalculée dans chaque mapper — les clés seules
// vivent en base).
import { Module } from "@nestjs/common";
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
    VenuesPublicController
  ],
  providers: [
    VenuesService,
    VenueMediaService,
    SlotTemplatesService,
    PricingRulesService,
    VenuesAdminService,
    VenuesPublicService
  ],
  exports: [VenuesService]
})
export class VenuesModule {}
