// Référentiels publics (Flux A, Lot A1) : consommés par l'UI de recherche
// anonyme (A7 : filtres ville/équipements) et le formulaire Pro (A5).
// @Public() SANS @SkipThrottle() — contrairement à /media/:key (des dizaines
// d'<img> par page), c'est UN appel par chargement : la limite globale
// 100/min/IP ne gêne aucun usage légitime et reste une protection utile.
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AmenityDTO, WilayaDTO } from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { ReferentialsService } from "./referentials.service";

@ApiTags("referentiels")
@Public()
@Controller()
export class ReferentialsController {
  constructor(private readonly referentials: ReferentialsService) {}

  @Get("wilayas")
  @ApiOperation({ summary: "Wilayas avec leurs villes seedées" })
  @ApiOkResponse({
    description:
      "Les 58 wilayas (tri : code officiel croissant), chacune avec ses villes " +
      "(tri : nameFr). Au Lot A1, seule Alger (16) a des villes — les autres renvoient []."
  })
  listWilayas(): Promise<WilayaDTO[]> {
    return this.referentials.listWilayas();
  }

  @Get("amenities")
  @ApiOperation({ summary: "Équipements filtrables (Amenity)" })
  @ApiOkResponse({
    description: "Les équipements (tri : nameFr) — clé stable pour les filtres, icône lucide."
  })
  listAmenities(): Promise<AmenityDTO[]> {
    return this.referentials.listAmenities();
  }
}
