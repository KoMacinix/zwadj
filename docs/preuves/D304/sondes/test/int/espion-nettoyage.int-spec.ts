// D304 — SONDE JETABLE, versée en pièce. TROISIÈME et dernière, écrite APRÈS la mesure de
// `espion-variante.int-spec.ts` : le passe-plat explicite tient ses deux bras, mais le
// nettoyage par `Reflect.deleteProperty` laisse `findUnique` INDÉFINI — comme `mockRestore()`
// dans la première sonde. Le délégué de Prisma 7 est un proxy : une fois la propriété
// réécrite, ni la restauration de vitest ni la suppression ne rendent la méthode d'origine.
//
// ⇒ Cette sonde mesure le SEUL nettoyage restant : RÉAFFECTER l'original pris par lecture
// (`Object.defineProperty(…, { value: original })`). Mêmes bras positif et négatif, puis :
// l'appel après nettoyage aboutit ET l'ancien espion n'en voit rien.
// OÙ : `zwadj_test`, recréée vide par le `globalSetup` réel. COMMENT : depuis `apps/api`,
//     npx vitest run -c vitest.config.int.ts --dir <racine>/docs/preuves/D304/sondes nettoyage
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
  writeFileSync(join(SORTIE, "espion-nettoyage-resultats.txt"), journal.join("\n") + "\n", "utf8");
  await truncateAll(ctx.prisma);
  await ctx.app.close();
});

it("SONDE D304 — passe-plat explicite, nettoyage par RÉAFFECTATION de l'original", async () => {
  const proUser = await ctx.prisma.user.create({
    data: { email: "pro-d304n@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: proUser.id, businessName: "Sonde D304 n", phone: "+213550000306" }
  });
  const client = await ctx.prisma.user.create({
    data: { email: "client-d304n@example.dz", passwordHash: "x", role: "CLIENT", emailVerifiedAt: new Date() }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: pro.id, cityId: city.id, slug: "salle-d304-nettoyage", nameFr: "Salle D304 n", nameAr: "قاعة",
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
          contactFirstName: "Sonde", contactLastName: "D304", contactPhone: "+213550000306"
        },
        select: { id: true }
      })
    ).id;
  const b1 = await demande("2027-11-24");
  const b2 = await demande("2027-11-25");
  const b3 = await demande("2027-11-26");
  const statut = async (id: string): Promise<string> =>
    (await ctx.prisma.booking.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
  const svc = ctx.app.get(BookingsService);
  const delegue = ctx.prisma.user as unknown as Record<string, unknown>;

  const original = ctx.prisma.user.findUnique;
  noter(`typeof original (pris par lecture) : ${typeof original}`);
  const espion = vi
    .spyOn(ctx.prisma.user, "findUnique")
    .mockImplementation(((args: Parameters<typeof original>[0]) => original(args)) as typeof original);

  espion.mockRejectedValueOnce(new Error("PANNE INJECTÉE D304"));
  const a1 = espion.mock.calls.length;
  const r1 = await issue(svc.accept(proUser.id, b1));
  noter(`bras positif — accept(b1) : ${r1} · appels vus : ${espion.mock.calls.length - a1} · statut en base : ${await statut(b1)}`);

  const a2 = espion.mock.calls.length;
  const r2 = await issue(svc.accept(proUser.id, b2));
  noter(`bras négatif — accept(b2) : ${r2} · appels vus : ${espion.mock.calls.length - a2} · statut en base : ${await statut(b2)}`);

  Object.defineProperty(delegue, "findUnique", { value: original, writable: true, configurable: true });
  noter(`nettoyage par réaffectation — typeof ensuite : ${typeof ctx.prisma.user.findUnique}`);
  const a3 = espion.mock.calls.length;
  const r3 = await issue(svc.accept(proUser.id, b3));
  noter(`après nettoyage — accept(b3) : ${r3} · appels vus par l'ancien espion : ${espion.mock.calls.length - a3} · statut en base : ${await statut(b3)}`);

  const positif = r1 === "REJETÉ « PANNE INJECTÉE D304 »" && (await statut(b1)) === "ACCEPTED";
  const negatif = r2 === "ABOUTI" && (await statut(b2)) === "ACCEPTED";
  const propre = r3 === "ABOUTI" && espion.mock.calls.length - a3 === 0 && (await statut(b3)) === "ACCEPTED";
  noter(`\ncalibration : positif ${positif ? "OK" : "MANQUÉ"} · négatif ${negatif ? "OK" : "MANQUÉ"} · nettoyage ${propre ? "OK" : "MANQUÉ"}`);
  noter(`RÉPONSE (réaffectation) : ${positif && negatif && propre ? "TIENT SES TROIS BRAS" : "NE TIENT PAS"}`);
  expect(positif).toBe(true);
  expect(negatif).toBe(true);
  expect(propre).toBe(true);
});
