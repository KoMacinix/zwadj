// Tests unitaires du CHEMIN SENSIBLE A10. Ce qui est prouvé ici, pièce par
// pièce, sans base :
//  - D42 : le MODE de change-password vient de l'état en BASE, jamais du corps
//    de la requête — un `currentPassword` omis ne contourne rien ;
//  - le tri des champs de profil par rôle (un CLIENT ne se fabrique pas un
//    `businessName`, un PRO ne peut pas effacer son téléphone obligatoire) ;
//  - change-email ne touche JAMAIS `users.email` : il n'écrit qu'un token.
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AccountService } from "./account.service";

const USER_ID = "00000000-0000-7000-8000-000000000001";

type ActorOverrides = {
  role?: "CLIENT" | "PRO" | "ADMIN";
  status?: "ACTIVE" | "SUSPENDED" | "ANONYMIZED";
  passwordHash?: string | null;
  email?: string;
};

function build(actor: ActorOverrides = {}, opts: { passwordOk?: boolean } = {}) {
  const row = {
    id: USER_ID,
    email: actor.email ?? "aya@example.dz",
    role: actor.role ?? "CLIENT",
    locale: "fr" as const,
    status: actor.status ?? "ACTIVE",
    passwordHash: actor.passwordHash === undefined ? "$argon2id$fake" : actor.passwordHash,
    proProfile: actor.role === "PRO" ? { id: "pro-1" } : null
  };
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(row), update: vi.fn().mockResolvedValue({}) },
    proProfile: { update: vi.fn().mockResolvedValue({}) },
    refreshToken: {
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({})
    },
    emailChangeToken: { deleteMany: vi.fn().mockResolvedValue({}), create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma))
  };
  const passwords = {
    hash: vi.fn().mockResolvedValue("$argon2id$new"),
    verify: vi.fn().mockResolvedValue(opts.passwordOk ?? true)
  };
  const tokens = { generate: vi.fn().mockReturnValue("raw-token"), hash: vi.fn((t: string) => `h(${t})`) };
  const emails = { sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined) };
  const config = { getOrThrow: vi.fn().mockReturnValue(30) };
  const logger = { setContext: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };

  const service = new AccountService(
    prisma as never,
    passwords as never,
    tokens as never,
    emails as never,
    config as never,
    logger as never
  );
  return { service, prisma, passwords, tokens, emails };
}

const codeOf = (e: unknown) =>
  (e as { getResponse: () => { code?: string } }).getResponse().code;

describe("§2.0 — un compte non ACTIVE ne peut RIEN faire sur son compte", () => {
  it.each(["SUSPENDED", "ANONYMIZED"] as const)("statut %s : 401 ACCOUNT_NOT_ACTIVE, aucune écriture", async (status) => {
    const { service, prisma } = build({ status });

    await expect(service.updateProfile(USER_ID, { firstName: "Aya" })).rejects.toSatisfy(
      (e: unknown) => e instanceof UnauthorizedException && codeOf(e) === "ACCOUNT_NOT_ACTIVE"
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /me/profile — tri des champs par RÔLE, côté serveur", () => {
  it("CLIENT qui envoie businessName : 400, et aucune écriture", async () => {
    const { service, prisma } = build({ role: "CLIENT" });
    await expect(service.updateProfile(USER_ID, { businessName: "Salle X" })).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "PROFILE_FIELD_NOT_ALLOWED"
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.proProfile.update).not.toHaveBeenCalled();
  });

  it("PRO qui envoie firstName : 400 — le profil pro, c'est businessName/phone/phone2", async () => {
    const { service, prisma } = build({ role: "PRO" });
    await expect(service.updateProfile(USER_ID, { firstName: "Aya" })).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "PROFILE_FIELD_NOT_ALLOWED"
    );
    expect(prisma.proProfile.update).not.toHaveBeenCalled();
  });

  it("PRO, phone: null : 400 PRO_PHONE_REQUIRED — la colonne est NOT NULL, on refuse AVANT Postgres", async () => {
    const { service, prisma } = build({ role: "PRO" });
    await expect(service.updateProfile(USER_ID, { phone: null })).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "PRO_PHONE_REQUIRED"
    );
    expect(prisma.proProfile.update).not.toHaveBeenCalled();
  });

  it("PRO, phone2: null : ACCEPTÉ — c'est un effacement légitime (D38, nullable)", async () => {
    const { service, prisma } = build({ role: "PRO" });
    await service.updateProfile(USER_ID, { phone2: null });
    expect(prisma.proProfile.update).toHaveBeenCalledWith({ where: { userId: USER_ID }, data: { phone2: null } });
  });

  it("patch PARTIEL RÉEL : une clé absente n'est PAS envoyée à Prisma (elle ne remet rien à zéro)", async () => {
    const { service, prisma } = build({ role: "CLIENT" });
    await service.updateProfile(USER_ID, { firstName: "Aya" });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: USER_ID }, data: { firstName: "Aya" } });
  });
});

