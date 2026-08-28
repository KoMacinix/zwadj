// ⛔ S10b-1 — L'ADAPTATEUR PRISMA DU CYCLE DE VIE DU DEVIS.
//
// ⚠ LES QUATRE TRANSACTIONS VIVENT ICI, ENTIÈRES. La frontière du port est le
// BLOC, pas l'appel : couper une transaction en deux méthodes casserait
// l'abstraction au premier besoin d'atomicité croisée (MD5 du cadrage S10).
import { Injectable } from "@nestjs/common";
import type { QuoteStatus } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DevisChiffre,
  type DonneesConversion,
  type ResultatConversion,
  QUOTE_SELECT,
  type QuoteRow,
  type QuoteStore,
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
   *  `quotes_chain_version_unique` refuse la seconde révision simultanée. */
  private async verrouillerChaine(tx: Prisma.TransactionClient, chainId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${chainId}::uuid FOR UPDATE`;
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

  async creerTeteDeChaine(venueId: string, chiffre: DevisChiffre): Promise<QuoteRow> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: { venueId, ...chiffre, chainId: "00000000-0000-0000-0000-000000000000", version: 1 },
        select: { id: true }
      });
      // ⚠ `chainId` = son propre id, impossible à écrire en une passe : l'id est
      // généré par la base (`uuidv7()`). Le second UPDATE est dans la MÊME
      // transaction, donc aucune ligne n'est jamais visible avec la valeur
      // temporaire.
      await tx.quote.update({ where: { id: created.id }, data: { chainId: created.id } });
      return tx.quote.findUniqueOrThrow({ where: { id: created.id }, select: QUOTE_SELECT });
    });
  }

  async creerRevision(args: {
    venueId: string;
    chainId: string;
    parentQuoteId: string;
    chiffre: DevisChiffre;
  }): Promise<QuoteRow> {
    return this.prisma.$transaction(async (tx) => {
      await this.verrouillerChaine(tx, args.chainId);
      const max = await tx.quote.aggregate({ where: { chainId: args.chainId }, _max: { version: true } });
      return tx.quote.create({
        data: {
          venueId: args.venueId,
          ...args.chiffre,
          chainId: args.chainId,
          version: (max._max.version ?? 1) + 1,
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
          status: "PENDING",
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
}
