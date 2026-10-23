// Module de la FICHE CLIENT d'un pro — rang 41 (D336, L35-4 amendé).
//
// ⚠ Leçon R1 : un contrôleur écrit mais non enregistré ne répond à rien, et les portes passent quand même — `AppModule` l'importe dans le même geste.
// `PrismaModule` est `@Global()` : rien à importer pour `PrismaService`.
import { Module } from "@nestjs/common";
import { ProClientsController } from "./pro-clients.controller";
import { ProClientsService } from "./pro-clients.service";
import { PrismaProClientStore } from "./pro-client-store.prisma";
import { PRO_CLIENT_STORE } from "./pro-client-store.types";

@Module({
  controllers: [ProClientsController],
  providers: [ProClientsService, { provide: PRO_CLIENT_STORE, useClass: PrismaProClientStore }]
})
export class ProClientsModule {}
