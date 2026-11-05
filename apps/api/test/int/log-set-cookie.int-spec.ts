/**
 * SIG-1 — LE `Set-Cookie` DE RÉPONSE NE DOIT PAS ÊTRE JOURNALISÉ — rang 44, L36-3a-1 (D341, R-7 (D341), S-112, MP-11).
 *
 * ⛔ LE DÉFAUT (D340, `docs/preuves/D340/signalements.md`) : le journal des requêtes déclarait `redact: ["req.headers.authorization", "req.headers.cookie"]` — les en-têtes ENTRANTS. Les en-têtes de
 * RÉPONSE, que `pino-http` sérialise par défaut, n'étaient pas masqués : une réponse qui pose un cookie (`POST /auth/login`, `/auth/refresh`, `/auth/google`) écrivait `Set-Cookie: zwadj_rt=<la valeur du
 * jeton de rafraîchissement>` dans le journal, au niveau `info` — celui de la production par défaut.
 *
 * ⛔ CE QUE CETTE GARDE LIT : la SORTIE RÉELLE du journal de l'application Nest démarrée (limite 12 du cadrage de D340 : la mesure précédente avait été faite au niveau de `pino-http`). Voir `log-capture.ts`
 * pour ce qui est réel et ce qui est substitué (la destination et le niveau, rien d'autre ; la liste `redact` est LUE dans l'`AppModule`).
 *
 * ⚠ DEUX BRAS DE CONTRÔLE, sans lesquels un « rien dans le journal » ne prouverait rien (D290) : (1) les en-têtes de réponse SONT journalisés — la ligne porte `x-powered-by`, donc l'absence du cookie est un
 * effet du masque et non d'un journal qui ne contiendrait aucun en-tête ; (2) les en-têtes entrants déjà masqués le restent — le masque fonctionne là où il est déclaré.
 * Le premier commit de code du lot (R-7) fait passer cette garde au vert, SEUL, avant tout cookie du personnel.
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MOT_DE_PASSE_PRO, creerPro, lireCookies, type ProFixture } from "./staff-helpers";
import { creerApplicationJournalisee, type ContexteJournalise } from "./log-capture";
import { truncateAll } from "./helpers";

let ctx: ContexteJournalise;
let pro: ProFixture;

beforeAll(async () => {
  ctx = await creerApplicationJournalisee();
  await truncateAll(ctx.prisma);
  pro = await creerPro(ctx);
  ctx.vider();
});
afterAll(async () => {
  await ctx.app.close();
});

describe("SIG-1 — le journal réel de l'application ne porte AUCUNE valeur de cookie posé", () => {
  it("⛔ POST /auth/login : la valeur du cookie `zwadj_rt` posé par la réponse n'est NULLE PART dans la sortie du journal, et le champ est masqué", async () => {
    ctx.vider();
    const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email: pro.email, password: MOT_DE_PASSE_PRO });
    expect(res.status).toBe(200);
    const pose = lireCookies(res).find((c) => c.name === "zwadj_rt");
    expect(pose, "la réponse pose bien le cookie de rafraîchissement (sinon cette garde ne mesure rien)").toBeDefined();
    expect(pose!.value.length, "un vrai jeton opaque, pas une valeur vide").toBeGreaterThanOrEqual(40);

    const ligne = await ctx.attendreRequete("POST", "/api/v1/auth/login");
    const sortie = ctx.sortie();
    expect(sortie, "la valeur du cookie de rafraîchissement ne doit pas être dans le journal").not.toContain(pose!.value);
    const entetes = (ligne.res as { headers?: Record<string, unknown> }).headers ?? {};
    expect(entetes["set-cookie"], "le champ `set-cookie` de la réponse est masqué").toBe("[Redacted]");
  });

  it("⛔ le jeton d'accès (Bearer) renvoyé dans le CORPS n'est pas journalisé non plus : le journal ne porte jamais les corps", async () => {
    ctx.vider();
    const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email: pro.email, password: MOT_DE_PASSE_PRO });
    await ctx.attendreRequete("POST", "/api/v1/auth/login");
    expect(ctx.sortie()).not.toContain((res.body as { accessToken: string }).accessToken);
  });

  it("⛔ POST /auth/refresh : le cookie posé par la rotation n'est pas journalisé (même défaut, deuxième route qui pose `zwadj_rt`)", async () => {
    const agent = request.agent(ctx.app.getHttpServer());
    await agent.post("/api/v1/auth/login").send({ email: pro.email, password: MOT_DE_PASSE_PRO });
    ctx.vider();
    const res = await agent.post("/api/v1/auth/refresh");
    expect(res.status).toBe(200);
    const pose = lireCookies(res).find((c) => c.name === "zwadj_rt");
    expect(pose).toBeDefined();
    await ctx.attendreRequete("POST", "/api/v1/auth/refresh");
    expect(ctx.sortie()).not.toContain(pose!.value);
  });

  it("BRAS DE CONTRÔLE 1 — le journal contient bien les en-têtes de RÉPONSE : la ligne de login porte `x-powered-by` (l'absence du cookie vient du masque, pas d'un journal sans en-têtes)", async () => {
    ctx.vider();
    await request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email: pro.email, password: MOT_DE_PASSE_PRO });
    const ligne = await ctx.attendreRequete("POST", "/api/v1/auth/login");
    const entetes = (ligne.res as { headers?: Record<string, unknown> }).headers ?? {};
    expect(Object.keys(entetes), "les en-têtes de réponse sont journalisés").toContain("x-powered-by");
    expect(ctx.lignes().length, "l'instrument a parcouru au moins une ligne (un zéro sur zéro ligne ne prouve rien)").toBeGreaterThanOrEqual(1);
  });

  it("BRAS DE CONTRÔLE 2 — les en-têtes ENTRANTS restent masqués (`Authorization`, `Cookie`) : le masque fonctionne là où il était déjà déclaré", async () => {
    ctx.vider();
    const marqueur = "valeur-de-cookie-entrant-qui-ne-doit-pas-sortir";
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", `Bearer ${pro.token}`).set("Cookie", `zwadj_rt=${marqueur}`);
    expect(res.status).toBe(200);
    const ligne = await ctx.attendreRequete("GET", "/api/v1/auth/me");
    const sortie = ctx.sortie();
    expect(sortie).not.toContain(pro.token);
    expect(sortie).not.toContain(marqueur);
    const entrants = (ligne.req as { headers?: Record<string, unknown> }).headers ?? {};
    expect(entrants.authorization).toBe("[Redacted]");
    expect(entrants.cookie).toBe("[Redacted]");
  });

  it("la sortie du journal est du JSON, une ligne par objet (le format de production) : aucune ligne ne se parse en erreur", () => {
    expect(() => ctx.lignes()).not.toThrow();
  });
});
