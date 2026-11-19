// « JAMAIS ZÉRO MANAGER » — la DÉCISION — rang 56, L36-3a-2 (D354, R-4, K-22, MP-6, MP-31). Un module PUR : la décision se prend sur ce que le magasin a LU SOUS VERROU (le membre visé, le nombre de Managers
// actifs) ; il se neutralise en millisecondes. La COURSE, elle, se mesure sur PostgreSQL réel (`test/int/staff-last-manager.int-spec.ts`) : ce module ne sait pas qu'elle existe, il juge ce qu'on lui rend.
//
// ⛔ LA RÈGLE (DR5 : « jamais zéro Manager actif ») :
//   · un membre DÉJÀ désactivé : « alreadyDisabled » — une répétition n'est ni une erreur ni une écriture (patron de D349) ;
//   · un MANAGER actif dont la désactivation laisserait zéro Manager actif — c'est-à-dire quand il est le SEUL — : « lastManager ». ⛔ Fermé par défaut : un compte de Managers actifs incohérent (zéro alors que la
//     cible est un Manager actif) refuse aussi ;
//   · tout le reste (un EMPLOYÉ, un Manager parmi d'autres) : « disable ».
import { StaffRole, StaffStatus } from "@zwadj/types";

export interface DisableInput {
  targetRole: StaffRole;
  targetStatus: StaffStatus;
  /** Le nombre de Managers ACTIFS de la salle, lu SOUS le verrou du profil (L1), la cible comprise si elle l'est. */
  activeManagers: number;
}

export type DisableVerdict = "disable" | "alreadyDisabled" | "lastManager";

export function disableVerdict(input: DisableInput): DisableVerdict {
  if (input.targetStatus === StaffStatus.DISABLED) return "alreadyDisabled";
  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 1) return "lastManager";
  return "disable";
}
