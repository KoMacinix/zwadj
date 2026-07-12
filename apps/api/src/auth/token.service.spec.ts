import { TokenService } from "./token.service";

describe("TokenService (tokens opaques + SHA-256)", () => {
  const svc = new TokenService();

  it("génère 256 bits encodés base64url (43 caractères, sûrs en URL)", () => {
    const t = svc.generate();
    expect(t).toHaveLength(43);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/); // pas de +, /, = → utilisable dans un lien
  });

  it("génère des tokens uniques", () => {
    const seen = new Set(Array.from({ length: 200 }, () => svc.generate()));
    expect(seen.size).toBe(200);
  });

  it("hash SHA-256 hex : déterministe, 64 caractères, distinct par token", () => {
    const t1 = svc.generate();
    const t2 = svc.generate();
    expect(svc.hash(t1)).toBe(svc.hash(t1));
    expect(svc.hash(t1)).toMatch(/^[0-9a-f]{64}$/);
    expect(svc.hash(t1)).not.toBe(svc.hash(t2));
  });

  it("le hash ne révèle pas le token (stockage base sûr — colonnes tokenHash)", () => {
    const t = svc.generate();
    expect(svc.hash(t)).not.toContain(t.slice(0, 10));
  });
});
