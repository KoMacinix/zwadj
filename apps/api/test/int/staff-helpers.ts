// Les AIDES des specs d'intégration du personnel — rang 44, L36-3a-1 (D341). Rien ici ne décide : un compte PRO vérifié et connecté, un pot de cookies qui respecte le `Path` comme un navigateur, et
// le VIEILLISSEMENT PAR SQL — `vi.setSystemTime` n'agit pas sur l'horloge de la base, et c'est la base qui décide du temps (S-101, MP-41).
import { createHash } from "node:crypto";
import request, { type Response } from "supertest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { createTestApp, loginAs, registerUser, verifyLastRegistered, type TestContext } from "./helpers";

export const MOT_DE_PASSE_PRO = "Motdepasse1";
/** Le mot de passe du Manager des specs : ne figure pas dans la liste des mots de passe courants (vérifié par `staff-password-policy.spec.ts`, qui dérive la liste de sa source). */
export const MOT_DE_PASSE_STAFF = "Zq7!xvn3-Pk2";
export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

export interface ProFixture {
  userId: string;
  proProfileId: string;
  email: string;
  /** Le jeton d'accès (Bearer) du compte commun. */
  token: string;
}

let compteur = 0;

/** Un PRO inscrit par la VRAIE route, e-mail vérifié par le lien réellement émis, connecté. */
export async function creerPro(ctx: TestContext): Promise<ProFixture> {
  compteur += 1;
  const email = `pro-staff-${compteur}@example.dz`;
  await registerUser(ctx, { role: "PRO", email, password: MOT_DE_PASSE_PRO, businessName: `Salle ${compteur}`, phone: "+213550000009" });
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, email, MOT_DE_PASSE_PRO);
  const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email }, include: { proProfile: true } });
  return { userId: user.id, proProfileId: user.proProfile!.id, email, token };
}

// ── Les cookies ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CookiePose {
  name: string;
  value: string;
  /** La ligne `Set-Cookie` entière, telle que reçue. */
  ligne: string;
  /** Les attributs, noms en minuscules. */
  attributs: Map<string, string>;
}

export function lireCookies(res: Response): CookiePose[] {
  const brut = res.headers["set-cookie"] as unknown as string[] | string | undefined;
  const lignes = brut === undefined ? [] : Array.isArray(brut) ? brut : [brut];
  return lignes.map((ligne) => {
    const [paire = "", ...attrs] = ligne.split(";").map((s) => s.trim());
    const eq = paire.indexOf("=");
    const attributs = new Map<string, string>(
      attrs.map((a): [string, string] => {
        const i = a.indexOf("=");
        return i < 0 ? [a.toLowerCase(), ""] : [a.slice(0, i).toLowerCase(), a.slice(i + 1)];
      })
    );
    return { name: paire.slice(0, eq), value: paire.slice(eq + 1), ligne, attributs };
  });
}

const estEfface = (c: CookiePose): boolean => c.value === "" || (c.attributs.get("expires") ?? "").startsWith("Thu, 01 Jan 1970") || c.attributs.get("max-age") === "0";

/** Un pot de cookies qui respecte le `Path` comme un navigateur : un cookie n'est envoyé que vers un chemin qu'il préfixe. */
export class Jar {
  private readonly cookies = new Map<string, CookiePose>();

  absorber(res: Response): void {
    for (const c of lireCookies(res)) {
      if (estEfface(c)) this.cookies.delete(c.name);
      else this.cookies.set(c.name, c);
    }
  }
  get(name: string): CookiePose | undefined {
    return this.cookies.get(name);
  }
  session(): string | undefined {
    return this.cookies.get("zwadj_ss")?.value;
  }
  appareils(): CookiePose[] {
    return [...this.cookies.values()].filter((c) => c.name.startsWith("zwadj_dv_"));
  }
  /** L'en-tête `Cookie` pour une requête vers `chemin` (sans la chaîne de requête). */
  header(chemin: string): string {
    const cible = chemin.split("?")[0]!;
    return [...this.cookies.values()]
      .filter((c) => cible.startsWith(c.attributs.get("path") ?? "/"))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }
  copie(): Jar {
    const j = new Jar();
    for (const [k, v] of this.cookies) j.cookies.set(k, v);
    return j;
  }
  retirer(name: string): void {
    this.cookies.delete(name);
  }
  poser(name: string, value: string, path: string): void {
    this.cookies.set(name, { name, value, ligne: `${name}=${value}; Path=${path}`, attributs: new Map([["path", path]]) });
  }
}

type Methode = "get" | "post" | "patch" | "put" | "delete";

