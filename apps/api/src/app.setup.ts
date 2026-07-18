import { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";

/**
 * Configuration d'application PARTAGÉE entre le bootstrap réel (main.ts) et
 * les tests d'intégration — garantit que les tests exercent exactement les
 * mêmes préfixe/pipes/filtres/cookies que la prod.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}
