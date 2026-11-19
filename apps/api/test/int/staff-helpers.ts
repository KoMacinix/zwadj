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
export async function proActive(ctx: TestContext, accountName = "Amine"): Promise<{ pro: ProFixture; jar: Jar; membreId: string }> {
  const pro = await creerPro(ctx);
  const { res, jar } = await activer(ctx, pro, new Jar(), accountName);
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

// ── RANG 56, L36-3a-2 (D354) : créer un membre, le connecter, changer son mot de passe, vieillir un mot de passe par SQL ─────────────────────────────────────────────────────────────────────────
/** Le mot de passe que les membres de test se donnent après leur temporaire : ne figure pas dans la liste des mots de passe courants (vérifié par `staff-password-policy.spec.ts`). */
export const MOT_DE_PASSE_MEMBRE = "Wp8!hrt5-Qz3";
export const MOT_DE_PASSE_MEMBRE_2 = "Fm6!cvb2-Ty9";

export type RoleDeMembre = "MANAGER" | "EMPLOYEE";

/** K-20 par la VRAIE route, avec le pot du Manager qui crée. Rend la réponse, et — si 201 — l'identifiant et le temporaire (rendu UNE fois). */
export async function creerMembre(
  ctx: TestContext,
  pro: ProFixture,
  jarManager: Jar,
  accountName: string,
  role: RoleDeMembre = "EMPLOYEE"
): Promise<{ res: Response; id: string; temporaryPassword: string }> {
  const res = await appeler(ctx, pro.token, jarManager, "post", "/api/v1/pro/staff/members", { accountName, role });
  const corps = res.body as { member?: { id: string }; temporaryPassword?: string };
  return { res, id: corps.member?.id ?? "", temporaryPassword: corps.temporaryPassword ?? "" };
}

/** K-18 par la vraie route. */
export async function changerMotDePasse(ctx: TestContext, pro: ProFixture, jar: Jar, actuel: string, nouveau: string): Promise<Response> {
  return appeler(ctx, pro.token, jar, "post", "/api/v1/pro/staff/password", { currentPassword: actuel, newPassword: nouveau });
}

/**
 * Un membre ACTIF de bout en bout, par les vraies routes : le Manager le crée (K-20), il se connecte avec son temporaire sur SON poste (K-15, un pot neuf), puis change son mot de passe (K-18) — la session
 * reste, l'état passe de « à changer » à « actif ». Rend son pot, son identifiant et son mot de passe.
 */
export async function membreActif(
  ctx: TestContext,
  pro: ProFixture,
  jarManager: Jar,
  accountName: string,
  role: RoleDeMembre = "EMPLOYEE",
  motDePasse: string = MOT_DE_PASSE_MEMBRE
): Promise<{ id: string; jar: Jar; password: string }> {
  const cree = await creerMembre(ctx, pro, jarManager, accountName, role);
  if (cree.res.status !== 201) throw new Error(`création du membre de test échouée (${cree.res.status}) : ${JSON.stringify(cree.res.body)}`);
  const jar = new Jar();
  const connexion = await connecter(ctx, pro, jar, accountName, cree.temporaryPassword);
  if (connexion.status !== 200) throw new Error(`connexion du membre de test échouée (${connexion.status}) : ${JSON.stringify(connexion.body)}`);
  const changement = await changerMotDePasse(ctx, pro, jar, cree.temporaryPassword, motDePasse);
  if (changement.status !== 200) throw new Error(`changement de mot de passe du membre de test échoué (${changement.status}) : ${JSON.stringify(changement.body)}`);
  return { id: cree.id, jar, password: motDePasse };
}

export interface LigneMembre {
  id: string;
  account_name: string;
  role: string;
  status: string;
  disabled_at: Date | null;
  must_change_password: boolean;
  password_hash: string;
  password_changed_at: Date;
  password_expires_at: Date;
  password_failed_count: number;
  password_locked_until: Date | null;
  created_by_member_id: string | null;
  last_login_at: Date | null;
}

export async function membreParId(prisma: PrismaService, id: string): Promise<LigneMembre> {
  const lignes = await prisma.$queryRaw<LigneMembre[]>`
    SELECT id::text AS id, account_name, role::text AS role, status::text AS status, disabled_at, must_change_password, password_hash, password_changed_at, password_expires_at,
           password_failed_count, password_locked_until, created_by_member_id::text AS created_by_member_id, last_login_at
      FROM pro_staff_members WHERE id = ${id}::uuid`;
  if (lignes.length !== 1) throw new Error(`membre introuvable (${lignes.length} ligne(s))`);
  return lignes[0]!;
}

/** Fixe l'échéance du mot de passe À `secondes` secondes d'AUJOURD'HUI SELON LA BASE (négatif = dans le passé) : `vi.setSystemTime` n'agit pas sur l'horloge qui décide (S-101, MP-41). */
export async function echeanceDuMotDePasse(prisma: PrismaService, memberId: string, secondes: number): Promise<void> {
  await prisma.$executeRaw`UPDATE pro_staff_members SET password_expires_at = now() + make_interval(secs => ${secondes}::int) WHERE id = ${memberId}::uuid`;
}

/** Pose ou retire le marqueur « temporaire » (`must_change_password`) : le SEUL qui distingue un temporaire d'un mot de passe de 90 jours (S-241). */
export async function marquerTemporaire(prisma: PrismaService, memberId: string, temporaire: boolean): Promise<void> {
  await prisma.$executeRaw`UPDATE pro_staff_members SET must_change_password = ${temporaire} WHERE id = ${memberId}::uuid`;
}

export async function compterManagersActifs(prisma: PrismaService, proProfileId: string): Promise<number> {
  const r = await prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM pro_staff_members WHERE pro_profile_id = ${proProfileId}::uuid AND role = 'MANAGER' AND status = 'ACTIVE'`;
  return r[0]!.n;
}

export interface SessionDuMembre {
  id: string;
  ended_at: Date | null;
  end_reason: string | null;
}
export async function sessionsDuMembre(prisma: PrismaService, memberId: string): Promise<SessionDuMembre[]> {
  return prisma.$queryRaw<SessionDuMembre[]>`SELECT id::text AS id, ended_at, end_reason::text AS end_reason FROM pro_staff_sessions WHERE member_id = ${memberId}::uuid ORDER BY created_at, id`;
}

export interface AppareilDuMembre {
  id: string;
  revoked_at: Date | null;
}
export async function appareilsDuMembre(prisma: PrismaService, memberId: string): Promise<AppareilDuMembre[]> {
  return prisma.$queryRaw<AppareilDuMembre[]>`SELECT id::text AS id, revoked_at FROM pro_staff_devices WHERE member_id = ${memberId}::uuid ORDER BY created_at, id`;
}

/** Remet un membre désactivé et ses sessions dans l'état « actif » (ARMEMENT d'une répétition : la désactivation de la manche précédente est annulée par SQL, comme `rendreInactive` vieillit). */
export async function rearmerMembre(prisma: PrismaService, memberId: string): Promise<void> {
  await prisma.$executeRaw`UPDATE pro_staff_members SET status = 'ACTIVE', disabled_at = NULL WHERE id = ${memberId}::uuid`;
  await prisma.$executeRaw`UPDATE pro_staff_sessions SET ended_at = NULL, end_reason = NULL, last_activity_at = now(), expires_at = now() + interval '12 hours' WHERE member_id = ${memberId}::uuid`;
}

/** Le texte de TOUTES les lignes d'audit (colonnes JSON comprises) : ce que « nulle part dans l'audit » doit chercher. */
export async function texteDeTousLesAudits(prisma: PrismaService): Promise<string> {
  const lignes = await prisma.$queryRawUnsafe<Array<{ t: string }>>(`SELECT row_to_json(a)::text AS t FROM audit_logs a ORDER BY created_at, id`);
  return lignes.map((l) => l.t).join("\n");
}

export { createTestApp };
