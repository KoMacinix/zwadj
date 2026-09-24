// D304 — SONDE JETABLE, versée en pièce. Point 7 de Ko, seconde inférence du cadrage du rang
// 23 (§ 3, F6) : « peut-on espionner un délégué Prisma 7 ? » — c'est-à-dire
// `vi.spyOn(ctx.prisma.user, "findUnique")`, avec pour repli, s'il échoue, un `PrismaService`
// enveloppé fourni au module de test. Ce n'est PAS un test du produit.
//
// ⚠ LA QUESTION N'EST PAS « spyOn lève-t-il ? » MAIS « l'espion voit-il l'appel du SERVICE ? ».
// Un délégué recréé à chaque accès accepterait l'espion sans broncher et ne le verrait jamais
// appelé : on mesure donc sur le VRAI site de F6 — `BookingsService.accept`, dont la lecture
// post-commit `this.prisma.user.findUnique` est celle que l'audit nomme.
// ⛔ CALIBRATION À DEUX BRAS, sur le même espion : bras positif — une panne armée une fois fait
// rejeter `accept` avec CE message, la ligne étant déjà ACCEPTED en base (le rouge de MD-F6-1) ;
// bras négatif — sans panne armée, `accept` aboutit. Un bras manqué ⇒ la réponse est « non
// établi », pas « oui ».
// OÙ : `zwadj_test`, recréée vide par le `globalSetup` réel. COMMENT : depuis `apps/api`,
//     npx vitest run -c vitest.config.int.ts --dir <racine>/docs/preuves/D304/sondes espion
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestApp, truncateAll, type TestContext } from "../../../../../../apps/api/test/int/helpers";
import { BookingsService } from "../../../../../../apps/api/src/venues/bookings.service";

const SORTIE = join(process.cwd(), "..", "..", "docs", "preuves", "D304", "sondes", "sorties");
const journal: string[] = [];
const noter = (l: string): void => {
  journal.push(l);
  console.log(l);
};

let ctx: TestContext;

async function issue(p: Promise<unknown>): Promise<string> {
  return p.then(
    () => "ABOUTI",
    (e: unknown) => `REJETÉ « ${(e as Error).message} »`
  );
}

beforeAll(async () => {
  ctx = await createTestApp();
  const base = await ctx.prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  if (base[0]?.db !== "zwadj_test") throw new Error(`ABANDON : base ${base[0]?.db}, attendu zwadj_test`);
  await truncateAll(ctx.prisma);
});

afterAll(async () => {
  if (!existsSync(SORTIE)) mkdirSync(SORTIE, { recursive: true });
  writeFileSync(join(SORTIE, "espion-prisma-resultats.txt"), journal.join("\n") + "\n", "utf8");
  await truncateAll(ctx.prisma);
  await ctx.app.close();
});

