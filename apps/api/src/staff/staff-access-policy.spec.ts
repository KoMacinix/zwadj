// LE VERDICT D'ACCÈS — rang 56, L36-3a-2 (D354, R-2, R-3, S-107, S-239, S-242). Ce que le quatrième garde global décide d'une session ADMISE : l'état du compte, le rôle du membre, la méthode HTTP et la capacité déclarée
// par la route. Un module PUR (D187) : il se rejoue en millisecondes et se neutralise à chaque passage.
//
// ⛔ LES CAS SONT ÉCRITS D'APRÈS LA CONSIGNE ET LE CADRAGE, pas d'après le code : l'employé « peut l'agenda… » ; « une route Pro sans déclaration : écritures au MANAGER seul, lectures à tous » (S-107) ; « la connexion
// n'ouvre que le changement de mot de passe (aucune autre route ne passe) » (R-3) ; un compte désactivé ou dont le temporaire a expiré n'a pas de session. Chaque cas est une assertion NATIVE (D352).
import { describe, expect, it } from "vitest";
import { StaffAccountState, StaffCapability, StaffRole } from "@zwadj/types";
import { accessVerdict, type AccessInput } from "./staff-access-policy";

const base: AccessInput = { state: StaffAccountState.ACTIVE, role: StaffRole.EMPLOYEE, method: "GET", capability: undefined, ownSession: false };
const v = (surcharge: Partial<AccessInput>) => accessVerdict({ ...base, ...surcharge });
const METHODES_ECRITURE = ["POST", "PATCH", "PUT", "DELETE"] as const;

describe("l'ÉTAT du compte passe avant tout (R-3)", () => {
  it("DÉSACTIVÉ ou TEMPORAIRE EXPIRÉ : refus de SESSION, pour tout rôle, toute méthode, toute capacité — même la route du membre lui-même", () => {
    for (const state of [StaffAccountState.DISABLED, StaffAccountState.TEMPORARY_EXPIRED]) {
      for (const role of [StaffRole.MANAGER, StaffRole.EMPLOYEE]) {
        for (const method of ["GET", "POST"]) {
          for (const ownSession of [false, true]) {
            expect(v({ state, role, method, ownSession, capability: StaffCapability.AGENDA }), `${state} ${role} ${method} own=${ownSession}`).toBe("refuseSession");
          }
        }
      }
    }
  });

  it("⛔ « MOT DE PASSE À CHANGER » : SEULE la route du membre sur sa propre session passe (changer son mot de passe, se déconnecter) ; TOUTE autre route est refusée — même une lecture, même au MANAGER, même sur une capacité déclarée", () => {
    for (const role of [StaffRole.MANAGER, StaffRole.EMPLOYEE]) {
      expect(v({ state: StaffAccountState.MUST_CHANGE_PASSWORD, role, method: "POST", ownSession: true }), `${role} sur sa propre session`).toBe("allow");
      for (const method of ["GET", "POST", "DELETE"]) {
        expect(v({ state: StaffAccountState.MUST_CHANGE_PASSWORD, role, method, capability: StaffCapability.AGENDA }), `${role} ${method} agenda`).toBe("refuseCapability");
        expect(v({ state: StaffAccountState.MUST_CHANGE_PASSWORD, role, method, capability: undefined }), `${role} ${method} sans déclaration`).toBe("refuseCapability");
      }
    }
  });
});

describe("un compte ACTIF : la route du membre sur sa propre session passe pour TOUT rôle (se déconnecter, changer son mot de passe)", () => {
  it("un employé ET un manager, en POST", () => {
    expect(v({ role: StaffRole.EMPLOYEE, method: "POST", ownSession: true })).toBe("allow");
    expect(v({ role: StaffRole.MANAGER, method: "POST", ownSession: true })).toBe("allow");
  });
});

describe("la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c)", () => {
  it("agenda, demandes, devis, clients, réservations : l'employé LIT et ÉCRIT", () => {
    for (const capability of [StaffCapability.AGENDA, StaffCapability.DEMANDES, StaffCapability.DEVIS, StaffCapability.CLIENTS, StaffCapability.RESERVATIONS]) {
      expect(v({ method: "GET", capability }), `GET ${capability}`).toBe("allow");
      for (const method of METHODES_ECRITURE) expect(v({ method, capability }), `${method} ${capability}`).toBe("allow");
    }
  });

  it("⛔ salle, prix, prestations : l'employé LIT (GET, HEAD, OPTIONS) et n'ÉCRIT pas (POST, PATCH, PUT, DELETE → refus de capacité)", () => {
    for (const capability of [StaffCapability.SALLE, StaffCapability.PRIX, StaffCapability.PRESTATIONS]) {
      for (const method of ["GET", "HEAD", "OPTIONS"]) expect(v({ method, capability }), `${method} ${capability}`).toBe("allow");
      for (const method of METHODES_ECRITURE) expect(v({ method, capability }), `${method} ${capability}`).toBe("refuseCapability");
    }
  });

  it("⛔ personnel, compte : l'employé ne LIT même pas — un GET est refusé comme un POST", () => {
    for (const capability of [StaffCapability.PERSONNEL, StaffCapability.COMPTE]) {
      for (const method of ["GET", ...METHODES_ECRITURE]) expect(v({ method, capability }), `${method} ${capability}`).toBe("refuseCapability");
    }
  });

  it("le MANAGER passe partout, en lecture comme en écriture", () => {
    for (const capability of Object.values(StaffCapability)) {
      for (const method of ["GET", "POST", "DELETE"]) expect(v({ role: StaffRole.MANAGER, method, capability }), `${method} ${capability}`).toBe("allow");
    }
  });

  it("la méthode se lit sans égard à la casse (« get » est une lecture) ; une méthode INCONNUE ou vide est une ÉCRITURE (fermé par défaut)", () => {
    expect(v({ method: "get", capability: StaffCapability.SALLE })).toBe("allow");
    expect(v({ method: "Delete", capability: StaffCapability.SALLE })).toBe("refuseCapability");
    expect(v({ method: "PROPFIND", capability: StaffCapability.SALLE })).toBe("refuseCapability");
    expect(v({ method: "", capability: StaffCapability.SALLE })).toBe("refuseCapability");
  });

  it("⛔ une capacité INCONNUE (faute de frappe d'une déclaration) est refusée même au MANAGER : fermé par défaut", () => {
    expect(v({ role: StaffRole.MANAGER, method: "GET", capability: "inconnue" as never })).toBe("refuseCapability");
  });
});

describe("S-107 — SANS déclaration : les écritures sont au MANAGER seul, les lectures sont à tous (une route oubliée est plus fermée, jamais plus ouverte)", () => {
  it("l'employé lit (GET, HEAD, OPTIONS) et n'écrit pas ; le manager lit et écrit", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) expect(v({ method }), `employé ${method}`).toBe("allow");
    for (const method of METHODES_ECRITURE) {
      expect(v({ method }), `employé ${method}`).toBe("refuseCapability");
      expect(v({ method, role: StaffRole.MANAGER }), `manager ${method}`).toBe("allow");
    }
  });
});
