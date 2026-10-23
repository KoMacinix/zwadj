// La FICHE CLIENT d'un pro — rang 41 (D336, L35-4 amendé). Les contrats K-1 (rechercher), K-2 (créer ou rendre), K-3 (compléter un nom), K-3b (modifier), et la
// forme de leurs réponses. Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md`.
//
// ── Ce qu'est une fiche ───────────────────────────────────────────────────────
// Ce que le PRO sait de son client : un numéro de mobile OU une adresse e-mail (au moins l'un des deux — « pour un vrai devis, il faut le numéro ou l'adresse
// e-mail », Ko, 21/10/2026), et un nom en arabe OU en lettres latines (au moins un des deux, DB-3). La fiche appartient au pro (unique par `(pro, numéro)` et
// par `(pro, e-mail)`) et sert toutes ses salles. Elle n'est PAS un compte : `linked` dit seulement qu'un compte Zwadj l'a rejointe (la FUSION, L35-6) — et
// rien du compte n'y apparaît (consigne v3, § 2 d ; S-53).
//
// ⛔ UNE RÈGLE PAR DONNÉE, IMPORTÉE (D147) : le numéro passe par `dzPhoneSchema` (mobile algérien, forme canonique `+213…`), le nom par `personNameSchema`, l'e-mail
// par `normalizeContactEmail` puis `contactEmailSchema`. L'écran du pro importe les mêmes : il refuse ce que le serveur refuse.
// ⚠ `lib: ["ES2022"]` SEULE : aucun global DOM ni Node ici.
import { z } from "zod";
import { dzPhoneSchema } from "./auth";
import { contactEmailSchema, normalizeContactEmail, personNameSchema } from "./contact";

/** Le nom d'une fiche, dans UNE écriture : la règle partagée, avec les clés de catalogue de la fiche. */
const nomDeFiche = personNameSchema({
  required: "clientRecord.validation.required",
  tooLong: "clientRecord.validation.tooLong",
  invalid: "clientRecord.validation.nameInvalid"
});

/**
 * L'e-mail d'une fiche (S-55) : NORMALISÉ d'abord (rogné, NFKC, minuscules), VALIDÉ ensuite par la règle partagée — la pleine chasse se ramène avant `.email()`.
 * ⚠ Une valeur qui n'est pas une chaîne (`null` compris) est refusée : K-3b CHANGE une valeur, il n'en retire aucune.
 */
export const clientRecordEmailSchema = z
  .string({ invalid_type_error: "clientRecord.validation.emailInvalid", required_error: "clientRecord.validation.emailInvalid" })
  .transform(normalizeContactEmail)
  .pipe(contactEmailSchema({ invalid: "clientRecord.validation.emailInvalid", tooLong: "clientRecord.validation.tooLong" }));

/** K-1 — `POST /pro/clients/lookup` : EXACTEMENT un identifiant, un numéro OU un e-mail. La réponse a la MÊME forme pour tout identifiant sans fiche (M-4). */
export const clientRecordLookupSchema = z
  .object({ phone: dzPhoneSchema.optional(), email: clientRecordEmailSchema.optional() })
  .strict("clientRecord.validation.unknownKey")
  .superRefine((corps, ctx) => {
    if ((corps.phone === undefined) === (corps.email === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "clientRecord.validation.lookupExactlyOne" });
    }
  });
export type ClientRecordLookupInput = z.infer<typeof clientRecordLookupSchema>;

/** K-2 — `POST /pro/clients` : au moins un identifiant, au moins un nom. Idempotent sur `(pro, numéro)` et sur `(pro, e-mail)` ; une fiche RENDUE n'est pas modifiée. */
export const clientRecordCreateSchema = z
  .object({
    phone: dzPhoneSchema.optional(),
    email: clientRecordEmailSchema.optional(),
    nameAr: nomDeFiche.optional(),
    nameLatin: nomDeFiche.optional()
  })
  .strict("clientRecord.validation.unknownKey")
  .superRefine((corps, ctx) => {
    if (corps.phone === undefined && corps.email === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "clientRecord.validation.identifierRequired" });
    }
    if (corps.nameAr === undefined && corps.nameLatin === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nameLatin"], message: "clientRecord.validation.nameRequired" });
    }
  });
