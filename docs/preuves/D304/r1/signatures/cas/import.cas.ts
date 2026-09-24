// D304 — cadrage de R1 : une erreur d'IMPORT. Rien ne tourne ; que dit vitest ?
import { inexistant } from "./module-qui-n-existe-pas";

it("CAS-IMPORT ce test ne devrait jamais être collecté", () => {
  expect(inexistant).toBe(1);
});
