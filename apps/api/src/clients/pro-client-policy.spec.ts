// La POLITIQUE de la fiche client — module PUR (D187), mesuré en millisecondes, sans base ni Nest. Rang 41 (D336, L35-4 amendé).
// Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md` (MD-2, MD-4, MD-6, MD-8).
import { describe, expect, it } from "vitest";
import { completeAussiLaFiche, copieDuNomPourDevis, decisionCreation, estContactDuPro, peutModifier } from "./pro-client-policy";

const PRO = { phone: "+213550000009", phone2: "+213770000009", email: "pro@example.dz" };
const fiche = (over: Partial<{ id: string; nameAr: string | null; nameLatin: string | null; linkedUserId: string | null }> = {}) => ({
  id: "f1",
  nameAr: null,
  nameLatin: "Amina Bensalem",
  linkedUserId: null,
  ...over
});

describe("⛔ MD-4 — `estContactDuPro` : le numéro du pro, son SECOND numéro, son e-mail de compte (DB-8 étendue)", () => {
  it("reconnaît chacun des trois, sous toute forme normalisable", () => {
    expect(estContactDuPro({ phone: "+213550000009" }, PRO)).toBe(true);
    expect(estContactDuPro({ phone: "0550 00 00 09" }, PRO)).toBe(true);
    expect(estContactDuPro({ phone: "+213770000009" }, PRO)).toBe(true);
    expect(estContactDuPro({ email: "pro@example.dz" }, PRO)).toBe(true);
    expect(estContactDuPro({ email: "  PRO@Example.DZ " }, PRO)).toBe(true);
  });

  it("un seul des deux identifiants suffit à refuser : le numéro d'un client avec l'e-mail du pro est refusé", () => {
    expect(estContactDuPro({ phone: "+213661234567", email: "pro@example.dz" }, PRO)).toBe(true);
    expect(estContactDuPro({ phone: "+213550000009", email: "amina@example.dz" }, PRO)).toBe(true);
  });

  it("contrôle NÉGATIF : un autre numéro, un autre e-mail, ou rien — pas le contact du pro (la garde ne refuse pas tout)", () => {
    expect(estContactDuPro({ phone: "+213661234567" }, PRO)).toBe(false);
    expect(estContactDuPro({ email: "amina@example.dz" }, PRO)).toBe(false);
    expect(estContactDuPro({}, PRO)).toBe(false);
    expect(estContactDuPro({ phone: "+213661234567", email: null }, { phone: "+213550000009", phone2: null, email: "pro@example.dz" })).toBe(false);
  });

  it("un pro SANS second numéro : un numéro absent ne se confond jamais avec un numéro vide", () => {
    expect(estContactDuPro({ phone: null }, { ...PRO, phone2: null })).toBe(false);
  });
});

describe("⛔ MD-2 — `decisionCreation` : créer, RENDRE la fiche existante, ou REFUSER — jamais fusionner", () => {
  it("rien n'est trouvé : créer", () => {
    expect(decisionCreation(null, null)).toEqual({ kind: "creer" });
  });

  it("trouvée par le numéro seul, ou par l'e-mail seul : la RENDRE, telle quelle", () => {
    const a = fiche({ id: "a" });
    expect(decisionCreation(a, null)).toEqual({ kind: "rendre", fiche: a });
    expect(decisionCreation(null, a)).toEqual({ kind: "rendre", fiche: a });
  });

  it("le numéro et l'e-mail désignent la MÊME fiche : la rendre", () => {
    const a = fiche({ id: "a" });
    expect(decisionCreation(a, { ...a })).toEqual({ kind: "rendre", fiche: a });
  });

  it("⛔ ils désignent DEUX fiches différentes : conflit, rien n'est rendu", () => {
    expect(decisionCreation(fiche({ id: "a" }), fiche({ id: "b" }))).toEqual({ kind: "conflit" });
  });
});

describe("⛔ MD-6 — `peutModifier` : une fiche LIÉE à un compte n'est plus modifiable par le pro (champs grisés)", () => {
  it("non liée : modifiable ; liée : non", () => {
    expect(peutModifier(fiche())).toBe(true);
    expect(peutModifier(fiche({ linkedUserId: "u1" }))).toBe(false);
  });
});

