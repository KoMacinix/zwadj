/**
 * LE QUATRIÈME GARDE GLOBAL, DÉRIVÉ DU ROUTEUR — rang 44, L36-3a-1 (D341, S-98, MP-7, MP-18, MP-19, MP-20, MP-34, MP-35). PostgreSQL RÉEL.
 *
 * ⚠ LA TABLE EST DÉRIVÉE DU ROUTEUR, JAMAIS ÉCRITE À LA MAIN (D119). La preuve demandée par le cadrage (§ 2.5) est : POUR CHACUNE DES ROUTES atteignables par un PRO —
 *   (a) avant l'activation, la réponse n'est PAS `STAFF_SESSION_REQUIRED` ;
 *   (b) après, sans session, elle l'est — sauf les routes exemptées, dont la liste est FERMÉE et dérivée des métadonnées ;
 *   (c) avec la session de la salle, elle ne l'est pas ;
 *   (d) avec la session d'une AUTRE salle, elle l'est (et la session d'autrui n'est pas terminée par ce refus) ;
 *   (e) un ADMIN ou un CLIENT ne la voit JAMAIS.
 * Ajouter une route Pro la met sous test le jour même, sans toucher à ce fichier.
 *
 * ⚠ Ces requêtes atteignent de vraies routes avec des identifiants inventés (comme `rbac-all-routes.int-spec.ts`) : sur la base de test, jetable, les effets éventuels sont sans conséquence ; le bras (a)
 * et le bras (c) tolèrent n'importe quelle réponse SAUF `STAFF_SESSION_REQUIRED`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaffErrorCode } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
import { collectRoutes, routesDuPro, signature, withIds, type RouteEntry } from "./route-collector";
import { Jar, MOT_DE_PASSE_PRO, appeler, codeDe, corpsStable, creerPro, proActive, rendreInactive, sessionParJeton, sha256, type ProFixture } from "./staff-helpers";

let ctx: TestContext;
let routes: RouteEntry[];
let routesPro: RouteEntry[];

/** Le cas qui ne se rejoue pas tel quel : se déconnecter TERMINE la session, qui sert aux autres requêtes de la boucle. */
const TERMINE_LA_SESSION = new Set(["POST /api/v1/pro/staff/logout"]);

beforeAll(async () => {
  ctx = await createTestApp();
  routes = collectRoutes(ctx.app);
  routesPro = routesDuPro(routes);
});
afterAll(async () => {
  await ctx.app.close();
});

const refuseParLeGarde = (res: { status: number; body: unknown }): boolean => res.status === 401 && (res.body as { message?: { code?: string } }).message?.code === StaffErrorCode.STAFF_SESSION_REQUIRED;

async function toutesLesRoutes(bearer: string, jar: Jar | undefined, filtre: (r: RouteEntry) => boolean = () => true): Promise<Array<{ route: RouteEntry; res: Awaited<ReturnType<typeof appeler>> }>> {
  const sorties = [];
  for (const route of routesPro.filter(filtre)) sorties.push({ route, res: await appeler(ctx, bearer, jar, route.method, withIds(route.path)) });
  return sorties;
}

describe("le collecteur — garde-fou du garde-fou", () => {
  it("l'extraction trouve la matrice attendue : au moins 55 routes atteignables par un PRO, dont les cinq routes du lot ; sans cela, tous les cas ci-dessous passeraient sur une liste vide", () => {
    expect(routesPro.length).toBeGreaterThanOrEqual(55);
    const sigs = routesPro.map(signature);
    for (const attendue of ["POST /api/v1/pro/staff/activate", "POST /api/v1/pro/staff/login", "POST /api/v1/pro/staff/logout", "GET /api/v1/pro/staff/session", "POST /api/v1/pro/staff/password"]) {
      expect(sigs, attendue).toContain(attendue);
    }
  });

  it("⛔ MP-20 — la liste des routes EXEMPTÉES est dérivée des métadonnées et FERMÉE : exactement quatre (état du compte commun, activer, se connecter, lire l'état) — une route neuve exemptée sans décision fait rougir ce test", () => {
    const exemptees = routes.filter((r) => r.staffExempt).map(signature).sort();
    expect(exemptees).toEqual(["GET /api/v1/auth/me", "GET /api/v1/pro/staff/session", "POST /api/v1/pro/staff/activate", "POST /api/v1/pro/staff/login"].sort());
  });

  it("aucune route PUBLIQUE n'est exemptée par erreur (une route publique n'a pas besoin de l'être : le garde l'ignore)", () => {
    expect(routes.filter((r) => r.isPublic && r.staffExempt).map(signature)).toEqual([]);
  });
});

