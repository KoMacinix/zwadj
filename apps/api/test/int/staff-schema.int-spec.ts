/**
 * LE SCHÉMA DU PERSONNEL, EN SQL DIRECT — rang 44, L36-3a-1 (D341, D186, 1 a et 1 b). PostgreSQL RÉEL, toutes les migrations rejouées sur du vide par `setup-global`.
 *
 * ⚠ L'AUTORITÉ SUR LES GARANTIES DE LA BASE EST LA MIGRATION, JAMAIS `schema.prisma` (D186) : Prisma n'exprime pas les `CHECK`. Ce spec attaque la base directement — sans passer par le service — pour que chaque garantie
 * de la tranche ratifiée et des six garanties adoptées (1 b) soit prouvée PAR SON REFUS : un `INSERT` ou un `UPDATE` fautif doit être rejeté PAR LE NOM de la contrainte (un refus pour une autre raison ne prouve rien,
 * D209 (1) « mesure confondue »), et la ligne valide voisine doit passer (sans quoi une contrainte qui refuserait tout serait « prouvée »).
 *
 * Le contrôle sur base NON VIDE de la migration est `migration-non-empty.int-spec.ts` (D123) ; ce qu'une migration fait aux données existantes n'est pas ici.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { creerPro, type ProFixture } from "./staff-helpers";

let ctx: TestContext;
let pro: ProFixture;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
  pro = await creerPro(ctx);
});

/** Exécute un SQL attendu VALIDE ; une contrainte qui le refuserait lève (une garde qui refuserait tout ne serait « prouvée » par aucun refus). */
async function ok(sql: string, ...valeurs: unknown[]): Promise<void> {
  await ctx.prisma.$executeRawUnsafe(sql, ...valeurs);
}

/** Le SQL doit être REFUSÉ, et le refus doit nommer la contrainte (le message de PostgreSQL la cite). */
async function refus(contrainte: string, sql: string, ...valeurs: unknown[]): Promise<void> {
  let message = "";
  try {
    await ctx.prisma.$executeRawUnsafe(sql, ...valeurs);
  } catch (e) {
    message = String((e as { message?: unknown }).message ?? e) + JSON.stringify((e as { meta?: unknown }).meta ?? {});
  }
  expect(message, `attendu : un refus par « ${contrainte} »`).toContain(contrainte);
}

const MEMBRE_BASE = `INSERT INTO pro_staff_members (pro_profile_id, account_name, account_name_key, role, password_hash, password_changed_at, password_expires_at`;
const membre = (cle: string, colonnes = "", valeurs = "", profil = () => pro.proProfileId) =>
  ok(`${MEMBRE_BASE}${colonnes}) VALUES ($1::uuid, $2, $2, 'MANAGER', 'h', now(), now() + interval '90 days'${valeurs})`, profil(), cle);
