// Unitaire — ce fichier est le SEUL de la suite unitaire à payer un vrai argon2,
// et c'est un ÉCART ASSUMÉ (MD7) : une régression de configuration du hachage doit
// se voir tout de suite, pas à la porte lourde. Sur une surface d'authentification,
// « plus tard » est le défaut.
//
// Ce qui payait le KDF réel sans rien apprendre de plus est parti dans
// test/int/password-hashing.int-spec.ts (budget 30 s, `fileParallelism: false`).
// Les gardes du chemin anti-timing D5 vivent dans password.service.dummy.spec.ts,
// qui bouchonne argon2 : elles n'ont plus besoin ni d'horloge ni de KDF.
//
// ⚠ RÉSIDUEL DÉCLARÉ : le test de préfixe ci-dessous coûte ~80 ms au repos et reste
// donc capable de dépasser les 5 000 ms sous une charge extrême — celle où la porte
// entière rendait déjà des grappes d'échecs. Le lot fait passer l'exposition de
// CINQ tests à UN ; il ne la supprime pas. Le traitement de ce résiduel appartient
// au lot sharp, qui prend la contention de la porte unitaire dans son ensemble.
import { PasswordService } from "./password.service";

describe("PasswordService (argon2id)", () => {
  const svc = new PasswordService();

  it("produit un hash argon2id différent du mot de passe", async () => {
    const h = await svc.hash("Motdepasse1");
    expect(h).not.toContain("Motdepasse1");
    expect(h.startsWith("$argon2id$")).toBe(true);
  });

  // Ne paie AUCUN KDF : argon2 rejette la chaîne avant tout calcul (mesuré 0 ms).
  // Il reste donc unitaire pour une raison différente du précédent.
  it("retourne false (sans lever) sur un hash malformé", async () => {
    expect(await svc.verify("pas-un-hash", "peu-importe")).toBe(false);
    expect(await svc.verify("", "peu-importe")).toBe(false);
  });
});
