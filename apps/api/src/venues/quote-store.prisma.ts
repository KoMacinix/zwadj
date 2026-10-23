// ⛔ S10b-1 — L'ADAPTATEUR PRISMA DU CYCLE DE VIE DU DEVIS.
//
// ⚠ LES QUATRE TRANSACTIONS VIVENT ICI, ENTIÈRES. La frontière du port est le
// BLOC, pas l'appel : couper une transaction en deux méthodes casserait
// l'abstraction au premier besoin d'atomicité croisée (MD5 du cadrage S10).
import { Injectable } from "@nestjs/common";
import { BookingStatus, type QuoteClientNameField, type QuoteStatus } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CopieDuNom } from "../clients/pro-client-policy";
import {
  type DevisChiffre,
  type DonneesConversion,
  type FicheDuDevis,
  type ResultatConversion,
  QUOTE_SELECT,
  type QuoteRow,
  type QuoteStore,
  type ReferenceDeCreation,
  type ResultatTransition
} from "./quote-store.types";

/** P2002 sans dépendre de la classe d'erreur générée — le client est
 *  régénéré à chaque `prisma generate`, et `instanceof` sur un type régénéré
 *  est une promesse fragile. ⚠ Volontairement LARGE : ce qui départage,
 *  c'est la relecture, pas ce prédicat. */