describe("MP-35 — AVANT l'activation, l'app Pro marche comme aujourd'hui", () => {
  it("⛔ pour chaque route atteignable par un PRO dont la salle n'a PAS activé la couche : la réponse n'est JAMAIS `STAFF_SESSION_REQUIRED`", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const reponses = await toutesLesRoutes(pro.token, undefined);
    expect(reponses.length).toBe(routesPro.length);
    const refusees = reponses.filter((r) => refuseParLeGarde(r.res)).map((r) => signature(r.route));
    expect(refusees, `routes refusées par le garde alors que la couche est éteinte :\n${refusees.join("\n")}`).toEqual([]);
  });

  it("un cookie de session d'une autre salle présenté à une salle SANS couche ne change rien : le garde ne regarde pas les cookies quand le drapeau est éteint", async () => {
    await truncateAll(ctx.prisma);
    const eteinte = await creerPro(ctx);
    const active = await proActive(ctx);
    const res = await appeler(ctx, eteinte.token, active.jar, "get", "/api/v1/pro/venues");
    expect(res.status).toBe(200);
  });
});

describe("la couche ACTIVÉE — sans session, avec la bonne, avec celle d'autrui", () => {
  let a: { pro: ProFixture; jar: Jar; membreId: string };
  let b: { pro: ProFixture; jar: Jar; membreId: string };

  beforeAll(async () => {
    await truncateAll(ctx.prisma);
    a = await proActive(ctx);
    b = await proActive(ctx);
  });

  it("⛔ MP-20 — SANS cookie de session : TOUTES les routes atteignables par un PRO rendent 401 `STAFF_SESSION_REQUIRED`, sauf les exemptées (dérivées) — qui, elles, ne le rendent pas", async () => {
    const reponses = await toutesLesRoutes(a.pro.token, undefined);
    const exemptes = new Set(routesPro.filter((r) => r.staffExempt).map(signature));
    const mal = reponses.filter((r) => refuseParLeGarde(r.res) === exemptes.has(signature(r.route))).map((r) => `${signature(r.route)} → ${r.res.status} ${codeDe(r.res) ?? ""} (exemptée : ${exemptes.has(signature(r.route))})`);
    expect(mal, `routes mal gardées :\n${mal.join("\n")}`).toEqual([]);
    expect(reponses.filter((r) => refuseParLeGarde(r.res)).length, "le garde a réellement refusé des routes").toBeGreaterThan(40);
  });

  it("⛔ les refus sont IDENTIQUES à l'octet entre routes : même statut, même code, même clé de message (aucune route ne dit pourquoi)", async () => {
    const reponses = await toutesLesRoutes(a.pro.token, undefined, (r) => !r.staffExempt);
    const corps = new Set(reponses.map((r) => JSON.stringify({ s: r.res.status, m: (r.res.body as { message: unknown }).message })));
    expect([...corps]).toEqual([JSON.stringify({ s: 401, m: { code: "STAFF_SESSION_REQUIRED", message: "staff.errors.sessionRequired" } })]);
  });

  it("⛔ AVEC la session de la salle : AUCUNE route atteignable par un PRO ne rend `STAFF_SESSION_REQUIRED` (le garde laisse passer ; la déconnexion, qui termine la session, est jouée à part)", async () => {
    const reponses = await toutesLesRoutes(a.pro.token, a.jar, (r) => !TERMINE_LA_SESSION.has(signature(r)));
    const refusees = reponses.filter((r) => refuseParLeGarde(r.res)).map((r) => signature(r.route));
    expect(refusees, `routes refusées malgré une session valide :\n${refusees.join("\n")}`).toEqual([]);
  });

  it("⛔ MP-18 — la session de la salle A présentée avec le Bearer de la salle B : TOUTES les routes non exemptées rendent 401 `STAFF_SESSION_REQUIRED` — et la session de A n'est PAS terminée par ce refus (on ne termine pas la session d'autrui)", async () => {
    const croise = new Jar();
    croise.poser("zwadj_ss", a.jar.session()!, "/api/v1");
    const reponses = await toutesLesRoutes(b.pro.token, croise, (r) => !r.staffExempt);
    const passees = reponses.filter((r) => !refuseParLeGarde(r.res)).map((r) => signature(r.route));
    expect(passees, `routes franchies avec la session d'une autre salle :\n${passees.join("\n")}`).toEqual([]);
    const s = await sessionParJeton(ctx.prisma, a.jar.session()!);
    expect(s.ended_at, "la session de A est intacte").toBeNull();
  });

  it("le cookie de session n'est lu que sous SON nom : la même valeur posée sous le nom du cookie de rafraîchissement n'ouvre rien", async () => {
    const faux = new Jar();
    faux.poser("zwadj_rt", a.jar.session()!, "/api/v1");
    const res = await appeler(ctx, a.pro.token, faux, "get", "/api/v1/pro/venues");
    expect(refuseParLeGarde(res)).toBe(true);
  });

  it("un cookie qui n'a pas la forme d'un jeton : le MÊME 401 que l'absence de cookie", async () => {
    const sans = await appeler(ctx, a.pro.token, undefined, "get", "/api/v1/pro/venues");
    const junk = new Jar();
    junk.poser("zwadj_ss", "pas-un-jeton", "/api/v1");
    const mauvais = await appeler(ctx, a.pro.token, junk, "get", "/api/v1/pro/venues");
    const inconnu = new Jar();
    inconnu.poser("zwadj_ss", "Z".repeat(43), "/api/v1");
    const absent = await appeler(ctx, a.pro.token, inconnu, "get", "/api/v1/pro/venues");
    expect(new Set([corpsStable(sans), corpsStable(mauvais), corpsStable(absent)]).size).toBe(1);
  });
});