/** Une requête avec le Bearer du compte commun et les cookies du pot qui conviennent au chemin. Le pot absorbe les `Set-Cookie` de la réponse. */
export async function appeler(ctx: TestContext, bearer: string | undefined, jar: Jar | undefined, methode: Methode, chemin: string, corps?: unknown): Promise<Response> {
  let req = request(ctx.app.getHttpServer())[methode](chemin);
  if (bearer !== undefined) req = req.set("Authorization", `Bearer ${bearer}`);
  const cookies = jar?.header(chemin) ?? "";
  if (cookies !== "") req = req.set("Cookie", cookies);
  if (corps !== undefined) req = req.send(corps as object);
  const res = await req;
  jar?.absorber(res);
  return res;
}

/** L'enveloppe d'erreur SANS son horodatage (qui varie d'une requête à l'autre) : ce que deux refus « identiques à l'octet » doivent partager. */
export function corpsStable(res: Response): string {
  const b = res.body as { statusCode?: number; message?: unknown; path?: string };
  return JSON.stringify({ status: res.status, statusCode: b.statusCode, message: b.message, path: b.path });
}

/** Le code métier d'une erreur de l'API (`message.code`), ou undefined. */
export const codeDe = (res: Response): string | undefined => (res.body as { message?: { code?: string } }).message?.code;

// ── Les scénarios courants ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function activer(ctx: TestContext, pro: ProFixture, jar: Jar = new Jar(), accountName = "Amine", password = MOT_DE_PASSE_STAFF): Promise<{ res: Response; jar: Jar }> {
  const res = await appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/activate", { accountName, password });
  return { res, jar };
}

export async function connecter(ctx: TestContext, pro: ProFixture, jar: Jar, accountName = "Amine", password = MOT_DE_PASSE_STAFF): Promise<Response> {
  return appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/login", { accountName, password });
}

/** Un PRO activé, avec son pot de cookies (session du Manager et appareil). */
export async function proActive(ctx: TestContext): Promise<{ pro: ProFixture; jar: Jar; membreId: string }> {
  const pro = await creerPro(ctx);
  const { res, jar } = await activer(ctx, pro);
  if (res.status !== 201) throw new Error(`activation de test échouée (${res.status}) : ${JSON.stringify(res.body)}`);
  return { pro, jar, membreId: (res.body as { member: { id: string } }).member.id };
}

// ── La base : lecture et VIEILLISSEMENT (l'horloge qui décide est celle de la base) ─────────────────────────────────────────────────────────

export interface LigneSession {
  id: string;
  member_id: string;
  device_id: string;
  ended_at: Date | null;
  end_reason: string | null;
  last_activity_at: Date;
  expires_at: Date;
  created_at: Date;
}

export async function sessionParJeton(prisma: PrismaService, jeton: string): Promise<LigneSession> {
  const lignes = await prisma.$queryRaw<LigneSession[]>`
    SELECT id::text AS id, member_id::text AS member_id, device_id::text AS device_id, ended_at, end_reason::text AS end_reason, last_activity_at, expires_at, created_at
      FROM pro_staff_sessions WHERE token_hash = ${sha256(jeton)}`;
  if (lignes.length !== 1) throw new Error(`session introuvable pour ce jeton (${lignes.length} ligne(s))`);
  return lignes[0]!;
}

/** Rend la session inactive depuis `secondes` secondes (heure de la base). */
export async function rendreInactive(prisma: PrismaService, sessionId: string, secondes: number): Promise<void> {
  await prisma.$executeRaw`UPDATE pro_staff_sessions SET last_activity_at = now() - make_interval(secs => ${secondes}::int) WHERE id = ${sessionId}::uuid`;
}

/** Atteint le PLAFOND de la session (l'activité reste récente : seul le plafond refuse). */
export async function atteindrePlafond(prisma: PrismaService, sessionId: string): Promise<void> {
  await prisma.$executeRaw`UPDATE pro_staff_sessions SET created_at = now() - interval '13 hours', expires_at = now() - interval '1 hour', last_activity_at = now() WHERE id = ${sessionId}::uuid`;
}

export async function compterLignes(prisma: PrismaService, table: "pro_staff_members" | "pro_staff_devices" | "pro_staff_sessions"): Promise<number> {
  const r = await prisma.$queryRawUnsafe<Array<{ n: bigint | number | string }>>(`SELECT count(*)::int AS n FROM ${table}`);
  return Number(r[0]!.n);
}

export async function lignesAudit(prisma: PrismaService, action?: string): Promise<Array<{ action: string; actor_id: string | null; actor_role: string | null; actor_member_id: string | null; entity_type: string; entity_id: string | null; after: unknown; before: unknown }>> {
  return prisma.$queryRawUnsafe(
    `SELECT action, actor_id::text AS actor_id, actor_role, actor_member_id::text AS actor_member_id, entity_type, entity_id, after, before FROM audit_logs ${action === undefined ? "" : "WHERE action = $1"} ORDER BY created_at, id`,
    ...(action === undefined ? [] : [action])
  );
}

export { createTestApp };