describe("⛔ MD-6 (S-49) — `copieDuNomPourDevis` : la copie du nom pour CE devis", () => {
  it("fiche NON liée : la copie est celle que le pro a saisie pour ce devis (DB-17), même si elle diffère de la fiche", () => {
    expect(copieDuNomPourDevis(fiche(), { latin: "Yacine Bensalem" })).toEqual({ ok: true, copie: { ar: null, latin: "Yacine Bensalem" } });
    expect(copieDuNomPourDevis(fiche(), { ar: "آمنة", latin: "Amina Bensalem" })).toEqual({ ok: true, copie: { ar: "آمنة", latin: "Amina Bensalem" } });
  });

  it("fiche LIÉE : la copie est CELLE DE LA FICHE, quand ce que le pro envoie est identique à la fiche", () => {
    const liee = fiche({ nameAr: "آمنة بن سالم", linkedUserId: "u1" });
    expect(copieDuNomPourDevis(liee, { latin: "Amina Bensalem" })).toEqual({ ok: true, copie: { ar: "آمنة بن سالم", latin: "Amina Bensalem" } });
    expect(copieDuNomPourDevis(liee, { ar: "آمنة بن سالم", latin: "Amina Bensalem" })).toEqual({ ok: true, copie: { ar: "آمنة بن سالم", latin: "Amina Bensalem" } });
  });

  it("⛔ fiche LIÉE : un nom DIFFÉRENT — ou ajouté là où la fiche n'en a pas — est refusé (« le pro ne peut pas changer un nom prérempli »)", () => {
    const liee = fiche({ linkedUserId: "u1" });
    expect(copieDuNomPourDevis(liee, { latin: "Autre Nom" })).toEqual({ ok: false, raison: "ficheLiee" });
    expect(copieDuNomPourDevis(liee, { latin: "Amina Bensalem", ar: "آمنة" })).toEqual({ ok: false, raison: "ficheLiee" });
  });
});

describe("⛔ MD-8 (C-C3, S-51) — `completeAussiLaFiche` : la boîte de langue complète la FICHE seulement si c'est la même personne", () => {
  const copie = (ar: string | null, latin: string | null) => ({ ar, latin });

  it("branche 1 — le nom de l'AUTRE écriture est le même sur le devis et sur la fiche, le nom manque à la fiche : compléter", () => {
    expect(completeAussiLaFiche({ fiche: fiche(), copie: copie("آمنة بن سالم", "Amina Bensalem"), champ: "nameAr" })).toBe(true);
  });

  it("branche 2 — l'autre écriture DIFFÈRE (deux personnes, un numéro : M-24) : ne pas compléter", () => {
    expect(completeAussiLaFiche({ fiche: fiche(), copie: copie("ياسين بن سالم", "Yacine Bensalem"), champ: "nameAr" })).toBe(false);
  });

  it("la fiche a DÉJÀ un nom dans cette écriture : ne jamais le remplacer", () => {
    expect(completeAussiLaFiche({ fiche: fiche({ nameAr: "آمنة" }), copie: copie("آمنة بن سالم", "Amina Bensalem"), champ: "nameAr" })).toBe(false);
  });

  it("une fiche LIÉE : jamais complétée par la boîte", () => {
    expect(completeAussiLaFiche({ fiche: fiche({ linkedUserId: "u1" }), copie: copie("آمنة بن سالم", "Amina Bensalem"), champ: "nameAr" })).toBe(false);
  });

  it("dans l'autre sens aussi : compléter le nom LATIN d'une fiche qui n'a que l'arabe, quand l'arabe est le même", () => {
    const arabeSeul = fiche({ nameAr: "آمنة بن سالم", nameLatin: null });
    expect(completeAussiLaFiche({ fiche: arabeSeul, copie: copie("آمنة بن سالم", "Amina Bensalem"), champ: "nameLatin" })).toBe(true);
    expect(completeAussiLaFiche({ fiche: arabeSeul, copie: copie("آمنة", "Amina Bensalem"), champ: "nameLatin" })).toBe(false);
  });
});