const idMembre = async (cle: string): Promise<string> =>
  (await ctx.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id::text AS id FROM pro_staff_members WHERE account_name_key = $1`, cle))[0]!.id;
const appareil = (membreId: string, hachage: string) =>
  ok(`INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at) VALUES ($1::uuid, $2, 'Poste', now() + interval '90 days')`, membreId, hachage);

describe("la tranche : les objets existent, avec les noms que les tests et la sonde de dérive attendent", () => {
  it("trois tables, trois énumérations, la colonne du drapeau, la colonne d'audit", async () => {
    const tables = await ctx.prisma.$queryRaw<Array<{ t: string }>>`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'pro_staff_%' ORDER BY 1`;
    expect(tables.map((r) => r.t)).toEqual(["pro_staff_devices", "pro_staff_members", "pro_staff_sessions"]);
    const enums = await ctx.prisma.$queryRaw<Array<{ t: string; v: string }>>`
      SELECT t.typname AS t, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS v FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname IN ('StaffRole', 'StaffStatus', 'StaffSessionEndReason') GROUP BY 1 ORDER BY 1`;
    expect(enums).toEqual([
      { t: "StaffRole", v: "MANAGER,EMPLOYEE" },
      { t: "StaffSessionEndReason", v: "IDLE,LOGOUT,DISABLED,PASSWORD_CHANGED,PIN_LOCKED" },
      { t: "StaffStatus", v: "ACTIVE,DISABLED" }
    ]);
    const colonnes = await ctx.prisma.$queryRaw<Array<{ t: string; c: string; n: string }>>`
      SELECT table_name AS t, column_name AS c, is_nullable AS n FROM information_schema.columns
       WHERE (table_name = 'pro_profiles' AND column_name = 'staff_layer_enabled_at') OR (table_name = 'audit_logs' AND column_name = 'actor_member_id') ORDER BY 1`;
    expect(colonnes).toEqual([{ t: "audit_logs", c: "actor_member_id", n: "YES" }, { t: "pro_profiles", c: "staff_layer_enabled_at", n: "YES" }]);
  });

  it("⛔ 1 a — la NULLABILITÉ du § 5.2 du cadrage, colonne par colonne (la table est celle du cadrage, lue ici comme une donnée à confronter à la base)", async () => {
    const attendu: Record<string, { nulles: string[]; obligatoires: string[] }> = {
      pro_staff_members: {
        nulles: ["pin_hash", "pin_generated_at", "pin_expires_at", "pin_locked_at", "disabled_at", "last_login_at", "password_locked_until", "created_by_member_id"],
        obligatoires: ["id", "pro_profile_id", "account_name", "account_name_key", "role", "status", "password_hash", "password_changed_at", "password_expires_at", "must_change_password", "password_failed_count", "pin_failed_count", "created_at", "updated_at"]
      },
      pro_staff_devices: { nulles: ["last_used_at", "revoked_at"], obligatoires: ["id", "member_id", "token_hash", "label", "created_at", "expires_at"] },
      pro_staff_sessions: { nulles: ["ended_at", "end_reason"], obligatoires: ["id", "member_id", "device_id", "token_hash", "created_at", "last_activity_at", "expires_at"] }
    };
    for (const [table, { nulles, obligatoires }] of Object.entries(attendu)) {
      const lignes = await ctx.prisma.$queryRawUnsafe<Array<{ c: string; n: string }>>(`SELECT column_name AS c, is_nullable AS n FROM information_schema.columns WHERE table_name = $1`, table);
      const reel = Object.fromEntries(lignes.map((l) => [l.c, l.n === "YES"]));
      for (const c of nulles) expect(reel[c], `${table}.${c} doit être NULLABLE`).toBe(true);
      for (const c of obligatoires) expect(reel[c], `${table}.${c} doit être OBLIGATOIRE`).toBe(false);
      expect(Object.keys(reel).sort(), `${table} : aucune colonne hors tranche`).toEqual([...nulles, ...obligatoires].sort());
    }
  });

  it("les défauts du § 5.2 : statut ACTIVE, `must_change_password` faux, compteurs à 0, aucun PIN, aucune pause ; la session naît active à l'instant", async () => {
    await membre("amine");
    const m = (await ctx.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT status::text AS status, must_change_password, password_failed_count, pin_failed_count, pin_hash, pin_generated_at, pin_expires_at, pin_locked_at, password_locked_until, disabled_at, last_login_at, created_by_member_id FROM pro_staff_members`)[0]!;
    expect(m).toEqual({ status: "ACTIVE", must_change_password: false, password_failed_count: 0, pin_failed_count: 0, pin_hash: null, pin_generated_at: null, pin_expires_at: null, pin_locked_at: null, password_locked_until: null, disabled_at: null, last_login_at: null, created_by_member_id: null });
    const id = await idMembre("amine");
    await appareil(id, "d1");
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    await ok(`INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 's1', now() + interval '12 hours')`, id, d);
    const s = (await ctx.prisma.$queryRaw<Array<{ ecart: number }>>`SELECT extract(epoch FROM (last_activity_at - created_at)) AS ecart FROM pro_staff_sessions`)[0]!;
    expect(Number(s.ecart)).toBe(0);
  });
});

