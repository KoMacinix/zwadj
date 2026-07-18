/** Nom de la base d'intégration — recréée de zéro à CHAQUE `pnpm test:int`. */
export const TEST_DB = "zwadj_test";

/** Remplace le nom de base d'une URL PostgreSQL (garde hôte/creds/query). */
export function withDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}
