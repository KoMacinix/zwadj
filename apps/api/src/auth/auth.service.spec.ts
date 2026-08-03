import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { ConfigService } from "@nestjs/config";
import type { PinoLogger } from "nestjs-pino";
import type { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import type { AuthEmailsService } from "./auth-emails.service";
import type { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Matrice de décision du LOGIN (D1 × D5) en unitaire avec mocks : les specs
 * d'intégration prouvent la couche HTTP (login.int-spec), mais l'ORDRE des
 * contrôles — « le coût factice est payé quand l'email n'existe pas », « D1
 * n'est évalué qu'après le mot de passe » — n'est observable qu'ici.
 * (Convention du repo : la logique nécessitant la BDD reste en intégration ;
 * ce spec ne teste QUE le branchement, via des doubles.)
 */

type UserRow = {
  id: string;
  email: string;
  role: "CLIENT" | "PRO" | "ADMIN";
  locale: "fr" | "ar";
  emailVerifiedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
  // A10 : lus par AUTH_USER_SELECT — `status` garde les 5 chemins d'auth
  // (§2.0), `phone`/`googleSub` alimentent le DTO (D42).
  status: "ACTIVE" | "SUSPENDED" | "ANONYMIZED";
  phone: string | null;
  googleSub: string | null;
  proProfile: { businessName: string; phone: string; phone2: string | null; notifyByEmail: boolean; notifyBySms: boolean } | null;
  // Lot 8 : null = compte Google-only (créé via /auth/google, jamais via register).
  passwordHash: string | null;
};

function makeUser(overrides: Partial<UserRow>): UserRow {
  return {
    id: "00000000-0000-7000-8000-000000000001",
    email: "aya@example.dz",
    role: "CLIENT",
    locale: "fr",
    emailVerifiedAt: null,
    firstName: "Aya",
    lastName: null,
    status: "ACTIVE",
    phone: null,
    googleSub: null,
    proProfile: null,
    passwordHash: "$argon2id$fake",
    ...overrides
  };
}

function makeService(user: UserRow | null, passwordOk: boolean) {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(user), update: vi.fn().mockResolvedValue({}) },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    passwordResetToken: {
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({})
    },
    // Passe-plat : le callback reçoit le même mock — suffisant pour vérifier
    // QUELS appels composent la rotation (l'atomicité réelle est prouvée en
    // intégration sur la vraie base).
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma))
  };
  const passwords = {
    verify: vi.fn().mockResolvedValue(passwordOk),
    verifyAgainstDummy: vi.fn().mockResolvedValue(false),
    hash: vi.fn().mockResolvedValue("$argon2id$nouveau-hash")
  };
  const emails = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined)
  };
  const jwt = new JwtService({ secret: "unit-test-secret-0123456789-0123456789", signOptions: { expiresIn: "15m" } });
  const config = { getOrThrow: vi.fn().mockReturnValue(30) };
  const logger = { setContext: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  // Lot 8 : le login N'APPELLE JAMAIS le vérificateur Google — un reject
  // systématique le prouverait bruyamment (la matrice googleAuth a son propre
  // spec dédié, google-auth.spec.ts, avec un faux configurable).
  const googleVerifier = { verify: vi.fn().mockRejectedValue(new Error("vérificateur Google non attendu ici")) };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    passwords as unknown as PasswordService,
    new TokenService(),
    emails as unknown as AuthEmailsService,
    jwt,
    config as unknown as ConfigService,
    logger as unknown as PinoLogger,
    googleVerifier
  );
  return { service, prisma, passwords, logger, emails, googleVerifier };
}

const CREDENTIALS = { email: "aya@example.dz", password: "Motdepasse1", rememberMe: true };

