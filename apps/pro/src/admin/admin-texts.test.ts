// ADM-2 (D350, rang 52, R-5, S-183, D-2) — les textes de l'administration vivent HORS de `packages/i18n`, en français seul (exemption écrite, bornée aux écrans `/admin`). Ce fichier mesure que
// CE QUE L'ÉCRAN PEUT RECEVOIR a un texte, et que la distinction entre un REFUS et une PANNE (MD-ADM-15, D217) est celle que l'API fait.
//
// L'AUTORITÉ est la liste des codes et des clés que l'API peut rendre : les enums de `@zwadj/types` et les messages des schémas Zod PARTAGÉS (jouées sur des entrées invalides) — jamais une liste
// recopiée dans ce test (D209). Un code qui entre un jour dans l'enum sans texte fait rougir ce fichier ; sans lui, l'écran afficherait un identifiant technique à l'admin.
import { describe, expect, it } from "vitest";
import { AccountErrorCode, VenueErrorCode, VenueModerationErrorCode, deletionDecisionSchema, venuePendingQuerySchema, venueRejectSchema } from "@zwadj/types";
import { ApiError, NetworkError } from "../lib/auth-client";
import { ADMIN_TEXTS, classifyAdminError, formatAdminDate, formatBps } from "./admin-texts";

/** Les codes que les trois écrans peuvent recevoir d'un appel qu'ils déclenchent : les deux codes de modération, les deux refus de la publication (`SLOT_TEMPLATE_REQUIRED`, 404), les deux de la file de suppression. */
const CODES_REÇUS = [
  ...Object.values(VenueModerationErrorCode),
  VenueErrorCode.SLOT_TEMPLATE_REQUIRED,
  VenueErrorCode.VENUE_NOT_FOUND,
  AccountErrorCode.DELETION_REQUEST_NOT_PENDING,
  AccountErrorCode.DELETION_REQUEST_NOT_FOUND
] as const;

/** Les clés de validation que les schémas partagés rendent : on joue chaque schéma sur des entrées invalides et on lit les `message` des issues. */
function clesDesSchemas(): string[] {
  const issues = [
    venueRejectSchema.safeParse({}),
    venueRejectSchema.safeParse({ reason: "" }),
    venueRejectSchema.safeParse({ reason: 3 }),
    venueRejectSchema.safeParse({ reason: "x".repeat(2000) }),
    venueRejectSchema.safeParse({ reason: "ok", intrus: 1 }),
    venuePendingQuerySchema.safeParse({ page: 0 }),
    venuePendingQuerySchema.safeParse({ pageSize: 500 }),
    venuePendingQuerySchema.safeParse({ page: "abc" }),
    venuePendingQuerySchema.safeParse({ inconnue: 1 }),
    deletionDecisionSchema.safeParse({ decisionNote: "x".repeat(2000) })
  ].flatMap((r) => (r.success ? [] : r.error.issues.map((i) => i.message)));
  return [...new Set(issues)];
}

describe("S-183 — chaque code et chaque clé que l'écran peut recevoir a un texte FRANÇAIS", () => {
  it("la liste des codes est non vide (D290 : zéro sur zéro n'est pas une mesure)", () => {
    expect(CODES_REÇUS.length).toBeGreaterThanOrEqual(6);
    expect(clesDesSchemas().length).toBeGreaterThanOrEqual(5);
  });

  for (const code of CODES_REÇUS) {
    it(`le code ${code} a un texte, non vide, qui n'est pas l'identifiant technique`, () => {
      const texte = (ADMIN_TEXTS.errors.codes as Record<string, string | undefined>)[code];
      expect(texte, code).toBeTypeOf("string");
      expect((texte ?? "").trim().length).toBeGreaterThan(10);
      expect(texte).not.toBe(code);
      expect(texte).not.toMatch(/[A-Z]{3,}_[A-Z_]{3,}/);
    });
  }

  it("chaque message d'un schéma partagé (clé `admin.validation.*` ou `account.validation.*`) a un texte", () => {
    for (const cle of clesDesSchemas()) {
      const texte = (ADMIN_TEXTS.errors.validation as Record<string, string | undefined>)[cle];
      expect(texte, cle).toBeTypeOf("string");
      expect((texte ?? "").trim().length, cle).toBeGreaterThan(5);
    }
  });

  it("les clés de validation PROPRES à l'écran (le motif d'un rejet de suppression) ont aussi leur texte", () => {
    expect(ADMIN_TEXTS.errors.validation["admin.validation.decisionNoteRequired"].trim().length).toBeGreaterThan(5);
  });
});

