// Service des médias en dev/MVP (adapter disque) — Lot A0. En prod S3/CDN,
// cette route ne servira simplement plus d'URL : les publicUrl() de l'adapter
// prod pointeront ailleurs, sans toucher aux consommateurs.
import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Inject } from "@nestjs/common";
import { Public } from "../auth/auth.decorators";
import { MEDIA_STORAGE, isValidMediaKey, type MediaStorage } from "./media.types";

@Public() // des <img> : aucun Bearer à présenter
@SkipThrottle() // une page détail = des dizaines d'images ; le cache immutable
// fait le travail de protection — le throttle global 100/min casserait la
// navigation normale bien avant de gêner un attaquant sur des GET statiques.
@Controller("media")
export class MediaController {
  constructor(@Inject(MEDIA_STORAGE) private readonly storage: MediaStorage) {}

  @Get(":key")
  async serve(@Param("key") key: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    // Clé hors motif = 404 sec, identique à l'objet absent : la forme des clés
    // valides n'est pas une information à distribuer.
    if (!isValidMediaKey(key)) throw new NotFoundException();
    const object = await this.storage.get(key);
    if (!object) throw new NotFoundException();
    res.setHeader("Content-Type", object.contentType);
    // Les clés sont uniques par contenu (jamais ré-écrites avec un autre
    // visuel) : cache fort et immuable, côté navigateur comme futur CDN.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return new StreamableFile(object.body);
  }
}
