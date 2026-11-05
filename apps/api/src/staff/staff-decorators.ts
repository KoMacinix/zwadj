// Les DÉCORATEURS de la couche du personnel — rang 44, L36-3a-1 (D341). Le quatrième garde global est FERMÉ PAR DÉFAUT (D6, D119) : toute route authentifiée atteignable par un PRO exige une session de
// personnel dès que la couche est activée, SAUF celles qui portent `@StaffExempt()`. Une route neuve est donc couverte le jour où elle apparaît ; l'exemption est un CHOIX ÉCRIT, jamais un oubli.
//
// ⛔ LA LISTE DES ROUTES EXEMPTÉES EST FERMÉE : quatre aujourd'hui (l'état du compte commun `GET /auth/me`, l'activation, la connexion, l'état de session) ; `pin-login` sera la cinquième au lot 3b. Elle est
// confrontée au routeur par `test/int/staff-session-guard.int-spec.ts` et comptée dans les sources par `staff-source-guards.spec.ts`.
import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { StaffRole } from "@zwadj/types";

export const STAFF_EXEMPT_KEY = "zwadj:staffExempt";
/** Opt-out du garde du personnel : cette route ne dépend pas d'une session de personnel (elle sert à en ouvrir une, ou à lire l'état du compte). */
export const StaffExempt = (): MethodDecorator & ClassDecorator => SetMetadata(STAFF_EXEMPT_KEY, true);

/** Ce que le garde pose sur `request.staff` quand il a admis une session : la personne qui agit derrière le compte commun. Absent quand la couche est éteinte. */
export interface StaffContext {
  sessionId: string;
  memberId: string;
  role: StaffRole;
  accountName: string;
  mustChangePassword: boolean;
  /** La salle du compte commun (celle du Bearer) — jamais déduite du cookie. */
  proProfileId: string;
}

/** Injecte le contexte du personnel posé par `StaffSessionGuard`, ou `undefined` (couche éteinte, ou route exemptée). */
export const CurrentStaff = createParamDecorator((_data: unknown, context: ExecutionContext): StaffContext | undefined => {
  return context.switchToHttp().getRequest<{ staff?: StaffContext }>().staff;
});