describe("la tranche ratifiée — ses garanties", () => {
  it("UNIQUE (salle, clé de nom) : la même clé dans la MÊME salle est refusée par la base ; la même clé dans une AUTRE salle passe", async () => {
    await membre("amine");
    await refus("pro_staff_members_pro_profile_id_account_name_key_key", `${MEMBRE_BASE}) VALUES ($1::uuid, 'AMINE', 'amine', 'EMPLOYEE', 'h', now(), now() + interval '90 days')`, pro.proProfileId);
    const autre = await creerPro(ctx);
    await ok(`${MEMBRE_BASE}) VALUES ($1::uuid, 'Amine', 'amine', 'MANAGER', 'h', now(), now() + interval '90 days')`, autre.proProfileId);
  });

  it("CHECK pin_failed_count entre 0 et 3 : -1 et 4 refusés, 0 à 3 acceptés", async () => {
    for (const v of [-1, 4]) await refus("pro_staff_members_pin_failed_count_range", `${MEMBRE_BASE}, pin_failed_count) VALUES ($1::uuid, 'x', 'x${v}', 'MANAGER', 'h', now(), now() + interval '90 days', ${v})`, pro.proProfileId);
    for (const v of [0, 1, 2, 3]) await ok(`${MEMBRE_BASE}, pin_failed_count) VALUES ($1::uuid, 'x', 'ok${v}', 'MANAGER', 'h', now(), now() + interval '90 days', ${v})`, pro.proProfileId);
  });

  it("UNIQUE (token_hash) sur les appareils ET sur les sessions", async () => {
    await membre("amine");
    const id = await idMembre("amine");
    await appareil(id, "meme");
    await refus("pro_staff_devices_token_hash_key", `INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at) VALUES ($1::uuid, 'meme', 'Poste', now() + interval '1 day')`, id);
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    await ok(`INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 'ms', now() + interval '1 hour')`, id, d);
    await refus("pro_staff_sessions_token_hash_key", `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 'ms', now() + interval '1 hour')`, id, d);
  });

  it("clés étrangères : un membre sans salle, un appareil sans membre, une session sans appareil sont refusés", async () => {
    await refus("pro_staff_members_pro_profile_id_fkey", `${MEMBRE_BASE}) VALUES ($1::uuid, 'x', 'x', 'MANAGER', 'h', now(), now() + interval '90 days')`, randomUUID());
    await refus("pro_staff_devices_member_id_fkey", `INSERT INTO pro_staff_devices (member_id, token_hash, label, expires_at) VALUES ($1::uuid, 'h', 'Poste', now() + interval '1 day')`, randomUUID());
    await membre("amine");
    const id = await idMembre("amine");
    await refus("pro_staff_sessions_device_id_fkey", `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 'h', now() + interval '1 hour')`, id, randomUUID());
  });

  it("⛔ les énumérations refusent une valeur hors schéma — chacune PAR SON NOM (un rôle `ADMIN`, un statut `ARCHIVED`, une fin `INCONNUE`) : un refus pour une autre raison (une table absente) ne prouverait rien", async () => {
    await refus('invalid input value for enum "StaffRole"', `${MEMBRE_BASE}) VALUES ($1::uuid, 'x', 'x', 'ADMIN', 'h', now(), now() + interval '90 days')`, pro.proProfileId);
    await refus('invalid input value for enum "StaffStatus"', `${MEMBRE_BASE}, status) VALUES ($1::uuid, 'x', 'y', 'MANAGER', 'h', now(), now() + interval '90 days', 'ARCHIVED')`, pro.proProfileId);
    await membre("amine");
    const id = await idMembre("amine");
    await appareil(id, "d");
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    await refus('invalid input value for enum "StaffSessionEndReason"', `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at, ended_at, end_reason) VALUES ($1::uuid, $2::uuid, 'z', now() + interval '1 hour', now(), 'INCONNUE')`, id, d);
  });
});

