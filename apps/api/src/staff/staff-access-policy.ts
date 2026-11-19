// LE VERDICT D'ACCÈS du quatrième garde global — rang 56, L36-3a-2 (D354, R-2, R-3, S-107, S-239, S-242). Ce que le garde décide d'une session ADMISE : l'état du compte (`etatDuCompte`), le rôle du membre, la
// méthode HTTP et la capacité que la route DÉCLARE. Un module PUR (D187) : il se rejoue en millisecondes et se neutralise à chaque passage ; le garde ne fait que lire la requête et appliquer ce verdict.
//
// ⛔ L'ORDRE EST LA RÈGLE :
//   1. DÉSACTIVÉ ou TEMPORAIRE EXPIRÉ : refus de SESSION (401, le même que toute session refusée) — même la route du membre lui-même ;
//   2. MOT DE PASSE À CHANGER : SEULE la route du membre sur sa propre session passe (changer son mot de passe, se déconnecter) ; toute autre — une lecture comme une écriture, le MANAGER comme l'employé — est
//      un refus de CAPACITÉ (403 `STAFF_CAPABILITY_DENIED`, S-242 : aucun code neuf, le même corps que tout refus de capacité) ;
//   3. ACTIF : la route du membre passe pour tout rôle ; sinon la capacité DÉCLARÉE décide (`peut(rôle, capacité, acte)`) ; SANS déclaration (S-107) : les LECTURES passent, les écritures sont au MANAGER seul — une
//      route oubliée est plus fermée, jamais plus ouverte. Une capacité INCONNUE est refusée à tout le monde (fermé par défaut).
// ⛔ La méthode : GET, HEAD et OPTIONS sont des lectures (sans égard à la casse) ; TOUT le reste — y compris une méthode inconnue ou vide — est une écriture.
import { StaffAccountState, StaffRole, peut, type StaffCapability } from "@zwadj/types";

export type AccessVerdict = "allow" | "refuseSession" | "refuseCapability";

export interface AccessInput {
  state: StaffAccountState;
  role: StaffRole;
  /** La méthode HTTP de la requête. */
  method: string;
  /** La capacité déclarée par la route ou sa classe (`@RequiresStaffCapability`), ou `undefined` : la règle par défaut S-107 s'applique. */
  capability: StaffCapability | undefined;
  /** La route est celle du membre sur sa propre session (`@StaffAnyMember()`). */
  ownSession: boolean;
}

const LECTURES: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

export function accessVerdict(input: AccessInput): AccessVerdict {
  if (input.state === StaffAccountState.DISABLED || input.state === StaffAccountState.TEMPORARY_EXPIRED) return "refuseSession";
  if (input.state === StaffAccountState.MUST_CHANGE_PASSWORD) return input.ownSession ? "allow" : "refuseCapability";
  if (input.ownSession) return "allow";
  const acte = LECTURES.has(input.method.toUpperCase()) ? "read" : "write";
  if (input.capability === undefined) return acte === "read" || input.role === StaffRole.MANAGER ? "allow" : "refuseCapability";
  return peut(input.role, input.capability, acte) ? "allow" : "refuseCapability";
}