it("SONDE D304 — un délégué Prisma 7 s'espionne-t-il, vu depuis le service ?", async () => {
  // Décor : un pro propriétaire, une salle, un client inscrit, deux demandes PENDING.
  const proUser = await ctx.prisma.user.create({
    data: { email: "pro-d304@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: proUser.id, businessName: "Sonde D304", phone: "+213550000304" }
  });
  const client = await ctx.prisma.user.create({
    data: { email: "client-d304@example.dz", passwordHash: "x", role: "CLIENT", emailVerifiedAt: new Date() }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: pro.id, cityId: city.id, slug: "salle-d304-espion", nameFr: "Salle D304", nameAr: "قاعة",
      capacityMax: 400, basePriceCents: 18_000_000
    },
    select: { id: true }
  });
  const demande = async (jour: string): Promise<string> =>
    (
      await ctx.prisma.booking.create({
        data: {
          venueId: venue.id, clientId: client.id, slotTemplateId: null,
          eventDate: new Date(`${jour}T00:00:00Z`),
          startsAt: new Date(`${jour}T17:00:00Z`), endsAt: new Date(`${jour}T23:00:00Z`),
          guests: 200, basePriceCents: 20_000_000, servicesTotalCents: 0,
          totalCents: 20_000_000, depositCents: 6_000_000,
          contactFirstName: "Sonde", contactLastName: "D304", contactPhone: "+213550000304"
        },
        select: { id: true }
      })
    ).id;
  const b1 = await demande("2027-11-20");
  const b2 = await demande("2027-11-21");
  const statut = async (id: string): Promise<string> =>
    (await ctx.prisma.booking.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;

  const svc = ctx.app.get(BookingsService);
  const prismaDuService = (svc as unknown as { prisma: unknown }).prisma;

  noter("── 1. identité et descripteur");
  noter(`le service tient la MÊME instance que ctx.prisma : ${prismaDuService === ctx.prisma}`);
  noter(`ctx.prisma.user === ctx.prisma.user (délégué stable d'un accès à l'autre) : ${ctx.prisma.user === ctx.prisma.user}`);
  const propre = Object.getOwnPropertyDescriptor(ctx.prisma.user, "findUnique");
  noter(`findUnique, propriété PROPRE du délégué : ${propre !== undefined}` +
    (propre ? ` · configurable ${propre.configurable} · writable ${propre.writable} · type ${typeof propre.value}` : ""));
  noter(`classe de l'instance : ${Object.getPrototypeOf(ctx.prisma)?.constructor?.name}`);

  noter("\n── 2. vi.spyOn");
  let espion: ReturnType<typeof vi.spyOn> | null = null;
  try {
    espion = vi.spyOn(ctx.prisma.user, "findUnique");
    noter("vi.spyOn(ctx.prisma.user, \"findUnique\") : POSÉ, sans erreur");
  } catch (e) {
    noter(`vi.spyOn(ctx.prisma.user, "findUnique") : LÈVE « ${(e as Error).message} »`);
  }
  expect(espion, "l'espion ne s'est pas posé : le repli du cadrage (PrismaService enveloppé) devient nécessaire").not.toBeNull();
  const e = espion!;

  noter("\n── 3. bras POSITIF : une panne armée une fois, puis accept() réel");
  e.mockRejectedValueOnce(new Error("PANNE INJECTÉE D304"));
  const avant1 = e.mock.calls.length;
  const r1 = await issue(svc.accept(proUser.id, b1));
  noter(`accept(b1) : ${r1} · appels vus par l'espion : ${e.mock.calls.length - avant1} · statut en base : ${await statut(b1)}`);

  noter("\n── 4. bras NÉGATIF : même espion, aucune panne armée");
  const avant2 = e.mock.calls.length;
  const r2 = await issue(svc.accept(proUser.id, b2));
  noter(`accept(b2) : ${r2} · appels vus par l'espion : ${e.mock.calls.length - avant2} · statut en base : ${await statut(b2)}`);

  noter("\n── 5. l'espion posé sur le client de base traverse-t-il un client de TRANSACTION ?");
  e.mockRejectedValueOnce(new Error("PANNE TX D304"));
  const avant3 = e.mock.calls.length;
  const r3 = await issue(
    ctx.prisma.$transaction(async (tx) => tx.user.findUnique({ where: { id: client.id }, select: { id: true } }))
  );
  const vuTx = e.mock.calls.length - avant3;
  noter(`tx.user.findUnique dans $transaction : ${r3} · appels vus par l'espion : ${vuTx}`);
  // La panne armée, si la transaction ne l'a pas consommée, ne doit pas survivre à la sonde.
  const r3b = await issue(ctx.prisma.user.findUnique({ where: { id: client.id }, select: { id: true } }));
  noter(`ctx.prisma.user.findUnique ensuite : ${r3b}`);

  e.mockRestore();
  noter("\n── 6. après mockRestore");
  noter(`ctx.prisma.user.findUnique : ${await issue(ctx.prisma.user.findUnique({ where: { id: client.id }, select: { id: true } }))}`);

  const positif = r1 === "REJETÉ « PANNE INJECTÉE D304 »" && (await statut(b1)) === "ACCEPTED";
  const negatif = r2 === "ABOUTI" && (await statut(b2)) === "ACCEPTED";
  noter(`\ncalibration : bras positif ${positif ? "OK" : "MANQUÉ"} · bras négatif ${negatif ? "OK" : "MANQUÉ"}`);
  noter(`RÉPONSE : ${positif && negatif ? "OUI — l'espion posé sur ctx.prisma.user voit la lecture post-commit du service" : "NON ÉTABLI"}`);
  expect(positif).toBe(true);
  expect(negatif).toBe(true);
});
