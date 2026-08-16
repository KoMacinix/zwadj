// PORT DE PAIEMENT — Phase 7, lot E3b (socle).
//
// ⚠ POURQUOI UN PORT AVEC UN SEUL FOURNISSEUR. Chargily est le seul au MVP, et
// une interface pour un seul implémenteur ressemble à de la cérémonie. Elle ne
// l'est pas ici : BaridiMob exige un enrôlement marchand séparé (Algérie Poste)
// et n'entre pas dans l'agrégation Chargily. Le jour où il s'ajoute, soit il se
// branche derrière ce port, soit il faut rouvrir tout le chemin de l'argent —
// et rouvrir le chemin de l'argent est précisément ce que D126 organise pour
// éviter.
//
// C'est le même patron que `EMAIL_SENDER` : interface + jeton `Symbol`, adaptateur
// injecté par le module. Relevé sur `common/email/email.types.ts`, pas écrit de
// mémoire.
//
// ⚠ CE QUE CE FICHIER NE CONTIENT PAS, ET C'EST LE DÉCOUPAGE VOULU. Aucune
// charge utile Chargily, aucun nom de champ de son API, aucune URL. D126
// interdit d'écrire une valeur de mémoire sur ce chemin : les charges se
// capturent du bac à sable réel. Tant que le compte n'existe pas, l'adaptateur
// n'existe pas — mais le port, lui, peut être posé, parce qu'il décrit NOS
// besoins, pas ceux du fournisseur.

/** Ce que le domaine demande à un fournisseur de paiement. */
export interface CheckoutRequest {
  /** Notre identifiant de paiement — sert de clé de rapprochement au retour. */
  paymentId: string;
  /** Montant réellement demandé, en centimes. Déjà arrondi au dinar. */
  amountCents: number;
  /** ISO 4217. `DZD` au MVP ; le champ existe pour que le port ne mente pas. */
  currency: string;
  /** Où le fournisseur renvoie le client après tentative. */
  returnUrl: string;
}

/** Ce que le fournisseur rend en échange. */
export interface CheckoutSession {
  /** Identifiant de session côté fournisseur — persisté en `providerCheckoutId`. */
  providerCheckoutId: string;
  /** URL vers laquelle rediriger le client. */
  redirectUrl: string;
}

export interface PaymentGateway {
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
}

/** Jeton d'injection du port (une interface TS n'existe pas à l'exécution). */
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
