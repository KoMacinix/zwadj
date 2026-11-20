// La GARDE DE SOURCE de la CARTE des écritures d'une fiche client — rang 57 (D355, R-2). `docs/preuves/D355/carte-fiches.md` dit où le code de production écrit la table `pro_client_records` ; ce fichier
// TIENT cette carte : un cinquième site d'écriture — un fichier neuf, ou une écriture ajoutée dans l'un des deux — fait rougir la garde tant que la carte et le journal ne le portent pas.
//
// ⛔ POURQUOI UNE GARDE DE SOURCE ET PAS UN TEST DE COMPORTEMENT : une écriture ajoutée demain n'a, le jour où on l'écrit, AUCUN comportement différent — la fiche s'écrit, la route répond 200, aucun test
// d'aujourd'hui ne rougit. Ce qui manque est la LIGNE DE JOURNAL, et seule la source dit qu'elle manque (même famille que `staff-source-guards.spec.ts` : « ce qu'aucun test de comportement ne voit »).
// ⛔ CE QUE LA GARDE EXIGE : (a) l'ensemble des fichiers de production qui écrivent la table égale exactement les deux de la carte ; (b) chacune des quatre méthodes d'écriture est DANS une transaction, écrit,
// PUIS journalise (la ligne ne peut pas précéder l'écriture qu'elle consigne) ; (c) le nombre d'écritures de chaque fichier est celui de la carte (3 et 1) ; (d) la conversion d'un devis n'écrit aucune fiche ;
// (e) la LIGNE du journal n'est construite QUE par le module pur — aucun magasin n'écrit `entityType: "client_record"` à la main, et chaque `auditLog.create` d'une méthode d'écriture reçoit `data: ficheAuditEntry(…)`.
//
// ⛔ CHAQUE DÉTECTEUR SE CALIBRE SUR DEUX BRAS avant de servir (D286) : un échantillon fautif connu doit être VU, un échantillon sain connu ne doit PAS l'être ; et chaque garde dit CE QU'ELLE A PARCOURU (un zéro
// sur zéro fichier parcouru n'est pas une mesure, D290).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

/** Commentaires retirés (bloc et ligne) AVANT toute recherche : la documentation qui explique pourquoi une écriture est journalisée ne doit pas faire rougir la garde. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Les écritures de la table : du SQL brut (`INSERT INTO`, `UPDATE`, `DELETE FROM`) et le délégué Prisma (`proClientRecord.create`, `update`, `updateMany`, `upsert`, `delete`…). Un `SELECT` et un `find*` n'en sont pas. */
const ECRITURES: RegExp[] = [
  /\bINSERT\s+INTO\s+pro_client_records\b/gi,
  /\bUPDATE\s+pro_client_records\b/gi,
  /\bDELETE\s+FROM\s+pro_client_records\b/gi,
  /\bproClientRecord\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g
];
const nbEcritures = (code: string): number => ECRITURES.reduce((n, r) => n + (code.match(r) ?? []).length, 0);
/** Le premier indice d'une écriture dans `code`, ou -1. */
const premiereEcriture = (code: string): number => Math.min(...ECRITURES.map((r) => code.search(r)).filter((i) => i >= 0), Number.POSITIVE_INFINITY);

interface Source {
  chemin: string;
  code: string;
}

/** Toutes les sources de production de `apps/api/src` : ni specs, ni code généré. */
function sourcesDeProduction(): Source[] {
  const sorties: Source[] = [];
  const parcourir = (dossier: string): void => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      if (e.isDirectory()) {
        if (e.name !== "generated") parcourir(chemin);
      } else if (e.name.endsWith(".ts") && !e.name.endsWith(".spec.ts")) {
        sorties.push({ chemin: chemin.slice(SRC.length + 1).replace(/\\/g, "/"), code: sansCommentaires(readFileSync(chemin, "utf8")) });
      }
    }
  };
  parcourir(SRC);
  return sorties;
}

/** Le corps d'une méthode `async nom(` : de son début au prochain `async ` d'un membre de classe (ou à la fin du fichier). */
function corps(code: string, nom: string): string {
  const debut = code.indexOf(`async ${nom}(`);
  if (debut < 0) return "";
  const suite = code.indexOf("\n  async ", debut + 1);
  return suite < 0 ? code.slice(debut) : code.slice(debut, suite);
}

const MAGASIN_FICHES = "clients/pro-client-store.prisma.ts";
const MAGASIN_DEVIS = "venues/quote-store.prisma.ts";
/** La carte : chaque fichier d'écriture, ses méthodes d'écriture (une écriture chacune) — `carte-fiches.md`, § 1 (W1 à W4). */
const CARTE: Array<{ fichier: string; methodes: string[] }> = [
  { fichier: MAGASIN_FICHES, methodes: ["creerSiAbsente", "completerNoms", "modifier"] },
  { fichier: MAGASIN_DEVIS, methodes: ["completerNomDuClient"] }
];