describe("MP-34 — ni un ADMIN ni un CLIENT ne voient JAMAIS le garde du personnel", () => {
  it("⛔ un ADMIN et un CLIENT, sur TOUTES les routes (couche activée chez un pro, cookie de session présenté ou non) : aucune réponse n'est `STAFF_SESSION_REQUIRED`", async () => {
    await truncateAll(ctx.prisma);
    const { jar } = await proActive(ctx);
    await registerUser(ctx, { role: "CLIENT", email: "client@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Aya", lastName: "B" });
    await verifyLastRegistered(ctx);
    const clientToken = await loginAs(ctx, "client@example.dz", MOT_DE_PASSE_PRO);
    await registerUser(ctx, { role: "CLIENT", email: "admin@example.dz", password: MOT_DE_PASSE_PRO, firstName: "Adm", lastName: "In" });
    await verifyLastRegistered(ctx);
    await ctx.prisma.user.update({ where: { email: "admin@example.dz" }, data: { role: "ADMIN" } });
    const adminToken = await loginAs(ctx, "admin@example.dz", MOT_DE_PASSE_PRO);

    const atteignables = routes.filter((r) => !r.isPublic && !TERMINE_LA_SESSION.has(signature(r)));
    expect(atteignables.length).toBeGreaterThan(60);
    const refusees: string[] = [];
    for (const [nom, bearer] of [["admin", adminToken], ["client", clientToken]] as const) {
      for (const avecCookie of [false, true]) {
        for (const route of atteignables) {
          const res = await appeler(ctx, bearer, avecCookie ? jar : undefined, route.method, withIds(route.path));
          if (refuseParLeGarde(res)) refusees.push(`${nom} ${avecCookie ? "avec" : "sans"} cookie : ${signature(route)}`);
        }
      }
    }
    expect(refusees, refusees.join("\n")).toEqual([]);
  });
});

