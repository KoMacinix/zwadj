// ⛔ L'ADAPTATEUR PRISMA DE LA FICHE CLIENT — rang 41 (D336, L35-4 amendé). Voir `pro-client-store.types.ts` pour le contrat du port.
//
// ⚠ LA PROPRIÉTÉ SE TRAVERSE PAR LA RELATION (D149) : `pro_client_records.pro_profile_id` référence `pro_profiles.id`, et le pro connecté est `pro_profiles.user_id`.
// L'idiome est `proProfile: { userId }` — jamais un identifiant d'utilisateur passé dans `proProfileId`.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  FICHE_SELECT,
  type ContactDuProRow,
  type CritereRecherche,
  type DonneesFiche,
  type FicheRow,
  type ProClientStore,
  type ResultatComplement,
  type ResultatCreation,
  type ResultatModification
} from "./pro-client-store.types";

/** P2002 sans dépendre de la classe d'erreur générée (patron A2 de ce dépôt). Les index uniques PARTIELS de la fiche le rendent comme les autres — mesuré sur
 *  `account_deletion_requests_one_pending` et l'index des intentions de paiement, et par `test/int/pro-clients.int-spec.ts` pour ceux-ci. */
function estViolationUnicite(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

@Injectable()
export class PrismaProClientStore implements ProClientStore {
  constructor(private readonly prisma: PrismaService) {}

  async contactDuPro(userId: string): Promise<ContactDuProRow | null> {
    const profil = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true, phone: true, phone2: true, user: { select: { email: true } } }
    });
    return profil === null ? null : { proProfileId: profil.id, phone: profil.phone, phone2: profil.phone2, email: profil.user.email };
  }

  // ⛔ M-4 (MD-10) — LA RECHERCHE NE LIT QUE LES FICHES DU PRO : un seul `findFirst` sur `pro_client_records`, la propriété par la relation au profil. Aucune
  // lecture du compte : la réponse ne peut donc pas dépendre de l'existence d'un compte Zwadj qui porterait le même identifiant (garde de source :
  // `pro-clients.service.spec.ts`).
  async rechercher(userId: string, critere: CritereRecherche): Promise<FicheRow | null> {
    return this.prisma.proClientRecord.findFirst({
      where: { proProfile: { userId }, ...("phone" in critere ? { phone: critere.phone } : { email: critere.email }) },
      select: FICHE_SELECT
    });
  }

  // ⛔ MD-1 — la BASE tranche : l'insertion qui heurte l'unicité `(pro, numéro)` ou `(pro, e-mail)` ne fait RIEN (`ON CONFLICT DO NOTHING`, sans cible : tout index
  // unique, partiels compris) ; une insertion concurrente non encore validée fait ATTENDRE celle-ci, qui ne fait rien ensuite. Puis la relecture, qui voit la
  // ligne validée. Dix créations simultanées du même numéro : une ligne.
  async creerSiAbsente(proProfileId: string, donnees: DonneesFiche): Promise<ResultatCreation> {
    const inseree = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO pro_client_records (pro_profile_id, phone, email, name_ar, name_latin)
      VALUES (${proProfileId}::uuid, ${donnees.phone}, ${donnees.email}, ${donnees.nameAr}, ${donnees.nameLatin})
      ON CONFLICT DO NOTHING
      RETURNING id::text AS id`;
    const nouvelle = inseree[0];
    if (inseree.length === 1 && nouvelle !== undefined) {
      return { cree: true, fiche: await this.prisma.proClientRecord.findUniqueOrThrow({ where: { id: nouvelle.id }, select: FICHE_SELECT }) };
    }
    const [parTelephone, parEmail] = await Promise.all([
      donnees.phone === null ? Promise.resolve(null) : this.prisma.proClientRecord.findFirst({ where: { proProfileId, phone: donnees.phone }, select: FICHE_SELECT }),
      donnees.email === null ? Promise.resolve(null) : this.prisma.proClientRecord.findFirst({ where: { proProfileId, email: donnees.email }, select: FICHE_SELECT })
    ]);
    return { cree: false, parTelephone, parEmail };
  }

  // ⛔ MD-7 — un nom PRÉSENT n'est jamais remplacé : le compare-and-set est dans le WHERE (`name_x IS NULL` pour chaque nom fourni), avec la propriété et l'absence
  // de lien, en UN `UPDATE`. Refusé : la fiche RELUE dit pourquoi (absente, liée, nom déjà là) — c'est le service qui choisit le code.
  async completerNoms(userId: string, id: string, noms: { readonly nameAr?: string; readonly nameLatin?: string }): Promise<ResultatComplement> {
    const ecrit = await this.prisma.proClientRecord.updateMany({
      where: {
        id,
        proProfile: { userId },
        linkedUserId: null,
        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),
        ...(noms.nameLatin !== undefined ? { nameLatin: null } : {})
      },
      data: { ...(noms.nameAr !== undefined ? { nameAr: noms.nameAr } : {}), ...(noms.nameLatin !== undefined ? { nameLatin: noms.nameLatin } : {}) }
    });
    if (ecrit.count === 1) return { ok: true, fiche: await this.prisma.proClientRecord.findUniqueOrThrow({ where: { id }, select: FICHE_SELECT }) };
    return { ok: false, actuelle: await this.prisma.proClientRecord.findFirst({ where: { id, proProfile: { userId } }, select: FICHE_SELECT }) };
  }

  // ⛔ MD-6, MD-2 — la ligne est VERROUILLÉE (`FOR UPDATE`) avant d'être lue : l'absence de lien qui autorise l'écriture est lue DANS la transaction (D117), et la
  // fiche relue en cas de refus l'est sous le même verrou. L'unicité refusée par la base est RENDUE (`unicite`), jamais une fusion, jamais une 500.
  async modifier(
    userId: string,
    id: string,
    champs: { readonly phone?: string; readonly email?: string; readonly nameAr?: string; readonly nameLatin?: string }
  ): Promise<ResultatModification> {
    try {
      return await this.prisma.$transaction(async (tx): Promise<ResultatModification> => {
        const verrou = await tx.$queryRaw<{ id: string }[]>`
          SELECT r.id::text AS id FROM pro_client_records r JOIN pro_profiles p ON p.id = r.pro_profile_id
           WHERE r.id = ${id}::uuid AND p.user_id = ${userId}::uuid
           FOR UPDATE OF r`;
        if (verrou.length !== 1) return { ok: false, raison: "absenteOuLiee", actuelle: null };
        const actuelle = await tx.proClientRecord.findUniqueOrThrow({ where: { id }, select: FICHE_SELECT });
        if (actuelle.linkedUserId !== null) return { ok: false, raison: "absenteOuLiee", actuelle };
        const fiche = await tx.proClientRecord.update({ where: { id }, data: { ...champs }, select: FICHE_SELECT });
        return { ok: true, fiche };
      });
    } catch (error) {
      if (estViolationUnicite(error)) return { ok: false, raison: "unicite" };
      throw error;
    }
  }
}
