// Le module PUR du journal des fiches client — rang 57 (D355, R-2). Il construit la ligne d'`audit_logs` d'une écriture de fiche ; l'ÉCRITURE est le travail des magasins, dans la transaction de l'écriture.
//
// ⛔ CE QUE CE SPEC TIENT (MP-33, « aucune donnée secrète » ; R-2, « pas de copie complète d'une fiche si les champs modifiés suffisent ») :
//   · la ligne dit QUI a touché QUELLE fiche, QUELS champs et QUAND — jamais la VALEUR d'un champ (ni numéro, ni e-mail, ni nom : même règle que D349 et S-81 de D339) ;
//   · la charge utile est FERMÉE : quatre noms de champ, un ordre fixe, `before` jamais écrit, `quoteId` pour la complétion par la boîte de langue d'un devis SEULEMENT ;
//   · `actor_member_id` est le membre quand une session de personnel existe, NULL sinon (l'acteur est alors le compte commun) ;
//   · une ligne sans champ, avec un champ inconnu ou répété est une erreur de PROGRAMMATION, bruyante : un journal qui se tairait sur ce qu'il n'a pas compris mentirait.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FICHE_AUDIT_ACTIONS, FICHE_CHAMPS, champsEcrits, ficheAuditEntry } from "./client-record-audit";

const FICHE = "018f0000-0000-7000-8000-0000000000f1";
const DEVIS = "018f0000-0000-7000-8000-0000000000d1";
const MEMBRE = "018f0000-0000-7000-8000-0000000000a1";
const UTILISATEUR = "018f0000-0000-7000-8000-0000000000c1";
const auteur = { userId: UTILISATEUR, memberId: MEMBRE } as const;
const sansMembre = { userId: UTILISATEUR, memberId: null } as const;

describe("champsEcrits — les NOMS des champs d'une écriture, jamais leurs valeurs", () => {
  it("rend les champs NON nuls dans l'ordre FIXE (phone, email, nameAr, nameLatin), quel que soit l'ordre des clés de l'objet reçu", () => {
    expect(champsEcrits({ nameLatin: "Amina", phone: "+213555123456" })).toEqual(["phone", "nameLatin"]);
    expect(champsEcrits({ nameLatin: "Amina", nameAr: "آمنة", email: "amina@example.dz", phone: "+213555123456" })).toEqual(["phone", "email", "nameAr", "nameLatin"]);
  });

  it("un champ ABSENT (`undefined`) ou NUL (`null`) n'est pas un champ écrit : K-2 reçoit `null` pour ce que la fiche n'a pas", () => {
    expect(champsEcrits({ phone: "+213555123456", email: null, nameAr: undefined, nameLatin: "Amina" })).toEqual(["phone", "nameLatin"]);
    expect(champsEcrits({})).toEqual([]);
    expect(champsEcrits({ phone: null, email: null, nameAr: null, nameLatin: null })).toEqual([]);
  });

  it("⛔ la sortie ne porte JAMAIS une valeur : un numéro, un e-mail et deux noms distinctifs n'y laissent aucune trace", () => {
    const sortie = JSON.stringify(champsEcrits({ phone: "+213555123456", email: "amina.bensalem@example.dz", nameAr: "آمنة بن سالم", nameLatin: "Amina Bensalem" }));
    expect(sortie).toBe('["phone","email","nameAr","nameLatin"]');
    for (const valeur of ["213555123456", "amina.bensalem", "example.dz", "آمنة", "Bensalem"]) expect(sortie, valeur).not.toContain(valeur);
  });

  it("la liste fermée est exactement celle de la table : quatre champs, dans cet ordre", () => {
    expect([...FICHE_CHAMPS]).toEqual(["phone", "email", "nameAr", "nameLatin"]);
  });
});

