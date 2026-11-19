// La TABLE DES CAPACITÉS du personnel — rang 56, L36-3a-2 (D354, R-2, cadrage D340 § 5.4, S-107, S-239). Une DONNÉE dans `@zwadj/types` (`capacité → rôle → niveau`) et une fonction pure `peut`. Changer la décision de la
// salle pilote (Q7) = changer UNE ligne de la table : ce spec est ce qui garantit que la table dit bien ce que le cadrage et la consigne disent.
//
// ⛔ CE QUI SE CONFRONTE À L'AUTORITÉ, JAMAIS À UNE LISTE RECOPIÉE DANS LE TEST : la table se relit contre le CADRAGE VERSÉ (`docs/preuves/D340/cadrage.md`, § 5.4 : ses onze lignes, ses trois états ✓ / « lecture
// seule » / « — »), pas contre une liste que ce fichier aurait tapée de mémoire. Un second oracle, indépendant, est la phrase de la consigne (§ 1 c) : l'employé « peut l'agenda, les demandes, les devis, les clients et
// les réservations ; il LIT la salle, les prix et les prestations sans les changer ; il ne touche ni au personnel ni au compte ».
// ⚠ UNE ASSERTION NATIVE (`toBe`, `toEqual`) : aucune requête de Testing Library, aucun matcher jest-dom (D352).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STAFF_CAPABILITIES, StaffCapability, StaffRole, peut } from "@zwadj/types";

const CADRAGE = join(process.cwd(), "..", "..", "docs", "preuves", "D340", "cadrage.md");

