import { describe, expect, it } from "vitest";
// ⚠ CE FICHIER VIT DANS L'API, PAS DANS `packages/types` — même raison que `contact.spec.ts` et `phone.spec.ts` : `packages/types` n'a pas de lanceur de tests.
import {
  QUOTE_CLIENT_NAME_FIELD,
  QUOTE_DOCUMENT_LOCALES,
  clientRecordCreateSchema,
  clientRecordLookupSchema,
  clientRecordNamesSchema,
  clientRecordUpdateSchema,
  normalizeContactEmail,
  quoteClientNameSchema,
  quoteCreateSchema
} from "@zwadj/types";

// ══ Rang 41 (D336, L35-4 amendé) — LES CONTRATS DE LA FICHE CLIENT ET DU NOM SUR LE DEVIS ══════════════════════════════════════════════
// Une règle vit UNE fois, dans le contrat partagé ; l'écran du pro l'importe et le serveur l'applique (D147). Modes de défaillance :
// `docs/preuves/D336/modes-de-defaillance.md` (MD-3, MD-5, MD-15).

/** Le chemin et le message de chaque refus — un refus sans message de catalogue serait un 400 que l'écran ne saurait pas dire. */
const refus = (r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => `${i.path.join(".")}:${i.message}`);

describe("⛔ MD-3 (S-55) — `normalizeContactEmail` : rogné, NFKC, minuscules — UNE fonction pour toute l'adresse d'une fiche", () => {
  it("rogne et met en minuscules", () => {
    expect(normalizeContactEmail("  Amina@Mail.DZ ")).toBe("amina@mail.dz");
  });

  it("ramène la PLEINE CHASSE aux caractères ordinaires (NFKC) : « ＡＭＩＮＡ＠ＭＡＩＬ．ＤＺ » est « amina@mail.dz »", () => {
    expect(normalizeContactEmail("ＡＭＩＮＡ＠ＭＡＩＬ．ＤＺ")).toBe("amina@mail.dz");
  });

  it("ramène une lettre accentuée DÉCOMPOSÉE à sa forme composée : deux saisies du même texte donnent la même adresse", () => {
    expect(normalizeContactEmail("éloïse@example.dz")).toBe(normalizeContactEmail("éloïse@example.dz"));
    expect(normalizeContactEmail("éloïse@example.dz")).toBe("éloïse@example.dz");
  });

  it("est IDEMPOTENTE : normaliser une adresse déjà normalisée ne la change pas", () => {
    for (const brut of ["  Amina@Mail.DZ ", "Ａ@Ｂ.dz", "KARIM.Haddad@EXAMPLE.dz"]) {
      const une = normalizeContactEmail(brut);
      expect(normalizeContactEmail(une), brut).toBe(une);
    }
  });
});

describe("K-1 — `clientRecordLookupSchema` : EXACTEMENT un identifiant, un numéro OU un e-mail", () => {
  it("un numéro : rendu sous sa forme CANONIQUE (`dzPhoneSchema`, la règle du contrat)", () => {
    const r = clientRecordLookupSchema.safeParse({ phone: "0555 12 34 56" });
    expect(r.success).toBe(true);
    expect(r.success ? r.data : null).toEqual({ phone: "+213555123456" });
  });

  it("un e-mail : rendu NORMALISÉ par `normalizeContactEmail`", () => {
    const r = clientRecordLookupSchema.safeParse({ email: "  Amina@Mail.DZ " });
    expect(r.success ? r.data : null).toEqual({ email: "amina@mail.dz" });
  });

  it("les deux, aucun, une clé inconnue : REFUSÉS", () => {
    for (const corps of [{ phone: "0555123456", email: "a@example.dz" }, {}, { name: "Amina" }, { phone: "0555123456", extra: 1 }]) {
      expect(clientRecordLookupSchema.safeParse(corps).success, JSON.stringify(corps)).toBe(false);
    }
  });

  it("⛔ MD-5 — un numéro fixe, étranger, ou écrit TOUT en chiffres arabo-indiens : REFUSÉ, avec le message du contrat du téléphone", () => {
    for (const phone of ["+21321234567", "021234567", "+33612345678", "٠٥٥٥١٢٣٤٥٦"]) {
      const r = clientRecordLookupSchema.safeParse({ phone });
      expect(r.success, phone).toBe(false);
      expect(refus(r), phone).toContain("phone:auth.validation.phoneInvalid");
    }
  });

  it("un e-mail invalide est refusé, avec SA clé de catalogue", () => {
    const r = clientRecordLookupSchema.safeParse({ email: "amina@" });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("email:clientRecord.validation.emailInvalid");
  });
});

describe("K-2 — `clientRecordCreateSchema` : au moins un identifiant, au moins un nom ; les règles PARTAGÉES du nom et de l'e-mail", () => {
  it("le corps complet : numéro canonique, e-mail normalisé, noms rognés", () => {
    const r = clientRecordCreateSchema.safeParse({ phone: "0555123456", email: " Amina@Mail.DZ ", nameAr: " آمنة بن سالم ", nameLatin: " Amina Bensalem " });
    expect(r.success ? r.data : null).toEqual({ phone: "+213555123456", email: "amina@mail.dz", nameAr: "آمنة بن سالم", nameLatin: "Amina Bensalem" });
  });

  it("un e-mail SEUL ou un numéro SEUL suffit ; un nom dans UNE écriture suffit", () => {
    expect(clientRecordCreateSchema.safeParse({ email: "a@example.dz", nameLatin: "Amina" }).success).toBe(true);
    expect(clientRecordCreateSchema.safeParse({ phone: "0555123456", nameAr: "آمنة" }).success).toBe(true);
  });

  it("sans identifiant : refusé, et le refus le NOMME", () => {
    const r = clientRecordCreateSchema.safeParse({ nameLatin: "Amina" });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("phone:clientRecord.validation.identifierRequired");
  });

  it("sans aucun nom : refusé, et le refus le NOMME", () => {
    const r = clientRecordCreateSchema.safeParse({ phone: "0555123456" });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("nameLatin:clientRecord.validation.nameRequired");
  });

  it("un nom hors de la règle partagée (chiffre, symbole) ou trop long : refusé", () => {
    for (const nameLatin of ["Amina123", "Amina!", "a".repeat(81)]) {
      expect(clientRecordCreateSchema.safeParse({ phone: "0555123456", nameLatin }).success, nameLatin).toBe(false);
    }
  });

  it("strict : une clé inconnue (un identifiant de compte, un lien) est refusée", () => {
    for (const extra of [{ clientId: "x" }, { linkedUserId: "x" }, { linked: true }]) {
      expect(clientRecordCreateSchema.safeParse({ phone: "0555123456", nameLatin: "Amina", ...extra }).success, JSON.stringify(extra)).toBe(false);
    }
  });
});