describe("ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche", () => {
  it("création : le compte commun ET le membre, l'action, l'entité, les champs — et RIEN d'autre (les clés sont exactement celles-ci)", () => {
    const entree = ficheAuditEntry({ auteur, action: "client_record.create", ficheId: FICHE, champs: ["phone", "nameLatin"] });
    expect(entree).toEqual({
      actorId: UTILISATEUR,
      actorRole: "PRO",
      actorMemberId: MEMBRE,
      action: "client_record.create",
      entityType: "client_record",
      entityId: FICHE,
      after: { fields: ["phone", "nameLatin"] }
    });
    expect(Object.keys(entree).sort()).toEqual(["action", "actorId", "actorMemberId", "actorRole", "after", "entityId", "entityType"]);
  });

  it("⛔ `before` n'est JAMAIS écrit : pas de copie de l'état d'avant (la valeur d'un champ est une donnée personnelle)", () => {
    for (const action of FICHE_AUDIT_ACTIONS) {
      const entree = ficheAuditEntry({ auteur, action, ficheId: FICHE, champs: ["email"] });
      expect("before" in entree, action).toBe(false);
    }
  });

  it("⛔ sans session de personnel (couche éteinte), `actorMemberId` vaut NULL — la clé est PRÉSENTE avec la valeur `null`, pas absente : l'acteur est alors le compte commun", () => {
    const entree = ficheAuditEntry({ auteur: sansMembre, action: "client_record.update", ficheId: FICHE, champs: ["phone"] });
    expect(entree.actorMemberId).toBeNull();
    expect(entree.actorId).toBe(UTILISATEUR);
    expect(Object.keys(entree)).toContain("actorMemberId");
  });

  it("l'ordre des champs est FIXE : l'ordre dans lequel l'appelant les donne ne change pas la ligne", () => {
    const a = ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: ["nameLatin", "phone", "nameAr"] });
    const b = ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: ["phone", "nameAr", "nameLatin"] });
    expect(a.after.fields).toEqual(["phone", "nameAr", "nameLatin"]);
    expect(a).toEqual(b);
  });

  it("⛔ `quoteId` — la complétion par la boîte de langue d'un devis (K-5) le porte ; il n'a pas d'autre place : une création ou une modification qui le reçoit est refusée", () => {
    const k5 = ficheAuditEntry({ auteur, action: "client_record.complete_names", ficheId: FICHE, champs: ["nameAr"], quoteId: DEVIS });
    expect(k5.after).toEqual({ fields: ["nameAr"], quoteId: DEVIS });
    const k3 = ficheAuditEntry({ auteur, action: "client_record.complete_names", ficheId: FICHE, champs: ["nameAr"] });
    expect(k3.after, "K-3 (complétion directe) ne porte pas de devis").toEqual({ fields: ["nameAr"] });
    expect("quoteId" in k3.after).toBe(false);
    for (const action of ["client_record.create", "client_record.update"] as const) {
      expect(() => ficheAuditEntry({ auteur, action, ficheId: FICHE, champs: ["phone"], quoteId: DEVIS }), action).toThrow();
    }
  });

  it("⛔ une ligne SANS champ, avec un champ INCONNU (un secret, un nom de colonne qui n'existe pas) ou RÉPÉTÉ est une erreur de programmation : elle LÈVE", () => {
    expect(() => ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: [] })).toThrow();
    expect(() => ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: ["password" as never] })).toThrow();
    expect(() => ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: ["linkedUserId" as never] })).toThrow();
    expect(() => ficheAuditEntry({ auteur, action: "client_record.update", ficheId: FICHE, champs: ["phone", "phone"] })).toThrow();
  });

  it("⛔ une action qui n'est pas l'une des trois est refusée : la liste des actions du journal est fermée", () => {
    expect([...FICHE_AUDIT_ACTIONS]).toEqual(["client_record.create", "client_record.update", "client_record.complete_names"]);
    expect(() => ficheAuditEntry({ auteur, action: "client_record.delete" as never, ficheId: FICHE, champs: ["phone"] })).toThrow();
  });

  it("⛔ l'entité est toujours `client_record` et le rôle toujours `PRO` : une fiche n'est écrite que par un pro", () => {
    for (const action of FICHE_AUDIT_ACTIONS) {
      const entree = ficheAuditEntry({ auteur, action, ficheId: FICHE, champs: ["phone"] });
      expect(entree.entityType, action).toBe("client_record");
      expect(entree.actorRole, action).toBe("PRO");
      expect(entree.entityId, action).toBe(FICHE);
    }
  });
});

describe("le module est PUR (D187) : aucune dépendance — ni Nest, ni Prisma, ni un autre module du dépôt", () => {
  it("la source ne contient aucun `import` ni aucun `require`, commentaires retirés", () => {
    const source = readFileSync(join(process.cwd(), "src/clients/client-record-audit.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
    expect(code.split("\n").length, "des lignes de code parcourues (un zéro sur zéro ligne ne prouve rien)").toBeGreaterThan(10);
    expect(/^\s*import\b/m.test(code)).toBe(false);
    expect(/\brequire\s*\(/.test(code)).toBe(false);
  });
});
