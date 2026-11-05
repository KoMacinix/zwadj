// La POLITIQUE DE MOT DE PASSE du personnel — rang 44, L36-3a-1 (D341, MP-24, S-111, R-5 (D341)). DR5 : « passwordSchema actuel + refus des plus courants + refus de réutiliser le précédent ».
// Rien au-delà (R-5 (D341) : « aucune règle de mot de passe au-delà de DR5 »).
//
// ⛔ LA LISTE EST UNE DONNÉE VERSÉE, ELLE SE CONFRONTE À SA SOURCE : le module `staff-common-passwords.ts` est GÉNÉRÉ ; ce test relit le fichier source versé (octet pour octet), recalcule son empreinte,
// et la confronte à celle que la TABLE D'OUVERTURE écrit (R-5 : « source, licence et sha256 écrits dans la table »). Un module qui dérive de sa source, ou une table qui dérive du module, rougit ici.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { passwordSchema } from "@zwadj/types";
import { STAFF_COMMON_PASSWORDS, STAFF_COMMON_PASSWORDS_SOURCE } from "./staff-common-passwords";
import { COMMON_PASSWORDS, isCommonPassword, passwordViolation } from "./staff-password-policy";

// cwd Vitest = apps/api — chemin stable vers la racine du dépôt.
const RACINE = join(process.cwd(), "..", "..");
const DOSSIER_LISTE = join(RACINE, "docs", "preuves", "D341", "liste-mots-de-passe");
const SOURCE = readFileSync(join(DOSSIER_LISTE, "10k-most-common.txt"));
const LICENCE = readFileSync(join(DOSSIER_LISTE, "LICENSE-SecLists-MIT.txt"), "utf8");
const TABLE = readFileSync(join(RACINE, "docs", "preuves", "D341", "table-ouverture.md"), "utf8");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

describe("isCommonPassword — la comparaison se fait APRÈS mise en minuscules (R-5 (D341))", () => {
  // La valeur d'exemple est DÉRIVÉE de la liste : la première entrée qui passe déjà `passwordSchema` (sinon l'exemple serait refusé avant la liste et ne la mesurerait pas).
  const exemple = STAFF_COMMON_PASSWORDS.find((p) => passwordSchema.safeParse(p).success);

  it("⛔ R-5 — la liste est mise en minuscules à la CONSTRUCTION, pas seulement le candidat : la source versée n'a aucune majuscule AUJOURD'HUI (mesuré : 0 entrée sur 10 001), donc seule une source de remplacement le montre", async () => {
    vi.resetModules();
    vi.doMock("./staff-common-passwords", () => ({ STAFF_COMMON_PASSWORDS: ["Motdepasse1", "ABC12345"], STAFF_COMMON_PASSWORDS_SOURCE: {} }));
    try {
      const politique = await import("./staff-password-policy");
      expect(politique.isCommonPassword("motdepasse1")).toBe(true);
      expect(politique.isCommonPassword("MOTDEPASSE1")).toBe(true);
      expect(politique.isCommonPassword("abc12345")).toBe(true);
      expect(politique.isCommonPassword("Motdepasse2")).toBe(false);
    } finally {
      vi.doUnmock("./staff-common-passwords");
      vi.resetModules();
    }
  });

  it("la liste contient au moins une entrée que le schéma actuel laisse passer (sinon la politique n'ajouterait RIEN à passwordSchema)", () => {
    expect(exemple, "aucune entrée de la liste ne passe passwordSchema").toBeDefined();
  });

  it("un mot de passe de la liste est refusé, tel quel", () => {
    expect(isCommonPassword(exemple!)).toBe(true);
  });

  it("⛔ R-5 (D341) — refusé AUSSI en majuscules et en casse mêlée : la comparaison est faite après mise en minuscules", () => {
    expect(isCommonPassword(exemple!.toUpperCase())).toBe(true);
    expect(isCommonPassword(exemple![0]!.toUpperCase() + exemple!.slice(1))).toBe(true);
  });

  it("un mot de passe hors de la liste n'est pas refusé (la liste n'est pas un filtre sur tout)", () => {
    expect(isCommonPassword(`${exemple!}-Zq7!x#vn`)).toBe(false);
    expect(isCommonPassword("Zq7!xvn3-Pk2%wd")).toBe(false);
  });

  it("la comparaison est EXACTE après minuscules : ni rognage ni sous-chaîne (un mot de passe qui CONTIENT un mot courant n'est pas courant)", () => {
    expect(isCommonPassword(` ${exemple!} `)).toBe(false);
    expect(isCommonPassword(`x${exemple!}`)).toBe(false);
  });

  it("l'ensemble interrogé est celui de la liste, en minuscules, SANS doublon de casse (la liste a 10 001 entrées distinctes, même après minuscules)", () => {
    expect(COMMON_PASSWORDS.size).toBe(STAFF_COMMON_PASSWORDS.length);
    for (const entree of STAFF_COMMON_PASSWORDS.slice(0, 200)) expect(COMMON_PASSWORDS.has(entree.toLowerCase())).toBe(true);
    expect([...COMMON_PASSWORDS].every((p) => p === p.toLowerCase())).toBe(true);
  });

  it("accepte une liste injectée (le module reste pur : aucune dépendance cachée à l'ensemble global)", () => {
    expect(isCommonPassword("Secret123", new Set(["secret123"]))).toBe(true);
    expect(isCommonPassword("Secret123", new Set(["autre"]))).toBe(false);
  });
});

