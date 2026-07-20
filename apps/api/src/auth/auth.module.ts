import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthEmailsService } from "./auth-emails.service";
import { AuthService } from "./auth.service";
import { GoogleAuthLibraryVerifier } from "./google-verifier";
import { GOOGLE_TOKEN_VERIFIER } from "./google.types";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordService } from "./password.service";
import { RolesGuard } from "./roles.guard";
import { TokenService } from "./token.service";

@Module({
  imports: [
    // Câblage @nestjs/jwt (Lot 2, D4) : HS256, secret + TTL depuis l'ENV
    // VALIDÉ (jamais process.env direct). Signature et vérification partagent
    // cette unique config — impossible de les désynchroniser.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          // La regex du schéma env (^\d+(s|m|h|d)$) garantit un format valide ;
          // le type `StringValue` de la lib n'est juste pas inférable depuis string.
          expiresIn: config.getOrThrow<string>("JWT_ACCESS_TTL") as JwtSignOptions["expiresIn"]
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthEmailsService,
    PasswordService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    // Lot 8 : port → adapter réel google-auth-library. Les tests d'intégration
    // substituent une table idToken → payload via overrideProvider (patron
    // EMAIL_SENDER) — Google n'est jamais joint depuis la suite de tests.
    { provide: GOOGLE_TOKEN_VERIFIER, useClass: GoogleAuthLibraryVerifier }
  ],
  // JwtModule exporté : les APP_GUARD déclarés dans app.module (contexte racine)
  // doivent pouvoir résoudre JwtService.
  exports: [PasswordService, TokenService, JwtModule]
})
export class AuthModule {}