describe("1 b — les SIX garanties de base adoptées par la consigne", () => {
  it("⛔ (a) `status = 'DISABLED'` ⇔ `disabled_at IS NOT NULL` : DISABLED sans date refusé, ACTIVE avec date refusé, DISABLED avec date accepté", async () => {
    await refus("pro_staff_members_status_disabled_coherent", `${MEMBRE_BASE}, status) VALUES ($1::uuid, 'x', 'a1', 'MANAGER', 'h', now(), now() + interval '90 days', 'DISABLED')`, pro.proProfileId);
    await refus("pro_staff_members_status_disabled_coherent", `${MEMBRE_BASE}, disabled_at) VALUES ($1::uuid, 'x', 'a2', 'MANAGER', 'h', now(), now() + interval '90 days', now())`, pro.proProfileId);
    await ok(`${MEMBRE_BASE}, status, disabled_at) VALUES ($1::uuid, 'x', 'a3', 'MANAGER', 'h', now(), now() + interval '90 days', 'DISABLED', now())`, pro.proProfileId);
  });

  it("⛔ (b) `pin_hash`, `pin_generated_at`, `pin_expires_at` : tous nuls ou tous non nuls — chacun des trois, isolé, est refusé ; les trois ensemble sont acceptés", async () => {
    const cas: Array<[string, string]> = [["pin_hash", "'h'"], ["pin_generated_at", "now()"], ["pin_expires_at", "now() + interval '90 days'"]];
    let i = 0;
    for (const [colonne, valeur] of cas) {
      i += 1;
      await refus("pro_staff_members_pin_triple_coherent", `${MEMBRE_BASE}, ${colonne}) VALUES ($1::uuid, 'x', 'b${i}', 'MANAGER', 'h', now(), now() + interval '90 days', ${valeur})`, pro.proProfileId);
    }
    for (const [deux, nom] of [["pin_hash, pin_generated_at", "'h', now()"], ["pin_hash, pin_expires_at", "'h', now() + interval '90 days'"], ["pin_generated_at, pin_expires_at", "now(), now() + interval '90 days'"]] as const) {
      i += 1;
      await refus("pro_staff_members_pin_triple_coherent", `${MEMBRE_BASE}, ${deux}) VALUES ($1::uuid, 'x', 'b${i}', 'MANAGER', 'h', now(), now() + interval '90 days', ${nom})`, pro.proProfileId);
    }
    await ok(`${MEMBRE_BASE}, pin_hash, pin_generated_at, pin_expires_at) VALUES ($1::uuid, 'x', 'b9', 'MANAGER', 'h', now(), now() + interval '90 days', 'p', now(), now() + interval '90 days')`, pro.proProfileId);
  });

  it("⛔ (c) `ended_at` et `end_reason` : tous deux nuls ou tous deux non nuls — chacun isolé est refusé", async () => {
    await membre("amine");
    const id = await idMembre("amine");
    await appareil(id, "d");
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    const base = `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at`;
    await refus("pro_staff_sessions_ended_coherent", `${base}, ended_at) VALUES ($1::uuid, $2::uuid, 'c1', now() + interval '1 hour', now())`, id, d);
    await refus("pro_staff_sessions_ended_coherent", `${base}, end_reason) VALUES ($1::uuid, $2::uuid, 'c2', now() + interval '1 hour', 'LOGOUT')`, id, d);
    await ok(`${base}, ended_at, end_reason) VALUES ($1::uuid, $2::uuid, 'c3', now() + interval '1 hour', now(), 'LOGOUT')`, id, d);
  });

  it("⛔ (d) `expires_at > created_at` sur les sessions ET sur les appareils : égalité et antériorité refusées", async () => {
    await membre("amine");
    const id = await idMembre("amine");
    await refus("pro_staff_devices_expires_after_created", `INSERT INTO pro_staff_devices (member_id, token_hash, label, created_at, expires_at) VALUES ($1::uuid, 'e1', 'Poste', now(), now())`, id);
    await refus("pro_staff_devices_expires_after_created", `INSERT INTO pro_staff_devices (member_id, token_hash, label, created_at, expires_at) VALUES ($1::uuid, 'e2', 'Poste', now(), now() - interval '1 day')`, id);
    await appareil(id, "e3");
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    await refus("pro_staff_sessions_expires_after_created", `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, created_at, expires_at) VALUES ($1::uuid, $2::uuid, 'e4', now(), now())`, id, d);
    await refus("pro_staff_sessions_expires_after_created", `INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, created_at, expires_at) VALUES ($1::uuid, $2::uuid, 'e5', now(), now() - interval '1 hour')`, id, d);
  });

  it("⛔ (e) `password_failed_count >= 0` : -1 refusé ; 0 et une valeur au-delà du seuil de pause acceptés (le seuil est une règle du service, pas de la base)", async () => {
    await refus("pro_staff_members_password_failed_count_nonneg", `${MEMBRE_BASE}, password_failed_count) VALUES ($1::uuid, 'x', 'f1', 'MANAGER', 'h', now(), now() + interval '90 days', -1)`, pro.proProfileId);
    await ok(`${MEMBRE_BASE}, password_failed_count) VALUES ($1::uuid, 'x', 'f2', 'MANAGER', 'h', now(), now() + interval '90 days', 0)`, pro.proProfileId);
    await ok(`${MEMBRE_BASE}, password_failed_count) VALUES ($1::uuid, 'x', 'f3', 'MANAGER', 'h', now(), now() + interval '90 days', 7)`, pro.proProfileId);
  });

  it("⛔ (f) `account_name_key <> ''` : une clé vide est refusée", async () => {
    await refus("pro_staff_members_account_name_key_present", `${MEMBRE_BASE}) VALUES ($1::uuid, 'x', '', 'MANAGER', 'h', now(), now() + interval '90 days')`, pro.proProfileId);
  });

  it("⛔ 1 b — AUCUN déclencheur : « jamais zéro Manager » n'est pas une garde de base (§ 3.2 du cadrage) ; la table n'en porte aucun, et un dernier Manager peut être désactivé en SQL", async () => {
    const declencheurs = await ctx.prisma.$queryRaw<Array<{ n: string }>>`
      SELECT tgname AS n FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('pro_staff_members'::regclass, 'pro_staff_devices'::regclass, 'pro_staff_sessions'::regclass)`;
    expect(declencheurs).toEqual([]);
    await membre("amine");
    await ok(`UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now() WHERE account_name_key = 'amine'`);
  });
});

