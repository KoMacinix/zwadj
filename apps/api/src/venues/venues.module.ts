// Module Venue (Flux A). Trois surfaces, trois contrôleurs (Lots A2 + A3) :
// pro (CRUD, ownership), admin (publication + taux D35), public (lecture D33).
// Les médias (A4) s'y ajouteront sans toucher à ces trois-là.
import { Module } from "@nestjs/common";
import { VenuesAdminController } from "./venues-admin.controller";
import { VenuesAdminService } from "./venues-admin.service";
import { VenuesPublicController } from "./venues-public.controller";
import { VenuesPublicService } from "./venues-public.service";
import { VenuesController } from "./venues.controller";
import { VenuesService } from "./venues.service";

@Module({
  controllers: [VenuesController, VenuesAdminController, VenuesPublicController],
  providers: [VenuesService, VenuesAdminService, VenuesPublicService],
  exports: [VenuesService]
})
export class VenuesModule {}