describe("AuthService.login — matrice D1 × D5", () => {
  it("email inconnu : 401 INVALID_CREDENTIALS, le coût argon2 factice est payé, verify réel jamais appelé", async () => {
    const { service, passwords, prisma } = makeService(null, false);
    const attempt = service.login(CREDENTIALS);

    await expect(attempt).rejects.toThrow(UnauthorizedException);
    expect(passwords.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(passwords.verifyAgainstDummy).toHaveBeenCalledWith("Motdepasse1");
    expect(passwords.verify).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("mauvais mot de passe : 401 au corps STRICTEMENT identique à « email inconnu » (anti-énumération)", async () => {
    const rejectionOf = async (svc: AuthService): Promise<UnauthorizedException> => {
      try {
        await svc.login(CREDENTIALS);
      } catch (e) {
        return e as UnauthorizedException;
      }
      throw new Error("login aurait dû rejeter");
    };
    const unknownEmail = await rejectionOf(makeService(null, false).service);
    const wrongPassword = await rejectionOf(makeService(makeUser({}), false).service);

    expect(unknownEmail.getStatus()).toBe(401);
    expect(wrongPassword.getStatus()).toBe(401);
    expect(wrongPassword.getResponse()).toEqual(unknownEmail.getResponse());
    expect(unknownEmail.getResponse()).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "auth.errors.invalidCredentials"
    });
  });

  it("compte Google-only (passwordHash null) : coût factice payé, 401 au corps identique (D5 étendu, Lot 8)", async () => {
    const { service, passwords, prisma } = makeService(makeUser({ passwordHash: null }), true);
    let caught: UnauthorizedException | undefined;
    try {
      await service.login(CREDENTIALS);
    } catch (e) {
      caught = e as UnauthorizedException;
    }

    expect(caught).toBeInstanceOf(UnauthorizedException);
    expect(caught!.getResponse()).toEqual({ code: "INVALID_CREDENTIALS", message: "auth.errors.invalidCredentials" });
    // Hash absent : verify() réel JAMAIS invoqué — le factice égalise le
    // timing avec « email inconnu » ; ni l'existence du compte ni son mode
    // d'authentification ne transparaissent.
    expect(passwords.verifyAgainstDummy).toHaveBeenCalledTimes(1);
    expect(passwords.verify).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("PRO non vérifié : 403 EMAIL_NOT_VERIFIED — évalué APRÈS le mot de passe (D5), aucun token émis", async () => {
    const { service, passwords, prisma } = makeService(
      makeUser({ role: "PRO", proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false } }),
      true
    );
    const attempt = service.login(CREDENTIALS);

    await expect(attempt).rejects.toThrow(ForbiddenException);
    expect(passwords.verify).toHaveBeenCalledTimes(1); // le mdp a bien été contrôlé d'abord
    expect(prisma.refreshToken.create).not.toHaveBeenCalled(); // refus = zéro session créée
  });

  it("PRO non vérifié avec MAUVAIS mot de passe : 401 (jamais le 403 — sinon oracle d'existence)", async () => {
    const { service } = makeService(makeUser({ role: "PRO" }), false);
    await expect(service.login(CREDENTIALS)).rejects.toThrow(UnauthorizedException);
  });

  it("ADMIN non vérifié : bloqué comme un PRO (D1 — seul CLIENT est exempté)", async () => {
    const { service } = makeService(makeUser({ role: "ADMIN" }), true);
    await expect(service.login(CREDENTIALS)).rejects.toThrow(ForbiddenException);
  });

  it("CLIENT non vérifié : connexion PERMISE (D1), emailVerified: false pour le bandeau", async () => {
    const { service, prisma } = makeService(makeUser({ emailVerifiedAt: null }), true);
    const { response, refreshCookie } = await service.login(CREDENTIALS);

    expect(response.user.emailVerified).toBe(false);
    expect(response.user.proProfile).toBeNull();
    expect(response.accessToken.split(".")).toHaveLength(3);
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(refreshCookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("PRO vérifié : connecté, proProfile exposé, claims JWT = { sub, role } SANS email (D4)", async () => {
    const user = makeUser({
      role: "PRO",
      emailVerifiedAt: new Date(),
      proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false }
    });
    const { service } = makeService(user, true);
    const { response } = await service.login(CREDENTIALS);

    // D60 (F1) — les canaux voyagent AVEC la session : sans eux, l'écran de
    // réglage ne saurait pas quoi cocher au montage.
    expect(response.user.proProfile).toEqual({
      businessName: "Salle El Ryad",
      phone: "+213551234567",
      phone2: null,
      notifyByEmail: true,
      notifyBySms: false
    });

    const claims = JSON.parse(Buffer.from(response.accessToken.split(".")[1]!, "base64url").toString());
    expect(claims.sub).toBe(user.id);
    expect(claims.role).toBe("PRO");
    expect(claims).not.toHaveProperty("email"); // pas de PII dans un jeton lisible côté client
    expect(claims).not.toHaveProperty("emailVerified"); // donnée fraîche = /auth/me, pas le JWT
  });

  it("rememberMe: false — persistent: false envoyé au create ET refreshCookie.persistent: false (D27)", async () => {
    const { service, prisma } = makeService(makeUser({}), true);
    const { refreshCookie } = await service.login({ ...CREDENTIALS, rememberMe: false });

    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ persistent: false }) })
    );
    expect(refreshCookie.persistent).toBe(false);
  });

  it("rememberMe: true (défaut) — persistent: true en base et sur le contrat cookie (D27)", async () => {
    const { service, prisma } = makeService(makeUser({}), true);
    const { refreshCookie } = await service.login(CREDENTIALS);

    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ persistent: true }) })
    );
    expect(refreshCookie.persistent).toBe(true);
  });

  it("le refresh token part HASHÉ en base (sha256 hex), jamais la valeur brute (D7)", async () => {
    const { service, prisma } = makeService(makeUser({}), true);
    const { refreshCookie } = await service.login(CREDENTIALS);

    const created = prisma.refreshToken.create.mock.calls[0]![0] as {
      data: { tokenHash: string; userId: string; expiresAt: Date };
    };
    expect(created.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created.data.tokenHash).toBe(new TokenService().hash(refreshCookie.value));
    expect(created.data.tokenHash).not.toContain(refreshCookie.value.slice(0, 10));
    // Expiration cookie et ligne BDD ALIGNÉES (30 j du config mocké)
    expect(created.data.expiresAt).toEqual(refreshCookie.expiresAt);
  });
});

