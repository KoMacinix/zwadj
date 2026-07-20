import type { INestApplication, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request, { type Response } from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";
import { GOOGLE_TOKEN_VERIFIER, GoogleTokenInvalidError, type GoogleIdTokenPayload } from "../../src/auth/google.types";
import { EMAIL_SENDER, type SendEmailInput } from "../../src/common/email/email.types";
import { PrismaService } from "../../src/prisma/prisma.service";

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  /** Emails « envoyés » pendant le test — capturés au niveau du port EMAIL_SENDER. */
  emails: SendEmailInput[];
  /** Lot 8 : table idToken → payload du FAUX vérificateur Google. Les specs y
   *  déposent leurs tokens ; tout token ABSENT est rejeté comme invalide —
   *  Google n'est jamais joint depuis la suite (la vérification réelle avec
   *  un vrai GOOGLE_CLIENT_ID relève de la validation locale). */
  googleTokens: Map<string, GoogleIdTokenPayload>;
}

/** App de test = AppModule réel + configureApp (mêmes pipes/préfixe que la prod),
 *  seuls les ports externes sont remplacés : email → capture en mémoire,
 *  vérificateur Google → table locale (Lot 8).
 *  `controllers` (Lot 2) : sondes montées EN PLUS pour prouver les guards
 *  globaux sur des routes qui n'existent pas encore dans le domaine (RBAC). */
export async function createTestApp(options?: { controllers?: Type<unknown>[] }): Promise<TestContext> {
  const emails: SendEmailInput[] = [];
  const googleTokens = new Map<string, GoogleIdTokenPayload>();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options?.controllers ?? []
  })
    .overrideProvider(EMAIL_SENDER)
    .useValue({
      send: async (input: SendEmailInput) => {
        emails.push(input);
      }
    })
    .overrideProvider(GOOGLE_TOKEN_VERIFIER)
    .useValue({
      verify: async (idToken: string): Promise<GoogleIdTokenPayload> => {
        const payload = googleTokens.get(idToken);
        if (!payload) throw new GoogleTokenInvalidError();
        return payload;
      }
    })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), emails, googleTokens };
}

/** Vide toutes les tables entre les tests (identifiants issus de pg_tables —
 *  helper de test uniquement, jamais exposé au runtime applicatif). */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Extrait le token opaque du lien contenu dans un email capturé. */
export function extractToken(emailText: string): string {
  const m = emailText.match(/token=([A-Za-z0-9_-]{43})/);
  if (!m?.[1]) throw new Error(`Aucun token dans l'email :\n${emailText}`);
  return m[1];
}

// ── Helpers Lot 2 (login/me/RBAC) ────────────────────────────────────────────

/** Set-Cookie du refresh token (D2) : { raw, attributes } ou undefined s'il est absent. */
export function refreshCookieOf(res: Response, name = "zwadj_rt"): { raw: string; attributes: string } | undefined {
  const header = res.headers["set-cookie"] as unknown as string[] | string | undefined;
  const cookies = header === undefined ? [] : Array.isArray(header) ? header : [header];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return { raw: match.slice(name.length + 1, match.indexOf(";")), attributes: match };
}

/** Inscrit un compte via la VRAIE route (hash argon2, ProProfile en transaction). */
export async function registerUser(
  ctx: TestContext,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/register").send(payload);
  if (res.status !== 201) throw new Error(`register de test a échoué (${res.status}) : ${JSON.stringify(res.body)}`);
}

/** Vérifie l'email du DERNIER compte inscrit, via le lien réellement émis. */
export async function verifyLastRegistered(ctx: TestContext): Promise<void> {
  const last = ctx.emails.at(-1);
  if (!last) throw new Error("Aucun email capturé : rien à vérifier.");
  const res = await request(ctx.app.getHttpServer()).get(`/api/v1/auth/verify-email/${extractToken(last.text)}`);
  if (res.status !== 200) throw new Error(`verify-email de test a échoué (${res.status})`);
}

/** Login via la vraie route ; retourne l'accessToken (échoue bruyamment sinon). */
export async function loginAs(ctx: TestContext, email: string, password: string): Promise<string> {
  const res = await request(ctx.app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login de test a échoué (${res.status}) : ${JSON.stringify(res.body)}`);
  return (res.body as { accessToken: string }).accessToken;
}
