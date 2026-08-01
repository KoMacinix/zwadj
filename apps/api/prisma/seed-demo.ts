// Salles de DÉMONSTRATION (UI-D4) — six salles publiées, pour juger le rendu de
// la recherche sur autre chose qu'une grille vide.
//
// ⚠ SÉPARÉ de `seed.ts`, et il doit le rester. `seed.ts` pose des RÉFÉRENTIELS
// (wilayas, communes, équipements, styles) : des données de production, dont un
// test d'intégration vérifie les comptes exacts. Y glisser six fausses salles
// les ferait partir en production et casserait ce test.
//
// ⚠ Ces salles n'ont PAS de photos. Une photo suppose un fichier réellement
// présent sur le stockage ; en inventer les lignes donnerait des vignettes 404,
// donc un rendu plus trompeur qu'une carte sans image. Les cartes montrent leur
// état sans couverture — c'est la MISE EN PAGE qui se juge ici.
//
// Idempotent : relancer ne duplique rien (tout passe par `upsert` sur le slug).
//
//   pnpm --filter @zwadj/api run db:seed:demo
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_EMAIL = "demo-pro@zwadj.test";

/** Six salles calquées sur la maquette : noms, quartiers, capacités et prix
 *  plausibles pour Alger. Les prix sont en DINARS ici et convertis en centimes
 *  au moment de l'écriture — jamais saisis en centimes à la main. */
const VENUES = [
  {
    slug: "salle-el-aurassi-royale",
    nameFr: "Salle El Aurassi Royale",
    nameAr: "قاعة الأوراسي الملكية",
    taglineFr: "Vue panoramique sur la baie d'Alger",
    taglineAr: "إطلالة بانورامية على خليج الجزائر",
    districtFr: "El Mouradia",
    districtAr: "المرادية",
    capacityMax: 600,
    basePriceDa: 850_000,
    styles: ["royal"],
    ceremonyType: "INDOOR" as const,
    amenities: ["parking", "climatisation", "traiteur-sur-place"]
  },
  {
    slug: "domaine-du-jardin-d-essai",
    nameFr: "Domaine du Jardin d'Essai",
    nameAr: "ضيعة الحامة",
    taglineFr: "Mariage en plein air, palmiers centenaires",
    taglineAr: "زفاف في الهواء الطلق بين النخيل",
    districtFr: "Hamma",
    districtAr: "الحامة",
    capacityMax: 350,
    basePriceDa: 620_000,
    styles: ["jardin"],
    ceremonyType: "OUTDOOR" as const,
    amenities: ["parking", "jardin"]
  },
  {
    slug: "villa-marina-sidi-fredj",
    nameFr: "Villa Marina Sidi Fredj",
    nameAr: "فيلا مارينا سيدي فرج",
    taglineFr: "Bord de mer, mariage les pieds dans l'eau",
    taglineAr: "على شاطئ البحر",
    districtFr: "Sidi Fredj",
    districtAr: "سيدي فرج",
    capacityMax: 280,
    basePriceDa: 720_000,
    styles: ["bord-de-mer", "jardin"],
    ceremonyType: "MIXED" as const,
    amenities: ["parking", "loge-mariee", "hebergement"]
  },
  {
    slug: "palais-des-rais",
    nameFr: "Palais des Raïs",
    nameAr: "قصر الرياس",
    taglineFr: "Patrimoine ottoman, casbah d'Alger",
    taglineAr: "تراث عثماني في قصبة الجزائر",
    districtFr: "Bastion 23",
    districtAr: "البسطيون 23",
    capacityMax: 220,
    basePriceDa: 940_000,
    styles: ["patrimoine", "royal"],
    ceremonyType: "MIXED" as const,
    amenities: ["climatisation", "decoration-incluse"]
  },
  {
    slug: "residence-les-oliviers",
    nameFr: "Résidence Les Oliviers",
    nameAr: "إقامة الزيتون",
    taglineFr: "Grand jardin ombragé, cuisine traditionnelle",
    taglineAr: "حديقة واسعة ومطبخ تقليدي",
    districtFr: "Birkhadem",
    districtAr: "بئر خادم",
    capacityMax: 450,
    basePriceDa: 480_000,
    styles: ["jardin"],
    ceremonyType: "OUTDOOR" as const,
    amenities: ["parking", "jardin", "traiteur-sur-place"]
  },
  {
    slug: "espace-bab-ezzouar",
    nameFr: "Espace Bab Ezzouar",
    nameAr: "فضاء باب الزوار",
    taglineFr: "Salle moderne climatisée, accès autoroute",
    taglineAr: "قاعة عصرية مكيّفة قرب الطريق السيار",
    districtFr: "Bab Ezzouar",
    districtAr: "باب الزوار",
    capacityMax: 500,
    basePriceDa: 390_000,
    styles: ["royal"],
    ceremonyType: "INDOOR" as const,
    amenities: ["parking", "climatisation", "acces-pmr"]
  }
];