describe("AuthService.me — lecture fraîche", () => {
  it("compte disparu après émission du token : 401 UNAUTHENTICATED (même code que le guard)", async () => {
    const { service } = makeService(null, false);
    await expect(service.me("00000000-0000-7000-8000-000000000001")).rejects.toThrow(UnauthorizedException);
  });

  it("mappe la ligne BDD vers AuthUserDTO (emailVerified dérivé, jamais le hash)", async () => {
    const { service } = makeService(makeUser({ emailVerifiedAt: new Date("2026-07-01T00:00:00Z") }), false);
    const me = await service.me("00000000-0000-7000-8000-000000000001");

    expect(me.emailVerified).toBe(true);
    expect(me).not.toHaveProperty("passwordHash");
    expect(me).not.toHaveProperty("emailVerifiedAt"); // le DTO expose le booléen, pas la date brute
  });
});

// ── Lot 3 : refresh (D9/D10/D12) et logout (D11) ─────────────────────────────

const tokens = new TokenService();

function refreshRow(overrides: Partial<{ revokedAt: Date | null; expiresAt: Date }> = {}) {
  return {
    id: "00000000-0000-7000-8000-0000000000aa",
    userId: "00000000-0000-7000-8000-000000000001",
    tokenHash: "0".repeat(64),
    revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 10 * 86_400_000),
    createdAt: new Date(),
    ...overrides
  };
}

