// Intégration Lot A10 sur PostgreSQL RÉEL. Ce qui ne se prouve QU'ICI :
//  - l'index unique PARTIEL `..._one_pending` (deux demandes concurrentes) ;
//  - §2.0 de bout en bout : après anonymisation, les CINQ chemins d'auth
//    refusent réellement — c'est le point du lot, et un mock ne le prouve pas ;
//  - l'archivage vu depuis la LISTE PUBLIQUE : la salle disparaît sans qu'un
//    seul prédicat n'ait été ajouté à `GET /venues` ;
//  - le cycle complet de changement d'e-mail, avec le vrai lien capturé.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDTO, DeletionRequestDTO } from "@zwadj/types";
import {
  createTestApp,
  extractToken,
  loginAs,
  refreshCookieOf,
  registerUser,
  truncateAll,
  verifyLastRegistered,
  type TestContext
} from "./helpers";

let ctx: TestContext;

const CLIENT = {
  role: "CLIENT",
  email: "aya@example.dz",
  password: "Motdepasse1",
  firstName: "Aya",
  lastName: "Boudiaf"
};
const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salle El Ryad",
  phone: "+213551234567"
};
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Ad", lastName: "Min" };

const api = () => request(ctx.app.getHttpServer());
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function clientSession(): Promise<string> {
  await registerUser(ctx, CLIENT);
  return loginAs(ctx, CLIENT.email, CLIENT.password);
}

async function proSession(): Promise<string> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  return loginAs(ctx, PRO.email, PRO.password);
}

/** Session ADMIN : CLIENT vérifié puis élévation en base (patron A3). */
async function adminSession(): Promise<string> {
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  return loginAs(ctx, ADMIN.email, ADMIN.password);
}

/** Une salle PUBLIÉE et visible dans la liste publique, appartenant au pro. */
async function publishedVenue(proToken: string): Promise<string> {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const created = await api()
    .post("/api/v1/venues")
    .set(auth(proToken))
    .send({
      cityId: city.id,
      nameFr: "Salle El Ferdous",
      nameAr: "قاعة الفردوس",
      capacityMax: 450,
      basePriceCents: 18_000_000
    });
  const id = (created.body as { id: string }).id;
  await ctx.prisma.venue.update({ where: { id }, data: { publicationStatus: "PUBLISHED" } });
  return id;
}

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

