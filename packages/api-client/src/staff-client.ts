// Le PERSONNEL d'une salle — rang 44, L36-3a-1 (D341) : K-14 (activer), K-15 (se connecter), K-16 (se déconnecter), K-17 (l'état), K-18 (changer son mot de passe).
//
// ⚠ CHEMINS ÉCRITS EN TOUTES LETTRES DANS CHAQUE APPEL À `request(...)` (D182) : `contract-api-client.int-spec.ts` relève les chemins dans les SOURCES et les
// confronte aux routes de l'API — un chemin construit hors de l'appel lui serait invisible.
// ⚠ Aucune règle ici : le nom de compte et les mots de passe sont validés par le contrat (`@zwadj/types`), à l'écran avant l'envoi et au serveur à l'arrivée.
// ⚠ Les cookies de session et d'appareil sont posés par le SERVEUR (`HttpOnly`) : ce client ne les lit ni ne les écrit, et aucun écran ne le consomme avant L36-4.
import type {
  StaffActivateInput,
  StaffActivationDTO,
  StaffLoginDTO,
  StaffLoginInput,
  StaffLogoutDTO,
  StaffPasswordChangeDTO,
  StaffPasswordChangeInput,
  StaffSessionStateDTO
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface StaffClient {
  /** K-14 — le propriétaire crée le Manager de sa salle : la couche s'active, la session et l'appareil s'ouvrent. */
  activate(input: StaffActivateInput): Promise<StaffActivationDTO>;
  /** K-15 — ouvre une session de personnel ; TOUS les refus sont le même 401 (R-3 (D341)). */
  login(input: StaffLoginInput): Promise<StaffLoginDTO>;
  /** K-16 — termine la session courante ; l'appareil reste reconnu. */
  logout(): Promise<StaffLogoutDTO>;
  /** K-17 — l'état de la couche pour ce compte et ce poste : jamais un refus, ne prolonge pas la session. */
  session(): Promise<StaffSessionStateDTO>;
  /** K-18 — le membre change SON mot de passe ; ses autres sessions prennent fin. */
  changePassword(input: StaffPasswordChangeInput): Promise<StaffPasswordChangeDTO>;
}

export function createStaffClient(request: AuthedRequest): StaffClient {
  return {
    activate: (input) => request<StaffActivationDTO>("/pro/staff/activate", { method: "POST", body: input }),
    login: (input) => request<StaffLoginDTO>("/pro/staff/login", { method: "POST", body: input }),
    logout: () => request<StaffLogoutDTO>("/pro/staff/logout", { method: "POST" }),
    session: () => request<StaffSessionStateDTO>("/pro/staff/session"),
    changePassword: (input) => request<StaffPasswordChangeDTO>("/pro/staff/password", { method: "POST", body: input })
  };
}