describe("AuthService.refresh — matrice D9 × D10", () => {
  const RAW = tokens.generate();

  it("cookie absent : 401 sans AUCUN accès base", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("token inconnu : 401 SANS effet de bord (un hash forgé est inattribuable)", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: tokens.hash(RAW) } });
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled(); // pas de révocation globale
  });

  it("token DÉJÀ révoqué (D10) : révocation de toutes les sessions du user + 401 + warn tracé", async () => {
    const { service, prisma, logger } = makeService(makeUser({}), false);
    prisma.refreshToken.findUnique.mockResolvedValue(refreshRow({ revokedAt: new Date() }));

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "00000000-0000-7000-8000-000000000001", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled(); // aucun successeur émis
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "refresh_token_reuse" }),
      expect.any(String)
    );
  });

  it("révoqué ET expiré : la réutilisation prime (le signal de vol ne périme pas)", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    prisma.refreshToken.findUnique.mockResolvedValue(
      refreshRow({ revokedAt: new Date(), expiresAt: new Date(Date.now() - 1000) })
    );

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1); // révocation globale déclenchée
  });

  it("token expiré (non révoqué) : 401 simple, PAS de révocation globale", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    prisma.refreshToken.findUnique.mockResolvedValue(refreshRow({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("course perdue (double soumission) : le check-and-set échoue → traité en réutilisation", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    prisma.refreshToken.findUnique.mockResolvedValue(refreshRow());
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 0 }) // la rotation concurrente a déjà consommé le token
      .mockResolvedValue({ count: 2 }); // puis la révocation globale

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(2); // check-and-set PUIS révocation globale
  });

  it("nominal (D9) : consomme l'ancien, crée le neuf (30 j pleins), répond au format login (D12)", async () => {
    const user = makeUser({ emailVerifiedAt: new Date() });
    const { service, prisma } = makeService(user, false);
    prisma.refreshToken.findUnique.mockResolvedValue(refreshRow());

    const { response, refreshCookie } = await service.refresh(RAW);

    // check-and-set sur LA ligne présentée, conditionné à revokedAt IS NULL
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: "00000000-0000-7000-8000-0000000000aa", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    const created = prisma.refreshToken.create.mock.calls[0]![0] as {
      data: { tokenHash: string; expiresAt: Date };
    };
    expect(created.data.tokenHash).toBe(tokens.hash(refreshCookie.value));
    expect(refreshCookie.value).not.toBe(RAW); // rotation réelle, pas une prolongation
    // fenêtre glissante : ~30 j pleins depuis MAINTENANT (config mocké = 30)
    expect(refreshCookie.expiresAt.getTime() - Date.now()).toBeGreaterThan(29.9 * 86_400_000);
    // D12 : même forme que le login
    expect(response.user.email).toBe("aya@example.dz");
    expect(response.accessToken.split(".")).toHaveLength(3);
  });

  it("user disparu malgré une ligne valide (course FK résiduelle) : 401 défensif", async () => {
    const { service, prisma } = makeService(null, false);
    prisma.refreshToken.findUnique.mockResolvedValue(refreshRow());

    await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
  });
});

