// Les DÉCISIONS PURES de la couche du personnel — rang 44, L36-3a-1 (D341). Une garde du chemin d'identité vit dans un module sans dépendance (D187) : elle se rejoue en millisecondes, sans base,
// et se NEUTRALISE à chaque passage. Le service et l'adaptateur ne font que lire, appeler et écrire ; ce qu'ils DÉCIDENT est ici.
//
// Quatre décisions : (1) le quatrième garde global laisse passer ou exige une session (MP-20, MP-34, MP-35) ; (2) pourquoi une session est refusée, et si ce refus s'écrit (MP-4, MP-13, MP-18, MP-19) ;
// (3) la connexion paie-t-elle le VRAI hachage ou le factice (MP-8, MP-17, R-3 (D341)) ; (4) quel appareil reconnu est réutilisable (MP-3).
import { describe, expect, it } from "vitest";
import { StaffSessionEndReason } from "@zwadj/types";
import { classifySessionRefusal, guardVerdict, loginVerification, pickReusableDevice, type DeviceRow, type SessionProbe } from "./staff-session-policy";

describe("guardVerdict — le quatrième garde global, FERMÉ PAR DÉFAUT (S-98)", () => {
  const base = { role: "PRO", exempt: false, layerEnabled: true } as const;

  it("⛔ MP-20 — un PRO, sur une route non exemptée, la couche activée : une SESSION est exigée", () => {
    expect(guardVerdict(base)).toBe("requireSession");
  });

  it("⛔ MP-35 — la couche ÉTEINTE : le garde laisse passer (l'app Pro marche comme avant l'activation)", () => {
    expect(guardVerdict({ ...base, layerEnabled: false })).toBe("pass");
  });

  it("une route déclarée `@StaffExempt()` passe, la couche activée ou non (activer, se connecter, l'état de session)", () => {
    expect(guardVerdict({ ...base, exempt: true })).toBe("pass");
    expect(guardVerdict({ ...base, exempt: true, layerEnabled: false })).toBe("pass");
  });

  it("⛔ MP-34 — ni un CLIENT ni un ADMIN ne sont jamais concernés, même couche activée et route non exemptée", () => {
    expect(guardVerdict({ ...base, role: "CLIENT" })).toBe("pass");
    expect(guardVerdict({ ...base, role: "ADMIN" })).toBe("pass");
  });

  it("une requête sans rôle (route publique, identité absente) passe : ce garde n'authentifie rien, il COMPLÈTE le Bearer", () => {
    expect(guardVerdict({ ...base, role: undefined })).toBe("pass");
  });

  it("la table complète : seul le croisement (PRO, non exempté, couche activée) exige une session — sur les 16 combinaisons de quatre rôles × deux drapeaux × deux drapeaux", () => {
    let exigees = 0;
    for (const role of ["PRO", "CLIENT", "ADMIN", undefined] as const) {
      for (const exempt of [false, true]) {
        for (const layerEnabled of [false, true]) {
          const v = guardVerdict({ role, exempt, layerEnabled });
          if (v === "requireSession") {
            exigees += 1;
            expect({ role, exempt, layerEnabled }).toEqual({ role: "PRO", exempt: false, layerEnabled: true });
          }
        }
      }
    }
    expect(exigees).toBe(1);
  });
});

describe("classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit", () => {
  const vivante: SessionProbe = { found: true, sameVenue: true, ended: false, memberActive: true, capped: false, idle: false };
  const refus = (surcharge: Partial<SessionProbe>) => classifySessionRefusal({ ...vivante, ...surcharge });

  it("un jeton inconnu : `absent`, rien à écrire", () => {
    expect(refus({ found: false })).toEqual({ reason: "absent", endWith: null });
  });

  it("⛔ MP-18 — la session d'une AUTRE salle : `foreign`, et surtout RIEN n'est écrit (on ne termine pas la session d'autrui parce qu'un cookie a été présenté avec le mauvais Bearer)", () => {
    expect(refus({ sameVenue: false })).toEqual({ reason: "foreign", endWith: null });
  });

  it("⛔ MP-19 — une session déjà terminée (déconnexion, désactivation, changement de mot de passe) : `ended`, rien à écrire de plus", () => {
    expect(refus({ ended: true })).toEqual({ reason: "ended", endWith: null });
  });

  it("⛔ MP-4 — le membre est DÉSACTIVÉ alors que la session est ouverte : `disabled`, et la fin DISABLED s'écrit", () => {
    expect(refus({ memberActive: false })).toEqual({ reason: "disabled", endWith: StaffSessionEndReason.DISABLED });
  });

  it("⛔ MP-13 — inactive depuis plus de la durée d'inactivité : `idle`, et la fin IDLE s'écrit", () => {
    expect(refus({ idle: true })).toEqual({ reason: "idle", endWith: StaffSessionEndReason.IDLE });
  });

  it("⛔ MP-13 — le PLAFOND absolu atteint : `capped`, et RIEN ne s'écrit (l'énumération des fins n'a pas de valeur « plafond » : le schéma est ratifié, pas étendu)", () => {
    expect(refus({ capped: true })).toEqual({ reason: "capped", endWith: null });
  });

  it("l'ordre des causes (la plus précise d'abord) : une autre salle l'emporte sur tout ; déjà terminée sur désactivée ; désactivée sur plafond ; plafond sur inactivité", () => {
    expect(refus({ sameVenue: false, ended: true, memberActive: false, capped: true, idle: true }).reason).toBe("foreign");
    expect(refus({ ended: true, memberActive: false, capped: true, idle: true }).reason).toBe("ended");
    expect(refus({ memberActive: false, capped: true, idle: true }).reason).toBe("disabled");
    expect(refus({ capped: true, idle: true }).reason).toBe("capped");
    expect(refus({ idle: true }).reason).toBe("idle");
  });

  it("une session vivante n'a pas de refus : l'appelant ne doit pas classer une session qu'il vient d'accepter (le lève, il ne l'invente pas)", () => {
    expect(() => classifySessionRefusal(vivante)).toThrow();
  });
});