export type ClientRecordCreateInput = z.infer<typeof clientRecordCreateSchema>;

/** K-3 — `PATCH /pro/clients/:id/names` : COMPLÈTE un nom manquant (au moins un nom), ne remplace jamais. */
export const clientRecordNamesSchema = z
  .object({ nameAr: nomDeFiche.optional(), nameLatin: nomDeFiche.optional() })
  .strict("clientRecord.validation.unknownKey")
  .superRefine((corps, ctx) => {
    if (corps.nameAr === undefined && corps.nameLatin === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nameLatin"], message: "clientRecord.validation.nameRequired" });
    }
  });
export type ClientRecordNamesInput = z.infer<typeof clientRecordNamesSchema>;

/**
 * K-3b (S-48) — `PATCH /pro/clients/:id` : MODIFIE une fiche (DB-11) — les champs à changer, au moins un. ⛔ Il CHANGE une valeur, il n'en RETIRE aucune (`null` est
 * refusé) : une fiche garde donc toujours un identifiant et un nom, et les `CHECK` de la base ne peuvent pas tomber par lui. Retirer un champ n'est pas un contrat de ce lot.
 */
export const clientRecordUpdateSchema = z
  .object({
    phone: dzPhoneSchema.optional(),
    email: clientRecordEmailSchema.optional(),
    nameAr: nomDeFiche.optional(),
    nameLatin: nomDeFiche.optional()
  })
  .strict("clientRecord.validation.unknownKey")
  .superRefine((corps, ctx) => {
    if (corps.phone === undefined && corps.email === undefined && corps.nameAr === undefined && corps.nameLatin === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nameLatin"], message: "clientRecord.validation.fieldRequired" });
    }
  });
export type ClientRecordUpdateInput = z.infer<typeof clientRecordUpdateSchema>;

/** Une fiche, telle que les routes la rendent. ⛔ `linked` est un BOOLÉEN : ni l'identifiant du compte, ni rien de lui (S-53). */
export interface ClientRecordDTO {
  id: string;
  phone: string | null;
  email: string | null;
  nameAr: string | null;
  nameLatin: string | null;
  linked: boolean;
  createdAt: string;
  updatedAt: string;
}

/** K-1 — ⛔ `{ found: false }` et RIEN d'autre pour tout identifiant sans fiche : la même réponse, à l'octet, qu'un compte Zwadj porte cet identifiant ou non (M-4). */
export type ClientRecordLookupDTO = { found: false } | { found: true; record: ClientRecordDTO };

/** K-2 — `created` dit si la fiche vient de naître ; `record` est la fiche (créée, ou rendue telle quelle). */
export interface ClientRecordCreateDTO {
  created: boolean;
  record: ClientRecordDTO;
}

export const ClientRecordErrorCode = {
  /** 404 INDISTINCT (D47) : une fiche absente et la fiche d'un AUTRE pro rendent la même réponse. */
  CLIENT_RECORD_NOT_FOUND: "CLIENT_RECORD_NOT_FOUND",
  /** 409 — le numéro et l'e-mail désignent DEUX fiches différentes (K-2), ou K-3b donnerait à une fiche l'identifiant d'une autre : rien n'est fusionné. */
  CLIENT_RECORD_IDENTIFIERS_CONFLICT: "CLIENT_RECORD_IDENTIFIERS_CONFLICT",
  /** 400 — le numéro, le second numéro ou l'e-mail de compte du PRO, tapé comme contact d'un client (DB-8 étendue, S-54). */
  CLIENT_IS_PRO_CONTACT: "CLIENT_IS_PRO_CONTACT",
  /** 409 — K-3 : le nom est déjà là ; il n'est jamais remplacé. */
  CLIENT_RECORD_NAME_ALREADY_SET: "CLIENT_RECORD_NAME_ALREADY_SET",
  /** 409 — la fiche est LIÉE à un compte Zwadj : ses champs ne se modifient plus (champs grisés) ; un devis ne lui donne pas d'autre nom (S-49). */
  CLIENT_RECORD_LINKED: "CLIENT_RECORD_LINKED"
} as const;
export type ClientRecordErrorCode = (typeof ClientRecordErrorCode)[keyof typeof ClientRecordErrorCode];
