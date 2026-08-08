/**
 * D128 — LE LIMITEUR GLOBAL, ET POURQUOI IL DOIT REJOINDRE LE LEVIER `THROTTLE_*`.
 *
 * `auth.throttle.ts` expose depuis le Lot 1 un levier `THROTTLE_*` explicitement
 * décrit comme « levier de test uniquement », hors du schéma env validé. T1 s'en
 * est servi pour la suite e2e, sans toucher au code de production.
 *
 * ⚠ MAIS IL NE COUVRAIT QUE LES ROUTES `/auth`. Le limiteur PAR DÉFAUT —
 * `ThrottlerModule.forRoot`, 100 requêtes / 60 s / IP — restait codé en dur, et
 * s'applique à TOUT le reste : référentiels, recherche, écrans pro. Le premier
 * lancement de T4 le montre dans ses journaux : `x-ratelimit-limit: 100` sur
 * `/api/v1/wilayas` pendant que les routes d'auth affichent `10000`.
 *
 * Ce spec REPRODUIT la gêne avant qu'on la corrige, puis prouve que le levier
 * élargi la lève — sans rien changer en production, où aucune variable n'est
 * définie et où les 100/60 s s'appliquent toujours.
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

let ctx: TestContext;

/** Une seule instance mémoire de compteur : on lit une route publique bon
 *  marché pour ne mesurer QUE le limiteur, pas le coût du handler. */
const ROUTE = "/api/v1/wilayas";

beforeAll(async () => {
  ctx = await createTestApp();
  await truncateAll(ctx.prisma);
});

afterAll(async () => {
  await ctx.app.close();
});

/** Tire `n` requêtes en séquence et rend les codes observés. */
async function tirer(n: number): Promise<number[]> {
  const codes: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const res = await request(ctx.app.getHttpServer()).get(ROUTE);
    codes.push(res.status);
  }
  return codes;
}

describe("D128 — limiteur global et levier de test", () => {
  it("le levier est BRANCHÉ : la limite effective vient de l'environnement", async () => {
    // ⚠ Ce test est le garde-fou du suivant. Si le levier n'était pas lu, la
    // limite resterait à 100 et le test « pas de 429 » passerait quand même
    // tant que la suite tire moins de 100 fois — vert, et sans objet.
    const res = await request(ctx.app.getHttpServer()).get(ROUTE).expect(200);
    const limite = Number(res.headers["x-ratelimit-limit"]);
    expect(
      limite,
      `x-ratelimit-limit = ${limite}. Le levier THROTTLE_DEFAULT_LIMIT n'est pas lu : ` +
        `le limiteur par défaut est resté codé en dur.`
    ).toBeGreaterThan(1_000);
  });

  it("relâché par le levier, 150 lectures consécutives passent toutes", async () => {
    // 150 > 100 : sans le levier, la 101ᵉ rendrait 429. C'est exactement la
    // situation d'une suite e2e qui grossit — T4 charge 10 écrans, chacun
    // tirant trois référentiels DEUX fois (StrictMode).
    const codes = await tirer(150);
    const refuses = codes.filter((c) => c === 429).length;
    expect(
      refuses,
      `${refuses} requêtes sur 150 refusées en 429 par le limiteur global. ` +
        `Une suite qui grossit se met alors à échouer par grappes, sur des tests ` +
        `qui n'ont rien à voir avec ce qu'ils mesurent.`
    ).toBe(0);
  });

  it("⚠ EN PRODUCTION RIEN NE CHANGE : sans variable, la valeur par défaut reste 100/60 s", async () => {
    // On relit la source de vérité plutôt que le comportement : le spec tourne
    // AVEC le levier posé, il ne peut pas observer le défaut par lui-même.
    // Ce que l'on vérifie, c'est qu'aucune valeur n'est écrite en dur ailleurs
    // et que le défaut déclaré est bien celui d'avant.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "../../src/auth/auth.throttle.ts"), "utf8");
    expect(src, "le défaut de production n'est plus 100").toContain('num("THROTTLE_DEFAULT_LIMIT", 100)');
    expect(src, "le défaut de fenêtre n'est plus 60 s").toContain('num("THROTTLE_DEFAULT_TTL_MS", 60_000)');
  });
});
