import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logging structuré (pino)
  app.useLogger(app.get(Logger));

  // Préfixe /api/v1, cookies (D2), pipe Zod global, filtre d'exceptions —
  // partagés avec les tests d'intégration via app.setup.ts.
  // NOTE prod : derrière un reverse proxy, activer trust proxy pour que le
  // rate-limiting voie la vraie IP (X-Forwarded-For) — Phase 13/déploiement.
  configureApp(app);

  // CORS restreint aux fronts connus (env CORS_ORIGINS)
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.get<string[]>("CORS_ORIGINS"), credentials: true });

  // OpenAPI/Swagger auto-généré — http://localhost:3001/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Zwadj API")
    .setDescription("API de la marketplace Zwadj (MVP) — documentation générée automatiquement.")
    .setVersion("0.1.0")
    .addBearerAuth() // routes marquées @ApiBearerAuth (ex. GET /auth/me) — bouton « Authorize »
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("PORT") ?? 3001;
  await app.listen(port);
}

void bootstrap();
