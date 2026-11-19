// Le PERSONNEL d'une salle — rang 44, L36-3a-1 (D341) : K-14 (activer), K-15 (se connecter), K-16 (se déconnecter), K-17 (l'état), K-18 (changer son mot de passe) ;
// rang 56, L36-3a-2 (D354) : K-19 (lister les membres), K-20 (créer un membre), K-21 (réinitialiser un mot de passe), K-22 (désactiver un membre).
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
  StaffMemberCreateInput,
  StaffMemberDisabledDTO,
  StaffMembersListDTO,
  StaffPasswordChangeDTO,
  StaffPasswordChangeInput,
  StaffSessionStateDTO,
  StaffTemporaryPasswordDTO
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
  /** K-19 — les membres de la salle, leur état, aucun secret (Manager seul). */
  listMembers(): Promise<StaffMembersListDTO>;
  /** K-20 — crée un membre ; le mot de passe temporaire est GÉNÉRÉ par le serveur et rendu UNE fois (Manager seul). */
  createMember(input: StaffMemberCreateInput): Promise<StaffTemporaryPasswordDTO>;
  /** K-21 — un NOUVEAU temporaire, rendu UNE fois ; les sessions et les appareils du membre sont révoqués (Manager seul). */
  resetMemberPassword(memberId: string): Promise<StaffTemporaryPasswordDTO>;
  /** K-22 — désactive un membre ; jamais le dernier Manager actif (409 `STAFF_LAST_MANAGER`) (Manager seul). */
  disableMember(memberId: string): Promise<StaffMemberDisabledDTO>;
}

export function createStaffClient(request: AuthedRequest): StaffClient {
  return {
    activate: (input) => request<StaffActivationDTO>("/pro/staff/activate", { method: "POST", body: input }),
    login: (input) => request<StaffLoginDTO>("/pro/staff/login", { method: "POST", body: input }),
    logout: () => request<StaffLogoutDTO>("/pro/staff/logout", { method: "POST" }),
    session: () => request<StaffSessionStateDTO>("/pro/staff/session"),
    changePassword: (input) => request<StaffPasswordChangeDTO>("/pro/staff/password", { method: "POST", body: input }),
    listMembers: () => request<StaffMembersListDTO>("/pro/staff/members"),
    createMember: (input) => request<StaffTemporaryPasswordDTO>("/pro/staff/members", { method: "POST", body: input }),
    resetMemberPassword: (memberId) => request<StaffTemporaryPasswordDTO>(`/pro/staff/members/${memberId}/reset-password`, { method: "POST" }),
    disableMember: (memberId) => request<StaffMemberDisabledDTO>(`/pro/staff/members/${memberId}/disable`, { method: "POST" })
  };
}
