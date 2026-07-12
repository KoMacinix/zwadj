import { PasswordService } from "./password.service";

describe("PasswordService (argon2id)", () => {
  const svc = new PasswordService();

  it("produit un hash argon2id différent du mot de passe", async () => {
    const h = await svc.hash("Motdepasse1");
    expect(h).not.toContain("Motdepasse1");
    expect(h.startsWith("$argon2id$")).toBe(true);
  });

  it("vérifie le bon mot de passe et rejette le mauvais", async () => {
    const h = await svc.hash("Motdepasse1");
    expect(await svc.verify(h, "Motdepasse1")).toBe(true);
    expect(await svc.verify(h, "Motdepasse2")).toBe(false);
  });

  it("deux hashs du même mot de passe diffèrent (sel aléatoire)", async () => {
    const [a, b] = await Promise.all([svc.hash("Motdepasse1"), svc.hash("Motdepasse1")]);
    expect(a).not.toBe(b);
  });

  it("retourne false (sans lever) sur un hash malformé", async () => {
    expect(await svc.verify("pas-un-hash", "peu-importe")).toBe(false);
    expect(await svc.verify("", "peu-importe")).toBe(false);
  });
});
