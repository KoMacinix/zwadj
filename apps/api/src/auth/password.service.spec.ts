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

describe("PasswordService.verifyAgainstDummy (anti-timing D5, Lot 2)", () => {
  it("retourne TOUJOURS false, quel que soit le mot de passe soumis", async () => {
    const svc = new PasswordService();
    expect(await svc.verifyAgainstDummy("Motdepasse1")).toBe(false);
    expect(await svc.verifyAgainstDummy("")).toBe(false);
    expect(await svc.verifyAgainstDummy("a".repeat(128))).toBe(false);
  });

  it("paie un vrai coût argon2 (comparable à un verify réel — c'est tout l'intérêt)", async () => {
    const svc = new PasswordService();
    const realHash = await svc.hash("Motdepasse1");
    await svc.verifyAgainstDummy("préchauffe"); // le hash factice se crée au 1er appel

    const t0 = performance.now();
    await svc.verify(realHash, "Motdepasse1");
    const realMs = performance.now() - t0;

    const t1 = performance.now();
    await svc.verifyAgainstDummy("Motdepasse1");
    const dummyMs = performance.now() - t1;

    // Pas d'égalité stricte (machine/charge variables) : on exige seulement que
    // le factice ne soit pas « gratuit » — au moins un tiers du coût réel.
    expect(dummyMs).toBeGreaterThan(realMs / 3);
  });

  it("mémoïse le hash factice : les appels suivants ne repaient pas argon2.hash", async () => {
    const svc = new PasswordService();
    const t0 = performance.now();
    await svc.verifyAgainstDummy("premier"); // hash (≈2× verify) + verify
    const firstMs = performance.now() - t0;

    const t1 = performance.now();
    await svc.verifyAgainstDummy("second"); // verify seul
    const secondMs = performance.now() - t1;

    expect(secondMs).toBeLessThan(firstMs); // grossier mais suffisant : pas de re-hash complet
  });
});
