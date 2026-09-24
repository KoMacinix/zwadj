// D304 — SONDE JETABLE, versée en pièce. SUITE de `espion-prisma.int-spec.ts`, écrite APRÈS
// sa mesure : l'espion posé tel que le cadrage l'écrit (`vi.spyOn(ctx.prisma.user,
// "findUnique")`) voit l'appel du service, mais n'est PAS un passe-plat — sans panne armée il
// rend `undefined` — et `mockRestore()` laisse `findUnique` indéfini sur le délégué
// (`espion-prisma-resultats.txt`, `espion-vitest.txt`). Relevé : le délégué est un proxy dont
// le descripteur de `findUnique` est `configurable`, `writable`, SANS `value` ; vitest prend ce
// `value` pour l'implémentation d'origine.
//
// ⇒ Cette sonde mesure UNE variante, pas davantage : l'original est PRIS PAR LECTURE avant de
// poser l'espion, l'espion le rappelle explicitement, et le nettoyage SUPPRIME la propriété
// posée au lieu de la « restaurer ». Mêmes deux bras que la première sonde, plus un troisième :
// après nettoyage, le délégué répond comme avant.
// OÙ : `zwadj_test`, recréée vide par le `globalSetup` réel. COMMENT : depuis `apps/api`,
//     npx vitest run -c vitest.config.int.ts --dir <racine>/docs/preuves/D304/sondes variante
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
  writeFileSync(join(SORTIE, "espion-variante-resultats.txt"), journal.join("\n") + "\n", "utf8");
  await truncateAll(ctx.prisma);
  await ctx.app.close();
});

it("SONDE D304 — variante : passe-plat explicite, nettoyage par suppression", async () => {
  const proUser = await ctx.prisma.user.create({
    data: { email: "pro-d304v@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: proUser.id, businessName: "Sonde D304 v", phone: "+213550000305" }
  });
  const client = await ctx.prisma.user.create({
    data: { email: "client-d304v@example.dz", passwordHash: "x", role: "CLIENT", emailVerifiedAt: new Date() }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: pro.id, cityId: city.id, slug: "salle-d304-variante", nameFr: "Salle D304 v", nameAr: "قاعة",
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
          contactFirstName: "Sonde", contactLastName: "D304", contactPhone: "+213550000305"
        },
        select: { id: true }
      })
    ).id;
  const b1 = await demande("2027-11-22");
  const b2 = await demande("2027-11-23");
  const statut = async (id: string): Promise<string> =>
    (await ctx.prisma.booking.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
  const svc = ctx.app.get(BookingsService);
  const delegue = ctx.prisma.user as unknown as Record<string, unknown>;

  noter("── 1. l'original, pris PAR LECTURE avant l'espion");
  const original = ctx.prisma.user.findUnique;
  noter(`typeof original : ${typeof original} · propriété propre AVANT l'espion : ${Object.prototype.hasOwnProperty.call(delegue, "findUnique")}`);
  noter(`un appel de l'original seul : ${await issue(original({ where: { id: client.id }, select: { id: true } }))}`);

  noter("\n── 2. l'espion, passe-plat EXPLICITE");
  const espion = vi
    .spyOn(ctx.prisma.user, "findUnique")
    .mockImplementation(((args: Parameters<typeof original>[0]) => original(args)) as typeof original);

  {
    noter("\n── 3. bras POSITIF : une panne armée une fois");
    espion.mockRejectedValueOnce(new Error("PANNE INJECTÉE D304"));
    const a1 = espion.mock.calls.length;
    const r1 = await issue(svc.accept(proUser.id, b1));
    noter(`accept(b1) : ${r1} · appels vus : ${espion.mock.calls.length - a1} · statut en base : ${await statut(b1)}`);

    noter("\n── 4. bras NÉGATIF : aucune panne armée");
    const a2 = espion.mock.calls.length;
    const r2 = await issue(svc.accept(proUser.id, b2));
    noter(`accept(b2) : ${r2} · appels vus : ${espion.mock.calls.length - a2} · statut en base : ${await statut(b2)}`);

    noter("\n── 5. NETTOYAGE : suppression de la propriété posée (pas mockRestore)");
    const supprime = Reflect.deleteProperty(delegue, "findUnique");
    noter(`deleteProperty : ${supprime} · typeof ensuite : ${typeof ctx.prisma.user.findUnique} · propriété propre ensuite : ${Object.prototype.hasOwnProperty.call(delegue, "findUnique")}`);
    const a3 = espion.mock.calls.length;
    const r3 = await issue(ctx.prisma.user.findUnique({ where: { id: client.id }, select: { id: true } }));
    noter(`appel après nettoyage : ${r3} · appels vus par l'ancien espion : ${espion.mock.calls.length - a3}`);

    const positif = r1 === "REJETÉ « PANNE INJECTÉE D304 »" && (await statut(b1)) === "ACCEPTED";
    const negatif = r2 === "ABOUTI" && (await statut(b2)) === "ACCEPTED";
    const propre = r3 === "ABOUTI" && espion.mock.calls.length - a3 === 0;
    noter(`\ncalibration : positif ${positif ? "OK" : "MANQUÉ"} · négatif ${negatif ? "OK" : "MANQUÉ"} · nettoyage ${propre ? "OK" : "MANQUÉ"}`);
    noter(`RÉPONSE (variante) : ${positif && negatif && propre ? "TIENT SES TROIS BRAS" : "NE TIENT PAS"}`);
    expect(positif).toBe(true);
    expect(negatif).toBe(true);
    expect(propre).toBe(true);
  }
});
