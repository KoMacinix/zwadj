// Intégration — le VRAI hachage argon2id (m=64 MiB, t=3, p=4).
//
// POURQUOI ICI. Ces tests payaient le KDF réel dans la suite unitaire, où le budget
// est de 5 000 ms et où vitest parallélise ses fichiers. Mesuré sous charge : ils
// dépassaient ce budget et faisaient rougir la porte `test`. La décision de cadrage
// est de ne relever AUCUN délai et de ne toucher à AUCUN paramètre de coût — donc
// ce qui paie le KDF réel vient ici, où `vitest.config.int.ts` donne 30 000 ms ET
// `fileParallelism: false`.
//
// ⛔ CE N'EST PAS UNE IMMUNITÉ, ET IL FAUT LE LIRE COMME TEL. Cette suite tourne sur
// la même machine. Ce que le déplacement achète, c'est un budget six fois plus large
// et la disparition de la contention que vitest s'infligeait à lui-même ; la
// contention EXTERNE demeure entière. La vérification qui le mesure est décrite dans
// la section D270 de ZWADJ_CONTINUITE.md — les tests déplacés rejoués sous le même
// proxy de charge, état machine relevé avant chaque exécution.
//
// ⚠ Aucune base n'est touchée ici : ces tests n'exercent que le service de hachage.
// Ils vivent dans `test/int` pour le BUDGET et la SÉRIALISATION, pas pour PostgreSQL.
import { describe, expect, it } from "vitest";
import { PasswordService } from "../../src/auth/password.service";

describe("PasswordService — hachage argon2id réel (intégration)", () => {
  const svc = new PasswordService();

  it("vérifie le bon mot de passe et rejette le mauvais", async () => {
    const h = await svc.hash("Motdepasse1");
    expect(await svc.verify(h, "Motdepasse1")).toBe(true);
    expect(await svc.verify(h, "Motdepasse2")).toBe(false);
  });

  it("deux hashs du même mot de passe diffèrent (sel aléatoire)", async () => {
    const [a, b] = await Promise.all([svc.hash("Motdepasse1"), svc.hash("Motdepasse1")]);
    expect(a).not.toBe(b);
  });
});
