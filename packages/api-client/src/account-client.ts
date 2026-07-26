// Client HTTP du domaine COMPTE (Lot A11a).
//
// Bâti sur `authedRequest`, comme le client venue d'A5 — et pour la même
// raison : il PARTAGE ainsi le token mémoire (D2) et le mutex single-flight du
// refresh. Sans ça, un écran de configuration qui déclenche deux appels dont
// les tokens expirent ensemble provoquerait DEUX POST /auth/refresh, et l'API
// verrait le second comme une réutilisation (D10) — révocation de toute la
// session au beau milieu d'un formulaire.
//
// Décision assumée : `AuthClient` n'est PAS étendu. Toute méthode ajoutée à
// cette interface casse les mocks construits à la main dans les DEUX apps
// (piège déjà payé en A5, puis en A10 via AuthUserDTO). `authedRequest` est
// générique : il n'y avait aucune raison d'y toucher.
import type {
  AuthUserDTO,
  ChangeEmailInput,
  ChangeEmailResponse,
  ChangePasswordInput,
  DeletionRequestDTO,
  ProfileUpdateInput
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface AccountClient {
  /** Patch PARTIEL : n'envoyer QUE les champs modifiés. Retourne l'AuthUserDTO
   *  complet — le contexte de session se réhydrate donc sans second appel. */
  updateProfile(input: ProfileUpdateInput): Promise<AuthUserDTO>;
  /** Ne bascule RIEN : un lien part à la nouvelle adresse. L'ancienne reste
   *  l'identifiant de connexion jusqu'à ce qu'il soit ouvert. */
  changeEmail(input: ChangeEmailInput): Promise<ChangeEmailResponse>;
  /** D42 — le MODE (définir / modifier) est décidé par le serveur. Le front
   *  n'envoie `currentPassword` que s'il en a un à envoyer ; il ne DÉCIDE
   *  rien. Réponse sans corps utile : la session doit être rechargée par
   *  l'appelant pour que `hasPassword` passe à `true`. */
  changePassword(input: ChangePasswordInput): Promise<void>;
  /** `null` = aucune demande. Les trois états d'écran en dérivent. */
  getDeletionRequest(): Promise<DeletionRequestDTO | null>;
  requestDeletion(reason?: string): Promise<DeletionRequestDTO>;
  cancelDeletion(): Promise<DeletionRequestDTO>;
  /** Relit /auth/me — utilisé après un changement de mot de passe, dont la
   *  réponse ne porte pas le DTO. */
  reloadUser(): Promise<AuthUserDTO>;
}

export function createAccountClient(request: AuthedRequest): AccountClient {
  return {
    updateProfile: (input) => request<AuthUserDTO>("/me/profile", { method: "PATCH", body: input }),
    changeEmail: (input) => request<ChangeEmailResponse>("/me/change-email", { method: "POST", body: input }),
    async changePassword(input) {
      await request<{ status: string }>("/me/change-password", { method: "POST", body: input });
    },
    async getDeletionRequest() {
      // L'API répond un corps VIDE pour « aucune demande » (Nest sérialise un
      // retour `null` ainsi). On normalise ici, une fois, plutôt que dans
      // chaque écran : `null` est le contrat côté front.
      const res = await request<DeletionRequestDTO | null | Record<string, never>>("/me/deletion-request");
      return res !== null && typeof res === "object" && "status" in res ? (res as DeletionRequestDTO) : null;
    },
    requestDeletion: (reason) =>
      request<DeletionRequestDTO>("/me/deletion-request", {
        method: "POST",
        // Corps toujours présent : le schéma est `.strict()` côté API, mais il
        // accepte l'objet vide — envoyer `{}` évite un corps absent que le
        // ValidationPipe traiterait comme `undefined`.
        body: reason === undefined || reason === "" ? {} : { reason }
      }),
    cancelDeletion: () =>
      request<DeletionRequestDTO>("/me/deletion-request/cancel", { method: "POST", body: {} }),
    reloadUser: () => request<AuthUserDTO>("/auth/me")
  };
}
