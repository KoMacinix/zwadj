import request from "supertest";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

describe("POST /api/v1/auth/register (intégration, base réelle)", () => {
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

  it("inscrit un CLIENT : 201, hash argon2 en base, token créé, email FR avec lien /fr", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "Aya@Example.DZ", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "aya@example.dz", role: "CLIENT", locale: "fr" });

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "aya@example.dz" } });
    // Lot 8 : passwordHash est nullable au TYPE (comptes Google-only) — register
    // en pose toujours un ; l'optional chaining fait échouer le test sur null.
    expect(user.passwordHash?.startsWith("$argon2id$")).toBe(true);
    expect(user.passwordHash).not.toContain("Motdepasse1");
    expect(user.emailVerifiedAt).toBeNull();

    const tokens = await ctx.prisma.emailVerificationToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.usedAt).toBeNull();

    expect(ctx.emails).toHaveLength(1);
    expect(ctx.emails[0]!.to).toBe("aya@example.dz");
    expect(ctx.emails[0]!.subject).toContain("Confirmez");
    expect(ctx.emails[0]!.text).toMatch(/http:\/\/localhost:3000\/fr\/auth\/verification-email\?token=[A-Za-z0-9_-]{43}/);
  });

  it("7.2 — CLIENT : refuse sans prénom/nom (clés i18n, rien créé) ; accepte téléphone fourni (persisté) ou omis (null)", async () => {
    const server = ctx.app.getHttpServer();

    const sansNoms = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "sans-noms@example.dz", password: "Motdepasse1" });
    expect(sansNoms.status).toBe(400);
    expect(sansNoms.body.message.issues).toContainEqual(
      expect.objectContaining({ path: "firstName", message: "auth.validation.firstNameRequired" })
    );
    expect(sansNoms.body.message.issues).toContainEqual(
      expect.objectContaining({ path: "lastName", message: "auth.validation.lastNameRequired" })
    );
    expect(await ctx.prisma.user.count()).toBe(0);

    const avecTel = await request(server).post("/api/v1/auth/register").send({
      role: "CLIENT",
      email: "avec-tel@example.dz",
      password: "Motdepasse1",
      firstName: "Amina",
      lastName: "Boudiaf",
      phone: "+213551234567"
    });
    expect(avecTel.status).toBe(201);
    const userTel = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "avec-tel@example.dz" } });
    expect(userTel).toMatchObject({ firstName: "Amina", lastName: "Boudiaf", phone: "+213551234567" });

    const sansTel = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "sans-tel@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });
    expect(sansTel.status).toBe(201);
    const userSansTel = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "sans-tel@example.dz" } });
    expect(userSansTel.phone).toBeNull();
  });

  it("inscrit un PRO (D3) : User + ProProfile en transaction, email AR, lien vers PRO_URL", async () => {
    const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/register").send({
      role: "PRO",
      email: "salle@example.dz",
      password: "Motdepasse1",
      businessName: "Salle El Ryad",
      phone: "+213551234567",
      locale: "ar"
    });

    expect(res.status).toBe(201);
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: "salle@example.dz" },
      include: { proProfile: true }
    });
    expect(user.role).toBe("PRO");
    expect(user.proProfile).toMatchObject({ businessName: "Salle El Ryad", phone: "+213551234567" });

    expect(ctx.emails[0]!.subject).toContain("زواج");
    expect(ctx.emails[0]!.text).toMatch(/http:\/\/localhost:5173\/auth\/verification-email\?token=/);
    expect(ctx.emails[0]!.text).not.toContain("/ar/auth"); // SPA pro : pas de préfixe locale
  });

  it("doublon d'email (insensible à la casse) : 409 EMAIL_ALREADY_USED, rien de créé en plus", async () => {
    const server = ctx.app.getHttpServer();
    await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "aya@example.dz", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });
    const res = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "AYA@EXAMPLE.DZ", password: "Autremdp2", firstName: "Aya", lastName: "Boudiaf" });

    expect(res.status).toBe(409);
    expect(res.body.message.code).toBe("EMAIL_ALREADY_USED");
    expect(res.body.message.message).toBe("auth.errors.emailAlreadyUsed");
    expect(await ctx.prisma.user.count()).toBe(1);
    expect(await ctx.prisma.emailVerificationToken.count()).toBe(1);
    expect(ctx.emails).toHaveLength(1); // pas de second email
  });

  it("payloads invalides : 400 avec les clés i18n dans issues[] (email, mot de passe, businessName)", async () => {
    const server = ctx.app.getHttpServer();

    const badEmail = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "pas-un-email", password: "Motdepasse1", firstName: "Aya", lastName: "Boudiaf" });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.message.issues).toContainEqual(
      expect.objectContaining({ path: "email", message: "auth.validation.emailInvalid" })
    );

    const weak = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "CLIENT", email: "a@b.dz", password: "faible", firstName: "Aya", lastName: "Boudiaf" });
    expect(weak.status).toBe(400);

    const proSansNom = await request(server)
      .post("/api/v1/auth/register")
      .send({ role: "PRO", email: "p@b.dz", password: "Motdepasse1", phone: "+213551234567" });
    expect(proSansNom.status).toBe(400);
    expect(await ctx.prisma.user.count()).toBe(0);
  });

  it("le rôle ADMIN est inéligible à l'inscription (union discriminée)", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ role: "ADMIN", email: "root@zwadj.dz", password: "Motdepasse1" });
    expect(res.status).toBe(400);
    expect(await ctx.prisma.user.count()).toBe(0);
  });
});
