import { Module } from "@nestjs/common";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Lot 0 : fondations seulement — services injectables, aucun endpoint.
 * Le contrôleur /auth, AuthService et le câblage JwtModule arrivent au Lot 1/2.
 */
@Module({
  providers: [PasswordService, TokenService],
  exports: [PasswordService, TokenService]
})
export class AuthModule {}
