// Façade pro du paquet PARTAGÉ @zwadj/api-client (D18) : injection de la base
// URL Vite — la logique (mutex single-flight, rejeu unique) vit dans le paquet.
import { createAuthClient as createSharedAuthClient } from "@zwadj/api-client";

export { ApiError, NetworkError, type ApiIssue, type AuthClient } from "@zwadj/api-client";

/** Base de l'API, source UNIQUE : le client HTTP et les URL de médias en
 *  dépendent tous les deux (cf. `media-url.ts`). */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function createAuthClient() {
  return createSharedAuthClient(API_BASE_URL);
}

export const CLIENT_SITE_URL = import.meta.env.VITE_CLIENT_URL ?? "http://localhost:3000";
