// « JAMAIS ZÉRO MANAGER » — la DÉCISION, rang 56, L36-3a-2 (D354, R-4, MP-6, MP-31). Un module PUR : la décision se prend sur ce que le magasin a LU SOUS VERROU (le membre visé, le nombre de Managers actifs) ; elle se
// neutralise en millisecondes. La course, elle, se mesure sur PostgreSQL réel (`test/int/staff-last-manager.int-spec.ts`).
// ⛔ Les cas sont écrits d'après le cadrage et DR5 (« jamais zéro Manager actif »), y compris le cas qui n'est pas une course : le dernier Manager qui se désactive LUI-MÊME.
import { describe, expect, it } from "vitest";
import { StaffRole, StaffStatus } from "@zwadj/types";
import { disableVerdict } from "./staff-members-policy";

const v = (targetRole: StaffRole, targetStatus: StaffStatus, activeManagers: number) => disableVerdict({ targetRole, targetStatus, activeManagers });

describe("disableVerdict — désactiver un MANAGER", () => {
  it("⛔ le DERNIER Manager actif (un seul) ne se désactive pas — que ce soit par un autre ou par lui-même : « lastManager »", () => {
    expect(v(StaffRole.MANAGER, StaffStatus.ACTIVE, 1)).toBe("lastManager");
  });

  it("deux Managers actifs ou plus : la désactivation de l'un d'eux est permise", () => {
    expect(v(StaffRole.MANAGER, StaffStatus.ACTIVE, 2)).toBe("disable");
    expect(v(StaffRole.MANAGER, StaffStatus.ACTIVE, 3)).toBe("disable");
  });

  it("⛔ fermé par défaut : un compte de Managers actifs incohérent (zéro alors que la cible est un Manager actif) refuse aussi — on ne désactive pas sur une donnée qu'on ne comprend pas", () => {
    expect(v(StaffRole.MANAGER, StaffStatus.ACTIVE, 0)).toBe("lastManager");
  });
});

describe("disableVerdict — désactiver un EMPLOYÉ ou ce qui l'est déjà", () => {
  it("un EMPLOYÉ n'est JAMAIS bloqué par la règle (il ne compte pas dans les Managers), quel que soit le nombre de Managers", () => {
    for (const n of [0, 1, 2]) expect(v(StaffRole.EMPLOYEE, StaffStatus.ACTIVE, n), `${n} Manager(s) actif(s)`).toBe("disable");
  });

  it("un membre DÉJÀ désactivé : « alreadyDisabled » — une répétition n'est ni une erreur ni une écriture (patron de D349) — même pour un Manager, même seul", () => {
    for (const role of [StaffRole.MANAGER, StaffRole.EMPLOYEE]) {
      for (const n of [0, 1, 2]) expect(v(role, StaffStatus.DISABLED, n), `${role} ${n}`).toBe("alreadyDisabled");
    }
  });
});