describe("MP-7 — la couche activée PENDANT qu'un Pro est connecté", () => {
  it("⛔ le MÊME Bearer : la requête d'avant passe, la requête d'APRÈS l'activation est refusée (le drapeau est relu à chaque requête, jamais mis dans le jeton)", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const avant = await appeler(ctx, pro.token, undefined, "get", "/api/v1/pro/venues");
    expect(avant.status).toBe(200);
    // « un autre appel » active la couche : ici, la même route d'activation, avec un autre pot de cookies (un autre poste).
    const autrePoste = await appeler(ctx, pro.token, new Jar(), "post", "/api/v1/pro/staff/activate", { accountName: "Amine", password: "Zq7!xvn3-Pk2" });
    expect(autrePoste.status).toBe(201);
    const apres = await appeler(ctx, pro.token, undefined, "get", "/api/v1/pro/venues");
    expect(apres.status).toBe(401);
    expect(codeDe(apres)).toBe("STAFF_SESSION_REQUIRED");
  });

  it("le jeton d'accès NE PORTE PAS le drapeau : ses claims sont toujours { sub, role } (D4) — un jeton émis avant l'activation reste valable après", async () => {
    await truncateAll(ctx.prisma);
    const pro = await creerPro(ctx);
    const claims = JSON.parse(Buffer.from(pro.token.split(".")[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
    expect(Object.keys(claims).filter((k) => !["iat", "exp"].includes(k)).sort()).toEqual(["role", "sub"]);
  });
});

describe("MP-19 / MP-4 — la révocation à l'instant", () => {
  it("⛔ une session terminée par SQL (fin `LOGOUT` posée à la main) est refusée à la requête suivante, sans attendre", async () => {
    await truncateAll(ctx.prisma);
    const { pro, jar } = await proActive(ctx);
    const s = await sessionParJeton(ctx.prisma, jar.session()!);
    await ctx.prisma.$executeRaw`UPDATE pro_staff_sessions SET ended_at = now(), end_reason = 'LOGOUT' WHERE id = ${s.id}::uuid`;
    const res = await appeler(ctx, pro.token, jar, "get", "/api/v1/pro/venues");
    expect(refuseParLeGarde(res)).toBe(true);
  });

  it("⛔ une session INACTIVE puis refusée : la fin `IDLE` est écrite ; la session de l'AUTRE salle, qui a le même âge, n'est pas touchée", async () => {
    await truncateAll(ctx.prisma);
    const a = await proActive(ctx);
    const b = await proActive(ctx);
    const sa = await sessionParJeton(ctx.prisma, a.jar.session()!);
    const sb = await sessionParJeton(ctx.prisma, b.jar.session()!);
    await rendreInactive(ctx.prisma, sa.id, 3600);
    await rendreInactive(ctx.prisma, sb.id, 3600);
    expect(refuseParLeGarde(await appeler(ctx, a.pro.token, a.jar, "get", "/api/v1/pro/venues"))).toBe(true);
    expect((await sessionParJeton(ctx.prisma, a.jar.session()!)).end_reason).toBe("IDLE");
    expect((await sessionParJeton(ctx.prisma, b.jar.session()!)).ended_at, "la session de B n'a pas été présentée : elle n'est pas terminée").toBeNull();
  });

  it("le hachage SHA-256 du cookie est ce qui est cherché : un cookie dont le hachage a été retiré de la base est refusé", async () => {
    await truncateAll(ctx.prisma);
    const { pro, jar } = await proActive(ctx);
    await ctx.prisma.$executeRaw`DELETE FROM pro_staff_sessions WHERE token_hash = ${sha256(jar.session()!)}`;
    expect(refuseParLeGarde(await appeler(ctx, pro.token, jar, "get", "/api/v1/pro/venues"))).toBe(true);
  });
});