/** Une clé absente du référentiel doit ARRÊTER le seed, pas disparaître : la
 *  première version ignorait les inconnues et a créé 12 liens au lieu de 16 —
 *  quatre équipements manquaient sur les cartes sans que rien ne le signale. */
function mustFind(index: Map<string, string>, key: string, kind: string): string {
  const id = index.get(key);
  if (!id) throw new Error(`Seed démo : ${kind} inconnu « ${key} » — vérifie le référentiel.`);
  return id;
}

export async function seedDemo(prisma: PrismaClient): Promise<{ venues: number }> {
  // Le pro de démonstration est un compte NORMAL : même modèle, même profil.
  // Un compte spécial « démo » créerait un cas que le reste du code ne connaît
  // pas, et c'est exactement ce qu'on ne veut pas donner à voir.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      // Aucun hash valide : ce compte n'est pas fait pour se connecter. La
      // colonne est requise, la valeur est volontairement inutilisable.
      passwordHash: "demo-not-loginable",
      role: "PRO",
      firstName: "Démo",
      lastName: "Zwadj",
      emailVerifiedAt: new Date()
    }
  });

  const pro = await prisma.proProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, businessName: "Salles de démonstration", phone: "+213555000000" }
  });

  // Une commune réelle du référentiel : les salles doivent apparaître sous le
  // filtre « Commune », donc pas de ville inventée pour l'occasion.
  const city = await prisma.city.findFirst({ orderBy: { nameFr: "asc" } });
  if (!city) throw new Error("Référentiel vide : lance `pnpm db:seed` avant le seed de démonstration.");

  const styles = new Map((await prisma.venueStyle.findMany()).map((s) => [s.key, s.id]));
  const amenities = new Map((await prisma.amenity.findMany()).map((a) => [a.key, a.id]));

  for (const v of VENUES) {
    const venue = await prisma.venue.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        ownerId: pro.id,
        cityId: city.id,
        slug: v.slug,
        nameFr: v.nameFr,
        nameAr: v.nameAr,
        taglineFr: v.taglineFr,
        taglineAr: v.taglineAr,
        districtFr: v.districtFr,
        districtAr: v.districtAr,
        capacityMax: v.capacityMax,
        // DA → centimes, à un seul endroit.
        basePriceCents: v.basePriceDa * 100,
        ceremonyType: v.ceremonyType,
        // ACTIVE + PUBLISHED : sans les deux, la salle n'est pas dans la liste
        // publique (D33) et le seed n'aurait rien montré du tout.
        status: "ACTIVE",
        publicationStatus: "PUBLISHED"
      }
    });

    // Remplacement d'ensemble, comme le fait l'écran pro : relancer le seed ne
    // doit pas empiler des liens en double.
    await prisma.venueStyleLink.deleteMany({ where: { venueId: venue.id } });
    await prisma.venueStyleLink.createMany({
      data: v.styles.map((key) => ({ venueId: venue.id, styleId: mustFind(styles, key, "style") }))
    });

    await prisma.venueAmenity.deleteMany({ where: { venueId: venue.id } });
    await prisma.venueAmenity.createMany({
      data: v.amenities.map((key) => ({ venueId: venue.id, amenityId: mustFind(amenities, key, "équipement") }))
    });
  }

  return { venues: VENUES.length };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquante (apps/api/.env) — impossible de seeder.");
    process.exit(1);
  }
  // Même adaptateur que `seed.ts` : Prisma 7 en mode driver adapter n'ouvre pas
  // de connexion tout seul.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const summary = await seedDemo(prisma);
    console.log(`Seed de démonstration : ${summary.venues} salles publiées.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes("seed-demo")) void main();
