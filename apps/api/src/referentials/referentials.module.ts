// Module des référentiels publics (Flux A, Lot A1) — lecture seule ; le
// contenu est alimenté par prisma/seed.ts, jamais par un endpoint.
import { Module } from "@nestjs/common";
import { ReferentialsController } from "./referentials.controller";
import { ReferentialsService } from "./referentials.service";

@Module({
  controllers: [ReferentialsController],
  providers: [ReferentialsService]
})
export class ReferentialsModule {}