describe("calibration des détecteurs (deux bras chacun)", () => {
  it("l'écriture de la table : un INSERT, un UPDATE, un DELETE, `create`, `updateMany`, `upsert` sont VUS ; un SELECT, un `findFirst`, un identifiant voisin et un commentaire ne le sont pas", () => {
    for (const fautif of [
      "INSERT INTO pro_client_records (a) VALUES (1)",
      "update   pro_client_records SET x = 1",
      "DELETE FROM pro_client_records WHERE id = 1",
      "tx.proClientRecord.updateMany({ where })",
      "this.prisma.proClientRecord.create({ data })",
      "prisma.proClientRecord\n  .upsert({})"
    ]) {
      expect(nbEcritures(sansCommentaires(fautif)), fautif).toBe(1);
    }
    for (const sain of [
      "SELECT id FROM pro_client_records WHERE id = 1",
      "this.prisma.proClientRecord.findFirst({ where })",
      "this.prisma.proClientRecord.findUniqueOrThrow({ where })",
      "const proClientRecordCount = 2",
      "// INSERT INTO pro_client_records n'est pas écrit ici",
      "/* tx.proClientRecord.updateMany( */"
    ]) {
      expect(nbEcritures(sansCommentaires(sain)), sain).toBe(0);
    }
  });

  it("l'extracteur de méthode : rend le corps d'une méthode et s'arrête à la suivante ; une méthode absente rend une chaîne vide", () => {
    const classe = "class A {\n  async un() {\n    return 1;\n  }\n\n  async deux() {\n    return 2;\n  }\n}";
    expect(corps(classe, "un")).toContain("return 1");
    expect(corps(classe, "un")).not.toContain("return 2");
    expect(corps(classe, "deux")).toContain("return 2");
    expect(corps(classe, "trois")).toBe("");
  });
});

describe("⛔ (a) les fichiers de production qui écrivent `pro_client_records` sont EXACTEMENT les deux de la carte", () => {
  it("ni un fichier de plus, ni un de moins — et la garde dit combien elle a parcouru", () => {
    const sources = sourcesDeProduction();
    expect(sources.length, "fichiers de production parcourus (un zéro ne prouverait rien)").toBeGreaterThan(100);
    const ecrivains = sources.filter((s) => nbEcritures(s.code) > 0).map((s) => s.chemin);
    expect(ecrivains.sort()).toEqual(CARTE.map((c) => c.fichier).sort());
  });

  it("⛔ (d) la conversion d'un devis n'écrit AUCUNE fiche : `quotes.service.ts` ne contient aucune écriture de la table", () => {
    const service = sourcesDeProduction().find((s) => s.chemin === "venues/quotes.service.ts");
    expect(service, "le service des devis a été lu").toBeDefined();
    expect(service!.code.length).toBeGreaterThan(1000);
    expect(nbEcritures(service!.code)).toBe(0);
  });
});

describe("⛔ (c) le NOMBRE d'écritures de chaque fichier est celui de la carte : une écriture de plus, dans le même fichier, est un cinquième site", () => {
  for (const { fichier, methodes } of CARTE) {
    it(`${fichier} : ${methodes.length} écriture(s), une par méthode de la carte`, () => {
      const source = sourcesDeProduction().find((s) => s.chemin === fichier);
      expect(source, `${fichier} a été lu`).toBeDefined();
      expect(nbEcritures(source!.code)).toBe(methodes.length);
    });
  }
});

describe("⛔ (b) chaque méthode d'écriture est dans une TRANSACTION, écrit, PUIS journalise — l'écriture et sa trace vivent ou meurent ensemble", () => {
  for (const { fichier, methodes } of CARTE) {
    for (const methode of methodes) {
      it(`${fichier} › ${methode}`, () => {
        const source = sourcesDeProduction().find((s) => s.chemin === fichier)!;
        const c = corps(source.code, methode);
        expect(c.length, `le corps de ${methode} a été extrait`).toBeGreaterThan(50);
        expect(nbEcritures(c), `${methode} écrit la table une fois`).toBe(1);
        expect(c, `${methode} s'exécute dans une transaction`).toMatch(/\$transaction\s*\(/);
        const ecrit = premiereEcriture(c);
        const journal = c.indexOf("ficheAuditEntry(");
        expect(journal, `${methode} construit la ligne du journal par le module pur`).toBeGreaterThanOrEqual(0);
        expect(journal, `${methode} journalise APRÈS avoir écrit (la ligne ne précède pas l'écriture qu'elle consigne)`).toBeGreaterThan(ecrit);
        expect(c, `${methode} écrit la ligne par \`auditLog.create\`, dans la même transaction`).toMatch(/\bauditLog\s*\.\s*create\s*\(/);
        expect(c, `${methode} : la charge utile de la ligne vient du constructeur du module pur, jamais d'un objet écrit sur place`).toMatch(/\bauditLog\s*\.\s*create\s*\(\s*\{\s*data\s*:\s*ficheAuditEntry\s*\(/);
      });
    }
  }
});

describe("⛔ (e) la LIGNE du journal des fiches n'est construite QUE par le module pur", () => {
  /** Une ligne écrite à la main porte son entité : `entityType: "client_record"`. Le module pur est le SEUL à l'écrire ; les magasins lui PASSENT l'action (un littéral typé contre sa liste fermée), ils ne bâtissent pas la ligne. */
  const ENTITE_A_LA_MAIN = /\bentityType\s*:\s*["'`]client_record["'`]/;

  it("calibration : une entité écrite à la main est VUE ; un nom d'action passé au constructeur ne l'est pas", () => {
    expect(ENTITE_A_LA_MAIN.test(sansCommentaires('await tx.auditLog.create({ data: { action: "client_record.update", entityType: "client_record", entityId: id } });'))).toBe(true);
    expect(ENTITE_A_LA_MAIN.test(sansCommentaires('await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.update", ficheId: id, champs }) });'))).toBe(false);
  });

  it('aucun fichier de production autre que `client-record-audit.ts` n\'écrit `entityType: "client_record"` — aucun magasin ne bâtit la ligne à la main', () => {
    const sources = sourcesDeProduction();
    expect(sources.length).toBeGreaterThan(100);
    const porteurs = sources.filter((s) => ENTITE_A_LA_MAIN.test(s.code)).map((s) => s.chemin);
    expect(porteurs).toEqual(["clients/client-record-audit.ts"]);
  });
});
