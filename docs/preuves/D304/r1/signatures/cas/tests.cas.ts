// D304 — cadrage de R1 : chaque façon qu'a un test TITRÉ d'échouer, dans un seul fichier,
// pour relever ce que vitest 3.2.7 en écrit. Aucun de ces tests ne teste le produit.
// Les titres portent un marqueur unique (CAS-…) pour qu'un extracteur ne les confonde pas.

it("CAS-PASSE un test vert", () => {
  expect(1).toBe(1);
});

it("CAS-ASSERTION une assertion en échec", () => {
  expect(201).toBe(409);
});

it("CAS-ASSERTION-OBJET une égalité profonde en échec", () => {
  expect({ statut: "ACCEPTED" }).toEqual({ statut: "DECLINED" });
});

it("CAS-REJECTS une promesse résolue là où un rejet est attendu", async () => {
  await expect(Promise.resolve(1)).rejects.toThrow();
});

it("CAS-PLANTAGE une TypeError levée par le code", () => {
  const ligne = undefined as unknown as { status: string };
  return ligne.status;
});

it("CAS-ERREUR une Error levée par le code (ex. un 500 propagé)", async () => {
  await Promise.reject(new Error("panne simulée"));
});

it(
  "CAS-DELAI un délai dépassé",
  async () => {
    await new Promise((r) => setTimeout(r, 1_000));
  },
  200
);