describe("K-3 et K-3b — compléter un nom, modifier une fiche", () => {
  it("K-3 : au moins un nom ; rien d'autre que les noms", () => {
    expect(clientRecordNamesSchema.safeParse({ nameAr: "آمنة" }).success).toBe(true);
    expect(clientRecordNamesSchema.safeParse({}).success).toBe(false);
    expect(clientRecordNamesSchema.safeParse({ phone: "0555123456" }).success).toBe(false);
  });

  it("K-3b : au moins un champ ; chaque valeur passe la règle de la création (numéro canonique, e-mail normalisé)", () => {
    const r = clientRecordUpdateSchema.safeParse({ phone: "0661 23 45 67", email: " Karim@Example.DZ " });
    expect(r.success ? r.data : null).toEqual({ phone: "+213661234567", email: "karim@example.dz" });
    expect(clientRecordUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("K-3b CHANGE une valeur, il n'en RETIRE aucune : `null` est refusé pour chaque champ — les CHECK de la base ne peuvent donc pas tomber par lui", () => {
    for (const champ of ["phone", "email", "nameAr", "nameLatin"]) {
      expect(clientRecordUpdateSchema.safeParse({ [champ]: null }).success, champ).toBe(false);
    }
  });
});

describe("⛔ K-4 (DB-15, S-49) — `quoteCreateSchema` : la fiche et la COPIE du nom ; `clientId` RETIRÉ", () => {
  const BASE = { eventDate: "2027-09-18", slotTemplateId: "018f0000-0000-7000-8000-000000000001", guests: 250 };
  const FICHE = "018f0000-0000-7000-8000-0000000000f1";

  it("⛔ `clientId` est une clé INCONNUE : refusée (le lien à un compte ne passe que par la fiche et la fusion)", () => {
    expect(quoteCreateSchema.safeParse({ ...BASE, clientId: "018f0000-0000-7000-8000-0000000000aa" }).success).toBe(false);
  });

  it("sans fiche ni nom : le devis du parcours se crée comme aujourd'hui", () => {
    expect(quoteCreateSchema.safeParse(BASE).success).toBe(true);
  });

  it("une fiche ET au moins un nom : accepté, les noms rognés", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, clientRecordId: FICHE, clientNameLatin: " Amina Bensalem " });
    expect(r.success).toBe(true);
    expect(r.success ? { id: r.data.clientRecordId, latin: r.data.clientNameLatin, ar: r.data.clientNameAr } : null).toEqual({ id: FICHE, latin: "Amina Bensalem", ar: undefined });
  });

  it("⛔ MD-15 — des noms SANS fiche : refusé, et le refus nomme la fiche", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, clientNameLatin: "Amina Bensalem" });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("clientRecordId:quote.validation.clientRecordRequired");
  });

  it("⛔ MD-15 — une fiche SANS nom : refusé, et le refus nomme le nom", () => {
    const r = quoteCreateSchema.safeParse({ ...BASE, clientRecordId: FICHE });
    expect(r.success).toBe(false);
    expect(refus(r)).toContain("clientNameLatin:quote.validation.clientNameRequired");
  });

  it("un nom de la copie hors de la règle partagée : refusé", () => {
    expect(quoteCreateSchema.safeParse({ ...BASE, clientRecordId: FICHE, clientNameAr: "آمنة123" }).success).toBe(false);
  });
});

describe("K-5 — `quoteClientNameSchema` et la correspondance langue → copie, écrite UNE fois", () => {
  it("la langue du document choisit la copie : le français imprime le nom LATIN, l'arabe le nom ARABE — pour CHAQUE langue du contrat", () => {
    expect(QUOTE_CLIENT_NAME_FIELD).toEqual({ fr: "clientNameLatin", ar: "clientNameAr" });
    expect(Object.keys(QUOTE_CLIENT_NAME_FIELD).sort()).toEqual([...QUOTE_DOCUMENT_LOCALES].sort());
  });

  it("une langue du contrat et un nom valide : accepté, rogné", () => {
    const r = quoteClientNameSchema.safeParse({ locale: "ar", name: " آمنة بن سالم " });
    expect(r.success ? r.data : null).toEqual({ locale: "ar", name: "آمنة بن سالم" });
  });

  it("une langue inconnue, un nom vide ou invalide, une clé inconnue : refusés", () => {
    for (const corps of [{ locale: "en", name: "Amina" }, { locale: "fr", name: "" }, { locale: "fr", name: "Amina123" }, { locale: "fr" }, { locale: "fr", name: "Amina", extra: 1 }]) {
      expect(quoteClientNameSchema.safeParse(corps).success, JSON.stringify(corps)).toBe(false);
    }
  });
});
