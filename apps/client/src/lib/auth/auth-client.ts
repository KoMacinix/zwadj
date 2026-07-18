// Point d'entrée client du paquet PARTAGÉ @zwadj/api-client (Lot 6 — D18) :
// la logique (mutex single-flight, rejeu unique, enveloppe d'erreur) vit dans
// le paquet ; ici on ne fait qu'injecter la base URL Next et ré-exporter les
// types pour que les imports existants du Lot 5 restent inchangés.
import { createAuthClient as createSharedAuthClient } from "@zwadj/api-client";

export { ApiError, NetworkError, type ApiIssue, type AuthClient } from "@zwadj/api-client";

export function createAuthClient() {
  return createSharedAuthClient(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");
}