describe("loginVerification — le VRAI hachage ou le FACTICE (D5, R-3 (D341), MP-8, MP-17)", () => {
  it("le vrai hachage UNIQUEMENT quand le membre existe, est actif ET que la tentative a été RÉSERVÉE", () => {
    expect(loginVerification({ memberFound: true, memberActive: true, reserved: true })).toBe("real");
  });

  it("⛔ compte inconnu : le factice (même coût, même réponse)", () => {
    expect(loginVerification({ memberFound: false, memberActive: false, reserved: false })).toBe("dummy");
  });

  it("⛔ membre désactivé : le factice — un membre désactivé est un compte inconnu pour la connexion", () => {
    expect(loginVerification({ memberFound: true, memberActive: false, reserved: false })).toBe("dummy");
  });

  it("⛔ R-3 (D341) — PAUSE : la réservation a été refusée, donc le factice — la requête paie le même coût qu'un mauvais mot de passe, et le VRAI hachage n'est pas vérifié", () => {
    expect(loginVerification({ memberFound: true, memberActive: true, reserved: false })).toBe("dummy");
  });

  it("la table complète des huit combinaisons : le vrai hachage dans une seule", () => {
    let reels = 0;
    for (const memberFound of [false, true]) {
      for (const memberActive of [false, true]) {
        for (const reserved of [false, true]) {
          if (loginVerification({ memberFound, memberActive, reserved }) === "real") reels += 1;
        }
      }
    }
    expect(reels).toBe(1);
  });
});

describe("pickReusableDevice — MP-3 : l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est jamais réutilisé", () => {
  const MOI = "018f0000-0000-7000-8000-0000000000a1";
  const SALLE = "018f0000-0000-7000-8000-0000000000b1";
  const appareil = (surcharge: Partial<DeviceRow> = {}): DeviceRow => ({ id: "d1", memberId: MOI, proProfileId: SALLE, revoked: false, expired: false, ...surcharge });

  it("rend l'appareil reconnu de CE membre dans CETTE salle", () => {
    const d = appareil();
    expect(pickReusableDevice([d], MOI, SALLE)).toBe(d);
  });

  it("⛔ l'appareil d'un autre MEMBRE de la même salle n'est pas réutilisé (le PIN ne se prête pas d'un membre à l'autre)", () => {
    expect(pickReusableDevice([appareil({ memberId: "autre" })], MOI, SALLE)).toBeNull();
  });

  it("⛔ l'appareil d'une autre SALLE n'est pas réutilisé, même pour le même identifiant de membre", () => {
    expect(pickReusableDevice([appareil({ proProfileId: "autre-salle" })], MOI, SALLE)).toBeNull();
  });

  it("un appareil révoqué ou expiré n'est pas réutilisé", () => {
    expect(pickReusableDevice([appareil({ revoked: true })], MOI, SALLE)).toBeNull();
    expect(pickReusableDevice([appareil({ expired: true })], MOI, SALLE)).toBeNull();
  });

  it("parmi plusieurs, rend le PREMIER qui convient (l'ordre de lecture des cookies) et saute ceux qui ne conviennent pas", () => {
    const bon = appareil({ id: "bon" });
    expect(pickReusableDevice([appareil({ id: "x", memberId: "autre" }), appareil({ id: "y", revoked: true }), bon, appareil({ id: "z" })], MOI, SALLE)).toBe(bon);
  });

  it("aucun appareil ⇒ null (le service en créera un)", () => {
    expect(pickReusableDevice([], MOI, SALLE)).toBeNull();
  });
});
