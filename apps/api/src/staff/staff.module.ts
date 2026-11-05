// Module de la COUCHE DU PERSONNEL — rang 44, L36-3a-1 (D341).
//
// ⚠ Leçon R1 : un contrôleur écrit mais non enregistré ne répond à rien, et les portes passent quand même — `AppModule` l'importe dans le même geste (garde de source : `staff-source-guards.spec.ts`).
// ⚠ `STAFF_STORE` est EXPORTÉ : le quatrième garde global est déclaré dans `AppModule` (contexte racine, comme `JwtAuthGuard`), il doit pouvoir résoudre le magasin.
// `PrismaModule` est `@Global()` : rien à importer pour `PrismaService`. `AuthModule` exporte `PasswordService` et `TokenService`.
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StaffSessionController } from "./staff-session.controller";
import { StaffSessionService } from "./staff-session.service";
import { PrismaStaffStore } from "./staff-store.prisma";
import { STAFF_STORE } from "./staff-store.types";

@Module({
  imports: [AuthModule],
  controllers: [StaffSessionController],
  providers: [StaffSessionService, { provide: STAFF_STORE, useClass: PrismaStaffStore }],
  exports: [STAFF_STORE]
})
export class StaffModule {}
