// L'ÉTAT DU COMPTE — rang 56, L36-3a-2 (D354, R-3, S-104, S-241). UNE copie de la règle, lue par le garde, par la connexion et par l'état (et, au lot 3b, par le PIN) : trois copies se désaccorderaient en silence.
// ⛔ D55 : les bornes se DÉRIVENT DES CAS RÉELS que la règle doit accepter, écrits AVANT l'implémentation — le mot de passe de 90 jours qui expire À L'INSTANT où l'on se connecte, le temporaire de 7 jours dont la
// dernière minute n'est pas encore passée, le membre désactivé dont le mot de passe vient d'être renouvelé. Si la règle en refuse un, c'est la règle qui a tort.
// ⚠ UNE ASSERTION NATIVE par cas : jamais une requête qui lève, jamais un matcher de bibliothèque (D352).
import { describe, expect, it } from "vitest";
import { StaffAccountState, StaffStatus } from "@zwadj/types";
import { etatDuCompte } from "./staff-account-state";

const MAINTENANT = new Date("2026-11-19T10:00:00.000Z");
const ms = (n: number): Date => new Date(MAINTENANT.getTime() + n);
const MINUTE = 60_000;
const JOUR = 24 * 60 * MINUTE;

const membre = (surcharge: Partial<{ status: StaffStatus; mustChangePassword: boolean; passwordExpiresAt: Date }>) => ({
  status: StaffStatus.ACTIVE,
  mustChangePassword: false,
  passwordExpiresAt: ms(90 * JOUR),
  ...surcharge
});

describe("etatDuCompte — un mot de passe ORDINAIRE (must_change_password faux)", () => {
  it("encore valable → ACTIVE", () => {
    expect(etatDuCompte(membre({ passwordExpiresAt: ms(1) }), MAINTENANT)).toBe(StaffAccountState.ACTIVE);
    expect(etatDuCompte(membre({ passwordExpiresAt: ms(90 * JOUR) }), MAINTENANT)).toBe(StaffAccountState.ACTIVE);
  });

  it("⛔ le cas RÉEL : il expire à l'instant exact où l'on se connecte — l'échéance est INCLUSE dans l'expiré (`<=`, comme `expires_at <= now()` du garde) → MUST_CHANGE_PASSWORD", () => {
    expect(etatDuCompte(membre({ passwordExpiresAt: ms(0) }), MAINTENANT)).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
  });

  it("expiré depuis une milliseconde, un jour, un an → MUST_CHANGE_PASSWORD : la connexion est ADMISE, vers le seul changement (S-104)", () => {
    for (const depuis of [1, JOUR, 365 * JOUR]) {
      expect(etatDuCompte(membre({ passwordExpiresAt: ms(-depuis) }), MAINTENANT), `expiré depuis ${depuis} ms`).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
    }
  });
});

describe("etatDuCompte — un mot de passe TEMPORAIRE (must_change_password vrai : le SEUL marqueur, aucune colonne « temporaire »)", () => {
  it("non expiré → MUST_CHANGE_PASSWORD (changement obligatoire, la connexion est admise)", () => {
    expect(etatDuCompte(membre({ mustChangePassword: true, passwordExpiresAt: ms(7 * JOUR) }), MAINTENANT)).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
  });

  it("⛔ le cas RÉEL : il lui reste UNE milliseconde → encore MUST_CHANGE_PASSWORD ; à l'instant exact de l'échéance → TEMPORARY_EXPIRED (refusé)", () => {
    expect(etatDuCompte(membre({ mustChangePassword: true, passwordExpiresAt: ms(1) }), MAINTENANT)).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
    expect(etatDuCompte(membre({ mustChangePassword: true, passwordExpiresAt: ms(0) }), MAINTENANT)).toBe(StaffAccountState.TEMPORARY_EXPIRED);
  });

  it("expiré depuis une milliseconde, sept jours, un an → TEMPORARY_EXPIRED : « le Manager doit en refaire un »", () => {
    for (const depuis of [1, 7 * JOUR, 365 * JOUR]) {
      expect(etatDuCompte(membre({ mustChangePassword: true, passwordExpiresAt: ms(-depuis) }), MAINTENANT), `expiré depuis ${depuis} ms`).toBe(StaffAccountState.TEMPORARY_EXPIRED);
    }
  });
});

describe("etatDuCompte — un membre DÉSACTIVÉ l'est quoi qu'il en soit du mot de passe", () => {
  it("désactivé : DISABLED, que le mot de passe soit valable, expiré, ordinaire ou temporaire", () => {
    for (const mustChangePassword of [false, true]) {
      for (const echeance of [ms(90 * JOUR), ms(0), ms(-JOUR)]) {
        expect(etatDuCompte(membre({ status: StaffStatus.DISABLED, mustChangePassword, passwordExpiresAt: echeance }), MAINTENANT), `must=${mustChangePassword} échéance=${echeance.toISOString()}`).toBe(
          StaffAccountState.DISABLED
        );
      }
    }
  });
});

describe("etatDuCompte — PURETÉ : le temps est un PARAMÈTRE (S-101, S-109), l'entrée n'est pas modifiée, la réponse ne dépend de rien d'autre", () => {
  it("la même échéance se juge AVANT, À et APRÈS `maintenant` : la fonction ne lit aucune horloge (une horloge cachée donnerait la même réponse trois fois)", () => {
    const echeance = ms(0);
    expect(etatDuCompte(membre({ passwordExpiresAt: echeance }), ms(-1))).toBe(StaffAccountState.ACTIVE);
    expect(etatDuCompte(membre({ passwordExpiresAt: echeance }), ms(0))).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
    expect(etatDuCompte(membre({ passwordExpiresAt: echeance }), ms(1))).toBe(StaffAccountState.MUST_CHANGE_PASSWORD);
  });

  it("une entrée GELÉE passe (la fonction ne l'écrit pas) et la valeur rendue est l'une des QUATRE constantes exportées", () => {
    const gele = Object.freeze({ status: StaffStatus.ACTIVE, mustChangePassword: false, passwordExpiresAt: ms(1) });
    const etat = etatDuCompte(gele, MAINTENANT);
    expect(Object.values(StaffAccountState).sort()).toEqual(["ACTIVE", "DISABLED", "MUST_CHANGE_PASSWORD", "TEMPORARY_EXPIRED"]);
    expect(Object.values(StaffAccountState)).toContain(etat);
  });
});