describe("MD-ADM-15 — un REFUS métier n'est pas une PANNE, et l'inverse non plus (D217)", () => {
  it("un code connu en 4xx : un REFUS, avec le texte du code", () => {
    for (const [statut, code] of [
      [409, "SLOT_TEMPLATE_REQUIRED"],
      [409, "VENUE_NOT_DRAFT"],
      [409, "VENUE_ALREADY_REJECTED"],
      [400, "DELETION_REQUEST_NOT_PENDING"],
      [404, "VENUE_NOT_FOUND"]
    ] as const) {
      const r = classifyAdminError(new ApiError(statut, code, undefined));
      expect(r.kind, code).toBe("refused");
      expect(r.text, code).toBe((ADMIN_TEXTS.errors.codes as Record<string, string>)[code]);
    }
  });

  it("un code INCONNU en 4xx : un refus au texte générique (jamais l'identifiant technique, jamais « panne »)", () => {
    const r = classifyAdminError(new ApiError(422, "CODE_QUI_N_EXISTE_PAS", undefined));
    expect(r.kind).toBe("refused");
    expect(r.text).toBe(ADMIN_TEXTS.errors.refusedGeneric);
  });

  it("401 et 403 : la SESSION ou les DROITS (l'API reste l'autorité), ni refus métier ni panne", () => {
    for (const statut of [401, 403]) {
      const r = classifyAdminError(new ApiError(statut, "FORBIDDEN", undefined));
      expect(r.kind, String(statut)).toBe("rights");
      expect(r.text, String(statut)).toBe(ADMIN_TEXTS.errors.rights);
    }
  });

  it("réseau coupé, 5xx, valeur levée qui n'est pas une erreur : l'issue est INCONNUE — jamais « refusé »", () => {
    for (const erreur of [new NetworkError(), new ApiError(500, "INTERNAL", undefined), new ApiError(502, "BAD_GATEWAY", undefined), "texte levé", undefined, null]) {
      const r = classifyAdminError(erreur);
      expect(r.kind, String(erreur)).toBe("unknown");
      expect(r.text, String(erreur)).toBe(ADMIN_TEXTS.errors.unknownOutcome);
    }
  });
});

describe("les formateurs partagés (une seule formule, D48)", () => {
  it("une date s'écrit à l'heure d'ALGER (UTC+1, sans heure d'été) : 23 h 30 UTC du 12 est déjà le 13", () => {
    expect(formatAdminDate("2026-11-12T23:30:00.000Z")).toContain("13");
    expect(formatAdminDate("2026-11-12T10:15:00.000Z")).toContain("12");
    expect(formatAdminDate("2026-11-12T10:15:00.000Z")).toContain("2026");
  });

  it("l'heure, quand elle est écrite, est en 24 h (D57) — jamais AM/PM", () => {
    expect(formatAdminDate("2026-11-12T14:05:00.000Z")).not.toMatch(/am|pm/i);
  });

  it("un taux en points de base s'écrit en pour cent, avec ses décimales significatives, et deux taux différents s'écrivent différemment", () => {
    expect(formatBps(250)).not.toBe(formatBps(125));
    expect(formatBps(250)).toContain("%");
    expect(formatBps(250)).toMatch(/2[.,]5/);
    expect(formatBps(125)).toMatch(/1[.,]25/);
    expect(formatBps(0)).toMatch(/^0\s?%$/);
    expect(formatBps(500)).toMatch(/^5\s?%$/);
    expect(formatBps(250)).not.toContain("NaN");
  });
});
