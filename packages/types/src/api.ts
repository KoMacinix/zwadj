/** Contrat de GET /api/v1/health — consommé par apps/client (preuve de bout en bout). */
export interface ApiHealthResponse {
  status: "ok";
  db: "up" | "down";
  timestamp: string; // ISO 8601 UTC
}
