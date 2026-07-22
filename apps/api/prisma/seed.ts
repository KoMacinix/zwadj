// Premier seed du repo (Flux A, Lot A1) — RÉFÉRENTIELS uniquement : wilayas,
// communes d'Alger, équipements. IDEMPOTENT : upsert par clé naturelle
// (Wilaya.code · City (wilayaId, nameFr) · Amenity.key) — ré-exécuter
// converge vers l'état des fichiers seed-data/ sans jamais dupliquer ; une
// ligne mutée en base est restaurée. Un échec partiel se rejoue sans dégât.
//
// Exécution CLI : `pnpm db:seed` (→ `prisma db seed` → `tsx prisma/seed.ts`,
// câblé dans prisma.config.ts — Prisma 7 ne lit plus package.json#prisma).
// Les tests d'intégration IMPORTENT seed() et lui passent leur PrismaService :
// le code testé est exactement celui exécuté en CLI, jamais une copie.
import "dotenv/config"; // no-op si l'env est déjà posée (dotenv n'écrase jamais)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AMENITIES } from "./seed-data/amenities";
import { CITIES } from "./seed-data/cities";
import { WILAYAS } from "./seed-data/wilayas";

export interface SeedSummary {
  wilayas: number;
  cities: number;
  amenities: number;
}

export async function seed(prisma: PrismaClient): Promise<SeedSummary> {
  // 1. Wilayas — clé naturelle : code officiel. La map code→id sert ensuite à
  //    résoudre le rattachement des villes sans re-requêter.
  const wilayaIdByCode = new Map<number, string>();
  for (const w of WILAYAS) {
    const row = await prisma.wilaya.upsert({
      where: { code: w.code },
      create: { code: w.code, nameFr: w.nameFr, nameAr: w.nameAr },
      update: { nameFr: w.nameFr, nameAr: w.nameAr }
    });
    wilayaIdByCode.set(row.code, row.id);
  }

  // 2. Villes — clé naturelle : (wilayaId, nameFr), contrainte UNIQUE réelle
  //    depuis la migration city_natural_key.
  for (const c of CITIES) {
    const wilayaId = wilayaIdByCode.get(c.wilayaCode);
    if (wilayaId === undefined) {
      throw new Error(`Ville « ${c.nameFr} » : wilaya ${c.wilayaCode} absente de seed-data/wilayas.ts`);
    }
    await prisma.city.upsert({
      where: { wilayaId_nameFr: { wilayaId, nameFr: c.nameFr } },
      create: { wilayaId, nameFr: c.nameFr, nameAr: c.nameAr, lat: c.lat, lng: c.lng },
      update: { nameAr: c.nameAr, lat: c.lat, lng: c.lng }
    });
  }

  // 3. Équipements — clé naturelle : key.
  for (const a of AMENITIES) {
    await prisma.amenity.upsert({
      where: { key: a.key },
      create: { key: a.key, nameFr: a.nameFr, nameAr: a.nameAr, icon: a.icon },
      update: { nameFr: a.nameFr, nameAr: a.nameAr, icon: a.icon }
    });
  }

  return { wilayas: WILAYAS.length, cities: CITIES.length, amenities: AMENITIES.length };
}

/* Entrée CLI — jamais déclenchée à l'import (les specs d'intégration passent
 * par seed() directement). Les typeof protègent le contexte ESM des tests
 * (vitest/swc) où `require`/`module` n'existent pas : y référencer l'un des
 * deux sans garde serait une ReferenceError à l'évaluation du module. */
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquante (apps/api/.env) — impossible de seeder.");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  seed(prisma)
    .then((s) => {
      console.log(`Seed OK — ${s.wilayas} wilayas, ${s.cities} villes, ${s.amenities} équipements (idempotent).`);
    })
    .catch((error: unknown) => {
      console.error("Seed en échec :", error);
      process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
}
