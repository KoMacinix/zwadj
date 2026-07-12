import { messages } from "@zwadj/i18n";
import { renderTemplate } from "./render";

describe("renderTemplate (emails)", () => {
  it("interpole les variables", () => {
    expect(renderTemplate("Lien : {link} ({ttlHours} h)", { link: "https://x", ttlHours: 48 })).toBe(
      "Lien : https://x (48 h)"
    );
  });

  it("lève une erreur si une variable manque — jamais d'email troué", () => {
    expect(() => renderTemplate("Lien : {link}", {})).toThrow(/variable manquante "link"/);
  });

  it("rend les emails de vérification FR et AR du namespace auth.emails", () => {
    for (const locale of ["fr", "ar"] as const) {
      const body = renderTemplate(messages[locale].auth.emails.verifyBody, {
        link: "https://app.zwadj.dz/fr/auth/verification-email?token=abc",
        ttlHours: 48
      });
      expect(body).toContain("https://app.zwadj.dz");
      expect(body).not.toMatch(/\{\w+\}/); // plus aucun placeholder
    }
  });
});
