// ADM-2 (D350, rang 52, R-2 et R-3) — forcer un ENTRELACEMENT sur PostgreSQL réel, sans décalage de millisecondes.
//
// Une transaction tenue HORS du service verrouille une ligne ; les requêtes à mesurer partent, on ATTEND (par `pg_stat_activity`) qu'elles soient bloquées sur ce verrou — c'est ce qui prouve qu'elles
// ont atteint leur première écriture —, puis on le relâche. L'ordre d'arrivée est celui qu'on a choisi : PostgreSQL réveille les attentes dans l'ordre où elles se sont mises en file.
// Un décalage de quelques millisecondes (patron de la course publier / rejeter de D349) balaie des entrelacements sans en garantir aucun : mesuré à D349, une mutation y laissait un test VERT.
import { expect } from "vitest";
import type { PrismaService } from "../../src/prisma/prisma.service";

/** Les seules tables dont on verrouille une ligne : le nom d'une table ne se passe pas en paramètre, on ne laisse donc pas un texte libre entrer dans la requête. */
// D354 (rang 56, R-4) : `pro_profiles` — le verrou L1 de « jamais zéro Manager » (cadrage D340, § 3.1). Tenu hors du service, il fait ATTENDRE deux désactivations simultanées à l'endroit exact où elles se
// sérialisent ; un comptage des Managers fait AVANT ce verrou les laisserait réussir toutes les deux.
type LockableTable = "account_deletion_requests" | "pro_profiles" | "venues";
type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

export interface RowLock {
  /** Résolue quand le verrou est TENU (et l'action éventuelle écrite, non validée). */
  ready: Promise<void>;
  /** Valide la transaction : le verrou tombe, les requêtes en attente reprennent dans leur ordre d'arrivée. */
  release: () => void;
  /** Résolue quand la transaction est validée. */
  done: Promise<void>;
}

/**
 * Verrouille la ligne `id` de `table` (`SELECT … FOR UPDATE`), exécute `action` dans cette même transaction (une écriture non validée : les autres sessions ne la voient pas), puis attend `release()`
 * avant de valider.
 */
export function holdRow(prisma: PrismaService, table: LockableTable, id: string, action?: (tx: Tx) => Promise<void>): RowLock {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signalReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    signalReady = resolve;
  });
  const done = prisma.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(`SELECT id FROM ${table} WHERE id = $1::uuid FOR UPDATE`, id);
      if (action) await action(tx);
      signalReady();
      await gate;
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
  return { ready, release, done };
}

/**
 * Attend que `n` connexions soient BLOQUÉES sur un verrou. L'échec est une ASSERTION (D304, D305 : un verdict se lit en `AssertionError`, jamais en erreur d'infrastructure) : si les requêtes ne se bloquent
 * pas — le code qu'on mesure ne les a pas fait attendre sur la ligne —, le test dit « pas assez de requêtes bloquées » au lieu de rester suspendu.
 */
export async function waitBlocked(prisma: PrismaService, n: number): Promise<void> {
  const limit = Date.now() + 10_000;
  let bloquees = 0;
  for (;;) {
    const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`;
    bloquees = rows[0]?.n ?? 0;
    if (bloquees >= n || Date.now() > limit) break;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  expect(bloquees, `requêtes bloquées sur le verrou de la ligne (attendu au moins ${n})`).toBeGreaterThanOrEqual(n);
}
