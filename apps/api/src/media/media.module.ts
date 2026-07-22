// Module médias (Flux A, Lot A0) : fournit le port MEDIA_STORAGE (adapter
// disque, racine résolue depuis MEDIA_DISK_ROOT) + la route de service dev.
// Les lots A4+ importeront ce module pour déposer/supprimer des objets.
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolve } from "node:path";
import { DiskStorageAdapter } from "./disk-storage.adapter";
import { MediaController } from "./media.controller";
import { MEDIA_STORAGE } from "./media.types";

@Module({
  controllers: [MediaController],
  providers: [
    {
      provide: MEDIA_STORAGE,
      useFactory: (config: ConfigService) =>
        new DiskStorageAdapter(resolve(process.cwd(), config.get<string>("MEDIA_DISK_ROOT", "var/media"))),
      inject: [ConfigService]
    }
  ],
  exports: [MEDIA_STORAGE]
})
export class MediaModule {}
