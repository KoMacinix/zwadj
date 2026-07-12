import type { ApiHealthResponse } from "@zwadj/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Client API minimal du squelette : GET /api/v1/health, typé par le contrat
 * partagé @zwadj/types. Tolère une API éteinte (la page doit se rendre quand même).
 */
export async function getApiHealth(): Promise<ApiHealthResponse | { status: "unreachable" }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, { cache: "no-store" });
    if (!res.ok) return { status: "unreachable" };
    return (await res.json()) as ApiHealthResponse;
  } catch {
    return { status: "unreachable" };
  }
}
