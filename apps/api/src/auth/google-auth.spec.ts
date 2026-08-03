import { ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import type { HttpException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { ConfigService } from "@nestjs/config";
import type { PinoLogger } from "nestjs-pino";
import { Prisma } from "../generated/prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import type { AuthEmailsService } from "./auth-emails.service";
import { GoogleAuthDisabledError, GoogleTokenInvalidError, type GoogleIdTokenPayload } from "./google.types";
import type { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Matrice de décision de /auth/google (Lot 8) en unitaire avec doubles : les
 * specs d'intégration (google.int-spec) prouvent la couche HTTP + la vraie
 * base, mais le BRANCHEMENT — « aucune écriture avant email_verified », « la
 * course P2002 relit puis applique la même matrice », « le cookie est TOUJOURS
 * persistant (D30) » — n'est observable finement qu'ici.
 * (Convention du repo : spec auto-suffisant, doubles manuels, pas de vi.mock.)
 */

type Row = {
  id: string;
  email: string;
  role: "CLIENT" | "PRO" | "ADMIN";
  locale: "fr" | "ar";
  emailVerifiedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
  // A10 : le select commun porte désormais status/phone/passwordHash (D42, §2.0).
  status: "ACTIVE" | "SUSPENDED" | "ANONYMIZED";
  phone: string | null;
  passwordHash: string | null;
  proProfile: { businessName: string; phone: string; phone2: string | null; notifyByEmail: boolean; notifyBySms: boolean } | null;
  googleSub: string | null;
};

const PAYLOAD: GoogleIdTokenPayload = {
  sub: "google-sub-123",
  email: "aya@example.dz",
  emailVerified: true,
  givenName: "Aya",
  familyName: "Boudiaf"
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "00000000-0000-7000-8000-000000000001",
    email: "aya@example.dz",
    role: "CLIENT",
    locale: "fr",
    emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    firstName: "Aya",
    lastName: "Boudiaf",
    status: "ACTIVE",
    phone: null,
    passwordHash: null,
    proProfile: null,
    googleSub: "google-sub-123",
    ...overrides
  };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test"
  });
}

function makeService() {
  const prisma = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn().mockResolvedValue({}) }
  };
  const verifier = { verify: vi.fn() };
  const jwt = new JwtService({ secret: "unit-test-secret-0123456789-0123456789", signOptions: { expiresIn: "15m" } });
  const config = { getOrThrow: vi.fn().mockReturnValue(30) };
  const logger = { setContext: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    { verify: vi.fn(), verifyAgainstDummy: vi.fn(), hash: vi.fn() } as unknown as PasswordService,
    new TokenService(),
    { sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() } as unknown as AuthEmailsService,
    jwt,
    config as unknown as ConfigService,
    logger as unknown as PinoLogger,
    verifier
  );
  return { service, prisma, verifier };
}

const INPUT = { idToken: "tok-gis", locale: "fr" as const };

async function rejectionOf(p: Promise<unknown>): Promise<HttpException> {
  try {
    await p;
  } catch (e) {
    return e as HttpException;
  }
  throw new Error("googleAuth aurait dû rejeter");
}

