// Prisma 7 : la configuration (URL, chemins) vit ici — plus dans schema.prisma.
// ⚠ Prisma 7 ne charge PLUS .env automatiquement → import explicite de dotenv.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Lot A1 : Prisma 7 ne lit plus package.json#prisma — la commande de seed
    // vit ici. tsx exécute le TS directement, aucun build préalable requis.
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
