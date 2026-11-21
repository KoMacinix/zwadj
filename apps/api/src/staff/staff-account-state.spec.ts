// L'ÉTAT DU COMPTE — rang 56, L36-3a-2 (D354, R-3, S-104, S-241). UNE copie de la règle, lue par le garde, par la connexion et par l'état (et, au lot 3b, par le PIN) : trois copies se désaccorderaient en silence.
// ⛔ D55 : les bornes se DÉRIVENT DES CAS RÉELS que la règle doit accepter, écrits AVANT l'implémentation — le mot de passe de 90 jours qui expire À L'INSTANT où l'on se connecte, le temporaire de 7 jours dont la
// dernière minute n'est pas encore passée, le membre désactivé dont le mot de passe vient d'être renouvelé. Si la règle en refuse un, c'est la règle qui a tort.
// ⚠ UNE ASSERTION NATIVE par cas : jamais une requête qui lève, jamais un matcher de bibliothèque (D352).
import { describe, expect, it } from "vitest";
import { STAFF_LIMITS, StaffAccountState, StaffPinState, StaffStatus } from "@zwadj/types";
import { etatDuCompte, etatDuPin } from "./staff-account-state";

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

// ══ RANG 58, L36-3b (D356, R-4) — l'ÉTAT DU PIN : la fonction JUMELLE de `etatDuCompte`, dans le même fichier. UNE copie de la règle « ce PIN peut-il servir ? », lue par la connexion par mot de passe (faut-il en
// générer un neuf ?), le changement de mot de passe et la connexion par PIN. ⛔ D55 : les bornes se dérivent des cas RÉELS, écrits avant l'implémentation — le PIN qui expire À L'INSTANT où l'on se connecte, le
// troisième échec qui a posé le verrou, le compte au plafond sans verrou (un arrêt entre la 3ᵉ réservation et l'écriture du verrou : l'état est « verrouillé » quand même).
const pin = (surcharge: Partial<{ hasPin: boolean; pinExpiresAt: Date | null; pinLockedAt: Date | null; pinFailedCount: number }>) => ({
  hasPin: true,
  pinExpiresAt: ms(90 * JOUR) as Date | null,
  pinLockedAt: null as Date | null,
  pinFailedCount: 0,
  ...surcharge
});

describe("etatDuPin — absent, valide, expiré, verrouillé", () => {
  it("⛔ aucun PIN (`pin_hash` nul) → ABSENT, quoi qu'il en soit des autres colonnes (elles sont nulles par la CHECK de la base)", () => {
    expect(etatDuPin(pin({ hasPin: false, pinExpiresAt: null }), MAINTENANT)).toBe(StaffPinState.ABSENT);
    expect(etatDuPin(pin({ hasPin: false, pinExpiresAt: ms(-JOUR) }), MAINTENANT)).toBe(StaffPinState.ABSENT);
  });

  it("⛔ un PIN valable, avec zéro, un ou deux échecs comptés (le plafond moins un) → VALID", () => {
    for (let echecs = 0; echecs < STAFF_LIMITS.PIN_MAX_FAILURES; echecs += 1) {
      expect(etatDuPin(pin({ pinFailedCount: echecs }), MAINTENANT), `${echecs} échec(s)`).toBe(StaffPinState.VALID);
    }
  });

  it("⛔ le cas RÉEL : il lui reste UNE milliseconde → VALID ; à l'instant exact de l'échéance → EXPIRED (l'échéance est INCLUSE dans l'expiré, comme `pin_expires_at <= now()`)", () => {
    expect(etatDuPin(pin({ pinExpiresAt: ms(1) }), MAINTENANT)).toBe(StaffPinState.VALID);
    expect(etatDuPin(pin({ pinExpiresAt: ms(0) }), MAINTENANT)).toBe(StaffPinState.EXPIRED);
  });

  it("expiré depuis une milliseconde, un jour, un an → EXPIRED", () => {
    for (const depuis of [1, JOUR, 365 * JOUR]) {
      expect(etatDuPin(pin({ pinExpiresAt: ms(-depuis) }), MAINTENANT), `expiré depuis ${depuis} ms`).toBe(StaffPinState.EXPIRED);
    }
  });

  it("⛔ le verrou posé (`pin_locked_at` non nul) → LOCKED, quel que soit le compte d'échecs", () => {
    for (const echecs of [0, 1, STAFF_LIMITS.PIN_MAX_FAILURES]) {
      expect(etatDuPin(pin({ pinLockedAt: ms(-MINUTE), pinFailedCount: echecs }), MAINTENANT), `${echecs} échec(s)`).toBe(StaffPinState.LOCKED);
    }
  });

  it("⛔ le compte au PLAFOND sans verrou (un arrêt entre la 3ᵉ réservation et l'écriture du verrou) → LOCKED : aucune autre réservation n'est possible, l'état le dit", () => {
    expect(etatDuPin(pin({ pinLockedAt: null, pinFailedCount: STAFF_LIMITS.PIN_MAX_FAILURES }), MAINTENANT)).toBe(StaffPinState.LOCKED);
  });

  it("⛔ le verrou l'emporte sur l'expiration : un PIN verrouillé ET expiré est LOCKED (c'est le déblocage qui se joue, et il écrit sa ligne de journal)", () => {
    expect(etatDuPin(pin({ pinLockedAt: ms(-MINUTE), pinExpiresAt: ms(-JOUR) }), MAINTENANT)).toBe(StaffPinState.LOCKED);
  });
});

describe("etatDuPin — PURETÉ : le temps est un PARAMÈTRE, l'entrée n'est pas modifiée", () => {
  it("la même échéance se juge AVANT, À et APRÈS `maintenant` : la fonction ne lit aucune horloge", () => {
    const echeance = ms(0);
    expect(etatDuPin(pin({ pinExpiresAt: echeance }), ms(-1))).toBe(StaffPinState.VALID);
    expect(etatDuPin(pin({ pinExpiresAt: echeance }), ms(0))).toBe(StaffPinState.EXPIRED);
    expect(etatDuPin(pin({ pinExpiresAt: echeance }), ms(1))).toBe(StaffPinState.EXPIRED);
  });

  it("une entrée GELÉE passe et la valeur rendue est l'une des QUATRE constantes exportées", () => {
    const gele = Object.freeze(pin({}));
    expect(Object.values(StaffPinState).sort()).toEqual(["ABSENT", "EXPIRED", "LOCKED", "VALID"]);
    expect(Object.values(StaffPinState)).toContain(etatDuPin(gele, MAINTENANT));
  });
});
