import { createHash } from "node:crypto";
import request from "supertest";
import {
  createTestApp,
  refreshCookieOf,
  registerUser,
  truncateAll,
  verifyLastRegistered,
  type TestContext
} from "./helpers";

const CLIENT = { role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" };

describe("POST /api/v1/auth/refresh (intégration — rotation D9, réutilisation D10, format D12)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    ctx.emails.length = 0;
  });

  const server = () => ctx.app.getHttpServer();
  const login = () =>
    request(server()).post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
  const refreshWith = (rawCookie?: string) => {
    const req = request(server()).post("/api/v1/auth/refresh");
    return rawCookie === undefined ? req : req.set("Cookie", `zwadj_rt=${rawCookie}`);
  };

  it("sans cookie : 401 UNAUTHENTICATED", async () => {
    const res = await refreshWith();
    expect(res.status).toBe(401);
    expect(res.body.message).toEqual({ code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" });
  });

  it("cookie forgé (43 chars valides mais inconnus) : 401, AUCUNE ligne touchée", async () => {
    await registerUser(ctx, CLIENT);
    await login();
    const res = await refreshWith("A".repeat(43));

    expect(res.status).toBe(401);
    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revokedAt).toBeNull(); // la session légitime n'a pas bougé
  });

  it("nominal (D9) : nouveau cookie ≠ ancien, ancienne ligne révoquée, nouvelle active, hash aligné", async () => {
    await registerUser(ctx, CLIENT);
    const oldRaw = refreshCookieOf(await login())!.raw;

    const res = await refreshWith(oldRaw);
    expect(res.status).toBe(200);

    const newCookie = refreshCookieOf(res);
    expect(newCookie).toBeDefined();
    expect(newCookie!.raw).not.toBe(oldRaw); // rotation, pas prolongation
    expect(newCookie!.attributes).toContain("HttpOnly");
    expect(newCookie!.attributes).toContain("Path=/api/v1/auth");
    expect(newCookie!.attributes).toContain("SameSite=Lax");
    expect(JSON.stringify(res.body)).not.toContain(newCookie!.raw); // D2 : jamais dans le corps

    const rows = await ctx.prisma.refreshToken.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.tokenHash).toBe(createHash("sha256").update(oldRaw).digest("hex"));
    expect(rows[0]!.revokedAt).not.toBeNull(); // l'ancien est consommé
    expect(rows[1]!.tokenHash).toBe(createHash("sha256").update(newCookie!.raw).digest("hex"));
    expect(rows[1]!.revokedAt).toBeNull(); // le neuf est la seule session active
  });

  it("D12 : réponse au format login ({ accessToken, user }), et l'access token émis fonctionne sur /me", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;

    const res = await refreshWith(raw);
    expect(res.body.user).toMatchObject({ email: "aya@example.dz", role: "CLIENT", proProfile: null });

    const me = await request(server())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken as string}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("aya@example.dz");
  });

  it("fraîcheur (D12) : email vérifié ENTRE login et refresh → le refresh renvoie emailVerified:true", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;
    await verifyLastRegistered(ctx);

    const res = await refreshWith(raw);
    expect(res.body.user.emailVerified).toBe(true); // sans re-login : mêmes données fraîches que /me
  });

  it("rotation en chaîne : 3 refresh → 4 lignes, SEULE la dernière active", async () => {
    await registerUser(ctx, CLIENT);
    let raw = refreshCookieOf(await login())!.raw;
    for (let i = 0; i < 3; i++) {
      const res = await refreshWith(raw);
      expect(res.status).toBe(200);
      raw = refreshCookieOf(res)!.raw;
    }

    const rows = await ctx.prisma.refreshToken.findMany();
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
    const active = rows.find((r) => r.revokedAt === null)!;
    expect(active.tokenHash).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("RÉUTILISATION (D10, chaîne complète) : rejouer un token consommé → 401 ET l'autre session du user tombe aussi", async () => {
    await registerUser(ctx, CLIENT);
    const sessionA = refreshCookieOf(await login())!.raw; // appareil A
    const sessionB = refreshCookieOf(await login())!.raw; // appareil B (2e session légitime)

    // A tourne normalement : A est consommé, A2 le remplace
    const rotated = await refreshWith(sessionA);
    const sessionA2 = refreshCookieOf(rotated)!.raw;

    // ⚠ D116 — ON VIEILLIT LA ROTATION AVANT DE REJOUER.
    // Sans ça, ce rejeu tomberait dans la fenêtre de grâce de 30 s et rendrait
    // 200 : c'est le comportement VOULU depuis D116, et le test suivant le
    // prouve. Ici on teste la détection de vol, qui ne commence qu'APRÈS la
    // fenêtre — donc on place le rejeu là où elle vit vraiment.
    await ageRotation(sessionA);

    // L'attaquant (ou un rejeu accidentel) présente A, déjà consommé
    const replay = await refreshWith(sessionA);
    expect(replay.status).toBe(401);
    expect(refreshCookieOf(replay)).toBeUndefined(); // aucun successeur émis

    // Révocation GLOBALE : plus aucune session active en base…
    const active = await ctx.prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(active).toBe(0);
    // …et ni A2 (le successeur légitime) ni B (l'autre appareil) ne marchent plus
    expect((await refreshWith(sessionA2)).status).toBe(401);
    expect((await refreshWith(sessionB)).status).toBe(401);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // D116 — FENÊTRE DE GRÂCE À LA ROTATION
  //
  // Le mutex de D115 sérialise les refresh d'UN contexte JS. Deux ONGLETS sont
  // deux contextes qui présentent le MÊME cookie : aucun mutex navigateur ne
  // peut les fusionner. Avant D116, deux onglets rechargés en même temps
  // faisaient tomber toutes les sessions de l'utilisateur, sur tous ses
  // appareils. Le correctif appartient donc au serveur.
  //
  // Ce que ces tests délimitent, dans les deux sens : ce que la grâce autorise,
  // et ce qu'elle n'autorise SURTOUT pas.
  // ───────────────────────────────────────────────────────────────────────────

  it("D116 — deux onglets présentent le MÊME cookie EN MÊME TEMPS : les deux gardent la session", async () => {
    await registerUser(ctx, CLIENT);
    const shared = refreshCookieOf(await login())!.raw;

    const [tab1, tab2] = await Promise.all([refreshWith(shared), refreshWith(shared)]);

    expect(tab1.status).toBe(200);
    expect(tab2.status).toBe(200);
    // Les DEUX repartent avec une session utilisable — aucun ne se retrouve
    // devant un écran de connexion.
    expect((tab1.body as { accessToken: string }).accessToken.split(".")).toHaveLength(3);
    expect((tab2.body as { accessToken: string }).accessToken.split(".")).toHaveLength(3);

    // ⚠ MAIS UN SEUL POSE UN COOKIE. Le perdant de la course n'en pose AUCUN :
    // le pot à cookies du navigateur est partagé, celui du gagnant y est déjà,
    // et l'écraser reviendrait à jeter le seul jeton encore porté.
    const cookies = [refreshCookieOf(tab1), refreshCookieOf(tab2)].filter(Boolean);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.raw).not.toBe(shared);
    expect((await refreshWith(cookies[0]!.raw)).status).toBe(200);

    // ⚠ ET SURTOUT : aucune révocation en masse. C'était ÇA le défaut — pas la
    // requête perdue, mais l'utilisateur déconnecté de son téléphone parce
    // qu'il avait deux onglets ouverts sur son ordinateur.
    const alive = await ctx.prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(alive).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // D116 — LES DEUX TESTS QUI ONT FAIT CHANGER LA CONCEPTION
  //
  // La première version de D116 ROTAIT dans la fenêtre de grâce : chaque
  // appelant repartait avec son propre cookie. C'est séduisant et c'est faux —
  // les onglets partagent UN pot à cookies, un seul `Set-Cookie` survit.
  // Ces deux tests-ci étaient ROUGES contre cette version.
  // ───────────────────────────────────────────────────────────────────────────

  it("D116 — dix rechargements à deux onglets ne laissent AUCUN jeton orphelin", async () => {
    await registerUser(ctx, CLIENT);
    let jar = refreshCookieOf(await login())!.raw;
    const alive = () => ctx.prisma.refreshToken.count({ where: { revokedAt: null } });

    expect(await alive()).toBe(1);

    for (let cycle = 0; cycle < 10; cycle += 1) {
      const [t1, t2] = await Promise.all([refreshWith(jar), refreshWith(jar)]);
      expect(t1.status).toBe(200);
      expect(t2.status).toBe(200);
      // Le navigateur ne garde qu'un cookie : celui que le gagnant a posé.
      jar = (refreshCookieOf(t1) ?? refreshCookieOf(t2))!.raw;

      // ⚠ L'INVARIANT. Un jeton vivant, toujours — jamais deux, jamais onze.
      // Avec la re-rotation, ce compteur montait de 1 à CHAQUE tour : dix
      // identifiants valides 30 jours que plus personne ne porte.
      expect(await alive()).toBe(1);
    }

    // Et le cookie effectivement porté marche toujours au bout des dix tours.
    expect((await refreshWith(jar)).status).toBe(200);
  });

  it("D116 — la déconnexion ferme TOUT ce que la fenêtre de grâce a ouvert, pas seulement le dernier jeton", async () => {
    // Le vrai enjeu, celui qui a tranché : avec la re-rotation, « Se
    // déconnecter » laissait derrière lui un jeton valide par rechargement à
    // deux onglets — D11 ne révoque que le jeton PRÉSENTÉ. Le bouton cessait
    // de vouloir dire ce qu'il dit.
    await registerUser(ctx, CLIENT);
    let jar = refreshCookieOf(await login())!.raw;

    // Cinq passages par la fenêtre de grâce, plus un rejeu séquentiel du même
    // cookie (la réponse perdue puis retentée) — tous les chemins graciés.
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const [t1, t2] = await Promise.all([refreshWith(jar), refreshWith(jar)]);
      const next = (refreshCookieOf(t1) ?? refreshCookieOf(t2))!.raw;
      expect((await refreshWith(jar)).status).toBe(200); // rejeu gracié, sans nouveau cookie
      jar = next;
    }

    await request(server()).post("/api/v1/auth/logout").set("Cookie", `zwadj_rt=${jar}`).expect(200);

    // AUCUNE session ne survit. C'est l'assertion que la version à
    // re-rotation ne pouvait pas tenir : elle en laissait cinq.
    expect(await ctx.prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
    expect((await refreshWith(jar)).status).toBe(401);
  });

  it("D116 — après déconnexion, un rejeu DANS la fenêtre ne rouvre rien (aucun héritier vivant)", async () => {
    // La grâce n'est pas inconditionnelle : elle exige que la rotation ait
    // produit un successeur ENCORE VIVANT. Sinon se déconnecter puis rejouer un
    // jeton roté il y a deux secondes rouvrirait l'accès qu'on vient de fermer.
    await registerUser(ctx, CLIENT);
    const first = refreshCookieOf(await login())!.raw;
    const second = refreshCookieOf(await refreshWith(first).expect(200))!.raw;

    await request(server()).post("/api/v1/auth/logout").set("Cookie", `zwadj_rt=${second}`).expect(200);

    // `first` est roté depuis moins de 30 s — la fenêtre est ouverte — mais sa
    // lignée est morte.
    const replay = await refreshWith(first);
    expect(replay.status).toBe(401);
    expect(refreshCookieOf(replay)).toBeUndefined();
    expect(await ctx.prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });

  it("D116 — le rejeu du MÊME cookie dans la fenêtre rend 200 ; passé la fenêtre, il rend 401 et révoque tout", async () => {
    await registerUser(ctx, CLIENT);
    const first = refreshCookieOf(await login())!.raw;

    // Dans la fenêtre : réponse perdue puis retentée — la session tient.
    await refreshWith(first).expect(200);
    expect((await refreshWith(first)).status).toBe(200);

    // Hors fenêtre : le MÊME geste redevient un signal de vol.
    await ageRotation(first);
    expect((await refreshWith(first)).status).toBe(401);
    expect(await ctx.prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });

  it("D116 — la DÉCONNEXION n'a AUCUNE grâce : le token est mort à l'instant même", async () => {
    // C'est la raison d'être de la colonne `rotated_at`. Lire `revoked_at` seul
    // aurait donné 30 secondes de sursis à un utilisateur qui vient de cliquer
    // « Se déconnecter » — exactement ce qu'il a demandé qu'on ne fasse pas.
    await registerUser(ctx, CLIENT);
    const session = refreshCookieOf(await login())!.raw;

    await request(server()).post("/api/v1/auth/logout").set("Cookie", `zwadj_rt=${session}`).expect(200);

    const replay = await refreshWith(session);
    expect(replay.status).toBe(401);
    expect(refreshCookieOf(replay)).toBeUndefined();

    const row = await ctx.prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(session).digest("hex") }
    });
    expect(row.revokedAt).not.toBeNull();
    expect(row.rotatedAt).toBeNull(); // révoqué SANS rotation : aucune grâce possible
  });

  it("D116 — un compte SUSPENDU ne se rouvre pas par la grâce", async () => {
    await registerUser(ctx, CLIENT);
    const session = refreshCookieOf(await login())!.raw;
    await refreshWith(session).expect(200); // pose `rotated_at`, on est dans la fenêtre

    await ctx.prisma.user.update({ where: { email: CLIENT.email }, data: { status: "SUSPENDED" } });

    expect((await refreshWith(session)).status).toBe(401);
  });

  /** Recule `rotated_at` au-delà de la fenêtre de grâce, sans toucher au reste.
   *  Vieillir la donnée plutôt qu'attendre 30 s : le test reste déterministe. */
  async function ageRotation(rawCookie: string): Promise<void> {
    await ctx.prisma.refreshToken.updateMany({
      where: { tokenHash: createHash("sha256").update(rawCookie).digest("hex") },
      data: { rotatedAt: new Date(Date.now() - 10 * 60_000) }
    });
  }

  it("token expiré (non révoqué) : 401 simple — l'AUTRE session du user survit", async () => {
    await registerUser(ctx, CLIENT);
    const expired = refreshCookieOf(await login())!.raw;
    const alive = refreshCookieOf(await login())!.raw;
    await ctx.prisma.refreshToken.update({
      where: { tokenHash: createHash("sha256").update(expired).digest("hex") },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    expect((await refreshWith(expired)).status).toBe(401);
    expect((await refreshWith(alive)).status).toBe(200); // pas de révocation globale sur simple expiration
  });

  it("user supprimé : la cascade FK efface ses lignes → cookie inconnu → 401", async () => {
    await registerUser(ctx, CLIENT);
    const raw = refreshCookieOf(await login())!.raw;
    await ctx.prisma.user.delete({ where: { email: CLIENT.email } });

    expect(await ctx.prisma.refreshToken.count()).toBe(0); // preuve de la cascade
    expect((await refreshWith(raw)).status).toBe(401);
  });
});
