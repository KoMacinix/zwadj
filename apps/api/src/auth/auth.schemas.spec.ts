// Tests des schémas Zod PARTAGÉS (@zwadj/types) — la frontière de validation
// utilisée par l'API (Lot 1+) et par les formulaires des deux fronts (Lots 5/6).
import {
  loginSchema,
  passwordSchema,
  registerClientSchema,
  registerProSchema,
  resetPasswordSchema
} from "@zwadj/types";

describe("Schémas Zod auth (@zwadj/types)", () => {
  describe("politique mot de passe (min 8, ≥1 lettre, ≥1 chiffre, max 128)", () => {
    it.each(["Motdepasse1", "abcdefg1", "1234567a", "mot de passe 9"])("accepte %s", (p) => {
      expect(passwordSchema.safeParse(p).success).toBe(true);
    });
    it.each([
      ["court1a", "auth.validation.passwordTooShort"],
      ["12345678", "auth.validation.passwordNeedsLetter"],
      ["abcdefgh", "auth.validation.passwordNeedsDigit"],
      ["a1".repeat(65), "auth.validation.passwordTooLong"]
    ])("rejette %s avec la clé i18n %s", (p, key) => {
      const r = passwordSchema.safeParse(p);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain(key);
    });
  });

  it("registerClient : normalise l'email (trim + minuscules) et défaute locale=fr", () => {
    const r = registerClientSchema.parse({ email: "  Aya@Example.DZ ", password: "Motdepasse1" });
    expect(r.email).toBe("aya@example.dz");
    expect(r.locale).toBe("fr");
  });

  it("registerClient : rejette un email invalide avec la clé i18n", () => {
    const r = registerClientSchema.safeParse({ email: "pas-un-email", password: "Motdepasse1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("auth.validation.emailInvalid");
  });

  it("registerPro (D3) : exige businessName et téléphone +213", () => {
    const ok = registerProSchema.safeParse({
      email: "salle@example.dz",
      password: "Motdepasse1",
      businessName: "Salle El Ryad",
      phone: "+213551234567",
      locale: "ar"
    });
    expect(ok.success).toBe(true);

    const koPhone = registerProSchema.safeParse({
      email: "salle@example.dz",
      password: "Motdepasse1",
      businessName: "Salle El Ryad",
      phone: "0551234567" // pas au format +213
    });
    expect(koPhone.success).toBe(false);

    const koName = registerProSchema.safeParse({
      email: "salle@example.dz",
      password: "Motdepasse1",
      phone: "+213551234567"
    });
    expect(koName.success).toBe(false);
  });

  it("login : n'applique PAS la politique de robustesse (mot de passe existant)", () => {
    expect(loginSchema.safeParse({ email: "a@b.dz", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.dz", password: "" }).success).toBe(false);
  });

  it("resetPassword : token requis + nouvelle politique appliquée", () => {
    expect(resetPasswordSchema.safeParse({ token: "t".repeat(43), password: "Motdepasse1" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "court", password: "Motdepasse1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "t".repeat(43), password: "faible" }).success).toBe(false);
  });
});
