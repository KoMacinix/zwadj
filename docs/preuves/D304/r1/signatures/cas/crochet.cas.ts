// D304 — cadrage de R1 : un CROCHET qui lève (ex. `createTestApp` qui ne démarre plus sous une
// mutation). Les tests sont collectés ; aucun n'exécute son corps.
beforeAll(() => {
  throw new Error("crochet en panne");
});

it("CAS-CROCHET le corps de ce test ne s'exécute pas", () => {
  expect(1).toBe(2);
});
