import { AuthEmailsService } from "./auth-emails.service";

const config = {
  getOrThrow: (k: string) => ({ CLIENT_URL: "http://localhost:3000", PRO_URL: "http://localhost:5173" })[k]!
} as never;

describe("AuthEmailsService", () => {
  it("construit le lien CLIENT avec le préfixe de locale (/fr, /ar)", () => {
    const svc = new AuthEmailsService({ send: async () => {} }, config);
    expect(svc.verificationLink({ role: "CLIENT", locale: "fr" }, "T".repeat(43))).toBe(
      `http://localhost:3000/fr/auth/verification-email?token=${"T".repeat(43)}`
    );
    expect(svc.verificationLink({ role: "CLIENT", locale: "ar" }, "T".repeat(43))).toContain("/ar/auth/");
  });

  it("construit le lien PRO sans préfixe de locale (SPA)", () => {
    const svc = new AuthEmailsService({ send: async () => {} }, config);
    expect(svc.verificationLink({ role: "PRO", locale: "ar" }, "T".repeat(43))).toBe(
      `http://localhost:5173/auth/verification-email?token=${"T".repeat(43)}`
    );
  });

  it("envoie un email AR complet (sujet localisé, corps interpolé sans placeholder)", async () => {
    const sent: { subject: string; text: string; to: string }[] = [];
    const svc = new AuthEmailsService({ send: async (i) => void sent.push(i) }, config);
    await svc.sendVerificationEmail({ email: "salle@x.dz", role: "PRO", locale: "ar" }, "T".repeat(43));

    expect(sent[0]!.subject).toContain("زواج");
    expect(sent[0]!.text).toContain("http://localhost:5173/auth/verification-email?token=");
    expect(sent[0]!.text).not.toMatch(/\{\w+\}/);
  });
});