describe("passwordViolation — la raison d'un refus, dans l'ordre d'ÉVALUATION (le courant d'abord : il ne coûte aucun argon2)", () => {
  it("rien à reprocher ⇒ null", () => {
    expect(passwordViolation({ common: false, sameAsCurrent: false })).toBeNull();
  });

  it("⛔ MP-24 — un mot de passe courant ⇒ `common`", () => {
    expect(passwordViolation({ common: true, sameAsCurrent: false })).toBe("common");
  });

  it("⛔ MP-24 — un mot de passe réutilisé (identique à l'actuel) ⇒ `reused`", () => {
    expect(passwordViolation({ common: false, sameAsCurrent: true })).toBe("reused");
  });

  it("courant ET réutilisé ⇒ `common` (le plus tôt évalué)", () => {
    expect(passwordViolation({ common: true, sameAsCurrent: true })).toBe("common");
  });
});

describe("la liste — fidélité à sa SOURCE VERSÉE (R-5 (D341) : au moins 10 000 entrées, source, licence, empreinte)", () => {
  it("⛔ la liste a AU MOINS 10 000 entrées (R-5) — 10 001 : le nombre de lignes du fichier source", () => {
    const lignes = SOURCE.toString("utf8").split("\n").filter((l) => l !== "");
    expect(STAFF_COMMON_PASSWORDS.length).toBeGreaterThanOrEqual(10_000);
    expect(STAFF_COMMON_PASSWORDS.length).toBe(lignes.length);
    expect(STAFF_COMMON_PASSWORDS_SOURCE.entries).toBe(lignes.length);
  });

  it("le module reproduit le fichier source LIGNE À LIGNE, dans l'ordre (aucune entrée ajoutée, retirée ni modifiée)", () => {
    const lignes = SOURCE.toString("utf8").split("\n").filter((l) => l !== "");
    expect([...STAFF_COMMON_PASSWORDS]).toEqual(lignes);
  });

  it("⛔ l'empreinte sha256 du fichier source versé est celle que le module déclare ET celle que la TABLE D'OUVERTURE écrit (trois endroits, une valeur)", () => {
    const calculee = sha256(SOURCE);
    expect(STAFF_COMMON_PASSWORDS_SOURCE.sha256).toBe(calculee);
    expect(TABLE, "la table d'ouverture écrit l'empreinte du fichier source").toContain(calculee);
  });

  it("la source déclarée est celle de la table : dépôt, fichier, commit épinglé", () => {
    expect(STAFF_COMMON_PASSWORDS_SOURCE.repository).toBe("https://github.com/danielmiessler/SecLists");
    expect(STAFF_COMMON_PASSWORDS_SOURCE.path).toBe("Passwords/Common-Credentials/10k-most-common.txt");
    expect(TABLE).toContain(STAFF_COMMON_PASSWORDS_SOURCE.commit);
    expect(STAFF_COMMON_PASSWORDS_SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("⛔ la licence MIT accompagne la copie (condition de la licence) : l'avis versé porte le droit d'auteur et le texte de permission, et l'en-tête du module les reproduit", () => {
    expect(LICENCE).toContain("MIT License");
    expect(LICENCE).toContain("Copyright (c) 2018 Daniel Miessler");
    expect(LICENCE).toContain("Permission is hereby granted, free of charge");
    expect(STAFF_COMMON_PASSWORDS_SOURCE.license).toBe("MIT");
    expect(sha256(LICENCE), "l'empreinte de l'avis versé est celle de la table").toBe(TABLE.match(/licence[^\n]*sha256 `([0-9a-f]{64})`/)?.[1]);
    const module = readFileSync(join(process.cwd(), "src", "staff", "staff-common-passwords.ts"), "utf8");
    expect(module).toContain("Copyright (c) 2018 Daniel Miessler");
    expect(module).toContain("Permission is hereby granted, free of charge");
  });

  it("toutes les entrées sont des chaînes non vides, sans espace de bord ni saut de ligne (le format d'une liste à une entrée par ligne)", () => {
    for (const e of STAFF_COMMON_PASSWORDS) {
      expect(typeof e).toBe("string");
      expect(e.length).toBeGreaterThan(0);
      expect(e).toBe(e.trim());
      expect(e).not.toMatch(/[\r\n]/);
    }
  });
});
