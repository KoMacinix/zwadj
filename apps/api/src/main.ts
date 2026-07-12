import "reflect-metadata";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";

import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logging structuré (pino)
  app.useLogger(app.get(Logger));

  // Cookies (D2) : le refresh token transite en cookie httpOnly — parser requis.
  // NOTE prod : derrière un reverse proxy, activer trust proxy pour que le
  // rate-limiting voie la vraie IP (X-Forwarded-For) — Phase 13/déploiement.
  app.use(cookieParser());

  // Préfixe global — toutes les routes sous /api/v1 (backlog Phase 4)
  app.setGlobalPrefix("api/v1");

  // Pipe de validation global — Zod (AGENTS.md), pass-through tant qu'aucun
  // schéma n'est attaché ; les routes des tranches suivantes fourniront leurs
  // schémas (`@Body(new ZodValidationPipe(schema))`).
  app.useGlobalPipes(new ZodValidationPipe());

  // Filtre d'exceptions global — réponses d'erreur normalisées
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS restreint aux fronts connus (env CORS_ORIGINS)
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string[]>("CORS_ORIGINS"), credentials: true });

  // OpenAPI/Swagger auto-généré — http://localhost:3001/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Zwadj API")
    .setDescription("API de la marketplace Zwadj (MVP) — documentation générée automatiquement.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("PORT") ?? 3001;
  await app.listen(port);
}

void bootstrap();
