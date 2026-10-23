// ⛔ La FRONTIÈRE entre `ProClientsService` et PostgreSQL pour la FICHE CLIENT — rang 41 (D336, L35-4 amendé).
//
// ⛔ LES PORTS NE LÈVENT PAS (doctrine S5b) : un refus rend un résultat discriminé qui PORTE ce que l'adaptateur a relu, et c'est le service qui choisit le
// code d'erreur. ⛔ LE PORT NE DÉCIDE RIEN : la politique (`pro-client-policy.ts`, module pur) décide ; le port lit et écrit.
// ⚠ L'unicité `(pro, numéro)` et `(pro, e-mail)` est en base, en index PARTIELS (D186) : Prisma ne la connaît pas, d'où `creerSiAbsente` en SQL
// (`INSERT … ON CONFLICT DO NOTHING`) suivie d'une relecture — jamais « lire puis insérer » (MD-1).
import type { Prisma } from "../generated/prisma/client";

export const FICHE_SELECT = {
  id: true,
  proProfileId: true,
  phone: true,
  email: true,
  nameAr: true,
  nameLatin: true,
  linkedUserId: true,
  linkedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProClientRecordSelect;

export type FicheRow = Prisma.ProClientRecordGetPayload<{ select: typeof FICHE_SELECT }>;

/** Le profil du pro et SES coordonnées (S-54) : son numéro, son second numéro, l'e-mail de son compte. */
export interface ContactDuProRow {
  readonly proProfileId: string;
  readonly phone: string;
  readonly phone2: string | null;
  readonly email: string;
}

/** Ce que K-1 cherche : un numéro canonique OU un e-mail normalisé (le contrat a déjà fait la forme). */
export type CritereRecherche = { readonly phone: string } | { readonly email: string };

export interface DonneesFiche {
  readonly phone: string | null;
  readonly email: string | null;
  readonly nameAr: string | null;
  readonly nameLatin: string | null;
}

/** K-2 — la ligne a été insérée ; ou rien ne l'a été, et la base rend les fiches qui ont REFUSÉ l'insertion (par le numéro, par l'e-mail). */
export type ResultatCreation =
  | { readonly cree: true; readonly fiche: FicheRow }
  | { readonly cree: false; readonly parTelephone: FicheRow | null; readonly parEmail: FicheRow | null };

/** K-3 — le compare-and-set a écrit ; ou non, et `actuelle` est la fiche RELUE (du pro), `null` si elle n'est pas à lui ou n'existe pas. */
export type ResultatComplement = { readonly ok: true; readonly fiche: FicheRow } | { readonly ok: false; readonly actuelle: FicheRow | null };

/** K-3b — écrit sous VERROU de la ligne ; refusé par l'unicité de la base ; ou absente / liée, `actuelle` relue SOUS LE MÊME VERROU (donc liée si non nulle). */
export type ResultatModification =
  | { readonly ok: true; readonly fiche: FicheRow }
  | { readonly ok: false; readonly raison: "unicite" }
  | { readonly ok: false; readonly raison: "absenteOuLiee"; readonly actuelle: FicheRow | null };

export const PRO_CLIENT_STORE = Symbol("PRO_CLIENT_STORE");

export interface ProClientStore {
  /** Le profil du pro et ses coordonnées — lu par K-2 et K-3b SEULEMENT : ⛔ la recherche (K-1) ne l'appelle jamais, elle ne lit pas `users` (M-4). */
  contactDuPro(userId: string): Promise<ContactDuProRow | null>;

  /** ⛔ K-1 (M-4) — la fiche du pro qui porte CE numéro ou CET e-mail, ou `null`. Ne lit QUE `pro_client_records` (la propriété se traverse par `pro_profiles`,
   *  D149) : jamais `users`, jamais les fiches d'un autre pro. */
  rechercher(userId: string, critere: CritereRecherche): Promise<FicheRow | null>;

  /** ⛔ K-2 (MD-1) — `INSERT … ON CONFLICT DO NOTHING`, puis, si rien n'est inséré, la relecture des fiches du numéro et de l'e-mail. Une fiche existante n'est
   *  JAMAIS modifiée ici. */
  creerSiAbsente(proProfileId: string, donnees: DonneesFiche): Promise<ResultatCreation>;

  /** ⛔ K-3 (MD-7) — complète les noms FOURNIS, chacun seulement s'il est NULL, sur une fiche NON liée du pro : un seul `UPDATE`, conditionné. */
  completerNoms(userId: string, id: string, noms: { readonly nameAr?: string; readonly nameLatin?: string }): Promise<ResultatComplement>;

  /** ⛔ K-3b (MD-6, MD-2) — modifie les champs FOURNIS d'une fiche du pro, sous verrou de sa ligne, si elle n'est pas liée ; une violation d'unicité est RENDUE. */
  modifier(
    userId: string,
    id: string,
    champs: { readonly phone?: string; readonly email?: string; readonly nameAr?: string; readonly nameLatin?: string }
  ): Promise<ResultatModification>;
}