/** Les lignes de la table du cadrage § 5.4, parsées : `{ capacité → { EMPLOYEE: cellule } }`. Rend aussi le NOMBRE DE LIGNES lues (un zéro sur zéro ligne ne prouve rien, D290). */
function tableDuCadrage(): { lignes: number; employe: Record<string, string>; manager: Record<string, string> } {
  const texte = readFileSync(CADRAGE, "utf8").replace(/\r\n/g, "\n").split("\n");
  const debut = texte.findIndex((l) => l.startsWith("| capacité | MANAGER | EMPLOYEE | routes (M08) |"));
  expect(debut, "l'en-tête de la table du cadrage est introuvable").toBeGreaterThanOrEqual(0);
  const employe: Record<string, string> = {};
  const manager: Record<string, string> = {};
  let lignes = 0;
  for (const l of texte.slice(debut + 2)) {
    if (!l.startsWith("|")) break;
    const c = l.slice(1, -1).split("|").map((x) => x.trim());
    const nom = c[0]!.replace(/`/g, "");
    manager[nom] = c[1]!;
    employe[nom] = c[2]!;
    lignes += 1;
  }
  return { lignes, employe, manager };
}

describe("la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c)", () => {
  const cadrage = tableDuCadrage();

  it("le cadrage a bien ONZE lignes de capacités, et la table en a autant (aucune capacité en trop, aucune en moins)", () => {
    expect(cadrage.lignes).toBe(11);
    expect(Object.keys(STAFF_CAPABILITIES).sort()).toEqual(Object.keys(cadrage.employe).sort());
    expect(Object.values(StaffCapability).sort()).toEqual(Object.keys(cadrage.employe).sort());
  });

  it("⛔ pour CHAQUE ligne du cadrage : « ✓ » = lire et écrire, « lecture seule » = lire sans écrire, « — » = ni l'un ni l'autre ; le MANAGER est « ✓ » partout", () => {
    expect(Object.keys(cadrage.employe).length, "des lignes ont été lues").toBe(11);
    for (const [capacite, cellule] of Object.entries(cadrage.employe)) {
      const cap = capacite as StaffCapability;
      const attendu = cellule === "✓" ? { lire: true, ecrire: true } : cellule === "lecture seule" ? { lire: true, ecrire: false } : cellule === "—" ? { lire: false, ecrire: false } : null;
      expect(attendu, `cellule inconnue du cadrage pour ${capacite} : « ${cellule} »`).not.toBeNull();
      expect({ lire: peut(StaffRole.EMPLOYEE, cap, "read"), ecrire: peut(StaffRole.EMPLOYEE, cap, "write") }, `EMPLOYEE sur ${capacite}`).toEqual(attendu);
      expect(cadrage.manager[capacite], `MANAGER sur ${capacite} (cadrage)`).toBe("✓");
      expect({ lire: peut(StaffRole.MANAGER, cap, "read"), ecrire: peut(StaffRole.MANAGER, cap, "write") }, `MANAGER sur ${capacite}`).toEqual({ lire: true, ecrire: true });
    }
  });

  it("⛔ la phrase de la consigne (§ 1 c), second oracle INDÉPENDANT du cadrage : l'employé écrit sur l'agenda, les demandes, les devis, les clients, les réservations ; lit la salle, les prix, les prestations ; ne touche ni au personnel ni au compte", () => {
    const ecrit = ["agenda", "demandes", "devis", "clients", "reservations"] as const;
    const lit = ["salle", "prix", "prestations"] as const;
    const rien = ["personnel", "compte"] as const;
    for (const c of ecrit) expect([c, peut(StaffRole.EMPLOYEE, c, "write")], c).toEqual([c, true]);
    for (const c of lit) expect([c, peut(StaffRole.EMPLOYEE, c, "read"), peut(StaffRole.EMPLOYEE, c, "write")], c).toEqual([c, true, false]);
    for (const c of rien) expect([c, peut(StaffRole.EMPLOYEE, c, "read"), peut(StaffRole.EMPLOYEE, c, "write")], c).toEqual([c, false, false]);
  });

  it("les plages de VISITE (`visit-availabilities`) sont du côté « salle » : la ligne `salle` du cadrage les porte, et l'employé n'y écrit pas (défaut fermé, consigne § 1 c)", () => {
    const lignesBrutes = readFileSync(CADRAGE, "utf8").replace(/\r\n/g, "\n").split("\n").filter((l) => l.startsWith("| `salle` |"));
    expect(lignesBrutes.length).toBe(1);
    expect(lignesBrutes[0]).toContain("visit-availabilities");
    expect(peut(StaffRole.EMPLOYEE, StaffCapability.SALLE, "write")).toBe(false);
  });
});

describe("`peut(role, capacité, acte)` — S-239 : trois états par rôle ne tiennent pas dans deux arguments", () => {
  it("sans `acte`, `peut` répond à « peut-il UTILISER cette capacité » = écrire : la forme à deux arguments de la consigne vaut l'acte « write »", () => {
    expect(peut(StaffRole.EMPLOYEE, StaffCapability.AGENDA)).toBe(true);
    expect(peut(StaffRole.EMPLOYEE, StaffCapability.SALLE)).toBe(false);
    expect(peut(StaffRole.MANAGER, StaffCapability.PERSONNEL)).toBe(true);
    expect(peut(StaffRole.EMPLOYEE, StaffCapability.PERSONNEL)).toBe(false);
  });

  it("⛔ FERMÉ PAR DÉFAUT : une capacité INCONNUE (une faute de frappe dans une déclaration) est refusée en lecture comme en écriture, même au MANAGER — elle ne lève pas", () => {
    expect(peut(StaffRole.MANAGER, "inconnue" as never, "read")).toBe(false);
    expect(peut(StaffRole.MANAGER, "inconnue" as never, "write")).toBe(false);
    expect(peut(StaffRole.EMPLOYEE, "inconnue" as never)).toBe(false);
  });

  it("⛔ FERMÉ PAR DÉFAUT : un rôle INCONNU est refusé partout", () => {
    expect(peut("STAGIAIRE" as never, StaffCapability.AGENDA, "read")).toBe(false);
    expect(peut("STAGIAIRE" as never, StaffCapability.AGENDA, "write")).toBe(false);
  });

  it("la table est une DONNÉE figée : ni elle ni ses lignes ne se modifient à l'exécution (changer d'avis = changer le FICHIER, une ligne)", () => {
    expect(Object.isFrozen(STAFF_CAPABILITIES)).toBe(true);
    for (const ligne of Object.values(STAFF_CAPABILITIES)) expect(Object.isFrozen(ligne)).toBe(true);
  });
});
