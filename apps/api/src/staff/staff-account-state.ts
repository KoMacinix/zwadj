// L'ÉTAT DU COMPTE d'un membre — rang 56, L36-3a-2 (D354, R-3, S-104, S-241). UNE copie de la règle « ce membre peut-il agir maintenant ? », lue par le garde, par la connexion et par l'état de session (et, au lot 3b,
// par la connexion par PIN) : trois copies se désaccorderaient en silence (D187 : un module sans dépendance se rejoue en millisecondes et se neutralise à chaque passage — `neutralisation/neutralize-r56.py`).
//
// ⛔ LA RÈGLE (S-104, consigne § 2 R-3) :
//   · désactivé                                               → DISABLED : pas de session, pas de connexion ;
//   · mot de passe ORDINAIRE (must_change_password faux) :
//       valable                                               → ACTIVE ;
//       EXPIRÉ (90 jours)                                     → MUST_CHANGE_PASSWORD : la connexion est ADMISE, vers le seul changement de mot de passe ;
//   · mot de passe TEMPORAIRE (must_change_password vrai — le SEUL marqueur : aucune colonne « temporaire », DR8) :
//       valable (7 jours)                                     → MUST_CHANGE_PASSWORD : changement obligatoire ;
//       EXPIRÉ                                                → TEMPORARY_EXPIRED : la connexion est REFUSÉE, « le Manager doit en refaire un ».
// ⛔ L'ÉCHÉANCE EST INCLUSE DANS L'EXPIRÉ (`<=`) : un mot de passe qui expire à l'instant exact où l'on se connecte est expiré — comme `expires_at <= now()` du garde (D55 : la borne se dérive du cas réel).
// ⛔ AUCUNE HORLOGE ICI (MP-41, S-109) : `maintenant` est un PARAMÈTRE — c'est `now()` de la BASE, rendu par le magasin avec le membre. Une horloge de l'API dériverait de celle de la base.
import { StaffAccountState, StaffStatus } from "@zwadj/types";

/** Ce que la règle lit d'un membre. Les trois champs sont ceux que le magasin rend avec l'heure de la base. */
export interface AccountSubject {
  status: StaffStatus;
  mustChangePassword: boolean;
  passwordExpiresAt: Date;
}

export function etatDuCompte(membre: AccountSubject, maintenant: Date): StaffAccountState {
  if (membre.status !== StaffStatus.ACTIVE) return StaffAccountState.DISABLED;
  const expire = membre.passwordExpiresAt.getTime() <= maintenant.getTime();
  if (membre.mustChangePassword) return expire ? StaffAccountState.TEMPORARY_EXPIRED : StaffAccountState.MUST_CHANGE_PASSWORD;
  return expire ? StaffAccountState.MUST_CHANGE_PASSWORD : StaffAccountState.ACTIVE;
}