function estViolationUnicite(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

@Injectable()
export class PrismaQuoteStore implements QuoteStore {
  constructor(private readonly prisma: PrismaService) {}

  /** ⛔ SÉRIALISE LES ÉCRITURES D'UNE CHAÎNE. Le verrou porte sur la RACINE
   *  (`chainId`), qui est une vraie ligne : la v1 elle-même. Sans lui,
   *  `MAX(version)` puis `version + 1` perd une mise à jour et
   *  `quotes_chain_version_unique` refuse la seconde révision simultanée.
   *  ⚠ Rang 39 : le même `SELECT … FOR UPDATE` rend l'ANNÉE et le NUMÉRO de la tête — la révision les recopie, sans une requête de plus. Une tête introuvable LÈVE. */
  private async verrouillerChaine(
    tx: Prisma.TransactionClient,
    chainId: string
  ): Promise<{ readonly referenceYear: number; readonly referenceNumber: number }> {
    const lignes = await tx.$queryRaw<
      { id: string; reference_year: number; reference_number: number }[]
    >`SELECT id, reference_year, reference_number FROM quotes WHERE id = ${chainId}::uuid FOR UPDATE`;
    const tete = lignes[0];
    if (
      lignes.length !== 1 ||
      tete === undefined ||
      !Number.isInteger(tete.reference_year) ||
      !Number.isInteger(tete.reference_number)
    ) {
      throw new Error(`tête de chaîne introuvable ou sans référence : ${chainId}`);
    }
    return { referenceYear: tete.reference_year, referenceNumber: tete.reference_number };
  }

  /** ⛔ LE COMPTEUR DES NUMÉROS DE DEVIS (rang 39, R3). Une ligne par (salle, année) ; l'incrément est ATOMIQUE (`ON CONFLICT … DO UPDATE … + 1 … RETURNING`) et se fait DANS la
   *  transaction de création : jamais « lire le plus grand puis ajouter 1 », et un échec ultérieur de la transaction rend le numéro. Il ne passe JAMAIS par `venues`. Une réponse qui
   *  n'est pas exactement UNE ligne d'entier ≥ 1 LÈVE : aucun numéro n'est inventé. */
  private async incrementerCompteur(tx: Prisma.TransactionClient, venueId: string, annee: number): Promise<number> {
    const lignes = await tx.$queryRaw<{ last_number: number }[]>`
      INSERT INTO quote_number_counters (venue_id, year, last_number)
      VALUES (${venueId}::uuid, ${annee}::smallint, 1)
      ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1
      RETURNING last_number`;
    const numero = lignes[0]?.last_number;
    if (lignes.length !== 1 || typeof numero !== "number" || !Number.isInteger(numero) || numero < 1) {
      throw new Error(`le compteur de devis de la salle ${venueId} (${annee}) n'a pas rendu un numéro valide`);
    }
    return numero;
  }

  /** L'identifiant d'une tête, généré par la base (`uuidv7()`, D-IDs) AVANT l'insertion : la tête naît avec `chain_id = id` (S-22). */
  private async genererIdentifiant(tx: Prisma.TransactionClient): Promise<string> {
    const lignes = await tx.$queryRaw<{ id: string }[]>`SELECT uuidv7() AS id`;
    const id = lignes[0]?.id;
    if (lignes.length !== 1 || typeof id !== "string") throw new Error("la base n'a pas généré d'identifiant");
    return id;
  }

  /** ⛔ LE CHECK-AND-SET, ÉCRIT UNE SEULE FOIS. `marquerRemis` et
   *  `changerStatut` ne diffèrent que par ce qu'elles écrivent ; deux copies de
   *  cette séquence divergeraient, et c'est la séquence QUI PROTÈGE — le statut
   *  autorisant l'écriture est lu DANS la transaction, jamais avant. */
  private async checkAndSet(
    quoteId: string,
    statutsAdmis: readonly QuoteStatus[],
    data: Prisma.QuoteUpdateManyMutationInput
  ): Promise<ResultatTransition> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.quote.updateMany({
        where: { id: quoteId, status: { in: [...statutsAdmis] } },
        data
      });
      if (consumed.count === 0) {
        // ⚠ RELU DANS LA TRANSACTION. Hors d'elle, le statut rendu au client
        // pourrait déjà être périmé au moment où il le lit.
        const fresh = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, select: { status: true } });
        return { ok: false, raison: "statutConflit", statutActuel: fresh.status } as const;
      }
      const devis = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, select: QUOTE_SELECT });
      return { ok: true, devis } as const;
    });
  }

  async creerTeteDeChaine(venueId: string, chiffre: DevisChiffre, reference: ReferenceDeCreation): Promise<QuoteRow> {
    return this.prisma.$transaction(async (tx) => {
      // ⛔ DANS CET ORDRE, ET TOUT DANS LA MÊME TRANSACTION (rang 39, cadrage § 2) : (1) le compteur — le verrou d'écriture de SA ligne sérialise les créations d'une même salle
      // et d'une même année, le temps de la transaction ; (2) l'identifiant ; (3) la tête, en UNE écriture ; (4) la relecture. Un échec de (3) annule (1) : le numéro est rendu.
      const numero = await this.incrementerCompteur(tx, venueId, reference.annee);
      const id = await this.genererIdentifiant(tx);
      // ⚠ `chainId` = son propre id dès l'insertion (S-22) : l'ancienne écriture (`chain_id` provisoire puis `UPDATE`) est REFUSÉE par la clé étrangère composite des versions vers
      // leur tête. `createdAt` est l'instant que le SERVICE a lu (S-21), le même qui a donné l'année : `reference_year` est l'année d'Alger de `created_at`.
      await tx.quote.create({
        data: {
          id,
          venueId,
          ...chiffre,
          chainId: id,
          version: 1,
          referenceYear: reference.annee,
          referenceNumber: numero,
          createdAt: reference.creeLe
        },
        select: { id: true }
      });
      return tx.quote.findUniqueOrThrow({ where: { id }, select: QUOTE_SELECT });
    });
  }

  async creerRevision(args: {
    venueId: string;
    chainId: string;
    parentQuoteId: string;
    chiffre: DevisChiffre;
  }): Promise<QuoteRow> {
    return this.prisma.$transaction(async (tx) => {
      // Rang 39 : le verrou de la tête rend aussi l'année et le numéro de sa référence, que la version RECOPIE — aucun compteur n'est touché.
      const tete = await this.verrouillerChaine(tx, args.chainId);
      const max = await tx.quote.aggregate({ where: { chainId: args.chainId }, _max: { version: true } });
      return tx.quote.create({
        data: {
          venueId: args.venueId,
          ...args.chiffre,
          chainId: args.chainId,
          version: (max._max.version ?? 1) + 1,
          referenceYear: tete.referenceYear,
          referenceNumber: tete.referenceNumber,
          parentQuoteId: args.parentQuoteId
        },
        select: QUOTE_SELECT
      });
    });
  }

  async marquerRemis(args: {
    quoteId: string;
    statutsAdmis: readonly QuoteStatus[];
    sentVia: string;
    sentAt: Date;
  }): Promise<ResultatTransition> {
    return this.checkAndSet(args.quoteId, args.statutsAdmis, { sentVia: args.sentVia, sentAt: args.sentAt });
  }

  async changerStatut(args: {
    quoteId: string;
    statutsAdmis: readonly QuoteStatus[];
    nouveauStatut: QuoteStatus;
  }): Promise<ResultatTransition> {
    return this.checkAndSet(args.quoteId, args.statutsAdmis, { status: args.nouveauStatut });
  }

  /** ⛔ CHEMIN DE L'ARGENT. UNE seule requête : la demande ET ses lignes.
   *
   *  ⚠ `services: { create: […] }` est IMBRIQUÉ volontairement. En deux
   *  écritures, un échec de la seconde laisserait une demande dont le total ne
   *  correspond à aucun détail — un montant sans justification, sur un document
   *  que le client va payer.
   *
   *  ⚠ LE DEVIS N'EST PAS TOUCHÉ. Aucun `quote.update` ici : il attend
   *  l'acompte. */
  async convertirEnDemande(donnees: DonneesConversion): Promise<ResultatConversion> {
    try {
      await this.prisma.booking.create({
        data: {
          venueId: donnees.venueId,
          clientId: donnees.clientId,
          quoteId: donnees.quoteId,
          slotTemplateId: donnees.slotTemplateId,
          source: donnees.source,
          // ⚠ PENDING, pas ACCEPTED : c'est le pro qui acceptera la date. Une
          // demande PENDING ne verrouille rien, donc l'EXCLUDE de chevauchement
          // ne peut pas refuser ici — le 409 de créneau pris arrive plus tard.
          //
          // ⚠ LA VALEUR DÉRIVE DE L'AUTORITÉ (D268 — ferme le report de D263).
          //   Le champ Prisma est typé sur l'énuméré généré : une divergence
          //   entre `@zwadj/types` et le schéma tombe au TYPECHECK, ce qu'un
          //   littéral ne pouvait pas faire — il ne s'accordait qu'avec les
          //   autres littéraux. Classe nommée par D259 sur `BookingSource`.
          //   ⚠ Le littéral survit à UN seul endroit, délibérément :
          //   `quotes.int-spec.ts` le confronte à ce que PostgreSQL contient
          //   VRAIMENT. Sa présence là-bas est exigée par une garde de source.
          status: BookingStatus.PENDING,
          paymentMethod: donnees.paymentMethod,
          eventDate: donnees.eventDate,
          startsAt: donnees.startsAt,
          endsAt: donnees.endsAt,
          slotNameFr: donnees.slotNameFr,
          slotNameAr: donnees.slotNameAr,
          guests: donnees.guests,
          basePriceCents: donnees.basePriceCents,
          servicesTotalCents: donnees.servicesTotalCents,
          totalCents: donnees.totalCents,
          depositCents: donnees.depositCents,
          contactFirstName: donnees.contactFirstName,
          contactLastName: donnees.contactLastName,
          contactPhone: donnees.contactPhone,
          contactEmail: donnees.contactEmail,
          services: {
            create: donnees.lignes.map((ligne) => ({
              serviceId: ligne.serviceId,
              tierId: ligne.tierId,
              nameFr: ligne.nameFr,
              nameAr: ligne.nameAr,
              pricingType: ligne.pricingType as "FIXED" | "PER_GUEST" | "TIERED" | "PER_UNIT",
              tierLabelFr: ligne.tierLabelFr,
              tierLabelAr: ligne.tierLabelAr,
              unitPriceCents: ligne.unitPriceCents,
              quantity: ligne.quantity,
              lineTotalCents: ligne.lineTotalCents
            }))
          }
        },
        select: { id: true }
      });
      return { ok: true };
    } catch (error) {
      // ⛔ ON NE CONCLUT PAS SUR UN CODE DE DRIVER SEUL.
      //
      // `bookings` porte DEUX contraintes uniques : `quote_id` et
      // `idempotency_key`. Cette écriture ne pose pas de clé d'idempotence, donc
      // P2002 ne peut venir que de `quote_id` — AUJOURD'HUI. Le jour où
      // quelqu'un l'ajoute, un catch large annoncerait « déjà converti » sur une
      // collision d'idempotence : un mensonge au pro.
      //
      // On RELIT donc : une demande existe-t-elle vraiment pour ce devis ? La
      // réponse vient de l'état de la base, pas de la forme interne d'une erreur
      // Prisma — leçon de E3d-1, où `meta.target` s'est révélé indéchiffrable.
      if (!estViolationUnicite(error)) throw error;
      const existante = await this.prisma.booking.findFirst({
        where: { quoteId: donnees.quoteId },
        select: { id: true }
      });
      if (existante) return { ok: false, raison: "dejaConverti" };
      // Unicité violée SANS demande pour ce devis : ce n'est pas une double
      // conversion. On ne déguise pas ce qu'on ne comprend pas.
      throw error;
    }
  }

  async listerDeLaSalle(venueId: string): Promise<QuoteRow[]> {
    return this.prisma.quote.findMany({
      where: { venueId },
      orderBy: [{ chainId: "asc" }, { version: "asc" }],
      select: QUOTE_SELECT
    });
  }

  async listerPourEntonnoir(
    venueId: string
  ): Promise<ReadonlyArray<{ chainId: string; status: QuoteStatus; version: number }>> {
    // ⚠ `sentVia: { not: null }` EST LE DÉNOMINATEUR (D162) : un devis n'entre
    // dans l'entonnoir que si quelqu'un a déclaré par quoi il est parti.
    return this.prisma.quote.findMany({
      where: { venueId, sentVia: { not: null } },
      orderBy: [{ chainId: "asc" }, { version: "desc" }],
      select: { chainId: true, status: true, version: true }
    });
  }

  async trouverDuPro(userId: string, quoteId: string): Promise<QuoteRow | null> {
    return this.prisma.quote.findFirst({
      where: { id: quoteId, venue: { deletedAt: null, owner: { userId } } },
      select: QUOTE_SELECT
    });
  }

  async salleAppartientAu(userId: string, venueId: string): Promise<boolean> {
    const owned = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null, owner: { userId } },
      select: { id: true }
    });
    return owned !== null;
  }

  /** ⛔ Rang 41 (D336, MD-11) — la fiche par la RELATION au pro (D149) : `proProfile: { userId }`, jamais un identifiant qui « ressemble ». Rien du compte lié. */
  async ficheDuPro(userId: string, recordId: string): Promise<FicheDuDevis | null> {
    return this.prisma.proClientRecord.findFirst({
      where: { id: recordId, proProfile: { userId } },
      select: { id: true, nameAr: true, nameLatin: true, linkedUserId: true }
    });
  }

  /** ⛔ Rang 41 (D336, K-5) — UNE transaction (voir le port) : la copie par compare-and-set, PUIS la fiche sous verrou et sous la décision de l'appelant. */
  async completerNomDuClient(args: {
    readonly userId: string;
    readonly quoteId: string;
    readonly champ: QuoteClientNameField;
    readonly nom: string;
    readonly completerLaFiche: (fiche: FicheDuDevis, copie: CopieDuNom) => boolean;
  }): Promise<{ readonly ok: true; readonly devis: QuoteRow } | { readonly ok: false }> {
    const enArabe = args.champ === "clientNameAr";
    return this.prisma.$transaction(async (tx) => {
      // ⛔ MD-7 — le compare-and-set est dans le WHERE : la copie de cette écriture NULLE, le devis du pro, sa salle vivante. Jamais lire puis écrire.
      const ecrit = await tx.quote.updateMany({
        where: { id: args.quoteId, ...(enArabe ? { clientNameAr: null } : { clientNameLatin: null }), venue: { deletedAt: null, owner: { userId: args.userId } } },
        data: enArabe ? { clientNameAr: args.nom } : { clientNameLatin: args.nom }
      });
      if (ecrit.count === 0) return { ok: false } as const;
      const devis = await tx.quote.findUniqueOrThrow({ where: { id: args.quoteId }, select: QUOTE_SELECT });
      if (devis.clientRecordId !== null) {
        // ⛔ MD-8 — la fiche est VERROUILLÉE avant d'être lue : la décision C-C3 porte sur l'état que l'écriture va trouver.
        const lignes = await tx.$queryRaw<{ id: string; name_ar: string | null; name_latin: string | null; linked_user_id: string | null }[]>`
          SELECT id::text AS id, name_ar, name_latin, linked_user_id::text AS linked_user_id FROM pro_client_records WHERE id = ${devis.clientRecordId}::uuid FOR UPDATE`;
        const ligne = lignes[0];
        if (ligne !== undefined) {
          const fiche: FicheDuDevis = { id: ligne.id, nameAr: ligne.name_ar, nameLatin: ligne.name_latin, linkedUserId: ligne.linked_user_id };
          if (args.completerLaFiche(fiche, { ar: devis.clientNameAr, latin: devis.clientNameLatin })) {
            // L'écriture RE-POSE ses conditions : jamais remplacer un nom de la fiche, jamais une fiche liée — même si la décision se trompait.
            await tx.proClientRecord.updateMany({
              where: { id: fiche.id, ...(enArabe ? { nameAr: null } : { nameLatin: null }), linkedUserId: null },
              data: enArabe ? { nameAr: args.nom } : { nameLatin: args.nom }
            });
          }
        }
      }
      return { ok: true, devis } as const;
    });
  }
}