describe("PATCH /me/profile", () => {
  it("CLIENT : patch partiel, et la réponse est un AuthUserDTO complet (D12)", async () => {
    const token = await clientSession();
    const res = await api().patch("/api/v1/me/profile").set(auth(token)).send({ firstName: "Yasmine" });

    expect(res.status).toBe(200);
    const body = res.body as AuthUserDTO;
    expect(body.firstName).toBe("Yasmine");
    expect(body.lastName).toBe("Boudiaf"); // clé absente = inchangée
    // Les 4 champs A10 arrivent par la MÊME porte que partout ailleurs.
    expect(body).toMatchObject({ hasPassword: true, hasGoogle: false, phone: null, proProfile: null });
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("PRO : businessName + phone2 (D38) ; le CLIENT ne peut pas s'en fabriquer", async () => {
    const proToken = await proSession();
    const ok = await api()
      .patch("/api/v1/me/profile")
      .set(auth(proToken))
      .send({ businessName: "Salle El Ferdous", phone2: "+213770000001" });
    expect(ok.status).toBe(200);
    expect((ok.body as AuthUserDTO).proProfile).toEqual({
      businessName: "Salle El Ferdous",
      phone: "+213551234567",
      phone2: "+213770000001",
      notifyByEmail: true,
      notifyBySms: false
    });

    const clientToken = await clientSession();
    const ko = await api().patch("/api/v1/me/profile").set(auth(clientToken)).send({ businessName: "Pirate" });
    expect(ko.status).toBe(400);
    expect(ko.body.message.code).toBe("PROFILE_FIELD_NOT_ALLOWED");
  });
});

describe("POST /me/change-email — l'ancienne adresse reste active jusqu'à la preuve", () => {
  it("cycle complet : demande → l'ancien e-mail connecte TOUJOURS → clic → bascule", async () => {
    const token = await clientSession();
    ctx.emails.length = 0;

    const asked = await api().post("/api/v1/me/change-email").set(auth(token)).send({ newEmail: "neuf@example.dz" });
    expect(asked.status).toBe(202);

    // Le lien part À LA NOUVELLE adresse — c'est tout l'intérêt du flux.
    const sent = ctx.emails.at(-1);
    expect(sent?.to).toBe("neuf@example.dz");

    // AVANT le clic : rien n'a bougé. Une faute de frappe serait sans danger.
    expect(await loginAs(ctx, CLIENT.email, CLIENT.password)).toBeTruthy();

    const confirmed = await api().get(`/api/v1/auth/confirm-email-change/${extractToken(sent!.text)}`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toEqual({ status: "changed", email: "neuf@example.dz" });

    // APRÈS : la nouvelle adresse connecte, l'ancienne ne connecte plus.
    expect(await loginAs(ctx, "neuf@example.dz", CLIENT.password)).toBeTruthy();
    const old = await api()
      .post("/api/v1/auth/login")
      .send({ email: CLIENT.email, password: CLIENT.password });
    expect(old.status).toBe(401);
  });

  it("token rejoué : 400 TOKEN_INVALID_OR_EXPIRED (usage unique)", async () => {
    const token = await clientSession();
    ctx.emails.length = 0;
    await api().post("/api/v1/me/change-email").set(auth(token)).send({ newEmail: "neuf@example.dz" });
    const raw = extractToken(ctx.emails.at(-1)!.text);

    expect((await api().get(`/api/v1/auth/confirm-email-change/${raw}`)).status).toBe(200);
    const replay = await api().get(`/api/v1/auth/confirm-email-change/${raw}`);
    expect(replay.status).toBe(400);
    expect(replay.body.message.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });
});

describe("POST /me/change-password (D42)", () => {
  it("compte Google-only : DÉFINIT un mot de passe, puis les DEUX voies connectent", async () => {
    // Compte créé sans mot de passe, comme le fait /auth/google.
    const user = await ctx.prisma.user.create({
      data: {
        email: "google@example.dz",
        passwordHash: null,
        role: "CLIENT",
        locale: "fr",
        googleSub: "sub-123",
        emailVerifiedAt: new Date()
      }
    });
    ctx.googleTokens.set("tok", {
      sub: "sub-123",
      email: "google@example.dz",
      emailVerified: true,
      givenName: null,
      familyName: null
    });
    const logged = await api().post("/api/v1/auth/google").send({ idToken: "tok" });
    expect((logged.body as { user: AuthUserDTO }).user.hasPassword).toBe(false); // pilote l'écran A11

    const res = await api()
      .post("/api/v1/me/change-password")
      .set(auth((logged.body as { accessToken: string }).accessToken))
      .send({ newPassword: "Motdepasse1" });
    expect(res.status).toBe(200);

    // Voie 1 : e-mail + mot de passe fraîchement défini.
    expect(await loginAs(ctx, "google@example.dz", "Motdepasse1")).toBeTruthy();
    // Voie 2 : Google continue de fonctionner — on a AJOUTÉ une voie, pas
    // remplacé l'autre. C'est ce que A11 doit annoncer à l'écran.
    expect((await api().post("/api/v1/auth/google").send({ idToken: "tok" })).status).toBe(200);
    const after = await ctx.prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.googleSub).toBe("sub-123");
  });

  it("les AUTRES sessions tombent, celle qui a fait l'appel survit (rotée)", async () => {
    await registerUser(ctx, CLIENT);
    // Deux navigateurs distincts.
    const a = await api().post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
    const b = await api().post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
    const cookieA = refreshCookieOf(a)!.raw;
    const cookieB = refreshCookieOf(b)!.raw;

    const res = await api()
      .post("/api/v1/me/change-password")
      .set(auth((a.body as { accessToken: string }).accessToken))
      .set("Cookie", [`zwadj_rt=${cookieA}`])
      .send({ currentPassword: CLIENT.password, newPassword: "Nouveaupass1" });
    expect(res.status).toBe(200);

    // L'appareil courant reçoit un cookie NEUF et reste utilisable.
    const rotated = refreshCookieOf(res)?.raw;
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(cookieA);
    const stillAlive = await api().post("/api/v1/auth/refresh").set("Cookie", [`zwadj_rt=${rotated}`]);
    expect(stillAlive.status).toBe(200);

    // L'autre navigateur est déconnecté.
    const other = await api().post("/api/v1/auth/refresh").set("Cookie", [`zwadj_rt=${cookieB}`]);
    expect(other.status).toBe(401);
  });

  it("ancien mot de passe faux : 400, et l'ancien reste valide", async () => {
    const token = await clientSession();
    const res = await api()
      .post("/api/v1/me/change-password")
      .set(auth(token))
      .send({ currentPassword: "Mauvais123", newPassword: "Nouveaupass1" });
    expect(res.status).toBe(400);
    expect(res.body.message.code).toBe("CURRENT_PASSWORD_INVALID");
    expect(await loginAs(ctx, CLIENT.email, CLIENT.password)).toBeTruthy();
  });
});

describe("D37 — la demande de suppression ne supprime RIEN", () => {
  it("une seule demande en attente : la seconde tape dans l'index unique PARTIEL → 409", async () => {
    const token = await clientSession();
    expect((await api().post("/api/v1/me/deletion-request").set(auth(token)).send({})).status).toBe(201);

    const second = await api().post("/api/v1/me/deletion-request").set(auth(token)).send({});
    expect(second.status).toBe(409);
    expect(second.body.message.code).toBe("DELETION_REQUEST_ALREADY_PENDING");

    // Le compte reste PLEINEMENT fonctionnel tant que l'admin n'a pas tranché.
    expect((await api().get("/api/v1/auth/me").set(auth(token))).status).toBe(200);
  });

  it("annulation : PENDING → CANCELLED, et une nouvelle demande redevient possible", async () => {
    const token = await clientSession();
    await api().post("/api/v1/me/deletion-request").set(auth(token)).send({ reason: "Je n'en ai plus besoin" });

    const cancelled = await api().post("/api/v1/me/deletion-request/cancel").set(auth(token)).send({});
    expect(cancelled.status).toBe(200);
    expect((cancelled.body as DeletionRequestDTO).status).toBe("CANCELLED");

    // L'index unique est PARTIEL : il n'entrave pas l'historique.
    expect((await api().post("/api/v1/me/deletion-request").set(auth(token)).send({})).status).toBe(201);
  });

  it("GET /me/deletion-request : null quand il n'y en a aucune (les 3 états d'A11)", async () => {
    const token = await clientSession();
    const empty = await api().get("/api/v1/me/deletion-request").set(auth(token));
    expect(empty.status).toBe(200);
    // Assertion volontairement tolérante : Nest répond un corps VIDE pour un
    // handler qui retourne `null` (`isNil(body) ⇒ response.send()`), et
    // supertest le présente alors comme `{}` — mais un corps littéral `null`
    // serait tout aussi correct côté contrat. Ce qui compte ici, et qui est
    // asserté, c'est « aucune demande », pas la sérialisation exacte du vide.
    expect(empty.body === null || Object.keys(empty.body as object).length === 0).toBe(true);
  });
});

describe("admin — décision", () => {
  it("un PRO n'accède pas à la file (403)", async () => {
    const proToken = await proSession();
    expect((await api().get("/api/v1/admin/deletion-requests").set(auth(proToken))).status).toBe(403);
  });

  it("reject : compte intact, ACTIVE, et l'utilisateur reçoit le motif", async () => {
    const token = await clientSession();
    const created = await api().post("/api/v1/me/deletion-request").set(auth(token)).send({});
    const adminToken = await adminSession();
    ctx.emails.length = 0;

    const res = await api()
      .post(`/api/v1/admin/deletion-requests/${(created.body as DeletionRequestDTO).id}/reject`)
      .set(auth(adminToken))
      .send({ decisionNote: "Commissions en cours de règlement." });
    expect(res.status).toBe(200);

    expect((await api().get("/api/v1/auth/me").set(auth(token))).status).toBe(200);
    const user = await ctx.prisma.user.findUnique({ where: { email: CLIENT.email } });
    expect(user?.status).toBe("ACTIVE");
    expect(ctx.emails.at(-1)?.text).toContain("Commissions en cours de règlement.");
  });

  it("approve : compte anonymisé, salles ARCHIVÉES et disparues de la liste publique", async () => {
    const proToken = await proSession();
    const venueId = await publishedVenue(proToken);
    // La salle est bien visible AVANT.
    expect((await api().get("/api/v1/venues")).body.items).toHaveLength(1);

    const created = await api().post("/api/v1/me/deletion-request").set(auth(proToken)).send({});
    const requestId = (created.body as DeletionRequestDTO).id;
    const adminToken = await adminSession();
    ctx.emails.length = 0;

    const res = await api()
      .post(`/api/v1/admin/deletion-requests/${requestId}/approve`)
      .set(auth(adminToken))
      .send({});
    expect(res.status).toBe(200);

    // D41 — la salle est archivée par `deletedAt`, PAS supprimée : elle
    // disparaît de la liste publique sans qu'un seul prédicat n'ait été ajouté
    // à GET /venues (l'archivage réutilise l'axe de soft delete existant).
    expect((await api().get("/api/v1/venues")).body.items).toHaveLength(0);
    const venue = await ctx.prisma.venue.findUnique({ where: { id: venueId } });
    expect(venue).not.toBeNull(); // jamais de DELETE SQL
    expect(venue?.deletedAt).not.toBeNull();
    const archived = await ctx.prisma.accountDeletionArchivedVenue.findMany({ where: { requestId } });
    expect(archived.map((a) => a.venueId)).toEqual([venueId]);

    // Anonymisation effective.
    const user = await ctx.prisma.user.findFirst({ where: { proProfile: { isNot: null } } });
    expect(user?.status).toBe("ANONYMIZED");
    expect(user?.email).toMatch(/@zwadj\.invalid$/);
    expect(user?.googleSub).toBeNull();
    // businessName CONSERVÉ : c'est lui qui permettra de retrouver les salles.
    const profile = await ctx.prisma.proProfile.findFirst();
    expect(profile?.businessName).toBe("Salle El Ryad");
    expect(profile?.phone).toBe("");

    // L'e-mail de décision est parti à l'adresse CAPTURÉE avant l'anonymisation.
    expect(ctx.emails.at(-1)?.to).toBe(PRO.email);
  });
});

describe("§2.0 — après anonymisation, les chemins d'auth refusent RÉELLEMENT", () => {
  /** Anonymise le compte client par le vrai parcours admin. */
  async function anonymiseClient(): Promise<{ token: string; cookie: string }> {
    await registerUser(ctx, CLIENT);
    const logged = await api().post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
    const token = (logged.body as { accessToken: string }).accessToken;
    const cookie = refreshCookieOf(logged)!.raw;

    const created = await api().post("/api/v1/me/deletion-request").set(auth(token)).send({});
    const adminToken = await adminSession();
    await api()
      .post(`/api/v1/admin/deletion-requests/${(created.body as DeletionRequestDTO).id}/approve`)
      .set(auth(adminToken))
      .send({});
    return { token, cookie };
  }

  it("login → 401 INVALID_CREDENTIALS (aucun oracle, D5)", async () => {
    await anonymiseClient();
    const res = await api().post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
    expect(res.status).toBe(401);
    expect(res.body.message.code).toBe("INVALID_CREDENTIALS");
  });

  it("/auth/me avec un access token encore valide → 401", async () => {
    // L'exposition résiduelle assumée (§2.0) est la durée de vie de l'access
    // token ; ce test montre qu'elle ne s'applique PAS à /auth/me, qui relit
    // la base à chaque appel.
    const { token } = await anonymiseClient();
    expect((await api().get("/api/v1/auth/me").set(auth(token))).status).toBe(401);
  });

  it("refresh avec le cookie d'avant → 401 (tous les tokens ont été révoqués)", async () => {
    const { cookie } = await anonymiseClient();
    const res = await api().post("/api/v1/auth/refresh").set("Cookie", [`zwadj_rt=${cookie}`]);
    expect(res.status).toBe(401);
  });

  it("forgot-password : réponse CONSTANTE, mais aucun e-mail ne part", async () => {
    await anonymiseClient();
    ctx.emails.length = 0;
    const res = await api().post("/api/v1/auth/forgot-password").send({ email: CLIENT.email });
    expect(res.status).toBe(202); // rien ne change pour l'observateur…
    expect(ctx.emails).toHaveLength(0); // …mais rien ne part non plus
  });

  it("un lien de reset émis AVANT la décision cesse d'être exploitable", async () => {
    await registerUser(ctx, CLIENT);
    const logged = await api().post("/api/v1/auth/login").send({ email: CLIENT.email, password: CLIENT.password });
    const token = (logged.body as { accessToken: string }).accessToken;
    ctx.emails.length = 0;
    await api().post("/api/v1/auth/forgot-password").send({ email: CLIENT.email });
    const resetToken = extractToken(ctx.emails.at(-1)!.text);

    const created = await api().post("/api/v1/me/deletion-request").set(auth(token)).send({});
    const adminToken = await adminSession();
    await api()
      .post(`/api/v1/admin/deletion-requests/${(created.body as DeletionRequestDTO).id}/approve`)
      .set(auth(adminToken))
      .send({});

    const res = await api()
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, password: "Nouveaupass1" });
    expect(res.status).toBe(400);
    // Ce chemin raisonne en TOKEN (D16), pas en identifiants.
    expect(res.body.message.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });
});