describe("D42 — le mode de change-password est décidé par le SERVEUR", () => {
  it("compte AVEC mot de passe, currentPassword OMIS : 400, et le nouveau hash n'est jamais calculé", async () => {
    // Le cœur de D42 : si l'omission suffisait à basculer en mode « définir »,
    // le contrôle de l'ancien mot de passe se contournerait en une ligne.
    const { service, passwords, prisma } = build({ passwordHash: "$argon2id$fake" });
    await expect(service.changePassword(USER_ID, { newPassword: "Motdepasse1" }, undefined)).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "CURRENT_PASSWORD_REQUIRED"
    );
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("compte AVEC mot de passe, currentPassword FAUX : 400, coût argon2 payé, aucune écriture", async () => {
    const { service, passwords, prisma } = build({ passwordHash: "$argon2id$fake" }, { passwordOk: false });
    await expect(
      service.changePassword(USER_ID, { currentPassword: "faux", newPassword: "Motdepasse1" }, undefined)
    ).rejects.toSatisfy((e: unknown) => e instanceof BadRequestException && codeOf(e) === "CURRENT_PASSWORD_INVALID");
    expect(passwords.verify).toHaveBeenCalled(); // la vérification a bien eu lieu (discipline D5)
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("compte Google-only (passwordHash null) : currentPassword NI exigé NI consommé", async () => {
    const { service, passwords, prisma } = build({ passwordHash: null });
    await service.changePassword(USER_ID, { newPassword: "Motdepasse1" }, undefined);
    expect(passwords.verify).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { passwordHash: "$argon2id$new" }
    });
  });

  it("sans cookie de session : toutes les sessions tombent, rien n'est roté", async () => {
    const { service, prisma } = build({ passwordHash: null });
    const { refreshCookie } = await service.changePassword(USER_ID, { newPassword: "Motdepasse1" }, undefined);

    expect(refreshCookie).toBeNull();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    // Aucun `id: { not: ... }` : la révocation est bien TOTALE.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("avec cookie : les AUTRES sessions tombent, la courante est ROTÉE (D42 ≠ D15)", async () => {
    const { service, prisma } = build({ passwordHash: "$argon2id$fake" });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      userId: USER_ID,
      revokedAt: null,
      persistent: false
    });

    const { refreshCookie } = await service.changePassword(
      USER_ID,
      { currentPassword: "ok", newPassword: "Motdepasse1" },
      "cookie-brut"
    );

    // La session courante est EXCLUE de la révocation de masse…
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null, id: { not: "rt-1" } },
      data: { revokedAt: expect.any(Date) }
    });
    // …puis consommée et remplacée (D9), en préservant son mode (D27).
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revokedAt: expect.any(Date) }
    });
    expect(refreshCookie?.persistent).toBe(false);
    expect(refreshCookie?.value).toBe("raw-token");
  });

  it("cookie appartenant à un AUTRE compte : ignoré, on retombe sur « tout révoquer »", async () => {
    const { service, prisma } = build({ passwordHash: null });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-autre",
      userId: "00000000-0000-7000-8000-000000000099",
      revokedAt: null,
      persistent: true
    });

    const { refreshCookie } = await service.changePassword(USER_ID, { newPassword: "Motdepasse1" }, "cookie-vole");
    expect(refreshCookie).toBeNull();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe("POST /me/change-email — aucune bascule immédiate", () => {
  it("l'e-mail du compte n'est JAMAIS touché : seul un token est écrit", async () => {
    const { service, prisma, emails } = build();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: USER_ID,
      email: "aya@example.dz",
      role: "CLIENT",
      locale: "fr",
      status: "ACTIVE",
      passwordHash: "$argon2id$fake",
      proProfile: null
    });
    prisma.user.findUnique.mockResolvedValueOnce(null); // la nouvelle adresse est libre

    const res = await service.requestEmailChange(USER_ID, "nouvelle@example.dz");

    expect(res).toEqual({ status: "pending_verification", pendingEmail: "nouvelle@example.dz" });
    expect(prisma.user.update).not.toHaveBeenCalled(); // ← l'invariant du flux
    // Un seul lien valide à la fois : les précédents non consommés tombent.
    expect(prisma.emailChangeToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID, usedAt: null } });
    expect(emails.sendEmailChangeVerification).toHaveBeenCalled();
  });

  it("adresse déjà prise : 409 EMAIL_ALREADY_USED, aucun e-mail envoyé", async () => {
    const { service, prisma, emails } = build();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: USER_ID,
      email: "aya@example.dz",
      role: "CLIENT",
      locale: "fr",
      status: "ACTIVE",
      passwordHash: null,
      proProfile: null
    });
    prisma.user.findUnique.mockResolvedValueOnce({ id: "autre" });

    await expect(service.requestEmailChange(USER_ID, "prise@example.dz")).rejects.toBeInstanceOf(ConflictException);
    expect(emails.sendEmailChangeVerification).not.toHaveBeenCalled();
  });

  it("même adresse que l'actuelle : 400 EMAIL_UNCHANGED", async () => {
    const { service, emails } = build({ email: "aya@example.dz" });
    await expect(service.requestEmailChange(USER_ID, "aya@example.dz")).rejects.toSatisfy(
      (e: unknown) => e instanceof BadRequestException && codeOf(e) === "EMAIL_UNCHANGED"
    );
    expect(emails.sendEmailChangeVerification).not.toHaveBeenCalled();
  });
});
