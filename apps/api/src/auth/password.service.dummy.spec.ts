// Chemin anti-timing D5 — CHANGEMENT DE GARDE, PAS SUPPRESSION.
//
// Ces deux gardes remplaçaient une comparaison de DURÉES (« le factice coûte au
// moins un tiers d'un verify réel », « le second appel est plus rapide que le
// premier »). Une garde qui compare des durées cesse de mesurer ce qu'elle prétend
// dès que la machine bouge : les deux tests figuraient parmi ceux qui dépassaient
// 5 000 ms sous charge, et un `fileParallelism: false` aurait réduit le risque sans
// l'annuler.
//
// Ce qu'on PERD : la preuve par le chronomètre que le chemin n'est pas gratuit.
// Ce qu'on GAGNE : des gardes qui ne dépendent plus de la machine, donc qui
// mesurent encore quelque chose le jour où elle bouge.
// La propriété D5 reste couverte pour le CORPS de la réponse par login.int-spec.ts
// et google.int-spec.ts ; ici on garde le CHEMIN D'EXÉCUTION.
//
// ⚠ `vi.spyOn` sur l'objet de module est REFUSÉ (« Module namespace is not
// configurable in ESM ») — mesuré, pas supposé. D'où `vi.mock`, et d'où le fichier
// séparé : le bouchon est posé pour TOUT le fichier, il ne peut pas cohabiter avec
// le test qui exige un vrai argon2.
import * as argon2 from "argon2";
import { PasswordService } from "./password.service";

// ⚠ `argon2id` est une SENTINELLE, jamais la valeur réelle recopiée de mémoire :
// le service ne fait que la transmettre au bouchon, sa valeur n'a pas à être devinée.
vi.mock("argon2", () => ({
  argon2id: Symbol("argon2id"),
  hash: vi.fn(),
  verify: vi.fn()
}));

const hash = vi.mocked(argon2.hash);
const verify = vi.mocked(argon2.verify);
const HASH_FACTICE = "$argon2id$hash-factice-bouchonné";

describe("PasswordService.verifyAgainstDummy — chemin anti-timing (D5, Lot 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hash.mockResolvedValue(HASH_FACTICE);
    verify.mockResolvedValue(false);
  });

  it("exécute un vrai argon2.verify CONTRE LE HASH FACTICE (le chemin n'est pas gratuit)", async () => {
    const svc = new PasswordService();
    await svc.verifyAgainstDummy("Motdepasse1");
    expect(verify).toHaveBeenCalledWith(HASH_FACTICE, "Motdepasse1");
  });

  it("mémoïse le hash factice : deux invocations, UN seul argon2.hash, DEUX verify", async () => {
    const svc = new PasswordService();
    await svc.verifyAgainstDummy("premier");
    await svc.verifyAgainstDummy("second");
    expect(hash).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  // La comparaison est structurellement toujours fausse : la préimage est un CSPRNG
  // aussitôt oublié, jamais le mot de passe soumis (qui rendrait le factice vrai).
  it("la préimage du hash factice n'est PAS le mot de passe soumis", async () => {
    const svc = new PasswordService();
    await svc.verifyAgainstDummy("Motdepasse1");
    expect(hash.mock.calls[0]![0]).not.toBe("Motdepasse1");
  });

  it("retourne TOUJOURS false, quel que soit le mot de passe soumis", async () => {
    const svc = new PasswordService();
    expect(await svc.verifyAgainstDummy("Motdepasse1")).toBe(false);
    expect(await svc.verifyAgainstDummy("")).toBe(false);
    expect(await svc.verifyAgainstDummy("a".repeat(128))).toBe(false);
  });
});