describe("AuthService.googleAuth — matrice du cadrage OAuth (Lot 8)", () => {
  it("token invérifiable : 401 GOOGLE_TOKEN_INVALID — la base n'est JAMAIS touchée", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockRejectedValue(new GoogleTokenInvalidError());

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(err.getResponse()).toEqual({ code: "GOOGLE_TOKEN_INVALID", message: "auth.errors.googleTokenInvalid" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("GOOGLE_CLIENT_ID absente : 503 GOOGLE_AUTH_DISABLED (fonctionnalité éteinte, pas cassée)", async () => {
    const { service, verifier } = makeService();
    verifier.verify.mockRejectedValue(new GoogleAuthDisabledError());

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(err.getResponse()).toEqual({ code: "GOOGLE_AUTH_DISABLED", message: "auth.errors.googleAuthDisabled" });
  });

  it("email_verified=false : 403 GOOGLE_EMAIL_NOT_VERIFIED — refusé AVANT toute lecture BDD", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue({ ...PAYLOAD, emailVerified: false });

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse()).toEqual({
      code: "GOOGLE_EMAIL_NOT_VERIFIED",
      message: "auth.errors.googleEmailNotVerified"
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(["PRO", "ADMIN"] as const)(
    "email lié à un compte %s : 403 GOOGLE_ACCOUNT_NOT_CLIENT — aucune liaison, aucune session",
    async (role) => {
      const { service, prisma, verifier } = makeService();
      verifier.verify.mockResolvedValue(PAYLOAD);
      prisma.user.findUnique.mockResolvedValue(makeRow({ role, googleSub: null }));

      const err = await rejectionOf(service.googleAuth(INPUT));
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getResponse()).toEqual({
        code: "GOOGLE_ACCOUNT_NOT_CLIENT",
        message: "auth.errors.googleAccountNotClient"
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    }
  );

  it("CLIENT jamais lié (googleSub null, email non vérifié) : liaison + backfill en UN update, cookie persistant (D30)", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    const before = makeRow({ googleSub: null, emailVerifiedAt: null });
    prisma.user.findUnique.mockResolvedValue(before);
    prisma.user.update.mockResolvedValue(makeRow({})); // ligne relue APRÈS liaison

    const { response, refreshCookie } = await service.googleAuth(INPUT);

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: before.id },
        data: { googleSub: PAYLOAD.sub, emailVerifiedAt: expect.any(Date) }
      })
    );
    expect(response.user.emailVerified).toBe(true); // le DTO reflète la ligne mise à jour
    expect(refreshCookie.persistent).toBe(true);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ persistent: true }) })
    );
  });

  it("CLIENT déjà lié au MÊME sub : connexion directe, AUCUN update", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    prisma.user.findUnique.mockResolvedValue(makeRow({}));

    const { response, refreshCookie } = await service.googleAuth(INPUT);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(response.user.email).toBe("aya@example.dz");
    expect(response.accessToken.split(".")).toHaveLength(3);
    expect(refreshCookie.persistent).toBe(true); // D30 : même en pure connexion
  });

  it("CLIENT lié à un AUTRE sub (email recyclé côté Google) : 409 GOOGLE_ACCOUNT_CONFLICT, aucun écrasement", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    prisma.user.findUnique.mockResolvedValue(makeRow({ googleSub: "google-sub-AUTRE" }));

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toEqual({
      code: "GOOGLE_ACCOUNT_CONFLICT",
      message: "auth.errors.googleAccountConflict"
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("email introuvable : création CLIENT (passwordHash null, sub lié, email vérifié, locale de l'input), D30", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(makeRow({})); // ligne créée (AUTH_USER_SELECT)

    const { response, refreshCookie } = await service.googleAuth({ idToken: "tok-gis", locale: "ar" });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: "aya@example.dz",
          passwordHash: null,
          role: "CLIENT",
          locale: "ar",
          firstName: "Aya",
          lastName: "Boudiaf",
          googleSub: "google-sub-123",
          emailVerifiedAt: expect.any(Date)
        }
      })
    );
    expect(response.accessToken.split(".")).toHaveLength(3);
    expect(refreshCookie.persistent).toBe(true);
  });

  it("course à la création (P2002) : relecture → CLIENT trouvé → la MÊME matrice s'applique (liaison + connexion)", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    const raced = makeRow({ googleSub: null });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(raced);
    prisma.user.create.mockRejectedValue(p2002());
    prisma.user.update.mockResolvedValue(makeRow({}));

    const { response } = await service.googleAuth(INPUT);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenCalledTimes(1); // liaison du compte gagnant de la course
    expect(response.user.email).toBe("aya@example.dz");
  });

  it("P2002 SANS ligne sur cet email (collision google_sub — email changé côté Google) : 409, pas d'auto-réparation", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    prisma.user.findUnique.mockResolvedValue(null); // avant ET après le create
    prisma.user.create.mockRejectedValue(p2002());

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(ConflictException);
    expect((err.getResponse() as { code: string }).code).toBe("GOOGLE_ACCOUNT_CONFLICT");
  });

  it("course sur la LIAISON (update P2002 : sub lié ailleurs entre-temps) : même 409", async () => {
    const { service, prisma, verifier } = makeService();
    verifier.verify.mockResolvedValue(PAYLOAD);
    prisma.user.findUnique.mockResolvedValue(makeRow({ googleSub: null }));
    prisma.user.update.mockRejectedValue(p2002());

    const err = await rejectionOf(service.googleAuth(INPUT));
    expect(err).toBeInstanceOf(ConflictException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
