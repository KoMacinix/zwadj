/**
 * LE MOT DE PASSE TEMPORAIRE N'ENTRE JAMAIS DANS LE JOURNAL — rang 56, L36-3a-2 (D354, R-5, S-112, S-244, MP-11). La SORTIE RÉELLE du journal de l'application Nest démarrée (patron de `log-set-cookie.int-spec.ts`).
 *
 * ⛔ LE RISQUE : K-20 et K-21 rendent le temporaire dans le CORPS d'une réponse. Le journal des requêtes (`pino-http`) sérialise les en-têtes, pas les corps ; `password` n'est dans AUCUN chemin de `redact`
 * (lecture adverse 7.b) — ce qui le garde hors du journal est l'ABSENCE de journalisation des corps, une propriété qu'une configuration future (un sérialiseur de corps, un niveau `debug`) pourrait perdre sans
 * qu'aucun test existant ne rougisse. Cette garde LIT la sortie réelle : si le temporaire, le mot de passe saisi à la connexion, ou la valeur d'un cookie du personnel y apparaît, elle rougit.
 *
 * ⚠ DEUX BRAS DE CONTRÔLE, sans lesquels un « rien dans le journal » ne prouverait rien (D290, D286) : (1) la ligne de la requête EST dans le journal, avec les en-têtes de RÉPONSE — `cache-control: no-store`
 * y figure, donc l'absence du temporaire n'est pas celle d'un journal vide ; (2) le journal contient bien le CHEMIN de la requête et son statut (l'instrument a parcouru au moins une ligne).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerApplicationJournalisee, type ContexteJournalise } from "./log-capture";
import { truncateAll } from "./helpers";
import { Jar, MOT_DE_PASSE_STAFF, appeler, connecter, creerMembre, proActive } from "./staff-helpers";

let ctx: ContexteJournalise;
let m: Awaited<ReturnType<typeof proActive>>;

beforeAll(async () => {
  ctx = await creerApplicationJournalisee();
  await truncateAll(ctx.prisma);
  m = await proActive(ctx);
  ctx.vider();
});
afterAll(async () => {
  await ctx.app.close();
});

describe("le journal réel de l'application ne porte AUCUNE valeur secrète du personnel", () => {
  it("⛔ K-20 : le temporaire rendu par la création n'est NULLE PART dans la sortie du journal — ni la valeur du cookie de session du Manager, ni son mot de passe", async () => {
    ctx.vider();
    const { res, temporaryPassword } = await creerMembre(ctx, m.pro, m.jar, "Karim");
    expect(res.status).toBe(201);
    expect(temporaryPassword.length, "un vrai temporaire, pas une valeur vide (sinon cette garde ne mesure rien)").toBeGreaterThanOrEqual(12);
    const ligne = await ctx.attendreRequete("POST", "/api/v1/pro/staff/members");
    const sortie = ctx.sortie();
    expect(sortie.includes(temporaryPassword), "le temporaire de K-20 est dans le journal").toBe(false);
    expect(sortie.includes(m.jar.session()!), "le cookie de session du Manager est dans le journal").toBe(false);
    expect(sortie.includes(MOT_DE_PASSE_STAFF), "le mot de passe du Manager est dans le journal").toBe(false);
    const entetes = (ligne.res as { headers?: Record<string, unknown> }).headers ?? {};
    expect(entetes["cache-control"], "BRAS DE CONTRÔLE 1 — les en-têtes de RÉPONSE sont journalisés : `no-store` y figure").toBe("no-store");
    expect(ctx.lignes().length, "BRAS DE CONTRÔLE 2 — l'instrument a parcouru au moins une ligne").toBeGreaterThanOrEqual(1);
  });

  it("⛔ K-21 : le temporaire rendu par la réinitialisation n'est pas dans le journal non plus", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "Leila");
    ctx.vider();
    const chemin = `/api/v1/pro/staff/members/${e.id}/reset-password`;
    const res = await appeler(ctx, m.pro.token, m.jar, "post", chemin);
    expect(res.status).toBe(200);
    const neuf = (res.body as { temporaryPassword: string }).temporaryPassword;
    const ligne = await ctx.attendreRequete("POST", chemin);
    const sortie = ctx.sortie();
    expect(sortie.includes(neuf), "le temporaire de K-21 est dans le journal").toBe(false);
    expect(sortie.includes(e.temporaryPassword), "l'ancien temporaire est dans le journal").toBe(false);
    expect((ligne.res as { headers?: Record<string, unknown> }).headers?.["cache-control"], "BRAS DE CONTRÔLE — l'en-tête `no-store` est journalisé").toBe("no-store");
  });

  it("⛔ la CONNEXION d'un membre avec son temporaire : le mot de passe saisi (corps de la requête) et les valeurs des cookies posés (session, appareil) ne sont pas dans le journal ; le champ `set-cookie` est masqué", async () => {
    const e = await creerMembre(ctx, m.pro, m.jar, "Samir");
    ctx.vider();
    const jar = new Jar();
    const res = await connecter(ctx, m.pro, jar, "Samir", e.temporaryPassword);
    expect(res.status).toBe(200);
    const session = jar.session()!;
    const appareils = jar.appareils().map((c) => c.value);
    expect(session.length).toBeGreaterThanOrEqual(40);
    expect(appareils.length, "un cookie d'appareil a bien été posé (sinon cette garde ne mesure rien)").toBeGreaterThanOrEqual(1);
    const ligne = await ctx.attendreRequete("POST", "/api/v1/pro/staff/login");
    const sortie = ctx.sortie();
    expect(sortie.includes(e.temporaryPassword), "le mot de passe de la connexion est dans le journal").toBe(false);
    expect(sortie.includes(session), "le cookie de session est dans le journal").toBe(false);
    for (const v of appareils) expect(sortie.includes(v), "le cookie d'appareil est dans le journal").toBe(false);
    expect(((ligne.res as { headers?: Record<string, unknown> }).headers ?? {})["set-cookie"]).toBe("[Redacted]");
  });
});
