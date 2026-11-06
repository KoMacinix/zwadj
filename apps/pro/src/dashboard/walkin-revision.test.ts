// FP-3 (session `front-client`) — LA COPIE DU NOM D'UNE RÉVISION (règle PURE). Le serveur l'écrit (`QuotesService.revise`) : une révision porte
// le corps ENTIER, la copie du nom comprise, « celle que l'écran a préremplie du devis précédent » (DB-17) — il ne substitue PAS la fiche
// vivante. Le nom que la boîte de langue (K-5) a COMPLÉTÉ sur la version précédente doit donc être repris par l'écran, sauf quand le serveur le
// refuserait : une fiche LIÉE n'accepte aucun nom qu'elle n'a pas (`copieDuNomPourDevis`, 409 `CLIENT_RECORD_LINKED`), et la copie d'un AUTRE client
// n'a rien à faire sur ce devis. ⛔ Aucun montant ici.
// ⚠ La règle est lue PAR SON NOM dans le module : absente (avant FP-3), le rouge se lit en ASSERTION (D304).
import type { ClientRecordDTO } from "@zwadj/types";
import * as module from "./walkin-client";

type Version = { clientRecordId: string | null; clientNameAr: string | null; clientNameLatin: string | null };
type Noms = { ar: string; latin: string };
type Regle = (noms: Noms, fiche: Pick<ClientRecordDTO, "id" | "linked">, version: Version | null) => Record<string, unknown>;
const copiePourRevision = (module as Record<string, unknown>).copiePourRevision as Regle | undefined;
const regle: Regle = (noms, fiche, version) => (copiePourRevision ?? (() => ({ regleAbsente: true })))(noms, fiche, version);

const FICHE = { id: "fiche-9", linked: false };
const COPIE_AR = "أمين بلقاسم";
const VERSION: Version = { clientRecordId: FICHE.id, clientNameAr: COPIE_AR, clientNameLatin: "Amine Belkacem" };

describe("FP-3 — la règle existe", () => {
  it("`copiePourRevision` est exportée par `walkin-client`", () => {
    expect(typeof copiePourRevision).toBe("function");
  });
});

describe("FP-3 — une révision reprend la copie du nom de la version courante", () => {
  it("⛔ un nom ABSENT de l'écran est repris de la version courante — celui que la boîte de langue y a complété", () => {
    expect(regle({ ar: "", latin: "Amine Belkacem" }, FICHE, VERSION)).toEqual({
      clientRecordId: FICHE.id,
      clientNameAr: COPIE_AR,
      clientNameLatin: "Amine Belkacem"
    });
  });

  it("⛔ un nom TAPÉ l'emporte sur celui de la version (les noms corrigés vont au devis) ; l'autre écriture est reprise", () => {
    expect(regle({ ar: "", latin: "Amine Haddad" }, FICHE, VERSION)).toEqual({
      clientRecordId: FICHE.id,
      clientNameAr: COPIE_AR,
      clientNameLatin: "Amine Haddad"
    });
    expect(regle({ ar: "أمين الحداد", latin: "" }, FICHE, VERSION)).toEqual({
      clientRecordId: FICHE.id,
      clientNameAr: "أمين الحداد",
      clientNameLatin: "Amine Belkacem"
    });
  });

  it("un champ d'écran en BLANC compte pour absent ; la valeur reprise est ROGNÉE", () => {
    const version: Version = { ...VERSION, clientNameAr: `  ${COPIE_AR}  ` };
    expect(regle({ ar: "   ", latin: "\t" }, FICHE, version)).toEqual({
      clientRecordId: FICHE.id,
      clientNameAr: COPIE_AR,
      clientNameLatin: "Amine Belkacem"
    });
  });

  it("une copie de la version VIDE ou en blanc n'est pas reprise : la clé reste ABSENTE (le contrat refuse la chaîne vide)", () => {
    const version: Version = { clientRecordId: FICHE.id, clientNameAr: "  ", clientNameLatin: null };
    const corps = regle({ ar: "", latin: "Amine Belkacem" }, FICHE, version);
    expect(Object.prototype.hasOwnProperty.call(corps, "clientNameAr")).toBe(false);
    expect(corps).toEqual({ clientRecordId: FICHE.id, clientNameLatin: "Amine Belkacem" });
  });

  it("⛔ une fiche LIÉE n'en reçoit RIEN : le serveur refuse (409) un nom que la fiche n'a pas — elle impose les siens", () => {
    const corps = regle({ ar: "", latin: "Amina Bensalem" }, { id: FICHE.id, linked: true }, VERSION);
    expect(Object.prototype.hasOwnProperty.call(corps, "clientNameAr")).toBe(false);
    expect(corps).toEqual({ clientRecordId: FICHE.id, clientNameLatin: "Amina Bensalem" });
  });

  it("⛔ une AUTRE fiche n'en reçoit rien : la copie de l'ancien client ne passe pas au nouveau", () => {
    const autre: Version = { ...VERSION, clientRecordId: "fiche-ancienne" };
    const corps = regle({ ar: "", latin: "Karim Haddad" }, FICHE, autre);
    expect(Object.prototype.hasOwnProperty.call(corps, "clientNameAr")).toBe(false);
    expect(corps).toEqual({ clientRecordId: FICHE.id, clientNameLatin: "Karim Haddad" });
  });

  it("SANS version (la première création) : exactement la copie des noms de l'écran — `copiePourDevis`", () => {
    const noms = { ar: "", latin: "Amine Belkacem" };
    expect(regle(noms, FICHE, null)).toEqual(module.copiePourDevis(noms, FICHE.id));
  });
});
