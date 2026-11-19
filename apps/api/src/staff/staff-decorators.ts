// Les DÉCORATEURS de la couche du personnel — rang 44, L36-3a-1 (D341). Le quatrième garde global est FERMÉ PAR DÉFAUT (D6, D119) : toute route authentifiée atteignable par un PRO exige une session de
// personnel dès que la couche est activée, SAUF celles qui portent `@StaffExempt()`. Une route neuve est donc couverte le jour où elle apparaît ; l'exemption est un CHOIX ÉCRIT, jamais un oubli.
//
// ⛔ LA LISTE DES ROUTES EXEMPTÉES EST FERMÉE : quatre aujourd'hui (l'état du compte commun `GET /auth/me`, l'activation, la connexion, l'état de session) ; `pin-login` sera la cinquième au lot 3b. Elle est
// confrontée au routeur par `test/int/staff-session-guard.int-spec.ts` et comptée dans les sources par `staff-source-guards.spec.ts`.
import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { StaffCapability as StaffCapabilityName, StaffRole } from "@zwadj/types";

export const STAFF_EXEMPT_KEY = "zwadj:staffExempt";
/** Opt-out du garde du personnel : cette route ne dépend pas d'une session de personnel (elle sert à en ouvrir une, ou à lire l'état du compte). */
export const StaffExempt = (): MethodDecorator & ClassDecorator => SetMetadata(STAFF_EXEMPT_KEY, true);

// ── Rang 56 (D354, R-2) : la CAPACITÉ que la route déclare, et la route du MEMBRE sur sa propre session ──────────────────────────────────────────────────────────────────────────────────────────────
export const STAFF_CAPABILITY_KEY = "zwadj:staffCapability";
/**
 * La capacité de la table de `@zwadj/types` dont dépend cette route (ou toutes les routes de cette classe) : `@RequiresStaffCapability("agenda")`. Posée au niveau de la CLASSE (consigne, R-2). Une route SANS
 * déclaration tombe sur la règle par défaut S-107 : écritures au MANAGER seul, lectures à tous — une route oubliée est plus fermée, jamais plus ouverte. Le garde de SOURCE `staff-source-guards.spec.ts`
 * liste chaque contrôleur Pro et ce qu'il déclare.
 */
export const RequiresStaffCapability = (capability: StaffCapabilityName): MethodDecorator & ClassDecorator => SetMetadata(STAFF_CAPABILITY_KEY, capability);

export const STAFF_ANY_MEMBER_KEY = "zwadj:staffAnyMember";
/**
 * La route du MEMBRE sur SA PROPRE session (se déconnecter, changer son mot de passe) : tout membre actif l'atteint, quel que soit son rôle — et c'est la SEULE catégorie qui passe quand son mot de passe est à
 * changer (S-104). La liste est FERMÉE : deux handlers, comptés par `staff-source-guards.spec.ts` et dérivés du routeur par `staff-capabilities.int-spec.ts`.
 */
export const StaffAnyMember = (): MethodDecorator & ClassDecorator => SetMetadata(STAFF_ANY_MEMBER_KEY, true);

/** Ce que le garde pose sur `request.staff` quand il a admis une session : la personne qui agit derrière le compte commun. Absent quand la couche est éteinte. */
export interface StaffContext {
  sessionId: string;
  memberId: string;
  role: StaffRole;
  accountName: string;
  /** L'état « à changer » (S-104) JUGÉ par `etatDuCompte` à l'heure de la base — pas la colonne brute. */
  mustChangePassword: boolean;
  /** La salle du compte commun (celle du Bearer) — jamais déduite du cookie. */
  proProfileId: string;
}

/** Injecte le contexte du personnel posé par `StaffSessionGuard`, ou `undefined` (couche éteinte, ou route exemptée). */
export const CurrentStaff = createParamDecorator((_data: unknown, context: ExecutionContext): StaffContext | undefined => {
  return context.switchToHttp().getRequest<{ staff?: StaffContext }>().staff;
});