describe("AuthService.logout — D11 idempotent", () => {
  it("sans cookie : succès silencieux, aucun accès base", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    await expect(service.logout(undefined)).resolves.toBeUndefined();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("révoque UNIQUEMENT le token présenté (where tokenHash, pas userId)", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    const raw = tokens.generate();
    await service.logout(raw);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: tokens.hash(raw), revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("token inconnu ou déjà révoqué : même succès (updateMany à 0 ligne ne lève pas)", async () => {
    const { service, prisma } = makeService(makeUser({}), false);
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.logout(tokens.generate())).resolves.toBeUndefined();
  });
});

// ── Lot 4 : forgot (D14) / reset (D15/D16/D17) ───────────────────────────────

describe("AuthService.forgotPassword — D14 anti-énumération", () => {
  it("email inconnu : { status: 'ok' } constant, AUCUN token créé, AUCUN email", async () => {
    const { service, prisma, emails } = makeService(null, false);
    await expect(service.forgotPassword("inconnu@example.dz")).resolves.toEqual({ status: "ok" });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(emails.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("compte existant : anciens tokens non consommés supprimés, nouveau hash créé, email envoyé", async () => {
    const { service, prisma, emails } = makeService(makeUser({}), false);
    await expect(service.forgotPassword("aya@example.dz")).resolves.toEqual({ status: "ok" });

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "00000000-0000-7000-8000-000000000001", usedAt: null }
    });
    const created = prisma.passwordResetToken.create.mock.calls[0]![0] as {
      data: { tokenHash: string; expiresAt: Date };
    };
    expect(created.data.tokenHash).toMatch(/^[0-9a-f]{64}$/); // hash, jamais la valeur brute
    // TTL 30 min (constante produit)
    expect(created.data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000);
    expect(created.data.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);

    const [recipient, rawToken] = emails.sendPasswordResetEmail.mock.calls[0]! as [
      { email: string },
      string
    ];
    expect(recipient.email).toBe("aya@example.dz");
    expect(created.data.tokenHash).toBe(new TokenService().hash(rawToken)); // l'email porte LE token créé
  });

  it("échec d'envoi d'email : avalé et tracé — la réponse reste { status: 'ok' } (patron *Safely)", async () => {
    const { service, emails, logger } = makeService(makeUser({}), false);
    emails.sendPasswordResetEmail.mockRejectedValue(new Error("SMTP down"));

    await expect(service.forgotPassword("aya@example.dz")).resolves.toEqual({ status: "ok" });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("AuthService.resetPassword — D15 × D16 × D17", () => {
  const RAW_RESET = new TokenService().generate();

  it("token inconnu/expiré/consommé (findFirst filtre les trois) : 400 TOKEN_INVALID_OR_EXPIRED, rien ne change", async () => {
    const { service, prisma, passwords } = makeService(makeUser({}), false);
    prisma.passwordResetToken.findFirst.mockResolvedValue(null);

    await expect(service.resetPassword(RAW_RESET, "NouveauMdp1")).rejects.toThrow(BadRequestException);
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("nominal : usage unique + nouveau hash + révocation D15 dans la MÊME transaction, réponse D17 sans tokens", async () => {
    const { service, prisma, passwords } = makeService(makeUser({}), false);
    prisma.passwordResetToken.findFirst.mockResolvedValue({
      id: "00000000-0000-7000-8000-0000000000bb",
      userId: "00000000-0000-7000-8000-000000000001",
      user: { status: "ACTIVE" }
    });

    const res = await service.resetPassword(RAW_RESET, "NouveauMdp1");

    expect(res).toEqual({ status: "ok" }); // D17 : ni accessToken ni cookie
    expect(passwords.hash).toHaveBeenCalledWith("NouveauMdp1");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "00000000-0000-7000-8000-0000000000bb" },
      data: { usedAt: expect.any(Date) }
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "00000000-0000-7000-8000-000000000001" },
      data: { passwordHash: "$argon2id$nouveau-hash" }
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "00000000-0000-7000-8000-000000000001", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("le hash argon2 est calculé AVANT la transaction (pas de tx ouverte pendant le CPU)", async () => {
    const order: string[] = [];
    const { service, prisma, passwords } = makeService(makeUser({}), false);
    prisma.passwordResetToken.findFirst.mockResolvedValue({ id: "t", userId: "u", user: { status: "ACTIVE" } });
    passwords.hash.mockImplementation(async () => {
      order.push("hash");
      return "$argon2id$x";
    });
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      order.push("tx");
      return cb(prisma);
    });

    await service.resetPassword(RAW_RESET, "NouveauMdp1");
    expect(order).toEqual(["hash", "tx"]);
  });
});
