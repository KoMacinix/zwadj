// La POLITIQUE de la fiche client — module PUR (D187) : aucune dépendance au cadre, à Prisma ni à l'horloge ; il se neutralise et se rejoue en millisecondes.
// Rang 41 (D336, L35-4 amendé). Modes de défaillance : `docs/preuves/D336/modes-de-defaillance.md` (MD-2, MD-4, MD-6, MD-8).
//
// Quatre décisions, chacune écrite UNE fois et appelée par le service (des fiches, ou des devis) : le contact du pro refusé (S-54), la création qui crée, rend ou
// refuse (K-2), la copie du nom d'un devis (S-49), et C-C3 — quand la boîte de langue complète AUSSI la fiche (S-51). Le port lit et écrit ; il ne décide rien.
import { normalizeContactEmail, normalizeDzPhone } from "@zwadj/types";

/** Les coordonnées du PRO lui-même : son numéro, son second numéro (`pro_profiles.phone2`), l'e-mail de son compte. */
export interface ContactDuPro {
  readonly phone: string | null;
  readonly phone2: string | null;
  readonly email: string | null;
}

const telephoneCanonique = (phone: string | null | undefined): string | null => (typeof phone === "string" ? normalizeDzPhone(phone) : null);
const emailNormalise = (email: string | null | undefined): string | null =>
  typeof email === "string" && email.trim() !== "" ? normalizeContactEmail(email) : null;

/**
 * ⛔ MD-4 (DB-8 étendue, S-54) — le contact tapé pour un CLIENT est-il celui du PRO ? Son numéro, son second numéro, ou l'e-mail de son compte — comparés sous leur
 * forme CANONIQUE des deux côtés (`0550 00 00 09` est `+213550000009`, `PRO@Example.DZ` est `pro@example.dz`). Un seul des deux identifiants suffit à refuser.
 * ⚠ Un numéro ABSENT ne se confond jamais avec un numéro absent du pro : `null` n'est égal à rien.
 */
export function estContactDuPro(candidat: { readonly phone?: string | null; readonly email?: string | null }, pro: ContactDuPro): boolean {
  const telephone = telephoneCanonique(candidat.phone);
  if (telephone !== null && (telephone === telephoneCanonique(pro.phone) || telephone === telephoneCanonique(pro.phone2))) return true;
  const email = emailNormalise(candidat.email);
  return email !== null && email === emailNormalise(pro.email);
}

export type DecisionCreation<F> = { readonly kind: "creer" } | { readonly kind: "rendre"; readonly fiche: F } | { readonly kind: "conflit" };

/**
 * ⛔ MD-2 (K-2) — après un `INSERT … ON CONFLICT DO NOTHING` qui n'a rien inséré, ou avant toute écriture : la fiche du NUMÉRO et la fiche de l'E-MAIL décident.
 * Aucune : créer. Une seule, ou la même pour les deux : la RENDRE, telle quelle (une fiche rendue n'est pas modifiée). Deux fiches DIFFÉRENTES : conflit — rien
 * n'est fusionné, et la fusion de deux fiches n'est pas un contrat de ce lot.
 */
export function decisionCreation<F extends { readonly id: string }>(parTelephone: F | null, parEmail: F | null): DecisionCreation<F> {
  if (parTelephone === null && parEmail === null) return { kind: "creer" };
  if (parTelephone !== null && parEmail !== null && parTelephone.id !== parEmail.id) return { kind: "conflit" };
  return { kind: "rendre", fiche: (parTelephone ?? parEmail) as F };
}

/** Ce qui, d'une fiche, décide de ses noms et de son lien. */
export interface FicheNommee {
  readonly nameAr: string | null;
  readonly nameLatin: string | null;
  readonly linkedUserId: string | null;
}

/** ⛔ MD-6 — une fiche LIÉE à un compte Zwadj n'est plus modifiable par le pro (« champs grisés », Ko, 21/10/2026). */
export function peutModifier(fiche: { readonly linkedUserId: string | null }): boolean {
  return fiche.linkedUserId === null;
}

/** La COPIE du nom d'un devis, une par écriture. */
export interface CopieDuNom {
  readonly ar: string | null;
  readonly latin: string | null;
}

/**
 * ⛔ S-49 (DB-17, MD-6) — la copie du nom POUR CE DEVIS. Fiche NON liée : ce que le pro a saisi pour ce devis, même si cela diffère de la fiche (« le nom
 * prérempli et modifiable pour ce devis »). Fiche LIÉE : la copie est CELLE DE LA FICHE, et un nom différent — ou ajouté là où la fiche n'en a pas — est refusé
 * (« le pro ne peut pas changer un nom prérempli, sauf si la fiche vient de son propre catalogue », Ko, 21/10/2026). Le nom manquant d'une fiche liée se
 * complète sur le DEVIS seulement, par la boîte de langue (K-5).
 */
export function copieDuNomPourDevis(
  fiche: FicheNommee,
  demande: { readonly ar?: string; readonly latin?: string }
): { readonly ok: true; readonly copie: CopieDuNom } | { readonly ok: false; readonly raison: "ficheLiee" } {
  if (peutModifier(fiche)) return { ok: true, copie: { ar: demande.ar ?? null, latin: demande.latin ?? null } };
  const differe = (demande.ar !== undefined && demande.ar !== fiche.nameAr) || (demande.latin !== undefined && demande.latin !== fiche.nameLatin);
  if (differe) return { ok: false, raison: "ficheLiee" };
  return { ok: true, copie: { ar: fiche.nameAr, latin: fiche.nameLatin } };
}

/**
 * ⛔ MD-8 (C-C3, S-51) — la boîte de langue vient de compléter la copie du nom dans l'écriture `champ` : complète-t-elle AUSSI la fiche ? Seulement si c'est
 * la même personne — le nom de l'AUTRE écriture est le même sur le devis et sur la fiche (deux personnes peuvent partager un numéro : M-24) —, si la fiche n'a
 * pas déjà un nom dans cette écriture (jamais remplacé, M-6), et si elle n'est pas liée.
 */
export function completeAussiLaFiche(args: { readonly fiche: FicheNommee; readonly copie: CopieDuNom; readonly champ: "nameAr" | "nameLatin" }): boolean {
  const { fiche, copie, champ } = args;
  if (!peutModifier(fiche)) return false;
  if (fiche[champ] !== null) return false;
  const autre = champ === "nameAr" ? { surLaFiche: fiche.nameLatin, surLeDevis: copie.latin } : { surLaFiche: fiche.nameAr, surLeDevis: copie.ar };
  return autre.surLeDevis !== null && autre.surLeDevis === autre.surLaFiche;
}