describe("l'audit et les suppressions", () => {
  it("⛔ `audit_logs.actor_member_id` est une clé étrangère : un membre inexistant est refusé", async () => {
    await refus("audit_logs_actor_member_id_fkey", `INSERT INTO audit_logs (action, entity_type, actor_member_id) VALUES ('x', 'y', $1::uuid)`, randomUUID());
  });

  it("⛔ `ON DELETE SET NULL` : supprimer un membre (sans appareil ni session) met `actor_member_id` à NULL dans le journal — la ligne d'audit SURVIT, sans son auteur", async () => {
    await membre("amine");
    const id = await idMembre("amine");
    await ok(`INSERT INTO audit_logs (action, entity_type, actor_member_id) VALUES ('x', 'y', $1::uuid)`, id);
    await ok(`DELETE FROM pro_staff_members WHERE id = $1::uuid`, id);
    const l = await ctx.prisma.$queryRaw<Array<{ a: string | null }>>`SELECT actor_member_id::text AS a FROM audit_logs WHERE action = 'x'`;
    expect(l).toEqual([{ a: null }]);
  });

  it("⛔ RESTRICT : une salle qui porte un membre ne se supprime pas en dur ; un membre qui porte un appareil ne se supprime pas ; un appareil qui porte une session non plus", async () => {
    await membre("amine");
    const id = await idMembre("amine");
    await refus("pro_staff_members_pro_profile_id_fkey", `DELETE FROM pro_profiles WHERE id = $1::uuid`, pro.proProfileId);
    await appareil(id, "d");
    await refus("pro_staff_devices_member_id_fkey", `DELETE FROM pro_staff_members WHERE id = $1::uuid`, id);
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices`)[0]!.id;
    await ok(`INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 's', now() + interval '1 hour')`, id, d);
    await refus("pro_staff_sessions_device_id_fkey", `DELETE FROM pro_staff_devices WHERE id = $1::uuid`, d);
  });

  it("⛔ RESTRICT sur `pro_staff_sessions.member_id`, ISOLÉ : un membre qui porte une session ne se supprime pas — la session pointe l'appareil d'un AUTRE membre, pour que ce ne soit pas la clé de l'appareil qui refuse à sa place", async () => {
    await membre("amine");
    await membre("sara");
    const amine = await idMembre("amine");
    const sara = await idMembre("sara");
    await appareil(sara, "d-sara");
    const d = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`SELECT id::text AS id FROM pro_staff_devices WHERE token_hash = 'd-sara'`)[0]!.id;
    await ok(`INSERT INTO pro_staff_sessions (member_id, device_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, 's', now() + interval '1 hour')`, amine, d);
    await refus("pro_staff_sessions_member_id_fkey", `DELETE FROM pro_staff_members WHERE id = $1::uuid`, amine);
  });

  it("les index simples existent sous les noms que `schema.prisma` leur donne (sinon dérive permanente, D186) : appareils et sessions par membre, sessions par appareil, journal par auteur-membre", async () => {
    const l = await ctx.prisma.$queryRaw<Array<{ n: string }>>`
      SELECT indexname AS n FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname IN ('pro_staff_devices_member_id_idx', 'pro_staff_sessions_member_id_idx', 'pro_staff_sessions_device_id_idx', 'audit_logs_actor_member_id_idx')
       ORDER BY 1`;
    expect(l.map((r) => r.n)).toEqual(["audit_logs_actor_member_id_idx", "pro_staff_devices_member_id_idx", "pro_staff_sessions_device_id_idx", "pro_staff_sessions_member_id_idx"]);
  });

  it("`created_by_member_id` : une clé étrangère RESTRICT — le créateur d'un autre membre ne se supprime pas (les membres se désactivent, ils ne se suppriment jamais)", async () => {
    await membre("amine");
    const createur = await idMembre("amine");
    await ok(`${MEMBRE_BASE}, created_by_member_id) VALUES ($1::uuid, 'Sara', 'sara', 'EMPLOYEE', 'h', now(), now() + interval '90 days', $2::uuid)`, pro.proProfileId, createur);
    await refus("pro_staff_members_created_by_member_id_fkey", `DELETE FROM pro_staff_members WHERE id = $1::uuid`, createur);
  });
});
