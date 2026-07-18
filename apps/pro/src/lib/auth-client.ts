// Façade pro du paquet PARTAGÉ @zwadj/api-client (D18) : injection de la base
// URL Vite — la logique (mutex single-flight, rejeu unique) vit dans le paquet.
import { createAuthClient as createSharedAuthClient } from "@zwadj/api-client";

export { ApiError, NetworkError, type ApiIssue, type AuthClient } from "@zwadj/api-client";

export function createAuthClient() {
  return createSharedAuthClient(import.meta.env.VITE_API_URL ?? "http://localhost:3001");
}

export const CLIENT_SITE_URL = import.meta.env.VITE_CLIENT_URL ?? "http://localhost:3000";
