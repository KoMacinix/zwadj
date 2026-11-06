/**
 * MESURE (pas un test) — rang 44, L36-3a-1 (D341) : le COÛT de la lecture du drapeau de la couche, une fois par requête Pro (limite 6 du cadrage : « à mesurer, sans budget »).
 *
 * Ce que ce fichier relève : la latence de bout en bout (supertest → application Nest complète → PostgreSQL réel) d'une route Pro bon marché, `GET /api/v1/pro/venues`, la couche ÉTEINTE (le cas de
 * toute salle tant qu'elle n'a rien activé : c'est lui qui paie la lecture sans en tirer rien). Il n'assertit RIEN sur la durée : un budget de test ferait d'une durée un verdict (D290).
 *
 * ⛔ COMMENT IL SE LIT : `mesurer.py` le joue en ALTERNANCE — variante « avant » (le quatrième garde retiré de `app.module.ts`, le reste du code identique), variante « après » (le code livré) — trois fois
 * chacune, et rapporte les médianes de chaque passe. Une seule passe ne dit rien : D291 a mesuré qu'une passe enchaînée est plus rapide qu'une passe après repos (de 0,7 à 7,2 %), et que l'ordre des passes
 * compte plus que le code. ⚠ Le fichier s'archive ici ; il se JOUE depuis `apps/api/test/int/` (ses imports sont relatifs à ce dossier), copié par `mesurer.py` et retiré ensuite (hachage vérifié).
 */
import { afterAll, beforeAll, describe, it } from "vitest";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { appeler, creerPro } from "./staff-helpers";

const ECHAUFFEMENT = 80;
const MESURES = 600;
const ROUTE = "/api/v1/pro/venues";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});

function quantile(tries: number[], q: number): number {
  const i = Math.min(tries.length - 1, Math.max(0, Math.ceil(q * tries.length) - 1));
  return tries[i]!;
}

describe("mesure — la lecture du drapeau par requête Pro", () => {
  it("relève la latence de GET /pro/venues, couche éteinte (aucune assertion de durée)", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    for (let i = 0; i < ECHAUFFEMENT; i += 1) await appeler(ctx, pro.token, undefined, "get", ROUTE);
    const durees: number[] = [];
    let statuts200 = 0;
    for (let i = 0; i < MESURES; i += 1) {
      const t0 = performance.now();
      const res = await appeler(ctx, pro.token, undefined, "get", ROUTE);
      durees.push(performance.now() - t0);
      if (res.status === 200) statuts200 += 1;
    }
    const tries = [...durees].sort((a, b) => a - b);
    const moyenne = durees.reduce((s, d) => s + d, 0) / durees.length;
    // UNE ligne JSON, relue par `mesurer.py` : le nombre de requêtes mesurées ET celui des 200 (une route qui répondrait 401 mesurerait un refus, pas une lecture).
    console.log(
      "MESURE " +
        JSON.stringify({
          route: ROUTE,
          echauffement: ECHAUFFEMENT,
          mesures: durees.length,
          reponses200: statuts200,
          medianeMs: Number(quantile(tries, 0.5).toFixed(3)),
          p95Ms: Number(quantile(tries, 0.95).toFixed(3)),
          moyenneMs: Number(moyenne.toFixed(3)),
          minMs: Number(tries[0]!.toFixed(3)),
          maxMs: Number(tries[tries.length - 1]!.toFixed(3))
        })
    );
  });
});
