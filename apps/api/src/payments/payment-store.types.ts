// PORT DE PERSISTANCE DU PAIEMENT — lot S5a.
//
// ⚠ POURQUOI CE FICHIER N'EST PAS `payment.types.ts`. Celui-là décrit ce que le
// domaine demande à un fournisseur EXTERNE, et son en-tête interdit d'y faire
// entrer un nom de champ Chargily. Notre base est l'autre frontière : les
// mélanger dans un fichier ferait de « port » un mot qui ne veut plus rien dire.
// Convention relevée sur `media/` — `media.types.ts` porte `MEDIA_STORAGE`,
// `disk-storage.adapter.ts` l'implémente.
//
// ⚠ AUCUN TYPE PRISMA DANS CES SIGNATURES. C'est la règle du port, et elle a un
// but précis : le service ne doit pas pouvoir apprendre la forme du schéma par
// accident. `Prisma.PaymentSelect`, les `where`, les `select` vivent dans
// l'adaptateur, et nulle part ailleurs.
//
// ⚠ `provider` ET `status` SONT DES `string`, ET C'EST DÉLIBÉRÉ.
// `PaymentStatus` et `PaymentProvider` n'existent QUE comme énumérations Prisma
// — vérifié : elles ne sont pas dans `@zwadj/types`. Les redéclarer ici créerait
// une SECONDE autorité sur un jeu de valeurs, et R4 vient de montrer ce que ça
// coûte : `CANCELLED` déclaré côté Prisma sans migration, et le refus de devis
// rendait 500 depuis des semaines. Le dépôt écrit déjà `pricingType: string` et
// `assertStatus(row: { status: string })` pour la même raison.

/** La réservation, vue par qui a le droit de la régler. */
export interface PayableBooking {
  id: string;
  status: string;
  /** Acompte figé à la conversion — instantané, jamais recalculé. */
  depositCents: number;
}

/** L'intention de paiement, telle que le service la rend. */
export interface PaymentIntent {
  id: string;
  bookingId: string;
  provider: string;
  providerCheckoutId: string | null;
  amountCents: number;
  discountAppliedCents: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface PaymentStore {
  /** La réservation, si cet utilisateur a le droit de la régler — client OU pro
   *  propriétaire.
   *
   *  ⚠ REND `null` DANS LES DEUX CAS : inexistante, ou pas la sienne. La
   *  distinction n'est pas faite ici parce qu'elle ne doit être faite NULLE
   *  PART — c'est le 404 indistinct de D47. Un port qui rendrait
   *  `FORBIDDEN` séparément apprendrait à un curieux quelles réservations
   *  existent. La traduction en 404 reste au service, seul à connaître HTTP. */
  findBookingForPayer(userId: string, bookingId: string): Promise<PayableBooking | null>;

  /** L'intention réutilisable de cette réservation, ou une neuve.
   *
   *  ⚠ UNE SEULE MÉTHODE, ET C'EST LA RAISON D'ÊTRE DU PORT ICI. « Chercher un
   *  PENDING, sinon créer » EST l'idempotence : la couper en deux appels
   *  mettrait la règle chez l'appelant, où le prochain appelant pourrait
   *  l'oublier. Un client qui recharge trois fois la page de règlement créerait
   *  alors trois intentions pour une seule affaire, et la réconciliation
   *  devrait deviner laquelle comptait.
   *
   *  ⚠ CE N'EST PAS ENCORE ATOMIQUE — voir l'adaptateur. Le port est l'endroit
   *  où ça le deviendra. */
  findOrCreatePendingIntent(input: {
    bookingId: string;
    amountCents: number;
    discountAppliedCents: number;
  }): Promise<PaymentIntent>;
}

/** Jeton d'injection du port (une interface TS n'existe pas à l'exécution). */
export const PAYMENT_STORE = Symbol("PAYMENT_STORE");
