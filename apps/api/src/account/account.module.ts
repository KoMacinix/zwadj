import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccountAdminController } from "./account-admin.controller";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountEmailsService } from "./account-emails.service";
import { AccountPublicController } from "./account-public.controller";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

/**
 * Lot A10 — compte utilisateur. Trois contrôleurs, patron `VenuesModule` :
 * `/me` (session), `/auth/confirm-email-change` (public, token) et
 * `/admin/deletion-requests` (ADMIN).
 *
 * `AuthModule` est importé pour `PasswordService` / `TokenService` (déjà
 * exportés) et pour `AuthService`, dont `me()` sert à répondre le même
 * `AuthUserDTO` que partout ailleurs après une mutation de profil.
 */
@Module({
  imports: [AuthModule],
  controllers: [AccountController, AccountPublicController, AccountAdminController],
  providers: [AccountService, AccountDeletionService, AccountEmailsService]
})
export class AccountModule {}
