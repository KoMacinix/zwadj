// Spec du schéma Zod de la demande de rendez-vous (Lot C3, D61) — messages =
// CLÉS i18n, contrat des fronts.
//
// ⚠ Ce qui se joue ici : `startMinutes` est borné à la JOURNÉE (0–1439), PAS à
// « 1440 − 30 ». Savoir si un créneau EXISTE appartient au découpage des plages
// (`computeVisitSlots`), et une borne ne se valide jamais deux fois (D55). Un
// schéma qui refuserait 1420 refuserait aussi le seul cas qui compte : celui que
// le pro a réellement déclaré.
import { describe, expect, it } from "vitest";
import { visitBookingCreateSchema } from "@zwadj/types";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  return result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);
}

const valid = { date: "2027-08-15", startMinutes: 560 };

describe("visitBookingCreateSchema — D61", () => {
  it("date + minutes suffisent : le téléphone est OPTIONNEL (décision de Ko)", () => {
    expect(visitBookingCreateSchema.safeParse(valid).success).toBe(true);
    expect(visitBookingCreateSchema.safeParse({ ...valid, phone: "+213550000009" }).success).toBe(true);
  });

  it("date de FORME juste mais IRRÉELLE (2027-02-31) → dateFormat", () => {
    expect(messages(visitBookingCreateSchema.safeParse({ ...valid, date: "2027-02-31" }))).toContain(
      "venue.validation.dateFormat"
    );
  });

  it("un instant ISO offsetté est REFUSÉ : le fuseau ne se négocie pas à l'entrée (D48)", () => {
    expect(messages(visitBookingCreateSchema.safeParse({ ...valid, date: "2027-08-15T09:20:00+01:00" }))).toContain(
      "venue.validation.dateFormat"
    );
  });

  it("minutes hors journée → visitOutOfDay ; 1439 passe, 1440 non", () => {
    expect(visitBookingCreateSchema.safeParse({ ...valid, startMinutes: 1439 }).success).toBe(true);
    expect(messages(visitBookingCreateSchema.safeParse({ ...valid, startMinutes: 1440 }))).toContain(
      "venue.validation.visitOutOfDay"
    );
    expect(messages(visitBookingCreateSchema.safeParse({ ...valid, startMinutes: -1 }))).toContain(
      "venue.validation.visitOutOfDay"
    );
  });

  it("minutes NON multiples de 30 acceptées : une plage 09:20→10:20 rend 09:20 et 09:50 (D55)", () => {
    expect(visitBookingCreateSchema.safeParse({ ...valid, startMinutes: 560 }).success).toBe(true);
    expect(visitBookingCreateSchema.safeParse({ ...valid, startMinutes: 590 }).success).toBe(true);
  });

  it("téléphone non joignable → phoneInvalid ; clé inconnue refusée (.strict)", () => {
    // ⚠ `0550000009` n'est PLUS un cas d'erreur (R3) : c'est la saisie locale,
    // normalisée en `+213550000009`. Le fixe, lui, reste refusé.
    const local = visitBookingCreateSchema.safeParse({ ...valid, phone: "0550000009" });
    expect(local.success).toBe(true);
    if (local.success) expect(local.data.phone).toBe("+213550000009");

    expect(messages(visitBookingCreateSchema.safeParse({ ...valid, phone: "021234567" }))).toContain(
      "auth.validation.phoneInvalid"
    );
    expect(visitBookingCreateSchema.safeParse({ ...valid, note: "4 personnes" }).success).toBe(false);
  });
});
