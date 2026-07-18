import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { EmailModule } from "./common/email/email.module";
import { ConfigModule } from "./config/config.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
        transport:
          process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty", options: { singleLine: true } },
        redact: ["req.headers.authorization", "req.headers.cookie"]
      }
    }),
    // Primitive rate-limiting (backlog Phase 4, réutilisée par l'auth puis le
    // domaine) : défaut global généreux 100 req/min/IP ; les endpoints /auth
    // poseront leurs limites strictes par route au Lot 1 (@Throttle).
    // Stockage mémoire : suffisant mono-instance au MVP (multi-instance ⇒
    // storage partagé, décision Phase 13).
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 100 }]
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    HealthModule
  ],
  providers: [
    // Guards GLOBAUX — l'ordre d'enregistrement EST l'ordre d'exécution (D6) :
    // 1. Throttler : le rate-limiting s'applique aussi aux routes publiques
    //    (login/register sont précisément les plus attaquées) ;
    // 2. JwtAuthGuard : fermé par défaut, @Public() pour ouvrir ;
    // 3. RolesGuard : lit request.user posé par le guard précédent.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
